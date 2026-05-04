Greenscape Pro Re-engagement Agent

Take-home for License & Scale. The P0 from my strategy doc — closed-lost re-engagement.

**Live:** https://greenscape-pro-take-home.vercel.app
**Strategy:** [strategy.pdf](./strategy.pdf)

## What it does

Greenscape Pro has 1,400+ closed-lost leads sitting in their CRM doing nothing. At 2% reactivation × $28K average project, that's about $784K in recoverable revenue. CAC already paid.

This agent works the pile:

1. Pulls a lead's notes, project type, last touch date
2. Drafts a short message that sounds like Marcus, references something specific from the notes, ends with a soft check-in
3. Scores its own confidence and explains its reasoning
4. Lands in a review queue ranked by confidence
5. Marcus edits if he wants, hits approve
6. Resend sends it. Send is logged with the external message ID for audit.

Nothing leaves the system without Marcus signing off.

## Stack

Next.js 16 on Vercel. Supabase for the database. OpenAI gpt-4o-mini for drafting. Resend for email. TypeScript and Tailwind v4.

## Why this stack

**Why gpt-4o-mini.** It's about 12x cheaper than 4o and plenty smart for short personalized messages with structured JSON output. The whole 1,400-lead campaign costs under $1.

**Why no agent runtime.** I run agents.io on a long-lived OpenClaw runtime in production, so I know what that buys you and what it costs. For this use case, the orchestration is one call: given a lead, draft a message. A bounded API route is the right shape — easier to deploy, every state transition lives in Postgres, no runtime to babysit. Same agent patterns inside (structured output, confidence scoring, guardrails) without the deploy overhead.

**Why email-only in v1.** SMS adds Twilio cost, another integration, another failure mode. Most closed-lost leads have email. SMS is phase 2.

**Why a manual seed endpoint instead of a real GHL pull.** The brief is about the agent loop, not the integration. The seed endpoint stands in for what would be a scheduled GHL pull in production.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your keys
# paste supabase/migrations/0001_initial_schema.sql into the Supabase SQL editor
npm run dev
Then on localhost:3000, click Seed, click Generate, approve one.
Architecture
Supabase lead row
  │
  ▼
POST /api/leads/generate
  ├──▶ OpenAI: system prompt + lead context → JSON draft
  ├──▶ Guardrails: forbidden phrases, length, confidence floor
  ▼
generated_messages row, status = pending_review
  │
  ▼
Marcus reviews on /messages/[id]
  │
  ▼
POST /api/messages/[id]/approve
  ├──▶ re-validates edited content (Marcus might have pasted something bad)
  ├──▶ Resend → external send
  └──▶ send_log row captures the Resend message ID
  ▼
status = sent
Guardrails
In lib/guardrails.ts:

Forbidden phrases ("hope this finds you well", "limited time", "valued customer", a few others) block the send
SMS capped at 320 chars so it stays one segment, email gets a soft warning over 1200
Confidence under 0.5 flags for manual handling, 0.5 to 0.7 is a warning, 0.7+ is high trust
If Marcus edits the message before sending, the rules re-run on the edited version
Can't re-approve a message that's already sent

Cost per action
About $0.0002 per draft. Resend is free up to 3K/month, Supabase free, Vercel hobby free. Whole demo runs at fractions of a cent.
What I'd build next

Reply ingestion. Resend webhook → parse reply → route to Brittany via Slack with the lead context attached. Right now responses go nowhere.
Drip schedule. Cron that generates 20 drafts a day instead of "Generate next batch". Marcus reviews on a steady cadence instead of staring down 1,400 at once.
Real voice samples. The system prompt approximates Marcus. Better is to pull 50 of his actual past messages from GHL and use them as few-shot examples. Biggest quality lever left.
Unified approval inbox. From the strategy doc — as agents 2 through 5 ship, every draft routes to one queue, ranked. "Five agents to babysit" becomes "ten minutes of review."
GHL integration proper. Replace the seed with a real GHL pull, replace Resend with GHL's send. Per Jenna's note: everything has to live in GHL or nobody uses it.

What I'd flag if you cloned this

Email only. Leads without email get skipped, no fallback queue yet.
Seed endpoint wipes existing data on each call. Fine for demo, would obviously be removed.
No reply tracking yet.
Voice lives in the system prompt, not in few-shot examples. Works, would tighten with real samples.
Confidence floor of 0.5 is hand-picked. Would calibrate after the first 100 real sends.
