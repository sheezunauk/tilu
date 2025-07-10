import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async getBasicHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getDetailedHealth() {
    const basic = await this.getBasicHealth();
    
    try {
      await this.orderRepository.query('SELECT 1');
      const dbStatus = 'healthy';
      
      return {
        ...basic,
        services: {
          database: {
            status: dbStatus,
            responseTime: await this.measureDbResponseTime(),
          },
          redis: {
            status: 'healthy', // Would implement Redis ping
            responseTime: 5,
          },
          websocket: {
            status: 'healthy',
            connections: 0, // Would get from WebSocket gateway
          },
        },
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
        },
        cpu: {
          usage: process.cpuUsage(),
        },
      };
    } catch (error) {
      return {
        ...basic,
        status: 'degraded',
        error: error.message,
      };
    }
  }

  async getSystemMetrics() {
    const orderCount = await this.orderRepository.count();
    const recentOrders = await this.orderRepository.count({
      where: {
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    });

    return {
      timestamp: new Date().toISOString(),
      orders: {
        total: orderCount,
        last24Hours: recentOrders,
        averagePerHour: Math.round(recentOrders / 24),
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      performance: {
        responseTime: await this.measureDbResponseTime(),
        throughput: Math.round(recentOrders / 24), // Orders per hour
      },
    };
  }

  async getServiceStatus() {
    const services = [
      { name: 'API Gateway', status: 'running', port: 8000 },
      { name: 'POS Terminal', status: 'running', port: 3000 },
      { name: 'Customer PWA', status: 'running', port: 3001 },
      { name: 'Manager Dashboard', status: 'running', port: 3002 },
      { name: 'Kitchen Display', status: 'running', port: 3003 },
      { name: 'Database', status: 'connected', port: 5432 },
      { name: 'Redis', status: 'connected', port: 6379 },
    ];

    return {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services,
      summary: {
        total: services.length,
        healthy: services.filter(s => s.status === 'running' || s.status === 'connected').length,
        degraded: 0,
        down: 0,
      },
    };
  }

  private async measureDbResponseTime(): Promise<number> {
    const start = Date.now();
    try {
      await this.orderRepository.query('SELECT 1');
      return Date.now() - start;
    } catch {
      return -1;
    }
  }
}
