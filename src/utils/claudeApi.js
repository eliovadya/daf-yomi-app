// claudeApi.js — generates quiz questions for a given daf using the Anthropic API

import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } from '../config';

/**
 * Generates 5 multiple-choice quiz questions about a specific daf.
 *
 * @param {string} dafRef     - e.g. "Berakhot 2a"   (used in the prompt)
 * @param {string} dafDisplayEn - e.g. "Berakhot 2"  (for the prompt context)
 * @param {'easy'|'medium'|'hard'} difficulty
 *
 * @returns {Promise<Array>}  - Array of question objects (see shape below)
 *
 * Question shape:
 * {
 *   questionEn:     string,
 *   questionHe:     string,
 *   options:        string[],   // ["A. ...", "B. ...", "C. ...", "D. ..."]
 *   optionsHe:      string[],   // ["א. ...", "ב. ...", "ג. ...", "ד. ..."]
 *   answer:         string,     // "A" | "B" | "C" | "D"
 *   explanationEn:  string,
 *   explanationHe:  string,
 * }
 */
export async function generateQuizQuestions(dafRef, dafDisplayEn, difficulty) {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    throw new Error('API_KEY_MISSING');
  }

  const difficultyGuide = {
    easy:   'basic recall: who said what, key stories, and famous phrases',
    medium: 'comprehension of the main halachic discussions and machloket positions',
    hard:   'deep analysis: comparing opinions, underlying logic, and practical implications',
  }[difficulty];

  const prompt = `You are an expert Talmud teacher creating a quiz for a student who just finished studying ${dafRef} (${dafDisplayEn}).

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
- All 5 questions must have exactly 4 options (A/B/C/D  ×  א/ב/ג/ד)
- The "answer" field is a single letter: A, B, C, or D
- Questions must relate to the actual content of ${dafRef}
- If unsure about a very specific detail, ask about the broader topic/tractate
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

  // Strip accidental markdown fences if the model adds them
  const cleaned = rawText.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('Unexpected JSON shape');
    }
    return parsed.questions;
  } catch {
    throw new Error('Failed to parse quiz response from Claude. Please try again.');
  }
}
