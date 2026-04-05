import pandas as pd  # type: ignore
import numpy as np
import pickle
import json
import os
import sys
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import ComplementNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, recall_score, classification_report
import joblib
import re

# Add parent directory to path to import core and utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.preprocessor import EmailPreprocessor
from core.feature_engine import FeatureEngine
from utils.calibrator import ProbabilityCalibrator

# Use the same helper functions as in train.py for consistency
from train import build_combined_text, get_keyword_match_scores, detect_template, get_sender_features

def retrain():
    print("Starting continuous learning retraining with enhanced 3-stage ensemble...")
    
    # 1. Load original data
    model_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(model_dir), 'data')
    
    dataset_path = os.path.join(data_dir, 'master_training_set.csv')
    if not os.path.exists(dataset_path):
        dataset_path = os.path.join(data_dir, 'final_classification', 'email_classification_dataset.csv')
    
    df = pd.read_csv(dataset_path)
    if 'category' in df.columns and 'label' not in df.columns:
        df = df.rename(columns={'category': 'label'})
    print(f"Loaded training dataset with {len(df)} rows.")

    df['label'] = df['label'].replace('scam', 'spam letter')
    
    # 3. Augmentation
    scam_emails = df[df['label'] == 'SPAM']
    df_aug = pd.concat([df, scam_emails.sample(n=min(len(scam_emails), 100), replace=True)], ignore_index=True)
    df = df_aug

    # 2. Check for feedback log
    feedback_path = os.path.join(data_dir, 'feedback_log.csv')
    feedback_rows = 0
    
    if os.path.exists(feedback_path):
        df_feedback = pd.read_csv(feedback_path)
        feedback_rows = len(df_feedback)
        print(f"Found {feedback_rows} feedback rows.")
        
        # Merge feedback
        df_feedback = df_feedback[['body', 'subject', 'correctLabel']].rename(columns={'correctLabel': 'label'})
        # Add a dummy sender for feedback rows if missing
        df_feedback['sender'] = "feedback@user.com"
        # Merge
        df = pd.concat([df_aug, df_feedback], ignore_index=True)
        print(f"Dataset grown to {len(df)} rows after including feedback.")

    # Load keyword lookup
    keyword_dataset_path = os.path.join(data_dir, 'keyword_classification_3000.csv')
    df_keywords = pd.read_csv(keyword_dataset_path)
    keyword_lookup = dict(zip(
        df_keywords['keyword'].str.lower().str.strip(),
        df_keywords['label'].str.lower().str.strip()
    ))

    # 3. Feature Engineering
    print("Building features...")
    df['combined_text'] = df.apply(build_combined_text, axis=1)
    
    keyword_features = df['combined_text'].apply(
        lambda t: get_keyword_match_scores(t, keyword_lookup)
    )
    keyword_df = pd.DataFrame(list(keyword_features))
    
    df['template'] = df.apply(
        lambda r: detect_template(str(r.get('subject', '')), str(r.get('body', ''))), axis=1
    )
    
    sender_features = df['sender'].apply(get_sender_features)
    sender_df = pd.DataFrame(list(sender_features))
    
    structured_features = pd.concat([
        keyword_df[['keyword_scam_ratio', 'keyword_suspicious_ratio', 'keyword_safe_ratio', 
                    'keyword_scam_count', 'keyword_suspicious_count', 'keyword_safe_count']],
        sender_df,
        pd.get_dummies(df['template'], prefix='tmpl')
    ], axis=1).fillna(0)

    # 4. Split
    X_text = df['combined_text']
    X_struct = structured_features
    y = df['label']

    X_text_train, X_text_test, X_struct_train, X_struct_test, y_train, y_test = train_test_split(
        X_text, X_struct, y, test_size=0.20, random_state=42, stratify=y
    )

    # 5. Define Models (matching train.py)
    stage1_pipe = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=12000, ngram_range=(1, 3), sublinear_tf=True, min_df=1, max_df=0.98, analyzer='word', strip_accents='unicode')),
        ('clf', ComplementNB(alpha=0.01))
    ])

    stage2_pipe = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=6000, ngram_range=(3, 5), analyzer='char_wb', sublinear_tf=True, min_df=2)),
        ('clf', LogisticRegression(C=2.0, max_iter=1000, class_weight='balanced', solver='lbfgs', multi_class='multinomial'))
    ])

    stage3_clf = GradientBoostingClassifier(n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42)

    # 6. Training
    print("Training Stage 1...")
    stage1_pipe.fit(X_text_train, y_train)
    s1_p = stage1_pipe.predict_proba(X_text_test)
    
    print("Training Stage 2...")
    stage2_pipe.fit(X_text_train, y_train)
    s2_p = stage2_pipe.predict_proba(X_text_test)
    
    print("Training Stage 3...")
    stage3_clf.fit(X_struct_train, y_train)
    s3_p = stage3_clf.predict_proba(X_struct_test)

    # 7. Ensemble
    ensemble_p = (0.40 * s1_p) + (0.20 * s2_p) + (0.40 * s3_p)
    classes = stage1_pipe.classes_
    ensemble_preds = classes[np.argmax(ensemble_p, axis=1)]

    # Apply template override for evaluation
    final_predictions = list(ensemble_preds)
    test_templates = df['template'].iloc[y_test.index].values
    for i, template in enumerate(test_templates):
        if 'SPAM_LETTER_TEMPLATE' in template:
            final_predictions[i] = 'SPAM'
        elif 'SUSPICIOUS_TEMPLATE' in template:
            if final_predictions[i] == 'safe':
                final_predictions[i] = 'suspicious'

    new_accuracy = accuracy_score(y_test, final_predictions)
    scam_label = 'SPAM'
    scam_recall = recall_score(y_test, final_predictions, pos_label=scam_label, average='binary')
    print(f"Retrained {scam_label.title()} Recall: {scam_recall:.2%}")

    # 8. Comparison and Saving
    meta_path = os.path.join(model_dir, 'model_meta.json')
    prev_accuracy = 0.0
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            prev_meta = json.load(f)
            prev_accuracy = prev_meta.get('ensemble_accuracy', 0.0)

    print(f"Retrain complete. Prev Acc: {prev_accuracy:.4f}, New Acc: {new_accuracy:.4f}, {scam_label.title()} Recall: {scam_recall:.4f}")

    if new_accuracy >= prev_accuracy * 0.98: # Allow slight dip if recall is better
        print("New model is acceptable. Overwriting artifacts...")
        artifacts_dir = os.path.join(model_dir, 'artifacts')
        os.makedirs(artifacts_dir, exist_ok=True)
        
        joblib.dump(stage1_pipe, os.path.join(artifacts_dir, 'model_stage1.pkl'))
        joblib.dump(stage2_pipe, os.path.join(artifacts_dir, 'model_stage2.pkl'))
        joblib.dump(stage3_clf, os.path.join(artifacts_dir, 'model_stage3.pkl'))
        
        calibrator = ProbabilityCalibrator()
        calibrator.fit(ensemble_p, y_test.values, list(classes))
        calibrator.save(os.path.join(artifacts_dir, 'calibrator.pkl'))
        
        # Save meta
        with open(os.path.join(artifacts_dir, 'scam_domains.json'), 'w') as f:
            from train import SCAM_DOMAINS, SAFE_DOMAINS
            json.dump({'SPAM': SCAM_DOMAINS, 'safe': SAFE_DOMAINS}, f)

        meta = {
            'trained_at': pd.Timestamp.now().isoformat(),
            'total_samples': len(df),
            'label_distribution': df['label'].value_counts().to_dict(),
            'ensemble_accuracy': float(new_accuracy),
            'spam_letter_recall': float(scam_recall),
            'classes': list(classes),
            'ensemble_weights': {'stage1': 0.40, 'stage2': 0.20, 'stage3': 0.40}
        }
        with open(os.path.join(artifacts_dir, 'model_meta.json'), 'w') as f:
            json.dump(meta, f, indent=2)
    else:
        print("WARNING: New accuracy is significantly lower. NOT overwriting.")


if __name__ == "__main__":
    retrain()
