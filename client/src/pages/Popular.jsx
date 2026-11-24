import { useState } from 'react';
import PostList from '../components/PostList.jsx';
import SortBar from '../components/SortBar.jsx';
import RightRail, { PopularCommunities } from '../components/RightRail.jsx';
import { usePostFeed } from '../hooks/usePostFeed.js';

export default function Popular() {
  const [sort, setSort] = useState('hot');
  const [time, setTime] = useState('all');
  const query = usePostFeed({ scope: 'popular', sort, time });

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <h1 className="mb-3 text-xl font-bold">Popular</h1>
        <SortBar
          sort={sort}
          time={time}
          onChange={({ sort: nextSort, time: nextTime }) => {
            setSort(nextSort);
            setTime(nextTime);
          }}
        />
        <PostList query={query} emptyTitle="Nothing popular yet" emptyText="Once people start posting, the best threads land here." />
      </div>
      <RightRail>
        <PopularCommunities />
      </RightRail>
    </div>
  );
}
