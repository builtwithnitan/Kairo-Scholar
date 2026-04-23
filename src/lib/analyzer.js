const STOP_WORDS = new Set([
  'about','after','again','also','because','before','between','could','every','from','have','into','more','only','other','should','some','than','that','their','there','these','they','this','through','under','using','were','what','when','where','which','while','with','would','your','you','and','the','for','are','but','not','can','will','was','has','had','how','why','who','all','any','may','its','our','out','one','two','assignment','programming','course','file','files','each','time','display','results','result','upload','source','following','headers','holding','write','html','python','hint','lesson','slide','value','parameter'
]);

const CONCEPT_PATTERNS = [
  { match: /exponential growth|xdot|population/i, concept: 'Exponential Growth Model', explanation: 'A model where the population changes at a rate proportional to its current size, often written as xdot = a * x.' },
  { match: /time step|d_t|simulation/i, concept: 'Time-Step Simulation', explanation: 'A numerical process that updates a system in small time increments so the program can approximate change over time.' },
  { match: /csv|comma-separated|headers/i, concept: 'CSV Data File', explanation: 'A plain-text table format where rows hold records and columns are separated by commas.' },
  { match: /periodic table|atomic number|symbol|elements/i, concept: 'Periodic Table Data', explanation: 'Structured chemistry data that can be represented with columns such as atomic number, symbol, and element name.' },
  { match: /zip|submit|submission|upload/i, concept: 'Submission Package', explanation: 'The final deliverable should include the required source files packaged in the format requested by the assignment.' },
  { match: /gravity|object subject to gravity/i, concept: 'Gravity Example', explanation: 'A physics-style example where an object changes position or velocity under acceleration due to gravity.' }
];

export function fallbackStudyGuide(notes) {
  const clean = normalize(notes);
  const lines = getUsefulLines(notes);
  const sentences = splitSentences(clean);
  const tasks = extractTasks(notes, sentences);
  const detectedConcepts = detectConcepts(clean);
  const keywords = getKeywords(clean, 16);
  const keywordConcepts = keywords
    .filter((word) => !detectedConcepts.some((item) => item.concept.toLowerCase().includes(word)))
    .slice(0, Math.max(0, 7 - detectedConcepts.length))
    .map((word) => ({ concept: toTitle(word), explanation: explainTerm(word, sentences) }));
  const concepts = [...detectedConcepts, ...keywordConcepts].slice(0, 8);
  const sourceItems = tasks.length ? tasks : lines.slice(0, 6).map((line, index) => ({ title: `Important Point ${index + 1}`, detail: line }));

  return {
    title: inferTitle(notes, keywords),
    summary: buildSummary(sourceItems, sentences),
    studyGuide: buildStudyGuide(sourceItems, concepts),
    keyConcepts: concepts.slice(0, 6),
    flashcards: buildFlashcards(sourceItems, concepts),
    quiz: buildQuiz(sourceItems, concepts),
    terms: buildTerms(concepts, keywords, sentences),
    shortExplanations: concepts.slice(0, 4).map((item) => ({
      prompt: `Explain ${item.concept} simply`,
      answer: simplifyText(item.explanation)
    }))
  };
}

export function makeQuizHarder(guide) {
  return {
    ...guide,
    quiz: guide.quiz.map((item) => ({
      ...item,
      difficulty: 'challenge',
      question: item.question
        .replace('What is the best description of', 'How would you apply')
        .replace('Which deliverable is required for', 'What must be included to fully complete'),
      explanation: `${item.explanation} Connect the answer to the assignment requirements and implementation details.`
    }))
  };
}

export function simplifyConcept(text) {
  return simplifyText(text || 'Pick a concept first, then we can simplify it into plain language.');
}

