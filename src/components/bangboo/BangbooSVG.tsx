import React from 'react';
import { BangbooMood } from '../../types';

export interface BangbooSVGProps extends React.SVGProps<SVGSVGElement> {
  mood?: BangbooMood;
  size?: number | string;
  className?: string;
  animate?: boolean;
  showGlow?: boolean;
  'data-testid'?: string;
}

/**
 * Pure Scalable SVG Bangboo Companion Mascot (Eous Model)
 * Authentic Zenless Zone Zero aesthetic:
 * - Rounded metallic charcoal-slate robotic plush body with specular sheen
 * - Rabbit-like cylindrical robot ears with glowing electric yellow inlays & pivot hinges
 * - Cyberpunk digital curved eye visor screen with CRT scanlines & glass glare
 * - 7 distinct reactive LED eye expressions (idle, happy, celebrating, triumphant, thinking, sleepy, surprised)
 * - Iconic red Phaethon pilot scarf with gold buckle & fluttering tails
 * - Off-white belly patch with center stitch and rivet
 * - Urban hazard tape hip ribbon
 * - CSS keyframe animations (breathing, ear wiggles, blinking, sleepy droop) with full prefers-reduced-motion safety
 */
export const BangbooSVG: React.FC<BangbooSVGProps> = ({
  mood = 'idle',
  size = '100%',
  className = '',
  animate = true,
  showGlow = true,
  'data-testid': testId = 'bangboo-svg',
  ...props
}) => {
  // Determine dynamic animation classes based on mood and animate flag
  const getMoodAnimClass = () => {
    if (!animate) return '';
    switch (mood) {
      case 'happy':
        return 'animate-bangboo-jump';
      case 'celebrating':
        return 'animate-bangboo-jump';
      case 'triumphant':
        return 'animate-bangboo-jump';
      case 'surprised':
        return 'animate-bangboo-wiggle';
      case 'sleepy':
        return 'bangboo-sleepy-bob';
      case 'thinking':
        return 'bangboo-thinking-tilt';
      case 'idle':
      default:
        return 'animate-bangboo-breathe';
    }
  };

  const getEarAnimClass = (side: 'left' | 'right') => {
    if (!animate) return '';
    if (mood === 'sleepy') return side === 'left' ? 'bangboo-ear-sleepy-left' : 'bangboo-ear-sleepy-right';
    if (mood === 'happy' || mood === 'celebrating') {
      return side === 'left' ? 'bangboo-ear-wiggle-left' : 'bangboo-ear-wiggle-right';
    }
    if (mood === 'surprised') return 'bangboo-ear-surprised';
    return side === 'left' ? 'bangboo-ear-idle-left' : 'bangboo-ear-idle-right';
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      data-testid={testId}
      data-mood={mood}
      role="img"
      aria-label={`Bangboo Eous mascot in ${mood} mood`}
      className={`bangboo-svg select-none overflow-visible ${getMoodAnimClass()} ${className}`}
      {...props}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="bangboo-body-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3A4456" />
          <stop offset="45%" stopColor="#242834" />
          <stop offset="100%" stopColor="#12151D" />
        </linearGradient>

        <linearGradient id="bangboo-belly-panel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="80%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="bangboo-ear-outer" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#202530" />
          <stop offset="50%" stopColor="#323947" />
          <stop offset="100%" stopColor="#1A1E26" />
        </linearGradient>

        <linearGradient id="bangboo-ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFF00" />
          <stop offset="60%" stopColor="#CCFF00" />
          <stop offset="100%" stopColor="#99E600" />
        </linearGradient>

        <linearGradient id="bangboo-visor-screen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0B0E17" />
          <stop offset="100%" stopColor="#040609" />
        </linearGradient>

        <linearGradient id="bangboo-scarf-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4D42" />
          <stop offset="50%" stopColor="#E52E22" />
          <stop offset="100%" stopColor="#9E1B12" />
        </linearGradient>

        <linearGradient id="bangboo-gold-buckle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF380" />
          <stop offset="50%" stopColor="#F2FF00" />
          <stop offset="100%" stopColor="#C49B00" />
        </linearGradient>

        {/* Glow Filters */}
        {showGlow && (
          <>
            <filter id="bangboo-led-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="bangboo-gold-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </>
        )}

        {/* Scoped CSS Styles & Keyframes */}
        <style>{`
          .bangboo-ear-left { transform-origin: 31px 30px; }
          .bangboo-ear-right { transform-origin: 69px 30px; }
          .bangboo-arm-left { transform-origin: 24px 58px; }
          .bangboo-arm-right { transform-origin: 76px 58px; }

          @keyframes bangboo-blink {
            0%, 92%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.1); }
          }
          .bangboo-eye-blink {
            transform-origin: 50% 47px;
            animation: bangboo-blink 3.8s ease-in-out infinite;
          }

          @keyframes bangboo-ear-sway-l {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-3deg); }
          }
          @keyframes bangboo-ear-sway-r {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(3deg); }
          }
          .bangboo-ear-idle-left { animation: bangboo-ear-sway-l 2.8s ease-in-out infinite; }
          .bangboo-ear-idle-right { animation: bangboo-ear-sway-r 2.8s ease-in-out infinite; }

          @keyframes bangboo-ear-fast-l {
            0%, 100% { transform: rotate(-2deg); }
            50% { transform: rotate(10deg); }
          }
          @keyframes bangboo-ear-fast-r {
            0%, 100% { transform: rotate(2deg); }
            50% { transform: rotate(-10deg); }
          }
          .bangboo-ear-wiggle-left { animation: bangboo-ear-fast-l 0.35s ease-in-out infinite; }
          .bangboo-ear-wiggle-right { animation: bangboo-ear-fast-r 0.35s ease-in-out infinite; }

          .bangboo-ear-sleepy-left {
            transform: rotate(-32deg) translateY(2px);
            transition: transform 0.6s ease;
          }
          .bangboo-ear-sleepy-right {
            transform: rotate(32deg) translateY(2px);
            transition: transform 0.6s ease;
          }

          .bangboo-ear-surprised {
            transform: translateY(-2px) scaleY(1.06);
            transition: transform 0.2s ease;
          }

          @keyframes bangboo-sleep-drift {
            0% { transform: translate(0, 0); opacity: 0.85; }
            100% { transform: translate(2px, -4px); opacity: 0; }
          }
          .bangboo-sleep-z1 { animation: bangboo-sleep-drift 2.2s ease-out infinite; }
          .bangboo-sleep-z2 { animation: bangboo-sleep-drift 2.2s ease-out 1.1s infinite; }

          @keyframes bangboo-tilt {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-3deg); }
          }
          .bangboo-thinking-tilt { animation: bangboo-tilt 2.5s ease-in-out infinite; }

          @keyframes bangboo-droop {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(3px); }
          }
          .bangboo-sleepy-bob { animation: bangboo-droop 3.6s ease-in-out infinite; }

          @media (prefers-reduced-motion: reduce) {
            .bangboo-svg,
            .bangboo-svg * {
              animation: none !important;
              transition: none !important;
            }
          }
        `}</style>
      </defs>

      {/* 1. Ground Contact Shadow */}
      <ellipse cx="50" cy="94" rx="26" ry="3.5" fill="rgba(0,0,0,0.35)" />

      {/* 2. Stubby Feet */}
      {/* Left Foot */}
      <path
        d="M 33 87 C 33 84, 45 84, 45 87 C 45 92, 42 94, 38 94 C 34 94, 33 92, 33 87 Z"
        fill="#181B22"
        stroke="#0D0E12"
        strokeWidth="1.5"
      />
      <ellipse cx="38.5" cy="91.5" rx="3" ry="1" fill="#2E3342" />

      {/* Right Foot */}
      <path
        d="M 55 87 C 55 84, 67 84, 67 87 C 67 92, 66 94, 62 94 C 58 94, 55 92, 55 87 Z"
        fill="#181B22"
        stroke="#0D0E12"
        strokeWidth="1.5"
      />
      <ellipse cx="61.5" cy="91.5" rx="3" ry="1" fill="#2E3342" />

      {/* 3. Ears (Left & Right) with Pivot Rings */}
      {/* Left Ear */}
      <g className={`bangboo-ear-left ${getEarAnimClass('left')}`}>
        {/* Outer Ear Shell */}
        <path
          d="M 26 30 L 25 12 C 25 5.5, 35 5.5, 35 12 L 36 30 Z"
          fill="url(#bangboo-ear-outer)"
          stroke="#0D0E12"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Inner Glowing Yellow Inset */}
        <rect
          x="28"
          y="10"
          width="5.5"
          height="15"
          rx="2.75"
          fill="url(#bangboo-ear-inner)"
          stroke="#CCFF00"
          strokeWidth="0.5"
        />
        {/* Cyber Tech Notch */}
        <line x1="25" y1="16.5" x2="28" y2="16.5" stroke="#0D0E12" strokeWidth="1.2" />
        {/* Pivot Base Hinge */}
        <ellipse cx="31" cy="29.5" rx="5.5" ry="2" fill="#13161D" stroke="#0D0E12" strokeWidth="1.2" />
        <circle cx="31" cy="29.5" r="1.2" fill="#F2FF00" />
      </g>

      {/* Right Ear */}
      <g className={`bangboo-ear-right ${getEarAnimClass('right')}`}>
        {/* Outer Ear Shell */}
        <path
          d="M 64 30 L 65 12 C 65 5.5, 75 5.5, 75 12 L 74 30 Z"
          fill="url(#bangboo-ear-outer)"
          stroke="#0D0E12"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Inner Glowing Yellow Inset */}
        <rect
          x="66.5"
          y="10"
          width="5.5"
          height="15"
          rx="2.75"
          fill="url(#bangboo-ear-inner)"
          stroke="#CCFF00"
          strokeWidth="0.5"
        />
        {/* Cyber Tech Notch */}
        <line x1="72" y1="16.5" x2="75" y2="16.5" stroke="#0D0E12" strokeWidth="1.2" />
        {/* Pivot Base Hinge */}
        <ellipse cx="69" cy="29.5" rx="5.5" ry="2" fill="#13161D" stroke="#0D0E12" strokeWidth="1.2" />
        <circle cx="69" cy="29.5" r="1.2" fill="#F2FF00" />
      </g>

      {/* 4. Left and Right Arms (Raised slightly in celebration/triumph) */}
      <g className="bangboo-arm-left">
        {mood === 'celebrating' || mood === 'triumphant' ? (
          <path
            d="M 22 56 C 16 50, 14 42, 18 38 C 22 35, 26 40, 25 48 L 24 56 Z"
            fill="url(#bangboo-ear-outer)"
            stroke="#0D0E12"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M 21 58 C 17 62, 16 70, 20 75 C 23 78, 27 75, 26 68 L 24 58 Z"
            fill="url(#bangboo-ear-outer)"
            stroke="#0D0E12"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
      </g>

      <g className="bangboo-arm-right">
        {mood === 'celebrating' || mood === 'triumphant' ? (
          <path
            d="M 78 56 C 84 50, 86 42, 82 38 C 78 35, 74 40, 75 48 L 76 56 Z"
            fill="url(#bangboo-ear-outer)"
            stroke="#0D0E12"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M 79 58 C 83 62, 84 70, 80 75 C 77 78, 73 75, 74 68 L 76 58 Z"
            fill="url(#bangboo-ear-outer)"
            stroke="#0D0E12"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
      </g>

      {/* 5. Main Body (Metallic Slate Oval) */}
      <path
        d="M 50 25 C 32 25, 20 38, 20 62 C 20 81, 31 89, 50 89 C 69 89, 80 81, 80 62 C 80 38, 68 25, 50 25 Z"
        fill="url(#bangboo-body-metal)"
        stroke="#0D0E12"
        strokeWidth="2.5"
      />

      {/* Metallic Forehead Seam & Rivets */}
      <path d="M 33 32 Q 50 34 67 32" stroke="#13161D" strokeWidth="1.5" fill="none" />
      <circle cx="34" cy="32" r="1" fill="#0D0E12" />
      <circle cx="66" cy="32" r="1" fill="#0D0E12" />
      {/* Specular Highlight Arc */}
      <path d="M 35 28 Q 50 27 65 28" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* 6. White Plush Belly Patch */}
      <path
        d="M 50 63 C 37 63, 31 71, 31 78 C 31 85, 38 87.5, 50 87.5 C 62 87.5, 69 85, 69 78 C 69 71, 63 63, 50 63 Z"
        fill="url(#bangboo-belly-panel)"
        stroke="#94A3B8"
        strokeWidth="1.2"
      />
      {/* Belly Stitch Line & Button */}
      <line x1="50" y1="67" x2="50" y2="83" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 1.5" />
      <circle cx="50" cy="80" r="1.2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.6" />

      {/* 7. Cyberpunk Visor Bezel & Screen Assembly */}
      {/* Outer Housing Bezel */}
      <rect x="25" y="37" width="50" height="20" rx="10" fill="#181C26" stroke="#0D0E12" strokeWidth="2.5" />
      {/* Cyan Trim Glow Ring */}
      <rect x="25.5" y="37.5" width="49" height="19" rx="9.5" fill="none" stroke="#00F0FF" strokeWidth="0.8" opacity="0.75" />
      {/* Inner Screen */}
      <rect x="27" y="39" width="46" height="16" rx="8" fill="url(#bangboo-visor-screen)" />

      {/* CRT Subtle Horizontal Scanlines */}
      <g stroke="#00F0FF" strokeWidth="0.5" opacity="0.12">
        <line x1="28" y1="41" x2="72" y2="41" />
        <line x1="28" y1="43" x2="72" y2="43" />
        <line x1="28" y1="45" x2="72" y2="45" />
        <line x1="28" y1="47" x2="72" y2="47" />
        <line x1="28" y1="49" x2="72" y2="49" />
        <line x1="28" y1="51" x2="72" y2="51" />
        <line x1="28" y1="53" x2="72" y2="53" />
      </g>

      {/* Glass Gloss Sheen Reflections */}
      <path d="M 30 39.5 L 40 39.5 L 34 54.5 L 28 54.5 Z" fill="rgba(255,255,255,0.12)" />
      <path d="M 43 39.5 L 46 39.5 L 42 54.5 L 39 54.5 Z" fill="rgba(255,255,255,0.06)" />

      {/* 8. Digital Eye Visor Expressions (The 7 Moods) */}
      <g data-testid={`visor-expression-${mood}`}>
        {/* Mood: IDLE (● ●) */}
        {mood === 'idle' && (
          <g className={animate ? 'bangboo-eye-blink' : ''}>
            <circle cx="38.5" cy="47" r="3.8" fill="#00F0FF" filter={showGlow ? 'url(#bangboo-led-glow)' : undefined} />
            <circle cx="39.8" cy="45.8" r="1.3" fill="#FFFFFF" />
            <circle cx="61.5" cy="47" r="3.8" fill="#00F0FF" filter={showGlow ? 'url(#bangboo-led-glow)' : undefined} />
            <circle cx="62.8" cy="45.8" r="1.3" fill="#FFFFFF" />
          </g>
        )}

        {/* Mood: HAPPY (^ ^) */}
        {mood === 'happy' && (
          <g>
            <path
              d="M 34.5 49 Q 38.5 43 42.5 49"
              fill="none"
              stroke="#F2FF00"
              strokeWidth="2.6"
              strokeLinecap="round"
              filter={showGlow ? 'url(#bangboo-gold-glow)' : undefined}
            />
            <path
              d="M 57.5 49 Q 61.5 43 65.5 49"
              fill="none"
              stroke="#F2FF00"
              strokeWidth="2.6"
              strokeLinecap="round"
              filter={showGlow ? 'url(#bangboo-gold-glow)' : undefined}
            />
            {/* Cute LED Blush Cheeks */}
            <rect x="30" y="50" width="3.5" height="1.5" rx="0.75" fill="#FF3B30" opacity="0.9" />
            <rect x="66.5" y="50" width="3.5" height="1.5" rx="0.75" fill="#FF3B30" opacity="0.9" />
          </g>
        )}

        {/* Mood: CELEBRATING (★ ★) */}
        {mood === 'celebrating' && (
          <g>
            {/* Left Star */}
            <path
              d="M 38.5 42 L 39.8 45.5 L 43.5 47 L 39.8 48.5 L 38.5 52 L 37.2 48.5 L 33.5 47 L 37.2 45.5 Z"
              fill="#F2FF00"
              filter={showGlow ? 'url(#bangboo-gold-glow)' : undefined}
            />
            <circle cx="38.5" cy="47" r="1.1" fill="#FFFFFF" />
            {/* Right Star */}
            <path
              d="M 61.5 42 L 62.8 45.5 L 66.5 47 L 62.8 48.5 L 61.5 52 L 60.2 48.5 L 56.5 47 L 60.2 45.5 Z"
              fill="#F2FF00"
              filter={showGlow ? 'url(#bangboo-gold-glow)' : undefined}
            />
            <circle cx="61.5" cy="47" r="1.1" fill="#FFFFFF" />
            {/* Floating Cyber Confetti Dots */}
            <circle cx="49" cy="43" r="0.9" fill="#00F0FF" />
            <circle cx="51.5" cy="51" r="0.9" fill="#FF3B30" />
            <circle cx="31.5" cy="44" r="0.8" fill="#F2FF00" />
            <circle cx="68.5" cy="44" r="0.8" fill="#F2FF00" />
          </g>
        )}

        {/* Mood: TRIUMPHANT (> < + Smile & S-Rank Emblem) */}
        {mood === 'triumphant' && (
          <g>
            {/* Left Fierce Eye */}
            <path
              d="M 35 44 L 42 47 L 35 50"
              fill="none"
              stroke="#F2FF00"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={showGlow ? 'url(#bangboo-gold-glow)' : undefined}
            />
            {/* Right Fierce Eye */}
            <path
              d="M 65 44 L 58 47 L 65 50"
              fill="none"
              stroke="#F2FF00"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={showGlow ? 'url(#bangboo-gold-glow)' : undefined}
            />
            {/* Victorious Center LED Smile */}
            <path
              d="M 47 50.5 Q 50 53.5 53 50.5"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* S-Rank Crown Accent */}
            <polygon points="50,40.5 52,43 54,41.5 53,44 47,44 46,41.5 48,43" fill="#F2FF00" />
          </g>
        )}

        {/* Mood: THINKING (• ~ + Loading Dot) */}
        {mood === 'thinking' && (
          <g>
            {/* Left Focused Eye & Brow */}
            <circle cx="38.5" cy="48" r="3.2" fill="#00F0FF" filter={showGlow ? 'url(#bangboo-led-glow)' : undefined} />
            <circle cx="39.5" cy="47" r="1.1" fill="#FFFFFF" />
            <path d="M 34.5 43.5 L 42.5 42" stroke="#00F0FF" strokeWidth="1.8" strokeLinecap="round" />

            {/* Right Wavy Squiggle & Eyebrow */}
            <path
              d="M 57 48 Q 59.5 44.5 62 48 T 67 48"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path d="M 57.5 42 L 65.5 44.5" stroke="#00F0FF" strokeWidth="1.8" strokeLinecap="round" />

            {/* Analytical Cyber Yellow Question Dot */}
            <circle cx="69" cy="41" r="1.2" fill="#F2FF00" />
          </g>
        )}

        {/* Mood: SLEEPY (- - + Floating Zz) */}
        {mood === 'sleepy' && (
          <g opacity="0.85">
            {/* Left Drowsy Slit */}
            <path d="M 34 47.5 H 43" stroke="#00F0FF" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 36 49.5 H 41" stroke="#00F0FF" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />

            {/* Right Drowsy Slit */}
            <path d="M 57 47.5 H 66" stroke="#00F0FF" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 59 49.5 H 64" stroke="#00F0FF" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />

            {/* Floating Pixel Zs */}
            <text x="67" y="44" fill="#00F0FF" fontSize="5.5" fontFamily="monospace" fontWeight="bold" className="bangboo-sleep-z1">
              z
            </text>
            <text x="70.5" y="41" fill="#00F0FF" fontSize="4" fontFamily="monospace" fontWeight="bold" className="bangboo-sleep-z2">
              z
            </text>
          </g>
        )}

        {/* Mood: SURPRISED (! ! + Alert Sweat Drop) */}
        {mood === 'surprised' && (
          <g>
            {/* Left Alert Ring */}
            <circle
              cx="38.5"
              cy="47"
              r="4.6"
              fill="none"
              stroke="#FF7700"
              strokeWidth="2.2"
              filter={showGlow ? 'url(#bangboo-led-glow)' : undefined}
            />
            <circle cx="38.5" cy="47" r="1.8" fill="#F2FF00" />

            {/* Right Alert Ring */}
            <circle
              cx="61.5"
              cy="47"
              r="4.6"
              fill="none"
              stroke="#FF7700"
              strokeWidth="2.2"
              filter={showGlow ? 'url(#bangboo-led-glow)' : undefined}
            />
            <circle cx="61.5" cy="47" r="1.8" fill="#F2FF00" />

            {/* Startled Cyan Sweat Drop on Forehead */}
            <path d="M 72 38 Q 74 35 75 38 Q 75 41 72 41 Z" fill="#00F0FF" opacity="0.9" />
          </g>
        )}
      </g>

      {/* 9. Phaethon Pilot Red Scarf with Golden Buckle & Fluttering Tails */}
      {/* Scarf Neckerchief Base */}
      <path
        d="M 23 54 C 23 54, 34 65, 50 65 C 66 65, 77 54, 77 54 C 77 54, 68 62, 50 62 C 32 62, 23 54, 23 54 Z"
        fill="#9E1B12"
      />
      <path
        d="M 22 53 C 32 58, 42 61, 50 61 C 58 61, 68 58, 78 53 C 75 60, 64 64, 50 64 C 36 64, 25 60, 22 53 Z"
        fill="url(#bangboo-scarf-primary)"
        stroke="#0D0E12"
        strokeWidth="1.5"
      />

      {/* Golden Clasp Buckle on Right */}
      <rect x="63" y="55" width="8" height="6.5" rx="2" fill="url(#bangboo-gold-buckle)" stroke="#0D0E12" strokeWidth="1.2" />
      <rect x="65" y="56.5" width="4" height="3.5" rx="1" fill="#7A120B" />
      <line x1="67" y1="55" x2="67" y2="61.5" stroke="#0D0E12" strokeWidth="1" />

      {/* Fluttering Scarf Tails on Left */}
      <path
        d="M 23 55 C 18 54, 13 57, 12 60 C 15 62, 20 60, 24 59 Z"
        fill="url(#bangboo-scarf-primary)"
        stroke="#0D0E12"
        strokeWidth="1.2"
      />
      <path
        d="M 22 58 C 17 61, 14 65, 15 67 C 18 66, 21 64, 24 61 Z"
        fill="#9E1B12"
        stroke="#0D0E12"
        strokeWidth="1"
      />

      {/* 10. Streetwear Hazard Tape Badge (Bottom Hip) */}
      <g transform="translate(41, 86.5)">
        <rect width="18" height="3" rx="1" fill="#0D0E12" stroke="#0D0E12" strokeWidth="0.6" />
        <rect x="1" y="0.6" width="16" height="1.8" fill="#F2FF00" />
        <line x1="4" y1="0.6" x2="2" y2="2.4" stroke="#0D0E12" strokeWidth="1" />
        <line x1="8" y1="0.6" x2="6" y2="2.4" stroke="#0D0E12" strokeWidth="1" />
        <line x1="12" y1="0.6" x2="10" y2="2.4" stroke="#0D0E12" strokeWidth="1" />
        <line x1="16" y1="0.6" x2="14" y2="2.4" stroke="#0D0E12" strokeWidth="1" />
      </g>
    </svg>
  );
};

export default BangbooSVG;
