import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bold, Image as ImageIcon, Italic, Link2, Loader2, Upload } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { api, mediaUrl as resolveMediaUrl, uploadImage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useCommunity } from '../hooks/useCommunity.js';

export default function CreatePost() {
  const { name: routeName } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [communityName, setCommunityName] = useState(routeName || '');
  const [type, setType] = useState('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [flairLabel, setFlairLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  const communitiesQuery = useQuery({
    queryKey: ['communities', 'all'],
    queryFn: () => api('/communities?limit=50'),
    staleTime: 60_000,
  });

  const communityQuery = useCommunity(communityName);
  const community = communityQuery.data?.community;

  useEffect(() => {
    if (routeName) setCommunityName(routeName);
  }, [routeName]);

  useEffect(() => {
    setFlairLabel('');
  }, [communityName]);

  const mutation = useMutation({
    mutationFn: () =>
      api(`/communities/${communityName}/posts`, {
        method: 'POST',
        body: {
          title: title.trim(),
          type,
          body,
          linkUrl: type === 'link' ? linkUrl.trim() : '',
          mediaUrl: type === 'image' ? mediaUrl : '',
          flair: flairLabel
            ? {
                label: flairLabel,
                color: community?.flairs?.find((flair) => flair.label === flairLabel)?.color || '#FF4500',
              }
            : undefined,
        },
      }),
    onSuccess: (data) => {
      toast.success('Post published');
      navigate(`/r/${communityName}/comments/${data.post.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const insertMarkdown = (before, after = '') => {
    setBody((current) => `${current}${before}text${after}`);
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      setMediaUrl(result.url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!communityName) return toast.error('Choose a community first');
    if (title.trim().length < 3) return toast.error('Title must be at least 3 characters');
    if (type === 'link' && !linkUrl.trim()) return toast.error('Add a link URL');
    if (type === 'image' && !mediaUrl) return toast.error('Upload an image or paste an image URL');
    if (type === 'text' && !body.trim()) return toast.error('Write something in the body');
    return mutation.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-3 text-xl font-bold">Create a post</h1>

      <form onSubmit={submit} className="card p-4">
        <div>
          <label htmlFor="community" className="mb-1 block text-xs font-semibold text-muted">
            Community
          </label>
          <div className="relative">
            <select
              id="community"
              value={communityName}
              onChange={(event) => setCommunityName(event.target.value)}
              className="input appearance-none rounded-lg pr-9"
              required
            >
              <option value="">Choose a community</option>
              {communitiesQuery.data?.items?.map((item) => (
                <option key={item.name} value={item.name}>
                  r/{item.name}
                </option>
              ))}
            </select>
            {community && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <Avatar name={community.name} src={community.iconUrl} size={24} square />
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-1 rounded-full border border-line p-1 text-xs font-semibold">
          {[
            ['text', 'Text'],
            ['image', 'Images'],
            ['link', 'Link'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                type === value ? 'bg-chip text-ink' : 'text-muted hover:bg-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="title" className="mb-1 block text-xs font-semibold text-muted">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={300}
            required
            placeholder="An interesting title"
            className="input rounded-lg text-base font-medium"
          />
          <p className="mt-1 text-right text-[11px] text-muted">{title.length}/300</p>
        </div>

        {type === 'text' && (
          <div className="mt-3">
            <label htmlFor="body" className="mb-1 block text-xs font-semibold text-muted">
              Body
            </label>
            <div className="mb-1.5 flex items-center gap-1">
              <button type="button" onClick={() => insertMarkdown('**', '**')} className="icon-btn h-8 w-8" aria-label="Bold">
                <Bold size={15} />
              </button>
              <button type="button" onClick={() => insertMarkdown('*', '*')} className="icon-btn h-8 w-8" aria-label="Italic">
                <Italic size={15} />
              </button>
              <button type="button" onClick={() => insertMarkdown('[', '](https://)')} className="icon-btn h-8 w-8" aria-label="Link">
                <Link2 size={15} />
              </button>
              <span className="ml-1 text-[11px] text-muted">Markdown supported</span>
            </div>
            <textarea
              id="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              maxLength={40000}
              placeholder="Share your thoughts…"
              className="textarea"
            />
          </div>
        )}

        {type === 'link' && (
          <div className="mt-3">
            <label htmlFor="link" className="mb-1 block text-xs font-semibold text-muted">
              URL
            </label>
            <input
              id="link"
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com/article"
              className="input rounded-lg"
            />
          </div>
        )}

        {type === 'image' && (
          <div className="mt-3 space-y-2">
            <span className="block text-xs font-semibold text-muted">Image</span>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-page px-4 py-8 text-sm text-muted hover:border-accent">
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              {uploading ? 'Uploading…' : 'Drag & drop or click to upload (PNG, JPG, WebP, GIF · max 5MB)'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => upload(event.target.files?.[0])}
              />
            </label>
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-muted" />
              <input
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="…or paste an image URL"
                className="input rounded-lg text-xs"
              />
            </div>
            {mediaUrl && (
              <img
                src={resolveMediaUrl(mediaUrl)}
                alt="Preview"
                className="max-h-64 w-full rounded-lg object-cover"
              />
            )}
          </div>
        )}

        {community?.flairs?.length > 0 && (
          <div className="mt-4">
            <label htmlFor="flair" className="mb-1 block text-xs font-semibold text-muted">
              Flair
            </label>
            <select
              id="flair"
              value={flairLabel}
              onChange={(event) => setFlairLabel(event.target.value)}
              className="input rounded-lg"
            >
              <option value="">No flair</option>
              {community.flairs.map((flair) => (
                <option key={flair.label} value={flair.label}>
                  {flair.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">
          <Link to={communityName ? `/r/${communityName}` : '/'} className="btn-ghost text-sm">
            Cancel
          </Link>
          <button type="submit" disabled={mutation.isPending} className="btn-primary text-sm">
            {mutation.isPending && <Loader2 size={15} className="animate-spin" />}
            {mutation.isPending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
