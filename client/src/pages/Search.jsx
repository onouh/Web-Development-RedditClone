import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, SearchX } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import JoinButton from '../components/JoinButton.jsx';
import PostCard from '../components/PostCard.jsx';
import { api } from '../lib/api.js';
import { compactNumber } from '../lib/format.js';

const TABS = [
  ['all', 'All'],
  ['communities', 'Communities'],
  ['users', 'People'],
  ['posts', 'Posts'],
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const type = params.get('type') || 'all';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', q, type],
    queryFn: () => api(`/search?q=${encodeURIComponent(q)}&type=${type}&limit=20`),
    enabled: q.trim().length > 0,
  });

  const setTab = (nextType) => {
    const next = new URLSearchParams(params);
    next.set('type', nextType);
    setParams(next);
  };

  const empty = !data || (!data.communities?.length && !data.users?.length && !data.posts?.length);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold">Search results</h1>
      <p className="text-sm text-muted">
        {q ? (
          <>
            for <span className="font-medium text-ink">“{q}”</span>
          </>
        ) : (
          'Enter a search term in the bar above.'
        )}
      </p>

      <div className="mt-3 flex gap-1 overflow-x-auto border-b border-line pb-px">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              type === value ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {!q && <p className="card p-8 text-center text-sm text-muted">Try “webdev”, “gaming” or a username.</p>}

        {q && isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        )}

        {q && isError && <p className="card p-6 text-center text-sm text-muted">Search failed. Try again.</p>}

        {q && !isLoading && empty && (
          <div className="card flex flex-col items-center p-10 text-center">
            <SearchX size={30} className="text-muted" />
            <p className="mt-3 font-semibold">No results for “{q}”</p>
            <p className="mt-1 text-sm text-muted">Try a different spelling or a broader term.</p>
          </div>
        )}

        {data?.communities?.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Communities</h2>
            <div className="space-y-2">
              {data.communities.map((community) => (
                <div key={community.name} className="card flex items-center gap-3 p-3">
                  <Avatar name={community.name} src={community.iconUrl} size={40} square />
                  <div className="min-w-0 flex-1">
                    <Link to={`/r/${community.name}`} className="font-semibold hover:underline">
                      r/{community.name}
                    </Link>
                    <p className="line-clamp-1 text-xs text-muted">
                      {compactNumber(community.memberCount)} members · {community.description}
                    </p>
                  </div>
                  <JoinButton name={community.name} />
                </div>
              ))}
            </div>
          </section>
        )}

        {data?.users?.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">People</h2>
            <div className="space-y-2">
              {data.users.map((person) => (
                <div key={person.username} className="card flex items-center gap-3 p-3">
                  <Avatar name={person.username} src={person.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/u/${person.username}`} className="font-semibold hover:underline">
                      u/{person.username}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {person.displayName} · {compactNumber(person.karma)} karma
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data?.posts?.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Posts</h2>
            <div className="space-y-2.5">
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
