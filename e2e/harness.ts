/**
 * ZZZTasks E2E Testing Harness - TypeScript Interfaces & Declarations
 */

export interface Page {
  goto(url: string): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
  click(selector: string): Promise<void>;
  fill(selector: string, text: string): Promise<void>;
  select(selector: string, value: string): Promise<void>;
  textContent(selector: string): Promise<string | null>;
  getAttribute(selector: string, attribute: string): Promise<string | null>;
  isVisible(selector: string): Promise<boolean>;
  evaluate<T = any>(fnOrExpr: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
  setLocalStorage(key: string, value: any): Promise<void>;
  getLocalStorage<T = any>(key: string): Promise<T | null>;
  clearLocalStorage(): Promise<void>;
  reload(): Promise<void>;
  sleep(ms: number): Promise<void>;
}

export interface MatcherResult {
  pass: boolean;
  message: string;
}

export interface Matchers<T = any> {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toContain(expected: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeDefined(): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toThrow(expected?: string | RegExp): void;
  not: Omit<Matchers<T>, 'not'>;
}

export type TestFn = () => Promise<void> | void;
export type HookFn = () => Promise<void> | void;

export declare function describe(title: string, fn: () => void): void;
export declare function it(title: string, fn: TestFn): void;
export declare function test(title: string, fn: TestFn): void;
export declare function beforeAll(fn: HookFn): void;
export declare function afterAll(fn: HookFn): void;
export declare function beforeEach(fn: HookFn): void;
export declare function afterEach(fn: HookFn): void;
export declare function expect<T = any>(actual: T): Matchers<T>;
export declare const page: Page;
