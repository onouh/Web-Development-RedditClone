import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useCommunity(name) {
  return useQuery({
    queryKey: ['community', name],
    queryFn: () => api(`/communities/${name}`),
    enabled: Boolean(name),
    staleTime: 60_000,
  });
}
