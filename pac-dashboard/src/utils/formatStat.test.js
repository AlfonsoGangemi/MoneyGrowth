import { describe, it, expect } from 'vitest'
import { formatStatValue } from './formatStat'

describe('formatStatValue', () => {
  it('7 → "7+"',          () => expect(formatStatValue(7)).toBe('7+'))
  it('24 → "20+"',        () => expect(formatStatValue(24)).toBe('20+'))
  it('87 → "80+"',        () => expect(formatStatValue(87)).toBe('80+'))
  it('123 → "100+"',      () => expect(formatStatValue(123)).toBe('100+'))
  it('1240 → "1K+"',      () => expect(formatStatValue(1240)).toBe('1K+'))
  it('3700 → "3K+"',      () => expect(formatStatValue(3700)).toBe('3K+'))
  it('12500 → "10K+"',    () => expect(formatStatValue(12500)).toBe('10K+'))
  it('123456 → "120K+"',  () => expect(formatStatValue(123456)).toBe('120K+'))
  it('3450000 → "3M+"',   () => expect(formatStatValue(3450000)).toBe('3M+'))
  it('1000000 → "1M+"',   () => expect(formatStatValue(1000000)).toBe('1M+'))
  it('10000 → "10K+"',    () => expect(formatStatValue(10000)).toBe('10K+'))
  it('1000 → "1K+"',      () => expect(formatStatValue(1000)).toBe('1K+'))
  it('1 → "1+"',          () => expect(formatStatValue(1)).toBe('1+'))
})
