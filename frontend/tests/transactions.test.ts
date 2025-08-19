import { describe, it, expect } from 'bun:test';
import { isWithoutDevice } from '../lib/transactions';

describe('isWithoutDevice', () => {
  it('returns true when deviceId is null', () => {
    expect(isWithoutDevice({ deviceId: null })).toBe(true);
  });

  it('returns true when deviceId is undefined', () => {
    expect(isWithoutDevice({})).toBe(true);
  });

  it('returns false when deviceId exists', () => {
    expect(isWithoutDevice({ deviceId: 'abc' })).toBe(false);
  });
});
