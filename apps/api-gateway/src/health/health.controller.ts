import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  getHealth() {
    return this.healthService.getBasicHealth();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'System performance metrics' })
  getMetrics() {
    return this.healthService.getSystemMetrics();
  }

  @Get('status')
  @ApiOperation({ summary: 'Service status overview' })
  getStatus() {
    return this.healthService.getServiceStatus();
  }
}
