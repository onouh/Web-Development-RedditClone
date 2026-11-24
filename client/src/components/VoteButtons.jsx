import { useEffect, useState } from 'react';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { compactNumber } from '../lib/format.js';

export default function VoteButtons({
  targetType = 'post',
  targetId,
  score = 0,
  userVote = 0,
  layout = 'pill',
  onChange,
}) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState({ score, userVote });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setState({ score, userVote });
  }, [score, userVote, targetId]);

  const submit = async (direction) => {
    if (!user) {
      toast.info('Log in to vote');
      navigate('/login');
      return;
    }
    if (pending) return;

    const next = state.userVote === direction ? 0 : direction;
    const previous = state;
    const delta = next - state.userVote;
    setState({ score: state.score + delta, userVote: next });
    setPending(true);

    const path =
      targetType === 'post' ? `/posts/${targetId}/vote` : `/comments/${targetId}/vote`;

    try {
      const result = await api(path, { method: 'PUT', body: { value: next } });
      setState({ score: result.score, userVote: result.userVote });
      onChange?.(result);
    } catch (error) {
      setState(previous);
      toast.error(error.message);
    } finally {
      setPending(false);
    }
  };

  const activeUp = state.userVote === 1;
  const activeDown = state.userVote === -1;

  if (layout === 'inline') {
    return (
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => submit(1)}
          aria-label="Upvote"
          aria-pressed={activeUp}
          className={`rounded p-1 transition-colors hover:bg-hover ${activeUp ? 'text-upvote' : 'text-muted'}`}
        >
          <ArrowBigUp size={19} fill={activeUp ? 'currentColor' : 'none'} />
        </button>
        <span className={`min-w-[1.5rem] text-center text-xs font-semibold ${activeUp ? 'text-upvote' : activeDown ? 'text-downvote' : 'text-muted'}`}>
          {compactNumber(state.score)}
        </span>
        <button
          type="button"
          onClick={() => submit(-1)}
          aria-label="Downvote"
          aria-pressed={activeDown}
          className={`rounded p-1 transition-colors hover:bg-hover ${activeDown ? 'text-downvote' : 'text-muted'}`}
        >
          <ArrowBigDown size={19} fill={activeDown ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center rounded-full bg-chip">
      <button
        type="button"
        onClick={() => submit(1)}
        aria-label="Upvote"
        aria-pressed={activeUp}
        className={`flex items-center gap-1 rounded-l-full py-1.5 pl-3 pr-2 transition-colors hover:bg-hover ${activeUp ? 'text-upvote' : 'text-muted hover:text-ink'}`}
      >
        <ArrowBigUp size={21} fill={activeUp ? 'currentColor' : 'none'} />
        <span className="text-xs font-bold">{compactNumber(state.score)}</span>
      </button>
      <button
        type="button"
        onClick={() => submit(-1)}
        aria-label="Downvote"
        aria-pressed={activeDown}
        className={`rounded-r-full py-1.5 pl-2 pr-3 transition-colors hover:bg-hover ${activeDown ? 'text-downvote' : 'text-muted hover:text-ink'}`}
      >
        <ArrowBigDown size={21} fill={activeDown ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
