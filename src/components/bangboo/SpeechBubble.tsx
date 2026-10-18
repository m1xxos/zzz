import React, { useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { BangbooMood } from '../../types';

export interface SpeechBubbleProps {
  dialogueText: string;
  subtitleText?: string;
  mood?: BangbooMood;
  position?: 'bottom-right' | 'bottom-left';
  mascotName?: string;
  durationMs?: number;
  onDismiss?: () => void;
  showTail?: boolean;
  className?: string;
}

/**
 * Comic-strip styled Speech Bubble for Bangboo companion mascot.
 * Features ZZZ urban streetwear comic aesthetics:
 * - High-contrast electric yellow / white comic balloon with hard 4px black shadow
 * - Stylized comic tail pointing towards Bangboo avatar
 * - Bold Bangboo dialect header + English translation subtitles for Proxy
 * - Optional dismiss button and auto-dismiss timer
 * - Fully tested with required data-testid selectors
 */
export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  dialogueText,
  subtitleText,
  mood = 'idle',
  position = 'bottom-right',
  mascotName = 'EOUS',
  durationMs,
  onDismiss,
  showTail = true,
  className = '',
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss timer if durationMs is specified and onDismiss is provided
  useEffect(() => {
    if (durationMs && durationMs > 0 && onDismiss) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, durationMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [durationMs, onDismiss, dialogueText]);

  // Mood accent color tokens
  const isExcited = mood === 'celebrating' || mood === 'triumphant' || mood === 'happy';

  return (
    <div
      data-testid="bangboo-speech-bubble"
      role="status"
      aria-live="polite"
      className={`relative bg-[#F2FF00] text-[#0D0E12] border-2 border-black rounded-lg p-2.5 sm:p-3 shadow-[4px_4px_0px_#000000] max-w-[240px] sm:max-w-[280px] z-30 transition-all duration-200 select-none ${
        isExcited ? 'animate-bounce' : 'animate-fade-in'
      } ${className}`}
    >
      {/* Top Header Row: Mascot Tag & Dismiss */}
      <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-black/20 text-[10px] font-mono font-bold tracking-wider uppercase">
        <span className="flex items-center gap-1 text-black/80">
          <span className="w-1.5 h-1.5 rounded-full bg-black inline-block animate-pulse" />
          <span>[ // {mascotName} ]</span>
          {isExcited && <Sparkles className="w-3 h-3 text-black animate-spin" />}
        </span>

        {onDismiss && (
          <button
            type="button"
            data-testid="speech-bubble-dismiss"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="Dismiss speech bubble"
            className="text-black/60 hover:text-black hover:scale-110 p-0.5 rounded transition-transform"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Primary Bangboo Dialect Quote */}
      <div
        data-testid="bangboo-dialogue"
        className="font-comic font-black text-xs sm:text-sm tracking-wide uppercase leading-tight text-black break-words"
      >
        {dialogueText}
      </div>

      {/* English Translation Subtitle */}
      {subtitleText && (
        <div
          data-testid="bangboo-subtitle"
          className="font-sans text-[11px] text-black/85 leading-snug mt-1 pt-1 border-t border-black/10 italic break-words"
        >
          {subtitleText}
        </div>
      )}

      {/* Comic Speech Bubble Tail */}
      {showTail && (
        <div
          aria-hidden="true"
          className={`absolute -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#F2FF00] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
            position === 'bottom-left' ? 'left-6' : 'right-6'
          }`}
        />
      )}
    </div>
  );
};

export default SpeechBubble;
