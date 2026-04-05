import pandas as pd # type: ignore
import os
import glob

def merge_all_datasets():
    print("Starting dataset integration process...")
    
    model_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(model_dir), 'data')
    
    master_data = []
    
    # 1. Primary Dataset
    primary_path = os.path.join(data_dir, 'final_classification', 'email_classification_dataset.csv')
    if os.path.exists(primary_path):
        df = pd.read_csv(primary_path)
        # Standardize columns: body, subject, category
        df = df[['body', 'subject', 'category']]
        master_data.append(df)
        print(f"Added primary dataset: {len(df)} rows")

    # 2. Email Classification 3000
    ec3000_path = os.path.join(data_dir, 'email_classification_3000.csv')
    if os.path.exists(ec3000_path):
        df = pd.read_csv(ec3000_path)
        # sender, subject, body, label
        df = df.rename(columns={'label': 'category'})
        df = df[['body', 'subject', 'category']]
        # Clean potential trailing spaces in labels
        df['category'] = df['category'].str.strip()
        master_data.append(df)
        print(f"Added email_classification_3000: {len(df)} rows")

    # 3. Keyword Datasets
    keyword_files = [
        os.path.join(data_dir, 'my_custom_dataset.csv'),
        os.path.join(data_dir, 'test_keywords.csv'),
        os.path.join(data_dir, 'keyword_classification_3000.csv')
    ]
    
    for kf in keyword_files:
        if os.path.exists(kf):
            df = pd.read_csv(kf)
            # keyword, label
            df = df.rename(columns={'keyword': 'body', 'label': 'category'})
            df['subject'] = "Keyword Entry"
            df = df[['body', 'subject', 'category']]
            df['category'] = df['category'].str.strip()
            master_data.append(df)
            print(f"Added keyword dataset {os.path.basename(kf)}: {len(df)} rows")

    if not master_data:
        print("Error: No datasets found to merge.")
        return

    # Merge and Deduplicate
    full_df = pd.concat(master_data, ignore_index=True)
    initial_len = len(full_df)
    
    # Standardize labels to safe/suspicious/spam
    label_map = {
        'Safe': 'safe', 'SAFE': 'safe',
        'Suspicious': 'suspicious', 'SUSPICIOUS': 'suspicious',
        'spam': 'spam', 'spam': 'spam'
    }
    full_df['category'] = full_df['category'].replace(label_map)
    
    # Deduplicate based on body text
    full_df = full_df.drop_duplicates(subset=['body'])
    final_len = len(full_df)
    
    output_path = os.path.join(data_dir, 'master_training_set.csv')
    full_df.to_csv(output_path, index=False)
    
    print(f"\nIntegration Complete!")
    print(f"Total Rows Collected: {initial_len}")
    print(f"Total Rows After Deduplication: {final_len}")
    print(f"Master Dataset Saved: {output_path}")
    
    # Print class distribution
    print("\nIntegrated Class Distribution:")
    print(full_df['category'].value_counts())

if __name__ == "__main__":
    merge_all_datasets()
