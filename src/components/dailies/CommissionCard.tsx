import React from 'react';
import { Zap, Check, Clock, Award, ShieldAlert, Sparkles } from 'lucide-react';
import { DailyCommission, TaskPriority, CommissionReward } from '../../types';

export interface CommissionCardProps {
  commission: DailyCommission;
  onClaim?: (commissionId: string) => void;
  className?: string;
}

interface ClientProfile {
  name: string;
  affiliation: string;
  avatarBg: string;
  avatarText: string;
  rank: TaskPriority;
}

const PRESET_CLIENTS: Record<string, ClientProfile> = {
  'comm-coffee-cafe': {
    name: 'Tin Master',
    affiliation: 'Coff Cafe Sixth Street',
    avatarBg: 'bg-amber-600',
    avatarText: 'TM',
    rank: 'A',
  },
  'comm-howl-scratch': {
    name: 'Howl Newsstand',
    affiliation: 'Sixth Street Corner',
    avatarBg: 'bg-emerald-600',
    avatarText: 'HL',
    rank: 'B',
  },
  'comm-vhs-archive': {
    name: 'Random Play',
    affiliation: 'Belle & Wise Video Archive',
    avatarBg: 'bg-blue-600',
    avatarText: 'RP',
    rank: 'A',
  },
  'comm-hollow-patrol': {
    name: 'Investigator Roland',
    affiliation: 'Hollow Investigative Guild',
    avatarBg: 'bg-rose-700',
    avatarText: 'IR',
    rank: 'S',
  },
  'comm-waterfall-soup': {
    name: 'General Chop',
    affiliation: 'Waterfall Soup Noodles',
    avatarBg: 'bg-orange-600',
    avatarText: 'GC',
    rank: 'B',
  },
};

const RANK_CONFIG: Record<
  TaskPriority,
  { label: string; badgeClass: string; borderClass: string; glowClass: string }
> = {
  S: {
    label: 'Rank S',
    badgeClass: 'bg-gradient-to-r from-[#FF0055] to-[#B33BFF] text-white font-black shadow-[0_0_12px_rgba(255,0,85,0.45)] border border-[#FF0055]',
    borderClass: 'border-l-4 border-l-[#FF0055]',
    glowClass: 'hover:border-[#FF0055]/80 hover:shadow-[0_0_16px_rgba(255,0,85,0.2)]',
  },
  A: {
    label: 'Rank A',
    badgeClass: 'bg-gradient-to-r from-[#FF7700] to-[#F2FF00] text-[#0D0E12] font-black shadow-[0_0_10px_rgba(255,119,0,0.45)] border border-[#FF7700]',
    borderClass: 'border-l-4 border-l-[#FF7700]',
    glowClass: 'hover:border-[#FF7700]/80 hover:shadow-[0_0_16px_rgba(255,119,0,0.2)]',
  },
  B: {
    label: 'Rank B',
    badgeClass: 'bg-[#00F0FF] text-[#0D0E12] font-black shadow-[0_0_10px_rgba(0,240,255,0.4)] border border-[#00C2CF]',
    borderClass: 'border-l-4 border-l-[#00F0FF]',
    glowClass: 'hover:border-[#00F0FF]/80 hover:shadow-[0_0_16px_rgba(0,240,255,0.2)]',
  },
  C: {
    label: 'Rank C',
    badgeClass: 'bg-[#242831] text-[#A0A5B5] font-bold border border-[#4A5268]',
    borderClass: 'border-l-4 border-l-[#5C6275]',
    glowClass: 'hover:border-[#4A5268] hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]',
  },
};

function resolveClientAndRank(commission: DailyCommission): {
  client: ClientProfile;
  rank: TaskPriority;
} {
  const commAny = commission as any;
  const preset = PRESET_CLIENTS[commission.id];
  if (preset) {
    const rank = commAny.priority || preset.rank;
    return { client: preset, rank };
  }

  // Derive rank
  const category = commission.category || 'Inter-Knot';
  const reward = commission.reward || { exp: 100, denny: 5000, polychrome: 10 };
  const rank: TaskPriority = commAny.priority || (
    reward.polychrome >= 20 || category.toLowerCase().includes('combat') || category.toLowerCase().includes('hollow')
      ? 'S'
      : reward.polychrome >= 10
      ? 'A'
      : 'B'
  );

  const titleInitials = (commission.title || 'IK').slice(0, 2).toUpperCase();
  const client: ClientProfile = {
    name: (commission as any).client || 'Inter-Knot Dispatch',
    affiliation: `${category.toUpperCase()} // PROXY COMMISSION`,
    avatarBg: rank === 'S' ? 'bg-rose-700' : rank === 'A' ? 'bg-amber-600' : 'bg-cyan-700',
    avatarText: titleInitials,
    rank,
  };

  return { client, rank };
}

