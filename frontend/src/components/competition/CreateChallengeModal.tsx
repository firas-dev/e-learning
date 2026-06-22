import { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { IChallenge } from "../../hooks/useCompetition";

interface Props {
  onClose: () => void;
  onCreate: (data: Partial<IChallenge>) => Promise<void>;
}

/* Shared field + label styles — self-contained, no dependency on global .input/.label */
const field =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";
const sectionLabel = "text-xs font-semibold uppercase tracking-wider text-gray-400";

const TYPES = [
  { value: "quiz", icon: "📝", label: "Quiz" },
  { value: "coding", icon: "💻", label: "Coding" },
  { value: "assignment", icon: "📋", label: "Assignment" },
  { value: "mini_project", icon: "🚀", label: "Mini Project" },
  { value: "timed", icon: "⏱️", label: "Timed" },
] as const;

const DIFFS = [
  { value: "easy", label: "Easy", dot: "bg-emerald-500", active: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "medium", label: "Medium", dot: "bg-amber-500", active: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "hard", label: "Hard", dot: "bg-rose-500", active: "border-rose-300 bg-rose-50 text-rose-700" },
] as const;

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-violet-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function CreateChallengeModal({ onClose, onCreate }: Props) {
  const [form, setForm] = useState({
    title:             "",
    description:       "",
    type:              "quiz" as IChallenge["type"],
    difficulty:        "medium" as IChallenge["difficulty"],
    totalPoints:       100,
    bonusPoints:       0,
    startsAt:          "",
    endsAt:            "",
    timeLimitMinutes:  undefined as number | undefined,
    hideLeaderboard:   false,
    allowResubmission: true,
    status:            "upcoming" as "draft" | "upcoming",
  });

  const [questions, setQuestions] = useState<
    { text: string; type: "mcq" | "short_answer"; options: { label: string; isCorrect: boolean }[]; points: number }[]
  >([]);
  const [hints, setHints] = useState<{ text: string; pointsCost: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const addQuestion = () =>
    setQuestions((prev) => [
      ...prev,
      { text: "", type: "mcq", options: [{ label: "", isCorrect: false }, { label: "", isCorrect: false }], points: 10 },
    ]);

  const addHint = () => setHints((prev) => [...prev, { text: "", pointsCost: 0 }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim() || !form.startsAt || !form.endsAt) {
      setError("Fill in the title, description and schedule to continue.");
      return;
    }
    if (new Date(form.startsAt) >= new Date(form.endsAt)) {
      setError("The start time must come before the end time.");
      return;
    }
    if (form.type === "quiz" && questions.length === 0) {
      setError("Add at least one question to the quiz.");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        ...form,
        totalPoints:      Number(form.totalPoints),
        bonusPoints:      Number(form.bonusPoints),
        timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : undefined,
        startsAt:         form.startsAt as any,
        endsAt:           form.endsAt as any,
        questions:        form.type === "quiz" ? (questions as any) : undefined,
        hints,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't create the challenge. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm sm:items-center"
      style={{ backgroundColor: "rgba(15, 12, 30, 0.55)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">New challenge</h2>
              <p className="text-sm text-gray-500">Set it up, then publish it to your room.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {/* Basics */}
          <section className="space-y-4">
            <p className={sectionLabel}>Basics</p>

            <div>
              <label className={labelCls}>
                Title <span className="text-violet-500">*</span>
              </label>
              <input
                className={field}
                placeholder="e.g. Binary Search Quiz"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>
                Description <span className="text-violet-500">*</span>
              </label>
              <textarea
                className={`${field} resize-none`}
                rows={3}
                placeholder="What should students expect? Explain the goal and the rules."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Type tiles */}
            <div>
              <label className={labelCls}>Type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TYPES.map((t) => {
                  const active = form.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set("type", t.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-all ${
                        active
                          ? "border-violet-400 bg-violet-50 text-violet-700 ring-2 ring-violet-100"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty pills */}
            <div>
              <label className={labelCls}>Difficulty</label>
              <div className="flex gap-2">
                {DIFFS.map((d) => {
                  const active = form.difficulty === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => set("difficulty", d.value)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        active ? d.active : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${d.dot}`} />
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Scoring */}
          <section className="space-y-4 border-t border-gray-100 pt-7">
            <p className={sectionLabel}>Scoring</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>
                  Total points <span className="text-violet-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    className={`${field} pr-12`}
                    value={form.totalPoints}
                    onChange={(e) => set("totalPoints", e.target.value)}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                    pts
                  </span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Speed bonus</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    className={`${field} pr-12`}
                    value={form.bonusPoints}
                    onChange={(e) => set("bonusPoints", e.target.value)}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                    pts
                  </span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Time limit</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    placeholder="Optional"
                    className={`${field} pr-12`}
                    value={form.timeLimitMinutes ?? ""}
                    onChange={(e) => set("timeLimitMinutes", e.target.value || undefined)}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                    min
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Schedule & visibility */}
          <section className="space-y-4 border-t border-gray-100 pt-7">
            <p className={sectionLabel}>Schedule & visibility</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>
                  Starts at <span className="text-violet-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={field}
                  value={form.startsAt}
                  onChange={(e) => set("startsAt", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Ends at <span className="text-violet-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={field}
                  value={form.endsAt}
                  onChange={(e) => set("endsAt", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "draft", title: "Draft", desc: "Hidden from students" },
                  { value: "upcoming", title: "Scheduled", desc: "Visible & runs on time" },
                ].map((s) => {
                  const active = form.status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set("status", s.value)}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${
                        active
                          ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${active ? "text-violet-700" : "text-gray-800"}`}>{s.title}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Options */}
          <section className="space-y-3 border-t border-gray-100 pt-7">
            <p className={sectionLabel}>Options</p>
            {[
              {
                key: "hideLeaderboard",
                title: "Hide leaderboard until the end",
                desc: "Students see rankings only after the challenge closes.",
              },
              { key: "allowResubmission", title: "Allow resubmission", desc: "Students can submit more than once." },
            ].map((o) => (
              <div
                key={o.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{o.title}</p>
                  <p className="text-xs text-gray-500">{o.desc}</p>
                </div>
                <Switch on={(form as any)[o.key]} onToggle={() => set(o.key, !(form as any)[o.key])} />
              </div>
            ))}
          </section>

          {/* Quiz questions */}
          {form.type === "quiz" && (
            <section className="overflow-hidden rounded-2xl border border-violet-200">
              <div className="flex items-center justify-between gap-2 border-b border-violet-200 bg-violet-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-violet-800">Quiz questions</span>
                  {questions.length > 0 && (
                    <span className="rounded-full bg-violet-200 px-2 py-0.5 text-xs font-semibold text-violet-700">
                      {questions.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </button>
              </div>

              <div className="space-y-4 p-4">
                {questions.length === 0 ? (
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 py-8 transition-colors hover:border-violet-400 hover:bg-violet-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                      <Plus className="h-5 w-5 text-violet-500" />
                    </span>
                    <span className="text-sm font-medium text-violet-600">Add your first question</span>
                    <span className="text-xs text-gray-400">Multiple choice or short answer</span>
                  </button>
                ) : (
                  questions.map((q, qi) => (
                    <div key={qi} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                          {qi + 1}
                        </span>
                        <input
                          className={`${field} flex-1`}
                          placeholder={`Question ${qi + 1}`}
                          value={q.text}
                          onChange={(e) => {
                            const copy = [...questions];
                            copy[qi].text = e.target.value;
                            setQuestions(copy);
                          }}
                        />
                        <select
                          className={`${field} w-36 flex-shrink-0`}
                          value={q.type}
                          onChange={(e) => {
                            const copy = [...questions];
                            copy[qi].type = e.target.value as any;
                            if (e.target.value === "mcq" && copy[qi].options.length < 2) {
                              copy[qi].options = [{ label: "", isCorrect: false }, { label: "", isCorrect: false }];
                            }
                            setQuestions(copy);
                          }}
                        >
                          <option value="mcq">Multiple choice</option>
                          <option value="short_answer">Short answer</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                          className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {q.type === "mcq" && (
                        <div className="ml-8 space-y-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${qi}`}
                                checked={opt.isCorrect}
                                onChange={() => {
                                  const copy = [...questions];
                                  copy[qi].options = copy[qi].options.map((o, i) => ({ ...o, isCorrect: i === oi }));
                                  setQuestions(copy);
                                }}
                                className="h-4 w-4 flex-shrink-0 accent-violet-600"
                                title="Mark as the correct answer"
                              />
                              <input
                                className={`${field} flex-1`}
                                placeholder={`Option ${oi + 1}`}
                                value={opt.label}
                                onChange={(e) => {
                                  const copy = [...questions];
                                  copy[qi].options[oi].label = e.target.value;
                                  setQuestions(copy);
                                }}
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...questions];
                                    copy[qi].options = copy[qi].options.filter((_, i) => i !== oi);
                                    setQuestions(copy);
                                  }}
                                  className="p-1 text-gray-300 transition-colors hover:text-red-400"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...questions];
                                copy[qi].options.push({ label: "", isCorrect: false });
                                setQuestions(copy);
                              }}
                              className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
                            >
                              <Plus className="h-3 w-3" /> Add option
                            </button>
                            <span className="text-xs text-gray-400">Pick the radio to mark the correct answer</span>
                          </div>
                        </div>
                      )}

                      <div className="ml-8 flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500">Points</label>
                        <input
                          type="number"
                          min={1}
                          className={`${field} w-20`}
                          value={q.points}
                          onChange={(e) => {
                            const copy = [...questions];
                            copy[qi].points = Number(e.target.value);
                            setQuestions(copy);
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}

                {questions.length > 0 && (
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Plus className="h-4 w-4" /> Add another question
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Hints */}
          <section className="space-y-3 border-t border-gray-100 pt-7">
            <div className="flex items-center justify-between">
              <p className={sectionLabel}>
                Hints <span className="font-normal normal-case tracking-normal text-gray-400">· optional</span>
              </p>
              <button
                type="button"
                onClick={addHint}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add hint
              </button>
            </div>
            {hints.length === 0 ? (
              <p className="text-xs text-gray-400">Hints can cost points when a student reveals them.</p>
            ) : (
              hints.map((h, hi) => (
                <div key={hi} className="flex items-start gap-2">
                  <input
                    className={`${field} flex-1`}
                    placeholder="Hint text…"
                    value={h.text}
                    onChange={(e) => {
                      const copy = [...hints];
                      copy[hi].text = e.target.value;
                      setHints(copy);
                    }}
                  />
                  <div className="relative w-28">
                    <input
                      type="number"
                      min={0}
                      className={`${field} pr-12`}
                      placeholder="Cost"
                      value={h.pointsCost}
                      onChange={(e) => {
                        const copy = [...hints];
                        copy[hi].pointsCost = Number(e.target.value);
                        setHints(copy);
                      }}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      pts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHints((prev) => prev.filter((_, i) => i !== hi))}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creating…" : "Create challenge"}
          </button>
        </div>
      </form>
    </div>
  );
}