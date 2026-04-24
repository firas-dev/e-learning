import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ endsAt, compact = false }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setUrgent(diff < 5 * 60 * 1000); // last 5 min
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-bold tabular-nums px-3 py-1.5 rounded-lg ${
        urgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'
      }`}>
        <Clock className="w-3 h-3" /> {timeLeft}
      </div>
    );
  }

  return (
    <div className={`text-center py-4 rounded-xl font-bold text-3xl tabular-nums ${
      urgent ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-800'
    }`}>
      <Clock className="w-6 h-6 inline mr-2" />
      {timeLeft}
    </div>
  );
}