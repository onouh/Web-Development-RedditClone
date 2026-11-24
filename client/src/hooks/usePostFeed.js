import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function usePostFeed({ scope = 'home', community = '', sort = 'new', time = 'all', flair = '' } = {}) {
  return useInfiniteQuery({
    queryKey: ['feed', { scope, community, sort, time, flair }],
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: '10', sort, time });
      if (flair) params.set('flair', flair);
      if (community) return api(`/communities/${community}/posts?${params.toString()}`);
      params.set('scope', scope);
      return api(`/feed?${params.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 30_000,
  });
}
