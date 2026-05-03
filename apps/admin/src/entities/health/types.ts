export type DependencyStatus = {
  status: 'available' | 'unavailable';
  latencyMs?: number;
  error?: string;
};

export type RedisStatus = {
  enabled: boolean;
  status: 'disabled' | 'available' | 'unavailable';
  error?: string;
};

export type HealthStatus = {
  service: string;
  status: 'ok' | 'degraded';
  timestamp: string;
  dependencies: {
    database: DependencyStatus;
    redis: RedisStatus;
  };
};
