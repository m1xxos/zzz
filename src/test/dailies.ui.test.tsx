import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import confetti from 'canvas-confetti';
import { DailyCommission, CommissionReward } from '../types';
import CommissionCard from '../components/dailies/CommissionCard';
import RewardModal from '../components/dailies/RewardModal';
import DailiesBoard, { getTimeUntilReset } from '../components/dailies/DailiesBoard';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

const mockCommissions: DailyCommission[] = [
  {
    id: 'comm-coffee-cafe',
    title: 'Coff Cafe Double Shot',
    description: "Drink Tin Master's special energy brew to recharge proxy stamina.",
    category: 'Life',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Coffee Buff' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-howl-scratch',
    title: "Howl's Daily Scratch Ticket",
    description: 'Visit the Sixth Street newsstand and scratch your lucky ticket.',
    category: 'Inter-Knot',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Howl Lucky Stamp' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-hollow-patrol',
    title: 'Hollow Survey Verification',
    description: 'Review corruption telemetry report on the Inter-Knot forum.',
    category: 'Combat',
    reward: { exp: 150, denny: 10000, polychrome: 20, badgeName: 'Hollow Data Chip' },
    status: 'COMPLETED',
    completedDates: ['2026-10-18'],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
];

describe('CommissionCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending commission card with all required DOM attributes and rank badge', () => {
    const handleClaim = vi.fn();
    render(
      <CommissionCard
        commission={mockCommissions[0]}
        onClaim={handleClaim}
      />
    );

    // Card container
    const card = screen.getByTestId('commission-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-completed', 'false');
    expect(card).toHaveAttribute('data-commission-id', 'comm-coffee-cafe');

    // Title and Client
    expect(screen.getByText('Coff Cafe Double Shot')).toBeInTheDocument();
    expect(screen.getByText('Tin Master')).toBeInTheDocument();

    // Slanted Rank Badge
    expect(screen.getByText(/Rank A/i)).toBeInTheDocument();

    // Reward Chips
    expect(screen.getByText('+100 EXP')).toBeInTheDocument();
    expect(screen.getByText('+5,000 DENNY')).toBeInTheDocument();
    expect(screen.getByText(/✦ \+10 POLY/)).toBeInTheDocument();

    // Status Badge
    const status = screen.getByTestId('commission-status');
    expect(status).toHaveTextContent(/PENDING/i);

    // Claim Button
    const claimBtn = screen.getByTestId('claim-commission-btn');
    expect(claimBtn).toBeEnabled();
    expect(claimBtn).toHaveTextContent(/CLAIM REWARD/i);

    // Trigger claim
    fireEvent.click(claimBtn);
    expect(handleClaim).toHaveBeenCalledWith('comm-coffee-cafe');
  });

  it('renders completed commission card with COMPLETED status and CLEARED stamp', () => {
    const handleClaim = vi.fn();
    render(
      <CommissionCard
        commission={mockCommissions[2]}
        onClaim={handleClaim}
      />
    );

    const card = screen.getByTestId('commission-card');
    expect(card).toHaveAttribute('data-completed', 'true');

    // Status Badge
    const status = screen.getByTestId('commission-status');
    expect(status).toHaveTextContent(/COMPLETED/i);

    // Slanted Rank S Badge
    expect(screen.getByText(/Rank S/i)).toBeInTheDocument();

    // Rubber Stamp Effect
    const stamp = screen.getByTestId('stamp-cleared');
    expect(stamp).toBeInTheDocument();
    expect(stamp).toHaveTextContent(/CLEARED/i);

    // Claim Button is disabled
    const claimBtn = screen.getByTestId('claim-commission-btn');
    expect(claimBtn).toBeDisabled();
    expect(claimBtn).toHaveTextContent(/CLAIMED/i);

    // Clicking does not call onClaim
    fireEvent.click(claimBtn);
    expect(handleClaim).not.toHaveBeenCalled();
  });

  it('renders fallback client profile and derived rank when commission has sparse data', () => {
    const sparseComm: DailyCommission = {
      id: 'comm-custom-99',
      title: 'Emergency Courier Run',
      description: 'Deliver data reel to Sixth Street.',
      category: 'Combat',
      reward: { exp: 200, denny: 15000, polychrome: 30 },
      status: 'PENDING',
      completedDates: [],
      isCustom: true,
      createdAt: '2026-10-18T10:00:00Z',
    };

    render(<CommissionCard commission={sparseComm} />);

    expect(screen.getByText('Emergency Courier Run')).toBeInTheDocument();
    // Derived rank from Combat category & 30 polychromes
    expect(screen.getByText(/Rank S/i)).toBeInTheDocument();
    expect(screen.getByText('+200 EXP')).toBeInTheDocument();
  });
});

