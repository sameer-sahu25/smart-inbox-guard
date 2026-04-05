
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailAnalyzer from '../EmailAnalyzer';
import '@testing-library/jest-dom';

// Mock the hooks
vi.mock('../../hooks/use-scanning', () => ({
  useScanning: () => ({ isScanning: false, setIsScanning: vi.fn() })
}));
vi.mock('../../hooks/use-auth', () => ({
  useAuth: () => ({ token: 'mock-token' })
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('EmailAnalyzer UI Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
  });

  it('should reset result and metadata visibility when starting a new analysis', async () => {
    // 1. Render and simulate a successful analysis
    const mockResult = {
      success: true,
      data: {
        verdict: 'spam',
        neuralSafetyScore: 0,
        modelInfo: { modelVersion: 'v1' },
        validationResult: { isValid: true, errors: [] }
      }
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult)
    });

    render(<EmailAnalyzer />);
    
    const bodyInput = screen.getByPlaceholderText(/Paste the full email content/i);
    fireEvent.change(bodyInput, { target: { value: 'scammy content' } });
    
    const analyzeButton = screen.getByText(/Initiate AI Analysis/i);
    fireEvent.click(analyzeButton);

    // Wait for result to appear
    await waitFor(() => {
      expect(screen.getByText('spam')).toBeInTheDocument();
    }, { timeout: 3000 });

    // 2. Open metadata
    const toggleButton = await screen.findByRole('button', { name: /View Technical Model Metadata/i });
    fireEvent.click(toggleButton);
    expect(await screen.findByText(/Model Version/i)).toBeInTheDocument();

    // 3. Start a new analysis
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolve to keep it in scanning state
    fireEvent.click(analyzeButton);

    // 4. Verify results and metadata are cleared/hidden immediately
    await waitFor(() => {
      expect(screen.queryByText('spam')).not.toBeInTheDocument();
      expect(screen.queryByText(/Model Version/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /View Technical Model Metadata/i })).not.toBeInTheDocument();
    });
  });
});
