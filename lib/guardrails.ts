import { Channel } from './types';

export const FORBIDDEN_PHRASES = [
  'hope this finds you well',
  'reaching out to',
  'valued customer',
  'exciting offer',
  'limited time',
  'act now',
  'click here',
  'special promotion',
  'don\'t miss out',
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMessage(msg: {
  body: string;
  subject?: string | null;
  channel: Channel;
  confidence: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Length checks per channel
  if (msg.channel === 'sms' && msg.body.length > 320) {
    errors.push(`SMS too long (${msg.body.length} chars; >320 = 2+ segments)`);
  }
  if (msg.channel === 'email' && msg.body.length > 1200) {
    warnings.push(`Email longer than recommended (${msg.body.length} chars)`);
  }
  if (msg.body.length < 40) {
    errors.push(`Message too short (${msg.body.length} chars)`);
  }

  // Forbidden phrases
  const lower = msg.body.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      errors.push(`Contains forbidden phrase: "${phrase}"`);
    }
  }

  // Exclamation count (Marcus uses 0-1, not more)
  const exclamations = (msg.body.match(/!/g) ?? []).length;
  if (exclamations > 1) {
    warnings.push(`${exclamations} exclamation marks (sounds salesy)`);
  }

  // Confidence threshold
  if (msg.confidence < 0.5) {
    errors.push(`Confidence ${msg.confidence.toFixed(2)} below 0.5 — flag for manual handling`);
  } else if (msg.confidence < 0.7) {
    warnings.push(`Confidence ${msg.confidence.toFixed(2)} below high-trust threshold`);
  }

  // Email-specific
  if (msg.channel === 'email') {
    if (!msg.subject) {
      errors.push('Email channel requires a subject line');
    } else if (msg.subject.length > 60) {
      warnings.push(`Subject ${msg.subject.length} chars (may truncate in inbox preview)`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
