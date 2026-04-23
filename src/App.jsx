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
    <main className="min-h-screen overflow-hidden bg-[#020b16] text-cyan-50 transition dark:bg-[#020b16] dark:text-cyan-50">
      <CyberBackground />
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

      <section className="mx-auto flex min-h-[720px] w-full max-w-7xl flex-col items-center justify-center px-4 pb-12 pt-8 text-center sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7 }} className="w-full max-w-5xl">
          <div className="mx-auto mb-5 grid h-28 w-28 place-items-center rounded-[2rem] border border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_70px_rgba(14,165,233,0.8)] backdrop-blur md:h-36 md:w-36">
            <span className="font-cyber text-6xl font-black text-white drop-shadow-[0_0_24px_rgba(125,211,252,1)] md:text-8xl">K</span>
          </div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.55em] text-cyan-200/80 md:text-sm">Free Study Mode Generator</p>
          <h1 className="font-cyber text-5xl font-black tracking-wide text-white drop-shadow-[0_0_22px_rgba(56,189,248,0.75)] sm:text-7xl lg:text-8xl">
            Kairo Scholar
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-cyan-100/78 sm:text-xl">
            Free Study Mode for students, self-learners, tutors, and teams. Upload notes, ask Kairo anything, and turn material into guides, summaries, flashcards, quizzes, and key concepts without paid AI usage.
          </p>

          <div className="mx-auto mt-9 max-w-3xl rounded-full border border-cyan-300/60 bg-black/35 p-2 shadow-[0_0_36px_rgba(14,165,233,0.4)] backdrop-blur">
            <div className="flex items-center gap-3">
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ask Kairo Scholar anything..."
                className="min-h-14 flex-1 rounded-full bg-transparent px-5 text-left text-base text-cyan-50 outline-none placeholder:text-cyan-100/60 sm:text-lg"
              />
              <button onClick={generateGuide} disabled={loading || notes.trim().length < 40} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-200/80 bg-cyan-400/20 text-white shadow-[0_0_26px_rgba(56,189,248,0.75)] transition hover:scale-105 disabled:opacity-50">
                <Sparkles className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FeaturePill icon={BookOpen} label="Study Guide" />
            <FeaturePill icon={BrainCircuit} label="Summaries" />
            <FeaturePill icon={Save} label="Flashcards" />
            <FeaturePill icon={ShieldCheck} label="Quizzes" />
            <FeaturePill icon={Sparkles} label="Key Concepts" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.6 }} className="mt-10 w-full max-w-5xl rounded-[2rem] border border-cyan-300/25 bg-slate-950/70 p-4 text-left shadow-[0_0_55px_rgba(14,165,233,0.18)] backdrop-blur-xl sm:p-6">
          <div className="rounded-[1.5rem] border border-dashed border-cyan-300/40 bg-cyan-400/5 p-5 text-center">
            <input id="file-upload" type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            <label htmlFor="file-upload" className="inline-flex cursor-pointer items-center justify-center gap-3 rounded-full border border-cyan-200/60 bg-cyan-400/15 px-6 py-4 text-sm font-extrabold text-cyan-50 shadow-[0_0_30px_rgba(14,165,233,0.35)] transition hover:-translate-y-0.5 hover:bg-cyan-400/25">
              <FileUp className="h-5 w-5" />
              Upload notes
            </label>
            <p className="mt-3 text-sm text-cyan-100/70">Supports TXT, PDF, and DOCX. Paste longer notes below for stronger results.</p>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={starterNotes}
            className="mt-4 min-h-[270px] w-full resize-y rounded-[1.5rem] border border-cyan-300/20 bg-black/35 p-5 text-base leading-7 text-cyan-50 outline-none transition placeholder:text-cyan-100/45 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/15 sm:text-lg"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button onClick={generateGuide} disabled={loading} className="touch-target inline-flex flex-1 items-center justify-center gap-3 rounded-2xl border border-cyan-200/60 bg-cyan-400/20 px-6 py-4 text-base font-extrabold text-white shadow-[0_0_34px_rgba(14,165,233,0.35)] transition hover:-translate-y-0.5 hover:bg-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60">
              <Sparkles className="h-5 w-5" />
              {loading ? 'Generating...' : 'Generate Study Guide'}
            </button>
            <button onClick={() => setNotes(starterNotes)} className="touch-target rounded-2xl border border-cyan-300/25 bg-white/5 px-5 py-4 font-bold text-cyan-50 transition hover:-translate-y-0.5">
              Try sample
            </button>
          </div>
          <p className="mt-3 text-sm font-semibold text-cyan-100/80">{status}</p>
          <p className="mt-2 text-xs leading-5 text-cyan-100/55">
            Free Study Mode is on by default, so students can use Kairo without creating an AI bill. For public deployment, connect hosted auth before adding any paid AI option.
          </p>
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
    <main className="relative min-h-screen overflow-hidden bg-[#020b16] text-cyan-50">
      <CyberBackground />
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="text-center lg:text-left">
          <div className="mx-auto mb-6 grid h-28 w-28 place-items-center rounded-[2rem] border border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_70px_rgba(14,165,233,0.8)] backdrop-blur lg:mx-0">
            <span className="font-cyber text-7xl font-black text-white drop-shadow-[0_0_24px_rgba(125,211,252,1)]">K</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.55em] text-cyan-200/80">Free Study Mode Generator</p>
          <h1 className="mt-4 font-cyber text-5xl font-black tracking-wide text-white drop-shadow-[0_0_24px_rgba(56,189,248,0.8)] sm:text-7xl">
            Kairo Scholar
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-cyan-100/75">
            A protected free study workspace where each learner signs in before generating study guides, summaries, flashcards, quizzes, and key concepts.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat icon={ShieldCheck} value="Workspace login" label="Separate users per device" />
            <Stat icon={BrainCircuit} value="Free mode" label="No paid AI calls by default" />
            <Stat icon={Save} value="Saved sessions" label="Stored under each username" />
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} onSubmit={submit} className="rounded-[2rem] border border-cyan-300/25 bg-slate-950/78 p-6 shadow-[0_0_60px_rgba(14,165,233,0.24)] backdrop-blur-xl sm:p-8">
          <div className="flex rounded-2xl border border-cyan-300/20 bg-black/40 p-1">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-xl px-4 py-3 font-bold transition ${mode === 'login' ? 'bg-cyan-400/20 text-white shadow-[0_0_20px_rgba(14,165,233,0.35)]' : 'text-cyan-100/60'}`}>Sign in</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-xl px-4 py-3 font-bold transition ${mode === 'register' ? 'bg-cyan-400/20 text-white shadow-[0_0_20px_rgba(14,165,233,0.35)]' : 'text-cyan-100/60'}`}>Create account</button>
          </div>

          <label className="mt-6 block text-sm font-bold text-cyan-100/80">Email or username</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-black/35 px-4 py-3">
            <User className="h-5 w-5 text-cyan-200/70" />
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-cyan-100/35" placeholder="student@email.com" autoComplete="username" />
          </div>

          <label className="mt-5 block text-sm font-bold text-cyan-100/80">Password</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-black/35 px-4 py-3">
            <LockKeyhole className="h-5 w-5 text-cyan-200/70" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-cyan-100/35" placeholder="8+ characters" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
          </div>

          <button disabled={busy} className="mt-6 touch-target w-full rounded-2xl border border-cyan-200/70 bg-cyan-400/20 px-6 py-4 font-extrabold text-white shadow-[0_0_34px_rgba(14,165,233,0.38)] transition hover:-translate-y-0.5 hover:bg-cyan-400/30 disabled:opacity-60">
            {busy ? 'Working...' : mode === 'register' ? 'Create Kairo account' : 'Enter Kairo Scholar'}
          </button>

          <p className="mt-4 text-sm leading-6 text-cyan-100/65">{message}</p>
          <p className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100/85">
            Security note: this prototype login separates local users. Before public launch, use hosted authentication such as Supabase, Clerk, or Auth0. Paid AI is disabled by default to avoid surprise costs.
          </p>
        </motion.form>
      </section>
    </main>
  );
}

function CyberBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#020b16]">
      <img src="/kairo-scholar.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(14,165,233,0.32),transparent_28%),linear-gradient(180deg,rgba(2,11,22,0.2),rgba(2,11,22,0.94)_80%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,165,233,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(14,165,233,0.06)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35" />
    </div>
  );
}

function FeaturePill({ icon: Icon, label }) {
  return (
    <div className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border border-cyan-300/25 bg-black/35 px-5 py-4 text-sm font-bold text-cyan-50 shadow-[0_0_24px_rgba(14,165,233,0.13)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-200/60">
      <Icon className="h-5 w-5 text-cyan-200" />
      {label}
    </div>
  );
}

function Nav({ dark, user, onToggle, onLogout }) {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/45 bg-cyan-400/15 text-white shadow-[0_0_28px_rgba(14,165,233,0.45)]"><span className="font-cyber text-2xl font-black">K</span></div>
        <div>
          <p className="font-cyber text-xl font-black tracking-wide text-white">Kairo Scholar</p>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/75">astute-hoop-vision-pro.com</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden rounded-full border border-cyan-300/20 bg-black/35 px-4 py-2 text-sm font-bold text-cyan-100/80 sm:inline-flex">{user.username}</span>
        <button onClick={onToggle} className="touch-target rounded-full border border-cyan-300/20 bg-black/35 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5" aria-label="Toggle dark mode">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={onLogout} className="touch-target rounded-full border border-cyan-300/20 bg-black/35 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5" aria-label="Log out">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

function Stat({ icon: Icon, value, label }) {
  return <div className="rounded-3xl border border-cyan-300/20 bg-black/35 p-4 shadow-[0_0_24px_rgba(14,165,233,0.12)] backdrop-blur"><Icon className="mb-3 h-6 w-6 text-cyan-200" /><p className="text-lg font-extrabold text-white">{value}</p><p className="text-sm text-cyan-100/62">{label}</p></div>;
}

function TimerCard({ timerLabel, running, onToggle, onReset }) {
  return <Card><div className="flex items-center justify-between"><p className="font-bold">Study timer</p><Clock3 className="h-5 w-5 text-cyan-200" /></div><p className="mt-3 font-cyber text-5xl">{timerLabel}</p><div className="mt-4 flex gap-2"><button onClick={onToggle} className="touch-target flex-1 rounded-xl border border-cyan-200/50 bg-cyan-400/20 px-4 py-3 font-bold text-white">{running ? 'Pause' : 'Focus'}</button><button onClick={onReset} className="touch-target rounded-xl border border-cyan-300/20 px-4 py-3"><TimerReset className="h-5 w-5" /></button></div></Card>;
}

function ProgressCard({ completion }) {
  return <Card><div className="flex items-center justify-between"><p className="font-bold">Progress tracker</p><CheckCircle2 className="h-5 w-5 text-cyan-200" /></div><div className="mt-4 h-3 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all shadow-[0_0_18px_rgba(103,232,249,0.7)]" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-sm font-semibold text-cyan-100/65">{completion}% study flow completed</p></Card>;
}

function SavedSessions({ sessions, onLoad }) {
  return <Card><p className="font-bold">Previous sessions</p><div className="mt-3 space-y-2">{sessions.length ? sessions.map((session) => <button key={session.id} onClick={() => onLoad(session)} className="w-full rounded-xl border border-cyan-300/20 bg-black/20 p-3 text-left text-sm transition hover:border-cyan-200/60"><span className="line-clamp-1 font-bold">{session.title}</span><span className="text-xs text-cyan-100/45">{new Date(session.createdAt).toLocaleDateString()}</span></button>) : <p className="text-sm text-cyan-100/45">Generated guides will appear here.</p>}</div></Card>;
}

function EmptyState() {
  return <div className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/70 p-10 text-center shadow-[0_0_42px_rgba(14,165,233,0.16)] backdrop-blur"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(14,165,233,0.35)]"><Flame className="h-9 w-9" /></div><h2 className="mt-6 font-cyber text-4xl">Kairo results will appear here.</h2><p className="mx-auto mt-3 max-w-xl text-cyan-100/65">Generate a guide to unlock the study guide, flashcards, practice quiz, vocabulary terms, and export tools.</p></div>;
}

function Results({ guide, activeCard, setActiveCard, quizAnswers, setQuizAnswers, onPdf, onHarderQuiz, onSimplify, simpleExplanation }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card large>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><p className="text-sm font-extrabold uppercase tracking-[0.24em] text-cyan-200/75">Results page</p><h2 className="mt-2 font-cyber text-4xl sm:text-5xl">{guide.title}</h2></div>
          <button onClick={onPdf} className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/60 bg-cyan-400/20 px-5 py-4 font-extrabold text-white shadow-[0_0_30px_rgba(14,165,233,0.3)] transition hover:-translate-y-0.5"><Download className="h-5 w-5" />Download PDF</button>
        </div>
      </Card>

      <Section title="Clean Summary" items={guide.summary.map((item) => item.text)} />

      <Card large>
        <h3 className="font-cyber text-3xl">Study Guide</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {guide.studyGuide.map((section, index) => <div key={`${section.heading}-${index}`} className="rounded-2xl border border-cyan-300/15 bg-black/25 p-5"><h4 className="text-xl font-extrabold">{section.heading}</h4><ul className="mt-3 space-y-2 text-cyan-100/70">{section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>- {bullet}</li>)}</ul><button onClick={() => onSimplify(section.bullets[0])} className="mt-4 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">Simplify this concept</button></div>)}
        </div>
        {simpleExplanation && <p className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 font-semibold text-cyan-50">{simpleExplanation}</p>}
      </Card>

      <Card large>
        <h3 className="font-cyber text-3xl">Flashcards</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {guide.flashcards.map((card, index) => <button key={index} onClick={() => setActiveCard(activeCard === index ? null : index)} className="min-h-44 rounded-3xl border border-cyan-300/25 bg-cyan-400/10 p-5 text-left text-white shadow-[0_0_28px_rgba(14,165,233,0.18)] transition hover:-translate-y-1"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-200">Card {index + 1}</p><p className="mt-4 text-xl font-extrabold">{activeCard === index ? card.back : card.front}</p><p className="mt-4 text-sm opacity-75">Tap to flip</p></button>)}
        </div>
      </Card>

      <Card large>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h3 className="font-cyber text-3xl">Practice Quiz</h3><button onClick={onHarderQuiz} className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/50 bg-cyan-400/15 px-4 py-3 font-bold text-white"><RotateCcw className="h-4 w-4" />Make harder questions</button></div>
        <div className="mt-5 space-y-4">{guide.quiz.map((item, index) => <div key={index} className="rounded-2xl border border-cyan-300/15 bg-black/25 p-5"><p className="font-extrabold">{index + 1}. {item.question}</p><div className="mt-3 grid gap-2">{item.choices.map((choice, choiceIndex) => { const letter = String.fromCharCode(65 + choiceIndex); const picked = quizAnswers[index] === letter; return <button key={letter} onClick={() => setQuizAnswers({ ...quizAnswers, [index]: letter })} className={`rounded-xl border p-3 text-left text-sm transition ${picked ? 'border-cyan-200 bg-cyan-300/15' : 'border-cyan-300/15 bg-black/20'}`}><strong>{letter}.</strong> {choice}</button>; })}</div>{quizAnswers[index] && <p className="mt-3 text-sm font-semibold text-cyan-100/65">Answer: {item.answer}. {item.explanation}</p>}</div>)}</div>
      </Card>

      <Card large>
        <h3 className="font-cyber text-3xl">Important Vocabulary</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{guide.terms.map((term, index) => <div key={index} className="rounded-2xl border border-cyan-300/15 bg-black/25 p-4"><p className="font-extrabold text-cyan-200">{term.term}</p><p className="mt-2 text-sm text-cyan-100/65">{term.definition}</p></div>)}</div>
      </Card>
    </motion.div>
  );
}

function Section({ title, items }) {
  return <Card large><h3 className="font-cyber text-3xl">{title}</h3><div className="mt-5 grid gap-3">{items.map((item, index) => <p key={index} className="rounded-2xl border border-cyan-300/15 bg-black/25 p-4 text-lg leading-8 text-cyan-100/75">{item}</p>)}</div></Card>;
}

function Card({ children, large = false }) {
  return <div className={`rounded-[1.6rem] border border-cyan-300/20 bg-slate-950/72 text-cyan-50 shadow-[0_0_34px_rgba(14,165,233,0.13)] backdrop-blur-xl ${large ? 'p-5 sm:p-7' : 'p-5'}`}>{children}</div>;
}
