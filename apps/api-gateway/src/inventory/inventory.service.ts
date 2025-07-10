import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
    private websocketGateway: WebsocketGateway,
  ) {}

  async create(createInventoryItemDto: CreateInventoryItemDto): Promise<InventoryItem> {
    const inventoryItem = this.inventoryRepository.create({
      ...createInventoryItemDto,
      lastRestocked: new Date(),
    });
    return this.inventoryRepository.save(inventoryItem);
  }

  async findAll(branchId?: string): Promise<InventoryItem[]> {
    const where = branchId ? { branchId } : {};
    return this.inventoryRepository.find({
      where,
      relations: ['branch', 'menuItem'],
    });
  }

  async findOne(id: string): Promise<InventoryItem> {
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['branch', 'menuItem'],
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return inventoryItem;
  }

  async update(id: string, updateInventoryItemDto: UpdateInventoryItemDto): Promise<InventoryItem> {
    await this.inventoryRepository.update(id, updateInventoryItemDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.inventoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
  }

  async getLowStock(branchId: string): Promise<InventoryItem[]> {
    return this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.menuItem', 'menuItem')
      .leftJoinAndSelect('inventory.branch', 'branch')
      .where('inventory.branchId = :branchId', { branchId })
      .andWhere('inventory.currentStock <= inventory.minimumStock')
      .getMany();
  }

  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<InventoryItem> {
    const item = await this.findOne(id);
    
    let newStock: number;
    switch (operation) {
      case 'add':
        newStock = item.currentStock + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, item.currentStock - quantity);
        break;
      case 'set':
        newStock = quantity;
        break;
    }

    await this.inventoryRepository.update(id, { 
      currentStock: newStock,
      lastRestocked: operation === 'add' ? new Date() : item.lastRestocked,
    });

    const updatedItem = await this.findOne(id);

    this.websocketGateway.sendInventoryUpdate(updatedItem.branchId, {
      itemId: id,
      currentStock: newStock,
      minimumStock: item.minimumStock,
      operation,
      timestamp: new Date(),
    });

    if (newStock <= item.minimumStock) {
      this.websocketGateway.sendInventoryAlert(updatedItem.branchId, {
        itemId: id,
        itemName: updatedItem.menuItem?.name || 'Unknown Item',
        currentStock: newStock,
        minimumStock: item.minimumStock,
        severity: newStock === 0 ? 'critical' : 'warning',
        message: newStock === 0 
          ? `${updatedItem.menuItem?.name || 'Item'} is out of stock!`
          : `${updatedItem.menuItem?.name || 'Item'} is running low (${newStock} left)`,
      });
    }

    return updatedItem;
  }

  async predictStockDepletion(branchId: string): Promise<any[]> {
    const items = await this.findAll(branchId);
    const predictions = [];

    for (const item of items) {
      const dailyUsage = await this.calculateDailyUsage(item.id);
      const daysUntilDepletion = dailyUsage > 0 ? Math.floor(item.currentStock / dailyUsage) : 999;
      
      predictions.push({
        itemId: item.id,
        itemName: item.menuItem?.name || 'Unknown',
        currentStock: item.currentStock,
        dailyUsage,
        daysUntilDepletion,
        recommendedReorderDate: new Date(Date.now() + (daysUntilDepletion - 3) * 24 * 60 * 60 * 1000),
        urgency: daysUntilDepletion <= 2 ? 'high' : daysUntilDepletion <= 5 ? 'medium' : 'low',
      });
    }

    return predictions.sort((a, b) => a.daysUntilDepletion - b.daysUntilDepletion);
  }

  async generateReorderSuggestions(branchId: string): Promise<any[]> {
    const predictions = await this.predictStockDepletion(branchId);
    const suggestions = [];

    for (const prediction of predictions) {
      if (prediction.urgency === 'high' || prediction.urgency === 'medium') {
        const optimalQuantity = Math.ceil(prediction.dailyUsage * 14); // 2 weeks supply
        
        suggestions.push({
          itemId: prediction.itemId,
          itemName: prediction.itemName,
          currentStock: prediction.currentStock,
          suggestedQuantity: optimalQuantity,
          estimatedCost: optimalQuantity * 5, // Mock cost calculation
          urgency: prediction.urgency,
          reason: `Based on daily usage of ${prediction.dailyUsage} units, will run out in ${prediction.daysUntilDepletion} days`,
        });
      }
    }

    return suggestions;
  }

  async getInventoryAnalytics(branchId: string): Promise<any> {
    const items = await this.findAll(branchId);
    const lowStockItems = await this.getLowStock(branchId);
    const predictions = await this.predictStockDepletion(branchId);
    
    const totalValue = items.reduce((sum, item) => sum + (item.currentStock * 5), 0); // Mock value calculation
    const criticalItems = predictions.filter(p => p.urgency === 'high').length;
    const warningItems = predictions.filter(p => p.urgency === 'medium').length;

    return {
      totalItems: items.length,
      totalValue,
      lowStockItems: lowStockItems.length,
      criticalItems,
      warningItems,
      turnoverRate: await this.calculateTurnoverRate(branchId),
      topMovingItems: await this.getTopMovingItems(branchId),
      predictions: predictions.slice(0, 10), // Top 10 predictions
    };
  }

  private async calculateDailyUsage(itemId: string): Promise<number> {
    return Math.floor(Math.random() * 10) + 1;
  }

  private async calculateTurnoverRate(branchId: string): Promise<number> {
    return Math.random() * 5 + 2; // 2-7 times per month
  }

  private async getTopMovingItems(branchId: string): Promise<any[]> {
    const items = await this.findAll(branchId);
    
    return items.slice(0, 5).map(item => ({
      id: item.id,
      name: item.menuItem?.name || 'Unknown',
      dailyUsage: Math.floor(Math.random() * 15) + 5,
      weeklyTrend: Math.random() > 0.5 ? 'up' : 'down',
      trendPercentage: Math.floor(Math.random() * 30) + 5,
    }));
  }

  async processAutomaticReorder(branchId: string): Promise<any[]> {
    const suggestions = await this.generateReorderSuggestions(branchId);
    const processedOrders = [];

    for (const suggestion of suggestions) {
      if (suggestion.urgency === 'high') {
        processedOrders.push({
          ...suggestion,
          status: 'auto_approved',
          orderDate: new Date(),
          expectedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        });

        this.websocketGateway.sendSystemAlert(branchId, {
          title: 'Automatic Reorder Processed',
          message: `Auto-ordered ${suggestion.suggestedQuantity} units of ${suggestion.itemName}`,
          severity: 'info',
          type: 'reorder',
        });
      }
    }

    return processedOrders;
  }
}
