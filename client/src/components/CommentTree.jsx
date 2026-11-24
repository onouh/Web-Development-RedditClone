import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Flag, MoreHorizontal, Pencil, Shield, Trash2 } from 'lucide-react';
import Avatar from './Avatar.jsx';
import Markdown from './Markdown.jsx';
import VoteButtons from './VoteButtons.jsx';
import CommentForm from './CommentForm.jsx';
import { timeAgo } from '../lib/format.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useClickOutside from '../hooks/useClickOutside.js';

function CommentNode({ comment, post, depth = 0, isModerator = false, moderatorNames, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const isAuthor = user && comment.author?.username === user.username;
  const isOp = comment.author?.username && post?.author?.username === comment.author.username;
  const isModAuthor = comment.author?.username && moderatorNames?.has(comment.author.username);
  const hidden = comment.isDeleted || comment.isRemovedByMod;

  const editMutation = useMutation({
    mutationFn: () => api(`/comments/${comment.id}`, { method: 'PATCH', body: { body: editBody.trim() } }),
    onSuccess: () => {
      setEditing(false);
      toast.success('Comment updated');
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteComment = async (modRemoval = false) => {
    const removalReason = modRemoval ? window.prompt('Removal reason:', 'Breaks community rules') : null;
    if (modRemoval && removalReason === null) return;
    if (!modRemoval && !window.confirm('Delete this comment?')) return;

    try {
      await api(`/comments/${comment.id}${modRemoval ? '/remove' : ''}`, {
        method: modRemoval ? 'POST' : 'DELETE',
        body: modRemoval ? { reason: removalReason } : undefined,
      });
      toast.success(modRemoval ? 'Comment removed' : 'Comment deleted');
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
      onChanged?.();
    } catch (error) {
      toast.error(error.message);
    }
    setMenuOpen(false);
  };

  const report = async () => {
    const reason = window.prompt('Why are you reporting this comment?');
    if (!reason) return;
    try {
      await api(`/comments/${comment.id}/report`, { method: 'POST', body: { reason } });
      toast.success('Report sent to moderators');
    } catch (error) {
      toast.error(error.message);
    }
    setMenuOpen(false);
  };

  return (
    <div className="text-sm">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink"
          aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        <div className="min-w-0 flex-1 pb-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
            {comment.author ? (
              <Link to={`/u/${comment.author.username}`} className="flex items-center gap-1.5 font-medium text-ink hover:underline">
                <Avatar name={comment.author.username} src={comment.author.avatarUrl} size={20} />
                u/{comment.author.username}
              </Link>
            ) : (
              <span className="font-medium">[deleted]</span>
            )}
            {isOp && <span className="chip bg-accent/15 px-1.5 py-0 text-[10px] text-accent">OP</span>}
            {isModAuthor && <span className="chip bg-blue-500/15 px-1.5 py-0 text-[10px] text-blue-400">MOD</span>}
            <span>·</span>
            <span>{timeAgo(comment.createdAt)}</span>
            {comment.isEdited && <span className="italic">(edited)</span>}
            {collapsed && comment.replies?.length > 0 && (
              <button type="button" onClick={() => setCollapsed(false)} className="text-accent hover:underline">
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'} hidden
              </button>
            )}
            <div className="relative ml-auto" ref={menuRef}>
              <button
                type="button"
                className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
                aria-label="Comment options"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-44 animate-fade-in overflow-hidden rounded-xl border border-line bg-elevated py-1 text-xs shadow-pop">
                  {isAuthor && !hidden && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  )}
                  {isAuthor && !hidden && (
                    <button
                      type="button"
                      onClick={() => deleteComment(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  {isModerator && !hidden && !isAuthor && (
                    <button
                      type="button"
                      onClick={() => deleteComment(true)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                    >
                      <Shield size={14} /> Remove as mod
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={report}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                  >
                    <Flag size={14} /> Report
                  </button>
                </div>
              )}
            </div>
          </div>

          {!collapsed && (
            <>
              {comment.isRemovedByMod ? (
                <p className="mt-1 text-sm italic text-muted">
                  [removed by moderator{comment.removalReason ? `: ${comment.removalReason}` : ''}]
                </p>
              ) : comment.isDeleted ? (
                <p className="mt-1 text-sm italic text-muted">[deleted]</p>
              ) : editing ? (
                <form
                  className="mt-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editBody.trim()) editMutation.mutate();
                  }}
                >
                  <textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    rows={3}
                    className="textarea"
                    autoFocus
                  />
                  <div className="mt-1.5 flex gap-2">
                    <button type="submit" disabled={editMutation.isPending} className="btn-primary px-3 py-1.5 text-xs">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setEditBody(comment.body);
                      }}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-1">
                  <Markdown>{comment.body}</Markdown>
                </div>
              )}

              {!hidden && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <VoteButtons
                    targetType="comment"
                    targetId={comment.id}
                    score={comment.score}
                    userVote={comment.userVote}
                    layout="inline"
                  />
                  <button
                    type="button"
                    onClick={() => setReplying((value) => !value)}
                    className="rounded px-2 py-1 font-semibold text-muted hover:bg-hover hover:text-ink"
                  >
                    Reply
                  </button>
                </div>
              )}

              {replying && (
                <div className="mt-2">
                  <CommentForm
                    postId={post.id}
                    parentCommentId={comment.id}
                    compact
                    autoFocus
                    onDone={() => setReplying(false)}
                    onCancel={() => setReplying(false)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!collapsed && comment.replies?.length > 0 && (
        <div className="relative ml-2.5 border-l border-line pl-2 sm:ml-3 sm:pl-3">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              post={post}
              depth={depth + 1}
              isModerator={isModerator}
              moderatorNames={moderatorNames}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentTree({ comments, post, isModerator = false, moderatorNames = new Set(), onChanged }) {
  if (!comments?.length) {
    return <p className="px-1 py-6 text-center text-sm text-muted">No comments yet — start the conversation.</p>;
  }
  return (
    <div className="space-y-1">
      {comments.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          post={post}
          isModerator={isModerator}
          moderatorNames={moderatorNames}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}
