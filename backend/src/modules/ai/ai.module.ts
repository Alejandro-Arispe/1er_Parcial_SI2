import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { RecommendationService } from './recommendation.service.js';

@Module({
  controllers: [AiController],
  providers: [AiService, RecommendationService],
  exports: [AiService, RecommendationService],
})
export class AiModule {}
