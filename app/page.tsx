import Link from 'next/link';
import ActionButtons from './_components/ActionButtons';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function confidenceTone(c: number) {
  if (c >= 0.85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (c >= 0.7) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

export default async function Dashboard() {
  const [pendingRes, sentRes, leadsRes, statsRes] = await Promise.all([
    supabase
      .from('generated_messages')
      .select('id, channel, body, ai_confidence, ai_reasoning, status, closed_lost_leads(name, project_type, estimated_value)')
      .in('status', ['pending_review', 'flagged_for_manual'])
      .order('ai_confidence', { ascending: false }),
    supabase
      .from('generated_messages')
      .select('id, sent_at, closed_lost_leads(name)')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(8),
    supabase
      .from('closed_lost_leads')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('generated_messages')
      .select('status, ai_cost_usd'),
  ]);

  const pending = pendingRes.data ?? [];
  const sent = sentRes.data ?? [];
  const totalLeads = leadsRes.count ?? 0;
  const stats = statsRes.data ?? [];
  const sentCount = stats.filter((s: any) => s.status === 'sent').length;
  const totalCost = stats.reduce((sum: number, s: any) => sum + (s.ai_cost_usd ?? 0), 0);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500">Greenscape Pro</div>
            <h1 className="text-lg font-semibold text-stone-900">Re-engagement Queue</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-stone-600">
              <span className="font-semibold text-stone-900">{totalLeads}</span> leads
            </div>
            <div className="text-stone-600">
              <span className="font-semibold text-stone-900">{pending.length}</span> pending
            </div>
            <div className="text-stone-600">
              <span className="font-semibold text-stone-900">{sentCount}</span> sent
            </div>
            <div className="text-stone-600 hidden sm:block">
              <span className="font-semibold text-stone-900">${totalCost.toFixed(4)}</span> AI cost
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <ActionButtons />

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-semibold text-stone-900">
              Pending review
            </h2>
            <span className="text-sm text-stone-500">
              {pending.length} {pending.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          {!pending.length ? (
            <div className="border border-dashed border-stone-300 rounded-lg p-8 text-center">
              <p className="text-sm text-stone-600">
                Nothing pending. Generate a batch to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/messages/${m.id}`}
                  className="block bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-400 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-stone-900">
                          {m.closed_lost_leads?.name ?? 'Unknown lead'}
                        </span>
                        {m.status === 'flagged_for_manual' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            flagged
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500">
                        {m.closed_lost_leads?.project_type ?? '—'}
                        {m.closed_lost_leads?.estimated_value
                          ? ` · $${m.closed_lost_leads.estimated_value.toLocaleString()}`
                          : ''}
                      </div>
                      <p className="mt-2 text-sm text-stone-700 line-clamp-2">
                        {m.body}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${confidenceTone(
                          m.ai_confidence,
                        )}`}
                      >
                        {(m.ai_confidence * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs uppercase tracking-wider text-stone-400">
                        {m.channel}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900 mb-4">Recently sent</h2>
          {!sent.length ? (
            <p className="text-sm text-stone-500">No sends yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {sent.map((m: any) => (
                <li key={m.id} className="flex items-center gap-2 text-stone-600">
                  <span className="text-emerald-600">✓</span>
                  <span className="text-stone-900">{m.closed_lost_leads?.name ?? 'Unknown'}</span>
                  <span className="text-stone-400">·</span>
                  <span className="text-stone-500">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString() : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pt-6 text-xs text-stone-400 border-t border-stone-200">
          Marcus reviews. Agent drafts. Nothing sends without sign-off.
        </footer>
      </main>
    </div>
  );
}
