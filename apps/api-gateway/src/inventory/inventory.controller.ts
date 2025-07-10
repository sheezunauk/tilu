import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Create inventory item' })
  @Post()
  create(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.create(createInventoryItemDto);
  }

  @ApiOperation({ summary: 'Get all inventory items' })
  @Get()
  findAll(@Query('branchId') branchId?: string) {
    return this.inventoryService.findAll(branchId);
  }

  @ApiOperation({ summary: 'Get inventory item by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @ApiOperation({ summary: 'Update inventory item' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInventoryItemDto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, updateInventoryItemDto);
  }

  @ApiOperation({ summary: 'Delete inventory item' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }

  @ApiOperation({ summary: 'Get low stock items' })
  @Get('low-stock/:branchId')
  getLowStock(@Param('branchId') branchId: string) {
    return this.inventoryService.getLowStock(branchId);
  }

  @ApiOperation({ summary: 'Update stock level' })
  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() body: { quantity: number; operation: 'add' | 'subtract' | 'set' }) {
    return this.inventoryService.updateStock(id, body.quantity, body.operation);
  }

  @ApiOperation({ summary: 'Get stock depletion predictions' })
  @Get('predictions/:branchId')
  getStockPredictions(@Param('branchId') branchId: string) {
    return this.inventoryService.predictStockDepletion(branchId);
  }

  @ApiOperation({ summary: 'Get reorder suggestions' })
  @Get('reorder-suggestions/:branchId')
  getReorderSuggestions(@Param('branchId') branchId: string) {
    return this.inventoryService.generateReorderSuggestions(branchId);
  }

  @ApiOperation({ summary: 'Get inventory analytics' })
  @Get('analytics/:branchId')
  getInventoryAnalytics(@Param('branchId') branchId: string) {
    return this.inventoryService.getInventoryAnalytics(branchId);
  }

  @ApiOperation({ summary: 'Process automatic reorders' })
  @Post('auto-reorder/:branchId')
  processAutoReorder(@Param('branchId') branchId: string) {
    return this.inventoryService.processAutomaticReorder(branchId);
  }
}
