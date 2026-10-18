import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';
import fs from 'fs';
import path from 'path';

describe('Test Environment & Mocks Setup', () => {
  it('correctly provides and resets localStorage mock', () => {
    expect(localStorage.getItem('test_key')).toBeNull();
    localStorage.setItem('test_key', 'test_value');
    expect(localStorage.getItem('test_key')).toBe('test_value');
    localStorage.removeItem('test_key');
    expect(localStorage.getItem('test_key')).toBeNull();
  });

  it('correctly provides and resets sessionStorage mock', () => {
    expect(sessionStorage.getItem('session_key')).toBeNull();
    sessionStorage.setItem('session_key', 'session_value');
    expect(sessionStorage.getItem('session_key')).toBe('session_value');
    sessionStorage.clear();
    expect(sessionStorage.getItem('session_key')).toBeNull();
  });

  it('correctly provides Web Audio API AudioContext mock', async () => {
    const ctx = new AudioContext();
    expect(ctx.state).toBe('suspended');
    await ctx.resume();
    expect(ctx.state).toBe('running');

    const gain = ctx.createGain();
    expect(gain.gain.value).toBe(1);
    gain.gain.setValueAtTime(0.5, 0.1);
    expect(gain.gain.value).toBe(0.5);

    const osc = ctx.createOscillator();
    expect(osc.type).toBe('sine');
    osc.frequency.setValueAtTime(880, 0);
    expect(osc.frequency.value).toBe(880);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop();
  });

  it('correctly mocks window.matchMedia', () => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    expect(mq.matches).toBe(false);
    expect(typeof mq.addEventListener).toBe('function');
  });

  it('correctly mocks ResizeObserver and IntersectionObserver', () => {
    const ro = new ResizeObserver(() => {});
    expect(ro).toBeDefined();
    expect(typeof ro.observe).toBe('function');

    const io = new IntersectionObserver(() => {});
    expect(io).toBeDefined();
    expect(typeof io.observe).toBe('function');
  });
});

describe('Milestone 1 App & Scaffolding Smoke Verification', () => {
  it('renders application HUD header cleanly without errors', () => {
    render(React.createElement(App));
    expect(screen.getByText(/ZZZTasks \/\/ SYSTEM READY/i)).toBeInTheDocument();
    expect(screen.getByText(/REC ● INTER-KNOT OSD/i)).toBeInTheDocument();
    expect(screen.getByText(/PROXY LICENSE: ACTIVE/i)).toBeInTheDocument();
  });

  it('tailwind.config.js contains all required ZZZ colors', () => {
    const configPath = path.resolve(__dirname, '../../tailwind.config.js');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('obsidian');
    expect(content).toContain('#0D0E12');
    expect(content).toContain('surface');
    expect(content).toContain('#16181D');
    expect(content).toContain('yellow');
    expect(content).toContain('#F2FF00');
    expect(content).toContain('danger');
    expect(content).toContain('#FF3B30');
    expect(content).toContain('cyan');
    expect(content).toContain('#00F0FF');
    expect(content).toContain('border');
  });

  it('src/index.css defines all required utility classes', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain('.zzz-corner-cut');
    expect(css).toContain('.zzz-hazard-bar');
    expect(css).toContain('.zzz-scanlines');
    expect(css).toContain('.zzz-text-glitch');
    expect(css).toContain('pointer-events: none');
  });

  it('tailwind.config.js defines all required keyframes', () => {
    const configPath = path.resolve(__dirname, '../../tailwind.config.js');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('glitch');
    expect(content).toContain('stamp');
    expect(content).toContain('bangboo-breathe');
    expect(content).toContain('bangboo-jump');
    expect(content).toContain('bangboo-spin');
    expect(content).toContain('bangboo-wiggle');
  });
});
