import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);

export default function CreateCommunity() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rulesText, setRulesText] = useState('Be respectful\nNo spam or self-promotion\nKeep posts on topic');

  const mutation = useMutation({
    mutationFn: () =>
      api('/communities', {
        method: 'POST',
        body: {
          name,
          title: title || name,
          description,
          rules: rulesText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 10)
            .map((line) => ({ title: line, description: '' })),
        },
      }),
    onSuccess: (data) => {
      toast.success(`r/${data.community.name} created`);
      navigate(`/r/${data.community.name}`);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Create a community</h1>
        <p className="text-sm text-muted">Build a home for a topic, club or campus group.</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.length < 3) return toast.error('Community name must be at least 3 characters');
          return mutation.mutate();
        }}
        className="card space-y-4 p-4"
      >
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-semibold text-muted">
            Community name
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">r/</span>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(slugify(event.target.value))}
              placeholder="webdev"
              minLength={3}
              maxLength={24}
              required
              className="input rounded-lg"
            />
            <Avatar name={name || 'community'} size={36} square />
          </div>
          <p className="mt-1 text-[11px] text-muted">3–24 characters · lowercase letters, numbers and underscores</p>
        </div>

        <div>
          <label htmlFor="title" className="mb-1 block text-xs font-semibold text-muted">
            Display title
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            placeholder="Web Development"
            className="input rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-xs font-semibold text-muted">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What is this community about?"
            className="textarea"
          />
        </div>

        <div>
          <label htmlFor="rules" className="mb-1 block text-xs font-semibold text-muted">
            Rules (one per line, up to 10)
          </label>
          <textarea
            id="rules"
            value={rulesText}
            onChange={(event) => setRulesText(event.target.value)}
            rows={4}
            className="textarea"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={() => navigate('/')} className="btn-ghost text-sm">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary text-sm">
            {mutation.isPending && <Loader2 size={15} className="animate-spin" />}
            {mutation.isPending ? 'Creating…' : 'Create community'}
          </button>
        </div>
      </form>
    </div>
  );
}
