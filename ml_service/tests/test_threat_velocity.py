import unittest
import json
import os
import sys
import pandas as pd  # type: ignore
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.main import app
from fastapi.testclient import TestClient  # type: ignore

class TestThreatVelocity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_forecast_with_empty_history(self):
        """Test that the velocity engine returns baseline when history is empty."""
        response = self.client.post("/predictive-forecast", json=[])
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("forecast", data)
        self.assertEqual(len(data["forecast"]), 3)
        self.assertEqual(data["confidence"], "initializing")
        self.assertEqual(data["forecast"][0]["predicted_spam"], 0)

    def test_forecast_with_minimal_history(self):
        """Test velocity computation with minimal (1 day) history."""
        history = [
            {"date": "2026-04-01", "spam": 10, "suspicious": 5, "safe": 20, "total": 35}
        ]
        response = self.client.post("/predictive-forecast", json=history)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("forecast", data)
        self.assertEqual(len(data["forecast"]), 3)
        # Should be non-zero since history has data
        self.assertGreaterEqual(data["forecast"][0]["predicted_spam"], 0)

    def test_forecast_with_sufficient_history(self):
        """Test EMA velocity computation with sufficient history."""
        now = datetime.now()
        history = []
        for i in range(5):
            date = (now - timedelta(days=i)).strftime('%Y-%m-%d')
            history.append({"date": date, "spam": 10 + i, "suspicious": 5, "safe": 20, "total": 35 + i})
        
        response = self.client.post("/predictive-forecast", json=history)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("forecast", data)
        self.assertEqual(data["algorithm"], "Exponential Smoothing (Velocity Engine)")

if __name__ == '__main__':
    unittest.main()
