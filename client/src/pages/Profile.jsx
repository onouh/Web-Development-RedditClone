import { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, Cake, Loader2, MessageCircle, Pencil, ShieldCheck, Upload } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import Markdown from '../components/Markdown.jsx';
import PostCard from '../components/PostCard.jsx';
import { api, mediaUrl, uploadImage } from '../lib/api.js';
import { compactNumber, formatDate, timeAgo } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function EditProfileModal({ profile, onClose }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    avatarUrl: profile.avatarUrl || '',
    bannerUrl: profile.bannerUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  const upload = async (file, field) => {
    if (!file) return;
    setUploading(field);
    try {
      const result = await uploadImage(file);
      setForm((current) => ({ ...current, [field]: result.url }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading('');
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api('/users/me', { method: 'PATCH', body: form });
      updateUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['profile', profile.username] });
      toast.success('Profile updated');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <form
        onSubmit={save}
        className="relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-pop"
      >
        <h2 className="text-lg font-bold">Edit profile</h2>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="display-name" className="mb-1 block text-xs font-semibold text-muted">
              Display name
            </label>
            <input
              id="display-name"
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              maxLength={50}
              className="input rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-1 block text-xs font-semibold text-muted">
              Bio
            </label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              rows={3}
              maxLength={500}
              className="textarea"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-semibold text-muted">Avatar</span>
              <div className="flex items-center gap-2">
                <Avatar name={profile.username} src={form.avatarUrl} size={40} />
                <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
                  <Upload size={13} /> {uploading === 'avatarUrl' ? 'Uploading…' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => upload(event.target.files?.[0], 'avatarUrl')}
                  />
                </label>
              </div>
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold text-muted">Banner</span>
              <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
                <Upload size={13} /> {uploading === 'bannerUrl' ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => upload(event.target.files?.[0], 'bannerUrl')}
                />
              </label>
              {form.bannerUrl && <p className="mt-1 truncate text-[11px] text-muted">{form.bannerUrl}</p>}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving || Boolean(uploading)} className="btn-primary text-sm">
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CommentCard({ comment }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-muted">
        on{' '}
        {comment.post ? (
          <Link to={`/r/${comment.post.community}/comments/${comment.post.id}`} className="font-medium text-ink hover:underline">
            {comment.post.title}
          </Link>
        ) : (
          'a deleted post'
        )}
      </p>
      <div className="mt-1.5 text-sm">
        <Markdown>{comment.body}</Markdown>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {comment.score} points · {timeAgo(comment.createdAt)}
      </p>
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const { startConversation } = useChat();
  const navigate = useNavigate();
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);

  const isSelf = me?.username === username;

  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api(`/users/${username}`),
  });

  const postsQuery = useInfiniteQuery({
    queryKey: ['profile-posts', username],
    queryFn: ({ pageParam = 1 }) => api(`/users/${username}/posts?page=${pageParam}&limit=10`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: tab === 'posts',
  });

  const commentsQuery = useInfiniteQuery({
    queryKey: ['profile-comments', username],
    queryFn: ({ pageParam = 1 }) => api(`/users/${username}/comments?page=${pageParam}&limit=10`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: tab === 'comments',
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={26} className="animate-spin text-muted" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data?.user) {
    return (
      <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold">User not found</h1>
        <p className="mt-2 text-sm text-muted">u/{username} does not exist.</p>
        <Link to="/" className="btn-primary mt-5 text-sm">
          Back to feed
        </Link>
      </div>
    );
  }

  const { user: profile, stats, moderated } = profileQuery.data;
  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const comments = commentsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="card overflow-hidden">
        <div className="h-32 w-full bg-gradient-to-r from-accent/80 via-orange-400 to-amber-300 sm:h-40">
          {profile.bannerUrl && (
            <img src={mediaUrl(profile.bannerUrl)} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-4 pb-5 sm:px-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="-mt-10">
              <Avatar
                name={profile.username}
                src={profile.avatarUrl}
                size={88}
                className="ring-4 ring-surface"
              />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-2xl font-bold">{profile.displayName || profile.username}</h1>
              <p className="text-sm text-muted">u/{profile.username}</p>
            </div>
            <div className="flex gap-2 pb-1">
              {isSelf ? (
                <button type="button" onClick={() => setEditing(true)} className="btn-secondary text-sm">
                  <Pencil size={15} /> Edit profile
                </button>
              ) : (
                me && (
                  <button
                    type="button"
                    onClick={async () => {
                      const conversation = await startConversation(profile.id);
                      if (conversation) navigate('/chat');
                    }}
                    className="btn-secondary text-sm"
                  >
                    <MessageCircle size={15} /> Chat
                  </button>
                )
              )}
            </div>
          </div>

          {profile.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/85">{profile.bio}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 text-sm">
            <span>
              <strong>{compactNumber(profile.postKarma)}</strong> <span className="text-muted">post karma</span>
            </span>
            <span>
              <strong>{compactNumber(profile.commentKarma)}</strong> <span className="text-muted">comment karma</span>
            </span>
            <span className="flex items-center gap-1 text-muted">
              <Cake size={14} /> Joined {formatDate(profile.cakeDay || profile.createdAt)}
            </span>
          </div>

          {moderated?.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <ShieldCheck size={13} className="text-accent" /> Moderates
              {moderated.map((community) => (
                <Link
                  key={community.name}
                  to={`/r/${community.name}`}
                  className="rounded-full bg-chip px-2 py-0.5 font-medium text-ink hover:bg-hover"
                >
                  r/{community.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 border-b border-line">
        {[
          ['posts', `Posts (${stats.postCount})`],
          ['comments', `Comments (${stats.commentCount})`],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === value ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        {isSelf && (
          <Link
            to="/saved"
            className="flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink"
          >
            <Bookmark size={14} /> Saved
          </Link>
        )}
      </div>

      <div className="mt-3 space-y-2.5">
        {tab === 'posts' &&
          (postsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : posts.length === 0 ? (
            <p className="card p-8 text-center text-sm text-muted">No posts yet.</p>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {postsQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => postsQuery.fetchNextPage()}
                  className="btn-secondary w-full"
                >
                  Load more
                </button>
              )}
            </>
          ))}

        {tab === 'comments' &&
          (commentsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : comments.length === 0 ? (
            <p className="card p-8 text-center text-sm text-muted">No comments yet.</p>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
              {commentsQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => commentsQuery.fetchNextPage()}
                  className="btn-secondary w-full"
                >
                  Load more
                </button>
              )}
            </>
          ))}
      </div>

      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
