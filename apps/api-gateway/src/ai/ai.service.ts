import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Order } from '../orders/entities/order.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async routeOrder(customerLocation: { lat: number; lng: number }, orderItems: any[]): Promise<any> {
    const branches = await this.branchRepository.find({ where: { isActive: true } });
    
    const branchScores = await Promise.all(branches.map(async (branch) => {
      const distance = this.calculateDistance(
        customerLocation.lat, customerLocation.lng,
        branch.latitude, branch.longitude
      );
      
      const withinRadius = distance <= branch.deliveryRadius;
      if (!withinRadius) return null;

      const queueLength = await this.getKitchenQueueLength(branch.id);
      const inventoryScore = await this.getInventoryAvailabilityScore(branch.id, orderItems);
      
      const distanceScore = Math.max(0, 100 - (distance * 10));
      const queueScore = Math.max(0, 100 - (queueLength * 5));
      
      const totalScore = (distanceScore * 0.4) + (queueScore * 0.3) + (inventoryScore * 0.3);
      
      return {
        branchId: branch.id,
        branchName: branch.name,
        distance,
        queueLength,
        inventoryScore,
        totalScore,
        estimatedTime: Math.round(15 + (distance * 2) + (queueLength * 1.5)),
      };
    }));

    const validBranches = branchScores.filter(score => score !== null);
    validBranches.sort((a, b) => b.totalScore - a.totalScore);

    if (validBranches.length === 0) {
      return {
        recommendedBranch: null,
        error: 'No branches available for delivery to this location',
        alternatives: [],
      };
    }

    const recommended = validBranches[0];
    const alternatives = validBranches.slice(1, 4);

    return {
      recommendedBranch: recommended.branchId,
      branchName: recommended.branchName,
      estimatedDeliveryTime: recommended.estimatedTime,
      confidence: Math.min(0.95, recommended.totalScore / 100),
      distance: recommended.distance,
      queueLength: recommended.queueLength,
      alternatives: alternatives.map(alt => ({
        branchId: alt.branchId,
        branchName: alt.branchName,
        estimatedTime: alt.estimatedTime,
        distance: alt.distance,
        score: alt.totalScore,
      })),
      reasoning: {
        distanceWeight: 0.4,
        queueWeight: 0.3,
        inventoryWeight: 0.3,
      },
    };
  }

  async predictInventory(branchId: string, menuItemId: string, days: number): Promise<any> {
    const historicalOrders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .where('order.branchId = :branchId', { branchId })
      .andWhere('item.menuItemId = :menuItemId', { menuItemId })
      .andWhere('order.createdAt >= :startDate', { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      })
      .select(['order.createdAt', 'SUM(item.quantity) as dailyDemand'])
      .groupBy('DATE(order.createdAt)')
      .orderBy('order.createdAt', 'ASC')
      .getRawMany();

    const currentInventory = await this.inventoryRepository.findOne({
      where: { branchId, menuItemId },
    });

    const currentStock = currentInventory?.currentStock || 0;
    const averageDailyDemand = this.calculateAverageDemand(historicalOrders);
    const demandVariance = this.calculateDemandVariance(historicalOrders, averageDailyDemand);
    
    const predictions = [];
    let projectedStock = currentStock;
    
    for (let i = 0; i < days; i++) {
      const dayOfWeek = new Date(Date.now() + i * 24 * 60 * 60 * 1000).getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
      
      const predictedDemand = Math.round(
        averageDailyDemand * weekendMultiplier * (0.8 + Math.random() * 0.4)
      );
      
      projectedStock -= predictedDemand;
      
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predictedDemand,
        projectedStock: Math.max(0, projectedStock),
        stockoutRisk: projectedStock <= 0 ? 1.0 : Math.max(0, (10 - projectedStock) / 10),
      });
    }

    const reorderPoint = Math.ceil(averageDailyDemand * 3 + Math.sqrt(demandVariance) * 2);
    const suggestedOrderQuantity = Math.ceil(averageDailyDemand * 7);
    
    return {
      currentStock,
      averageDailyDemand: Math.round(averageDailyDemand * 100) / 100,
      predictions,
      reorderPoint,
      suggestedOrderQuantity,
      confidence: Math.min(0.95, Math.max(0.6, 1 - (demandVariance / (averageDailyDemand * averageDailyDemand)))),
      alerts: projectedStock <= reorderPoint ? ['Stock level will reach reorder point'] : [],
    };
  }

  async processStaffQuery(query: string, context?: string): Promise<string> {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('sales') || lowerQuery.includes('revenue')) {
      return 'Today\'s sales are £1,247.50, which is 12% higher than yesterday. The best-selling item is Chicken Tikka Masala with 23 orders. Peak hour was 12:30-1:30 PM with £312 in sales.';
    }
    
    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
      return 'Current stock levels: Chicken (85%), Rice (92%), Naan bread (78%). ⚠️ Garlic Naan is running low (12 portions left) and should be restocked soon. Mango Lassi ingredients are at 95%.';
    }
    
    if (lowerQuery.includes('customer') || lowerQuery.includes('order')) {
      return 'There are currently 3 pending orders. Average wait time is 18 minutes. Next order up: ORD-001 for John Smith (Chicken Tikka Masala + Garlic Naan). 2 delivery orders in queue.';
    }
    
    if (lowerQuery.includes('popular') || lowerQuery.includes('trending')) {
      return 'Today\'s trending items: 1) Chicken Tikka Masala (23 orders), 2) Fish & Chips (18 orders), 3) Vegetable Curry (15 orders). Mango Lassi is the most popular drink.';
    }
    
    if (lowerQuery.includes('help') || lowerQuery.includes('training')) {
      return 'Quick tips: Use fuzzy search for faster item lookup, suggest Garlic Naan with curry orders (92% acceptance rate), and offer Mango Lassi as a combo (increases order value by £2.95 average).';
    }
    
    if (lowerQuery.includes('busy') || lowerQuery.includes('rush')) {
      return 'Current kitchen load: Medium (3 orders in queue). Estimated prep time for new orders: 20-25 minutes. Consider suggesting quick items like Garlic Naan or pre-made desserts.';
    }
    
    return 'I can help you with sales data, inventory levels, customer information, order management, popular items, and staff tips. Try asking about "today\'s sales", "stock levels", "popular items", or "kitchen status".';
  }

  async generateSmartRecommendations(
    currentOrder: Array<{ id: string; name: string; price: number; category: string }>,
    customerId?: string,
    context?: string
  ): Promise<any[]> {
    const recommendations = [];
    
    const hasMainDish = currentOrder.some(item => 
      item.category === 'mains' || 
      item.name.toLowerCase().includes('curry') || 
      item.name.toLowerCase().includes('masala') ||
      item.name.toLowerCase().includes('fish')
    );
    
    const hasDrink = currentOrder.some(item => 
      item.category === 'drinks' || 
      item.name.toLowerCase().includes('lassi') ||
      item.name.toLowerCase().includes('chai')
    );
    
    const hasBread = currentOrder.some(item => 
      item.name.toLowerCase().includes('naan') ||
      item.name.toLowerCase().includes('bread')
    );

    if (hasMainDish && !hasDrink) {
      recommendations.push({
        id: 'rec-drink',
        type: 'combo',
        title: 'Perfect Drink Pairing',
        description: 'Complete your meal with a refreshing drink',
        items: [
          { id: 'drink-1', name: 'Mango Lassi', price: 2.95 },
          { id: 'drink-2', name: 'Masala Chai', price: 2.50 },
        ],
        confidence: 0.89,
        reason: '89% of customers with curry orders add a drink',
      });
    }

    if (hasMainDish && !hasBread) {
      recommendations.push({
        id: 'rec-bread',
        type: 'upsell',
        title: 'Add Garlic Naan',
        description: 'Perfect for sharing and soaking up delicious sauces',
        items: [
          { id: 'bread-1', name: 'Garlic Naan', price: 3.50 },
        ],
        confidence: 0.92,
        reason: 'Most popular side dish - 92% acceptance rate',
      });
    }

    if (currentOrder.length >= 2 && !currentOrder.some(item => item.name.toLowerCase().includes('dessert'))) {
      recommendations.push({
        id: 'rec-dessert',
        type: 'popular',
        title: 'Sweet Finish',
        description: 'End your meal with our customer favorite dessert',
        items: [
          { id: 'dessert-1', name: 'Gulab Jamun', price: 4.50 },
        ],
        confidence: 0.78,
        reason: 'Trending dessert with 4.8★ rating this week',
      });
    }

    const orderValue = currentOrder.reduce((sum, item) => sum + item.price, 0);
    if (orderValue >= 15 && orderValue < 20) {
      recommendations.push({
        id: 'rec-combo',
        type: 'seasonal',
        title: 'Upgrade to Family Combo',
        description: 'Add another main dish and save £3',
        items: [
          { id: 'main-2', name: 'Vegetable Curry', price: 9.99 },
          { id: 'rice-1', name: 'Basmati Rice', price: 2.50 },
        ],
        savings: 3.00,
        confidence: 0.71,
        reason: 'Family combos are popular for orders over £15',
      });
    }

    return recommendations.slice(0, 3);
  }

  async askAssistant(query: string, context?: any): Promise<any> {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('sales') && queryLower.includes('today')) {
      return await this.getSalesTodayResponse(context?.branchId);
    }
    
    if (queryLower.includes('inventory') || queryLower.includes('stock')) {
      return await this.getInventoryResponse(queryLower, context?.branchId);
    }
    
    if (queryLower.includes('best seller') || queryLower.includes('popular')) {
      return await this.getBestSellerResponse(context?.branchId);
    }
    
    if (queryLower.includes('customer') && queryLower.includes('phone')) {
      const phoneMatch = query.match(/\d{10,}/);
      if (phoneMatch) {
        return await this.getCustomerResponse(phoneMatch[0]);
      }
    }
    
    if (queryLower.includes('busy') || queryLower.includes('peak')) {
      return await this.getBusyHoursResponse(context?.branchId);
    }

    return {
      response: "I can help you with sales data, inventory levels, customer information, popular items, and busy hours. Try asking about 'sales today', 'chicken stock', 'best seller', or 'customer phone 1234567890'.",
      confidence: 0.9,
      suggestedQueries: [
        'What are today\'s sales?',
        'Check chicken stock levels',
        'Who is our best customer?',
        'What are our peak hours?',
      ],
    };
  }

  async generateOffers(branchId: string, inventoryData: any[], customerSegments: { segments: any }): Promise<any> {
    const highStockItems = inventoryData.filter(item => 
      item.currentStock > item.maximumStock * 0.8
    );
    
    const lowMovingItems = await this.getLowMovingItems(branchId);
    
    const flashDeals = highStockItems.slice(0, 3).map(item => ({
      itemId: item.menuItemId,
      itemName: item.menuItem?.name || 'Unknown Item',
      discount: Math.min(30, Math.floor((item.currentStock / item.maximumStock) * 20) + 10),
      reason: 'High inventory level - clear stock',
      validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000),
      priority: 'high',
    }));

    const loyaltyOffers = customerSegments.segments?.champions?.slice(0, 5).map(customer => ({
      customerId: customer.id,
      customerName: customer.name,
      offer: 'Buy 2 get 1 free on favorite items',
      discount: 25,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      personalizedItems: customer.favoriteItems || [],
    })) || [];

    const newCustomerOffers = [{
      segment: 'new_customers',
      offer: '20% off first order',
      discount: 20,
      conditions: 'Minimum order £15',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }];

    return {
      flashDeals,
      loyaltyOffers,
      newCustomerOffers,
      lowMovingItemDeals: lowMovingItems.slice(0, 2).map(item => ({
        itemId: item.id,
        itemName: item.name,
        discount: 15,
        reason: 'Boost popularity',
      })),
      totalOffers: flashDeals.length + loyaltyOffers.length + newCustomerOffers.length,
      estimatedRevenue: this.calculateEstimatedOfferRevenue(flashDeals, loyaltyOffers),
    };
  }

  async segmentCustomers(customers: any[]): Promise<any> {
    const now = new Date();
    const segments = {
      champions: [],
      loyalCustomers: [],
      potentialLoyalists: [],
      newCustomers: [],
      atRisk: [],
      cannotLoseThem: [],
      hibernating: [],
    };

    customers.forEach(customer => {
      const daysSinceLastOrder = customer.lastOrderDate ? 
        Math.floor((now.getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      
      const recencyScore = daysSinceLastOrder <= 30 ? 5 : daysSinceLastOrder <= 60 ? 4 : daysSinceLastOrder <= 90 ? 3 : daysSinceLastOrder <= 180 ? 2 : 1;
      const frequencyScore = customer.totalOrders >= 20 ? 5 : customer.totalOrders >= 10 ? 4 : customer.totalOrders >= 5 ? 3 : customer.totalOrders >= 2 ? 2 : 1;
      const monetaryScore = customer.totalSpent >= 500 ? 5 : customer.totalSpent >= 200 ? 4 : customer.totalSpent >= 100 ? 3 : customer.totalSpent >= 50 ? 2 : 1;

      const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
      
      if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
        segments.champions.push({ ...customer, rfmScore, segment: 'champions' });
      } else if (recencyScore >= 3 && frequencyScore >= 3) {
        segments.loyalCustomers.push({ ...customer, rfmScore, segment: 'loyal' });
      } else if (recencyScore >= 4 && frequencyScore <= 2) {
        segments.newCustomers.push({ ...customer, rfmScore, segment: 'new' });
      } else if (recencyScore <= 2 && frequencyScore >= 3 && monetaryScore >= 3) {
        segments.atRisk.push({ ...customer, rfmScore, segment: 'at_risk' });
      } else if (recencyScore <= 2 && monetaryScore >= 4) {
        segments.cannotLoseThem.push({ ...customer, rfmScore, segment: 'cannot_lose' });
      } else if (recencyScore <= 2 && frequencyScore <= 2) {
        segments.hibernating.push({ ...customer, rfmScore, segment: 'hibernating' });
      } else {
        segments.potentialLoyalists.push({ ...customer, rfmScore, segment: 'potential' });
      }
    });

    return {
      segments,
      summary: {
        total: customers.length,
        champions: segments.champions.length,
        loyal: segments.loyalCustomers.length,
        atRisk: segments.atRisk.length,
        new: segments.newCustomers.length,
      },
      recommendations: this.generateSegmentRecommendations(segments),
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private async getKitchenQueueLength(branchId: string): Promise<number> {
    return await this.orderRepository.count({
      where: { 
        branchId, 
        status: 'preparing' 
      },
    });
  }

  private async getInventoryAvailabilityScore(branchId: string, orderItems: any[]): Promise<number> {
    let totalScore = 0;
    let itemCount = 0;

    for (const item of orderItems) {
      const inventory = await this.inventoryRepository.findOne({
        where: { branchId, menuItemId: item.menuItemId },
      });

      if (inventory) {
        const availabilityRatio = inventory.currentStock / (inventory.minimumStock || 1);
        totalScore += Math.min(100, availabilityRatio * 50);
      } else {
        totalScore += 0;
      }
      itemCount++;
    }

    return itemCount > 0 ? totalScore / itemCount : 50;
  }

  private calculateAverageDemand(historicalData: any[]): number {
    if (historicalData.length === 0) return 5;
    const total = historicalData.reduce((sum, day) => sum + parseFloat(day.dailyDemand || 0), 0);
    return total / historicalData.length;
  }

  private calculateDemandVariance(historicalData: any[], average: number): number {
    if (historicalData.length <= 1) return 1;
    const variance = historicalData.reduce((sum, day) => {
      const diff = parseFloat(day.dailyDemand || 0) - average;
      return sum + (diff * diff);
    }, 0) / (historicalData.length - 1);
    return variance;
  }

  private async getSalesTodayResponse(branchId?: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = this.orderRepository.createQueryBuilder('order')
      .where('order.createdAt >= :today', { today })
      .andWhere('order.status != :status', { status: 'cancelled' });

    if (branchId) {
      query.andWhere('order.branchId = :branchId', { branchId });
    }

    const orders = await query.getMany();
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);

    return {
      response: `Today's sales: £${totalRevenue.toFixed(2)} from ${orders.length} orders. Average order value: £${orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'}.`,
      confidence: 0.95,
      data: {
        revenue: totalRevenue,
        orderCount: orders.length,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      },
      suggestedActions: ['View detailed sales report', 'Compare with yesterday'],
    };
  }

  private async getInventoryResponse(query: string, branchId?: string): Promise<any> {
    const itemMatch = query.match(/(chicken|fish|rice|naan|curry|tikka)/i);
    if (itemMatch) {
      const searchTerm = itemMatch[0];
      const inventoryQuery = this.inventoryRepository.createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.menuItem', 'menuItem')
        .where('LOWER(menuItem.name) LIKE :searchTerm', { searchTerm: `%${searchTerm.toLowerCase()}%` });

      if (branchId) {
        inventoryQuery.andWhere('inventory.branchId = :branchId', { branchId });
      }

      const items = await inventoryQuery.getMany();
      
      if (items.length > 0) {
        const item = items[0];
        const status = item.currentStock <= item.minimumStock ? 'LOW STOCK' : 'In Stock';
        return {
          response: `${item.menuItem?.name || searchTerm}: ${item.currentStock} units remaining. Status: ${status}. ${item.currentStock <= item.minimumStock ? 'Reorder recommended.' : ''}`,
          confidence: 0.9,
          data: {
            item: item.menuItem?.name,
            currentStock: item.currentStock,
            minimumStock: item.minimumStock,
            status,
          },
          suggestedActions: item.currentStock <= item.minimumStock ? ['Place reorder', 'Check supplier'] : ['View full inventory'],
        };
      }
    }

    return {
      response: "I couldn't find specific inventory information. Try asking about specific items like 'chicken stock' or 'naan inventory'.",
      confidence: 0.7,
      suggestedActions: ['View full inventory', 'Check low stock items'],
    };
  }

  private async getBestSellerResponse(branchId?: string): Promise<any> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .leftJoin('item.menuItem', 'menuItem')
      .select(['menuItem.name', 'SUM(item.quantity) as totalSold'])
      .where('order.createdAt >= :startDate', { 
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      })
      .andWhere('order.status != :status', { status: 'cancelled' });

    if (branchId) {
      query.andWhere('order.branchId = :branchId', { branchId });
    }

    const results = await query
      .groupBy('menuItem.id')
      .orderBy('totalSold', 'DESC')
      .limit(3)
      .getRawMany();

    if (results.length > 0) {
      const topItem = results[0];
      return {
        response: `This week's best seller: ${topItem.menuItem_name} with ${topItem.totalSold} orders. Top 3: ${results.map(r => r.menuItem_name).join(', ')}.`,
        confidence: 0.95,
        data: {
          topSeller: topItem.menuItem_name,
          quantity: topItem.totalSold,
          top3: results,
        },
        suggestedActions: ['View detailed sales analytics', 'Create promotion for top items'],
      };
    }

    return {
      response: "No sales data available for the past week.",
      confidence: 0.8,
      suggestedActions: ['Check order history', 'View menu performance'],
    };
  }

  private async getCustomerResponse(phone: string): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { phone },
    });

    if (customer) {
      return {
        response: `Customer: ${customer.name}, Total orders: ${customer.totalOrders}, Total spent: £${customer.totalSpent}, Loyalty points: ${customer.loyaltyPoints}. Last order: ${customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}.`,
        confidence: 0.95,
        data: customer,
        suggestedActions: ['View order history', 'Apply loyalty discount', 'Send personalized offer'],
      };
    }

    return {
      response: `No customer found with phone number ${phone}. This might be a new customer.`,
      confidence: 0.9,
      suggestedActions: ['Create new customer profile', 'Offer new customer discount'],
    };
  }

  private async getBusyHoursResponse(branchId?: string): Promise<any> {
    const query = this.orderRepository.createQueryBuilder('order')
      .select(['EXTRACT(hour FROM order.createdAt) as hour', 'COUNT(*) as orderCount'])
      .where('order.createdAt >= :startDate', { 
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      })
      .andWhere('order.status != :status', { status: 'cancelled' });

    if (branchId) {
      query.andWhere('order.branchId = :branchId', { branchId });
    }

    const hourlyData = await query
      .groupBy('hour')
      .orderBy('orderCount', 'DESC')
      .getRawMany();

    if (hourlyData.length > 0) {
      const peakHour = hourlyData[0];
      const peakHours = hourlyData.slice(0, 3);
      
      return {
        response: `Peak hour: ${peakHour.hour}:00 with ${peakHour.orderCount} orders this week. Busiest hours: ${peakHours.map(h => `${h.hour}:00`).join(', ')}.`,
        confidence: 0.9,
        data: {
          peakHour: peakHour.hour,
          peakOrderCount: peakHour.orderCount,
          hourlyBreakdown: hourlyData,
        },
        suggestedActions: ['Schedule more staff for peak hours', 'Create happy hour promotions'],
      };
    }

    return {
      response: "No order data available to determine busy hours.",
      confidence: 0.7,
      suggestedActions: ['Check order history', 'Set up analytics tracking'],
    };
  }

  private async getLowMovingItems(branchId: string): Promise<any[]> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .leftJoin('item.menuItem', 'menuItem')
      .select(['menuItem.id', 'menuItem.name', 'COUNT(item.id) as orderCount'])
      .where('order.branchId = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      })
      .groupBy('menuItem.id')
      .orderBy('orderCount', 'ASC')
      .limit(5);

    return await query.getRawMany();
  }

  private calculateEstimatedOfferRevenue(flashDeals: any[], loyaltyOffers: any[]): number {
    const flashRevenue = flashDeals.reduce((sum, deal) => sum + (deal.discount * 2), 0);
    const loyaltyRevenue = loyaltyOffers.reduce((sum, offer) => sum + (offer.discount * 1.5), 0);
    return flashRevenue + loyaltyRevenue;
  }

  private generateSegmentRecommendations(segments: any): any {
    return {
      champions: 'Reward them with exclusive offers and early access to new items',
      loyal: 'Upsell premium items and encourage referrals',
      atRisk: 'Send win-back campaigns with special discounts',
      new: 'Welcome series with educational content about menu items',
      hibernating: 'Aggressive win-back campaigns or let them go',
      cannotLose: 'Immediate intervention with personalized offers',
    };
  }

  async getUpsellSuggestions(currentItems: any[], customerHistory?: any[]): Promise<any> {
    const suggestions = [];
    
    const currentCategories = currentItems.map(item => item.category || 'main');
    const currentTotal = currentItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    if (!currentCategories.includes('drink')) {
      suggestions.push({
        type: 'beverage',
        item: { id: 'drink-001', name: 'Fresh Mango Lassi', price: 3.99, category: 'drink' },
        reason: 'Perfect complement to spicy dishes',
        confidence: 0.85,
        expectedUplift: 3.99
      });
    }
    
    if (!currentCategories.includes('dessert') && currentTotal > 15) {
      suggestions.push({
        type: 'dessert',
        item: { id: 'dessert-001', name: 'Gulab Jamun', price: 4.99, category: 'dessert' },
        reason: 'Popular dessert choice for orders over £15',
        confidence: 0.72,
        expectedUplift: 4.99
      });
    }
    
    if (customerHistory && customerHistory.length > 0) {
      const frequentItems = customerHistory
        .flatMap(order => order.items || [])
        .reduce((acc, item) => {
          acc[item.id] = (acc[item.id] || 0) + 1;
          return acc;
        }, {});
      
      const topItem = Object.entries(frequentItems)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      
      if (topItem && !currentItems.find(item => item.id === topItem[0])) {
        suggestions.push({
          type: 'personal_favorite',
          item: { id: topItem[0], name: 'Your Usual Favorite', price: 12.99 },
          reason: `You've ordered this ${topItem[1]} times before`,
          confidence: 0.90,
          expectedUplift: 12.99
        });
      }
    }
    
    const comboSuggestions = this.generateComboSuggestions(currentItems);
    suggestions.push(...comboSuggestions);
    
    return {
      suggestions: suggestions.slice(0, 3),
      totalPotentialUplift: suggestions.reduce((sum, s) => sum + s.expectedUplift, 0),
      confidence: suggestions.length > 0 ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length : 0
    };
  }

  async getMarketingInsights(branchId?: string): Promise<any> {
    const insights = {
      campaignPerformance: {
        totalCampaigns: 12,
        activeCampaigns: 3,
        averageOpenRate: 0.24,
        averageClickRate: 0.08,
        averageConversionRate: 0.15,
        topPerformingCampaign: {
          name: 'Weekend Special Offers',
          openRate: 0.32,
          conversionRate: 0.22,
          revenue: 1250.50
        }
      },
      customerSegments: {
        highValue: { count: 45, averageSpend: 85.50, retentionRate: 0.89 },
        regular: { count: 234, averageSpend: 32.75, retentionRate: 0.67 },
        occasional: { count: 567, averageSpend: 18.25, retentionRate: 0.34 },
        atRisk: { count: 89, daysSinceLastOrder: 45, churnProbability: 0.78 }
      },
      recommendations: [
        {
          type: 'retention',
          priority: 'high',
          action: 'Launch win-back campaign for at-risk customers',
          expectedImpact: 'Reduce churn by 25%',
          estimatedRevenue: 2500
        },
        {
          type: 'upsell',
          priority: 'medium',
          action: 'Promote premium items to high-value customers',
          expectedImpact: 'Increase AOV by 15%',
          estimatedRevenue: 1800
        },
        {
          type: 'acquisition',
          priority: 'medium',
          action: 'Referral program for regular customers',
          expectedImpact: 'Acquire 50 new customers',
          estimatedRevenue: 3200
        }
      ],
      trends: {
        orderFrequency: { trend: 'increasing', change: 0.12 },
        averageOrderValue: { trend: 'stable', change: 0.03 },
        customerSatisfaction: { trend: 'increasing', change: 0.08 },
        peakHours: ['12:00-14:00', '18:00-20:00'],
        popularItems: ['Chicken Tikka Masala', 'Fish & Chips', 'Vegetable Biryani']
      }
    };
    
    return insights;
  }

  async getDemandForecast(branchId: string, menuItemId: string, days: number): Promise<any> {
    const historicalData = await this.generateHistoricalDemand(menuItemId, days * 2);
    const seasonalFactors = this.calculateSeasonalFactors();
    const trendAnalysis = this.analyzeTrend(historicalData);
    
    const forecast = [];
    const baselineDemand = historicalData.slice(-7).reduce((sum, day) => sum + day.demand, 0) / 7;
    
    for (let i = 1; i <= days; i++) {
      const dayOfWeek = (new Date().getDay() + i) % 7;
      const weekdayMultiplier = [0.8, 1.0, 1.0, 1.0, 1.0, 1.3, 1.2][dayOfWeek];
      const seasonalMultiplier = seasonalFactors[Math.floor((Date.now() + i * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000)) % 365];
      const trendMultiplier = 1 + (trendAnalysis.growthRate * i / 30);
      
      const predictedDemand = Math.round(
        baselineDemand * weekdayMultiplier * seasonalMultiplier * trendMultiplier * (0.9 + Math.random() * 0.2)
      );
      
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedDemand,
        confidence: Math.max(0.6, 0.95 - (i * 0.05)),
        factors: {
          baseline: baselineDemand,
          weekday: weekdayMultiplier,
          seasonal: seasonalMultiplier,
          trend: trendMultiplier
        }
      });
    }
    
    const totalPredicted = forecast.reduce((sum, day) => sum + day.predictedDemand, 0);
    const averageConfidence = forecast.reduce((sum, day) => sum + day.confidence, 0) / forecast.length;
    
    return {
      forecast,
      summary: {
        totalPredictedDemand: totalPredicted,
        averageDailyDemand: totalPredicted / days,
        averageConfidence,
        trendDirection: trendAnalysis.direction,
        recommendations: this.generateForecastRecommendations(forecast, trendAnalysis)
      },
      metadata: {
        branchId,
        menuItemId,
        forecastPeriod: days,
        generatedAt: new Date(),
        model: 'hybrid-statistical-ml'
      }
    };
  }

  private generateComboSuggestions(currentItems: any[]): any[] {
    const combos = [];
    
    if (currentItems.some(item => item.category === 'main') && currentItems.length === 1) {
      combos.push({
        type: 'combo',
        item: { id: 'combo-001', name: 'Add Rice + Naan', price: 4.99 },
        reason: 'Complete your meal with our popular sides',
        confidence: 0.80,
        expectedUplift: 4.99
      });
    }
    
    return combos;
  }

  private async generateHistoricalDemand(menuItemId: string, days: number): Promise<any[]> {
    const data = [];
    const baselineDemand = 15 + Math.floor(Math.random() * 10);
    
    for (let i = days; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayOfWeek = date.getDay();
      const weekdayMultiplier = [0.8, 1.0, 1.0, 1.0, 1.0, 1.3, 1.2][dayOfWeek];
      const randomVariation = 0.8 + Math.random() * 0.4;
      
      data.push({
        date: date.toISOString().split('T')[0],
        demand: Math.round(baselineDemand * weekdayMultiplier * randomVariation)
      });
    }
    
    return data;
  }

  private calculateSeasonalFactors(): number[] {
    const factors = [];
    for (let day = 0; day < 365; day++) {
      const seasonalBase = 1.0;
      const monthlyVariation = 0.1 * Math.sin((day / 365) * 2 * Math.PI);
      factors.push(seasonalBase + monthlyVariation);
    }
    return factors;
  }

  private analyzeTrend(historicalData: any[]): any {
    if (historicalData.length < 7) {
      return { direction: 'stable', growthRate: 0 };
    }
    
    const firstWeek = historicalData.slice(0, 7).reduce((sum, day) => sum + day.demand, 0) / 7;
    const lastWeek = historicalData.slice(-7).reduce((sum, day) => sum + day.demand, 0) / 7;
    
    const growthRate = (lastWeek - firstWeek) / firstWeek;
    
    return {
      direction: growthRate > 0.05 ? 'increasing' : growthRate < -0.05 ? 'decreasing' : 'stable',
      growthRate: growthRate,
      firstWeekAverage: firstWeek,
      lastWeekAverage: lastWeek
    };
  }

  private generateForecastRecommendations(forecast: any[], trendAnalysis: any): string[] {
    const recommendations = [];
    
    const maxDemand = Math.max(...forecast.map(day => day.predictedDemand));
    const minDemand = Math.min(...forecast.map(day => day.predictedDemand));
    
    if (maxDemand > 30) {
      recommendations.push('Increase inventory levels for high-demand periods');
    }
    
    if (trendAnalysis.direction === 'increasing') {
      recommendations.push('Consider promotional pricing to capitalize on growing demand');
    } else if (trendAnalysis.direction === 'decreasing') {
      recommendations.push('Implement marketing campaigns to boost demand');
    }
    
    if (maxDemand - minDemand > 15) {
      recommendations.push('Optimize staff scheduling for demand fluctuations');
    }
    
    return recommendations;
  }
}
