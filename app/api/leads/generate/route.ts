import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateMessage } from '@/lib/llm';
import { validateMessage } from '@/lib/guardrails';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const leadIds: string[] | undefined = body.leadIds;
    const batchSize: number = body.batchSize ?? 5;

    let query = supabase.from('closed_lost_leads').select('*');
    if (leadIds?.length) {
      query = query.in('id', leadIds);
    } else {
      query = query.eq('status', 'unprocessed').limit(batchSize);
    }

    const { data: leads, error: leadsError } = await query;
    if (leadsError) throw leadsError;
    if (!leads?.length) {
      return NextResponse.json({ message: 'No leads to process', results: [] });
    }

    const results = await Promise.allSettled(
      leads.map(async (lead) => {
        const draft = await generateMessage(lead);
        const validation = validateMessage(draft);

        const messageStatus = validation.valid ? 'pending_review' : 'flagged_for_manual';
        const leadStatus = validation.valid ? 'draft_ready' : 'needs_manual';

        const { data: saved, error: saveError } = await supabase
          .from('generated_messages')
          .insert({
            lead_id: lead.id,
            channel: draft.channel,
            subject: draft.subject,
            body: draft.body,
            ai_confidence: draft.confidence,
            ai_reasoning: draft.reasoning,
            ai_model: draft.model,
            ai_cost_usd: draft.cost_usd,
            status: messageStatus,
          })
          .select()
          .single();

        if (saveError) throw saveError;

        await supabase
          .from('closed_lost_leads')
          .update({ status: leadStatus })
          .eq('id', lead.id);

        return {
          lead_id: lead.id,
          message_id: saved.id,
          confidence: draft.confidence,
          cost_usd: draft.cost_usd,
          validation,
        };
      })
    );

    const summary = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { lead_id: leads[i].id, error: (r.reason as Error).message }
    );

    return NextResponse.json({ results: summary, processed: leads.length });
  } catch (err) {
    console.error('generate error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
} 
