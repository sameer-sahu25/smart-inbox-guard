
import json
import sys
import os

# Mock dependencies to test logic without running the server
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.main import validate_analysis_consistency

def test_consistency_logic():
    print("Testing Consistency Validation Logic...")
    
    # 1. Test SPAM alignment (Score > 35)
    spam_bad_score = {
        "verdict": "SPAM",
        "neuralSafetyScore": 45,
        "safetyGrade": "F",
        "gradeLabel": "CONFIRMED SPAM",
        "identifiedProblems": [{"id": 1, "severity": "CRITICAL"}],
        "neuralFlags": [{"id": 1, "indicator": "Flag"}],
        "senderTrust": {"level": "DANGEROUS", "icon": "skull", "verification_status": "FAILED"},
        "safetyAssessment": {
            "action": {"label": "BLOCK & QUARANTINE", "color": "#ff0033"},
            "userRisk": {"level": "CRITICAL", "color": "#ff0033"},
            "dataRisk": {"level": "SEVERE", "color": "#ff0033"},
            "recommended": {"primary": "Block sender"},
            "statusBadge": {"label": "CRITICAL THREAT"}
        },
        "confidenceLevel": "HIGH",
        "totalProblemsCount": 1
    }
    
    result = validate_analysis_consistency(spam_bad_score)
    print(f"Rule 1 (SPAM Score): {result['neuralSafetyScore']} (Expected < 35)")
    assert result['neuralSafetyScore'] < 35
    
    # 2. Test SAFE alignment (Score < 55)
    safe_bad_score = {
        "verdict": "SAFE",
        "neuralSafetyScore": 30,
        "safetyGrade": "B",
        "gradeLabel": "LIKELY SAFE",
        "identifiedProblems": [],
        "neuralFlags": [],
        "senderTrust": {"level": "VERIFIED", "icon": "shield-check", "verification_status": "VERIFIED"},
        "safetyAssessment": {
            "action": {"label": "ALLOW", "color": "#00cc66"},
            "userRisk": {"level": "NONE", "color": "#00cc66"},
            "dataRisk": {"level": "MINIMAL", "color": "#00cc66"},
            "recommended": {"primary": "None"},
            "statusBadge": {"label": "SAFE"}
        },
        "confidenceLevel": "HIGH",
        "totalProblemsCount": 0
    }
    
    result = validate_analysis_consistency(safe_bad_score)
    print(f"Rule 1 (SAFE Score): {result['neuralSafetyScore']} (Expected > 55)")
    assert result['neuralSafetyScore'] > 55

    # 3. Test Rule 10 (SAFE with Critical Problems)
    safe_with_problems = {
        "verdict": "SAFE",
        "neuralSafetyScore": 85,
        "safetyGrade": "A",
        "gradeLabel": "VERIFIED SAFE",
        "identifiedProblems": [{"id": 1, "severity": "CRITICAL", "title": "Phishing"}],
        "neuralFlags": [],
        "senderTrust": {"level": "VERIFIED", "icon": "shield-check", "verification_status": "VERIFIED"},
        "safetyAssessment": {
            "action": {"label": "ALLOW", "color": "#00cc66"},
            "userRisk": {"level": "NONE", "color": "#00cc66"},
            "dataRisk": {"level": "MINIMAL", "color": "#00cc66"},
            "recommended": {"primary": "None"},
            "statusBadge": {"label": "SAFE"}
        },
        "confidenceLevel": "HIGH",
        "totalProblemsCount": 1
    }
    
    result = validate_analysis_consistency(safe_with_problems)
    print(f"Rule 10 (SAFE Upgrade): {result['verdict']} (Expected SUSPICIOUS)")
    assert result['verdict'] == "SUSPICIOUS"

    print("\nAll Consistency Logic Tests Passed!")

if __name__ == "__main__":
    test_consistency_logic()
