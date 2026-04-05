import re
import os
import json

class FeatureEngine:
    def __init__(self):
        # Pre-compile regex (Fix: Performance)
        self.templates = {
            'SPAM_TEMPLATE_A': re.compile(r'invest in .+ now and earn .+ in just \d+ hours', re.IGNORECASE),
            'SPAM_TEMPLATE_B': re.compile(r'urgent.{0,20}waiting for your approval.{0,50}bank details', re.IGNORECASE),
            'SUSPICIOUS_TEMPLATE_A': re.compile(r'security alert.{0,30}detected', re.IGNORECASE),
            'SUSPICIOUS_TEMPLATE_B': re.compile(r'action required.{0,30}flagged', re.IGNORECASE),
        }
        
        self.keyword_lookup = {}
        self.artifacts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models', 'artifacts')
        self.load_keyword_lookup()

    def load_keyword_lookup(self):
        path = os.path.join(self.artifacts_dir, 'keyword_lookup.json')
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    self.keyword_lookup = json.load(f)
            except Exception as e:
                pass

    def extract(self, subject: str, body: str, sender: str, signals: dict) -> dict:
        # 1. Structural signals from pre-calculated signals
        word_count = signals.get('word_count', 1)
        caps_ratio = signals.get('caps_ratio', 0.0)
        exclamation_count = signals.get('exclamation_count', 0)
        token_count = signals.get('token_count', 0)
        url_count = signals.get('url_count', 0)
        has_money = 1 if signals.get('has_money', False) else 0
        has_phone = 1 if signals.get('has_phone', False) else 0
        unique_word_ratio = signals.get('unique_word_ratio', 0.0)

        # 2. Subject signals
        subject_caps_count = sum(1 for c in subject if c.isupper())
        subject_len = len(subject)
        subject_caps_ratio = subject_caps_count / subject_len if subject_len > 0 else 0.0
        subject_has_re_fwd = 1 if re.match(r'^(RE:|FWD:|FW:|RED:)', subject, re.IGNORECASE) else 0
        subject_exclamations = subject.count('!')
        
        money_words = ["free", "win", "prize", "gift", "cash", "money", "award", "reward"]
        subject_lower = subject.lower()
        subject_has_money_word = 1 if any(word in subject_lower for word in money_words) else 0

        # 3. Sender signals (dataset-specific)
        sender = str(sender).lower().strip()
        domain = sender.split('@')[1].split('.')[0] if '@' in sender else ''
        
        SCAM_DOMAINS = ['fakemailgenerator', 'guerrillamail', 'tempmail', 'throwam', 'mailnull', 'spamgourmet', 'trashmail']
        SAFE_DOMAINS = ['company', 'gmail', 'outlook', 'university', 'yahoo', 'hotmail', 'corporate']
        
        sender_is_scam_domain = 1 if domain in SCAM_DOMAINS else 0
        sender_is_safe_domain = 1 if domain in SAFE_DOMAINS else 0
        sender_has_numbers = 1 if any(c.isdigit() for c in (sender.split('@')[0] if '@' in sender else sender)) else 0
        sender_domain_length = min(len(domain) / 30.0, 1.0)

        # 4. Keyword Match Scores (dataset-specific)
        import string
        text = f"{subject} {body}".lower()
        clean_text = text.translate(str.maketrans('', '', string.punctuation))
        words = clean_text.split()
        total_words = max(len(words), 1)
        
        scam_hits = sum(1 for w in words if self.keyword_lookup.get(w) in ['spam', 'scam', 'SPAM'])
        suspicious_hits = sum(1 for w in words if self.keyword_lookup.get(w) == 'suspicious')
        safe_hits = sum(1 for w in words if self.keyword_lookup.get(w) == 'safe')
        
        # 5. Template Detection (dataset-specific)
        template = 'NO_TEMPLATE'
        for name, regex in self.templates.items():
            if regex.search(text):
                template = name
                break
        
        if template == 'NO_TEMPLATE' and ('guaranteed returns' in text or 'guaranteed return' in text):
            template = 'SPAM_TEMPLATE_C'

        # 6. Advanced Analytical Features (Fix: Accuracy)
        # Check for suspicious link structures
        urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-f_A-F][0-9a-f_A-F]))+', text)
        has_shortened_url = 1 if any(re.search(r'(bit\.ly|t\.co|goo\.gl|tinyurl\.com|is\.gd|buff\.ly|ow\.ly|v\.gd|tr\.im)', url) for url in urls) else 0
        has_ip_url = 1 if any(re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url) for url in urls) else 0
        
        # behavioral signals: urgency, pressure, and personalization
        urgency_words = ["urgent", "immediately", "hurry", "fast", "quick", "action required", "last chance", "final notice", "deadline"]
        pressure_words = ["penalty", "suspended", "closed", "blocked", "legal action", "fine", "arrest", "lawsuit"]
        personalization_placeholders = ["dear user", "dear customer", "valuable member", "dear friend"]
        
        urgency_score = sum(1 for word in urgency_words if word in text) / max(total_words, 1)
        pressure_score = sum(1 for word in pressure_words if word in text) / max(total_words, 1)
        is_generic_greeting = 1 if any(p in text for p in personalization_placeholders) else 0
        
        # Link to word ratio (Spammers often have high link density)
        link_density = len(urls) / max(total_words, 1)

        # 7. Sender Reputation Signals (Granular)
        sender_parts = sender.split('@')
        local_part = sender_parts[0] if len(sender_parts) > 0 else ''
        tld = sender.split('.')[-1] if '.' in sender else ''
        
        high_risk_tlds = ['zip', 'mov', 'top', 'xyz', 'icu', 'party', 'gdn', 'bid', 'click', 'link']
        sender_is_high_risk_tld = 1 if tld in high_risk_tlds else 0
        sender_has_excessive_numbers = 1 if sum(c.isdigit() for c in local_part) > 4 else 0
        sender_has_suspicious_patterns = 1 if re.search(r'[._-]{2,}', sender) else 0

        # Build the final feature dict compatible with Stage 3
        features = {
            # Keyword ratios
            'keyword_scam_ratio': scam_hits / max(total_words, 1),
            'keyword_suspicious_ratio': suspicious_hits / max(total_words, 1),
            'keyword_safe_ratio': safe_hits / max(total_words, 1),
            'keyword_scam_count': scam_hits,
            'keyword_suspicious_count': suspicious_hits,
            'keyword_safe_count': safe_hits,
            
            # Sender features
            'sender_is_scam_domain': sender_is_scam_domain,
            'sender_is_safe_domain': sender_is_safe_domain,
            'sender_has_numbers': sender_has_numbers,
            'sender_domain_length': sender_domain_length,
            'sender_is_high_risk_tld': sender_is_high_risk_tld,
            'sender_has_excessive_numbers': sender_has_excessive_numbers,
            'sender_has_suspicious_patterns': sender_has_suspicious_patterns,
            
            # Structural signals
            'word_count': min(word_count / 1000.0, 1.0),
            'caps_ratio': caps_ratio,
            'exclamation_count': min(exclamation_count / 10.0, 1.0),
            'url_count': min(url_count / 5.0, 1.0),
            'has_money': has_money,
            'has_phone': has_phone,
            'unique_word_ratio': unique_word_ratio,
            
            # Advanced behavioral features
            'has_shortened_url': has_shortened_url,
            'has_ip_url': has_ip_url,
            'urgency_score': urgency_score,
            'pressure_score': pressure_score,
            'is_generic_greeting': is_generic_greeting,
            'link_density': link_density,
            
            # Template one-hot encoding
            'tmpl_NO_TEMPLATE': 1 if template == 'NO_TEMPLATE' else 0,
            'tmpl_SPAM_TEMPLATE_A': 1 if template == 'SPAM_TEMPLATE_A' else 0,
            'tmpl_SPAM_TEMPLATE_B': 1 if template == 'SPAM_TEMPLATE_B' else 0,
            'tmpl_SPAM_TEMPLATE_C': 1 if template == 'SPAM_TEMPLATE_C' else 0,
            'tmpl_SUSPICIOUS_TEMPLATE_A': 1 if template == 'SUSPICIOUS_TEMPLATE_A' else 0,
            'tmpl_SUSPICIOUS_TEMPLATE_B': 1 if template == 'SUSPICIOUS_TEMPLATE_B' else 0,
        }
        
        return features

