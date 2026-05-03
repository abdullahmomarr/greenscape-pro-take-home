import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { validateMessage } from '@/lib/guardrails';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const editedBody: string | undefined = body.editedBody;
    const editedSubject: string | undefined = body.editedSubject;

    const { data: msg, error: msgErr } = await supabase
      .from('generated_messages')
      .select('*, closed_lost_leads(*)')
      .eq('id', params.id)
      .single();

    if (msgErr) throw msgErr;
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (msg.status === 'sent') {
      return NextResponse.json({ error: 'Already sent' }, { status: 400 });
    }

    const finalBody = editedBody ?? msg.body;
    const finalSubject = editedSubject ?? msg.subject;
    const wasEdited = editedBody !== undefined && editedBody !== msg.body;

    // Re-validate edited content (Marcus could paste in something bad)
    const validation = validateMessage({
      body: finalBody,
      subject: finalSubject,
      channel: msg.channel,
      confidence: msg.ai_confidence,
    });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed on edited message', details: validation.errors },
        { status: 400 }
      );
    }

    if (msg.channel !== 'email') {
      return NextResponse.json(
        { error: 'Only email channel supported in v1' },
        { status: 400 }
      );
    }

    const lead = msg.closed_lost_leads;
    if (!lead?.email) {
      return NextResponse.json({ error: 'Lead has no email on file' }, { status: 400 });
    }

    const sendResult = await sendEmail(lead.email, finalSubject ?? '(no subject)', finalBody);

    if (sendResult.error) {
      await supabase.from('send_log').insert({
        message_id: params.id,
        recipient: lead.email,
        channel: 'email',
        external_id: null,
        status: 'failed',
        payload: { error: sendResult.error },
      });
      await supabase
        .from('generated_messages')
        .update({ send_error: JSON.stringify(sendResult.error) })
        .eq('id', params.id);
      return NextResponse.json({ error: 'Send failed', details: sendResult.error }, { status: 502 });
    }

    const now = new Date().toISOString();
    await supabase
      .from('generated_messages')
      .update({
        status: 'sent',
        body: finalBody,
        subject: finalSubject,
        marcus_edits: wasEdited ? msg.body : null,
        approved_at: now,
        sent_at: now,
      })
      .eq('id', params.id);

    await supabase.from('closed_lost_leads').update({ status: 'sent' }).eq('id', lead.id);

    await supabase.from('send_log').insert({
      message_id: params.id,
      recipient: lead.email,
      channel: 'email',
      external_id: sendResult.data?.id ?? null,
      status: 'sent',
      payload: sendResult,
    });

    return NextResponse.json({ success: true, externalId: sendResult.data?.id });
  } catch (err) {
    console.error('approve error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
