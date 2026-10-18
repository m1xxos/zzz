/**
 * Target Location: src/test/bangboo.ui.test.tsx
 * Automated UI Unit Tests for Bangboo Mascot Widget, Speech Bubble, Scanlines & Audio Synthesis
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SpeechBubble } from '../components/bangboo/SpeechBubble';
import { BangbooWidget } from '../components/bangboo/BangbooWidget';
import { ScanlineOverlay } from '../components/layout/ScanlineOverlay';
import { SoundEngine, AUDIO_MUTED_KEY } from '../services/sound';

describe('SpeechBubble Component UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders speech bubble with dialect text and subtitle translation', () => {
    render(
      <SpeechBubble
        dialogueText="Eh-nah! En-nah!"
        subtitleText="Proxy, standing by for dispatch!"
        mood="happy"
      />
    );

    const bubble = screen.getByTestId('bangboo-speech-bubble');
    expect(bubble).toBeInTheDocument();
    expect(screen.getByTestId('bangboo-dialogue')).toHaveTextContent('Eh-nah! En-nah!');
    expect(screen.getByTestId('bangboo-subtitle')).toHaveTextContent('Proxy, standing by for dispatch!');
    expect(screen.getByText(/\[ \/\/ EOUS \]/i)).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = vi.fn();
    render(
      <SpeechBubble
        dialogueText="Eh-nah!"
        subtitleText="Dismiss test"
        onDismiss={handleDismiss}
      />
    );

    const dismissBtn = screen.getByTestId('speech-bubble-dismiss');
    expect(dismissBtn).toBeInTheDocument();
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after durationMs elapses', () => {
    const handleDismiss = vi.fn();
    render(
      <SpeechBubble
        dialogueText="Auto-dismiss quote"
        durationMs={3000}
        onDismiss={handleDismiss}
      />
    );

    expect(handleDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(handleDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies excited animation class when mood is celebrating or triumphant', () => {
    const { rerender } = render(
      <SpeechBubble dialogueText="Idle..." mood="idle" />
    );
    expect(screen.getByTestId('bangboo-speech-bubble')).not.toHaveClass('animate-bounce');

    rerender(<SpeechBubble dialogueText="Cleared!" mood="celebrating" />);
    expect(screen.getByTestId('bangboo-speech-bubble')).toHaveClass('animate-bounce');
  });
});

describe('BangbooWidget Component UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders companion mascot with idle mood and default SVG', () => {
    render(<BangbooWidget mood="idle" />);

    const mascot = screen.getByTestId('bangboo-mascot');
    expect(mascot).toBeInTheDocument();
    expect(mascot).toHaveAttribute('data-mood', 'idle');
    expect(mascot).toHaveAttribute('data-minimized', 'false');

    const svg = screen.getByTestId('bangboo-svg');
    expect(svg).toBeInTheDocument();
    expect(screen.getByText('IDLE')).toBeInTheDocument();
  });

  it('renders active dialogue speech bubble when activeDialogue prop is present', () => {
    const activeDialogue = {
      id: 'd1',
      bangbooText: 'Eh-nah!! ★ S-Rank Clear!',
      translation: 'Proxy, maximum rewards secured!',
      mood: 'triumphant' as const,
      soundCue: 'cheer' as const,
      durationMs: 4000,
    };

    render(<BangbooWidget mood="triumphant" activeDialogue={activeDialogue} />);

    expect(screen.getByTestId('bangboo-speech-bubble')).toBeInTheDocument();
    expect(screen.getByTestId('bangboo-dialogue')).toHaveTextContent('Eh-nah!! ★ S-Rank Clear!');
    expect(screen.getByTestId('bangboo-subtitle')).toHaveTextContent('Proxy, maximum rewards secured!');
    expect(screen.getByText('TRIUMPH')).toBeInTheDocument();
  });

  it('triggers onPoke callback on mouse click and keyboard activation', () => {
    const handlePoke = vi.fn();
    render(<BangbooWidget mood="happy" onPoke={handlePoke} />);

    const mascot = screen.getByTestId('bangboo-mascot');

    // Mouse click
    fireEvent.click(mascot);
    expect(handlePoke).toHaveBeenCalledTimes(1);

    // Keyboard Enter
    fireEvent.keyDown(mascot, { key: 'Enter', code: 'Enter' });
    expect(handlePoke).toHaveBeenCalledTimes(2);

    // Keyboard Space
    fireEvent.keyDown(mascot, { key: ' ', code: 'Space' });
    expect(handlePoke).toHaveBeenCalledTimes(3);
  });

  it('toggles minimize and expand states cleanly', () => {
    const handleToggleMinimize = vi.fn();
    const { rerender } = render(<BangbooWidget mood="idle" onToggleMinimize={handleToggleMinimize} />);

    // Initially expanded
    expect(screen.queryByTestId('bangboo-minimized-pill')).not.toBeInTheDocument();
    const minimizeBtn = screen.getByTestId('bangboo-minimize-btn');
    expect(minimizeBtn).toBeInTheDocument();

    // Click minimize
    fireEvent.click(minimizeBtn);
    expect(handleToggleMinimize).toHaveBeenCalledWith(true);

    // Re-render as minimized
    rerender(
      <BangbooWidget
        mood="idle"
        preferences={{
          enabled: true,
          mascotType: 'eous',
          voiceEnabled: true,
          minimized: true,
          position: 'bottom-right',
        }}
        onToggleMinimize={handleToggleMinimize}
      />
    );

    const pill = screen.getByTestId('bangboo-minimized-pill');
    expect(pill).toBeInTheDocument();
    expect(screen.getByText('[ // EOUS ]')).toBeInTheDocument();
  });

  it('positions correctly according to position preference', () => {
    const { rerender } = render(
      <BangbooWidget
        preferences={{
          enabled: true,
          mascotType: 'eous',
          voiceEnabled: true,
          minimized: false,
          position: 'bottom-right',
        }}
      />
    );
    expect(screen.getByTestId('bangboo-mascot')).toHaveClass('right-4');

    rerender(
      <BangbooWidget
        preferences={{
          enabled: true,
          mascotType: 'eous',
          voiceEnabled: true,
          minimized: false,
          position: 'bottom-left',
        }}
      />
    );
    expect(screen.getByTestId('bangboo-mascot')).toHaveClass('left-4');
  });
});

describe('ScanlineOverlay Component UI Tests', () => {
  it('renders CRT overlay when enabled is true', () => {
    render(<ScanlineOverlay enabled={true} />);
    const overlay = screen.getByTestId('crt-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('pointer-events-none');
    expect(overlay).toHaveClass('fixed inset-0');
  });

  it('returns null when enabled is false', () => {
    const { container } = render(<ScanlineOverlay enabled={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('crt-overlay')).not.toBeInTheDocument();
  });
});

describe('Procedural Audio Extensions & Immediate Storage Tests', () => {
  it('persists mute state immediately to localStorage on toggleMute', () => {
    const soundEngine = new SoundEngine();
    expect(localStorage.getItem(AUDIO_MUTED_KEY)).toBeNull();

    const muted1 = soundEngine.toggleMute();
    expect(muted1).toBe(true);
    expect(localStorage.getItem(AUDIO_MUTED_KEY)).toBe('true');

    const muted2 = soundEngine.toggleMute();
    expect(muted2).toBe(false);
    expect(localStorage.getItem(AUDIO_MUTED_KEY)).toBe('false');
  });

  it('synthesizes procedural chirps and cheers without throwing in mock environment', () => {
    const soundEngine = new SoundEngine();
    expect(() => soundEngine.playBangbooChirp()).not.toThrow();
    expect(() => soundEngine.playBangbooCheer()).not.toThrow();
    expect(() => soundEngine.playBangbooSleep()).not.toThrow();
    expect(() => soundEngine.playBangbooVocal('cheer')).not.toThrow();
  });
});
