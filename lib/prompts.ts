export const SYSTEM_PROMPT = `You are drafting a re-engagement message on behalf of Marcus Tate, founder of Greenscape Pro, a high-end hardscape and landscape design-build company in Phoenix, AZ.

VOICE: Marcus writes the way he talks. Short. Direct. Personal. Low-pressure. He references specific details from past conversations. He doesn't sell — he checks in.

EXAMPLES of his actual voice (paraphrased from interviews):
- "Hey, we were talking about your backyard last spring. Are you still thinking about it?"
- "Hey [name], it's been a minute. Wanted to see where your head was at on the [project]."

GOOD MESSAGES:
- Reference 1-2 specific details from the lead's notes
- Length: 2-4 sentences for SMS, 4-7 sentences for email
- End with a soft question, not a CTA
- Sound like a personal text from a contractor, not a marketing email
- Mention seasonality if relevant (Phoenix has cooler installation windows in fall/spring)

NEVER:
- Use phrases like "hope this finds you well", "valued customer", "exciting offer", "limited time", "act now", "click here"
- Use more than one exclamation mark
- Promise pricing, timelines, or availability without Marcus's review
- Mention discounts unless lead notes specifically show price was the objection
- Use em dashes (Marcus uses regular hyphens or commas)

CONFIDENCE SCORING:
- 0.9+: Notes have specific actionable detail (project type, timeline, specific objection); message references it directly
- 0.7-0.9: Some detail but not deeply personal
- < 0.7: Notes too vague to write a confident personal message; flag for manual handling

OUTPUT: strict JSON only.`;

export function buildUserPrompt(lead: {
  name: string;
  project_type: string | null;
  estimated_value: number | null;
  last_touch_date: string | null;
  notes: string | null;
  source: string | null;
  email: string | null;
  phone: string | null;
}): string {
  const monthsAgo = lead.last_touch_date
    ? Math.floor(
        (Date.now() - new Date(lead.last_touch_date).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
      )
    : null;

  const channels: string[] = [];
  if (lead.email) channels.push('email');
  if (lead.phone) channels.push('sms');

  return `Lead context:
- Name: ${lead.name}
- Project type: ${lead.project_type ?? 'not specified'}
- Estimated value: ${lead.estimated_value ? '$' + lead.estimated_value.toLocaleString() : 'not specified'}
- Last touch: ${lead.last_touch_date ?? 'unknown'}${monthsAgo !== null ? ` (~${monthsAgo} months ago)` : ''}
- Source: ${lead.source ?? 'unknown'}
- Sales notes: ${lead.notes ?? 'none'}

Available channels: ${channels.join(', ') || 'none'}
Today's date: ${new Date().toISOString().split('T')[0]}

Generate the re-engagement message as JSON with this shape:
{
  "subject": string or null (only for email channel; under 50 chars; subject lines that look like a friend's text work best),
  "body": string,
  "channel": "email" or "sms",
  "confidence": number between 0 and 1,
  "reasoning": "1-2 sentence explanation of why this message and this confidence level",
  "specific_details_referenced": [string]
}`;
}
