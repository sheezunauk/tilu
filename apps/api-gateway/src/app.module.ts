import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { MenuModule } from './menu/menu.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { OffersModule } from './offers/offers.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { BranchesModule } from './branches/branches.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';
import { MarketingModule } from './marketing/marketing.module';
import { AuditModule } from './audit/audit.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'tillu_user',
      password: process.env.DB_PASSWORD || 'tillu_password',
      database: process.env.DB_NAME || 'tillu_pos',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    OrdersModule,
    MenuModule,
    InventoryModule,
    CustomersModule,
    CampaignsModule,
    OffersModule,
    KitchenModule,
    AnalyticsModule,
    AiModule,
    BranchesModule,
    WebsocketModule,
    HealthModule,
    MarketingModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
