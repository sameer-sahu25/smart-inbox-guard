
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simulating fetchWithRetry logic from EmailAnalyzer.tsx
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, timeout = 500) => {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        if (i === retries - 1) throw new Error(`Request timed out after ${retries} attempts`);
      } else if (i === retries - 1) {
        throw err;
      }
      // Wait before retrying
      await new Promise(res => setTimeout(res, 10)); // Shorter wait for tests
    }
  }
  throw new Error('All retry attempts failed');
};

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should succeed on first attempt', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'success' }) };
    (fetch as any).mockResolvedValueOnce(mockResponse);

    const res = await fetchWithRetry('/test', {});
    expect(res).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const mockResponse = { ok: true };
    (fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse);

    const res = await fetchWithRetry('/test', {});
    expect(res).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should fail after all retries', async () => {
    (fetch as any).mockRejectedValue(new Error('Persistent error'));

    await expect(fetchWithRetry('/test', {})).rejects.toThrow('Persistent error');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle timeouts', async () => {
    (fetch as any).mockImplementation((_url: string, options: any) => {
      return new Promise((_res, rej) => {
        const timeoutId = setTimeout(() => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          rej(err);
        }, 500); // Mocked fetch times out after 500ms
        
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            const err = new Error('Aborted');
            err.name = 'AbortError';
            rej(err);
          });
        }
      });
    });

    await expect(fetchWithRetry('/test', {}, 2, 100)).rejects.toThrow('Request timed out after 2 attempts');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
