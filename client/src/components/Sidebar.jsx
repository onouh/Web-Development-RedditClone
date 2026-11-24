import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, Plus, TrendingUp, Compass } from 'lucide-react';
import { api } from '../lib/api.js';
import Avatar from './Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { RECENT_EVENT, getRecentCommunities } from '../lib/recent.js';

const navClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-chip text-ink' : 'text-ink/80 hover:bg-hover'
  }`;

function CommunityRow({ community, onNavigate }) {
  return (
    <Link
      to={`/r/${community.name}`}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm hover:bg-hover"
    >
      <Avatar name={community.name} src={community.iconUrl} size={24} square />
      <span className="truncate">r/{community.name}</span>
    </Link>
  );
}

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();
  const [recent, setRecent] = useState(getRecentCommunities());

  useEffect(() => {
    const sync = () => setRecent(getRecentCommunities());
    window.addEventListener(RECENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(RECENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const { data: joined } = useQuery({
    queryKey: ['communities', 'mine'],
    queryFn: () => api('/communities?mine=true&limit=20'),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const { data: popular } = useQuery({
    queryKey: ['communities', 'popular'],
    queryFn: () => api('/communities?limit=6'),
    staleTime: 120_000,
  });

  const close = () => onNavigate?.();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 pb-8 pt-4" aria-label="Primary">
      <NavLink to="/" end className={navClass} onClick={close}>
        <Home size={20} /> Home
      </NavLink>
      <NavLink to="/popular" className={navClass} onClick={close}>
        <TrendingUp size={20} /> Popular
      </NavLink>

      <div className="my-2 border-t border-line" />

      <div className="flex items-center justify-between px-3 py-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Communities</p>
        <Link
          to="/create-community"
          onClick={close}
          className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
          aria-label="Create a community"
        >
          <Plus size={16} />
        </Link>
      </div>

      {user && joined?.items?.length > 0 ? (
        joined.items.map((community) => (
          <CommunityRow key={community.name} community={community} onNavigate={close} />
        ))
      ) : (
        <p className="px-3 py-2 text-xs leading-relaxed text-muted">
          {user ? 'Join a community to see it here.' : 'Log in to follow your communities.'}
        </p>
      )}

      <Link
        to="/create-community"
        onClick={close}
        className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-hover hover:text-ink"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chip">
          <Plus size={14} />
        </span>
        Create a community
      </Link>

      {recent.length > 0 && (
        <>
          <div className="my-2 border-t border-line" />
          <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">Recent</p>
          {recent.map((community) => (
            <CommunityRow key={community.name} community={community} onNavigate={close} />
          ))}
        </>
      )}

      {!user && popular?.items?.length > 0 && (
        <>
          <div className="my-2 border-t border-line" />
          <p className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            <Compass size={12} /> Popular
          </p>
          {popular.items.slice(0, 5).map((community) => (
            <CommunityRow key={community.name} community={community} onNavigate={close} />
          ))}
        </>
      )}

      <div className="mt-auto px-3 pt-6 text-[11px] leading-relaxed text-muted">
        <p className="font-semibold text-ink/60">Threadit · Fall 2026</p>
        <p>Web Development project</p>
        <a href="/api-docs" target="_blank" rel="noreferrer" className="mt-1 inline-block hover:text-ink hover:underline">
          API documentation
        </a>
      </div>
    </nav>
  );
}