describe('RewardModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<RewardModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('reward-modal')).not.toBeInTheDocument();
  });

  it('renders gacha reward modal and triggers canvas-confetti when isOpen is true', () => {
    const handleClose = vi.fn();
    const testReward: CommissionReward = {
      exp: 150,
      denny: 8000,
      polychrome: 25,
      badgeName: 'Master Proxy Seal',
    };

    render(
      <RewardModal
        isOpen={true}
        onClose={handleClose}
        reward={testReward}
        commissionTitle="Hollow Survey Verification"
        streak={3}
      />
    );

    const modal = screen.getByTestId('reward-modal');
    expect(modal).toBeInTheDocument();

    // Confetti called
    expect(confetti).toHaveBeenCalled();

    // Commission Title
    expect(screen.getByText('Hollow Survey Verification')).toBeInTheDocument();

    // Reward Tallies
    expect(screen.getByText('+150')).toBeInTheDocument();
    expect(screen.getByText('+8,000')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
    expect(screen.getByText(/Master Proxy Seal/i)).toBeInTheDocument();
    expect(screen.getByText(/STREAK: 3 DAYS/i)).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByTestId('reward-modal-close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('displays all-cleared special banner when allCleared is true', () => {
    render(
      <RewardModal
        isOpen={true}
        onClose={vi.fn()}
        allCleared={true}
      />
    );

    expect(screen.getByText(/ALL DAILY COMMISSIONS CLEARED!/i)).toBeInTheDocument();
  });

  it('closes on Escape keyboard press', () => {
    const handleClose = vi.fn();
    render(<RewardModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('DailiesBoard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dailies view container, live countdown, streak counter, and cards', () => {
    render(
      <DailiesBoard
        commissions={mockCommissions}
        currentStreak={4}
        longestStreak={7}
      />
    );

    // Main container
    expect(screen.getByTestId('dailies-view')).toBeInTheDocument();

    // Live countdown clock
    const countdown = screen.getByTestId('reset-countdown');
    expect(countdown).toBeInTheDocument();
    expect(countdown.textContent).toMatch(/\d+h \d+m \d+s/);

    // Streak counter badge with flame
    const streak = screen.getByTestId('streak-counter');
    expect(streak).toBeInTheDocument();
    expect(streak).toHaveTextContent('4');

    // Commission cards rendered
    const cards = screen.getAllByTestId('commission-card');
    expect(cards).toHaveLength(3);

    // Clearance progress bar
    expect(screen.getByText(/1 \/ 3 CLEARED/i)).toBeInTheDocument();

    // "All Cleared" banner should NOT be present when 2 are pending
    expect(screen.queryByTestId('all-cleared-banner')).not.toBeInTheDocument();
  });

  it('displays All Cleared banner when all commissions are completed', () => {
    const allCompletedCommissions: DailyCommission[] = mockCommissions.map((c) => ({
      ...c,
      status: 'COMPLETED' as const,
    }));

    render(
      <DailiesBoard
        commissions={allCompletedCommissions}
        currentStreak={5}
      />
    );

    // All Cleared banner
    const banner = screen.getByTestId('all-cleared-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/ALL COMMISSIONS CLEARED/i);
    expect(screen.getByText(/3 \/ 3 CLEARED/i)).toBeInTheDocument();
  });

  it('claims commission and opens reward modal when claim button is clicked', () => {
    const handleClaim = vi.fn();
    render(
      <DailiesBoard
        commissions={[mockCommissions[0]]}
        currentStreak={2}
        onClaimCommission={handleClaim}
      />
    );

    // Before claim, modal is closed
    expect(screen.queryByTestId('reward-modal')).not.toBeInTheDocument();

    // Click claim
    const claimBtn = screen.getByTestId('claim-commission-btn');
    fireEvent.click(claimBtn);

    // onClaim callback was triggered
    expect(handleClaim).toHaveBeenCalledWith('comm-coffee-cafe');

    // Reward modal is now visible
    const modal = screen.getByTestId('reward-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Coff Cafe Double Shot')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByTestId('reward-modal-close');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('reward-modal')).not.toBeInTheDocument();
  });

  it('renders empty state when no commissions are provided', () => {
    render(<DailiesBoard commissions={[]} currentStreak={0} />);
    expect(screen.getByTestId('dailies-empty')).toBeInTheDocument();
    expect(screen.getByText(/NO ACTIVE DAILY COMMISSIONS FOUND/i)).toBeInTheDocument();
  });

  it('live countdown updates when resetHour is configured', () => {
    const now = new Date('2026-10-18T00:00:00');
    const result = getTimeUntilReset(now, 4);
    // At midnight, 4 hours remain until 04:00 AM
    expect(result.hours).toBe(4);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.formatted).toBe('04:00:00');
    expect(result.formattedText).toBe('04h 00m 00s');

    // At 03:59:00 AM, 1 minute remains
    const now2 = new Date('2026-10-18T03:59:00');
    const result2 = getTimeUntilReset(now2, 4);
    expect(result2.hours).toBe(0);
    expect(result2.minutes).toBe(1);

    // At 05:00:00 AM, 23 hours remain until next day 04:00 AM
    const now3 = new Date('2026-10-18T05:00:00');
    const result3 = getTimeUntilReset(now3, 4);
    expect(result3.hours).toBe(23);
  });
});

describe('Stress & Boundary Tests (Tier 2 Alignment)', () => {
  it('handles 300+ char title with special chars and HTML in CommissionCard without crashing', () => {
    const extremeCommission: DailyCommission = {
      id: 'comm-extreme',
      title: 'A'.repeat(320) + ' <script>alert("xss")</script> ★ & " \' /',
      description: 'B'.repeat(500) + ' <img src="x" onerror="alert(1)">',
      category: 'Outer-Ring Combat Hazard',
      reward: { exp: 99999, denny: 9999999, polychrome: 1600 },
      status: 'PENDING',
      completedDates: [],
      isCustom: true,
      createdAt: '2026-10-18T04:00:00Z',
    };

    render(<CommissionCard commission={extremeCommission} />);

    const card = screen.getByTestId('commission-card');
    expect(card).toBeInTheDocument();
    expect(screen.getByText(/Rank S/i)).toBeInTheDocument();
    expect(screen.getByText('+99,999 EXP')).toBeInTheDocument();
    expect(screen.getByText('+9,999,999 DENNY')).toBeInTheDocument();
  });

  it('handles commission object with missing reward object gracefully', () => {
    const minimalCommission: any = {
      id: 'comm-minimal',
      title: 'Minimal Daily Task',
      status: 'PENDING',
    };

    render(<CommissionCard commission={minimalCommission} />);

    expect(screen.getByTestId('commission-card')).toBeInTheDocument();
    expect(screen.getByText('Minimal Daily Task')).toBeInTheDocument();
    expect(screen.getByTestId('commission-status')).toHaveTextContent(/PENDING/i);
  });
});
