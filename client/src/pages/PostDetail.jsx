import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import PostCard from '../components/PostCard.jsx';
import CommentTree from '../components/CommentTree.jsx';
import CommentForm from '../components/CommentForm.jsx';
import RightRail, { CommunityAbout } from '../components/RightRail.jsx';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCommunity } from '../hooks/useCommunity.js';

const sortTree = (list, mode) =>
  [...list]
    .sort((a, b) =>
      mode === 'top' ? b.score - a.score : new Date(b.createdAt) - new Date(a.createdAt),
    )
    .map((comment) => ({ ...comment, replies: sortTree(comment.replies || [], mode) }));

export default function PostDetail() {
  const { name, postId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const editing = searchParams.get('edit') === '1';
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const [commentSort, setCommentSort] = useState('new');
  const [digest, setDigest] = useState(null);

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => api(`/posts/${postId}`),
  });
  const commentsQuery = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api(`/posts/${postId}/comments`),
  });
  const communityQuery = useCommunity(name);

  const post = postQuery.data?.post;

  useEffect(() => {
    if (editing && post) setEditForm({ title: post.title, body: post.body || '' });
    // Intentionally only when entering edit mode; refetches should not clobber typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const saveEdit = useMutation({
    mutationFn: () => api(`/posts/${postId}`, { method: 'PATCH', body: editForm }),
    onSuccess: () => {
      toast.success('Post updated');
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setSearchParams({});
    },
    onError: (error) => toast.error(error.message),
  });

  const digestMutation = useMutation({
    mutationFn: () => api(`/posts/${postId}/comments/summarize`, { method: 'POST' }),
    onSuccess: (data) => setDigest(data.digest),
    onError: (error) => toast.error(error.message),
  });

  const comments = useMemo(
    () => sortTree(commentsQuery.data?.items || [], commentSort),
    [commentsQuery.data, commentSort],
  );

  const moderatorNames = useMemo(
    () => new Set((communityQuery.data?.community?.moderators || []).map((mod) => mod.username)),
    [communityQuery.data],
  );

  if (postQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={26} className="animate-spin text-muted" />
      </div>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold">Post not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been deleted or removed.</p>
        <Link to="/" className="btn-primary mt-5 text-sm">
          Back to feed
        </Link>
      </div>
    );
  }

  const isAuthor = user && post.author?.id === user.id;
  const isModerator = Boolean(communityQuery.data?.community?.isModerator);
  const commentTotal = commentsQuery.data?.total ?? post.commentCount;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="icon-btn h-8 w-8"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <Link to={`/r/${name}`} className="text-sm font-semibold hover:underline">
            r/{name}
          </Link>
          <span className="text-muted">·</span>
          <span className="text-xs text-muted">{timeAgo(post.createdAt)}</span>
        </div>

        {editing && isAuthor ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (editForm.title.trim().length >= 3) saveEdit.mutate();
            }}
            className="card space-y-3 p-4"
          >
            <h1 className="text-lg font-bold">Edit post</h1>
            <div>
              <label htmlFor="edit-title" className="mb-1 block text-xs font-semibold text-muted">
                Title
              </label>
              <input
                id="edit-title"
                value={editForm.title}
                onChange={(event) => setEditForm((form) => ({ ...form, title: event.target.value }))}
                className="input rounded-lg"
                maxLength={300}
              />
            </div>
            <div>
              <label htmlFor="edit-body" className="mb-1 block text-xs font-semibold text-muted">
                Body
              </label>
              <textarea
                id="edit-body"
                value={editForm.body}
                onChange={(event) => setEditForm((form) => ({ ...form, body: event.target.value }))}
                rows={8}
                className="textarea"
                maxLength={40000}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saveEdit.isPending} className="btn-primary text-sm">
                {saveEdit.isPending ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setSearchParams({})} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <PostCard post={post} expanded onDeleted={() => navigate(`/r/${name}`)} />
        )}

        <section className="card mt-3 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Thread TL;DR</h2>
              <p className="text-xs text-muted">Catch up on the discussion with one click.</p>
            </div>
            <button
              type="button"
              onClick={() => digestMutation.mutate()}
              disabled={digestMutation.isPending}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {digestMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {digestMutation.isPending ? 'Reading the thread…' : digest ? 'Refresh digest' : 'Catch me up'}
            </button>
          </div>

          {digest && (
            <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="chip bg-chip text-muted">{digest.tone}</span>
                <span className="text-xs text-muted">
                  {digest.source === 'ai' ? 'AI digest' : 'Auto digest'}
                  {digest.cached ? ' · cached' : ''}
                </span>
              </div>
              {digest.summary && <p>{digest.summary}</p>}
              {digest.consensus && (
                <p>
                  <span className="font-semibold">Consensus: </span>
                  {digest.consensus}
                </p>
              )}
              {digest.counterpoints?.length > 0 && (
                <div>
                  <p className="font-semibold">Counterpoints</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                    {digest.counterpoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{commentTotal} comments</h2>
            <select
              value={commentSort}
              onChange={(event) => setCommentSort(event.target.value)}
              className="ml-auto rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted outline-none focus:border-accent"
              aria-label="Sort comments"
            >
              <option value="new">Newest first</option>
              <option value="top">Top first</option>
            </select>
          </div>

          <div className="mb-4">
            <CommentForm postId={postId} />
          </div>

          {commentsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : commentsQuery.isError ? (
            <p className="py-6 text-center text-sm text-muted">Could not load comments.</p>
          ) : (
            <CommentTree
              comments={comments}
              post={post}
              isModerator={isModerator}
              moderatorNames={moderatorNames}
              onChanged={() => queryClient.invalidateQueries({ queryKey: ['post', postId] })}
            />
          )}
        </section>
      </div>

      <RightRail>
        <CommunityAbout community={communityQuery.data?.community} />
      </RightRail>
    </div>
  );
}
