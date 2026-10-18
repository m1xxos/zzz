import React, { useState, useCallback, useRef } from 'react';
import { Minus, Maximize2 } from 'lucide-react';
import { BangbooMood, BangbooDialogue, BangbooPreferences } from '../../types';
import SpeechBubble from './SpeechBubble';
import { BangbooSVG } from './BangbooSVG';
import { soundService } from '../../services/sound';

export interface BangbooWidgetProps {
  mood?: BangbooMood;
  activeDialogue?: BangbooDialogue | null;
  preferences?: BangbooPreferences;
  onPoke?: () => void;
  onDismissDialogue?: () => void;
  onToggleMinimize?: (minimized: boolean) => void;
  renderSVG?: (props: { mood: BangbooMood; className?: string }) => React.ReactNode;
  className?: string;
}

const MOOD_BADGE_CONFIG: Record<
  BangbooMood,
  { label: string; bg: string; text: string; border: string }
> = {
  idle: { label: 'IDLE', bg: 'bg-[#242831]', text: 'text-[#A0A5B5]', border: 'border-[#4A5268]' },
  happy: { label: 'HAPPY', bg: 'bg-[#F2FF00]', text: 'text-[#0D0E12]', border: 'border-black' },
  celebrating: { label: 'CHEER!', bg: 'bg-[#00F0FF]', text: 'text-[#0D0E12]', border: 'border-black' },
  triumphant: { label: 'TRIUMPH', bg: 'bg-[#FF7700]', text: 'text-white', border: 'border-black' },
  thinking: { label: 'PLANNING', bg: 'bg-[#B33BFF]', text: 'text-white', border: 'border-black' },
  sleepy: { label: 'SLEEPY', bg: 'bg-[#1E2127]', text: 'text-[#5C6275]', border: 'border-[#2E3342]' },
  surprised: { label: 'ALERT!', bg: 'bg-[#FF3B30]', text: 'text-white', border: 'border-black' },
};

/**
 * Built-in fallback SVG for Eous Bangboo mascot (compatible with Explorer M5.1).
 */
