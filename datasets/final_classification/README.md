# Email Classification Dataset Documentation

## 1. Overview
This dataset contains exactly **3,000 entries**, balanced with **1,000 entries each** for three categories: **Safe**, **Suspicious**, and **spam**. It is designed for supervised machine learning tasks such as email classification and threat detection.

## 2. Classification Criteria

### **Safe (1,000 Entries)**
- **Definition**: Legitimate personal or professional communication.
- **Characteristics**: Professional language, focus on collaboration, project management, and scheduling.
- **Key Indicators**: Names, project updates, meeting invites, attachments, polite greetings/closings.
- **Common Words**: `meeting`, `project`, `schedule`, `thanks`, `regards`, `attached`.

### **Suspicious (1,000 Entries)**
- **Definition**: Emails with red flags that may indicate potential threats or phishing.
- **Characteristics**: High urgency, alerts about account status, security warnings, requests for identity verification.
- **Key Indicators**: Action required immediately, security alerts, account suspension warnings, billing issues.
- **Common Words**: `urgent`, `action required`, `security alert`, `verify account`, `identity`.

### **spam (1,000 Entries)**
- **Definition**: Malicious emails aimed at financial fraud or theft.
- **Characteristics**: Unrealistic promises, financial gains, lottery wins, inheritance claims, investment opportunities.
- **Key Indicators**: Large sums of money, "congratulations", grand prizes, "guaranteed" returns, urgent bank transfer requests.
- **Common Words**: `lottery`, `winner`, `prize`, `bitcoin`, `inheritance`, `millions`, `wire transfer`.

## 3. Data Collection Methodology
The dataset was generated using a controlled template-based approach to ensure:
1.  **Exact Balance**: Precisely 1,000 samples per category.
2.  **Linguistic Diversity**: Randomized templates and keyword combinations.
3.  **Label Integrity**: Strict categorization based on the defined criteria.
4.  **Feature Richness**: Inclusion of names, specific contexts, and varying sentence structures.

## 4. Quality Assurance Measures
The following steps were taken to ensure high data quality:
- **Template Validation**: Each template was manually reviewed for grammatical correctness and category alignment.
- **Keyword Uniqueness**: Logic implemented to ensure distinct keywords are used in each entry to avoid redundancy.
- **Text Preprocessing**: Automated cleaning (lowercasing, punctuation removal) for model-ready training data.
- **Metadata Extraction**: Generation of word frequency distributions and category statistics for data analysis.
- **Verification Scripting**: Post-generation script to verify counts, label distribution, and metadata accuracy.

## 5. Dataset Structure
The final dataset is provided in the following formats:
- **CSV**: `email_classification_dataset.csv`
- **JSON**: `email_classification_dataset.json`
- **Metadata**: `dataset_metadata.json` (Includes word frequency distributions)

### Fields:
- `category`: Target label (safe, suspicious, spam)
- `subject`: Raw email subject line
- `body`: Raw email body content
- `cleaned_body`: Preprocessed body for ML training
- `word_count`: Number of words in the body
- `char_count`: Number of characters in the body
