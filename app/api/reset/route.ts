import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Demo-only reset endpoint. Wipes all three tables so the demo can be re-run.
// NOT included in any production scope — would be removed before real deployment.
export async function POST() {
  try {
    await supabase.from('send_log').delete().not('id', 'is', null);
    await supabase.from('generated_messages').delete().not('id', 'is', null);
    await supabase.from('closed_lost_leads').delete().not('id', 'is', null);
    return NextResponse.json({ reset: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
