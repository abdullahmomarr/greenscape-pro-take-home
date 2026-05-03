import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SAMPLE_LEADS = [
  {
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell+test@example.com',
    phone: '+16025551001',
    project_type: 'patio + pergola',
    estimated_value: 35000,
    last_touch_date: '2024-04-12',
    notes: 'Wanted Spanish-tile patio with cedar pergola off the master bedroom. Husband lost his job in May, paused project. Liked our portfolio, said we felt like the right fit.',
    source: 'Meta',
  },
  {
    name: 'David Chen',
    email: 'david.chen+test@example.com',
    phone: null,
    project_type: 'pool surround + outdoor kitchen',
    estimated_value: 85000,
    last_touch_date: '2024-09-03',
    notes: 'Got 3 quotes. We were second on price. Went with Desert Stone. Said our design was "miles ahead" but Desert Stone could start 3 weeks sooner.',
    source: 'Google LSA',
  },
  {
    name: 'Linda Garcia',
    email: 'linda.garcia+test@example.com',
    phone: '+16025551003',
    project_type: 'artificial turf + irrigation',
    estimated_value: 12000,
    last_touch_date: '2025-02-18',
    notes: 'Site walk happened. Loved the proposal. Said she would talk it over with husband and get back to us. Ghosted. Followed up twice in March, no reply.',
    source: 'Meta',
  },
  {
    name: 'Robert Kim',
    email: 'robert.kim+test@example.com',
    phone: null,
    project_type: 'fire pit + seating wall',
    estimated_value: 18000,
    last_touch_date: '2024-11-22',
    notes: 'Tire kicker. Wanted ballpark pricing without site walk. Pushed for $5K all-in for what we quoted at $18K. Not our customer.',
    source: 'Meta',
  },
  {
    name: 'Jessica Patel',
    email: 'jessica.patel+test@example.com',
    phone: '+16025551005',
    project_type: 'water feature + retaining wall',
    estimated_value: 42000,
    last_touch_date: '2024-07-05',
    notes: 'HOA initially denied her water feature design. We offered to redesign for free. She said she would check back after the fall HOA meeting. Never did.',
    source: 'referral',
  },
  {
    name: 'Michael O\'Brien',
    email: 'mobrien+test@example.com',
    phone: '+16025551006',
    project_type: 'full backyard renovation',
    estimated_value: 120000,
    last_touch_date: '2025-01-08',
    notes: 'Site walk went well. Wife wanted more design iterations than we typically do at proposal stage. We sent a render but they cooled off. Big project, real budget, real interest.',
    source: 'Google LSA',
  },
  {
    name: 'Amanda Foster',
    email: 'amanda.foster+test@example.com',
    phone: null,
    project_type: 'patio expansion + outdoor lighting',
    estimated_value: 22000,
    last_touch_date: '2024-08-30',
    notes: 'Wanted to wait until after summer monsoon season to start. Said she would call us in October. Never called.',
    source: 'Meta',
  },
];

export async function POST() {
  // Wipe existing seed data (idempotent)
  await supabase.from('send_log').delete().not('id', 'is', null);
  await supabase.from('generated_messages').delete().not('id', 'is', null);
  await supabase.from('closed_lost_leads').delete().not('id', 'is', null);

  const { data, error } = await supabase
    .from('closed_lost_leads')
    .insert(SAMPLE_LEADS.map((l) => ({ ...l, status: 'unprocessed' })))
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0 });
}
