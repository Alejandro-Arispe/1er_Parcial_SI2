import { Injectable } from '@nestjs/common';
import { RecommendationService } from './recommendation.service.js';

@Injectable()
export class AiService {
  constructor(private readonly recommendationService: RecommendationService) {}
}
