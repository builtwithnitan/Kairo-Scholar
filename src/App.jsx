import { motion } from 'framer-motion';
import {
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
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [dark, setDark] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [activeCard, setActiveCard] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simpleExplanation, setSimpleExplanation] = useState('');
  const fileInputRef = useRef(null);

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
      setUploadedFileName(file.name);
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

  function clearUploadedFile() {
    setUploadedFileName('');
    setNotes('');
    setStatus('Uploaded file removed from this browser view.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;

  if (!currentUser) {
    return <AuthGate onAuthenticated={setCurrentUser} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b1b] text-white transition dark:bg-[#070b1b] dark:text-white">
      <GlassyBackground />
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

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:pt-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-violet-100 backdrop-blur-xl">
            <Sparkles className="h-4 w-4 text-violet-300" />
            Kairo Scholar Free Study Workspace
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-white">Turn Notes Into </span>
              <span className="bg-gradient-to-r from-[#f8c13d] via-[#b987ff] to-[#52d3ff] bg-clip-text text-transparent">Study Guides, Flashcards, Quizzes</span>
              <span className="text-white"> and Review Sheets in Minutes</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Upload notes, paste class material, and let Kairo Scholar organize everything into a clean study workflow with summaries, concepts, practice questions, and exportable PDFs.
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }} className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,18,38,0.88)] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight">Start Studying Now</h2>
            <p className="mt-2 text-sm text-slate-400">Drop in notes and let Kairo organize the material.</p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-slate-200">Upload study material</label>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <input ref={fileInputRef} id="file-upload" type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
              <label htmlFor="file-upload" className="inline-flex cursor-pointer items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(124,58,237,0.45)] transition hover:-translate-y-0.5">
                <FileUp className="h-4 w-4" />
                Upload TXT, PDF, or DOCX
              </label>
              {uploadedFileName ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm text-slate-300">Loaded file: {uploadedFileName}</p>
                  <button onClick={clearUploadedFile} type="button" className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]">
                    Remove uploaded file
                  </button>
                </div>
              ) : null}
              <p className="mt-3 text-sm text-slate-400">Paste text below if you do not want to upload a file.</p>
            </div>

            <label className="block text-sm font-semibold text-slate-200">Notes to transform</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={starterNotes}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-white/10 bg-[#121a33] p-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button onClick={generateGuide} disabled={loading} className="touch-target inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-4 text-base font-extrabold text-white shadow-[0_14px_34px_rgba(124,58,237,0.4)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                <Sparkles className="h-5 w-5" />
                {loading ? 'Generating...' : 'Generate Study Guide'}
              </button>
              <button onClick={() => setNotes(starterNotes)} className="touch-target rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-bold text-slate-200 transition hover:-translate-y-0.5">
                Try sample
              </button>
            </div>

            <div className="rounded-2xl bg-[#10172f] px-4 py-3 text-sm font-medium text-slate-300">
              {status}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="results" className="mx-auto grid max-w-7xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
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
    <main className="relative min-h-screen overflow-hidden bg-[#070b1b] text-white">
      <GlassyBackground />
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_.92fr] lg:px-8">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-violet-100 backdrop-blur-xl">
            <Sparkles className="h-4 w-4 text-violet-300" />
            Free Study Mode
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-white">Create a </span>
            <span className="bg-gradient-to-r from-[#f8c13d] via-[#b987ff] to-[#52d3ff] bg-clip-text text-transparent">Protected Study Workspace</span>
            <span className="text-white"> for Notes, Flashcards, Quizzes and Guides</span>
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            Sign in to keep study sessions organized on this browser and turn uploaded material into review-ready study outputs.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={ShieldCheck} value="Protected" label="Separate users per device" />
            <Stat icon={BrainCircuit} value="Free mode" label="No paid AI calls by default" />
            <Stat icon={Save} value="Saved" label="Stored under each username" />
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} onSubmit={submit} className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,18,38,0.88)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-xl px-4 py-3 font-bold transition ${mode === 'login' ? 'bg-violet-500 text-white shadow-[0_12px_28px_rgba(124,58,237,0.4)]' : 'text-slate-400'}`}>Sign in</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-xl px-4 py-3 font-bold transition ${mode === 'register' ? 'bg-violet-500 text-white shadow-[0_12px_28px_rgba(124,58,237,0.4)]' : 'text-slate-400'}`}>Create account</button>
          </div>

          <label className="mt-6 block text-sm font-bold text-slate-200">Email or username</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121a33] px-4 py-3">
            <User className="h-5 w-5 text-slate-500" />
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-500" placeholder="student@email.com" autoComplete="username" />
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-200">Password</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121a33] px-4 py-3">
            <LockKeyhole className="h-5 w-5 text-slate-500" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-500" placeholder="8+ characters" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
          </div>

          <button disabled={busy} className="mt-6 touch-target w-full rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-4 font-extrabold text-white shadow-[0_14px_34px_rgba(124,58,237,0.4)] transition hover:-translate-y-0.5 disabled:opacity-60">
            {busy ? 'Working...' : mode === 'register' ? 'Create Kairo account' : 'Enter Kairo Scholar'}
          </button>

          <p className="mt-4 text-sm leading-6 text-slate-300">{message}</p>
          <p className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-400/8 p-4 text-xs leading-5 text-amber-100">
            Security note: this prototype login separates local users. Before public launch, use hosted authentication such as Supabase, Clerk, or Auth0. Paid AI is disabled by default to avoid surprise costs.
          </p>
        </motion.form>
      </section>
    </main>
  );
}

function GlassyBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#070b1b]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_70%_20%,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_40%_70%,rgba(255,119,198,0.1),transparent_22%),linear-gradient(180deg,#070b1b,#090f22)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:44px_44px]" />
    </div>
  );
}

function Nav({ dark, user, onToggle, onLogout }) {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[30px] font-black tracking-tight text-white sm:text-[34px]">Kairo Scholar</p>
        </div>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 sm:inline-flex">{user.username}</span>
        <button onClick={onToggle} className="touch-target rounded-full border border-white/10 bg-white/[0.04] p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5" aria-label="Toggle dark mode">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={onLogout} className="touch-target rounded-full border border-white/10 bg-white/[0.04] p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5" aria-label="Log out">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

function Stat({ icon: Icon, value, label }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 backdrop-blur-xl"><Icon className="mb-3 h-6 w-6 text-violet-300" /><p className="text-lg font-extrabold text-white">{value}</p><p className="text-sm text-slate-400">{label}</p></div>;
}

function TimerCard({ timerLabel, running, onToggle, onReset }) {
  return <Card><div className="flex items-center justify-between"><p className="font-bold text-white">Study timer</p><Clock3 className="h-5 w-5 text-violet-300" /></div><p className="mt-3 text-5xl font-black tracking-tight text-white">{timerLabel}</p><div className="mt-4 flex gap-2"><button onClick={onToggle} className="touch-target flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-3 font-bold text-white">{running ? 'Pause' : 'Focus'}</button><button onClick={onReset} className="touch-target rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"><TimerReset className="h-5 w-5" /></button></div></Card>;
}

function ProgressCard({ completion }) {
  return <Card><div className="flex items-center justify-between"><p className="font-bold text-white">Progress tracker</p><CheckCircle2 className="h-5 w-5 text-cyan-300" /></div><div className="mt-4 h-3 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-sm font-semibold text-slate-400">{completion}% study flow completed</p></Card>;
}

function SavedSessions({ sessions, onLoad }) {
  return <Card><p className="font-bold text-white">Previous sessions</p><div className="mt-3 space-y-2">{sessions.length ? sessions.map((session) => <button key={session.id} onClick={() => onLoad(session)} className="w-full rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left text-sm transition hover:border-violet-400/40"><span className="line-clamp-1 font-bold text-slate-100">{session.title}</span><span className="text-xs text-slate-400">{new Date(session.createdAt).toLocaleDateString()}</span></button>) : <p className="text-sm text-slate-400">Generated guides will appear here.</p>}</div></Card>;
}

function EmptyState() {
  return <div className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,18,38,0.8)] p-10 text-center shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white/[0.06] text-violet-300"><Flame className="h-9 w-9" /></div><h2 className="mt-6 text-4xl font-black tracking-tight text-white">Kairo results will appear here.</h2><p className="mx-auto mt-3 max-w-xl text-slate-400">Generate a guide to unlock the study guide, flashcards, practice quiz, vocabulary terms, and export tools.</p></div>;
}

