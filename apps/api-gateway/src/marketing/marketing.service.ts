import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class MarketingService {
  constructor(
    private websocketGateway: WebsocketGateway,
  ) {}

  async createCampaign(campaignData: any): Promise<any> {
    const campaign = {
      id: 'campaign-' + Date.now(),
      ...campaignData,
      status: 'draft',
      createdAt: new Date(),
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
      }
    };

    return campaign;
  }

  async segmentCustomers(branchId: string, criteria: any): Promise<any[]> {
    const segments = [
      {
        id: 'high-value',
        name: 'High Value Customers',
        description: 'Customers with high frequency and monetary value',
        customerCount: Math.floor(Math.random() * 200) + 50,
        criteria: 'Frequency > 10 orders/month AND Average order > £25',
        characteristics: ['Loyal', 'High spending', 'Regular orders'],
      },
      {
        id: 'at-risk',
        name: 'At-Risk Customers',
        description: 'Previously active customers who haven\'t ordered recently',
        customerCount: Math.floor(Math.random() * 150) + 30,
        criteria: 'Last order > 30 days AND Previous frequency > 5 orders/month',
        characteristics: ['Previously loyal', 'Declining activity', 'Win-back potential'],
      },
      {
        id: 'new-customers',
        name: 'New Customers',
        description: 'Recent customers with 1-3 orders',
        customerCount: Math.floor(Math.random() * 100) + 20,
        criteria: 'First order < 30 days AND Total orders <= 3',
        characteristics: ['New to brand', 'Onboarding opportunity', 'Growth potential'],
      },
      {
        id: 'price-sensitive',
        name: 'Price-Sensitive Customers',
        description: 'Customers who respond well to discounts and offers',
        customerCount: Math.floor(Math.random() * 180) + 40,
        criteria: 'High response rate to discount campaigns',
        characteristics: ['Discount-driven', 'Deal seekers', 'Promotion responsive'],
      }
    ];

    return segments;
  }

  async generatePersonalizedOffers(customerId: string, context: any): Promise<any[]> {
    const offers = [];

    const offerTypes = [
      {
        type: 'loyalty_reward',
        title: '20% Off Your Next Order',
        description: 'Thank you for being a loyal customer! Enjoy 20% off your next order.',
        discount: 20,
        validFor: 7,
        conditions: 'Minimum order £15',
      },
      {
        type: 'combo_deal',
        title: 'Perfect Meal Combo',
        description: 'Get your favorite main dish with a drink and side for just £12.99',
        discount: 15,
        validFor: 3,
        conditions: 'Selected items only',
      },
      {
        type: 'flash_deal',
        title: 'Flash Sale - 30% Off',
        description: 'Limited time offer! 30% off all orders for the next 2 hours.',
        discount: 30,
        validFor: 0.08, // 2 hours
        conditions: 'Today only',
      },
      {
        type: 'referral_bonus',
        title: 'Refer a Friend - Get £5',
        description: 'Invite friends and get £5 credit when they place their first order.',
        discount: 5,
        validFor: 30,
        conditions: 'Friend must be new customer',
      }
    ];

    const selectedOffers = offerTypes
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 2) + 2)
      .map(offer => ({
        id: 'offer-' + Date.now() + Math.random(),
        ...offer,
        customerId,
        validUntil: new Date(Date.now() + offer.validFor * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }));

    return selectedOffers;
  }

  async sendCampaign(campaignId: string, segmentId: string): Promise<any> {
    const campaign = {
      id: campaignId,
      segmentId,
      status: 'sending',
      startedAt: new Date(),
    };

    setTimeout(() => {
      this.websocketGateway.sendSystemAlert({
        title: 'Campaign Update',
        message: `Campaign "${campaignId}" has been sent to segment "${segmentId}"`,
        severity: 'info',
        type: 'marketing',
      });
    }, 2000);

    return campaign;
  }

  async getCampaignAnalytics(campaignId: string): Promise<any> {
    return {
      campaignId,
      metrics: {
        sent: Math.floor(Math.random() * 1000) + 500,
        delivered: Math.floor(Math.random() * 900) + 450,
        opened: Math.floor(Math.random() * 400) + 200,
        clicked: Math.floor(Math.random() * 100) + 50,
        converted: Math.floor(Math.random() * 50) + 25,
      },
      performance: {
        deliveryRate: 95.2,
        openRate: 28.5,
        clickRate: 12.3,
        conversionRate: 8.7,
      },
      revenue: {
        generated: Math.floor(Math.random() * 5000) + 2000,
        roi: Math.floor(Math.random() * 300) + 150,
      },
      topPerformingOffers: [
        { name: '20% Off Combo Deal', clicks: 45, conversions: 23 },
        { name: 'Free Delivery Weekend', clicks: 38, conversions: 19 },
        { name: 'Loyalty Bonus Points', clicks: 32, conversions: 16 },
      ]
    };
  }

  async runABTest(testConfig: any): Promise<any> {
    const test = {
      id: 'ab-test-' + Date.now(),
      ...testConfig,
      status: 'running',
      startedAt: new Date(),
      variants: testConfig.variants.map((variant: any, index: number) => ({
        ...variant,
        id: `variant-${index}`,
        traffic: 50, // Split traffic equally
        metrics: {
          sent: 0,
          conversions: 0,
          revenue: 0,
        }
      })),
    };

    setTimeout(() => {
      test.variants.forEach((variant: any) => {
        variant.metrics = {
          sent: Math.floor(Math.random() * 500) + 250,
          conversions: Math.floor(Math.random() * 50) + 25,
          revenue: Math.floor(Math.random() * 2000) + 1000,
        };
      });

      this.websocketGateway.sendSystemAlert({
        title: 'A/B Test Results',
        message: `A/B test "${test.name}" has preliminary results available`,
        severity: 'info',
        type: 'ab_test',
      });
    }, 5000);

    return test;
  }

  async generateFlashDeal(branchId: string): Promise<any> {
    const deals = [
      {
        title: 'Happy Hour Special',
        description: '25% off all beverages for the next 2 hours',
        discount: 25,
        category: 'drinks',
        duration: 2,
      },
      {
        title: 'Lunch Rush Deal',
        description: 'Buy any main dish, get 50% off a side',
        discount: 50,
        category: 'sides',
        duration: 3,
      },
      {
        title: 'Weekend Combo',
        description: '30% off family meal combos',
        discount: 30,
        category: 'combos',
        duration: 4,
      }
    ];

    const selectedDeal = deals[Math.floor(Math.random() * deals.length)];
    const flashDeal = {
      id: 'flash-' + Date.now(),
      branchId,
      ...selectedDeal,
      validUntil: new Date(Date.now() + selectedDeal.duration * 60 * 60 * 1000),
      createdAt: new Date(),
      isActive: true,
    };

    this.websocketGateway.sendFlashOffer(branchId, flashDeal);

    return flashDeal;
  }

  async getMarketingInsights(branchId: string): Promise<any> {
    return {
      customerGrowth: {
        newCustomers: Math.floor(Math.random() * 50) + 20,
        returningCustomers: Math.floor(Math.random() * 200) + 100,
        churnRate: Math.random() * 10 + 5,
        growthRate: Math.random() * 20 + 10,
      },
      campaignPerformance: {
        activeCampaigns: Math.floor(Math.random() * 5) + 2,
        avgOpenRate: Math.random() * 20 + 25,
        avgClickRate: Math.random() * 10 + 8,
        avgConversionRate: Math.random() * 5 + 3,
      },
      revenueImpact: {
        campaignRevenue: Math.floor(Math.random() * 10000) + 5000,
        organicRevenue: Math.floor(Math.random() * 15000) + 10000,
        marketingROI: Math.random() * 200 + 150,
      },
      recommendations: [
        'Increase email frequency for high-value segment',
        'Create win-back campaign for at-risk customers',
        'Test SMS campaigns for younger demographics',
        'Implement loyalty program enhancements',
      ]
    };
  }
}
