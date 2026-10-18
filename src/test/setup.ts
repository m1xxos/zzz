import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// ============================================================================
// 1. Mock Storage (localStorage & sessionStorage)
// ============================================================================

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});

// ============================================================================
// 2. Mock Web Audio API (AudioContext, GainNode, OscillatorNode, etc.)
// ============================================================================

class MockAudioParam {
  value: number;
  defaultValue: number;
  minValue = -3.4028234663852886e38;
  maxValue = 3.4028234663852886e38;

  constructor(defaultValue = 0) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
  }

  setValueAtTime = vi.fn().mockImplementation((val: number, _startTime: number) => {
    this.value = val;
    return this;
  });

  linearRampToValueAtTime = vi.fn().mockImplementation((val: number, _endTime: number) => {
    this.value = val;
    return this;
  });

  exponentialRampToValueAtTime = vi.fn().mockImplementation((val: number, _endTime: number) => {
    this.value = val;
    return this;
  });

  setTargetAtTime = vi.fn().mockReturnThis();
  setValueCurveAtTime = vi.fn().mockReturnThis();
  cancelScheduledValues = vi.fn().mockReturnThis();
  cancelAndHoldAtTime = vi.fn().mockReturnThis();
}

class MockAudioNode {
  context: MockAudioContext;
  numberOfInputs = 1;
  numberOfOutputs = 1;

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  connect = vi.fn().mockImplementation((dest: unknown) => dest);
  disconnect = vi.fn().mockReturnValue(undefined);
}

class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(context: MockAudioContext, defaultGain = 1) {
    super(context);
    this.gain = new MockAudioParam(defaultGain);
  }
}

class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  frequency: MockAudioParam;
  detune: MockAudioParam;
  onended: ((this: AudioScheduledSourceNode, ev: Event) => void) | null = null;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(440);
    this.detune = new MockAudioParam(0);
  }

  start = vi.fn();
  stop = vi.fn().mockImplementation(() => {
    if (this.onended) {
      this.onended.call(this as unknown as AudioScheduledSourceNode, new Event('ended'));
    }
  });
}

class MockAudioDestinationNode extends MockAudioNode {
  maxChannelCount = 2;
}

class MockAudioBuffer {
  numberOfChannels = 2;
  length = 44100;
  sampleRate = 44100;
  duration = 1;

  getChannelData = vi.fn().mockReturnValue(new Float32Array(44100));
  copyFromChannel = vi.fn();
  copyToChannel = vi.fn();
}

class MockAudioContext {
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  currentTime = 0;
  destination: MockAudioDestinationNode;

  constructor() {
    this.destination = new MockAudioDestinationNode(this);
  }

  createGain = vi.fn().mockImplementation(() => new MockGainNode(this));
  createOscillator = vi.fn().mockImplementation(() => new MockOscillatorNode(this));
  createBufferSource = vi.fn().mockImplementation(() => {
    const node = new MockAudioNode(this) as any;
    node.buffer = null;
    node.start = vi.fn();
    node.stop = vi.fn();
    node.playbackRate = new MockAudioParam(1);
    return node;
  });
  createBiquadFilter = vi.fn().mockImplementation(() => {
    const filter = new MockAudioNode(this) as any;
    filter.frequency = new MockAudioParam(350);
    filter.Q = new MockAudioParam(1);
    filter.type = 'lowpass';
    return filter;
  });
  createBuffer = vi.fn().mockImplementation((_channels: number, length: number, sampleRate: number) => {
    const buf = new MockAudioBuffer();
    buf.length = length;
    buf.sampleRate = sampleRate;
    buf.duration = length / sampleRate;
    return buf;
  });
  decodeAudioData = vi.fn().mockResolvedValue(new MockAudioBuffer());
  resume = vi.fn().mockImplementation(async () => {
    this.state = 'running';
  });
  suspend = vi.fn().mockImplementation(async () => {
    this.state = 'suspended';
  });
  close = vi.fn().mockImplementation(async () => {
    this.state = 'closed';
  });
}

Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'webkitAudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'webkitAudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
});

// ============================================================================
// 3. Mock matchMedia
// ============================================================================

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================================
// 4. Mock ResizeObserver & IntersectionObserver
// ============================================================================

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
  configurable: true,
});

// ============================================================================
// 5. Global Cleanup Hooks
// ============================================================================

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});
