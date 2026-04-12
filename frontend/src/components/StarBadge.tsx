import { Star } from 'lucide-react';

interface Props {
  average: number;  // 0–5, one decimal
  size?: 'sm' | 'md';
}

/**
 * Compact star badge for course cards.
 * Shows nothing when average is 0 (no ratings yet).
 */
export default function StarBadge({ average, size = 'sm' }: Props) {
  if (!average) return null;

  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1 ${textSize} font-semibold text-yellow-600`}>
      <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
      {average.toFixed(1)}
    </span>
  );
}