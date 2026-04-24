import { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { IChallenge } from "../../hooks/useCompetition";

interface Props {
  onClose: () => void;
  onCreate: (data: Partial<IChallenge>) => Promise<void>;
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
  const [error, setError]   = useState("");

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
      setError("Please fill in all required fields.");
      return;
    }
    if (new Date(form.startsAt) >= new Date(form.endsAt)) {
      setError("Start time must be before end time.");
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
        questions:        form.type === "quiz" ? questions as any : undefined,
        hints,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create challenge.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">New Challenge</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input
                className="input"
                placeholder="e.g. Binary Search Quiz"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Explain the challenge…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="quiz">📝 Quiz</option>
                <option value="coding">💻 Coding</option>
                <option value="assignment">📋 Assignment</option>
                <option value="mini_project">🚀 Mini Project</option>
                <option value="timed">⏱️ Timed</option>
              </select>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
                <option value="easy">🟢 Easy</option>
                <option value="medium">🟡 Medium</option>
                <option value="hard">🔴 Hard</option>
              </select>
            </div>
            <div>
              <label className="label">Points *</label>
              <input type="number" min={1} className="input" value={form.totalPoints} onChange={(e) => set("totalPoints", e.target.value)} required />
            </div>
            <div>
              <label className="label">Speed Bonus Points</label>
              <input type="number" min={0} className="input" value={form.bonusPoints} onChange={(e) => set("bonusPoints", e.target.value)} />
            </div>
            <div>
              <label className="label">Starts At *</label>
              <input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} required />
            </div>
            <div>
              <label className="label">Ends At *</label>
              <input type="datetime-local" className="input" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} required />
            </div>
            <div>
              <label className="label">Per-user Time Limit (min)</label>
              <input type="number" min={1} placeholder="Optional" className="input" value={form.timeLimitMinutes ?? ""} onChange={(e) => set("timeLimitMinutes", e.target.value || undefined)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Draft (hidden)</option>
                <option value="upcoming">Schedule (visible)</option>
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            {[
              { key: "hideLeaderboard",   label: "Hide leaderboard until end" },
              { key: "allowResubmission", label: "Allow resubmission" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-violet-600"
                  checked={(form as any)[key]}
                  onChange={(e) => set(key, e.target.checked)}
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* Quiz questions */}
          {form.type === "quiz" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Questions</h3>
                <button type="button" onClick={addQuestion} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add question
                </button>
              </div>
              {questions.map((q, qi) => (
                <div key={qi} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <input
                      className="input flex-1"
                      placeholder={`Question ${qi + 1}`}
                      value={q.text}
                      onChange={(e) => {
                        const copy = [...questions];
                        copy[qi].text = e.target.value;
                        setQuestions(copy);
                      }}
                    />
                    <select
                      className="input w-36 flex-shrink-0"
                      value={q.type}
                      onChange={(e) => {
                        const copy = [...questions];
                        copy[qi].type = e.target.value as "mcq" | "short_answer";
                        setQuestions(copy);
                      }}
                    >
                      <option value="mcq">MCQ</option>
                      <option value="short_answer">Short answer</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="input w-20 flex-shrink-0"
                      placeholder="pts"
                      value={q.points}
                      onChange={(e) => {
                        const copy = [...questions];
                        copy[qi].points = Number(e.target.value);
                        setQuestions(copy);
                      }}
                    />
                    <button type="button" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))} className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {q.type === "mcq" ? (
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q${qi}-correct`}
                            className="accent-violet-600 flex-shrink-0"
                            checked={opt.isCorrect}
                            onChange={() => {
                              const copy = [...questions];
                              copy[qi].options = copy[qi].options.map((o, i) => ({ ...o, isCorrect: i === oi }));
                              setQuestions(copy);
                            }}
                          />
                          <input
                            className="input flex-1 py-1.5"
                            placeholder={`Option ${oi + 1}`}
                            value={opt.label}
                            onChange={(e) => {
                              const copy = [...questions];
                              copy[qi].options[oi].label = e.target.value;
                              setQuestions(copy);
                            }}
                          />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => {
                              const copy = [...questions];
                              copy[qi].options = copy[qi].options.filter((_, i) => i !== oi);
                              setQuestions(copy);
                            }} className="text-gray-300 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                        const copy = [...questions];
                        copy[qi].options.push({ label: "", isCorrect: false });
                        setQuestions(copy);
                      }} className="text-xs text-violet-500 hover:text-violet-700">
                        + Add option
                      </button>
                      <p className="text-xs text-gray-400">Select the radio button next to the correct answer.</p>
                    </div>
                  ) : (
                    <input
                      className="input"
                      placeholder="Correct answer (exact match)"
                      value={q.options[0]?.label ?? ""}
                      onChange={(e) => {
                        const copy = [...questions];
                        copy[qi].options = [{ label: e.target.value, isCorrect: true }];
                        setQuestions(copy);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hints */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Hints</h3>
              <button type="button" onClick={addHint} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add hint
              </button>
            </div>
            {hints.map((h, hi) => (
              <div key={hi} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder={`Hint ${hi + 1}`}
                  value={h.text}
                  onChange={(e) => {
                    const copy = [...hints];
                    copy[hi].text = e.target.value;
                    setHints(copy);
                  }}
                />
                <input
                  type="number"
                  min={0}
                  className="input w-24 flex-shrink-0"
                  placeholder="Cost (pts)"
                  value={h.pointsCost}
                  onChange={(e) => {
                    const copy = [...hints];
                    copy[hi].pointsCost = Number(e.target.value);
                    setHints(copy);
                  }}
                />
                <button type="button" onClick={() => setHints((prev) => prev.filter((_, i) => i !== hi))} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Creating…" : "Create Challenge"}
            </button>
          </div>
        </form>
      </div>

      {/* Global utility classes injected inline to avoid Tailwind purge */}
      <style>{`
        .label { display: block; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.375rem; }
        .input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.75rem; font-size: 0.875rem; outline: none; transition: box-shadow 0.15s; }
        .input:focus { box-shadow: 0 0 0 2px #7c3aed; border-color: transparent; }
      `}</style>
    </div>
  );
}