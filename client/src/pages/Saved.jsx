import { useInfiniteQuery } from '@tanstack/react-query';
import PostList from '../components/PostList.jsx';
import { api } from '../lib/api.js';

export default function Saved() {
  const query = useInfiniteQuery({
    queryKey: ['saved'],
    queryFn: ({ pageParam = 1 }) => api(`/users/me/saved?page=${pageParam}&limit=10`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-3 text-xl font-bold">Saved posts</h1>
      <PostList
        query={query}
        emptyTitle="No saved posts"
        emptyText="Tap the bookmark on any post to keep it here for later."
      />
    </div>
  );
}
