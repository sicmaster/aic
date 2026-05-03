import { apiGet } from '@/shared/api/api-client';
import type { HealthStatus } from './types';

export function getHealth(): Promise<HealthStatus> {
  return apiGet<HealthStatus>('/health');
}
