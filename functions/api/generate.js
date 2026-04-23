import { fallbackStudyGuide as generateFreeStudyGuide } from '../../src/lib/analyzer.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));
  const notes = String(body.notes || '').slice(0, 60000).trim();

  if (notes.length < 40) {
    return json({ error: 'Please provide more notes before generating a study guide.' }, 400);
  }

  if (env.KAIRO_ENABLE_PAID_AI !== 'true' || !env.OPENAI_API_KEY) {
    return json({ freeMode: true, ...generateFreeStudyGuide(notes) });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          { role: 'system', content: 'You generate concise, accurate study materials from student notes. Return only valid JSON.' },
          { role: 'user', content: `Return JSON with title, summary, studyGuide, keyConcepts, flashcards, quiz, terms, and shortExplanations from these notes:\n\n${notes}` }
        ],
        text: { format: { type: 'json_object' } }
      })
    });

    const payload = await response.json();
    const text = payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text || '{}';
    return json({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...JSON.parse(text) });
  } catch (error) {
    return json({ freeMode: true, ...generateFreeStudyGuide(notes) });
  }
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
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

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: `${titleCase(keys[0] || 'Study')} Guide`,
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
