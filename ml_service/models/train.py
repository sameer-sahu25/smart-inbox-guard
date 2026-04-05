import pandas as pd  # type: ignore
import numpy as np
import pickle
import json
import os
import sys
from datetime import datetime
from typing import Any, cast, List, Dict
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import ComplementNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, recall_score
import joblib
import re

# Add parent directory to path to import core and utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.preprocessor import EmailPreprocessor
from core.feature_engine import FeatureEngine

SCAM_DOMAINS = ['fakemailgenerator', 'guerrillamail', 'tempmail', 
                'throwawaymail', 'mailnull', 'spamgourmet', 'trashmail', 'mailinator', 'yopmail']
SAFE_DOMAINS = ['company', 'gmail', 'outlook', 'university', 
                'yahoo', 'hotmail', 'corporate', 'icloud', 'protonmail']

def build_combined_text(row):
    sender = str(row.get('sender', ''))
    subject = str(row.get('subject', ''))
    body = str(row.get('body', ''))

    sender_domain = ''
    if '@' in sender:
        sender_domain = sender.split('@')[1].split('.')[0]
        if sender_domain in SCAM_DOMAINS:
            sender_domain = 'SPAM_LETTER_DOMAIN SPAM_LETTER_DOMAIN SPAM_LETTER_DOMAIN'

    return f"{sender_domain} {subject} {body}".strip()

def get_keyword_match_scores(text, keyword_lookup):
    words = text.lower().split()
    scam_hits = sum(1 for w in words if keyword_lookup.get(w) == 'spam')
    suspicious_hits = sum(1 for w in words if keyword_lookup.get(w) == 'suspicious')
    safe_hits = sum(1 for w in words if keyword_lookup.get(w) == 'safe')
    total = max(len(words), 1)
    return {
        'keyword_scam_ratio': scam_hits / total,
        'keyword_suspicious_ratio': suspicious_hits / total,
        'keyword_safe_ratio': safe_hits / total,
        'keyword_scam_count': scam_hits,
        'keyword_suspicious_count': suspicious_hits,
        'keyword_safe_count': safe_hits,
        'keyword_dominant': 'spam' if scam_hits > suspicious_hits and scam_hits > safe_hits 
                            else 'suspicious' if suspicious_hits > safe_hits 
                            else 'safe'
    }

def detect_template(subject, body):
    text = f"{subject} {body}".lower()

    if re.search(r'invest in .+ now and earn .+ in just \d+ hours', text):
        return 'SPAM_TEMPLATE_A'
    if re.search(r'urgent.{0,20}waiting for your approval.{0,50}bank details', text):
        return 'SPAM_TEMPLATE_B'
    if 'guaranteed returns' in text or 'guaranteed return' in text:
        return 'SPAM_TEMPLATE_C'
    if re.search(r'security alert.{0,30}detected', text):
        return 'SUSPICIOUS_TEMPLATE_A'
    if re.search(r'action required.{0,30}flagged', text):
        return 'SUSPICIOUS_TEMPLATE_B'

    return 'NO_TEMPLATE'

def get_sender_features(sender):
    sender = str(sender).lower()
    if '@' in sender:
        parts = sender.split('@')[1].split('.')
        domain = parts[-2] if len(parts) >= 2 else parts[0]
        local_part = sender.split('@')[0]
        tld = sender.split('.')[-1]
    else:
        domain = ''
        local_part = sender
        tld = ''
        
    high_risk_tlds = ['zip', 'mov', 'top', 'xyz', 'icu', 'party', 'gdn', 'bid', 'click', 'link']
        
    return {
        'sender_is_scam_domain': 1 if domain in SCAM_DOMAINS else 0,
        'sender_is_safe_domain': 1 if domain in SAFE_DOMAINS else 0,
        'sender_has_numbers': 1 if any(c.isdigit() for c in local_part) else 0,
        'sender_domain_length': min(len(domain) / 30.0, 1.0),
        'sender_is_high_risk_tld': 1 if tld in high_risk_tlds else 0,
        'sender_has_excessive_numbers': 1 if sum(c.isdigit() for c in local_part) > 4 else 0,
        'sender_has_suspicious_patterns': 1 if re.search(r'[._-]{2,}', sender) else 0
    }

