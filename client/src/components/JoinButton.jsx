import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCommunity } from '../hooks/useCommunity.js';
import { useToast } from '../context/ToastContext.jsx';

export default function JoinButton({ name, className = 'btn-secondary text-xs px-3 py-1.5' }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useCommunity(name);
  const [pending, setPending] = useState(false);

  const community = data?.community;
  if (!community) return null;
  if (community.isModerator) {
    return <span className="chip bg-chip text-muted">Moderator</span>;
  }

  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (pending) return;
    setPending(true);

    // Optimistic membership flip, reconciled with the server below.
    const previous = queryClient.getQueryData(['community', name]);
    const willJoin = !community.isMember;
    queryClient.setQueryData(['community', name], (old) =>
      old
        ? {
            ...old,
            community: {
              ...old.community,
              isMember: willJoin,
              memberCount: Math.max(0, old.community.memberCount + (willJoin ? 1 : -1)),
            },
          }
        : old,
    );

    try {
      const result = await api(`/communities/${name}/${willJoin ? 'join' : 'leave'}`, {
        method: willJoin ? 'POST' : 'DELETE',
      });
      queryClient.setQueryData(['community', name], (old) =>
        old ? { ...old, community: { ...old.community, isMember: result.isMember, memberCount: result.memberCount } } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    } catch (error) {
      if (previous) queryClient.setQueryData(['community', name], previous);
      toast.error(error.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={community.isMember ? 'btn-outline text-xs px-3 py-1.5' : className}
    >
      {community.isMember ? 'Joined' : 'Join'}
    </button>
  );
}
