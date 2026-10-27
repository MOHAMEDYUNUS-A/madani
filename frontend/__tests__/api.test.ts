import { describe, it, expect } from 'vitest';
import { APIError, TimeoutError, NetworkError } from '../lib/api';

describe('Frontend API Error Handling & Utilities', () => {
  it('should instantiate APIError with custom status and payload data', () => {
    const error = new APIError('Resource not found', 404, { code: 'NOT_FOUND' });
    expect(error.name).toBe('APIError');
    expect(error.message).toBe('Resource not found');
    expect(error.status).toBe(404);
    expect(error.data).toEqual({ code: 'NOT_FOUND' });
  });

  it('should instantiate TimeoutError with default 408 status and user-friendly message', () => {
    const timeoutErr = new TimeoutError();
    expect(timeoutErr.name).toBe('TimeoutError');
    expect(timeoutErr.status).toBe(408);
    expect(timeoutErr.message).toContain('timed out');
  });

  it('should instantiate NetworkError with 503 status code', () => {
    const networkErr = new NetworkError();
    expect(networkErr.name).toBe('NetworkError');
    expect(networkErr.status).toBe(503);
    expect(networkErr.message).toContain('Network connection failed');
  });
});