def get_behavioral_features(row):
    text = f"{row.get('subject', '')} {row.get('body', '')}".lower()
    words = text.split()
    total_words = max(len(words), 1)
    
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-f_A-F][0-9a-f_A-F]))+', text)
    has_shortened_url = 1 if any(re.search(r'(bit\.ly|t\.co|goo\.gl|tinyurl\.com|is\.gd|buff\.ly|ow\.ly|v\.gd|tr\.im)', url) for url in urls) else 0
    has_ip_url = 1 if any(re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url) for url in urls) else 0
    
    urgency_words = ["urgent", "immediately", "hurry", "fast", "quick", "action required", "last chance", "final notice", "deadline"]
    pressure_words = ["penalty", "suspended", "closed", "blocked", "legal action", "fine", "arrest", "lawsuit"]
    personalization_placeholders = ["dear user", "dear customer", "valuable member", "dear friend"]
    
    urgency_score = sum(1 for word in urgency_words if word in text) / total_words
    pressure_score = sum(1 for word in pressure_words if word in text) / total_words
    is_generic_greeting = 1 if any(p in text for p in personalization_placeholders) else 0
    link_density = len(urls) / total_words
    
    return {
        'has_shortened_url': has_shortened_url,
        'has_ip_url': has_ip_url,
        'urgency_score': urgency_score,
        'pressure_score': pressure_score,
        'is_generic_greeting': is_generic_greeting,
        'link_density': link_density
    }

