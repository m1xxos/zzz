import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Flame, Clock, AlertCircle } from 'lucide-react';
import { DailyCommission, CommissionReward } from '../../types';
import CommissionCard from './CommissionCard';
import RewardModal from './RewardModal';
import { StoreContext } from '../../store/useStore';
import { DEFAULT_COMMISSIONS } from '../../services/storage';
import { soundService } from '../../services/sound';

export interface DailiesBoardProps {
  commissions?: DailyCommission[];
  currentStreak?: number;
  longestStreak?: number;
  resetHour?: number;
  onClaimCommission?: (id: string) => void;
  className?: string;
}

/**
 * Calculates countdown until next daily reset hour (default 04:00 AM local).
 * Polymorphic argument support for (now, resetHour) or (resetHour, now).
 */
export function getTimeUntilReset(arg1?: Date | number, arg2?: number | Date) {
  let now = new Date();
  let resetHour = 4;

  if (arg1 instanceof Date) {
    now = arg1;
    if (typeof arg2 === 'number') resetHour = arg2;
  } else if (typeof arg1 === 'number') {
    resetHour = arg1;
    if (arg2 instanceof Date) now = arg2;
  } else if (arg2 instanceof Date) {
    now = arg2;
  } else if (typeof arg2 === 'number') {
    resetHour = arg2;
  }

  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), resetHour, 0, 0, 0);
  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    formattedText: `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
  };
}

export const DailiesBoard: React.FC<DailiesBoardProps> = ({
  commissions: propCommissions,
  currentStreak: propCurrentStreak,
  longestStreak: propLongestStreak,
  resetHour: propResetHour,
  onClaimCommission: propOnClaimCommission,
  className = '',
}) => {
  // Safe consumption of central store
  const store = useContext(StoreContext);

  const resetHour = propResetHour ?? store?.settings?.resetHour ?? 4;

  // Local commission state fallback for standalone usage
  const initialCommissions = useMemo(() => {
    if (propCommissions !== undefined) return propCommissions;
    if (store?.dailies?.commissions && store.dailies.commissions.length > 0) {
      return store.dailies.commissions;
    }
    return DEFAULT_COMMISSIONS;
  }, [propCommissions, store?.dailies?.commissions]);

  const [localCommissions, setLocalCommissions] = useState<DailyCommission[]>(initialCommissions);

  // Sync when prop or store commissions change
  useEffect(() => {
    if (propCommissions !== undefined) {
      setLocalCommissions(propCommissions);
    } else if (store?.dailies?.commissions && store.dailies.commissions.length > 0) {
      setLocalCommissions(store.dailies.commissions);
    }
  }, [propCommissions, store?.dailies?.commissions]);

  const activeCommissions = localCommissions;

  // Streak metrics
  const currentStreak =
    propCurrentStreak !== undefined
      ? propCurrentStreak
      : (store?.dailies?.currentStreak ?? 0);

  const longestStreak =
    propLongestStreak !== undefined
      ? propLongestStreak
      : (store?.dailies?.longestStreak ?? currentStreak);

  // Live countdown to 04:00 AM reset
  const [countdown, setCountdown] = useState(() => getTimeUntilReset(new Date(), resetHour));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilReset(new Date(), resetHour));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetHour]);

  // Local Reward Modal State for standalone/direct usage
  const [localRewardModalOpen, setLocalRewardModalOpen] = useState(false);
  const [localActiveReward, setLocalActiveReward] = useState<{
    reward: CommissionReward;
    title: string;
  } | null>(null);

  // Check completion tally
  const completedCount = useMemo(() => {
    return activeCommissions.filter((c) => c.status === 'COMPLETED').length;
  }, [activeCommissions]);

  const allCleared = activeCommissions.length > 0 && completedCount === activeCommissions.length;

  // Synchronize modal state between store.activeReward and local state
  const isRewardModalOpen = localRewardModalOpen || Boolean(store?.activeReward);
  const modalReward = store?.activeReward?.reward || localActiveReward?.reward;
  const modalTitle = store?.activeReward?.commissionTitle || localActiveReward?.title;
  const modalAllCleared = store?.activeReward?.allCompleted ?? allCleared;
  const modalStreak = store?.activeReward?.currentStreak ?? currentStreak;

  const handleCloseRewardModal = () => {
    setLocalRewardModalOpen(false);
    setLocalActiveReward(null);
    if (store?.dismissReward) {
      store.dismissReward();
    }
  };

  // Claim handler
  const handleClaim = (commissionId: string) => {
    const target = activeCommissions.find((c) => c.id === commissionId);
    if (!target || target.status === 'COMPLETED') return;

    const reward = target.reward || { exp: 100, denny: 5000, polychrome: 10 };
    setLocalActiveReward({
      reward,
      title: target.title,
    });
    setLocalRewardModalOpen(true);

    // Call store action or prop callback or local state
    if (propOnClaimCommission) {
      propOnClaimCommission(commissionId);
    } else if (store && typeof store.claimCommission === 'function') {
      store.claimCommission(commissionId);
    } else {
      // Standalone update
      setLocalCommissions((prev) =>
        prev.map((c) => (c.id === commissionId ? { ...c, status: 'COMPLETED' as const } : c))
      );

      // Play audio chime
      try {
        soundService.playCommissionComplete();
      } catch {}

      // If store exists, synchronize store.dailies state
      if (store && store.dailies) {
        const updatedComms = (store.dailies.commissions || []).map((c) =>
          c.id === commissionId ? { ...c, status: 'COMPLETED' as const } : c
        );
        const updatedStreak = (store.dailies.currentStreak || 0) + 1;
        store.importState({
          ...store,
          dailies: {
            ...store.dailies,
            commissions: updatedComms,
            currentStreak: updatedStreak,
            commissionClaimed: true,
          },
        });
      }
    }
  };

  return (
    <div
      data-testid="dailies-view"
      className={`space-y-6 ${className}`}
    >
      {/* 1. Header: Street HUD Header & Telemetry */}
      <div className="bg-[#16181D] border-2 border-[#2E3342] zzz-corner-cut p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Top Accent Hazard Bar */}
        <div className="absolute top-0 inset-x-0 h-1 zzz-hazard-bar" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Left: Section Title & Inter-Knot Telemetry */}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_#00F0FF]" />
              <span className="font-mono text-xs font-black text-[#00F0FF] tracking-widest uppercase">
                // INTER-KNOT COMMISSIONS DISPATCH //
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wider mt-1 flex items-center gap-3">
              <span>DAILY COMMISSIONS</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-xs bg-[#242831] border border-[#2E3342] text-[#A0A5B5] tracking-widest hidden sm:inline-block">
                04:00 AM CYCLE
              </span>
            </h1>
          </div>

          {/* Right: Reset Countdown Clock & Streak Counter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Countdown Clock */}
            <div
              title="Next daily commission reset at 04:00 AM local time"
              className="flex items-center gap-2.5 bg-[#0D0E12] px-3.5 py-2 rounded-xs border border-[#2E3342] shadow-inner"
            >
              <Clock className="w-4 h-4 text-[#00F0FF] animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#A0A5B5] uppercase tracking-wider leading-none">
                  RESET IN
                </span>
                <span
                  data-testid="reset-countdown"
                  className="font-mono text-sm sm:text-base font-black text-[#00F0FF] tracking-wider leading-tight"
                >
                  {countdown.formattedText}
                </span>
              </div>
            </div>

            {/* Streak Counter Badge with Flame Icon */}
            <div
              title={`Consecutive Daily Streak: ${currentStreak} Days (Peak: ${longestStreak})`}
              className="flex items-center gap-2.5 bg-[#0D0E12] px-4 py-2 rounded-xs border border-[#2E3342] shadow-inner"
            >
              <Flame className="w-5 h-5 text-[#FF7700] fill-[#F2FF00] animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#A0A5B5] uppercase tracking-wider leading-none">
                  STREAK
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    data-testid="streak-counter"
                    className="font-mono text-xl sm:text-2xl font-black text-[#F2FF00] tracking-tight leading-none"
                  >
                    {currentStreak}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#A0A5B5] uppercase leading-none">
                    DAYS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar & Commission Completion Counter */}
        <div className="mt-5 pt-4 border-t border-[#2E3342] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#A0A5B5] uppercase tracking-wider">CLEARANCE PROGRESS:</span>
            <span className="font-bold text-white">
              {completedCount} / {activeCommissions.length} CLEARED
            </span>
          </div>

          {/* Segmented Meter Bar */}
          <div className="flex-1 max-w-xs bg-[#0D0E12] h-2.5 rounded-xs border border-[#2E3342] overflow-hidden flex p-0.5 gap-1">
            {activeCommissions.map((comm, idx) => (
              <div
                key={comm.id || idx}
                className={`flex-1 h-full rounded-xs transition-all duration-300 ${
                  comm.status === 'COMPLETED'
                    ? 'bg-[#F2FF00] shadow-[0_0_8px_#F2FF00]'
                    : 'bg-[#242831]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. All Cleared High-Voltage Street Banner */}
      {allCleared && (
        <div
          data-testid="all-cleared-banner"
          className="zzz-corner-cut bg-gradient-to-r from-[#16181D] via-[#242831] to-[#16181D] border-2 border-[#F2FF00] p-4 sm:p-5 relative overflow-hidden shadow-[0_0_25px_rgba(242,255,0,0.25)] animate-fade-in"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 zzz-hazard-bar" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xs bg-[#F2FF00] text-[#0D0E12] flex items-center justify-center font-black text-2xl shadow-[0_0_12px_#F2FF00] flex-shrink-0">
                ★
              </div>
              <div>
                <span className="font-mono text-xs font-black text-[#F2FF00] tracking-widest uppercase block">
                  // ALL COMMISSIONS CLEARED // FULL CLEAR BONUS APPLIED //
                </span>
                <p className="text-sm font-bold text-white tracking-wide mt-0.5">
                  Outstanding work, Proxy! All daily commissions for this 04:00 AM cycle have been completed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#A0A5B5] bg-[#0D0E12] px-3.5 py-2 rounded-xs border border-[#2E3342] self-start sm:self-auto flex-shrink-0">
              <span>CYCLE ROLLOVER:</span>
              <span className="text-[#00F0FF] font-black">{countdown.formattedText}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Daily Commission Cards List */}
      <div className="space-y-4">
        {activeCommissions.length === 0 ? (
          <div
            data-testid="dailies-empty"
            className="p-8 text-center bg-[#16181D] border-2 border-dashed border-[#2E3342] zzz-corner-cut text-[#A0A5B5] font-mono text-sm space-y-2"
          >
            <AlertCircle className="w-8 h-8 text-[#A0A5B5] mx-auto opacity-50" />
            <p className="font-bold uppercase tracking-wider text-white">
              NO ACTIVE DAILY COMMISSIONS FOUND
            </p>
            <p className="text-xs">
              All commissions cleared or awaiting 04:00 AM dispatch cycle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCommissions.map((comm) => (
              <CommissionCard
                key={comm.id}
                commission={comm}
                onClaim={handleClaim}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. High-Voltage Gacha Reward Modal */}
      <RewardModal
        isOpen={isRewardModalOpen}
        onClose={handleCloseRewardModal}
        reward={modalReward}
        commissionTitle={modalTitle}
        allCleared={modalAllCleared}
        streak={modalStreak}
      />
    </div>
  );
};

export default DailiesBoard;
