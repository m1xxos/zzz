import React, { useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Award, Sparkles, Coins, Gem, X, CheckCircle2 } from 'lucide-react';
import { CommissionReward } from '../../types';

export interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward?: CommissionReward | null;
  commissionTitle?: string;
  allCleared?: boolean;
  streak?: number;
}

export const RewardModal: React.FC<RewardModalProps> = ({
  isOpen,
  onClose,
  reward: propReward,
  commissionTitle = 'Daily Inter-Knot Commission',
  allCleared = false,
  streak,
}) => {
  const reward: CommissionReward = propReward || {
    exp: 100,
    denny: 5000,
    polychrome: 10,
  };

  // Trigger celebratory confetti burst when modal opens
  const fireConfetti = useCallback(() => {
    try {
      if (typeof confetti === 'function') {
        // First burst
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6, x: 0.5 },
          colors: ['#F2FF00', '#00F0FF', '#FF0055', '#FFFFFF', '#FF7700', '#B33BFF'],
          disableForReducedMotion: true,
        });

        // Double burst for all cleared
        if (allCleared) {
          setTimeout(() => {
            confetti({
              particleCount: 90,
              spread: 100,
              origin: { y: 0.5, x: 0.5 },
              colors: ['#F2FF00', '#FF3B30', '#B33BFF'],
              disableForReducedMotion: true,
            });
          }, 250);
        }
      }
    } catch {
      // Fallback for non-canvas or test environments
    }
  }, [allCleared]);

  useEffect(() => {
    if (isOpen) {
      fireConfetti();
    }
  }, [isOpen, fireConfetti]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* 1. Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* 2. Modal Dialog Content */}
      <div
        data-testid="reward-modal"
        className="relative w-full max-w-lg bg-[#16181D] border-2 border-[#F2FF00] zzz-corner-cut shadow-[0_0_50px_rgba(242,255,0,0.35)] overflow-hidden flex flex-col z-10 animate-scale-up"
      >
        {/* Top Hazard Caution Stripe Banner */}
        <div className="h-2 zzz-hazard-bar w-full" />

        {/* CRT Scanline Overlay Effect */}
        <div className="absolute inset-0 zzz-scanlines pointer-events-none opacity-40" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-[#2E3342] relative z-10 bg-[#121418]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F2FF00] animate-ping" />
              <span className="font-mono text-xs font-bold text-[#F2FF00] tracking-widest uppercase">
                // COMMISSION REWARD UNLOCKED //
              </span>
            </div>
            <h2
              id="reward-modal-title"
              className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase mt-1"
            >
              HIGH-VOLTAGE CLAIM
            </h2>
          </div>

          {/* Close Icon Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reward modal"
            className="text-[#A0A5B5] hover:text-[#F2FF00] p-1.5 rounded-sm hover:bg-[#242831] border border-transparent hover:border-[#F2FF00]/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Commission Title Banner */}
        <div className="px-6 py-2.5 bg-[#1B1E26] border-b border-[#2E3342] flex items-center justify-between text-xs font-mono relative z-10">
          <span className="text-[#A0A5B5] uppercase truncate mr-2">
            ASSIGNMENT: <strong className="text-white">{commissionTitle}</strong>
          </span>
          {streak !== undefined && (
            <span className="text-[#F2FF00] font-bold flex-shrink-0">
              STREAK: {streak} DAYS
            </span>
          )}
        </div>

        {/* Modal Body: High-Voltage Reward Tallies */}
        <div className="p-6 space-y-4 relative z-10">
          {/* All Cleared Bonus Banner if applicable */}
          {allCleared && (
            <div className="bg-[#F2FF00]/10 border border-[#F2FF00] p-3 rounded-xs flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#F2FF00] flex-shrink-0" />
              <div>
                <span className="font-mono text-[11px] font-bold text-[#F2FF00] tracking-wider uppercase block">
                  ★ ALL DAILY COMMISSIONS CLEARED! ★
                </span>
                <span className="text-xs text-white">
                  Proxy daily all-clear streak updated! Stand by for 04:00 AM rollover.
                </span>
              </div>
            </div>
          )}

          {/* Reward Tally Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Inter-Knot EXP */}
            <div className="bg-[#1B1E26] border border-[#00F0FF]/40 rounded-xs p-3.5 flex flex-col items-center justify-center text-center shadow-[0_0_12px_rgba(0,240,255,0.15)] group hover:border-[#00F0FF] transition-all">
              <div className="w-9 h-9 rounded-full bg-[#00F0FF]/15 border border-[#00F0FF]/50 flex items-center justify-center mb-2">
                <Sparkles className="w-4 h-4 text-[#00F0FF]" />
              </div>
              <span className="font-mono text-xs text-[#A0A5B5] tracking-wider uppercase">
                INTER-KNOT EXP
              </span>
              <span className="font-black text-xl text-[#00F0FF] tracking-tight mt-0.5">
                +{(reward.exp || 0).toLocaleString()}
              </span>
            </div>

            {/* 2. Dennies Currency */}
            <div className="bg-[#1B1E26] border border-[#F2FF00]/40 rounded-xs p-3.5 flex flex-col items-center justify-center text-center shadow-[0_0_12px_rgba(242,255,0,0.15)] group hover:border-[#F2FF00] transition-all">
              <div className="w-9 h-9 rounded-full bg-[#F2FF00]/15 border border-[#F2FF00]/50 flex items-center justify-center mb-2">
                <Coins className="w-4 h-4 text-[#F2FF00]" />
              </div>
              <span className="font-mono text-xs text-[#A0A5B5] tracking-wider uppercase">
                DENNIES
              </span>
              <span className="font-black text-xl text-[#F2FF00] tracking-tight mt-0.5">
                +{(reward.denny || 0).toLocaleString()}
              </span>
            </div>

            {/* 3. Polychromes */}
            <div className="bg-[#1B1E26] border border-[#B33BFF]/40 rounded-xs p-3.5 flex flex-col items-center justify-center text-center shadow-[0_0_12px_rgba(179,59,255,0.2)] group hover:border-[#B33BFF] transition-all">
              <div className="w-9 h-9 rounded-full bg-[#B33BFF]/20 border border-[#B33BFF]/50 flex items-center justify-center mb-2">
                <Gem className="w-4 h-4 text-[#D88DFF]" />
              </div>
              <span className="font-mono text-xs text-[#A0A5B5] tracking-wider uppercase">
                POLYCHROME
              </span>
              <span className="font-black text-xl text-[#D88DFF] tracking-tight mt-0.5">
                +{(reward.polychrome || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Optional Badge Reward */}
          {reward.badgeName && (
            <div className="bg-[#242831] border border-[#4A5268] px-4 py-2 rounded-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F2FF00]" />
                <span className="font-mono text-xs text-white font-bold uppercase">
                  PROXY SEAL: {reward.badgeName}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider">
                COMMISSION STAMP
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer: Collect Button */}
        <div className="px-6 py-4 bg-[#121418] border-t border-[#2E3342] flex justify-end relative z-10">
          <button
            type="button"
            data-testid="reward-modal-close"
            onClick={onClose}
            className="w-full sm:w-auto font-mono text-sm font-black uppercase tracking-wider px-6 py-2.5 bg-[#F2FF00] hover:bg-[#d6e200] text-[#0D0E12] border border-[#F2FF00] shadow-[0_0_15px_rgba(242,255,0,0.4)] transform -skew-x-12 transition-all hover:scale-102 active:scale-98 select-none cursor-pointer"
          >
            <span className="transform skew-x-12 inline-flex items-center justify-center gap-2">
              COLLECT & PROCEED // 確認
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardModal;
