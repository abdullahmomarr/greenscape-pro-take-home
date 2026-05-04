'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Action = 'seed' | 'generate' | 'reset';

export default function ActionButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);

  async function run(endpoint: string, key: Action, confirmMessage?: string) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setLoading(key);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error ?? res.statusText}`);
      }
    } catch (err) {
      alert(`Network error: ${(err as Error).message}`);
    } finally {
      setLoading(null);
      router.refresh();
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => run('/api/seed', 'seed')}
        disabled={loading !== null}
        className="px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'seed' ? 'Seeding…' : 'Seed sample leads'}
      </button>
      <button
        onClick={() => run('/api/leads/generate', 'generate')}
        disabled={loading !== null}
        className="px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'generate' ? 'Generating… (~20s)' : 'Generate next batch'}
      </button>

      <div className="flex-1" />

      <button
        onClick={() =>
          run(
            '/api/reset',
            'reset',
            'Reset all demo data? This wipes leads, drafts, and send logs.',
          )
        }
        disabled={loading !== null}
        className="px-3 py-2 text-stone-500 hover:text-rose-700 text-xs font-medium transition disabled:opacity-50"
      >
        {loading === 'reset' ? 'Resetting…' : 'Reset demo'}
      </button>
    </section>
  );
}
