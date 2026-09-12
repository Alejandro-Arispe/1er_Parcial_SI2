import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';
import { ProductsController } from './products/products.controller.js';
import { ProductsRepository } from './products/products.repository.js';
import { ProductsService } from './products/products.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CatalogController, ProductsController],
  providers: [
    CatalogService,
    CatalogRepository,
    ProductsService,
    ProductsRepository,
  ],
  exports: [CatalogService, ProductsService],
})
export class CatalogModule {}