def train():
    print("Starting rebuilding ML training pipeline with strict dataset-specific intelligence...")
    
    # 1. Load data
    model_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(model_dir), 'data')
    
    # Fix 1: Load all four dataset files correctly
    # A. Email dataset (Load from JSON if CSV is empty/incomplete)
    json_path = os.path.join(data_dir, 'final_classification', 'email_classification_dataset.json')
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            email_data = json.load(f)
        df_primary = pd.DataFrame(email_data)
        if 'category' in df_primary.columns:
            df_primary = df_primary.rename(columns={'category': 'label'})
    else:
        primary_dataset_path = os.path.join(data_dir, 'email_classification_3000.csv')
        df_primary = pd.read_csv(primary_dataset_path, header=None, names=['sender', 'subject', 'body', 'label'])
    
    # Standardize labels
    df_primary['label'] = df_primary['label'].str.lower().str.strip().replace({'scam': 'spam', 'spam letter': 'spam'})
    # Ensure all required columns exist
    if 'sender' not in df_primary.columns: df_primary['sender'] = ''
        
    # B. Keyword datasets
    keyword_files = [
        'keyword_classification_3000.csv',
        'my_custom_dataset.csv',
        'test_keywords.csv'
    ]
    
    keyword_lookup = {}
    for kf in keyword_files:
        kf_path = os.path.join(data_dir, kf)
        if os.path.exists(kf_path):
            # Try reading with header, then without
            try:
                df_k = pd.read_csv(kf_path)
                if 'keyword' not in df_k.columns:
                    df_k = pd.read_csv(kf_path, header=None, names=['keyword', 'label'])
            except:
                df_k = pd.read_csv(kf_path, header=None, names=['keyword', 'label'])
                
            for _, row in df_k.iterrows():
                kw = str(row['keyword']).lower().strip()
                lbl = str(row['label']).lower().strip().replace('scam', 'spam').replace('spam letter', 'spam')
                keyword_lookup[kw] = lbl
    
    print(f"Loaded {len(df_primary)} emails")
    print(f"Loaded and merged {len(keyword_lookup)} labeled keywords")
    print(f"Label distribution:\n{df_primary['label'].value_counts()}")

    # 2. Feature Engineering
    print("Building features...")
    df_primary['combined_text'] = df_primary.apply(build_combined_text, axis=1)
    
    keyword_features = df_primary['combined_text'].apply(
        lambda t: get_keyword_match_scores(t, keyword_lookup)
    )
    keyword_df = pd.DataFrame(list(keyword_features))
    
    df_primary['template'] = df_primary.apply(
        lambda r: detect_template(str(r.get('subject', '')), str(r.get('body', ''))), axis=1
    )
    
    sender_features = df_primary['sender'].apply(get_sender_features)
    sender_df = pd.DataFrame(list(sender_features))
    
    behavioral_features = df_primary.apply(get_behavioral_features, axis=1)
    behavioral_df = pd.DataFrame(list(behavioral_features))
    
    structured_features = pd.concat([
        keyword_df[['keyword_scam_ratio', 'keyword_suspicious_ratio', 'keyword_safe_ratio', 
                    'keyword_scam_count', 'keyword_suspicious_count', 'keyword_safe_count']],
        sender_df,
        behavioral_df,
        pd.get_dummies(df_primary['template'], prefix='tmpl')
    ], axis=1).fillna(0)

    X_text = df_primary['combined_text']
    X_struct = structured_features
    y = df_primary['label']

    # 3. Model Definition
    # Compute balanced class weights
    class_weights = y.value_counts().to_dict()
    total_samples = sum(class_weights.values())
    balanced_weights = {
        label: total_samples / (len(class_weights) * count)
        for label, count in class_weights.items()
    }
    print(f"Using balanced class weights: {balanced_weights}")

    stage1_pipe = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=12000,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=1,
            max_df=0.98,
            analyzer='word',
            strip_accents='unicode'
        )),
        ('clf', ComplementNB(alpha=0.01))
    ])

    stage2_pipe = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=6000,
            ngram_range=(3, 5),
            analyzer='char_wb',
            sublinear_tf=True,
            min_df=2
        )),
        ('clf', LogisticRegression(
            C=2.0,
            max_iter=1000,
            class_weight=balanced_weights,
            solver='lbfgs',
            multi_class='multinomial'
        ))
    ])

    stage3_clf = GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_split=5,
        random_state=42
    )

    # 4. Stratified Split
    X_text = df_primary['combined_text']
    X_struct = structured_features
    y = df_primary['label']

    X_text_train, X_text_test, X_struct_train, X_struct_test, y_train, y_test = train_test_split(
        X_text, X_struct, y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    # 5. Training
    print("Training Stages...")
    stage1_pipe.fit(X_text_train, y_train)
    s1_test_proba = stage1_pipe.predict_proba(X_text_test)
    
    stage2_pipe.fit(X_text_train, y_train)
    s2_test_proba = stage2_pipe.predict_proba(X_text_test)
    
    stage3_clf.fit(X_struct_train, y_train)
    s3_test_proba = stage3_clf.predict_proba(X_struct_test)

    # 6. Ensemble
    print("Building Ensemble...")
    ensemble_test_proba = (
        0.40 * s1_test_proba + 
        0.20 * s2_test_proba + 
        0.40 * s3_test_proba
    )
    
    classes = stage1_pipe.classes_
    ensemble_pred = classes[np.argmax(ensemble_test_proba, axis=1)]

    # 7. Template Override
    final_predictions = list(ensemble_pred)
    test_templates = df_primary['template'].iloc[y_test.index].values

    for i, template in enumerate(test_templates):
        if 'SPAM_TEMPLATE' in template:
            final_predictions[i] = 'spam'
        elif 'SUSPICIOUS_TEMPLATE' in template:
            if final_predictions[i] == 'safe':
                final_predictions[i] = 'suspicious'

    # 8. Evaluation
    print("\n" + "="*60)
    print("ENSEMBLE EVALUATION RESULTS")
    print("="*60)
    print(classification_report(y_test, final_predictions, digits=4))
    
    pred_series = pd.Series(final_predictions)
    print("\nExact prediction counts on test set:")
    print(pred_series.value_counts())

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, final_predictions, labels=['safe', 'suspicious', 'spam']))

    # Bias detection guard
    prediction_distribution = pred_series.value_counts(normalize=True)
    if prediction_distribution.get('safe', 0) > 0.6:
        print("\n" + "="*60)
        print("CRITICAL WARNING: MODEL IS BIASED TOWARDS 'SAFE' PREDICTIONS")
        print(f"Safe predictions make up {prediction_distribution.get('safe', 0):.2%} of the test set.")
        print("This is above the 60% threshold. The model will not be saved.")
        print("="*60 + "\n")
        sys.exit(1)

    scam_recall = recall_score(y_test, final_predictions, labels=['spam'], average='macro')
    print(f"\nSpam recall: {scam_recall:.2%}")

    # 9. Save Artifacts
    print("\nSaving artifacts...")
    artifacts_dir = os.path.join(model_dir, 'artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    
    joblib.dump(stage1_pipe, os.path.join(artifacts_dir, 'model_stage1.pkl'))
    joblib.dump(stage2_pipe, os.path.join(artifacts_dir, 'model_stage2.pkl'))
    joblib.dump(stage3_clf, os.path.join(artifacts_dir, 'model_stage3.pkl'))
    
    joblib.dump(structured_features.columns.tolist(), os.path.join(artifacts_dir, 'stage3_feature_names.pkl'))
    joblib.dump(classes, os.path.join(artifacts_dir, 'label_classes.pkl'))
    
    with open(os.path.join(artifacts_dir, 'keyword_lookup.json'), 'w') as f:
        json.dump(keyword_lookup, f)
        
    with open(os.path.join(artifacts_dir, 'scam_domains.json'), 'w') as f:
        json.dump({'SPAM': SCAM_DOMAINS, 'safe': SAFE_DOMAINS}, f)
        
    meta = {
        'trained_at': pd.Timestamp.now().isoformat(),
        'total_samples': len(df_primary),
        'label_distribution': df_primary['label'].value_counts().to_dict(),
        'keyword_count': len(keyword_lookup),
        'spam_recall': float(scam_recall),
        'classes': list(classes),
        'ensemble_weights': {'stage1': 0.40, 'stage2': 0.20, 'stage3': 0.40},
        'template_override': True
    }
    
    with open(os.path.join(artifacts_dir, 'model_meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)
        
    print("\n✅ All artifacts saved.")

if __name__ == "__main__":
    train()
