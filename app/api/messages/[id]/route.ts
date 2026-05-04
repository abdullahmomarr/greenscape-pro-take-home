import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('generated_messages')
    .select('*, closed_lost_leads(*)')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
