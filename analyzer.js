const STOP_WORDS = new Set([
  'about','after','again','also','because','before','between','could','every','from','have','into','more','only','other','should','some','than','that','their','there','these','they','this','through','under','using','were','what','when','where','which','while','with','would','your','you','and','the','for','are','but','not','can','will','was','has','had','how','why','who','all','any','may','its','our','out','one','two'
]);

export function fallbackStudyGuide(notes) {
  const clean = notes.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(clean);
  const keywords = getKeywords(clean, 14);
  const concepts = keywords.slice(0, 6);
  const summary = buildSummary(sentences, keywords);
  const sections = chunkByTopic(sentences, concepts);

  return {
    title: inferTitle(clean, keywords),
    summary,
    studyGuide: sections.map((section, index) => ({
      heading: section.heading || `Core Idea ${index + 1}`,
      bullets: section.bullets.length ? section.bullets : summary.map((item) => item.text)
    })),
    keyConcepts: concepts.map((term) => ({
      concept: toTitle(term),
      explanation: explainTerm(term, sentences)
    })),
    flashcards: concepts.concat(keywords.slice(6, 10)).map((term) => ({
      front: `What should you remember about ${toTitle(term)}?`,
      back: explainTerm(term, sentences)
    })),
    quiz: concepts.slice(0, 5).map((term, index) => ({
      question: `Which statement best explains ${toTitle(term)}?`,
      choices: makeChoices(term, sentences, keywords),
      answer: 'A',
      explanation: explainTerm(term, sentences),
      difficulty: index > 2 ? 'medium' : 'warm-up'
    })),
    terms: keywords.slice(0, 12).map((term) => ({
      term: toTitle(term),
      definition: explainTerm(term, sentences)
    })),
    shortExplanations: concepts.slice(0, 4).map((term) => ({
      prompt: `Explain ${toTitle(term)} in one minute`,
      answer: simplifyText(explainTerm(term, sentences))
    }))
  };
}

export function makeQuizHarder(guide) {
  return {
    ...guide,
    quiz: guide.quiz.map((item) => ({
      ...item,
      difficulty: 'challenge',
      question: item.question.replace('Which statement best explains', 'How would you apply or compare'),
      explanation: `${item.explanation} Connect this answer back to cause, effect, and real-world use.`
    }))
  };
}

export function simplifyConcept(text) {
  return simplifyText(text || 'Pick a concept first, then we can simplify it into plain language.');
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean).slice(0, 80) || [];
}

function getKeywords(text, limit) {
  const counts = new Map();
  text.toLowerCase().match(/[a-z][a-z-]{3,}/g)?.forEach((word) => {
    const normalized = word.replace(/^-|-$/g, '');
    if (!STOP_WORDS.has(normalized)) counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function buildSummary(sentences, keywords) {
  const scored = sentences.map((sentence) => ({
    text: sentence,
    score: keywords.reduce((total, key) => total + (sentence.toLowerCase().includes(key) ? 1 : 0), 0)
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, 4).map((item) => ({ text: item.text }));
}

function chunkByTopic(sentences, concepts) {
  return concepts.slice(0, 5).map((concept) => {
    const matching = sentences.filter((sentence) => sentence.toLowerCase().includes(concept)).slice(0, 4);
    return {
      heading: toTitle(concept),
      bullets: matching.length ? matching : sentences.slice(0, 3)
    };
  });
}

function explainTerm(term, sentences) {
  const source = sentences.find((sentence) => sentence.toLowerCase().includes(term)) || sentences[0] || '';
  return source ? source.replace(/^[-*\d.\s]+/, '') : `${toTitle(term)} is an important idea from your notes. Review where it appears and connect it to examples.`;
}

function makeChoices(term, sentences, keywords) {
  return [
    explainTerm(term, sentences),
    `A related but less central idea involving ${toTitle(keywords.find((word) => word !== term) || 'the topic')}.`,
    'A detail that is not strongly supported by the uploaded notes.',
    'A broad answer that sounds plausible but does not use the key evidence.'
  ];
}

function simplifyText(text) {
  const first = splitSentences(text)[0] || text;
  return `In simple terms: ${first.replace(/\b(utilize|demonstrates|approximately|therefore)\b/gi, (match) => ({ utilize: 'use', demonstrates: 'shows', approximately: 'about', therefore: 'so' }[match.toLowerCase()] || match))}`;
}

function inferTitle(text, keywords) {
  const firstLine = text.split(/[\r\n.]/).find((line) => line.trim().length > 8 && line.trim().length < 80);
  return firstLine?.trim() || `${toTitle(keywords[0] || 'Study')} Guide`;
}

function toTitle(value) {
  return value.replace(/(^|\s|-)([a-z])/g, (_, sep, char) => `${sep}${char.toUpperCase()}`);
}
