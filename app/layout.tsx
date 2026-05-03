import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const { data: pending } = await supabase
    .from('generated_messages')
    .select('id, channel, body, ai_confidence, ai_reasoning, status, closed_lost_leads(name, project_type, estimated_value)')
    .in('status', ['pending_review', 'flagged_for_manual'])
    .order('ai_confidence', { ascending: false });

  const { data: sent } = await supabase
    .from('generated_messages')
    .select('id, sent_at, closed_lost_leads(name)')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(10);

  const { count: totalLeads } = await supabase
    .from('closed_lost_leads')
    .select('*', { count: 'exact', head: true });

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Greenscape Pro — Re-engagement Queue</h1>
        <p className="text-gray-600 mt-1">
          AI-drafted messages awaiting Marcus's review. {totalLeads ?? 0} total leads in system.
        </p>
      </header>

      <div className="flex gap-3">
        <form action="/api/seed" method="POST">
          <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm">
            Seed sample leads
          </button>
        </form>
        <form action="/api/leads/generate" method="POST">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            Generate next batch (5)
          </button>
        </form>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Pending review ({pending?.length ?? 0})
        </h2>
        {!pending?.length && (
          <p className="text-sm text-gray-500">Nothing pending. Generate a batch to start.</p>
        )}
        <div className="space-y-2">
          {pending?.map((m: any) => (
            <Link
              key={m.id}
              href={`/messages/${m.id}`}
              className="block border rounded p-4 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{m.closed_lost_leads.name}</div>
                  <div className="text-sm text-gray-600">
                    {m.closed_lost_leads.project_type} · ${m.closed_lost_leads.estimated_value?.toLocaleString()}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div
                    className={`text-sm font-medium ${
                      m.ai_confidence >= 0.7 ? 'text-green-700' : 'text-amber-700'
                    }`}
                  >
                    {(m.ai_confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase">{m.channel}</div>
                  {m.status === 'flagged_for_manual' && (
                    <div className="text-xs text-red-600 mt-1">flagged</div>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-700 line-clamp-2">{m.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recently sent</h2>
        {!sent?.length && <p className="text-sm text-gray-500">No sends yet.</p>}
        <ul className="space-y-1 text-sm text-gray-600">
          {sent?.map((m: any) => (
            <li key={m.id}>
              ✓ {m.closed_lost_leads.name} · {new Date(m.sent_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
