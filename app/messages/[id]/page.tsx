'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

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

  if (!msg) return <main className="p-6">Loading…</main>;
  if (msg.error) return <main className="p-6 text-red-600">Error: {msg.error}</main>;

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

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <a href="/" className="text-sm text-blue-600 hover:underline">← back to queue</a>
      </div>

      <header>
        <h1 className="text-xl font-bold">{lead?.name}</h1>
        <div className="text-sm text-gray-600 mt-1">
          {lead?.project_type} · ${lead?.estimated_value?.toLocaleString()} · last touch{' '}
          {lead?.last_touch_date}
        </div>
      </header>

      <section className="bg-gray-50 rounded p-4 text-sm">
        <div className="font-medium mb-1">Lead notes</div>
        <p className="text-gray-700 whitespace-pre-wrap">{lead?.notes}</p>
      </section>

      <section className="bg-blue-50 rounded p-4 text-sm">
        <div className="font-medium mb-1">AI reasoning ({(msg.ai_confidence * 100).toFixed(0)}% confidence)</div>
        <p className="text-gray-700">{msg.ai_reasoning}</p>
        <div className="mt-2 text-xs text-gray-500">
          Model: {msg.ai_model} · Cost: ${msg.ai_cost_usd?.toFixed(4)}
        </div>
      </section>

      {msg.channel === 'email' && (
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Message body ({msg.channel?.toUpperCase() ?? '?'})
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full border rounded px-3 py-2 font-mono text-sm"
        />
      </div>

      {error && (
        <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 whitespace-pre-wrap">
          {error}
        </pre>
      )}

      <div className="flex gap-3">
        <button
          onClick={approve}
          disabled={submitting}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Approve & Send'}
        </button>
        <button
          onClick={reject}
          disabled={submitting}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Reject
        </button>
      </div>
    </main>
  );
}
