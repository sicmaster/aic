import { Controller, Get } from '@nestjs/common';
import type { ApiResponse } from '@aic/types';
import { HealthService } from './health.service';

type HealthStatus = {
  service: string;
  status: 'ok';
  timestamp: string;
};

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): ApiResponse<HealthStatus> {
    return {
      success: true,
      data: this.healthService.getStatus(),
    };
  }
}
