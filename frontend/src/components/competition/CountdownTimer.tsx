import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  endsAt: string | Date;
  compact?: boolean;
  onExpired?: () => void;
}

export default function CountdownTimer({ endsAt, compact = false, onExpired }: Props) {
  const [display, setDisplay] = useState("");
  const [urgent, setUrgent]   = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setDisplay("Ended");
        setExpired(true);
        onExpired?.();
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setUrgent(diff < 5 * 60_000);
      setDisplay(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg transition-colors ${
          expired
            ? "bg-gray-100 text-gray-400"
            : urgent
            ? "bg-red-100 text-red-700 animate-pulse"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        <Clock className="w-3 h-3" />
        {display}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-2xl tabular-nums transition-colors ${
        expired
          ? "bg-gray-50 text-gray-400"
          : urgent
          ? "bg-red-50 text-red-600"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      <Clock className={`w-6 h-6 ${urgent && !expired ? "animate-spin" : ""}`} />
      {display}
    </div>
  );
}