import { describe, expect, it } from 'vitest';
import { ApiError, isDefinitiveApiRejection } from '@/lib/api/client';

describe('document upload compensation classification', () => {
  it('allows cleanup after a definitive client rejection', () => {
    expect(isDefinitiveApiRejection(new ApiError('Rejected', 403))).toBe(true);
    expect(isDefinitiveApiRejection(new ApiError('Invalid payload', 400))).toBe(true);
  });

  it('does not delete objects after server or network errors with ambiguous commit status', () => {
    expect(isDefinitiveApiRejection(new ApiError('Server error', 500))).toBe(false);
    expect(isDefinitiveApiRejection(new Error('Network response lost'))).toBe(false);
  });
});
