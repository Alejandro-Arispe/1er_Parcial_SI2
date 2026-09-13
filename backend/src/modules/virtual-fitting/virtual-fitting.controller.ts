import { Controller } from '@nestjs/common';
import { VirtualFittingService } from './virtual-fitting.service.js';

@Controller('virtual-fitting')
export class VirtualFittingController {
  constructor(private readonly virtualFittingService: VirtualFittingService) {}
}
