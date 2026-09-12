import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateInStoreSaleDto } from './dto/create-in-store-sale.dto.js';
import { CheckoutDto, CheckoutPreviewDto } from './dto/checkout.dto.js';
import { ListSalesQueryDto } from './dto/list-sales-query.dto.js';
import { SaleItemDto } from './dto/sale-item.dto.js';
import {
  fingerprint,
  presentLine,
  priceLine,
  saleTotal,
  sortedItems,
  variantKey,
} from './sale-pricing.js';
import type { SaleLine } from './sale-pricing.js';
import { SalesRepository } from './sales.repository.js';
import type { SaleRecord } from './sales.repository.js';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  constructor(
    private readonly repository: SalesRepository,
    private readonly config: ConfigService,
  ) {}

  async createInStore(dto: CreateInStoreSaleDto, user: AuthenticatedUser) {
    const items = sortedItems(dto.items);
    const reference = dto.paymentReference?.trim();
    if (dto.paymentMethod !== 'CASH' && !reference)
      throw new BadRequestException(
        'A paymentReference is required for non-cash payments',
      );
    if (reference && reference.length > 175)
      throw new BadRequestException('paymentReference is too long');
    const externalReference = reference
      ? `IN_STORE:${dto.paymentMethod}:${reference}`
      : undefined;
    const requestHash = fingerprint({
      type: 'IN_STORE',
      branchId: dto.branchId,
      clientId: dto.clientId ?? null,
      reservationId: dto.reservationId ?? null,
      items: items.map(({ productId, sizeId, colorId, quantity }) => ({
        productId,
        sizeId,
        colorId,
        quantity,
      })),
      expectedTotal: dto.expectedTotal,
      paymentMethod: dto.paymentMethod,
      reference: reference ?? null,
    });
    const sale = await this.repository.transaction(async (tx) => {
      const employeeId = await this.staffAccess(dto.branchId, user, tx);
      const replay = await this.replay(
        user.id,
        dto.idempotencyKey,
        requestHash,
        tx,
      );
      if (replay) return replay;
      await this.activeBranch(dto.branchId, tx);
      const reservation = dto.reservationId
        ? await this.repository.findReservation(dto.reservationId, tx)
        : null;
      if (dto.reservationId && !reservation)
        throw new NotFoundException('Reservation was not found');
      if (
        reservation &&
        (reservation.branchId !== dto.branchId ||
          reservation.status !== 'CUSTOMER_PRESENT' ||
          reservation.sale)
      ) {
        throw new ConflictException(
          'Reservation must be in this branch, with the customer present, and without a previous sale',
        );
      }
      if (reservation && dto.clientId && dto.clientId !== reservation.clientId)
        throw new BadRequestException('Client does not match the reservation');
      const clientId = reservation?.clientId ?? dto.clientId;
      if (clientId && !(await this.repository.findClientById(clientId, tx)))
        throw new BadRequestException('Client does not exist or is inactive');
      if (reservation) {
        for (const item of items) {
          const held = reservation.items.find(
            (entry) => variantKey(entry) === variantKey(item),
          );
          if (
            !held ||
            !['PENDING', 'PREPARED'].includes(held.status) ||
            item.quantity > held.quantity
          ) {
            throw new ConflictException(
              'Purchased quantities must belong to the reservation and not exceed its held quantities',
            );
          }
        }
      }
      const now = new Date();
      const lines = await this.quoteItems(
        items,
        dto.branchId,
        tx,
        Boolean(reservation),
        now,
      );
      const total = saleTotal(lines);
      if (!total.equals(dto.expectedTotal))
        throw new ConflictException(
          'Prices changed; review the current total before recording the payment',
        );
      const created = await this.repository.create(
        {
          clientId,
          employeeId,
          branchId: dto.branchId,
          reservationId: reservation?.id,
          createdById: user.id,
          idempotencyKey: dto.idempotencyKey,
          requestHash,
          channel: 'IN_STORE',
          status: 'COMPLETED',
          currency: this.currency(),
          total,
          confirmedAt: now,
          items: { create: lines },
          payments: {
            create: {
              method: dto.paymentMethod,
              type: 'IN_STORE',
              amount: total,
              status: 'APPROVED',
              externalReference,
              paidAt: now,
            },
          },
        },
        tx,
      );
      if (reservation) {
        const selected = new Map(
          items.map((item) => [variantKey(item), item.quantity]),
        );
        for (const held of sortedItems(reservation.items)) {
          if (!['PENDING', 'PREPARED'].includes(held.status))
            throw new ConflictException('Reservation stock is not held');
          const bought = selected.get(variantKey(held)) ?? 0;
          const stock = await this.requireStock(dto.branchId, held, tx);
          await this.repository.changeStock(stock, -bought, -held.quantity, tx);
          if (bought)
            await this.repository.movement(
              {
                inventoryId: stock.id,
                employeeId,
                type: 'SALE',
                quantity: bought,
                reference: `SALE:${created.id}`,
              },
              tx,
            );
          if (held.quantity > bought)
            await this.repository.movement(
              {
                inventoryId: stock.id,
                employeeId,
                type: 'RESERVATION_RELEASE',
                quantity: held.quantity - bought,
                reference: `RESERVATION:${reservation.id}`,
              },
              tx,
            );
          await this.repository.finishReservationItem(held.id, bought, tx);
        }
        await this.repository.finishReservation(reservation.id, tx);
      } else {
        for (const item of items) {
          const stock = await this.requireStock(dto.branchId, item, tx);
          await this.repository.changeStock(stock, -item.quantity, 0, tx);
          await this.repository.movement(
            {
              inventoryId: stock.id,
              employeeId,
              type: 'SALE',
              quantity: item.quantity,
              reference: `SALE:${created.id}`,
            },
            tx,
          );
        }
      }
      return created;
    });
    return this.present(sale);
  }

  async previewCheckout(dto: CheckoutPreviewDto, user: AuthenticatedUser) {
    return this.repository.transaction(async (tx) => {
      const clientId = await this.customer(user, tx);
      const quote = await this.checkoutQuote(dto, clientId, tx);
      return {
        cartId: quote.cart.id,
        branchId: dto.branchId,
        currency: quote.currency,
        total: quote.total.toNumber(),
        items: quote.lines.map(presentLine),
        quoteHash: quote.quoteHash,
      };
    });
  }

  async checkout(dto: CheckoutDto, user: AuthenticatedUser) {
    const requestHash = fingerprint({
      type: 'CHECKOUT',
      cartId: dto.cartId,
      branchId: dto.branchId,
      channel: dto.channel,
      quoteHash: dto.quoteHash,
    });
    const sale = await this.repository.transaction(async (tx) => {
      const clientId = await this.customer(user, tx);
      const replay = await this.replay(
        user.id,
        dto.idempotencyKey,
        requestHash,
        tx,
      );
      if (replay) return replay;
      const quote = await this.checkoutQuote(dto, clientId, tx);
      if (quote.quoteHash !== dto.quoteHash)
        throw new ConflictException(
          'Cart or prices changed; request a new checkout preview',
        );
      const expiresAt = new Date(
        Date.now() +
          (this.config.get<number>('CHECKOUT_HOLD_MINUTES') ?? 15) * 60000,
      );
      const created = await this.repository.create(
        {
          clientId,
          branchId: dto.branchId,
          cartId: dto.cartId,
          createdById: user.id,
          idempotencyKey: dto.idempotencyKey,
          requestHash,
          channel: dto.channel,
          status: 'PENDING_PAYMENT',
          total: quote.total,
          currency: quote.currency,
          stockReserved: true,
          expiresAt,
          items: { create: quote.lines },
          payments: {
            create: {
              method: 'GATEWAY',
              type: 'ELECTRONIC',
              amount: quote.total,
              status: 'PENDING',
            },
          },
        },
        tx,
      );
      for (const item of quote.lines) {
        const stock = await this.requireStock(dto.branchId, item, tx);
        await this.repository.changeStock(stock, 0, item.quantity, tx);
        await this.repository.movement(
          {
            inventoryId: stock.id,
            type: 'CHECKOUT_HOLD',
            quantity: item.quantity,
            reference: `SALE:${created.id}`,
          },
          tx,
        );
      }
      await this.repository.convertCart(dto.cartId, tx);
      return created;
    });
    return this.present(sale);
  }

  // Internal integration boundary: call only after the Payments module verifies the provider event.
  // There is intentionally no HTTP route allowing a customer to approve a payment.
  async confirmElectronicPayment(
    saleId: number,
    confirmation: { reference: string; amount: string; currency: string },
  ) {
    if (
      !confirmation.reference.trim() ||
      confirmation.reference.length > 180 ||
      !/^\d{1,10}(\.\d{1,2})?$/.test(confirmation.amount)
    ) {
      throw new BadRequestException('Invalid provider confirmation');
    }
    const externalReference = `GATEWAY:${confirmation.reference.trim()}`;
    const result = await this.repository.transaction(async (tx) => {
      const sale = await this.requireSale(saleId, tx);
      if (
        sale.channel === 'IN_STORE' ||
        !sale.total.equals(confirmation.amount) ||
        sale.currency !== confirmation.currency.toUpperCase()
      ) {
        throw new ConflictException(
          'Payment amount, currency or channel does not match the sale',
        );
      }
      const payment = sale.payments.find(
        (entry) => entry.type === 'ELECTRONIC',
      );
      if (!payment)
        throw new ConflictException('Pending electronic payment is missing');
      if (
        sale.status === 'COMPLETED' &&
        payment.status === 'APPROVED' &&
        payment.externalReference === externalReference
      ) {
        return { sale, expired: false };
      }
      if (
        sale.status !== 'PENDING_PAYMENT' ||
        !sale.stockReserved ||
        payment.status !== 'PENDING'
      ) {
        throw new ConflictException('Sale is no longer awaiting payment');
      }
      if (!sale.expiresAt || sale.expiresAt <= new Date()) {
        return {
          sale: await this.cancelPending(sale, 'PAYMENT_WINDOW_EXPIRED', tx),
          expired: true,
        };
      }
      for (const item of sortedItems(sale.items)) {
        const stock = await this.requireStock(sale.branchId!, item, tx);
        await this.repository.changeStock(
          stock,
          -item.quantity,
          -item.quantity,
          tx,
        );
        await this.repository.movement(
          {
            inventoryId: stock.id,
            type: 'SALE',
            quantity: item.quantity,
            reference: `SALE:${sale.id}`,
          },
          tx,
        );
      }
      const now = new Date();
      await this.repository.updatePayment(
        payment.id,
        { status: 'APPROVED', externalReference, paidAt: now },
        tx,
      );
      return {
        sale: await this.repository.update(
          sale.id,
          { status: 'COMPLETED', stockReserved: false, confirmedAt: now },
          tx,
        ),
        expired: false,
      };
    });
    if (result.expired)
      throw new ConflictException(
        'Payment arrived after expiration; stock was released. Payments must reconcile or refund the provider transaction',
      );
    return this.present(result.sale);
  }

  async cancel(id: number, user: AuthenticatedUser) {
    const sale = await this.repository.transaction(async (tx) => {
      const current = await this.requireSale(id, tx);
      await this.assertAccess(current, user, tx);
      if (current.status === 'CANCELLED') return current;
      if (
        current.channel === 'IN_STORE' ||
        current.status !== 'PENDING_PAYMENT'
      ) {
        throw new ConflictException(
          'Only unpaid digital sales can be cancelled; paid sales require a refund',
        );
      }
      return this.cancelPending(current, 'USER_CANCELLED', tx);
    });
    return this.present(sale);
  }

  // Internal gateway/expiration operation; never exposed as a payment approval route.
  async cancelElectronicPayment(
    id: number,
    reason: 'STRIPE_CANCELLED' | 'PAYMENT_WINDOW_EXPIRED',
  ) {
    return this.repository.transaction(async (tx) => {
      const sale = await this.requireSale(id, tx);
      if (sale.status === 'CANCELLED') return;
      if (sale.channel === 'IN_STORE' || sale.status !== 'PENDING_PAYMENT')
        throw new ConflictException('Sale is no longer awaiting payment');
      if (
        reason === 'PAYMENT_WINDOW_EXPIRED' &&
        sale.expiresAt &&
        sale.expiresAt > new Date()
      )
        throw new ConflictException('Checkout has not expired');
      await this.cancelPending(sale, reason, tx);
    });
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const sale = await this.requireSale(id);
    await this.assertAccess(sale, user);
    return this.present(sale);
  }

  async receipt(id: number, user: AuthenticatedUser) {
    const sale = await this.findOne(id, user);
    if (sale.status !== 'COMPLETED')
      throw new ConflictException('A receipt requires a completed sale');
    return { receiptNumber: `FS-${id.toString().padStart(8, '0')}`, ...sale };
  }

  async findMine(query: ListSalesQueryDto, user: AuthenticatedUser) {
    if (!user.roles.includes(Role.CUSTOMER))
      throw new ForbiddenException('A customer role is required');
    this.validateDates(query);
    const result = await this.repository.findAll(query, user.id);
    return { ...result, data: result.data.map((sale) => this.present(sale)) };
  }

  async findAll(query: ListSalesQueryDto, user: AuthenticatedUser) {
    this.validateDates(query);
    let scoped = query;
    if (!user.roles.includes(Role.ADMINISTRATOR)) {
      const employee = await this.employee(user);
      if (query.branchId && query.branchId !== employee.branchId)
        throw new ForbiddenException(
          'You can only consult your assigned branch',
        );
      scoped = { ...query, branchId: employee.branchId };
    }
    const result = await this.repository.findAll(scoped);
    return { ...result, data: result.data.map((sale) => this.present(sale)) };
  }

  async expirePendingCheckouts(now = new Date()): Promise<number> {
    let afterId = 0;
    let expired = 0;
    for (;;) {
      const batch = await this.repository.findExpired(now, afterId);
      for (const { id } of batch) {
        try {
          const changed = await this.repository.transaction(async (tx) => {
            const sale = await this.repository.findById(id, tx);
            if (
              !sale ||
              sale.status !== 'PENDING_PAYMENT' ||
              !sale.stockReserved ||
              !sale.expiresAt ||
              sale.expiresAt > now
            )
              return false;
            await this.cancelPending(sale, 'PAYMENT_WINDOW_EXPIRED', tx);
            return true;
          });
          if (changed) expired++;
        } catch (error) {
          this.logger.error(
            `Could not expire checkout ${id}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
        afterId = id;
      }
      if (batch.length < 100) return expired;
    }
  }

  private async cancelPending(
    sale: SaleRecord,
    reason: string,
    tx: Prisma.TransactionClient,
  ) {
    if (sale.stockReserved) {
      for (const item of sortedItems(sale.items)) {
        const stock = await this.requireStock(sale.branchId!, item, tx);
        await this.repository.changeStock(stock, 0, -item.quantity, tx);
        await this.repository.movement(
          {
            inventoryId: stock.id,
            type: 'CHECKOUT_RELEASE',
            quantity: item.quantity,
            reference: `SALE:${sale.id}`,
          },
          tx,
        );
      }
    }
    for (const payment of sale.payments) {
      if (payment.status === 'PENDING')
        await this.repository.updatePayment(
          payment.id,
          { status: 'VOIDED' },
          tx,
        );
    }
    return this.repository.update(
      sale.id,
      { status: 'CANCELLED', stockReserved: false, cancellationReason: reason },
      tx,
    );
  }

  private async checkoutQuote(
    dto: CheckoutPreviewDto,
    clientId: number,
    tx: Prisma.TransactionClient,
  ) {
    await this.activeBranch(dto.branchId, tx);
    const cart = await this.repository.findCart(dto.cartId, clientId, tx);
    if (!cart)
      throw new NotFoundException(
        'Active cart was not found for this customer',
      );
    const lines = await this.quoteItems(
      sortedItems(cart.items),
      dto.branchId,
      tx,
      false,
      new Date(),
    );
    const total = saleTotal(lines);
    const currency = this.currency();
    const quoteHash = fingerprint({
      cartId: cart.id,
      updatedAt: cart.updatedAt.toISOString(),
      branchId: dto.branchId,
      currency,
      lines,
      total: total.toFixed(2),
    });
    return { cart, lines, total, currency, quoteHash };
  }

  private async quoteItems(
    items: SaleItemDto[],
    branchId: number,
    tx: Prisma.TransactionClient,
    reserved: boolean,
    now: Date,
  ) {
    const lines: SaleLine[] = [];
    for (const item of items) {
      const stock = await this.repository.findStock(branchId, item, tx);
      if (!stock)
        throw new ConflictException(
          `Unavailable product/variant in branch: ${variantKey(item)}`,
        );
      const available = reserved
        ? stock.reservedQuantity
        : stock.physicalQuantity - stock.reservedQuantity;
      if (available < item.quantity)
        throw new ConflictException(`Insufficient stock: ${variantKey(item)}`);
      lines.push(
        priceLine(item, stock.product, stock.size.name, stock.color.name, now),
      );
    }
    return lines;
  }

  private async requireStock(
    branchId: number,
    item: Pick<SaleItemDto, 'productId' | 'sizeId' | 'colorId'>,
    tx: Prisma.TransactionClient,
  ) {
    const stock = await this.repository.findStock(branchId, item, tx, false);
    if (!stock) throw new ConflictException('Sale inventory is missing');
    return stock;
  }

  private async replay(
    userId: number,
    key: string,
    hash: string,
    tx: Prisma.TransactionClient,
  ) {
    const previous = await this.repository.findRequest(userId, key, tx);
    if (previous && previous.requestHash !== hash)
      throw new ConflictException(
        'Idempotency key was already used with a different request',
      );
    return previous;
  }

  private async requireSale(id: number, tx?: Prisma.TransactionClient) {
    const sale = await this.repository.findById(id, tx);
    if (!sale) throw new NotFoundException('Sale was not found');
    return sale;
  }

  private async assertAccess(
    sale: SaleRecord,
    user: AuthenticatedUser,
    tx?: Prisma.TransactionClient,
  ) {
    if (user.roles.includes(Role.CUSTOMER) && sale.client?.userId === user.id)
      return;
    if (!sale.branchId && !user.roles.includes(Role.ADMINISTRATOR))
      throw new ForbiddenException('Sale has no assigned branch');
    await this.staffAccess(sale.branchId ?? 0, user, tx);
  }

  private async employee(
    user: AuthenticatedUser,
    tx?: Prisma.TransactionClient,
  ) {
    if (
      !user.roles.some(
        (role) => role === Role.CASHIER || role === Role.BRANCH_MANAGER,
      )
    )
      throw new ForbiddenException(
        'A cashier or branch manager role is required',
      );
    const employee = await this.repository.findEmployee(user.id, tx);
    if (!employee?.active)
      throw new ForbiddenException('An active employee profile is required');
    return employee;
  }

  private async staffAccess(
    branchId: number,
    user: AuthenticatedUser,
    tx?: Prisma.TransactionClient,
  ) {
    if (user.roles.includes(Role.ADMINISTRATOR)) return undefined;
    const employee = await this.employee(user, tx);
    if (employee.branchId !== branchId)
      throw new ForbiddenException(
        'You can only operate in your assigned branch',
      );
    return employee.id;
  }

  private async customer(
    user: AuthenticatedUser,
    tx: Prisma.TransactionClient,
  ) {
    if (!user.roles.includes(Role.CUSTOMER))
      throw new ForbiddenException('A customer role is required');
    const client = await this.repository.findClient(user.id, tx);
    if (!client)
      throw new ForbiddenException('An active customer profile is required');
    return client.id;
  }

  private async activeBranch(id: number, tx: Prisma.TransactionClient) {
    if (!(await this.repository.findBranch(id, tx))?.active)
      throw new BadRequestException('Branch does not exist or is inactive');
  }

  private currency() {
    return this.config.get<string>('SALES_CURRENCY') ?? 'BOB';
  }

  private validateDates(query: ListSalesQueryDto) {
    if (query.from && query.to && new Date(query.from) > new Date(query.to))
      throw new BadRequestException('to cannot be earlier than from');
  }

  private present(sale: SaleRecord) {
    const {
      requestHash: _requestHash,
      idempotencyKey: _idempotencyKey,
      createdById: _createdById,
      ...data
    } = sale;
    return {
      ...data,
      total: sale.total.toNumber(),
      items: sale.items.map(presentLine),
      payments: sale.payments.map(
        ({ stripeRequestKey: _stripeRequestKey, ...payment }) => ({
          ...payment,
          amount: payment.amount.toNumber(),
        }),
      ),
    };
  }
}
