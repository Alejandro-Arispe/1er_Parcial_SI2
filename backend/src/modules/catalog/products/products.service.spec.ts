import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductsRepository } from './products.repository.js';
import { ProductsService } from './products.service.js';

const productFixture = {
  id: 1,
  name: 'Camisa Oxford',
  description: null,
  price: { toString: () => '100' },
  imageUrl: null,
  discountPercent: { toString: () => '20' },
  promotionStart: new Date('2020-01-01'),
  promotionEnd: new Date('2099-01-01'),
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  categoryId: 1,
  seasonId: 1,
  collectionId: 1,
  supplierId: 1,
  category: { id: 1, name: 'Camisas' },
  season: { id: 1, name: 'Verano' },
  collection: { id: 1, name: 'Esencial' },
  supplier: { id: 1, name: 'Proveedor' },
  sizes: [{ size: { id: 1, name: 'M' } }],
  colors: [{ color: { id: 1, name: 'Azul', hexCode: '#0000FF' } }],
  arResources: [],
};

describe('ProductsService', () => {
  const repository = {
    findById: vi.fn(),
    getDependencies: vi.fn(),
    findBySupplierAndName: vi.fn(),
    countInventoryOutsideVariants: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as ProductsRepository;
  const service = new ProductsService(repository);

  beforeEach(() => vi.clearAllMocks());

  it('calculates the current promotional price', async () => {
    vi.mocked(repository.findById).mockResolvedValue(productFixture as never);

    const result = await service.findOne(1);

    expect(result.currentPrice).toBe(80);
    expect(result.promotionActive).toBe(true);
    expect(result.sizes).toEqual([{ id: 1, name: 'M' }]);
  });

  it('rejects a collection from a different season', async () => {
    vi.mocked(repository.getDependencies).mockResolvedValue([
      1,
      1,
      { active: true, seasonId: 99 },
      1,
      1,
      1,
    ]);

    await expect(
      service.create({
        name: 'Camisa',
        price: 100,
        discountPercent: 0,
        categoryId: 1,
        seasonId: 1,
        collectionId: 1,
        supplierId: 1,
        sizeIds: [1],
        colorIds: [1],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents removing variants that already have inventory history', async () => {
    vi.mocked(repository.findById).mockResolvedValue(productFixture as never);
    vi.mocked(repository.getDependencies).mockResolvedValue([
      1,
      1,
      { active: true, seasonId: 1 },
      1,
      1,
      1,
    ]);
    vi.mocked(repository.countInventoryOutsideVariants).mockResolvedValue(1);

    await expect(service.update(1, { sizeIds: [2] })).rejects.toThrow(
      ConflictException,
    );
  });
});
