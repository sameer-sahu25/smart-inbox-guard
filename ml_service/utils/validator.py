import os
import pickle
import json
import logging
import joblib
import sys
import numpy as np
import pandas as pd # type: ignore
from typing import Dict, Any, List

logger = logging.getLogger("model-validator")

class ModelValidator:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.artifacts_dir = os.path.join(model_dir, 'artifacts')
        self.required_files = [
            'model_stage1.pkl',
            'model_stage2.pkl',
            'model_stage3.pkl',
            'stage3_feature_names.pkl',
            'label_classes.pkl',
            'model_meta.json',
            'keyword_lookup.json',
            'scam_domains.json'
        ]

    def validate_presence(self) -> bool:
        """Check if all required files exist."""
        missing = []
        for f in self.required_files:
            path = os.path.join(self.artifacts_dir, f)
            if not os.path.exists(path):
                # Check model_dir as fallback
                path = os.path.join(self.model_dir, f)
                if not os.path.exists(path):
                    missing.append(f)
        
        if missing:
            logger.error(f"Missing required artifacts: {', '.join(missing)}")
            return False
        return True

    def validate_load(self) -> bool:
        """Try loading all artifacts to ensure they aren't corrupted."""
        try:
            # Stage 1
            s1_path = self._get_path('model_stage1.pkl')
            joblib.load(s1_path)
            
            # Stage 2
            s2_path = self._get_path('model_stage2.pkl')
            joblib.load(s2_path)
                
            # Stage 3
            s3_path = self._get_path('model_stage3.pkl')
            joblib.load(s3_path)
            
            # Feature names
            feat_names_path = self._get_path('stage3_feature_names.pkl')
            joblib.load(feat_names_path)
                
            # Classes
            cls_path = self._get_path('label_classes.pkl')
            joblib.load(cls_path)
                
            # Meta
            meta_path = self._get_path('model_meta.json')
            with open(meta_path, 'r') as f:
                json.load(f)
                
            return True
        except Exception as e:
            logger.error(f"Artifact corruption detected: {e}")
            return False

    def smoke_test(self, preprocessor, feature_engine) -> bool:
        """Run a simple prediction to ensure everything works end-to-end."""
        try:
            # Dummy data
            test_body = "This is a smoke test email for the enhanced scoring system."
            test_subject = "Smoke Test"
            test_sender = "tester@company.com"
            
            # Preprocess
            signals = preprocessor.extract_signals(test_body)
            # Features
            struct_feats = feature_engine.extract(test_subject, test_body, test_sender, signals)
            
            # Load models for testing
            s1 = joblib.load(self._get_path('model_stage1.pkl'))
            s2 = joblib.load(self._get_path('model_stage2.pkl'))
            s3 = joblib.load(self._get_path('model_stage3.pkl'))
                
            # Predict
            p1 = s1.predict_proba([signals['cleaned_text']])[0]
            p2 = s2.predict_proba([signals['cleaned_text']])[0]
            
            # Load feature names for Stage 3
            feat_names = joblib.load(self._get_path('stage3_feature_names.pkl'))
            feat_df = pd.DataFrame([struct_feats])
            # Handle potentially missing template columns in dummy data
            for col in feat_names:
                if col not in feat_df.columns:
                    feat_df[col] = 0
            feat_df = feat_df[feat_names]
            
            p3 = s3.predict_proba(feat_df)[0]
            
            ensemble = (0.4 * p1) + (0.2 * p2) + (0.4 * p3)
            return len(ensemble) > 0
        except Exception as e:
            logger.error(f"Smoke test failed: {e}")
            return False

    def _get_path(self, filename: str) -> str:
        path = os.path.join(self.artifacts_dir, filename)
        if not os.path.exists(path):
            path = os.path.join(self.model_dir, filename)
        return path

if __name__ == "__main__":
    # Self-test
    logging.basicConfig(level=logging.INFO)
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from core.preprocessor import EmailPreprocessor
    from core.feature_engine import FeatureEngine
    
    validator = ModelValidator(os.path.join(os.path.dirname(__file__), '..', 'models'))
    print(f"Presence: {validator.validate_presence()}")
    print(f"Load: {validator.validate_load()}")
    
    pre = EmailPreprocessor()
    fe = FeatureEngine()
    print(f"Smoke Test: {validator.smoke_test(pre, fe)}")
