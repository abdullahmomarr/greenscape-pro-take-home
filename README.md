# Greenscape Pro — Closed-Lost Re-engagement Agent

Built for the License & Scale take-home. P0 from the strategy doc — an agent that mines dormant leads, drafts personalized re-engagement messages in the founder's voice, and routes them through a human approval gate before sending.

**Live demo:** https://YOUR-VERCEL-URL.vercel.app
**Strategy doc:** [strategy.md](./strategy.md)

## What it does

Greenscape Pro has 1,400+ closed-lost leads in their CRM and only sporadic re-engagement attempts. At a 2% reactivation rate × $28K average project, that's ~$784K of latent revenue with the customer-acquisition cost already paid. This agent works that pile systematically.

The flow:

1. Lead context (name, project type, notes, last touch) flows in from Supabase
2. OpenAI gpt-4o-mini drafts a short personalized message in the founder's voice — referencing specific details from the lead's notes
3. Output is structured JSON with a confidence score and reasoning
4. Guardrails reject anything that uses spammy phrases, exceeds length limits, or scores below a confidence threshold
5. Drafts land in a review queue ranked by confidence
6. Marcus reviews, edits if needed, approves with one click
7. Approved messages send via Resend; every send is logged with the external message ID

## Stack

- Next.js 16 (App Router) on Vercel
- Supabase (Postgres) for persistence
- OpenAI gpt-4o-mini for message drafting
- Resend for email delivery
- TypeScript, Tailwind v4

## Why this stack — the trade-offs

**gpt-4o-mini, not gpt-4o.** ~12× cheaper at $0.15/$0.60 per million tokens, plenty smart for short personalized messages with structured JSON output. The whole 1,400-lead campaign costs under $1 in OpenAI spend.

**No agent runtime — bounded API routes instead.** I run agents.io on a long-lived OpenClaw runtime in production, so I know what that buys you and what it costs. For this use case, the orchestration is one call: "given this lead context, draft this message." A bounded API route is the right abstraction — easier to deploy, easier to debug, every state transition is observable in Postgres. Same agent patterns (tools-as-functions, structured output, confidence scoring, guardrails) without the runtime overhead.

**Email-only in v1.** SMS via Twilio adds cost, another integration, and another failure mode. Most closed-lost leads have email on file. Phase 2 adds SMS.

**Manual seed instead of a live GHL pull.** The brief is about the agent loop, not the integration. The seed endpoint stands in for what would be a scheduled GHL pull in production.

## Setup

1. Clone the repo, `npm install`
2. Copy `.env.example` to `.env.local`, fill in your keys
3. Run the SQL in `supabase/migrations/0001_initial_schema.sql` against your Supabase project (or paste it into the SQL editor)
4. `npm run dev`
5. Open localhost:3000, click "Seed sample leads", then "Generate next batch"

## Architecture
Lead row in Supabase
│
▼
POST /api/leads/generate
│  ┌──────────────────────────────────────┐
├──▶ OpenAI: system prompt + lead context │
│  │ → JSON draft + confidence + reasoning│
│  └──────────────────────────────────────┘
│
├──▶ Guardrails (forbidden phrases, length, confidence threshold)
│
▼
generated_messages row, status = pending_review
│
▼
Marcus reviews on /messages/[id], edits if needed
│
▼
POST /api/messages/[id]/approve
│  ├──▶ re-validates edited content
│  ├──▶ Resend → external send
│  └──▶ send_log row with Resend message ID
▼
generated_messages.status = sent

## Guardrails

Defined in `lib/guardrails.ts`:

- Forbidden phrases ("hope this finds you well", "limited time", "valued customer", etc.) — block the send
- Length checks: SMS ≤ 320 chars (1 segment), email gets a length warning over 1200
- Confidence threshold: < 0.5 = flagged for manual handling, 0.5–0.7 = warning, ≥ 0.7 = high trust
- Edits re-validate: even if Marcus edits the message before sending, the same rules re-apply
- Already-sent guard: cannot re-approve a message that's already been sent

## Cost per action

- Generation: ~$0.0002 per draft at gpt-4o-mini rates
- Send: free on Resend's free tier (3K/month)
- Storage: free on Supabase free tier
- Hosting: free on Vercel hobby tier

Whole demo runs at ~$0.001 in real cost.

## What I'd build next with another week

1. **Reply ingestion.** Webhook from Resend → parse reply → route to Brittany (the sales coordinator) via Slack with full lead context attached. Right now responses go nowhere.
2. **Schedule layer.** Replace the manual "Generate next batch" with a cron that drips 20 drafts a day. Marcus reviews on a steady cadence instead of seeing 1,400 at once.
3. **Voice samples ingestion.** Right now the system prompt approximates Marcus's voice. Better: ingest 50 of his actual past messages from GHL and use them as few-shot examples. Biggest quality lever I can think of.
4. **Unified approval inbox.** This is the portfolio-attention insight from the strategy doc. As we add agents 2–5, every draft routes to one queue, ranked by urgency and dollar value. "Five agents to babysit" becomes "ten minutes of executive review."
5. **GHL integration proper.** Replace the seed endpoint with a real GHL pull, and replace Resend with GHL's send so all comms stay logged in their CRM (per Jenna's "everything has to be in GHL or it doesn't get used").

## Trade-offs and limitations I know about

- Email-only — leads without email addresses are skipped silently (would queue for SMS in v2)
- The seed endpoint wipes existing data each call — fine for demo, would be removed in prod
- No reply tracking — sends go out but inbound replies aren't ingested yet
- Voice approximation lives in a system prompt, not few-shot examples — works but would tighten with real Marcus messages
- Confidence threshold (0.5) is hand-picked, not learned from real outcomes — would calibrate after first 100 sends