function normalize(text) {
  return text.replace(/```[a-z]*/gi, ' ').replace(/\s+/g, ' ').trim();
}

function getUsefulLines(text) {
  return text
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[-*\s]+/, '').trim())
    .filter((line) => line.length > 12)
    .filter((line) => !/^(html|python|css|javascript)$/i.test(line))
    .filter(uniqueByNormalized)
    .slice(0, 30);
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean).filter(uniqueByNormalized).slice(0, 100) || [];
}

function extractTasks(rawText, sentences) {
  const taskLines = rawText
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => /^(task\s*)?\d+\s*[:.)-]/i.test(line) || /^(simulate|construct|display|write|upload|submit|create|build)\b/i.test(line));

  const sentenceTasks = sentences.filter((sentence) => /\b(simulate|construct|display|write|upload|submit|create|build)\b/i.test(sentence));

  return [...taskLines, ...sentenceTasks]
    .map((line, index) => ({ title: inferTaskTitle(line, index), detail: cleanTaskText(line) }))
    .filter((task) => task.detail.length > 10)
    .filter((task) => !/^(what is important|which statement|answer:|card\s+\d+)/i.test(task.detail))
    .filter((task, index, list) => list.findIndex((item) => normalizeKey(item.detail) === normalizeKey(task.detail)) === index)
    .slice(0, 8);
}

function inferTaskTitle(text, index) {
  if (/exponential growth|population|xdot/i.test(text)) return 'Simulate Exponential Growth';
  if (/csv|periodic table|atomic number|element/i.test(text)) return 'Create Structured CSV Data';
  if (/display|write.*csv/i.test(text)) return 'Display and Export Results';
  if (/zip|upload|submit/i.test(text)) return 'Prepare Final Submission';
  if (/gravity/i.test(text)) return 'Use the Gravity Reference';
  return `Assignment Requirement ${index + 1}`;
}

function cleanTaskText(text) {
  return text
    .replace(/^task\s*/i, '')
    .replace(/^\d+\s*[:.)-]\s*/, '')
    .replace(/^(summary|study guide|flashcards|quiz|important terms)\s*/i, '')
    .replace(/^(assignment|time|each|file|display|results|population|step|simulation)\s*[-:]\s*/i, '')
    .replace(/\b(html|python)\b\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectConcepts(text) {
  return CONCEPT_PATTERNS
    .filter((item) => item.match.test(text))
    .map(({ concept, explanation }) => ({ concept, explanation }));
}

function getKeywords(text, limit) {
  const counts = new Map();
  text.toLowerCase().match(/[a-z][a-z-]{3,}/g)?.forEach((word) => {
    const normalized = word.replace(/^-|-$/g, '');
    if (!STOP_WORDS.has(normalized)) counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function buildSummary(items, sentences) {
  const summary = [];
  if (items.length) {
    summary.push({ text: `This material contains ${items.length} main requirement${items.length === 1 ? '' : 's'} to review or complete.` });
    items.slice(0, 4).forEach((item) => summary.push({ text: `${item.title}: ${item.detail}` }));
  }
  if (summary.length < 3) {
    sentences.slice(0, 4).forEach((text) => summary.push({ text }));
  }
  return summary.slice(0, 5);
}

function buildStudyGuide(tasks, concepts) {
  const sections = [];
  if (tasks.length) {
    sections.push({
      heading: 'What To Complete',
      bullets: tasks.map((task) => `${task.title}: ${task.detail}`).slice(0, 6)
    });
  }
  if (concepts.length) {
    sections.push({
      heading: 'Concepts To Understand',
      bullets: concepts.slice(0, 6).map((item) => `${item.concept}: ${item.explanation}`)
    });
  }
  sections.push({
    heading: 'Study Strategy',
    bullets: [
      'Restate each requirement in your own words before coding or answering.',
      'Identify the inputs, outputs, and required file formats.',
      'Check the final deliverables against the instructions before submitting.'
    ]
  });
  return sections;
}

function buildFlashcards(tasks, concepts) {
  const conceptCards = concepts.slice(0, 6).map((item) => ({
    front: `What is ${item.concept}?`,
    back: item.explanation
  }));
  const taskCards = tasks.slice(0, 4).map((task) => ({
    front: `What does the assignment require for ${task.title}?`,
    back: task.detail
  }));
  return [...conceptCards, ...taskCards].slice(0, 10);
}

function buildQuiz(tasks, concepts) {
  const conceptQuestions = concepts.slice(0, 3).map((item, index) => ({
    question: `What is the best description of ${item.concept}?`,
    choices: [
      item.explanation,
      'A formatting detail that is not central to the assignment.',
      'A file upload step unrelated to the concept.',
      'A broad statement that does not match the notes.'
    ],
    answer: 'A',
    explanation: item.explanation,
    difficulty: index > 1 ? 'medium' : 'warm-up'
  }));
  const taskQuestions = tasks.slice(0, 3).map((task, index) => ({
    question: `Which deliverable is required for ${task.title}?`,
    choices: [
      task.detail,
      'Only read the instructions without creating any output.',
      'Submit an unrelated screenshot instead of the requested files.',
      'Skip the file format because the assignment does not mention outputs.'
    ],
    answer: 'A',
    explanation: task.detail,
    difficulty: index > 0 ? 'medium' : 'warm-up'
  }));
  return [...conceptQuestions, ...taskQuestions].slice(0, 6);
}

function buildTerms(concepts, keywords, sentences) {
  const conceptTerms = concepts.map((item) => ({ term: item.concept, definition: item.explanation }));
  const keywordTerms = keywords.slice(0, 8).map((term) => ({ term: toTitle(term), definition: explainTerm(term, sentences) }));
  return [...conceptTerms, ...keywordTerms]
    .filter((term, index, list) => list.findIndex((item) => normalizeKey(item.term) === normalizeKey(term.term)) === index)
    .slice(0, 12);
}

function explainTerm(term, sentences) {
  const source = sentences.find((sentence) => sentence.toLowerCase().includes(term)) || sentences[0] || '';
  return source ? source.replace(/^[-*\d.\s:]+/, '') : `${toTitle(term)} is an important idea from the notes. Review where it appears and connect it to an example.`;
}

function simplifyText(text) {
  const first = splitSentences(text)[0] || text;
  return `In simple terms: ${first.replace(/\b(utilize|demonstrates|approximately|therefore|construct)\b/gi, (match) => ({ utilize: 'use', demonstrates: 'shows', approximately: 'about', therefore: 'so', construct: 'create' }[match.toLowerCase()] || match))}`;
}

function inferTitle(text, keywords) {
  const assignmentMatch = text.match(/(COMP\s*\d+[^\n.]*Assignment\s*\d+)/i) || text.match(/([^\n.]*Assignment\s*\d+[^\n.]*)/i);
  if (assignmentMatch) return `${assignmentMatch[1].replace(/\s+/g, ' ').trim()} Guide`;
  const firstLine = text.split(/[\r\n.]/).find((line) => line.trim().length > 8 && line.trim().length < 80);
  return firstLine?.trim() || `${toTitle(keywords[0] || 'Study')} Guide`;
}

function toTitle(value) {
  return value.replace(/(^|\s|-)([a-z])/g, (_, sep, char) => `${sep}${char.toUpperCase()}`);
}

function uniqueByNormalized(value, index, list) {
  return list.findIndex((item) => normalizeKey(item) === normalizeKey(value)) === index;
}

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
