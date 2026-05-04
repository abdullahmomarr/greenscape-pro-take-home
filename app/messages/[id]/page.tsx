'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

function confidenceTone(c: number) {
  if (c >= 0.85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (c >= 0.7) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

export default function MessageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [msg, setMsg] = useState<any>(null);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/messages/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setMsg(d);
        setBody(d.body ?? '');
        setSubject(d.subject ?? '');
      });
  }, [id]);

  if (!msg) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <p className="text-sm text-rose-700">Error: {msg.error}</p>
      </div>
    );
  }

  async function approve() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/messages/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedBody: body, editedSubject: subject }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(JSON.stringify(data, null, 2));
      setSubmitting(false);
      return;
    }
    router.push('/');
  }

  async function reject() {
    const reason = prompt('Reason for rejection?');
    if (!reason) return;
    setSubmitting(true);
    await fetch(`/api/messages/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    router.push('/');
  }

  const lead = msg.closed_lost_leads;
  const confidencePct = (msg.ai_confidence * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-sm text-stone-600 hover:text-stone-900 transition"
          >
            ← Queue
          </a>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full border ${confidenceTone(
              msg.ai_confidence,
            )}`}
          >
            {confidencePct}% confidence
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <header>
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
            Lead
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">{lead?.name}</h1>
          <div className="text-sm text-stone-600 mt-1">
            {lead?.project_type ?? '—'}
            {lead?.estimated_value
              ? ` · $${lead.estimated_value.toLocaleString()}`
              : ''}
            {lead?.last_touch_date ? ` · last touch ${lead.last_touch_date}` : ''}
          </div>
        </header>

        <section className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
            Lead notes
          </div>
          <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
            {lead?.notes ?? '(no notes)'}
          </p>
        </section>

        <section className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-emerald-700 mb-2">
            AI reasoning
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">
            {msg.ai_reasoning}
          </p>
          <div className="mt-3 text-xs text-stone-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>Model: {msg.ai_model}</span>
            <span>Cost: ${msg.ai_cost_usd?.toFixed(4)}</span>
            <span>Channel: {msg.channel?.toUpperCase()}</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-stone-500">
            Draft message
          </div>

          {msg.channel === 'email' && (
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              className="w-full bg-white border border-stone-300 rounded-md px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <div className="text-xs text-stone-400 mt-1">
              {body.length} characters
            </div>
          </div>
        </section>

        {error && (
          <pre className="bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-700 whitespace-pre-wrap">
            {error}
          </pre>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={approve}
            disabled={submitting}
            className="px-5 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending…' : 'Approve & Send'}
          </button>
          <button
            onClick={reject}
            disabled={submitting}
            className="px-5 py-2 bg-white border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject
          </button>
        </div>
      </main>
    </div>
  );
}