export const CommissionCard: React.FC<CommissionCardProps> = ({
  commission,
  onClaim,
  className = '',
}) => {
  const isCompleted = commission.status === 'COMPLETED';
  const { client, rank } = resolveClientAndRank(commission);
  const rankStyle = RANK_CONFIG[rank] || RANK_CONFIG.B;

  const reward: CommissionReward = commission.reward || {
    exp: 100,
    denny: 5000,
    polychrome: 10,
  };

  const handleClaimClick = () => {
    if (isCompleted || !onClaim) return;
    onClaim(commission.id);
  };

  return (
    <div
      data-testid="commission-card"
      data-completed={isCompleted ? 'true' : 'false'}
      data-commission-id={commission.id}
      className={`group relative bg-[#16181D] border-2 transition-all duration-200 zzz-corner-cut p-4 sm:p-5 flex flex-col justify-between overflow-hidden ${
        isCompleted
          ? 'border-[#2E3342] bg-[#121418] opacity-85'
          : `border-[#2E3342] ${rankStyle.glowClass}`
      } ${rankStyle.borderClass} ${className}`}
    >
      {/* Top Bar: Slanted Rank Badge & Client Avatar & Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Left: Rank Badge + Client Avatar */}
        <div className="flex items-center gap-3">
          {/* Slanted Rank Badge */}
          <div
            className={`transform -skew-x-12 px-2.5 py-1 text-xs uppercase tracking-wider select-none ${rankStyle.badgeClass}`}
          >
            <span className="transform skew-x-12 inline-flex items-center gap-1">
              {rank === 'S' && <ShieldAlert className="w-3.5 h-3.5" />}
              {rankStyle.label}
            </span>
          </div>

          {/* Client Avatar Monogram */}
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono font-black text-xs text-white border border-white/20 shadow-sm ${client.avatarBg}`}
              title={client.name}
            >
              {client.avatarText}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wide leading-tight">
                {client.name}
              </span>
              <span className="text-[10px] font-mono text-[#A0A5B5] tracking-wider leading-none">
                {client.affiliation}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Commission Status Badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            data-testid="commission-status"
            className={`px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold tracking-wider uppercase border flex items-center gap-1 ${
              isCompleted
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            {isCompleted ? (
              <>
                <Check className="w-3 h-3" />
                COMPLETED
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                PENDING
              </>
            )}
          </span>
        </div>
      </div>

      {/* Middle: Title & Description */}
      <div className="space-y-1.5 my-2">
        <h3
          className={`font-black text-base sm:text-lg tracking-wide uppercase transition-colors ${
            isCompleted ? 'text-[#A0A5B5] line-through' : 'text-white group-hover:text-[#F2FF00]'
          }`}
        >
          {commission.title}
        </h3>
        {commission.description && (
          <p className="text-xs sm:text-sm text-[#A0A5B5] font-sans leading-relaxed">
            {commission.description}
          </p>
        )}
      </div>

      {/* Bottom Row: Reward Chips & Claim Action */}
      <div className="mt-4 pt-3 border-t border-[#2E3342] flex flex-wrap items-center justify-between gap-3">
        {/* Reward Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* EXP Chip */}
          <span
            title="Inter-Knot Reputation EXP"
            className="px-2 py-0.5 rounded-sm bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-mono font-bold flex items-center gap-1 shadow-[0_0_6px_rgba(0,240,255,0.15)]"
          >
            <Sparkles className="w-3 h-3" />
            +{(reward.exp || 0).toLocaleString()} EXP
          </span>

          {/* Dennies Chip */}
          <span
            title="Dennies Currency"
            className="px-2 py-0.5 rounded-sm bg-[#F2FF00]/15 border border-[#F2FF00]/40 text-[#F2FF00] text-xs font-mono font-bold flex items-center gap-1 shadow-[0_0_6px_rgba(242,255,0,0.15)]"
          >
            +{(reward.denny || 0).toLocaleString()} DENNY
          </span>

          {/* Polychromes Chip */}
          <span
            title="Polychrome Gacha Currency"
            className="px-2 py-0.5 rounded-sm bg-[#B33BFF]/20 border border-[#B33BFF]/50 text-[#D88DFF] text-xs font-mono font-bold flex items-center gap-1 shadow-[0_0_6px_rgba(179,59,255,0.2)]"
          >
            ✦ +{(reward.polychrome || 0).toLocaleString()} POLY
          </span>

          {/* Custom Badge Name if available */}
          {reward.badgeName && (
            <span
              title="Bonus Badge Reward"
              className="px-2 py-0.5 rounded-sm bg-[#242831] border border-[#4A5268] text-[#A0A5B5] text-[10px] font-mono uppercase hidden md:inline-flex items-center gap-1"
            >
              <Award className="w-3 h-3 text-[#F2FF00]" />
              {reward.badgeName}
            </span>
          )}
        </div>

        {/* Claim Action Button */}
        <div>
          <button
            type="button"
            data-testid="claim-commission-btn"
            disabled={isCompleted}
            onClick={handleClaimClick}
            aria-label={isCompleted ? 'Commission already claimed' : `Claim rewards for ${commission.title}`}
            className={`font-mono text-xs font-black uppercase tracking-wider px-4 py-2 transform -skew-x-12 transition-all flex items-center gap-1.5 select-none ${
              isCompleted
                ? 'bg-[#242831] text-[#5C6275] border border-[#2E3342] cursor-not-allowed opacity-60'
                : 'bg-[#F2FF00] hover:bg-[#d6e200] text-[#0D0E12] border border-[#F2FF00] shadow-[0_0_12px_rgba(242,255,0,0.4)] hover:shadow-[0_0_20px_rgba(242,255,0,0.6)] cursor-pointer active:scale-95'
            }`}
          >
            <span className="transform skew-x-12 inline-flex items-center gap-1.5">
              {isCompleted ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  CLAIMED
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-[#0D0E12]" />
                  CLAIM REWARD
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Rubber Stamp Effect when Cleared */}
      {isCompleted && (
        <div
          data-testid="stamp-cleared"
          aria-hidden="true"
          className="absolute right-5 bottom-4 pointer-events-none transform -rotate-12 border-4 border-[#FF3B30] text-[#FF3B30] font-black text-lg sm:text-xl tracking-widest px-3 py-1 uppercase rounded-xs select-none shadow-[0_0_20px_rgba(255,59,48,0.5)] bg-[#0D0E12]/80 backdrop-blur-xs z-10 animate-fade-in"
        >
          CLEARED // 済
        </div>
      )}
    </div>
  );
};

export default CommissionCard;
