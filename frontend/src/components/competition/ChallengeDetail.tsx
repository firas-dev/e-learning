import { useState, useEffect } from "react";
import {
  ArrowLeft, Send, Lightbulb, Trophy, MessageSquare,
  Loader2, CheckCircle, Star, Clock, AlertCircle,
  ChevronDown, ChevronUp, Upload, X, Eye,
} from "lucide-react";
import { useCompetition, IChallenge, ISubmission, IThread } from "../../hooks/useCompetition";
import CountdownTimer from "./CountdownTimer";

interface Props {
  roomId: string;
  challengeId: string;
  currentUserId: string;
  currentUserName: string;
  isTeacher: boolean;
  onBack: () => void;
}

type Tab = "challenge" | "leaderboard" | "discussion";

const DIFFICULTY_COLOR = {
  easy:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard:   "bg-red-100 text-red-700 border-red-200",
};

export default function ChallengeDetail({
  roomId, challengeId, currentUserId, currentUserName, isTeacher, onBack,
}: Props) {
  const {
    submitChallenge, getMySubmission, getChallengeLeaderboard,
    startTimer, getHints, useHint,
    getThreads, postThread, reactToThread, deleteThread,
    gradeSubmission, getSubmissions,
  } = useCompetition(roomId);

  // Core state
  const [challenge, setChallenge]         = useState<IChallenge | null>(null);
  const [mySubmission, setMySubmission]   = useState<ISubmission | null>(null);
  const [leaderboard, setLeaderboard]     = useState<any[]>([]);
  const [hints, setHints]                 = useState<{ index: number; pointsCost: number; revealed: boolean; text?: string }[]>([]);
  const [threads, setThreads]             = useState<IThread[]>([]);
  const [submissions, setSubmissions]     = useState<any[]>([]); // teacher view
  const [timerExpiry, setTimerExpiry]     = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState<Tab>("challenge");

  // Quiz answers
  const [quizAnswers, setQuizAnswers]   = useState<Record<string, string>>({});
  const [textAnswer, setTextAnswer]     = useState("");
  const [files, setFiles]               = useState<File[]>([]);

  // UI state
  const [submitting, setSubmitting]     = useState(false);
  const [submitResult, setSubmitResult] = useState<{ newBadges: any[]; newPoints: number } | null>(null);
  const [submitError, setSubmitError]   = useState("");
  const [hintLoading, setHintLoading]   = useState<number | null>(null);
  const [threadText, setThreadText]     = useState("");
  const [postingThread, setPostingThread] = useState(false);
  const [replyTo, setReplyTo]           = useState<IThread | null>(null);
  const [showHints, setShowHints]       = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  // Grade state (teacher)
  const [gradingId, setGradingId]       = useState<string | null>(null);
  const [gradeScore, setGradeScore]     = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState("");

  useEffect(() => {
    loadAll();
  }, [challengeId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [cRes, sub, lb, h, th] = await Promise.all([
        fetch(`http://localhost:5000/api/rooms/${roomId}/challenges/${challengeId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then((r) => r.json()),
        getMySubmission(challengeId),
        getChallengeLeaderboard(challengeId),
        getHints(challengeId),
        getThreads(challengeId),
      ]);
      setChallenge(cRes);
      setMySubmission(sub);
      setLeaderboard(Array.isArray(lb) ? lb : []);
      setHints(h);
      setThreads(th);

      if (isTeacher) {
        const subs = await getSubmissions(challengeId);
        setSubmissions(subs);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Timer start ──────────────────────────────────────────────────
  async function handleStartTimer() {
    if (!challenge?.timeLimitMinutes) return;
    const res = await startTimer(challengeId);
    setTimerExpiry(res.expiresAt);
    setTimerStarted(true);
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!challenge) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const fd = new FormData();
      if (challenge.type === "quiz") {
        const answers = (challenge.questions ?? []).map((q) => ({
          questionId: q._id,
          answer: quizAnswers[q._id] ?? "",
        }));
        fd.append("answers", JSON.stringify(answers));
      } else {
        fd.append("answers", JSON.stringify([{ answer: textAnswer }]));
        files.forEach((f) => fd.append("files", f));
      }
      const result = await submitChallenge(challengeId, fd);
      setMySubmission(result.submission);
      setSubmitResult(result.gamification);
      const lb = await getChallengeLeaderboard(challengeId);
      setLeaderboard(Array.isArray(lb) ? lb : []);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Hint reveal ──────────────────────────────────────────────────
  async function handleUseHint(idx: number) {
    setHintLoading(idx);
    try {
      const res = await useHint(challengeId, idx);
      setHints((prev) =>
        prev.map((h) => h.index === idx ? { ...h, revealed: true, text: res.hint } : h)
      );
    } finally {
      setHintLoading(null);
    }
  }

  // ── Thread ───────────────────────────────────────────────────────
  async function handlePostThread() {
    if (!threadText.trim()) return;
    setPostingThread(true);
    try {
      const t = await postThread(challengeId, threadText.trim(), replyTo?._id);
      setThreads((prev) => [...prev, t]);
      setThreadText("");
      setReplyTo(null);
    } finally {
      setPostingThread(false);
    }
  }

  async function handleReact(threadId: string, emoji: string) {
    const updated = await reactToThread(challengeId, threadId, emoji);
    setThreads((prev) => prev.map((t) => t._id === threadId ? updated : t));
  }

  async function handleDeleteThread(threadId: string) {
    await deleteThread(challengeId, threadId);
    setThreads((prev) => prev.filter((t) => t._id !== threadId));
  }

  // ── Grade ────────────────────────────────────────────────────────
  async function handleGrade(submissionId: string) {
    await gradeSubmission(challengeId, submissionId, gradeScore, gradeFeedback);
    setGradingId(null);
    setGradeScore(0);
    setGradeFeedback("");
    const subs = await getSubmissions(challengeId);
    setSubmissions(subs);
  }

  // ── Thread tree ──────────────────────────────────────────────────
  const rootThreads  = threads.filter((t) => !t.parentId);
  const getReplies   = (parentId: string) => threads.filter((t) => t.parentId === parentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">Challenge not found.</p>
        <button onClick={onBack} className="mt-4 text-sm text-violet-600 hover:underline">← Go back</button>
      </div>
    );
  }

  const isActive    = challenge.status === "active";
  const isCompleted = challenge.status === "completed";
  const canSubmit   = isActive && !mySubmission || (isActive && challenge.allowResubmission);
  const needsTimer  = !!challenge.timeLimitMinutes && !timerStarted && !mySubmission;
  const effectiveExpiry = timerExpiry ?? challenge.endsAt;

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{challenge.title}</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLOR[challenge.difficulty]}`}>
              {challenge.difficulty}
            </span>
            <span className="text-xs text-violet-600 font-semibold">⭐ {challenge.totalPoints} pts</span>
            {isActive && <span className="flex items-center gap-1 text-xs text-red-600 font-bold"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE</span>}
            {isCompleted && <span className="text-xs text-gray-400">Completed</span>}
          </div>
        </div>
        {isActive && <CountdownTimer endsAt={effectiveExpiry} compact />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(["challenge", "leaderboard", "discussion"] as Tab[]).map((t) => {
          const icons = { challenge: "📋", leaderboard: "🏆", discussion: "💬" };
          const labels = { challenge: "Challenge", leaderboard: "Leaderboard", discussion: "Discussion" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>{icons[t]}</span>
              <span className="hidden sm:inline">{labels[t]}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: Challenge ─────────────────────────────────────────── */}
      {tab === "challenge" && (
        <div className="space-y-4">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{challenge.description}</p>
          </div>

          {/* Submission result toast */}
          {submitResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">Submitted! +{submitResult.newPoints} pts total</p>
                {submitResult.newBadges.length > 0 && (
                  <p className="text-sm text-green-700 mt-1">
                    New badges: {submitResult.newBadges.map((b) => `${b.icon} ${b.name}`).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Already submitted */}
          {mySubmission && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="font-semibold text-violet-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Your latest submission
              </p>
              <div className="flex gap-6 mt-2 text-sm">
                <span className="text-gray-600">Score: <strong className="text-gray-900">{mySubmission.totalScore} pts</strong></span>
                <span className="text-gray-600">Status: <strong className="capitalize">{mySubmission.status.replace("_"," ")}</strong></span>
                <span className="text-gray-600">Attempt #{mySubmission.attemptNumber}</span>
              </div>
              {mySubmission.feedback && (
                <p className="mt-2 text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-violet-100">
                  💬 {mySubmission.feedback}
                </p>
              )}
            </div>
          )}

          {/* Timer gating */}
          {isActive && needsTimer && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-semibold text-amber-800 mb-1">Time-limited challenge</p>
              <p className="text-sm text-amber-600 mb-4">
                You have <strong>{challenge.timeLimitMinutes} minutes</strong> once you start.
              </p>
              <button
                onClick={handleStartTimer}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
              >
                Start my timer
              </button>
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && isActive && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowHints((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Hints ({hints.length})</span>
                {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showHints && (
                <div className="px-5 pb-4 space-y-3 border-t border-gray-100">
                  {hints.map((h) => (
                    <div key={h.index} className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <span className="text-amber-500 text-lg flex-shrink-0">💡</span>
                      <div className="flex-1 min-w-0">
                        {h.revealed ? (
                          <p className="text-sm text-gray-700">{h.text}</p>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-500 mb-2">Hidden hint</p>
                            <button
                              onClick={() => handleUseHint(h.index)}
                              disabled={hintLoading === h.index}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {hintLoading === h.index ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                              Reveal {h.pointsCost > 0 ? `(−${h.pointsCost} pts)` : "(free)"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quiz form */}
          {isActive && !needsTimer && canSubmit && challenge.type === "quiz" && challenge.questions?.length && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <h3 className="font-bold text-gray-900">Questions</h3>
              {challenge.questions.map((q, qi) => (
                <div key={q._id} className="space-y-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {qi + 1}. {q.text}
                    <span className="ml-2 text-xs text-violet-600">({q.points} pts)</span>
                  </p>
                  {q.type === "mcq" && q.options ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt.label}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            quizAnswers[q._id] === opt.label
                              ? "border-violet-500 bg-violet-50"
                              : "border-gray-200 hover:border-violet-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q._id}
                            value={opt.label}
                            checked={quizAnswers[q._id] === opt.label}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [q._id]: opt.label }))}
                            className="accent-violet-600"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Your answer…"
                      value={quizAnswers[q._id] ?? ""}
                      onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                  )}
                </div>
              ))}
              {submitError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />{submitError}
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Submitting…" : mySubmission ? "Resubmit" : "Submit Quiz"}
              </button>
            </div>
          )}

          {/* Text/file submission for non-quiz */}
          {isActive && !needsTimer && canSubmit && challenge.type !== "quiz" && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Your Submission</h3>
              <textarea
                placeholder="Describe your solution or paste your code here…"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm resize-none"
              />
              {/* File upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Attach files (optional)
                </label>
                <div
                  onClick={() => document.getElementById("submission-file-input")?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-violet-400 rounded-xl p-4 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Click to attach files</p>
                </div>
                <input
                  id="submission-file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2 mt-2">
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              {submitError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />{submitError}
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !textAnswer.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Submitting…" : mySubmission ? "Resubmit" : "Submit"}
              </button>
            </div>
          )}

          {/* Teacher: grade submissions */}
          {isTeacher && submissions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Submissions to grade ({submissions.length})</h3>
              {submissions.map((sub: any) => (
                <div key={sub._id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <p className="font-semibold text-gray-800 text-sm">{sub.studentId?.fullName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      sub.status === "graded" ? "bg-green-100 text-green-700" :
                      sub.status === "auto_graded" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{sub.status.replace("_"," ")}</span>
                  </div>
                  {sub.answers?.map((a: any, i: number) => (
                    <div key={i} className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-1">
                      <span className="font-medium">Answer {i+1}:</span> {a.answer || "(file)"}
                      {a.isCorrect !== undefined && (
                        <span className={`ml-2 text-xs font-bold ${a.isCorrect ? "text-green-600" : "text-red-500"}`}>
                          {a.isCorrect ? "✓" : "✗"} {a.earnedPoints ?? 0}pts
                        </span>
                      )}
                    </div>
                  ))}
                  {sub.status === "pending" && (
                    gradingId === sub._id ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-semibold text-gray-600 w-12">Score</label>
                          <input
                            type="number"
                            min={0}
                            max={challenge.totalPoints}
                            value={gradeScore}
                            onChange={(e) => setGradeScore(Number(e.target.value))}
                            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                          />
                          <span className="text-xs text-gray-400">/ {challenge.totalPoints}</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Feedback (optional)"
                          value={gradeFeedback}
                          onChange={(e) => setGradeFeedback(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setGradingId(null)} className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
                          <button
                            onClick={() => handleGrade(sub._id)}
                            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium"
                          >
                            Save grade
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setGradingId(sub._id); setGradeScore(0); setGradeFeedback(""); }}
                        className="mt-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium"
                      >
                        Grade this submission
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Leaderboard ───────────────────────────────────────── */}
      {tab === "leaderboard" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {Array.isArray(leaderboard) && leaderboard.length > 0 && (leaderboard[0] as any).hidden ? (
            <div className="py-16 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-600">Leaderboard is hidden</p>
              <p className="text-sm text-gray-400 mt-1">Results will be revealed when the challenge ends.</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No submissions yet.</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Challenge Rankings
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {leaderboard.map((e: any) => (
                  <div
                    key={e.student?._id ?? e.rank}
                    className={`flex items-center gap-3 px-5 py-3 ${
                      e.student?._id === currentUserId ? "bg-violet-50" : ""
                    }`}
                  >
                    <span className="w-7 text-center font-bold text-gray-400 text-sm tabular-nums">
                      {e.rank <= 3 ? ["🥇","🥈","🥉"][e.rank - 1] : `#${e.rank}`}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {e.student?.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {e.student?._id === currentUserId ? "You" : e.student?.fullName}
                      </p>
                      {e.timeTakenSeconds && (
                        <p className="text-xs text-gray-400">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {Math.floor(e.timeTakenSeconds / 60)}m {e.timeTakenSeconds % 60}s
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 tabular-nums">{e.totalScore} pts</p>
                      {e.bonusScore > 0 && (
                        <p className="text-xs text-amber-600">+{e.bonusScore} speed</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Discussion ────────────────────────────────────────── */}
      {tab === "discussion" && (
        <div className="space-y-4">
          {/* Post box */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {replyTo && (
              <div className="flex items-center justify-between mb-2 bg-violet-50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-violet-600 font-medium">
                  Replying to {replyTo.authorName}
                </span>
                <button onClick={() => setReplyTo(null)}>
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {currentUserName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  placeholder={replyTo ? "Write a reply…" : "Ask a question or share an insight…"}
                  value={threadText}
                  onChange={(e) => setThreadText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handlePostThread}
                    disabled={postingThread || !threadText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {postingThread ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Thread list */}
          {rootThreads.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No discussion yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rootThreads.map((t) => (
                <div key={t._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <ThreadItem
                    thread={t}
                    currentUserId={currentUserId}
                    isTeacher={isTeacher}
                    onReact={handleReact}
                    onDelete={handleDeleteThread}
                    onReply={setReplyTo}
                  />
                  {/* Replies */}
                  {getReplies(t._id).length > 0 && (
                    <div className="border-t border-gray-50 bg-gray-50/50 divide-y divide-gray-50">
                      {getReplies(t._id).map((r) => (
                        <ThreadItem
                          key={r._id}
                          thread={r}
                          currentUserId={currentUserId}
                          isTeacher={isTeacher}
                          onReact={handleReact}
                          onDelete={handleDeleteThread}
                          onReply={setReplyTo}
                          isReply
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Thread item sub-component ─────────────────────────────────────────────────
function ThreadItem({
  thread, currentUserId, isTeacher, onReact, onDelete, onReply, isReply = false,
}: {
  thread: IThread;
  currentUserId: string;
  isTeacher: boolean;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onReply: (t: IThread) => void;
  isReply?: boolean;
}) {
  const isOwn = thread.authorId === currentUserId;
  const canDelete = isOwn || isTeacher;
  const EMOJIS = ["👍","🔥","❓","💡","👏"];

  return (
    <div className={`flex gap-3 p-4 ${isReply ? "pl-8" : ""}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        thread.isHint
          ? "bg-amber-100 text-amber-700"
          : thread.authorRole === "teacher"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-600"
      }`}>
        {thread.isHint ? "💡" : thread.authorName?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">
            {thread.authorName}
            {thread.isOwn && " (you)"}
          </span>
          {thread.authorRole === "teacher" && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">Teacher</span>
          )}
          {thread.isHint && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">Official Hint</span>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(thread.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line">{thread.text}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex gap-1">
            {EMOJIS.map((emoji) => {
              const count = thread.reactions.filter((r) => r.emoji === emoji).length;
              const reacted = thread.reactions.some((r) => r.emoji === emoji && r.userId === currentUserId);
              if (count === 0 && !reacted) return null;
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(thread._id, emoji)}
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    reacted ? "bg-violet-100 border-violet-300 text-violet-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {emoji} {count}
                </button>
              );
            })}
            {/* Add reaction */}
            {EMOJIS.map((emoji) => {
              const count = thread.reactions.filter((r) => r.emoji === emoji).length;
              if (count > 0) return null;
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(thread._id, emoji)}
                  className="opacity-0 hover:opacity-100 px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-200 text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-all"
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          {!isReply && (
            <button
              onClick={() => onReply(thread)}
              className="text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors"
            >
              Reply
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(thread._id)}
              className="text-xs text-gray-300 hover:text-red-500 transition-colors ml-auto"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}