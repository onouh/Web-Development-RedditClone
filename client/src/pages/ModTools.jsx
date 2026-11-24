import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Check, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import { useCommunity } from '../hooks/useCommunity.js';
import { useToast } from '../context/ToastContext.jsx';

const SEVERITY_STYLES = {
  high: 'bg-accent/15 text-accent',
  medium: 'bg-amber-500/15 text-amber-500',
  low: 'bg-chip text-muted',
};

const ACTION_STYLES = {
  approve: 'bg-green-500/15 text-green-500',
  review: 'bg-amber-500/15 text-amber-500',
  remove: 'bg-accent/15 text-accent',
};

function CheckResult({ result }) {
  if (!result) return null;
  return (
    <div className="mt-2 rounded-lg border border-line bg-page p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={14} className="text-accent" />
        <span className={`chip ${ACTION_STYLES[result.suggestedAction] || 'bg-chip text-muted'}`}>
          Suggested: {result.suggestedAction}
        </span>
        <span className="text-[11px] text-muted">{result.source === 'ai' ? 'AI analysis' : 'Heuristic check'}</span>
      </div>
      {result.violations?.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {result.violations.map((violation) => (
            <li key={`${violation.rule}-${violation.explanation}`} className="text-sm">
              <span className={`chip mr-1.5 ${SEVERITY_STYLES[violation.severity] || 'bg-chip text-muted'}`}>
                {violation.severity}
              </span>
              <strong>{violation.rule}</strong>
              <p className="mt-0.5 text-xs text-muted">{violation.explanation}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-muted">No obvious rule violations found. Your judgement decides.</p>
      )}
      {result.removalReason && (
        <p className="mt-2 rounded bg-chip px-2 py-1 text-xs">
          <span className="font-semibold">Suggested removal reason: </span>
          {result.removalReason}
        </p>
      )}
      {result.note && <p className="mt-1 text-xs text-muted">{result.note}</p>}
    </div>
  );
}

export default function ModTools() {
  const { name } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: communityData, isLoading } = useCommunity(name);
  const [draft, setDraft] = useState('');
  const [checks, setChecks] = useState({});

  const reportsQuery = useQuery({
    queryKey: ['reports', name],
    queryFn: () => api(`/communities/${name}/reports`),
    enabled: Boolean(communityData?.community?.isModerator),
  });

  const check = useMutation({
    mutationFn: ({ content }) => api('/ai/mod-check', { method: 'POST', body: { communityName: name, content } }),
    onSuccess: (data, variables) => setChecks((current) => ({ ...current, [variables.key]: data })),
    onError: (error) => toast.error(error.message),
  });

  const resolve = useMutation({
    mutationFn: ({ id, status }) =>
      api(`/communities/${name}/reports/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      toast.success('Report updated');
      queryClient.invalidateQueries({ queryKey: ['reports', name] });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={26} className="animate-spin text-muted" />
      </div>
    );
  }

  const community = communityData?.community;
  if (!community?.isModerator) {
    return (
      <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
        <ShieldCheck size={30} className="mx-auto text-muted" />
        <h1 className="mt-3 text-xl font-bold">Moderators only</h1>
        <p className="mt-2 text-sm text-muted">You do not moderate r/{name}.</p>
        <Link to={`/r/${name}`} className="btn-primary mt-5 text-sm">
          Back to community
        </Link>
      </div>
    );
  }

  const reports = reportsQuery.data?.items || [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-xl font-bold">Mod tools</h1>
          <p className="text-sm text-muted">
            r/{name} · {reports.length} open report{reports.length === 1 ? '' : 's'} · AI is advisory only
          </p>
        </div>
        <Link to={`/r/${name}`} className="btn-outline ml-auto text-xs">
          Back to community
        </Link>
      </div>

      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles size={15} className="text-accent" /> Rule-check a draft
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Paste a post or comment to see how it scores against this community’s written rules.
        </p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          className="textarea mt-2"
          placeholder="Paste content here…"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => check.mutate({ key: 'draft', content: draft })}
            disabled={draft.trim().length < 10 || check.isPending}
            className="btn-primary text-xs"
          >
            {check.isPending && <Loader2 size={14} className="animate-spin" />}
            Check against rules
          </button>
        </div>
        <CheckResult result={checks.draft} />
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold">Report queue</h2>

        {reportsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : reports.length === 0 ? (
          <div className="card flex flex-col items-center p-8 text-center">
            <Check size={26} className="text-green-500" />
            <p className="mt-2 font-semibold">Queue is clear</p>
            <p className="text-sm text-muted">No open reports right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const content = report.content;
              const text = content?.title ? `${content.title}\n\n${content.body || ''}` : content?.body || '';
              return (
                <article key={report.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <AlertTriangle size={14} className="text-accent" />
                    <span className="font-semibold text-ink">{report.reason}</span>
                    <span>·</span>
                    <span>
                      reported by u/{report.reporter?.username || 'unknown'} · {timeAgo(report.createdAt)}
                    </span>
                    <span className="chip ml-auto bg-chip text-muted">{report.targetType}</span>
                  </div>

                  <div className="mt-2 rounded-lg border border-line bg-page p-3">
                    {content ? (
                      <>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Avatar name={content.author?.username || 'deleted'} src={content.author?.avatarUrl} size={20} />
                          u/{content.author?.username || 'deleted'}
                          <span>·</span>
                          <span>{timeAgo(content.createdAt)}</span>
                        </div>
                        {content.title && <p className="mt-1 font-semibold">{content.title}</p>}
                        <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm">{content.body}</p>
                        {content.type === 'link' && content.linkUrl && (
                          <a href={content.linkUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-blue-400">
                            {content.linkUrl}
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted">Content was deleted before review.</p>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => check.mutate({ key: report.id, content: text })}
                      disabled={!text || check.isPending}
                      className="btn-secondary text-xs"
                    >
                      <Sparkles size={14} /> AI rule check
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve.mutate({ id: report.id, status: 'dismissed' })}
                      className="btn-ghost text-xs"
                    >
                      <X size={14} /> Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve.mutate({ id: report.id, status: 'resolved' })}
                      className="btn-outline ml-auto text-xs"
                    >
                      <Check size={14} /> Mark resolved
                    </button>
                  </div>

                  <CheckResult result={checks[report.id]} />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
