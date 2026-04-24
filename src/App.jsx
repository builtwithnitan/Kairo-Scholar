import { motion } from 'framer-motion';
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Download,
  FileUp,
  Flame,
  LockKeyhole,
  LogOut,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Sun,
  TimerReset,
  User
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fallbackStudyGuide, makeQuizHarder, simplifyConcept } from './lib/analyzer.js';
import { getCurrentUser, loginUser, logoutUser, registerUser } from './lib/auth.js';
import { extractTextFromFile } from './lib/fileReaders.js';
import { exportGuidePdf } from './lib/pdfExport.js';
import { loadSessions, saveSession } from './lib/storage.js';

const starterNotes = `Paste class notes here, or upload a TXT, PDF, or DOCX file.\n\nExample: Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs light, water splits, oxygen is released, and glucose stores energy for the plant.`;

export default function App() {
  const [notes, setNotes] = useState('');
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready when the notes are.');
  const [sessions, setSessions] = useState([]);
  const [dark, setDark] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [activeCard, setActiveCard] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simpleExplanation, setSimpleExplanation] = useState('');

  useEffect(() => {
    if (currentUser) setSessions(loadSessions(currentUser.username));
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = window.setInterval(() => setTimerSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const completion = useMemo(() => {
    if (!guide) return 0;
    const total = (guide.flashcards?.length || 0) + (guide.quiz?.length || 0) + 1;
    const answered = Object.keys(quizAnswers).length + progress + (activeCard === null ? 0 : 1);
    return Math.min(100, Math.round((answered / total) * 100));
  }, [activeCard, guide, progress, quizAnswers]);

  async function handleFile(file) {
    if (!file) return;
    setStatus(`Reading ${file.name}...`);
    try {
      const text = await extractTextFromFile(file);
      setNotes(text);
      setStatus(`Loaded ${file.name}. You can generate whenever you are ready.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function generateGuide() {
    const input = notes.trim();
    if (input.length < 40) {
      setStatus('Add a little more note content first so the guide has something useful to study.');
      return;
    }

    setLoading(true);
    setStatus('Analyzing notes and building your study kit...');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: input })
      });
      const payload = response.ok ? await response.json() : fallbackStudyGuide(input);
      const nextGuide = normalizeGuide(payload, input);
      setGuide(nextGuide);
      setSessions(saveSession(nextGuide, currentUser?.username));
      setProgress(1);
      window.history.replaceState(null, '', '#results');
      setStatus(payload.freeMode ? 'Free Study Mode generated the guide with no paid AI usage.' : 'The study guide is ready.');
    } catch {
      const nextGuide = normalizeGuide(fallbackStudyGuide(input), input);
      setGuide(nextGuide);
      setSessions(saveSession(nextGuide, currentUser?.username));
      setProgress(1);
      setStatus('Free Study Mode generated the guide with no paid AI usage.');
    } finally {
      setLoading(false);
    }
  }

  function loadSession(session) {
    setGuide(session);
    setNotes(session.sourceNotes || notes);
    setStatus(`Loaded saved session: ${session.title}`);
    window.location.hash = 'results';
  }

  function handleHarderQuiz() {
    if (!guide) return;
    const harder = makeQuizHarder(guide);
    setGuide(harder);
    setSessions(saveSession(harder, currentUser?.username));
    setStatus('Quiz questions upgraded to challenge mode.');
  }

  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;

  if (!currentUser) {
    return <AuthGate onAuthenticated={setCurrentUser} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#ebe6dc] text-slate-900 transition dark:bg-[#111827] dark:text-slate-50">
      <WorkspaceBackground />
      <Nav
        dark={dark}
        user={currentUser}
        onToggle={() => setDark((value) => !value)}
        onLogout={() => {
          logoutUser();
          setCurrentUser(null);
          setGuide(null);
        }}
      />

      <section className="mx-auto grid min-h-[720px] w-full max-w-7xl gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="p-2 lg:pt-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Free Study Workspace</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Kairo Scholar</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              A calmer notebook-style workspace for turning notes into summaries, study guides, quizzes, flashcards, and review sheets.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <FeaturePill icon={BookOpen} label="Study Guide" />
            <FeaturePill icon={BrainCircuit} label="Summaries" />
            <FeaturePill icon={Save} label="Flashcards" />
            <FeaturePill icon={ShieldCheck} label="Quizzes" />
            <FeaturePill icon={Sparkles} label="Key Concepts" />
          </div>
        </motion.aside>

        <motion.div initial={{ opacity: 0, scale: 0.98, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-8">
          <div className="p-2 text-center sm:p-3">
            <div className="flex flex-col items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Start with notes or a document</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Build a study notebook from one upload.</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Free Study Mode
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] bg-[#faf7f2] p-2 dark:bg-slate-950/70">
              <div className="flex items-center gap-3">
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ask Kairo Scholar anything..."
                  className="min-h-14 flex-1 rounded-full bg-transparent px-5 text-left text-base outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 sm:text-lg"
                />
                <button onClick={generateGuide} disabled={loading || notes.trim().length < 40} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-900 text-white transition hover:scale-105 disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950">
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="border-t border-slate-200 pt-6 text-left dark:border-white/10">
            <div className="bg-[#faf7f2] p-5 text-center dark:bg-slate-950/60">
              <input id="file-upload" type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
              <label htmlFor="file-upload" className="inline-flex cursor-pointer items-center justify-center gap-3 rounded-full bg-slate-900 px-6 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 dark:bg-cyan-200 dark:text-slate-950">
                <FileUp className="h-5 w-5" />
                Upload notes
              </label>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Supports TXT, PDF, and DOCX. Paste longer notes below for stronger results.</p>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={starterNotes}
              className="mt-4 min-h-[270px] w-full resize-y bg-transparent p-2 text-base leading-7 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 sm:text-lg"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button onClick={generateGuide} disabled={loading} className="touch-target inline-flex flex-1 items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-base font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-200 dark:text-slate-950">
                <Sparkles className="h-5 w-5" />
                {loading ? 'Generating...' : 'Generate Study Guide'}
              </button>
              <button onClick={() => setNotes(starterNotes)} className="touch-target rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5">
                Try sample
              </button>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{status}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Free Study Mode is on by default, so students can use Kairo without creating an AI bill. For public deployment, connect hosted auth before adding any paid AI option.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section id="results" className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <TimerCard timerLabel={timerLabel} running={timerRunning} onToggle={() => setTimerRunning((value) => !value)} onReset={() => { setTimerSeconds(25 * 60); setTimerRunning(false); }} />
          <ProgressCard completion={completion} />
          <SavedSessions sessions={sessions} onLoad={loadSession} />
        </aside>

        {guide ? (
          <Results
            guide={guide}
            activeCard={activeCard}
            setActiveCard={setActiveCard}
            quizAnswers={quizAnswers}
            setQuizAnswers={setQuizAnswers}
            onPdf={() => exportGuidePdf(guide)}
            onHarderQuiz={handleHarderQuiz}
            onSimplify={(text) => setSimpleExplanation(simplifyConcept(text))}
            simpleExplanation={simpleExplanation}
          />
        ) : (
          <EmptyState />
        )}
      </section>
      <DisclaimerFooter />
    </main>
  );
}

function normalizeGuide(payload, sourceNotes) {
  return {
    id: payload.id || crypto.randomUUID(),
    createdAt: payload.createdAt || new Date().toISOString(),
    sourceNotes,
    ...payload,
    summary: payload.summary || [],
    studyGuide: payload.studyGuide || [],
    flashcards: payload.flashcards || [],
    quiz: payload.quiz || [],
    terms: payload.terms || [],
    keyConcepts: payload.keyConcepts || [],
    shortExplanations: payload.shortExplanations || []
  };
}

function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Create or sign in to a Kairo Scholar workspace.');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('Checking secure workspace...');
    try {
      const user = mode === 'register'
        ? await registerUser(username, password)
        : await loginUser(username, password);
      onAuthenticated(user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ebe6dc] text-slate-900 dark:bg-[#111827] dark:text-slate-50">
      <WorkspaceBackground />
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="text-center lg:text-left">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-slate-900 text-3xl font-black text-white lg:mx-0 dark:bg-cyan-200 dark:text-slate-950">
            K
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.38em] text-slate-500 dark:text-slate-400">Free Study Mode</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-7xl">
            Kairo Scholar
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            A protected free study workspace where each learner signs in before generating study guides, summaries, flashcards, quizzes, and key concepts.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat icon={ShieldCheck} value="Workspace login" label="Separate users per device" />
            <Stat icon={BrainCircuit} value="Free mode" label="No paid AI calls by default" />
            <Stat icon={Save} value="Saved sessions" label="Stored under each username" />
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} onSubmit={submit} className="rounded-[2rem] border border-black/8 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-8">
          <div className="flex rounded-2xl border border-slate-200 bg-[#faf7f2] p-1 dark:border-white/10 dark:bg-slate-950/70">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-xl px-4 py-3 font-bold transition ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sign in</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-xl px-4 py-3 font-bold transition ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Create account</button>
          </div>

          <label className="mt-6 block text-sm font-bold text-slate-700 dark:text-slate-300">Email or username</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#faf7f2] px-4 py-3 dark:border-white/10 dark:bg-slate-950/70">
            <User className="h-5 w-5 text-slate-400" />
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="student@email.com" autoComplete="username" />
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#faf7f2] px-4 py-3 dark:border-white/10 dark:bg-slate-950/70">
            <LockKeyhole className="h-5 w-5 text-slate-400" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="8+ characters" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
          </div>

          <button disabled={busy} className="mt-6 touch-target w-full rounded-2xl bg-slate-900 px-6 py-4 font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-cyan-200 dark:text-slate-950">
            {busy ? 'Working...' : mode === 'register' ? 'Create Kairo account' : 'Enter Kairo Scholar'}
          </button>

          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            Security note: this prototype login separates local users. Before public launch, use hosted authentication such as Supabase, Clerk, or Auth0. Paid AI is disabled by default to avoid surprise costs.
          </p>
        </motion.form>
      </section>
    </main>
  );
}

function WorkspaceBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#ebe6dc] dark:bg-[#111827]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(212,222,242,0.36),transparent_20%),linear-gradient(180deg,#ebe6dc,#e2dccf)] dark:bg-[radial-gradient(circle_at_top_left,rgba(30,41,59,0.9),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.12),transparent_24%),linear-gradient(180deg,#111827,#0f172a)]" />
    </div>
  );
}

function FeaturePill({ icon: Icon, label }) {
  return (
    <div className="inline-flex min-h-14 items-center justify-center gap-3 px-2 py-3 text-sm font-bold text-slate-600 transition dark:text-slate-300">
      <Icon className="h-5 w-5 text-slate-500 dark:text-cyan-200" />
      {label}
    </div>
  );
}

function DisclaimerFooter() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
        <p className="font-bold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300">Important Disclaimer</p>
        <p className="mt-3">
          Kairo Scholar is a free study aid for learners age 13+. Do not upload private, sensitive, or confidential information.
          Only upload notes or materials you own or have permission to use. Use generated guides, flashcards, and quizzes for learning and review,
          not cheating or submitting work that is not yours. Free Study Mode is enabled by default and does not use paid AI calls.
        </p>
      </div>
    </footer>
  );
}

function Nav({ dark, user, onToggle, onLogout }) {
  return (
    <nav className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 py-5 sm:px-6 lg:px-8">
      <div className="justify-self-start">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Free Study Workspace</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-black tracking-tight">Kairo Scholar</p>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">astute-hoop-vision-pro.com</p>
        </div>
      </div>
      <div className="flex items-center justify-self-end gap-2">
        <span className="hidden rounded-full border border-black/8 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 sm:inline-flex dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300">{user.username}</span>
        <button onClick={onToggle} className="touch-target rounded-full border border-black/8 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900/70" aria-label="Toggle dark mode">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={onLogout} className="touch-target rounded-full border border-black/8 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900/70" aria-label="Log out">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

function Stat({ icon: Icon, value, label }) {
  return <div className="px-1 py-3"><Icon className="mb-3 h-6 w-6 text-slate-500 dark:text-cyan-200" /><p className="text-lg font-extrabold">{value}</p><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p></div>;
}

function TimerCard({ timerLabel, running, onToggle, onReset }) {
  return <Card><div className="flex items-center justify-between"><p className="font-bold">Study timer</p><Clock3 className="h-5 w-5 text-slate-500 dark:text-cyan-200" /></div><p className="mt-3 text-5xl font-black tracking-tight">{timerLabel}</p><div className="mt-4 flex gap-2"><button onClick={onToggle} className="touch-target flex-1 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white dark:bg-cyan-200 dark:text-slate-950">{running ? 'Pause' : 'Focus'}</button><button onClick={onReset} className="touch-target rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10"><TimerReset className="h-5 w-5" /></button></div></Card>;
}

function ProgressCard({ completion }) {
  return <Card><div className="flex items-center justify-between"><p className="font-bold">Progress tracker</p><CheckCircle2 className="h-5 w-5 text-slate-500 dark:text-cyan-200" /></div><div className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-slate-900 transition-all dark:bg-cyan-300" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{completion}% study flow completed</p></Card>;
}

function SavedSessions({ sessions, onLoad }) {
  return <Card><p className="font-bold">Previous sessions</p><div className="mt-3 space-y-2">{sessions.length ? sessions.map((session) => <button key={session.id} onClick={() => loadSessionTone(onLoad, session)} className="w-full border-b border-slate-200 pb-3 text-left text-sm transition hover:text-slate-900 dark:border-white/10 dark:hover:text-white"><span className="line-clamp-1 font-bold">{session.title}</span><span className="text-xs text-slate-500 dark:text-slate-400">{new Date(session.createdAt).toLocaleDateString()}</span></button>) : <p className="text-sm text-slate-500 dark:text-slate-400">Generated guides will appear here.</p>}</div></Card>;
}

function EmptyState() {
  return <div className="py-20 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-cyan-200"><Flame className="h-9 w-9" /></div><h2 className="mt-6 text-4xl font-black tracking-tight">Kairo results will appear here.</h2><p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">Generate a guide to unlock the study guide, flashcards, practice quiz, vocabulary terms, and export tools.</p></div>;
}

function Results({ guide, activeCard, setActiveCard, quizAnswers, setQuizAnswers, onPdf, onHarderQuiz, onSimplify, simpleExplanation }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card large>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><p className="text-sm font-extrabold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Results page</p><h2 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{guide.title}</h2></div>
          <button onClick={onPdf} className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 font-extrabold text-white transition hover:-translate-y-0.5 dark:bg-cyan-200 dark:text-slate-950"><Download className="h-5 w-5" />Download PDF</button>
        </div>
      </Card>

      <Section title="Clean Summary" items={guide.summary.map((item) => item.text)} />

      <Card large>
        <h3 className="text-3xl font-black tracking-tight">Study Guide</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {guide.studyGuide.map((section, index) => <div key={`${section.heading}-${index}`} className="rounded-2xl bg-[rgba(255,255,255,0.58)] p-5 dark:bg-slate-950/50"><h4 className="text-xl font-extrabold">{section.heading}</h4><ul className="mt-3 space-y-2 text-slate-700 dark:text-slate-300">{section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>- {bullet}</li>)}</ul><button onClick={() => onSimplify(section.bullets[0])} className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">Simplify this concept</button></div>)}
        </div>
        {simpleExplanation && <p className="mt-5 rounded-2xl border border-slate-200 bg-[#faf7f2] p-4 font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">{simpleExplanation}</p>}
      </Card>

      <Card large>
        <h3 className="text-3xl font-black tracking-tight">Flashcards</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {guide.flashcards.map((card, index) => <button key={index} onClick={() => setActiveCard(activeCard === index ? null : index)} className="min-h-44 rounded-3xl bg-[rgba(255,255,255,0.6)] p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 dark:bg-slate-950/50"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Card {index + 1}</p><p className="mt-4 text-xl font-extrabold">{activeCard === index ? card.back : card.front}</p><p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Tap to flip</p></button>)}
        </div>
      </Card>

      <Card large>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h3 className="text-3xl font-black tracking-tight">Practice Quiz</h3><button onClick={onHarderQuiz} className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold dark:border-white/10 dark:bg-slate-900/70"><RotateCcw className="h-4 w-4" />Make harder questions</button></div>
        <div className="mt-5 space-y-4">{guide.quiz.map((item, index) => <div key={index} className="rounded-2xl bg-[rgba(255,255,255,0.6)] p-5 dark:bg-slate-950/50"><p className="font-extrabold">{index + 1}. {item.question}</p><div className="mt-3 grid gap-2">{item.choices.map((choice, choiceIndex) => { const letter = String.fromCharCode(65 + choiceIndex); const picked = quizAnswers[index] === letter; return <button key={letter} onClick={() => setQuizAnswers({ ...quizAnswers, [index]: letter })} className={`rounded-xl p-3 text-left text-sm transition ${picked ? 'bg-white dark:bg-slate-900' : 'bg-[rgba(255,255,255,0.7)] dark:bg-slate-900/70'}`}><strong>{letter}.</strong> {choice}</button>; })}</div>{quizAnswers[index] && <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Answer: {item.answer}. {item.explanation}</p>}</div>)}</div>
      </Card>

      <Card large>
        <h3 className="text-3xl font-black tracking-tight">Important Vocabulary</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{guide.terms.map((term, index) => <div key={index} className="rounded-2xl bg-[rgba(255,255,255,0.58)] p-4 dark:bg-slate-950/50"><p className="font-extrabold text-slate-800 dark:text-slate-100">{term.term}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{term.definition}</p></div>)}</div>
      </Card>
    </motion.div>
  );
}

function Section({ title, items }) {
  return <Card large><h3 className="text-3xl font-black tracking-tight">{title}</h3><div className="mt-5 grid gap-3">{items.map((item, index) => <p key={index} className="border-b border-slate-300 pb-4 text-lg leading-8 text-slate-700 dark:border-white/10 dark:text-slate-300">{item}</p>)}</div></Card>;
}

function Card({ children, large = false }) {
  return <div className={`border-t border-slate-200 pt-5 text-slate-900 dark:border-white/10 dark:text-slate-50 ${large ? 'sm:pt-7' : ''}`}>{children}</div>;
}

function loadSessionTone(onLoad, session) {
  onLoad(session);
}
