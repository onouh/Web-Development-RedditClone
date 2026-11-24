import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function CommentForm({
  postId,
  parentCommentId = null,
  onDone,
  onCancel,
  autoFocus = false,
  compact = false,
}) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { body: body.trim(), parentCommentId: parentCommentId || null },
      }),
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Comment posted');
      onDone?.();
    },
    onError: (error) => toast.error(error.message),
  });

  if (!user) {
    return (
      <div className={`card flex items-center justify-between gap-3 ${compact ? 'p-2' : 'p-3'}`}>
        <p className="text-sm text-muted">Log in to join the conversation.</p>
        <Link to="/login" className="btn-primary px-3 py-1.5 text-xs">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim().length < 1) return;
        mutation.mutate();
      }}
      className={`card ${compact ? 'p-2' : 'p-3'}`}
    >
      <textarea
        value={body}
        autoFocus={autoFocus}
        onChange={(event) => setBody(event.target.value)}
        rows={compact ? 2 : 3}
        maxLength={10000}
        placeholder={parentCommentId ? 'Write a reply…' : 'What are your thoughts?'}
        className="textarea resize-y border-0 bg-transparent px-1 py-1 focus:border-0"
        aria-label={parentCommentId ? 'Reply text' : 'Comment text'}
      />
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="text-[11px] text-muted">Markdown supported · u/username mentions notify</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-ghost px-3 py-1.5 text-xs">
              Cancel
            </button>
          )}
          <button type="submit" disabled={mutation.isPending || !body.trim()} className="btn-primary px-3 py-1.5 text-xs">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {parentCommentId ? 'Reply' : 'Comment'}
          </button>
        </div>
      </div>
    </form>
  );
}
