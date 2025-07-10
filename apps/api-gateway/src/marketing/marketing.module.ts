import { Module } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
