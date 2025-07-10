import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Marketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @ApiOperation({ summary: 'Create marketing campaign' })
  @Post('campaigns')
  createCampaign(@Body() campaignData: any) {
    return this.marketingService.createCampaign(campaignData);
  }

  @ApiOperation({ summary: 'Get customer segments' })
  @Get('segments/:branchId')
  getCustomerSegments(@Param('branchId') branchId: string) {
    return this.marketingService.segmentCustomers(branchId, {});
  }

  @ApiOperation({ summary: 'Generate personalized offers' })
  @Post('offers/personalized')
  generatePersonalizedOffers(@Body() body: { customerId: string; context: any }) {
    return this.marketingService.generatePersonalizedOffers(body.customerId, body.context);
  }

  @ApiOperation({ summary: 'Send campaign to segment' })
  @Post('campaigns/:campaignId/send/:segmentId')
  sendCampaign(@Param('campaignId') campaignId: string, @Param('segmentId') segmentId: string) {
    return this.marketingService.sendCampaign(campaignId, segmentId);
  }

  @ApiOperation({ summary: 'Get campaign analytics' })
  @Get('campaigns/:campaignId/analytics')
  getCampaignAnalytics(@Param('campaignId') campaignId: string) {
    return this.marketingService.getCampaignAnalytics(campaignId);
  }

  @ApiOperation({ summary: 'Create A/B test' })
  @Post('ab-tests')
  createABTest(@Body() testConfig: any) {
    return this.marketingService.runABTest(testConfig);
  }

  @ApiOperation({ summary: 'Generate flash deal' })
  @Post('flash-deals/:branchId')
  generateFlashDeal(@Param('branchId') branchId: string) {
    return this.marketingService.generateFlashDeal(branchId);
  }

  @ApiOperation({ summary: 'Get marketing insights' })
  @Get('insights/:branchId')
  getMarketingInsights(@Param('branchId') branchId: string) {
    return this.marketingService.getMarketingInsights(branchId);
  }
}
