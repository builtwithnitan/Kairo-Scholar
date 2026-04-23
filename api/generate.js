import { randomUUID } from 'node:crypto';
import { fallbackStudyGuide as generateFreeStudyGuide } from '../src/lib/analyzer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const notes = String(req.body?.notes || '').slice(0, 60000).trim();
  if (notes.length < 40) {
    return res.status(400).json({ error: 'Please provide more notes before generating a study guide.' });
  }

  if (process.env.KAIRO_ENABLE_PAID_AI !== 'true' || !process.env.OPENAI_API_KEY) {
    return res.status(200).json({ freeMode: true, ...generateFreeStudyGuide(notes) });
  }

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: 'You generate concise, accurate study materials from student notes. Return only valid JSON matching the requested schema.'
        },
        {
          role: 'user',
          content: `Create a study guide from these notes. Return JSON with this exact shape: {"title":"string","summary":[{"text":"string"}],"studyGuide":[{"heading":"string","bullets":["string"]}],"keyConcepts":[{"concept":"string","explanation":"string"}],"flashcards":[{"front":"string","back":"string"}],"quiz":[{"question":"string","choices":["string","string","string","string"],"answer":"A","explanation":"string","difficulty":"warm-up|medium|challenge"}],"terms":[{"term":"string","definition":"string"}],"shortExplanations":[{"prompt":"string","answer":"string"}]}. Notes:\n\n${notes}`
        }
      ],
      text: { format: { type: 'json_object' } }
    });

    const raw = response.output_text || '{}';
    const guide = JSON.parse(raw);
    return res.status(200).json({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...guide
    });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ freeMode: true, ...generateFreeStudyGuide(notes) });
  }
}

function fallbackStudyGuide(notes) {
  const sentences = notes.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean).slice(0, 50) || [];
  const words = new Map();
  const stop = new Set(['about','after','again','also','because','before','between','could','every','from','have','into','more','only','other','should','some','than','that','their','there','these','they','this','through','under','using','were','what','when','where','which','while','with','would','your','you','and','the','for','are','but','not','can','will','was','has','had','how','why','who','all','any','may','its','our','out']);
  notes.toLowerCase().match(/[a-z][a-z-]{3,}/g)?.forEach((word) => {
    if (!stop.has(word)) words.set(word, (words.get(word) || 0) + 1);
  });
  const keys = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([word]) => word);
  const explain = (term) => sentences.find((sentence) => sentence.toLowerCase().includes(term)) || sentences[0] || `${term} appears to be an important idea in these notes.`;
  const title = `${titleCase(keys[0] || 'Study')} Guide`;

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    title,
    summary: sentences.slice(0, 4).map((text) => ({ text })),
    studyGuide: keys.slice(0, 5).map((key) => ({ heading: titleCase(key), bullets: sentences.filter((sentence) => sentence.toLowerCase().includes(key)).slice(0, 4).concat(sentences.slice(0, 1)).slice(0, 4) })),
    keyConcepts: keys.slice(0, 6).map((key) => ({ concept: titleCase(key), explanation: explain(key) })),
    flashcards: keys.slice(0, 8).map((key) => ({ front: `What is important about ${titleCase(key)}?`, back: explain(key) })),
    quiz: keys.slice(0, 5).map((key) => ({ question: `Which statement best matches ${titleCase(key)}?`, choices: [explain(key), 'A detail not directly supported by the notes.', 'A related but incomplete idea.', 'A broad claim without evidence from the notes.'], answer: 'A', explanation: explain(key), difficulty: 'warm-up' })),
    terms: keys.map((key) => ({ term: titleCase(key), definition: explain(key) })),
    shortExplanations: keys.slice(0, 4).map((key) => ({ prompt: `Simplify ${titleCase(key)}`, answer: `In simple terms: ${explain(key)}` }))
  };
}

function titleCase(value) {
  return value.replace(/(^|\s|-)([a-z])/g, (_, sep, char) => `${sep}${char.toUpperCase()}`);
}

