import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, MessageSquare, Shield, Sparkles, UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import useClickOutside from '../hooks/useClickOutside.js';
import Avatar from './Avatar.jsx';

const TYPE_ICONS = {
  post_reply: MessageSquare,
  comment_reply: MessageSquare,
  chat: MessageSquare,
  mod_action: Shield,
  mention: UserPlus,
  post_vote: Sparkles,
  comment_vote: Sparkles,
};

export default function NotificationsMenu() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false), open);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api('/notifications?limit=15'),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data) return;
    setItems(data.items || []);
    setUnread(data.unreadCount || 0);
  }, [data]);

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (notification) => {
      setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 15));
      setUnread((current) => current + 1);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

  if (!user) return null;

  const markAllRead = async () => {
    await api('/notifications/read-all', { method: 'POST' });
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const openItem = async (item) => {
    if (!item.isRead) {
      api(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {});
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry)));
      setUnread((current) => Math.max(0, current - 1));
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="icon-btn relative"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] animate-fade-in overflow-hidden rounded-xl border border-line bg-elevated shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">You are all caught up.</p>}
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] || Bell;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-hover ${
                    item.isRead ? '' : 'bg-accent/5'
                  }`}
                >
                  {item.actor ? (
                    <Avatar name={item.actor.username} src={item.actor.avatarUrl} size={32} />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-chip text-muted">
                      <Icon size={15} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{item.message}</span>
                    <span className="mt-0.5 block text-xs text-muted">{timeAgo(item.createdAt)}</span>
                  </span>
                  {!item.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
