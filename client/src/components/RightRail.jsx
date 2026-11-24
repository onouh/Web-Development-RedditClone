import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, CalendarDays, TrendingUp } from 'lucide-react';
import { api } from '../lib/api.js';
import Avatar from './Avatar.jsx';
import { compactNumber, formatDate, timeAgo } from '../lib/format.js';

export function RailCard({ title, children, action = null }) {
  return (
    <section className="card overflow-hidden">
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-bold">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function PopularCommunities() {
  const { data } = useQuery({
    queryKey: ['communities', 'popular'],
    queryFn: () => api('/communities?limit=5'),
    staleTime: 120_000,
  });

  return (
    <RailCard title="Popular communities">
      <ol className="space-y-2.5">
        {(data?.items || []).map((community, index) => (
          <li key={community.name} className="flex items-center gap-2.5">
            <span className="w-4 text-center text-xs font-bold text-muted">{index + 1}</span>
            <Avatar name={community.name} src={community.iconUrl} size={28} square />
            <Link to={`/r/${community.name}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
              r/{community.name}
            </Link>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Users size={12} /> {compactNumber(community.memberCount)}
            </span>
          </li>
        ))}
        {!data?.items?.length && <p className="py-2 text-sm text-muted">No communities yet.</p>}
      </ol>
      <Link to="/create-community" className="btn-primary mt-3 w-full py-1.5 text-xs">
        Create a community
      </Link>
    </RailCard>
  );
}

export function TopPostsRail() {
  const { data } = useQuery({
    queryKey: ['feed', 'rail-top'],
    queryFn: () => api('/feed?sort=top&time=week&limit=5'),
    staleTime: 120_000,
  });

  return (
    <RailCard title="Top this week">
      <ol className="space-y-3">
        {(data?.items || []).map((post, index) => (
          <li key={post.id} className="flex gap-2">
            <span className="mt-0.5 w-4 text-center text-xs font-bold text-muted">{index + 1}</span>
            <div className="min-w-0">
              <Link
                to={`/r/${post.community?.name}/comments/${post.id}`}
                className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
              >
                {post.title}
              </Link>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                <TrendingUp size={11} /> {post.score} · {timeAgo(post.createdAt)}
              </p>
            </div>
          </li>
        ))}
        {!data?.items?.length && <p className="text-sm text-muted">Nothing here yet.</p>}
      </ol>
    </RailCard>
  );
}

export function CommunityAbout({ community }) {
  if (!community) return null;
  return (
    <div className="space-y-3">
      <section className="card overflow-hidden">
        <div className="h-16 w-full bg-gradient-to-r from-accent/70 to-orange-300" />
        <div className="p-4">
          <div className="-mt-8 mb-2">
            <Avatar name={community.name} src={community.iconUrl} size={56} square className="ring-4 ring-surface" />
          </div>
          <h2 className="text-lg font-bold">r/{community.name}</h2>
          <p className="text-xs text-muted">{community.title}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink/80">{community.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted">
                <Users size={12} /> Members
              </dt>
              <dd className="font-bold">{compactNumber(community.memberCount)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted">
                <CalendarDays size={12} /> Created
              </dt>
              <dd className="font-bold">{formatDate(community.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {community.rules?.length > 0 && (
        <RailCard title="Community rules">
          <ol className="space-y-2.5">
            {community.rules.map((rule, index) => (
              <li key={rule.title} className="text-sm">
                <p className="font-medium">
                  {index + 1}. {rule.title}
                </p>
                {rule.description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{rule.description}</p>}
              </li>
            ))}
          </ol>
        </RailCard>
      )}

      {community.moderators?.length > 0 && (
        <RailCard title="Moderators">
          <ul className="space-y-2">
            {community.moderators.map((moderator) => (
              <li key={moderator.username}>
                <Link to={`/u/${moderator.username}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Avatar name={moderator.username} src={moderator.avatarUrl} size={24} />
                  u/{moderator.username}
                  <ShieldCheck size={14} className="text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </RailCard>
      )}
    </div>
  );
}

export default function RightRail({ children }) {
  return <aside className="hidden w-[312px] shrink-0 space-y-3 py-5 xl:block">{children}</aside>;
}
