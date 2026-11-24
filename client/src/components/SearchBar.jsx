import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, User } from 'lucide-react';
import { api } from '../lib/api.js';
import Avatar from './Avatar.jsx';
import { compactNumber } from '../lib/format.js';
import useClickOutside from '../hooks/useClickOutside.js';

export default function SearchBar({ className = '', autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useClickOutside(wrapperRef, () => setOpen(false), open);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: () => api(`/search/suggest?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  });

  const submit = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  const hasResults = data && (data.communities?.length > 0 || data.users?.length > 0);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search Threadit"
          aria-label="Search communities and users"
          className="w-full rounded-full border border-line bg-page py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:bg-surface"
        />
      </form>

      {open && debounced.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 animate-fade-in overflow-hidden rounded-xl border border-line bg-elevated shadow-pop">
          {isFetching && !data && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Loader2 size={15} className="animate-spin" /> Searching…
            </div>
          )}

          {data?.communities?.length > 0 && (
            <div className="border-b border-line py-1.5">
              <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">Communities</p>
              {data.communities.map((community) => (
                <button
                  key={community.name}
                  type="button"
                  onClick={() => {
                    navigate(`/r/${community.name}`);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-hover"
                >
                  <Avatar name={community.name} src={community.iconUrl} size={28} square />
                  <span className="flex-1 truncate font-medium">r/{community.name}</span>
                  <span className="text-xs text-muted">{compactNumber(community.memberCount)} members</span>
                </button>
              ))}
            </div>
          )}

          {data?.users?.length > 0 && (
            <div className="py-1.5">
              <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">People</p>
              {data.users.map((person) => (
                <button
                  key={person.username}
                  type="button"
                  onClick={() => {
                    navigate(`/u/${person.username}`);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-hover"
                >
                  <Avatar name={person.username} src={person.avatarUrl} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">u/{person.username}</span>
                    <span className="block truncate text-xs text-muted">{person.displayName}</span>
                  </span>
                  <span className="text-xs text-muted">{compactNumber(person.karma)} karma</span>
                </button>
              ))}
            </div>
          )}

          {!isFetching && !hasResults && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <User size={15} /> No matches for “{debounced}”
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            className="w-full border-t border-line px-4 py-2.5 text-left text-sm font-semibold text-accent hover:bg-hover"
          >
            See all results for “{debounced}”
          </button>
        </div>
      )}
    </div>
  );
}
