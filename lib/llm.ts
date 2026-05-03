import OpenAI from 'openai';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import { ClosedLostLead, LLMResult } from './types';

if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// gpt-4o-mini pricing as of writing: $0.15 / $0.60 per million tokens
const PRICING = {
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
};

export async function generateMessage(lead: ClosedLostLead): Promise<LLMResult> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(lead) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse OpenAI JSON: ${content.slice(0, 200)}`);
  }

  // Validate required fields
  const required = ['body', 'channel', 'confidence', 'reasoning'];
  for (const field of required) {
    if (parsed[field] === undefined) {
      throw new Error(`LLM output missing required field: ${field}`);
    }
  }

  // Cost calculation
  const pricing = PRICING[model as keyof typeof PRICING] ?? PRICING['gpt-4o-mini'];
  const inputCost = (response.usage?.prompt_tokens ?? 0) * pricing.input;
  const outputCost = (response.usage?.completion_tokens ?? 0) * pricing.output;

  return {
    subject: parsed.subject ?? null,
    body: parsed.body,
    channel: parsed.channel,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    specific_details_referenced: parsed.specific_details_referenced ?? [],
    model,
    cost_usd: inputCost + outputCost,
  };
}
