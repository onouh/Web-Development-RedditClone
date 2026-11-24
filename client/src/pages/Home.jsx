import { useState } from 'react';
import { Link } from 'react-router-dom';
import PostList from '../components/PostList.jsx';
import SortBar from '../components/SortBar.jsx';
import RightRail, { PopularCommunities, TopPostsRail } from '../components/RightRail.jsx';
import { usePostFeed } from '../hooks/usePostFeed.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();
  const [sort, setSort] = useState('hot');
  const [time, setTime] = useState('all');
  const query = usePostFeed({ scope: 'home', sort, time });

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">{user ? 'Home' : 'Popular'}</h1>
          {user && (
            <Link to="/submit" className="btn-primary px-3 py-1.5 text-xs">
              Create post
            </Link>
          )}
        </div>

        <SortBar sort={sort} time={time} onChange={({ sort: nextSort, time: nextTime }) => {
          setSort(nextSort);
          setTime(nextTime);
        }} />

        <PostList
          query={query}
          emptyTitle="Your feed is empty"
          emptyText={
            user
              ? 'Join a few communities and their posts will show up here.'
              : 'Explore popular communities to get started.'
          }
          action={
            <Link to="/popular" className="btn-primary text-sm">
              Explore popular
            </Link>
          }
        />
      </div>

      <RightRail>
        <PopularCommunities />
        <TopPostsRail />
        <p className="px-2 text-[11px] leading-relaxed text-muted">
          Threadit · Fall 2026 Web Development project · Built with MongoDB, Express, React, Socket.IO and AI.
        </p>
      </RightRail>
    </div>
  );
}
