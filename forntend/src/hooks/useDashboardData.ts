import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./use-auth";

export interface DashboardStats {
  total_analyzed: number;
  scam_detected: number;
  suspicious_incidents: number;
  phishing_alerts: number;
  safe_emails: number;
}

export interface DashboardChanges {
  total_change: number;
  scam_change: number;
  phishing_change: number;
  safe_change: number;
  is_increase: {
    total: boolean;
    spam: boolean;
    phishing: boolean;
    safe: boolean;
  };
}

export interface DashboardTrend {
  date: string;
  total: number;
  spam: number;
  suspicious: number;
  safe: number;
}

export interface ThreatForecast {
  date: string;
  predicted_spam: number;
  predicted_suspicious: number;
  risk_level: 'stable' | 'elevated';
}

export interface DashboardSummary {
  stats: DashboardStats;
  changes: DashboardChanges;
  trend: DashboardTrend[];
  forecast: ThreatForecast[];
  last_updated: string;
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mlServiceStatus, setMlServiceStatus] = useState<'available' | 'unavailable' | 'unknown'>('unknown');
  const { token, isAuthenticated, logout } = useAuth();
  const retryCount = useRef(0);
  const maxRetries = 3;
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkMLHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      const json = await response.json();
      if (json.success) {
        setMlServiceStatus(json.mlService === 'available' ? 'available' : 'unavailable');
      }
    } catch (err) {
      console.error('[ML Health Check] Ping failed:', err);
      setMlServiceStatus('unavailable');
    }
  }, []);

  // Ping ML health every 15s (Fix 5)
  useEffect(() => {
    checkMLHealth();
    const interval = setInterval(checkMLHealth, 15000);
    return () => clearInterval(interval);
  }, [checkMLHealth]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setIsLoading(false);
      return;
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      console.log('[Dashboard] Fetching data with token:', token ? 'Present' : 'Missing');
      
      // Use a custom timeout that works with the controller
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/v1/dashboard/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        console.warn('[Dashboard] Unauthorized session detected, logging out...');
        logout();
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Dashboard] API Error:', response.status, errorText);
        throw new Error(`API_ERROR_${response.status}`);
      }

      const json = await response.json();
      console.log('[Dashboard] API Response:', json);
      
      // Validate incoming data structure
      if (!json.success || !json.data) {
        console.error('[Dashboard] API reported failure or missing data:', json);
        throw new Error(json.error || 'MALFORMED_DATA');
      }

      const rawData = json.data;
      
      // Ensure trend data has 'total' field and handle potential missing keys
      if (rawData.trend && Array.isArray(rawData.trend)) {
        rawData.trend = rawData.trend.map((day: any) => ({
          ...day,
          safe: day.safe ?? day.safe_emails ?? 0,
          suspicious: day.suspicious ?? day.phishing ?? day.phishing_alerts ?? day.suspicious_incidents ?? 0,
          spam: day.spam ?? day.scam ?? day.scam_detected ?? 0,
          total:
            day.total ??
            ((day.safe ?? day.safe_emails ?? 0) +
              (day.suspicious ?? day.phishing ?? day.phishing_alerts ?? day.suspicious_incidents ?? 0) +
              (day.spam ?? day.scam ?? day.scam_detected ?? 0))
        }));
      }

      setData(rawData);
      setError(null);
      retryCount.current = 0; // Reset retry count on success
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[Dashboard] Fetch aborted');
        return;
      }

      console.error('[Dashboard] Fetch error:', err);
      
      const isRetryable = 
        err.name === 'TypeError' || // Network errors
        err.name === 'TimeoutError' || 
        err.message === 'API_ERROR_500' || 
        err.message === 'API_ERROR_503' ||
        err.message === 'API_ERROR_504' ||
        err.message === 'MALFORMED_DATA';

      if (retryCount.current < maxRetries && isRetryable) {
        retryCount.current += 1;
        const delay = Math.pow(2, retryCount.current) * 1000;
        console.log(`[Dashboard] Retrying fetch in ${delay}ms... (Attempt ${retryCount.current}/${maxRetries})`);
        setTimeout(fetchData, delay);
      } else {
        // Provide more descriptive error
        let errorMessage = 'Unable to connect to dashboard';
        if (err.message === 'MALFORMED_DATA') errorMessage = 'Data sync error';
        else if (err.message.startsWith('API_ERROR_')) errorMessage = `Server error (${err.message.split('_')[2]})`;
        else if (err.message) errorMessage = err.message;
        
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated, logout]);

  useEffect(() => {
    fetchData();

    // Auto-refetch every 60 seconds
    const interval = setInterval(fetchData, 60000);
    
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Null-safe defaults
  const safeStats: DashboardStats = {
    total_analyzed: data?.stats?.total_analyzed ?? 0,
    scam_detected: data?.stats?.scam_detected ?? 0,
    suspicious_incidents: data?.stats?.suspicious_incidents ?? data?.stats?.phishing_alerts ?? 0,
    phishing_alerts: data?.stats?.phishing_alerts ?? 0,
    safe_emails: data?.stats?.safe_emails ?? 0,
  };

  const safeChanges: DashboardChanges = {
    total_change: data?.changes?.total_change ?? 0,
    scam_change: data?.changes?.scam_change ?? 0,
    phishing_change: data?.changes?.phishing_change ?? 0,
    safe_change: data?.changes?.safe_change ?? 0,
    is_increase: {
      total: data?.changes?.is_increase?.total ?? true,
      spam: data?.changes?.is_increase?.spam ?? true,
      phishing: data?.changes?.is_increase?.phishing ?? true,
      safe: data?.changes?.is_increase?.safe ?? true,
    }
  };

  const safeTrend: DashboardTrend[] = data?.trend ?? [];
  const safeForecast: ThreatForecast[] = data?.forecast ?? [];

  return {
    stats: safeStats,
    changes: safeChanges,
    trend: safeTrend,
    forecast: safeForecast,
    summary: data,
    isLoading,
    error,
    mlServiceStatus,
    refetch: fetchData
  };
};
