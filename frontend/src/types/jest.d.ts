/**
 * Tipos para Jest y Testing Library
 */

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBe(expected: any): R;
      toBeDefined(): R;
      toBeUndefined(): R;
      toEqual(expected: any): R;
      toHaveLength(expected: number): R;
      toMatch(expected: string | RegExp): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveProperty(prop: string, value?: any): R;
    }
  }
}

export {};
