import { Loader2, MessageSquareDashed } from 'lucide-react';
import PostCard from './PostCard.jsx';

function SkeletonCard() {
  return (
    <div className="card animate-pulse p-4">
      <div className="h-3 w-40 rounded bg-chip" />
      <div className="mt-3 h-5 w-4/5 rounded bg-chip" />
      <div className="mt-2 h-3 w-full rounded bg-chip" />
      <div className="mt-2 h-3 w-2/3 rounded bg-chip" />
      <div className="mt-5 h-8 w-52 rounded-full bg-chip" />
    </div>
  );
}

export default function PostList({ query, emptyTitle = 'No posts here yet', emptyText = 'Be the first to post something.', action = null }) {
  const posts = query.data?.pages?.flatMap((page) => page.items) ?? [];

  if (query.isLoading) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2].map((key) => (
          <SkeletonCard key={key} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold">Could not load posts</p>
        <p className="mt-1 text-sm text-muted">{query.error?.message}</p>
        <button type="button" onClick={() => query.refetch()} className="btn-secondary mt-4 text-xs">
          Try again
        </button>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="card flex flex-col items-center p-10 text-center">
        <MessageSquareDashed size={32} className="text-muted" />
        <p className="mt-3 font-semibold">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-sm text-muted">{emptyText}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="btn-secondary w-full py-2.5"
        >
          {query.isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null}
          {query.isFetchingNextPage ? 'Loading…' : 'Load more posts'}
        </button>
      )}
    </div>
  );
}
