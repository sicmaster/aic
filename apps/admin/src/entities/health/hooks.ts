import { useQuery } from '@tanstack/react-query';
import { getHealth } from './api';

export const healthQueryKey = ['health'] as const;

export function useHealthQuery() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: getHealth,
  });
}
