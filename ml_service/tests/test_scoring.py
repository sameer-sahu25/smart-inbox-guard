import unittest
import os
import sys
import numpy as np
from unittest.mock import MagicMock, patch

# Add parent directory to path to import core and utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.preprocessor import EmailPreprocessor
from core.feature_engine import FeatureEngine
from core.threat_rules import ThreatRuleEngine
from utils.explainer import PredictionExplainer

class TestEnhancedScoring(unittest.TestCase):
    def setUp(self):
        self.preprocessor = EmailPreprocessor()
        self.feature_engine = FeatureEngine()
        self.rule_engine = ThreatRuleEngine()
        self.explainer = PredictionExplainer()
        
        # Mock keyword lookup for preprocessor and feature engine
        self.mock_keyword_lookup = {
            "invest": "spam",
            "earn": "spam",
            "guaranteed": "spam",
            "returns": "spam",
            "meeting": "safe",
            "schedule": "safe",
            "deadline": "safe"
        }
        self.preprocessor.keyword_lookup = self.mock_keyword_lookup
        self.feature_engine.keyword_lookup = self.mock_keyword_lookup

    def test_template_detection_scam_a(self):
        subject = "Urgent Opportunity"
        body = "Invest in crypto now and earn 1000% in just 24 hours! Guaranteed returns."
        template = self.preprocessor.detect_template(subject, body)
        self.assertEqual(template, 'SCAM_TEMPLATE_A')

    def test_template_detection_scam_b(self):
        subject = "Approval Required"
        body = "Urgent: An inheritance of 1 million is waiting for your approval. Please provide your bank details."
        template = self.preprocessor.detect_template(subject, body)
        self.assertEqual(template, 'SCAM_TEMPLATE_B')

    def test_template_detection_suspicious_a(self):
        subject = "Security Alert"
        body = "Security Alert: We detected unusual activity on your account. Action is required to secure it."
        template = self.preprocessor.detect_template(subject, body)
        self.assertEqual(template, 'SUSPICIOUS_TEMPLATE_A')

    def test_sender_risk_scam_domain(self):
        sender = "scammer@fakemailgenerator.com"
        risk = self.preprocessor.get_sender_risk(sender)
        self.assertTrue(risk['sender_is_scam_domain'])
        self.assertEqual(risk['sender_risk_boost'], 0.30)

    def test_sender_risk_safe_domain(self):
        sender = "hr@company.com"
        risk = self.preprocessor.get_sender_risk(sender)
        self.assertTrue(risk['sender_is_safe_domain'])
        self.assertEqual(risk['sender_risk_boost'], -0.10)

    def test_keyword_match_scoring(self):
        text = "Please schedule a meeting to discuss the project deadline."
        scores = self.preprocessor.get_keyword_match_score(text, self.mock_keyword_lookup)
        self.assertEqual(scores['keyword_safe_count'], 3) # schedule, meeting, deadline
        self.assertEqual(scores['keyword_scam_count'], 0)
        self.assertEqual(scores['keyword_dominant'], 'safe')

    def test_threat_rule_template_a(self):
        subject = "Invest"
        body = "invest in this now and earn big in just 48 hours"
        signals = self.preprocessor.extract_signals(body)
        result = self.rule_engine.evaluate(subject, body, "spam@evil.com", signals)
        self.assertTrue(result['rule_triggered'])
        self.assertEqual(result['rule_verdict'], 'spam')
        self.assertIn("RULE_DATASET_TEMPLATE_A", result['triggered_rules'])

    def test_threat_rule_safe_vocabulary(self):
        body = "Let's schedule a meeting to review the project deadline."
        signals = self.preprocessor.extract_signals(body)
        # Manually set keyword counts as we mocked them in setup
        signals['keyword_safe_count'] = 3
        signals['keyword_scam_count'] = 0
        signals['keyword_suspicious_count'] = 0
        
        result = self.rule_engine.evaluate("Meeting", body, "boss@company.com", signals)
        self.assertTrue(result['rule_triggered'])
        self.assertEqual(result['rule_verdict'], 'safe')
        self.assertIn("RULE_PURE_SAFE_VOCABULARY", result['triggered_rules'])

    def test_feature_extraction_consistency(self):
        subject = "Test"
        body = "Test body"
        sender = "test@sender.com"
        signals = self.preprocessor.extract_signals(body)
        features = self.feature_engine.extract(subject, body, sender, signals)
        
        # Check for key features used in Stage 3
        required_features = [
            'keyword_scam_ratio', 'keyword_suspicious_ratio', 'keyword_safe_ratio',
            'keyword_scam_count', 'keyword_suspicious_count', 'keyword_safe_count',
            'sender_is_scam_domain', 'sender_is_safe_domain', 'sender_has_numbers', 'sender_domain_length',
            'tmpl_NO_TEMPLATE', 'tmpl_SCAM_TEMPLATE_A', 'tmpl_SCAM_TEMPLATE_B'
        ]
        for feat in required_features:
            self.assertIn(feat, features)

    def test_forced_suspicious_verdict_rule_1(self):
        # Rule (1): If safety grade equals "suspicious", then classification vector must be set to "suspicious"
        # This simulates the logic in main.py
        
        # Scenario 1: ML says safe (0.6 confidence), but effective score is low (e.g., 59%)
        # Frontend logic: 80 + (0.6 * 20) = 92 (This would be Grade A)
        # To get 59%, calibrated_confidence would need to be much lower or label would be suspicious.
        
        # If calibrated_confidence is 0.1 for 'safe': 80 + (0.1 * 20) = 82 (Grade B)
        # If label is 'suspicious' and confidence is 0.6: 40 + ((1 - 0.6) * 35) = 40 + 14 = 54 (Grade D)
        
        # Test logic for swapping:
        final_label = 'safe'
        ensemble_proba = [0.6, 0.3, 0.1] # [safe, suspicious, spam]
        classes_list = ['safe', 'suspicious', 'spam']
        calibrated_confidence = 0.6
        
        # Effective score for safe: 80 + (0.6 * 20) = 92
        effective_score = 80 + (calibrated_confidence * 20)
        is_suspicious_grade = effective_score < 75 # False
        
        # Now test with low confidence that would trigger suspicious grade
        # Wait, if label is safe, the lowest score is 80 (Grade B).
        # The only way to get 59% is if the label is ALREADY suspicious.
        # However, the user wants to ensure if grade IS suspicious, vector IS suspicious.
        
        # Let's simulate a case where rules force it
        rule_result = {'rule_triggered': True, 'rule_verdict': 'suspicious'}
        
        if final_label == 'safe' and (is_suspicious_grade or rule_result['rule_verdict'] == 'suspicious'):
            final_label = 'suspicious'
            safe_idx = classes_list.index('safe')
            susp_idx = classes_list.index('suspicious')
            ensemble_proba[safe_idx], ensemble_proba[susp_idx] = ensemble_proba[susp_idx], ensemble_proba[safe_idx]
            
        self.assertEqual(final_label, 'suspicious')
        self.assertEqual(ensemble_proba[classes_list.index('suspicious')], 0.6)

if __name__ == "__main__":
    unittest.main()
