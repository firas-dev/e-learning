import { Smile, AlertCircle, Frown, Zap, Heart, Brain } from 'lucide-react';

interface EmotionIndicatorProps {
  emotion: 'engaged' | 'confused' | 'bored' | 'neutral' | 'excited' | 'frustrated';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function EmotionIndicator({ emotion, size = 'md', showLabel = false }: EmotionIndicatorProps) {
  const emotionConfig = {
    engaged: {
      icon: Heart,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      label: 'Engaged',
    },
    confused: {
      icon: Brain,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      label: 'Confused',
    },
    bored: {
      icon: Frown,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      label: 'Bored',
    },
    neutral: {
      icon: Smile,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      label: 'Neutral',
    },
    excited: {
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      label: 'Excited',
    },
    frustrated: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      label: 'Frustrated',
    },
  };

  const config = emotionConfig[emotion];
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const bgSizeClasses = {
    sm: 'w-6 h-6 p-0.5',
    md: 'w-10 h-10 p-1.5',
    lg: 'w-14 h-14 p-2',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${config.bgColor} rounded-full flex items-center justify-center ${bgSizeClasses[size]}`}>
        <IconComponent className={`${config.color} ${sizeClasses[size]}`} />
      </div>
      {showLabel && <span className="text-sm font-medium text-gray-700">{config.label}</span>}
    </div>
  );
}
