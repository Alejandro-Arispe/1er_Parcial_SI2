import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to execute the database seed.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const roles = [
    {
      name: 'ADMINISTRATOR' as const,
      description: 'Administración general de la plataforma',
    },
    {
      name: 'BRANCH_MANAGER' as const,
      description: 'Gestión de reservas e inventario de una sucursal',
    },
    {
      name: 'CASHIER' as const,
      description: 'Registro de ventas y pagos presenciales',
    },
    {
      name: 'CUSTOMER' as const,
      description: 'Cliente de las aplicaciones web y móvil',
    },
    {
      name: 'SUPPLIER' as const,
      description: 'Proveedor de prendas',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to execute the seed.',
    );
  }
  const administratorRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'ADMINISTRATOR' },
  });
  const adminPasswordHash = await hash(
    adminPassword,
    Number.parseInt(process.env.PASSWORD_SALT_ROUNDS ?? '12', 10),
  );
  const administrator = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador FashionStore',
      passwordHash: adminPasswordHash,
      active: true,
    },
    create: {
      name: 'Administrador FashionStore',
      email: adminEmail,
      passwordHash: adminPasswordHash,
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: administrator.id,
        roleId: administratorRole.id,
      },
    },
    update: {},
    create: {
      userId: administrator.id,
      roleId: administratorRole.id,
    },
  });

  const centralBranch = await prisma.branch.upsert({
    where: {
      city_name: {
        city: 'Santa Cruz de la Sierra',
        name: 'Sucursal Central',
      },
    },
    update: {
      address: 'Av. Principal #100',
      phone: '+591 70000000',
      active: true,
    },
    create: {
      name: 'Sucursal Central',
      city: 'Santa Cruz de la Sierra',
      address: 'Av. Principal #100',
      phone: '+591 70000000',
    },
  });

  const category = await prisma.category.upsert({
    where: { name: 'Camisas' },
    update: {},
    create: {
      name: 'Camisas',
      description: 'Camisas casuales y formales',
    },
  });

  const season = await prisma.season.upsert({
    where: { name: 'Primavera-Verano 2026' },
    update: { active: true },
    create: {
      name: 'Primavera-Verano 2026',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-02-28T00:00:00.000Z'),
      active: true,
    },
  });

  const collection = await prisma.collection.upsert({
    where: {
      seasonId_name: {
        seasonId: season.id,
        name: 'Esencial 2026',
      },
    },
    update: { active: true },
    create: {
      seasonId: season.id,
      name: 'Esencial 2026',
      description: 'Colección base para las pruebas del MVP',
      active: true,
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { name: 'Textiles Andinos' },
    update: { active: true },
    create: {
      name: 'Textiles Andinos',
      contact: 'Contacto de demostración',
      phone: '+591 71111111',
      email: 'ventas@textiles-andinos.test',
    },
  });

  const mediumSize = await prisma.size.upsert({
    where: { name: 'M' },
    update: {},
    create: { name: 'M' },
  });
  const largeSize = await prisma.size.upsert({
    where: { name: 'L' },
    update: {},
    create: { name: 'L' },
  });
  const blueColor = await prisma.color.upsert({
    where: { name: 'Azul' },
    update: { hexCode: '#2563EB' },
    create: { name: 'Azul', hexCode: '#2563EB' },
  });

  const existingProduct = await prisma.product.findFirst({
    where: {
      name: 'Camisa Oxford',
      supplierId: supplier.id,
    },
  });
  const productData = {
    name: 'Camisa Oxford',
    description: 'Camisa Oxford de demostración para el catálogo del MVP',
    price: '249.90',
    imageUrl: 'https://placehold.co/800x1000?text=Camisa+Oxford',
    categoryId: category.id,
    seasonId: season.id,
    collectionId: collection.id,
    supplierId: supplier.id,
    active: true,
  };
  const product = existingProduct
    ? await prisma.product.update({
        where: { id: existingProduct.id },
        data: productData,
      })
    : await prisma.product.create({ data: productData });

  await prisma.productSize.createMany({
    data: [
      { productId: product.id, sizeId: mediumSize.id },
      { productId: product.id, sizeId: largeSize.id },
    ],
    skipDuplicates: true,
  });
  await prisma.productColor.createMany({
    data: [{ productId: product.id, colorId: blueColor.id }],
    skipDuplicates: true,
  });

  for (const size of [mediumSize, largeSize]) {
    await prisma.inventory.upsert({
      where: {
        branchId_productId_sizeId_colorId: {
          branchId: centralBranch.id,
          productId: product.id,
          sizeId: size.id,
          colorId: blueColor.id,
        },
      },
      update: {},
      create: {
        branchId: centralBranch.id,
        productId: product.id,
        sizeId: size.id,
        colorId: blueColor.id,
        physicalQuantity: 10,
      },
    });
  }

  const existingArResource = await prisma.arResource.findFirst({
    where: { productId: product.id, type: 'IMAGE_OVERLAY' },
  });
  if (!existingArResource) {
    await prisma.arResource.create({
      data: {
        productId: product.id,
        type: 'IMAGE_OVERLAY',
        format: 'PNG',
        url: 'https://placehold.co/800x1000.png?text=Recurso+RA',
      },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