function Results({ guide, activeCard, setActiveCard, quizAnswers, setQuizAnswers, onPdf, onHarderQuiz, onSimplify, simpleExplanation }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card large>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><p className="text-sm font-extrabold uppercase tracking-[0.24em] text-slate-400">Results page</p><h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">{guide.title}</h2></div>
          <button onClick={onPdf} className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 px-5 py-4 font-extrabold text-white shadow-[0_14px_34px_rgba(124,58,237,0.4)] transition hover:-translate-y-0.5"><Download className="h-5 w-5" />Download PDF</button>
        </div>
      </Card>

      <Section title="Clean Summary" items={guide.summary.map((item) => item.text)} />

      <Card large>
        <h3 className="text-3xl font-black tracking-tight text-white">Study Guide</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {guide.studyGuide.map((section, index) => <div key={`${section.heading}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-5"><h4 className="text-xl font-extrabold text-white">{section.heading}</h4><ul className="mt-3 space-y-2 text-slate-300">{section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>- {bullet}</li>)}</ul><button onClick={() => onSimplify(section.bullets[0])} className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">Simplify this concept</button></div>)}
        </div>
        {simpleExplanation && <p className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4 font-semibold text-slate-200">{simpleExplanation}</p>}
      </Card>

      <Card large>
        <h3 className="text-3xl font-black tracking-tight text-white">Flashcards</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {guide.flashcards.map((card, index) => <button key={index} onClick={() => setActiveCard(activeCard === index ? null : index)} className="min-h-44 rounded-3xl border border-white/8 bg-white/[0.04] p-5 text-left shadow-[0_16px_38px_rgba(0,0,0,0.22)] transition hover:-translate-y-1"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Card {index + 1}</p><p className="mt-4 text-xl font-extrabold text-white">{activeCard === index ? card.back : card.front}</p><p className="mt-4 text-sm text-slate-400">Tap to flip</p></button>)}
        </div>
      </Card>

      <Card large>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h3 className="text-3xl font-black tracking-tight text-white">Practice Quiz</h3><button onClick={onHarderQuiz} className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-bold text-white"><RotateCcw className="h-4 w-4" />Make harder questions</button></div>
        <div className="mt-5 space-y-4">{guide.quiz.map((item, index) => <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.04] p-5"><p className="font-extrabold text-white">{index + 1}. {item.question}</p><div className="mt-3 grid gap-2">{item.choices.map((choice, choiceIndex) => { const letter = String.fromCharCode(65 + choiceIndex); const picked = quizAnswers[index] === letter; return <button key={letter} onClick={() => setQuizAnswers({ ...quizAnswers, [index]: letter })} className={`rounded-xl border p-3 text-left text-sm transition ${picked ? 'border-violet-400/50 bg-violet-500/12 text-white' : 'border-white/8 bg-[#121a33] text-slate-300'}`}><strong>{letter}.</strong> {choice}</button>; })}</div>{quizAnswers[index] && <p className="mt-3 text-sm font-semibold text-slate-400">Answer: {item.answer}. {item.explanation}</p>}</div>)}</div>
      </Card>

      <Card large>
        <h3 className="text-3xl font-black tracking-tight text-white">Important Vocabulary</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{guide.terms.map((term, index) => <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"><p className="font-extrabold text-white">{term.term}</p><p className="mt-2 text-sm text-slate-400">{term.definition}</p></div>)}</div>
      </Card>
    </motion.div>
  );
}

function Section({ title, items }) {
  return <Card large><h3 className="text-3xl font-black tracking-tight text-white">{title}</h3><div className="mt-5 grid gap-3">{items.map((item, index) => <p key={index} className="border-b border-white/8 pb-4 text-lg leading-8 text-slate-300">{item}</p>)}</div></Card>;
}

function Card({ children, large = false }) {
  return <div className={`rounded-[1.8rem] border border-white/8 bg-[rgba(12,18,38,0.8)] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl ${large ? 'sm:p-7' : ''}`}>{children}</div>;
}

function DisclaimerFooter() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="rounded-[1.6rem] border border-white/8 bg-[rgba(12,18,38,0.65)] p-5 text-xs leading-6 text-slate-400 backdrop-blur-2xl">
        <p className="font-bold uppercase tracking-[0.24em] text-slate-300">Important Disclaimer</p>
        <p className="mt-3">
          Kairo Scholar is a free study aid for learners age 13+. Do not upload private, sensitive, or confidential information.
          Only upload notes or materials you own or have permission to use. Use generated guides, flashcards, and quizzes for learning and review,
          not cheating or submitting work that is not yours. Free Study Mode is enabled by default and does not use paid AI calls.
        </p>
      </div>
    </footer>
  );
}
