import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason: string = body.reason ?? 'no reason given';

  const { data: msg, error } = await supabase
    .from('generated_messages')
    .update({ status: 'rejected', rejected_reason: reason })
    .eq('id', id)
    .select('lead_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from('closed_lost_leads')
    .update({ status: 'rejected' })
    .eq('lead_id', msg.lead_id);

  return NextResponse.json({ success: true });
}
