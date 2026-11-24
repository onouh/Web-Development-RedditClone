import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import JoinButton from '../components/JoinButton.jsx';
import PostList from '../components/PostList.jsx';
import SortBar from '../components/SortBar.jsx';
import RightRail, { CommunityAbout } from '../components/RightRail.jsx';
import { useCommunity } from '../hooks/useCommunity.js';
import { usePostFeed } from '../hooks/usePostFeed.js';
import { compactNumber } from '../lib/format.js';
import { addRecentCommunity } from '../lib/recent.js';
import { useAuth } from '../context/AuthContext.jsx';
import { mediaUrl } from '../lib/api.js';

export default function Community() {
  const { name } = useParams();
  const { user } = useAuth();
  const [sort, setSort] = useState('hot');
  const [time, setTime] = useState('all');
  const [flair, setFlair] = useState('');

  const communityQuery = useCommunity(name);
  const postsQuery = usePostFeed({ community: name, sort, time, flair });

  useEffect(() => {
    setFlair('');
    setSort('hot');
    setTime('all');
  }, [name]);

  useEffect(() => {
    if (communityQuery.data?.community) addRecentCommunity(communityQuery.data.community);
  }, [communityQuery.data]);

  if (communityQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={26} className="animate-spin text-muted" />
      </div>
    );
  }

  if (communityQuery.isError || !communityQuery.data?.community) {
    return (
      <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold">Community not found</h1>
        <p className="mt-2 text-sm text-muted">
          r/{name} does not exist or was removed.
        </p>
        <Link to="/" className="btn-primary mt-5 text-sm">
          Go home
        </Link>
      </div>
    );
  }

  const community = communityQuery.data.community;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="card overflow-hidden">
          <div className="h-24 w-full bg-gradient-to-r from-accent/80 via-orange-400 to-amber-300 sm:h-32">
            {community.bannerUrl && (
              <img src={mediaUrl(community.bannerUrl)} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
            <div className="-mt-7">
              <Avatar
                name={community.name}
                src={community.iconUrl}
                size={68}
                square
                className="ring-4 ring-surface"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold">r/{community.name}</h1>
              <p className="text-xs text-muted">
                {community.title} · {compactNumber(community.memberCount)} members
              </p>
            </div>
            <div className="flex items-center gap-2">
              {community.isModerator && (
                <Link to={`/r/${community.name}/mod`} className="btn-outline px-3 py-1.5 text-xs">
                  Mod tools
                </Link>
              )}
              {user && (
                <Link to={`/r/${community.name}/submit`} className="btn-primary px-3 py-1.5 text-xs">
                  <Plus size={15} /> Create post
                </Link>
              )}
              <JoinButton name={community.name} className="btn-primary px-3 py-1.5 text-xs" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <SortBar
            sort={sort}
            time={time}
            onChange={({ sort: nextSort, time: nextTime }) => {
              setSort(nextSort);
              setTime(nextTime);
            }}
          />
        </div>

        {community.flairs?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFlair('')}
              className={`chip border ${flair === '' ? 'border-accent text-accent' : 'border-line text-muted hover:bg-hover'}`}
            >
              All posts
            </button>
            {community.flairs.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setFlair(item.label)}
                className="chip border transition-colors"
                style={{
                  borderColor: flair === item.label ? item.color : 'var(--border)',
                  color: flair === item.label ? item.color : 'var(--muted)',
                  backgroundColor: flair === item.label ? `${item.color}18` : 'transparent',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <PostList
          query={postsQuery}
          emptyTitle="No posts yet"
          emptyText={flair ? `Nothing tagged ${flair} yet.` : 'Be the first to start a discussion here.'}
          action={
            user ? (
              <Link to={`/r/${community.name}/submit`} className="btn-primary text-sm">
                Create the first post
              </Link>
            ) : null
          }
        />
      </div>

      <RightRail>
        <CommunityAbout community={community} />
      </RightRail>
    </div>
  );
}
