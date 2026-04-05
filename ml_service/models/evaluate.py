import pandas as pd  # type: ignore
import numpy as np
import pickle
import json
import os
import sys
from typing import Any
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

# Add parent directory to path to import core and utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
from core.preprocessor import EmailPreprocessor
from core.feature_engine import FeatureEngine
from utils.calibrator import ProbabilityCalibrator
from utils.explainer import PredictionExplainer

def evaluate(test_file_path=None):
    print("Starting production health check evaluation...")
    
    # 1. Load data
    model_dir = os.path.dirname(os.path.abspath(__file__))
    if test_file_path and os.path.exists(test_file_path):
        print(f"Loading custom test dataset from: {test_file_path}")
        df_test = pd.read_csv(test_file_path)
    else:
        dataset_path = os.path.join(os.path.dirname(model_dir), 'data', 'master_training_set.csv')
        if not os.path.exists(dataset_path):
            dataset_path = os.path.join(os.path.dirname(model_dir), 'data', 'final_classification', 'email_classification_dataset.csv')
        
        json_path = os.path.join(os.path.dirname(model_dir), 'data', 'final_classification', 'email_classification_dataset.json')
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                data = json.load(f)
            df = pd.DataFrame(data)
        else:
            df = pd.read_csv(dataset_path, header=None, names=['sender', 'subject', 'body', 'category', 'word_count', 'char_count'])
        
        # Re-derive test split using same random_state=42
        _, df_test = train_test_split(df, test_size=0.20, random_state=42, stratify=df['category'])
    
    print(f"Testing on {len(df_test)} samples.")

    # 2. Load artifacts
    model_dir = os.path.dirname(os.path.abspath(__file__))
    
    with open(os.path.join(model_dir, 'artifacts', 'model_stage1.pkl'), 'rb') as f:
        stage1_pipeline = joblib.load(f)
        
    with open(os.path.join(model_dir, 'artifacts', 'model_stage2.pkl'), 'rb') as f:
        stage2_model = joblib.load(f)
        
    with open(os.path.join(model_dir, 'artifacts', 'model_stage3.pkl'), 'rb') as f:
        stage3_model = joblib.load(f)
        
    with open(os.path.join(model_dir, 'artifacts', 'label_classes.pkl'), 'rb') as f:
        classes = joblib.load(f)
        
    with open(os.path.join(model_dir, 'artifacts', 'stage3_feature_names.pkl'), 'rb') as f:
        stage3_feature_names = joblib.load(f)

    # 3. Preprocess and Predict
    preprocessor = EmailPreprocessor()
    feature_engine = FeatureEngine()
    
    # Text predictions
    X_test_text = df_test['body'].apply(preprocessor.clean)
    stage1_probas = stage1_pipeline.predict_proba(X_test_text)
    stage2_probas = stage2_model.predict_proba(X_test_text)
    
    # Structural predictions
    def extract_structural(row):
        signals = preprocessor.extract_signals(row['body'])
        risk_phrases = preprocessor.get_risk_phrases(row['body'])
        signals['risk_phrases'] = risk_phrases
        return feature_engine.extract(row['subject'], row['body'], row.get('sender', 'unknown@sender.com'), signals)

    structural_features_list = df_test.apply(extract_structural, axis=1).tolist()
    X_test_struct = pd.DataFrame(structural_features_list)
    
    # Align features for Stage 3
    for col in stage3_feature_names:
        if col not in X_test_struct.columns:
            X_test_struct[col] = 0
    X_test_struct = X_test_struct[stage3_feature_names]
    
    stage3_probas = stage3_model.predict_proba(X_test_struct)
    
    # Ensemble weighted average (Improvement 4: Dynamic weights)
    ensemble_probas = (0.40 * stage1_probas) + (0.20 * stage2_probas) + (0.40 * stage3_probas)
    ensemble_preds = np.array(classes)[np.argmax(ensemble_probas, axis=1)]
    
    # Scoring Framework Implementation (Improvement 4)
    def calculate_safety_score(probs, label, classes_list):
        spam_idx = classes_list.tolist().index('spam') if hasattr(classes_list, 'tolist') else list(classes_list).index('spam')
        spam_prob = probs[spam_idx]
        
        # Safety Score (1-100)
        # 0-30: SCAM, 31-79: SUSPICIOUS, 80-100: SAFE
        score = round((1 - spam_prob) * 100)
        
        if score >= 80: category = "SAFE"
        elif score >= 31: category = "SUSPICIOUS"
        else: category = "SCAM"
        
        return score, category

    # 4. Generate Report
    accuracy = np.mean(ensemble_preds == df_test['category'])
    
    # Precision, Recall, F1 per category
    precision, recall, f1_scores, support = precision_recall_fscore_support(
        df_test['category'], ensemble_preds, labels=classes
    )
    
    # False Positive Rate Calculation
    # FP / (FP + TN)
    cm = confusion_matrix(df_test['category'], ensemble_preds, labels=classes)
    fprs = []
    for i in range(len(classes)):
        fp = cm[:, i].sum() - cm[i, i]
        tn = cm.sum() - (cm[i, :].sum() + cm[:, i].sum() - cm[i, i])
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fprs.append(fpr)

    report_text = []
    report_text.append("--- ENHANCED SECURITY ANALYTICS REPORT ---")
    report_text.append(f"Date: {pd.Timestamp.now()}")
    report_text.append(f"Model Architecture: 3-Stage Multi-Dimensional Ensemble (v4.2.0-PRO)")
    report_text.append(f"Total Samples Tested: {len(df_test)}")
    report_text.append(f"Overall Accuracy: {accuracy:.4f}")
    
    report_text.append("\nDetailed Performance Metrics (Per Category):")
    for i, class_name in enumerate(classes):
        report_text.append(f"[{class_name.upper()}]")
        report_text.append(f"  Precision: {precision[i]:.4f}")
        report_text.append(f"  Recall: {recall[i]:.4f}")
        report_text.append(f"  F1-Score: {f1_scores[i]:.4f}")
        report_text.append(f"  False Positive Rate: {fprs[i]:.4f}")
    
    report_text.append("\nScoring Framework Validation (Confidence Intervals):")
    # Group by score ranges
    results_df = pd.DataFrame({
        'actual': df_test['category'],
        'predicted': ensemble_preds,
        'spam_prob': ensemble_probas[:, list(classes).index('spam')]
    })
    results_df['score'] = (1 - results_df['spam_prob']) * 100
    
    bands = [
        (80, 100, "SAFE (High Confidence)"),
        (31, 79, "SUSPICIOUS (Moderate Risk)"),
        (0, 30, "SCAM (High Risk)")
    ]
    
    for low, high, name in bands:
        mask = (results_df['score'] >= low) & (results_df['score'] <= high)
        band_data = results_df[mask]
        if len(band_data) > 0:
            band_accuracy = np.mean(band_data['actual'] == band_data['predicted'])
            report_text.append(f"Band {low}-{high} [{name}]: Accuracy={band_accuracy:.2%}, Count={len(band_data)}")
        else:
            report_text.append(f"Band {low}-{high} [{name}]: No samples")

    report_text.append("\nConfusion Matrix:")
    report_text.append(str(cm))

    # 5. Explainer samples
    explainer = PredictionExplainer()
    report_text.append("\n--- SAMPLE PREDICTIONS WITH EXPLANATIONS ---")
    
    samples = df_test.sample(15)
    for idx, row in samples.iterrows():
        # Re-run prediction for this sample
        text_clean = preprocessor.clean(row['body'])
        s1_p = stage1_pipeline.predict_proba([text_clean])[0]
        s2_p = stage2_model.predict_proba([text_clean])[0]
        
        signals = preprocessor.extract_signals(row['body'])
        risk_phrases = preprocessor.get_risk_phrases(row['body'])
        signals['risk_phrases'] = risk_phrases
        struct_feats = feature_engine.extract(row['subject'], row['body'], row.get('sender', 'unknown@sender.com'), signals)
        
        feat_df = pd.DataFrame([struct_feats])
        for col in stage3_feature_names:
            if col not in feat_df.columns:
                feat_df[col] = 0
        feat_df = feat_df[stage3_feature_names]
        s3_p = stage3_model.predict_proba(feat_df)[0]
        
        ensemble_p = (0.40 * s1_p) + (0.20 * s2_p) + (0.40 * s3_p)
        label_idx = np.argmax(ensemble_p)
        label = classes[label_idx]
        
        # Explain
        tfidf = stage1_pipeline.named_steps['tfidf']
        nb = stage1_pipeline.named_steps.get('clf') or stage1_pipeline.named_steps.get('nb')
        feature_names = tfidf.get_feature_names_out()
        
        top_indices = np.argsort(nb.feature_log_prob_[label_idx])[-10:]
        top_features = [{"feature": feature_names[i], "weight": float(nb.feature_log_prob_[label_idx][i]), "category": "text"} for i in top_indices]

        explanation = explainer.explain(
            label=label,
            confidence=float(ensemble_p[label_idx]),
            top_features=top_features,
            signals=signals,
            risk_phrases=risk_phrases,
            triggered_rules=[], 
            is_uncertain=False,
            sender=row.get('sender', 'unknown@sender.com')
        )
        
        report_text.append(f"\n[Sample ID: {idx}]")
        report_text.append(f"Subject: {row['subject']}")
        report_text.append(f"Actual: {row['category']} | Predicted: {label} ({ensemble_p[label_idx]:.2f})")
        report_text.append(f"Rationale: {explanation['reasoning_rationale']}")

    # Save to file
    report_file = os.path.join(model_dir, 'evaluation_report.txt')
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(report_text))
        
    print(f"Evaluation report saved to: {report_file}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate ML model")
    parser.add_argument("--test-file", type=str, help="Path to custom test CSV file")
    args = parser.parse_args()
    
    evaluate(args.test_file)
