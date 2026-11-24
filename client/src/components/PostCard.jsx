import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ExternalLink,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  Flag,
} from 'lucide-react';
import Avatar from './Avatar.jsx';
import JoinButton from './JoinButton.jsx';
import Markdown from './Markdown.jsx';
import VoteButtons from './VoteButtons.jsx';
import { api, mediaUrl } from '../lib/api.js';
import { compactNumber, timeAgo } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCommunity } from '../hooks/useCommunity.js';
import useClickOutside from '../hooks/useClickOutside.js';

function LinkPreview({ url }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    host = url;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-page px-3 py-2 text-sm text-muted transition-colors hover:border-accent"
    >
      <ExternalLink size={16} className="shrink-0" />
      <span className="truncate">{host}</span>
    </a>
  );
}

export default function PostCard({ post, onDeleted, expanded = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const menuRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [summary, setSummary] = useState(post.aiSummary);
  const [showSummary, setShowSummary] = useState(false);
  const [saved, setSaved] = useState(Boolean(post.saved));

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const communityName = post.community?.name || '';
  const { data: communityData } = useCommunity(communityName);
  const isModerator = Boolean(communityData?.community?.isModerator);
  const isAuthor = user && post.author?.id === user.id;

  const summarize = useMutation({
    mutationFn: () => api(`/posts/${post.id}/summarize`, { method: 'POST' }),
    onSuccess: (data) => {
      setSummary(data.summary);
      setShowSummary(true);
    },
    onError: (error) => toast.error(error.message),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['feed'] });

  const removePost = async (modRemoval = false) => {
    const reason = modRemoval ? window.prompt('Removal reason for the author:', 'Breaks community rules') : null;
    if (modRemoval && reason === null) return;
    if (!modRemoval && !window.confirm('Delete this post? This cannot be undone.')) return;

    try {
      await api(`/posts/${post.id}${modRemoval ? '/remove' : ''}`, {
        method: modRemoval ? 'POST' : 'DELETE',
        body: modRemoval ? { reason } : undefined,
      });
      toast.success(modRemoval ? 'Post removed' : 'Post deleted');
      refresh();
      onDeleted?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const report = async () => {
    const reason = window.prompt('Why are you reporting this post?');
    if (!reason) return;
    try {
      await api(`/posts/${post.id}/report`, { method: 'POST', body: { reason } });
      toast.success('Report sent to moderators');
    } catch (error) {
      toast.error(error.message);
    }
    setMenuOpen(false);
  };

  const toggleSave = async () => {
    if (!user) return navigate('/login');
    try {
      const result = await api(`/posts/${post.id}/save`, { method: 'PUT' });
      setSaved(result.saved);
      toast.success(result.saved ? 'Saved' : 'Removed from saved');
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/r/${communityName}/comments/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  const openPost = () => navigate(`/r/${communityName}/comments/${post.id}`);
  const hasSummary = Boolean(summary?.text);

  const handleSummarize = () => {
    if (hasSummary) {
      setShowSummary((value) => !value);
      return;
    }
    if (!user) {
      toast.info('Log in to summarize posts');
      navigate('/login');
      return;
    }
    summarize.mutate();
  };

  return (
    <article className="card p-2.5 transition-colors hover:border-muted/50 sm:p-3">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
        {post.community && (
          <>
            <Link to={`/r/${communityName}`} className="flex items-center gap-1.5 font-semibold text-ink hover:underline">
              <Avatar name={communityName} src={post.community.iconUrl} size={22} square />
              r/{communityName}
            </Link>
            <span>·</span>
          </>
        )}
        {post.author ? (
          <Link to={`/u/${post.author.username}`} className="hover:underline">
            u/{post.author.username}
          </Link>
        ) : (
          <span>[deleted]</span>
        )}
        <span>·</span>
        <span>{timeAgo(post.createdAt)}</span>
        {post.isEdited && <span className="italic">(edited)</span>}
        {post.flair && (
          <span
            className="chip ml-1"
            style={{ backgroundColor: `${post.flair.color}22`, color: post.flair.color }}
          >
            {post.flair.label}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {!isAuthor && <JoinButton name={communityName} />}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="icon-btn h-8 w-8"
              aria-label="Post options"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <MoreHorizontal size={17} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-48 animate-fade-in overflow-hidden rounded-xl border border-line bg-elevated py-1 text-sm shadow-pop">
                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => navigate(`/r/${communityName}/comments/${post.id}?edit=1`)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                  >
                    <Pencil size={15} /> Edit post
                  </button>
                )}
                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => removePost(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                  >
                    <Trash2 size={15} /> Delete post
                  </button>
                )}
                {isModerator && !isAuthor && (
                  <button
                    type="button"
                    onClick={() => removePost(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                  >
                    <Shield size={15} /> Remove as mod
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    share();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                >
                  <Link2 size={15} /> Copy link
                </button>
                <button
                  type="button"
                  onClick={report}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
                >
                  <Flag size={15} /> Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-1.5 cursor-pointer" onClick={openPost} role="presentation">
        <h2 className="text-[1.05rem] font-semibold leading-snug text-ink sm:text-lg">{post.title}</h2>

        {post.isRemovedByMod && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent">
            <Shield size={13} /> Removed by moderator{post.removalReason ? `: ${post.removalReason}` : ''}
          </p>
        )}

        {post.type === 'image' && post.mediaUrl && (
          <img
            src={mediaUrl(post.mediaUrl)}
            alt={post.title}
            className={`mt-2 w-full rounded-lg object-cover ${expanded ? 'max-h-[560px]' : 'max-h-[420px]'}`}
            loading="lazy"
          />
        )}

        {post.type === 'link' && post.linkUrl && <LinkPreview url={post.linkUrl} />}

        {post.body && (expanded || post.type === 'text') && (
          <div className={expanded ? 'mt-2 text-[0.95rem]' : 'mt-1.5 max-h-40 overflow-hidden text-sm text-muted'}>
            <Markdown>{expanded ? post.body : post.body.slice(0, 420)}</Markdown>
          </div>
        )}
      </div>

      {showSummary && summary?.text && (
        <div className="mt-2.5 animate-fade-in rounded-lg border border-line bg-page p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Sparkles size={14} />
            {summary.source === 'ai' ? 'AI summary' : summary.source === 'fallback' ? 'Auto summary' : 'Summary'}
            {summary.cached && <span className="font-normal text-muted">· cached</span>}
          </div>
          <p className="text-sm leading-relaxed">{summary.text}</p>
          {summary.bullets?.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted">
              {summary.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <VoteButtons
          targetType="post"
          targetId={post.id}
          score={post.score}
          userVote={post.userVote}
        />
        <Link
          to={`/r/${communityName}/comments/${post.id}`}
          className="flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <MessageSquare size={16} />
          {compactNumber(post.commentCount)}
        </Link>
        <button
          type="button"
          onClick={handleSummarize}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            showSummary ? 'bg-accent/15 text-accent' : 'bg-chip text-muted hover:bg-hover hover:text-ink'
          }`}
        >
          <Sparkles size={15} className={summarize.isPending ? 'animate-pulse' : ''} />
          {summarize.isPending ? 'Summarizing…' : hasSummary ? 'Summary' : 'Summarize'}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <Share2 size={15} /> Share
        </button>
        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? 'Unsave post' : 'Save post'}
          className={`ml-auto rounded-full p-1.5 transition-colors hover:bg-hover ${saved ? 'text-accent' : 'text-muted'}`}
        >
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
    </article>
  );
}