export const DefaultBangbooAvatar: React.FC<{ mood: BangbooMood; className?: string }> = ({
  mood,
  className = 'w-14 h-14 sm:w-16 sm:h-16',
}) => {
  const isExcited = mood === 'celebrating' || mood === 'happy' || mood === 'triumphant';
  const isSleepy = mood === 'sleepy';
  const isSurprised = mood === 'surprised';

  return (
    <svg
      data-testid="bangboo-svg"
      viewBox="0 0 100 100"
      className={`${className} transition-transform duration-300`}
    >
      {/* Ears / Antennae */}
      <rect
        x="25"
        y={isSleepy ? '14' : '10'}
        width="14"
        height="26"
        rx="7"
        fill="#242831"
        stroke="#F2FF00"
        strokeWidth="3"
        className={isExcited ? 'animate-bangboo-wiggle origin-bottom' : ''}
      />
      <rect
        x="61"
        y={isSleepy ? '14' : '10'}
        width="14"
        height="26"
        rx="7"
        fill="#242831"
        stroke="#F2FF00"
        strokeWidth="3"
        className={isExcited ? 'animate-bangboo-wiggle origin-bottom' : ''}
      />
      <rect x="28" y={isSleepy ? '20' : '16'} width="8" height="14" rx="4" fill="#F2FF00" />
      <rect x="64" y={isSleepy ? '20' : '16'} width="8" height="14" rx="4" fill="#F2FF00" />

      {/* Main Body */}
      <ellipse cx="50" cy="62" rx="36" ry="32" fill="#242831" stroke="#2E3342" strokeWidth="4" />

      {/* White Belly Patch */}
      <ellipse cx="50" cy="66" rx="22" ry="20" fill="#FFFFFF" />

      {/* Digital Visor / Eye Display */}
      <rect
        x="26"
        y="44"
        width="48"
        height="20"
        rx="10"
        fill="#0D0E12"
        stroke="#00F0FF"
        strokeWidth="2"
      />

      {/* Eye Expressions by Mood */}
      {isExcited ? (
        // Happy / Celebrating: Star or Arc eyes (^ ^ or ★ ★)
        <>
          <path
            d="M 36 56 Q 40 47 44 56"
            fill="none"
            stroke="#F2FF00"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 56 56 Q 60 47 64 56"
            fill="none"
            stroke="#F2FF00"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : isSleepy ? (
        // Sleepy: Flat horizontal bars (- -)
        <>
          <line x1="36" y1="54" x2="44" y2="54" stroke="#00F0FF" strokeWidth="3" strokeLinecap="round" />
          <line x1="56" y1="54" x2="64" y2="54" stroke="#00F0FF" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : isSurprised ? (
        // Surprised: Wide exclamation / circle eyes (! !)
        <>
          <circle cx="40" cy="54" r="5" fill="#FF3B30" />
          <circle cx="60" cy="54" r="5" fill="#FF3B30" />
          <circle cx="40" cy="54" r="2" fill="#FFFFFF" />
          <circle cx="60" cy="54" r="2" fill="#FFFFFF" />
        </>
      ) : (
        // Idle / Default: Round digital glowing pupils (● ●)
        <>
          <circle cx="40" cy="54" r="4" fill="#00F0FF" />
          <circle cx="60" cy="54" r="4" fill="#00F0FF" />
          <circle cx="41.5" cy="52.5" r="1.5" fill="#FFFFFF" />
          <circle cx="61.5" cy="52.5" r="1.5" fill="#FFFFFF" />
        </>
      )}

      {/* Red Scarf / Tie Motif */}
      <polygon points="50,70 44,82 56,82" fill="#FF3B30" />
    </svg>
  );
};

/**
 * Bangboo Mascot Companion Widget.
 * Interactive floating mascot companion featuring:
 * - Scalable animated Bangboo avatar (Eous)
 * - Comic speech bubble with dialect quote & English translation subtitles
 * - Poke click trigger with playful audio chirp / bounce animation
 * - Status mood badge (IDLE, HAPPY, TRIUMPH, SLEEPY, ALERT)
 * - Minimize / Expand docking control
 * - Position docking (bottom-right / bottom-left)
 */
export const BangbooWidget: React.FC<BangbooWidgetProps> = ({
  mood = 'idle',
  activeDialogue = null,
  preferences,
  onPoke,
  onDismissDialogue,
  onToggleMinimize,
  renderSVG,
  className = '',
}) => {
  const [internalMinimized, setInternalMinimized] = useState(preferences?.minimized ?? false);
  const [isPoking, setIsPoking] = useState(false);
  const pokeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isMinimized = preferences?.minimized ?? internalMinimized;
  const position = preferences?.position ?? 'bottom-right';
  const voiceEnabled = preferences?.voiceEnabled ?? true;

  // Handle Mascot Poke Interaction
  const handlePoke = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) {
        e.stopPropagation();
      }

      // Trigger animation
      setIsPoking(true);
      if (pokeTimeoutRef.current) clearTimeout(pokeTimeoutRef.current);
      pokeTimeoutRef.current = setTimeout(() => {
        setIsPoking(false);
      }, 450);

      // Play audio cue if voice enabled
      if (voiceEnabled) {
        try {
          if (mood === 'celebrating' || mood === 'triumphant') {
            soundService.playBangbooCheer();
          } else if (mood === 'sleepy') {
            soundService.playBangbooSleep();
          } else {
            soundService.playBangbooChirp();
          }
        } catch {}
      }

      // Call parent poke callback
      if (onPoke) {
        onPoke();
      }
    },
    [mood, onPoke, voiceEnabled]
  );

  // Keyboard accessibility handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePoke(e);
    }
  };

  // Toggle minimize state
  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMinimized;
    setInternalMinimized(next);
    if (onToggleMinimize) {
      onToggleMinimize(next);
    }
  };

  const badgeConfig = MOOD_BADGE_CONFIG[mood] || MOOD_BADGE_CONFIG.idle;

  // Dialogue fallback text
  const dialogueText =
    activeDialogue?.bangbooText ||
    (mood === 'celebrating'
      ? 'Eh-nah!! CLEARED! ★'
      : mood === 'triumphant'
      ? 'En-nah-en!! ALL CLEARED! ★★★'
      : mood === 'happy'
      ? 'Eh-nah! En-nah!'
      : mood === 'sleepy'
      ? 'Zzz... En-nah...'
      : 'Eh-nah! En-nah!');

  const subtitleText =
    activeDialogue?.translation ||
    (mood === 'celebrating'
      ? 'Proxy, commission successfully archived!'
      : mood === 'triumphant'
      ? 'Proxy, all daily commissions cleared! Triumphant victory!'
      : mood === 'happy'
      ? 'Proxy, standing by for dispatch!'
      : mood === 'sleepy'
      ? 'Eous is taking a quick battery recharge nap...'
      : 'Proxy, commissions operational!');

  const showSpeechBubble = activeDialogue !== null || mood !== 'idle';

  // Position alignment CSS
  const positionClasses =
    position === 'bottom-left'
      ? 'fixed bottom-4 left-4 items-start'
      : 'fixed bottom-4 right-4 items-end';

  return (
    <aside
      data-testid="bangboo-mascot"
      data-mood={mood}
      data-minimized={isMinimized ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      aria-label="Bangboo mascot companion - Click to interact"
      onClick={handlePoke}
      onKeyDown={handleKeyDown}
      className={`z-40 flex flex-col cursor-pointer select-none group transition-transform ${positionClasses} ${className}`}
      title="Click or press Enter to interact with Eous!"
    >
      {/* 1. Comic Speech Bubble (rendered when expanded, or floating above) */}
      {!isMinimized && showSpeechBubble && (
        <div className="mb-2">
          <SpeechBubble
            dialogueText={dialogueText}
            subtitleText={subtitleText}
            mood={mood}
            position={position}
            mascotName="EOUS"
            durationMs={activeDialogue?.durationMs ?? 4000}
            onDismiss={onDismissDialogue}
          />
        </div>
      )}

      {/* 2. Main Mascot Body / Minimized Pill */}
      {isMinimized ? (
        // Minimized Compact Pill
        <div
          data-testid="bangboo-minimized-pill"
          className="flex items-center gap-2 px-3 py-1.5 bg-[#16181D] hover:bg-[#242831] border-2 border-[#F2FF00] rounded-full shadow-[0_0_12px_rgba(242,255,0,0.35)] transition-all transform hover:scale-105"
        >
          <span className="w-2 h-2 rounded-full bg-[#F2FF00] animate-pulse" />
          <span className="font-mono text-xs font-bold text-[#F2FF00] tracking-wider">
            [ // EOUS ]
          </span>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${badgeConfig.bg} ${badgeConfig.text} ${badgeConfig.border}`}
          >
            {badgeConfig.label}
          </span>
          <button
            type="button"
            data-testid="bangboo-minimize-btn"
            onClick={handleToggleMinimize}
            aria-label="Expand Bangboo mascot"
            className="p-1 hover:text-[#00F0FF] text-[#A0A5B5] transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        // Expanded Companion Avatar Pod
        <div className="relative">
          {/* Top Control Bar: Minimize Button */}
          <div className="absolute -top-3 -right-2 z-50">
            <button
              type="button"
              data-testid="bangboo-minimize-btn"
              onClick={handleToggleMinimize}
              aria-label="Minimize Bangboo companion"
              title="Minimize companion"
              className="bg-[#242831] hover:bg-[#0D0E12] text-[#A0A5B5] hover:text-[#F2FF00] border border-[#4A5268] hover:border-[#F2FF00] rounded-full p-1 shadow-md transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>

          {/* Mood Badge Tag */}
          <div className="absolute -top-2 left-0 z-40">
            <span
              className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-sm border shadow-sm tracking-wider uppercase ${badgeConfig.bg} ${badgeConfig.text} ${badgeConfig.border}`}
            >
              {badgeConfig.label}
            </span>
          </div>

          {/* Mascot Pod Frame */}
          <div
            className={`w-18 h-18 sm:w-22 sm:h-22 p-2 bg-[#16181D] border-2 border-[#F2FF00] rounded-full flex items-center justify-center shadow-[0_0_18px_rgba(242,255,0,0.4)] relative overflow-hidden transition-all group-hover:scale-105 active:scale-95 ${
              isPoking ? 'animate-bangboo-poke' : mood === 'idle' ? 'animate-bangboo-breathe' : ''
            }`}
          >
            {/* Mascot SVG Content */}
            {renderSVG ? (
              renderSVG({ mood, className: 'w-14 h-14 sm:w-16 sm:h-16' })
            ) : (
              <BangbooSVG mood={mood} size={64} className="w-14 h-14 sm:w-16 sm:h-16" />
            )}

            {/* Bottom Hazard Ribbon Badge */}
            <div className="absolute bottom-0 inset-x-0 h-1.5 zzz-hazard-bar" />
          </div>
        </div>
      )}
    </aside>
  );
};

export default BangbooWidget;
