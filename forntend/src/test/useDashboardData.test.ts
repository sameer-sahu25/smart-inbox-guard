import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useAuth } from "../hooks/use-auth";

// Mock the useAuth hook
vi.mock("../hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

describe("useDashboardData Hook", () => {
  const mockLogout = vi.fn();
  const mockToken = "fake-token";

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      token: mockToken,
      isAuthenticated: true,
      logout: mockLogout,
    });
    // Reset global fetch mock if needed
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should fetch dashboard data successfully and calculate totals", async () => {
    const mockData = {
      success: true,
      data: {
        stats: { total_analyzed: 100, scam_detected: 10, phishing_alerts: 5, safe_emails: 85 },
        changes: { total_change: 5, scam_change: 2, phishing_change: 1, safe_change: 2, is_increase: { total: true, spam: true, phishing: true, safe: true } },
        trend: [{ date: "2024-03-24", safe: 7, suspicious: 2, spam: 1 }], // missing 'total'
        last_updated: new Date().toISOString(),
      },
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats.total_analyzed).toBe(100);
    expect(result.current.trend).toHaveLength(1);
    expect(result.current.trend[0].total).toBe(10); // calculated: 7 + 2 + 1
    expect(result.current.error).toBeNull();
  });

  it("should handle 401 Unauthorized by calling logout", async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    renderHook(() => useDashboardData());

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  it("should handle retry logic on 500 Internal Server Error", async () => {
    // Mock fetch to fail once with 500, then succeed
    (fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { stats: { total_analyzed: 50 }, changes: {}, trend: [] },
        }),
      });

    const { result } = renderHook(() => useDashboardData());

    // Should initially show error or loading
    // Since it retries with exponential backoff (2s), we wait
    await waitFor(() => expect(result.current.stats.total_analyzed).toBe(50), { timeout: 5000 });
    expect(result.current.error).toBeNull();
  });

  it("should handle malformed data structure", async () => {
    const malformedData = {
      success: true,
      // missing 'data' field
    };

    // First call returns malformed, subsequent calls return success to stop retries
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => malformedData,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => malformedData,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => malformedData,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => malformedData,
      });

    const { result } = renderHook(() => useDashboardData());

    // It will retry 3 times (total 4 attempts) before setting the error
    await waitFor(() => expect(result.current.error).toBe("Data sync error"), { timeout: 20000 });
  }, 25000);

  it("should handle network timeouts", async () => {
    (fetch as any).mockImplementation(() => {
      const error = new Error("The user aborted a request.");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const { result } = renderHook(() => useDashboardData());

    // AbortError should not set an error state, just stop loading
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});
