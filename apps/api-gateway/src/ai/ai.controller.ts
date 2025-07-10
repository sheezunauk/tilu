import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('AI Services')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'Get AI order routing recommendation' })
  @Post('route-order')
  routeOrder(@Body() body: { customerLocation: { lat: number; lng: number }; orderItems: any[] }) {
    return this.aiService.routeOrder(body.customerLocation, body.orderItems);
  }

  @ApiOperation({ summary: 'Get inventory predictions' })
  @Post('predict-inventory')
  predictInventory(@Body() body: { branchId: string; menuItemId: string; days: number }) {
    return this.aiService.predictInventory(body.branchId, body.menuItemId, body.days);
  }

  @ApiOperation({ summary: 'Staff AI assistant query' })
  @Post('assistant')
  async askAssistant(@Body() body: { message?: string; query?: string; context?: any }) {
    const query = body.message || body.query;
    const response = await this.aiService.processStaffQuery(query, body.context);
    return { response };
  }

  @ApiOperation({ summary: 'Get smart recommendations for current order' })
  @Post('recommendations')
  getSmartRecommendations(@Body() body: { currentOrder: any[] }) {
    return this.aiService.generateSmartRecommendations(body.currentOrder);
  }

  @ApiOperation({ summary: 'Get upselling suggestions' })
  @Post('upsell')
  getUpsellSuggestions(@Body() body: { currentItems: any[]; customerHistory?: any[] }) {
    return this.aiService.getUpsellSuggestions(body.currentItems, body.customerHistory);
  }

  @ApiOperation({ summary: 'Generate marketing insights' })
  @Get('marketing-insights')
  getMarketingInsights(@Query('branchId') branchId?: string) {
    return this.aiService.getMarketingInsights(branchId);
  }

  @ApiOperation({ summary: 'Get demand forecast' })
  @Post('demand-forecast')
  getDemandForecast(@Body() body: { branchId: string; menuItemId: string; days: number }) {
    return this.aiService.getDemandForecast(body.branchId, body.menuItemId, body.days);
  }
}
