import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CheckoutDto, CheckoutPreviewDto } from './dto/checkout.dto.js';
import { CreateInStoreSaleDto } from './dto/create-in-store-sale.dto.js';
import { ListSalesQueryDto } from './dto/list-sales-query.dto.js';
import { SalesService } from './sales.service.js';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATOR, Role.BRANCH_MANAGER, Role.CASHIER, Role.CUSTOMER)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('in-store')
  @Roles(Role.ADMINISTRATOR, Role.BRANCH_MANAGER, Role.CASHIER)
  createInStore(
    @Body() dto: CreateInStoreSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.createInStore(dto, user);
  }

  @Post('checkout/preview')
  @Roles(Role.CUSTOMER)
  preview(
    @Body() dto: CheckoutPreviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.previewCheckout(dto, user);
  }

  @Post('checkout')
  @Roles(Role.CUSTOMER)
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.checkout(dto, user);
  }

  @Get('mine')
  @Roles(Role.CUSTOMER)
  findMine(
    @Query() query: ListSalesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.findMine(query, user);
  }

  @Get()
  @Roles(Role.ADMINISTRATOR, Role.BRANCH_MANAGER, Role.CASHIER)
  findAll(
    @Query() query: ListSalesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.findAll(query, user);
  }

  @Get(':id/receipt')
  receipt(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.receipt(id, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.findOne(id, user);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.cancel(id, user);
  }
}
