// claudeApi.js — generates quiz questions grounded in the actual daf text
//
// Flow:
//   1. Fetch the English translation of the daf from Sefaria API
//   2. Pass the text to Claude so questions are based on real content
//   3. Fall back to knowledge-based questions if Sefaria is unavailable

import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } from '../config';

// ---------------------------------------------------------------------------
// Step 1 — fetch daf text from Sefaria
// ---------------------------------------------------------------------------

async function fetchDafText(dafRef) {
  try {
    // "Chullin 3a" → "Chullin.3a"
    const sefariaRef = dafRef.trim().replace(/ /g, '.');
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(sefariaRef)}?lang=en&context=0`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const flat = flattenTextArray(data.text ?? '');
    const clean = flat.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Cap at ~3500 chars to keep the prompt reasonable in size
    return clean.length > 0 ? clean.slice(0, 3500) : null;

  } catch (err) {
    console.warn('[claudeApi] Sefaria text fetch failed:', err.message);
    return null;
  }
}

function flattenTextArray(val) {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.flat(Infinity).filter(x => typeof x === 'string').join(' ');
  return '';
}

// ---------------------------------------------------------------------------
// Step 2 — generate quiz with Claude
// ---------------------------------------------------------------------------

export async function generateQuizQuestions(dafRef, dafDisplayEn, difficulty) {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    throw new Error('API_KEY_MISSING');
  }

  const dafText = await fetchDafText(dafRef);

  const difficultyGuide = {
    easy:   'basic recall: who said what, key stories, and famous phrases',
    medium: 'comprehension of the main halachic discussions and machloket positions',
    hard:   'deep analysis: comparing opinions, underlying logic, and practical implications',
  }[difficulty];

  const textSection = dafText
    ? `\n\nHere is the actual English translation of ${dafRef}:\n"""\n${dafText}\n"""\n\nCRITICAL: Every one of the 5 questions MUST be based on the specific content of the text above. Do not ask about things not mentioned in this text.`
    : `\n\n(The daf text could not be retrieved. Use your knowledge of ${dafRef} as carefully as possible.)`;

  const prompt = `You are an expert Talmud teacher creating a quiz for a student who just finished studying ${dafRef} (${dafDisplayEn}).${textSection}

Create exactly 5 multiple-choice questions at difficulty level: ${difficulty.toUpperCase()}.
Focus on: ${difficultyGuide}.

Respond with ONLY a valid JSON object, no markdown fences, no explanation outside the JSON.

JSON structure:
{
  "questions": [
    {
      "questionEn": "Question text in English",
      "questionHe": "טקסט השאלה בעברית",
      "options":   ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "optionsHe": ["א. אפשרות ראשונה", "ב. אפשרות שנייה", "ג. אפשרות שלישית", "ד. אפשרות רביעית"],
      "answer": "A",
      "explanationEn": "Brief explanation of why A is correct (1-2 sentences)",
      "explanationHe": "הסבר קצר מדוע א נכונה (משפט-שניים)"
    }
  ]
}

Rules:
- All 5 questions must have exactly 4 options (A/B/C/D x alef/bet/gimel/dalet)
- The "answer" field is a single letter: A, B, C, or D
- Hebrew text should be natural Israeli Hebrew, not transliteration`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      ANTHROPIC_MODEL,
      max_tokens: 2500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Anthropic API error: ${msg}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text ?? '';

  // Try to extract the JSON object even if the model adds preamble/explanation
  let jsonString = null;
  const braceStart = rawText.indexOf('{');
  const braceEnd   = rawText.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    jsonString = rawText.slice(braceStart, braceEnd + 1);
  }
  // Fallback: strip markdown fences
  if (!jsonString) {
    jsonString = rawText.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim();
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('Unexpected JSON shape');
    }
    return parsed.questions;
  } catch (parseErr) {
    console.error('[claudeApi] Raw Claude response:', rawText);
    throw new Error('Failed to parse quiz response from Claude. Please try again.');
  }
}
