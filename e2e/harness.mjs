/**
 * ZZZTasks E2E Testing Harness - Runtime Engine & CDP Driver
 */

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' && typeof b !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!keysB.includes(k) || !deepEqual(a[k], b[k])) return false;
  }
  return true;
}

export function expect(actual) {
  const matchers = (isNot = false) => ({
    toBe(expected) {
      const pass = Object.is(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
    },
    toEqual(expected) {
      const pass = deepEqual(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected deep equality: ${JSON.stringify(actual)} ${isNot ? 'NOT to equal' : 'to equal'} ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
    },
    toContain(item) {
      let pass = false;
      if (typeof actual === 'string' || Array.isArray(actual)) {
        pass = actual.includes(item);
      } else if (actual instanceof Set || actual instanceof Map) {
        pass = actual.has(item);
      }
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(item)}`,
          actual,
          item
        );
      }
    },
    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be truthy' : 'to be truthy'}`, actual, true);
      }
    },
    toBeFalsy() {
      const pass = !Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be falsy' : 'to be falsy'}`, actual, false);
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be null' : 'to be null'}`, actual, null);
      }
    },
    toBeDefined() {
      const pass = typeof actual !== 'undefined';
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected value ${isNot ? 'to be undefined' : 'to be defined'}`, actual, undefined);
      }
    },
    toBeGreaterThan(expected) {
      const pass = actual > expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${actual} ${isNot ? 'NOT to be >' : 'to be >'} ${expected}`, actual, expected);
      }
    },
    toBeLessThan(expected) {
      const pass = actual < expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${actual} ${isNot ? 'NOT to be <' : 'to be <'} ${expected}`, actual, expected);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      const pass = actual >= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${actual} ${isNot ? 'NOT to be >=' : 'to be >='} ${expected}`, actual, expected);
      }
    },
    toThrow(expected) {
      if (typeof actual !== 'function') {
        throw new Error('expect(actual).toThrow requires actual to be a function');
      }
      let threw = false;
      let thrownError = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        thrownError = err;
      }
      if (isNot && threw) {
        throw new AssertionError(`Expected function NOT to throw, but threw ${thrownError}`, thrownError, null);
      }
      if (!isNot && !threw) {
        throw new AssertionError(`Expected function to throw, but it did not throw`, null, expected);
      }
      if (expected && thrownError) {
        const msg = String(thrownError.message || thrownError);
        if (expected instanceof RegExp && !expected.test(msg)) {
          throw new AssertionError(`Expected error message to match ${expected}, got "${msg}"`, msg, expected);
        } else if (typeof expected === 'string' && !msg.includes(expected)) {
          throw new AssertionError(`Expected error message to contain "${expected}", got "${msg}"`, msg, expected);
        }
      }
    }
  });

  const obj = matchers(false);
  obj.not = matchers(true);
  return obj;
}

// Suite registry
export const testRegistry = {
  currentSuite: null,
  suites: []
};

export function describe(title, fn) {
  const suite = {
    title,
    tests: [],
    beforeAllHooks: [],
    afterAllHooks: [],
    beforeEachHooks: [],
    afterEachHooks: []
  };

  const parentSuite = testRegistry.currentSuite;
  testRegistry.currentSuite = suite;
  testRegistry.suites.push(suite);

  fn();

  testRegistry.currentSuite = parentSuite;
}

export function it(title, fn) {
  if (!testRegistry.currentSuite) {
    describe('Default Suite', () => {});
  }
  testRegistry.currentSuite.tests.push({ title, fn });
}

export const test = it;

export function beforeAll(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.beforeAllHooks.push(fn);
}

export function afterAll(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.afterAllHooks.push(fn);
}

export function beforeEach(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.beforeEachHooks.push(fn);
}

export function afterEach(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.afterEachHooks.push(fn);
}

/**
 * CDP-backed Page Controller
 */
export class CDPPage {
  constructor(sessionSender, sessionId) {
    this.send = sessionSender;
    this.sessionId = sessionId;
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    // Wait for document ready
    for (let i = 0; i < 40; i++) {
      try {
        const state = await this.evaluate(() => document.readyState);
        if (state === 'complete' || state === 'interactive') break;
      } catch (e) {}
      await this.sleep(100);
    }
    await this.sleep(150);
  }

  async waitForSelector(selector, { timeout = 5000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const visible = await this.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          (rect.width > 0 || rect.height > 0 || el.getClientRects().length > 0)
        );
      }, selector);

      if (visible) return;
      await this.sleep(100);
    }
    throw new Error(`Timeout waiting for selector: "${selector}" (${timeout}ms elapsed)`);
  }

  async click(selector) {
    await this.waitForSelector(selector);
    const success = await this.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      if (typeof el.click === 'function') {
        el.click();
      } else {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
      return true;
    }, selector);
    if (!success) throw new Error(`Could not click selector: ${selector}`);
    await this.sleep(100);
  }

  async fill(selector, text) {
    await this.waitForSelector(selector);
    await this.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element ${sel} not found`);
      el.focus();
      // React 16+ synthetic event tracker bypass
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(el, val);
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, text);
    await this.sleep(50);
  }

  async select(selector, value) {
    await this.waitForSelector(selector);
    await this.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Select ${sel} not found`);
      el.value = val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, value);
    await this.sleep(50);
  }

  async textContent(selector) {
    return await this.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? (el.textContent || '').trim() : null;
    }, selector);
  }

  async getAttribute(selector, attribute) {
    return await this.evaluate((sel, attr) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(attr) : null;
    }, selector, attribute);
  }

  async isVisible(selector) {
    return await this.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        (rect.width > 0 || rect.height > 0)
      );
    }, selector);
  }

  async evaluate(fnOrExpr, ...args) {
    let expression;
    if (typeof fnOrExpr === 'function') {
      expression = `(${fnOrExpr.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`;
    } else {
      expression = String(fnOrExpr);
    }

    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Evaluation error in page: ${desc}`);
    }

    return res.result ? res.result.value : undefined;
  }

  async setLocalStorage(key, value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.evaluate((k, v) => localStorage.setItem(k, v), key, serialized);
  }

  async getLocalStorage(key) {
    const raw = await this.evaluate((k) => localStorage.getItem(k), key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async clearLocalStorage() {
    await this.evaluate(() => localStorage.clear());
  }

  async reload() {
    await this.send('Page.reload');
    await this.sleep(200);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global page instance holder
export let page = null;
export function setGlobalPage(p) {
  page = p;
  globalThis.page = p;
}

// Export globals for convenience
globalThis.describe = describe;
globalThis.it = it;
globalThis.test = test;
globalThis.beforeAll = beforeAll;
globalThis.afterAll = afterAll;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;
globalThis.expect = expect;
