import { Module } from '@nestjs/common';
import { SupplierPortalController } from './supplier-portal.controller.js';
import { SupplierPortalService } from './supplier-portal.service.js';
import { PassportModule } from '@nestjs/passport';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';
import { ProductsController } from './products/products.controller.js';
import { ProductsRepository } from './products/products.repository.js';
import { ProductsService } from './products/products.service.js';
import { ProductImagesService } from './products/product-images.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [
    CatalogController,
    ProductsController,
    SupplierPortalController,
  ],
  providers: [
    SupplierPortalService,
    ProductImagesService,
    CatalogService,
    CatalogRepository,
    ProductsService,
    ProductsRepository,
  ],
  exports: [CatalogService, ProductsService],
})
export class CatalogModule {}
