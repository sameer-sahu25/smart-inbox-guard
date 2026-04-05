import numpy as np
from sklearn.isotonic import IsotonicRegression
import pickle

class ProbabilityCalibrator:
    def __init__(self):
        self.calibrators = {}  # One calibrator per class

    @property
    def is_loaded(self) -> bool:
        """Check if any calibrators are loaded."""
        return len(self.calibrators) > 0

    def fit(self, raw_probas: np.ndarray, true_labels: np.ndarray, classes: list):
        """Fit isotonic regression calibrators for each class."""
        for i, class_name in enumerate(classes):
            ir = IsotonicRegression(out_of_bounds='clip')
            # Fit on the probability of being this class
            ir.fit(raw_probas[:, i], (true_labels == class_name).astype(int))
            self.calibrators[class_name] = ir

    def calibrate(self, raw_probas: dict) -> dict:
        """Apply fitted calibrators to raw probabilities and enforce score ranges (Fix 2)."""
        calibrated = {}
        for class_name, prob in raw_probas.items():
            if class_name in self.calibrators:
                calibrated[class_name] = float(self.calibrators[class_name].transform([prob])[0])
            else:
                calibrated[class_name] = prob
        
        # Re-normalize
        total = sum(calibrated.values())
        if total > 0:
            calibrated = {k: v / total for k, v in calibrated.items()}
            
        # Determine winning class
        if calibrated:
            winning_class = max(calibrated, key=lambda k: calibrated[k])
            winning_prob = calibrated[winning_class]
            
            # Enforce range clamping based on winning class
            if winning_class == 'safe':
                # Tier 3: SAFE (80-100)
                if winning_prob < 0.80:
                    calibrated['safe'] = 0.80 + (winning_prob * 0.20)
            elif winning_class == 'suspicious':
                # Tier 2: SUSPICIOUS (31-79)
                if winning_prob < 0.31 or winning_prob > 0.79:
                    calibrated['suspicious'] = 0.31 + (winning_prob * 0.48)
            elif winning_class in ['spam', 'scam']:
                # Tier 1: SCAM (1-30)
                # Lower prob in calibrated means more malicious (1-30)
                if winning_prob > 0.30:
                    calibrated[winning_class] = winning_prob * 0.30
                # Ensure it doesn't hit 0
                calibrated[winning_class] = max(0.01, calibrated[winning_class])
                    
            # Final re-normalization
            total = sum(calibrated.values())
            calibrated = {k: v / total for k, v in calibrated.items()}

        return calibrated

    def get_uncertainty_level(self, calibrated_confidence: float) -> str:
        """Categorize confidence level."""
        if calibrated_confidence > 0.90:
            return "very_high"
        elif calibrated_confidence >= 0.75:
            return "high"
        elif calibrated_confidence >= 0.65:
            return "medium"
        else:
            return "low"

    def is_uncertain(self, calibrated_confidence: float) -> bool:
        """Check if confidence is below human-review threshold."""
        return calibrated_confidence < 0.65

    def save(self, path: str):
        with open(path, 'wb') as f:
            pickle.dump(self.calibrators, f)

    def load(self, path: str):
        with open(path, 'rb') as f:
            self.calibrators = pickle.load(f)
