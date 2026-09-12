import { randomUUID } from 'node:crypto';
import { hash } from 'bcrypt';
import request from 'supertest';
import { cartTestContext } from './helpers/cart-test-context.js';
import { SalesService } from '../src/modules/sales/sales.service.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)('Sales and checkout (HTTP + PostgreSQL)', () => {
  let ctx: Awaited<ReturnType<typeof cartTestContext>>;
  let sales: SalesService;
  let cashierToken: string;
  let otherCashierToken: string;
  const actor = (index = 0) => ctx.tokens[index];
  const auth = (token = actor()) => ({ Authorization: `Bearer ${token}` });
  const variant = (quantity = 1) => ({
    productId: ctx.product.id,
    sizeId: ctx.size.id,
    colorId: ctx.color.id,
    quantity,
  });
  const storeBody = (quantity = 1) => ({
    idempotencyKey: randomUUID(),
    branchId: ctx.branch.id,
    items: [variant(quantity)],
    expectedTotal: Number((quantity * 19.99).toFixed(2)),
    paymentMethod: 'CASH',
  });
  const inStore = (body: object = storeBody(), token = cashierToken) =>
    request(ctx.app.getHttpServer())
      .post('/api/v1/sales/in-store')
      .set(auth(token))
      .send(body);
  const stock = () =>
    ctx.prisma.inventory.findUniqueOrThrow({
      where: {
        branchId_productId_sizeId_colorId: {
          branchId: ctx.branch.id,
          productId: ctx.product.id,
          sizeId: ctx.size.id,
          colorId: ctx.color.id,
        },
      },
    });
  const addCart = (quantity = 1, token = actor()) =>
    request(ctx.app.getHttpServer())
      .post('/api/v1/cart/items')
      .set(auth(token))
      .send(variant(quantity));
  const preview = (cartId: number, token = actor(), branchId = ctx.branch.id) =>
    request(ctx.app.getHttpServer())
      .post('/api/v1/sales/checkout/preview')
      .set(auth(token))
      .send({ cartId, branchId });
  const checkout = (body: object, token = actor()) =>
    request(ctx.app.getHttpServer())
      .post('/api/v1/sales/checkout')
      .set(auth(token))
      .send(body);
  const cancel = (id: number, token = actor()) =>
    request(ctx.app.getHttpServer())
      .patch(`/api/v1/sales/${id}/cancel`)
      .set(auth(token));
  const prepareCheckout = async (quantity = 1, token = actor()) => {
    const cart = (await addCart(quantity, token).expect(201)).body.data;
    const quote = (await preview(cart.id, token).expect(201)).body.data;
    return {
      cartId: cart.id,
      branchId: ctx.branch.id,
      quoteHash: quote.quoteHash,
      channel: 'WEB',
      idempotencyKey: randomUUID(),
    };
  };

  beforeAll(async () => {
    ctx = await cartTestContext(databaseUrl!);
    sales = ctx.app.get(SalesService);
    const role = await ctx.prisma.role.create({ data: { name: 'CASHIER' } });
    const password = 'SalesTestPassword123!';
    const passwordHash = await hash(password, 10);
    const tokens: string[] = [];
    for (const [email, branchId] of [
      ['cashier@sales.test', ctx.branch.id],
      ['other-cashier@sales.test', ctx.otherBranch.id],
    ] as const) {
      await ctx.prisma.user.create({
        data: {
          name: 'Cajero',
          email,
          passwordHash,
          employee: { create: { branchId, jobTitle: 'Cajero' } },
          roles: { create: { roleId: role.id } },
        },
      });
      const login = await request(ctx.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(201);
      tokens.push(login.body.data.accessToken as string);
    }
    [cashierToken, otherCashierToken] = tokens;
  }, 60000);

  beforeEach(async () => {
    await ctx.prisma.payment.deleteMany();
    await ctx.prisma.saleItem.deleteMany();
    await ctx.prisma.sale.deleteMany();
    await ctx.prisma.reservationItem.deleteMany();
    await ctx.prisma.reservation.deleteMany();
    await ctx.prisma.cartItem.deleteMany();
    await ctx.prisma.cart.deleteMany();
    await ctx.prisma.inventoryMovement.deleteMany();
    await ctx.prisma.inventory.updateMany({
      data: { physicalQuantity: 10, reservedQuantity: 0 },
    });
    await ctx.prisma.branch.updateMany({ data: { active: true } });
    await ctx.prisma.product.update({
      where: { id: ctx.product.id },
      data: {
        name: 'Camisa',
        active: true,
        price: '19.99',
        discountPercent: 0,
        promotionStart: null,
        promotionEnd: null,
      },
    });
  });
  afterAll(async () => {
    await ctx?.close();
  });

  it('records an in-store cash sale, payment, receipt and immutable price/name snapshots', async () => {
    const result = (await inStore(storeBody(2)).expect(201)).body.data;
    expect(result).toMatchObject({
      channel: 'IN_STORE',
      status: 'COMPLETED',
      total: 39.98,
      currency: 'BOB',
      stockReserved: false,
    });
    expect(result.payments[0]).toMatchObject({
      status: 'APPROVED',
      amount: 39.98,
      method: 'CASH',
    });
    expect(await stock()).toMatchObject({
      physicalQuantity: 8,
      reservedQuantity: 0,
    });
    expect(
      await ctx.prisma.inventoryMovement.count({ where: { type: 'SALE' } }),
    ).toBe(1);
    await ctx.prisma.product.update({
      where: { id: ctx.product.id },
      data: { name: 'New name', price: 999 },
    });
    const receipt = await request(ctx.app.getHttpServer())
      .get(`/api/v1/sales/${result.id}/receipt`)
      .set(auth(cashierToken))
      .expect(200);
    expect(receipt.body.data).toMatchObject({
      total: 39.98,
      receiptNumber: `FS-${String(result.id).padStart(8, '0')}`,
    });
    expect(receipt.body.data.items[0]).toMatchObject({
      productName: 'Camisa',
      unitPrice: 19.99,
    });
  });

  it('retries the same cash request without duplicating the sale and rejects altered payloads', async () => {
    const body = storeBody();
    const responses = await Promise.all([inStore(body), inStore(body)]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0].body.data.id).toBe(responses[1].body.data.id);
    expect(await ctx.prisma.sale.count()).toBe(1);
    expect(await stock()).toMatchObject({ physicalQuantity: 9 });
    await inStore({ ...body, expectedTotal: 1 }).expect(409);
  });

  it('requires correct totals and prevents partial writes when any item is unavailable', async () => {
    await inStore({ ...storeBody(), expectedTotal: 1 }).expect(409);
    const body = storeBody();
    body.items.push({ ...variant(11), sizeId: ctx.otherSize.id });
    body.expectedTotal = 239.88;
    await inStore(body).expect(409);
    expect(await ctx.prisma.sale.count()).toBe(0);
    expect(await ctx.prisma.payment.count()).toBe(0);
    expect(await stock()).toMatchObject({
      physicalQuantity: 10,
      reservedQuantity: 0,
    });
  });

  it('enforces staff branches, customer ownership and prohibits client-approved payment routes', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/sales/in-store')
      .send(storeBody())
      .expect(401);
    await inStore(storeBody(), actor()).expect(403);
    await inStore(storeBody(), otherCashierToken).expect(403);
    const order = (await checkout(await prepareCheckout()).expect(201)).body
      .data;
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/sales/${order.id}`)
      .set(auth(actor(1)))
      .expect(403);
    await cancel(order.id, actor(1)).expect(403);
    await request(ctx.app.getHttpServer())
      .post(`/api/v1/sales/${order.id}/confirm`)
      .set(auth())
      .send({ status: 'COMPLETED' })
      .expect(404);
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/sales?branchId=${ctx.branch.id}`)
      .set(auth(otherCashierToken))
      .expect(403);
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/sales/${order.id}/receipt`)
      .set(auth())
      .expect(409);
  });

  it('creates a digital checkout with a snapshot, pending payment and stock hold, then confirms once', async () => {
    const body = await prepareCheckout(2);
    const order = (await checkout(body).expect(201)).body.data;
    expect(order).toMatchObject({
      status: 'PENDING_PAYMENT',
      cartId: body.cartId,
      stockReserved: true,
      total: 39.98,
    });
    expect(order.payments[0]).toMatchObject({
      method: 'GATEWAY',
      status: 'PENDING',
    });
    expect(await stock()).toMatchObject({
      physicalQuantity: 10,
      reservedQuantity: 2,
    });
    expect(
      await ctx.prisma.cart.findUnique({ where: { id: body.cartId } }),
    ).toMatchObject({ status: 'CONVERTED' });
    const confirmation = {
      reference: 'payment_success',
      amount: '39.98',
      currency: 'BOB',
    };
    const approvals = await Promise.all([
      sales.confirmElectronicPayment(order.id, confirmation),
      sales.confirmElectronicPayment(order.id, confirmation),
    ]);
    expect(approvals.every((sale) => sale.status === 'COMPLETED')).toBe(true);
    expect(await stock()).toMatchObject({
      physicalQuantity: 8,
      reservedQuantity: 0,
    });
    expect(
      await ctx.prisma.inventoryMovement.count({ where: { type: 'SALE' } }),
    ).toBe(1);
    expect(
      await ctx.prisma.payment.count({ where: { status: 'APPROVED' } }),
    ).toBe(1);
    await cancel(order.id).expect(409);
  });

  it('uses one order under concurrent checkout retries and rejects a second checkout of the converted cart', async () => {
    const body = await prepareCheckout();
    const responses = await Promise.all([checkout(body), checkout(body)]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0].body.data.id).toBe(responses[1].body.data.id);
    await checkout({ ...body, idempotencyKey: randomUUID() }).expect(404);
    expect(await stock()).toMatchObject({
      physicalQuantity: 10,
      reservedQuantity: 1,
    });
  });

  it('requires a new preview when the cart or current prices changed', async () => {
    const body = await prepareCheckout();
    await ctx.prisma.product.update({
      where: { id: ctx.product.id },
      data: { price: 20 },
    });
    await checkout(body).expect(409);
    expect(await ctx.prisma.sale.count()).toBe(0);
    expect(
      await ctx.prisma.cart.findUnique({ where: { id: body.cartId } }),
    ).toMatchObject({ status: 'ACTIVE' });
    const newQuote = (await preview(body.cartId).expect(201)).body.data;
    await checkout({ ...body, quoteHash: newQuote.quoteHash }).expect(201);
  });

  it('validates the selected branch and rejects foreign carts and forged quote hashes', async () => {
    const body = await prepareCheckout();
    await preview(body.cartId, actor(1)).expect(404);
    await checkout({ ...body, quoteHash: '0'.repeat(64) }).expect(409);
    await checkout({ ...body, total: 0.01, status: 'COMPLETED' }).expect(400);
    await ctx.prisma.inventory.updateMany({
      where: { branchId: ctx.branch.id },
      data: { physicalQuantity: 0 },
    });
    await checkout(body).expect(409);
    expect(await ctx.prisma.sale.count()).toBe(0);
  });

  it('allows only one winner when checkout and an in-store sale compete for the last unit', async () => {
    const body = await prepareCheckout();
    await ctx.prisma.inventory.updateMany({
      where: { branchId: ctx.branch.id },
      data: { physicalQuantity: 1 },
    });
    const responses = await Promise.all([checkout(body), inStore()]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const current = await stock();
    expect(current.physicalQuantity - current.reservedQuantity).toBe(0);
    expect(await ctx.prisma.sale.count()).toBe(1);
  });

  it('cancels pending orders concurrently, releasing exactly one hold', async () => {
    const order = (await checkout(await prepareCheckout()).expect(201)).body
      .data;
    const responses = await Promise.all([cancel(order.id), cancel(order.id)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(await stock()).toMatchObject({
      physicalQuantity: 10,
      reservedQuantity: 0,
    });
    expect(
      await ctx.prisma.inventoryMovement.count({
        where: { type: 'CHECKOUT_RELEASE' },
      }),
    ).toBe(1);
    expect(await ctx.prisma.payment.findFirst()).toMatchObject({
      status: 'VOIDED',
    });
  });

  it('expires unpaid checkouts once with multiple workers', async () => {
    const order = (await checkout(await prepareCheckout()).expect(201)).body
      .data;
    const afterDeadline = new Date(new Date(order.expiresAt).getTime() + 1);
    const counts = await Promise.all([
      sales.expirePendingCheckouts(afterDeadline),
      sales.expirePendingCheckouts(afterDeadline),
    ]);
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(1);
    expect(await stock()).toMatchObject({
      physicalQuantity: 10,
      reservedQuantity: 0,
    });
    expect(
      await ctx.prisma.sale.findUnique({ where: { id: order.id } }),
    ).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'PAYMENT_WINDOW_EXPIRED',
    });
  });

  it('rejects wrong or late provider confirmations and commits expiration before reporting late payment', async () => {
    const order = (await checkout(await prepareCheckout()).expect(201)).body
      .data;
    await expect(
      sales.confirmElectronicPayment(order.id, {
        reference: 'wrong',
        amount: '1',
        currency: 'BOB',
      }),
    ).rejects.toThrow('does not match');
    await ctx.prisma.sale.update({
      where: { id: order.id },
      data: { expiresAt: new Date('2000-01-01') },
    });
    await expect(
      sales.confirmElectronicPayment(order.id, {
        reference: 'late',
        amount: '19.99',
        currency: 'BOB',
      }),
    ).rejects.toThrow('after expiration');
    expect(await stock()).toMatchObject({
      physicalQuantity: 10,
      reservedQuantity: 0,
    });
    expect(await ctx.prisma.payment.findFirst()).toMatchObject({
      status: 'VOIDED',
    });
  });

  it('converts part of a reservation, consuming purchased units and releasing the remainder', async () => {
    const reservation = await request(ctx.app.getHttpServer())
      .post('/api/v1/reservations')
      .set(auth())
      .send({
        branchId: ctx.branch.id,
        approximateTime: '2035-01-01T10:00:00-04:00',
        items: [variant(3), { ...variant(2), sizeId: ctx.otherSize.id }],
      })
      .expect(201);
    const reservationId = reservation.body.data.id;
    for (const status of ['PREPARING', 'READY', 'CUSTOMER_PRESENT']) {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/reservations/${reservationId}/status`)
        .set(auth(actor(2)))
        .send({ status })
        .expect(200);
    }
    const body = { ...storeBody(1), reservationId };
    const order = (await inStore(body).expect(201)).body.data;
    expect(order.clientId).toBe(ctx.users[0].client!.id);
    expect(await stock()).toMatchObject({
      physicalQuantity: 9,
      reservedQuantity: 0,
    });
    const updated = await ctx.prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { items: true },
    });
    expect(updated.status).toBe('COMPLETED');
    expect(
      updated.items.find((item) => item.sizeId === ctx.size.id),
    ).toMatchObject({ quantity: 3, purchasedQuantity: 1, status: 'PURCHASED' });
    expect(
      updated.items.find((item) => item.sizeId === ctx.otherSize.id),
    ).toMatchObject({ purchasedQuantity: 0, status: 'RETURNED' });
    expect(
      await ctx.prisma.inventoryMovement.count({
        where: { type: 'RESERVATION_RELEASE' },
      }),
    ).toBe(2);
    await inStore({ ...body, idempotencyKey: randomUUID() }).expect(409);
  });

  it('keeps customer histories separate and scopes cashier sales to their branch', async () => {
    await inStore({ ...storeBody(), clientId: ctx.users[0].client!.id }).expect(
      201,
    );
    const mine = await request(ctx.app.getHttpServer())
      .get('/api/v1/sales/mine')
      .set(auth())
      .expect(200);
    expect(mine.body.data.meta.total).toBe(1);
    const other = await request(ctx.app.getHttpServer())
      .get('/api/v1/sales/mine')
      .set(auth(actor(1)))
      .expect(200);
    expect(other.body.data.meta.total).toBe(0);
    const branch = await request(ctx.app.getHttpServer())
      .get('/api/v1/sales')
      .set(auth(otherCashierToken))
      .expect(200);
    expect(branch.body.data.meta.total).toBe(0);
  });

  it('resolves concurrent cancellation and payment without consuming or releasing a hold twice', async () => {
    const order = (await checkout(await prepareCheckout()).expect(201)).body
      .data;
    const results = await Promise.allSettled([
      sales.confirmElectronicPayment(order.id, {
        reference: 'race-payment',
        amount: '19.99',
        currency: 'BOB',
      }),
      cancel(order.id),
    ]);
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    const result = await ctx.prisma.sale.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(['COMPLETED', 'CANCELLED']).toContain(result.status);
    expect(await stock()).toMatchObject({
      physicalQuantity: result.status === 'COMPLETED' ? 9 : 10,
      reservedQuantity: 0,
    });
    expect(
      await ctx.prisma.inventoryMovement.count({
        where: { type: { in: ['SALE', 'CHECKOUT_RELEASE'] } },
      }),
    ).toBe(1);
  });

  it('does not apply the same provider transaction to two different orders', async () => {
    const first = (await checkout(await prepareCheckout()).expect(201)).body
      .data;
    const second = (await checkout(await prepareCheckout()).expect(201)).body
      .data;
    const confirmation = {
      reference: 'shared-provider-reference',
      amount: '19.99',
      currency: 'BOB',
    };
    await sales.confirmElectronicPayment(first.id, confirmation);
    await expect(
      sales.confirmElectronicPayment(second.id, confirmation),
    ).rejects.toThrow('duplicate payment');
    expect(await stock()).toMatchObject({
      physicalQuantity: 9,
      reservedQuantity: 1,
    });
    expect(
      await ctx.prisma.sale.findUnique({ where: { id: second.id } }),
    ).toMatchObject({ status: 'PENDING_PAYMENT' });
    expect(
      await ctx.prisma.inventoryMovement.count({ where: { type: 'SALE' } }),
    ).toBe(1);
  });
});
