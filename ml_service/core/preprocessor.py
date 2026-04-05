import re
import html
import unicodedata
import base64
import os
import json

class EmailPreprocessor:
    def __init__(self):
        # Pre-compile regex for performance (Fix: Performance)
        self.templates = {
            'SPAM_TEMPLATE_A': re.compile(r'invest in .+ now and earn .+ in just \d+ hours', re.IGNORECASE),
            'SPAM_TEMPLATE_B': re.compile(r'urgent.{0,100}waiting for your approval.{0,100}bank details', re.IGNORECASE),
            'SUSPICIOUS_TEMPLATE_A': re.compile(r'security alert.{0,100}detected', re.IGNORECASE),
            'SUSPICIOUS_TEMPLATE_B': re.compile(r'action required.{0,100}flagged', re.IGNORECASE),
        }
        
        # Leet speak mapping
        self.leet_map = {
            '@': 'a', '3': 'e', '0': 'o', '1': 'i', '$': 's', 
            '!': 'i', '4': 'a', '5': 's', '7': 't', '|': 'i', 
            '+': 't', '€': 'e', '£': 'l'
        }
        
        # Risk phrases from requirement + AI-generated spam indicators
        self.risk_phrases_list = [
            "act now", "limited time", "click here", "verify your account",
            "you have won", "claim your prize", "wire transfer", "bank account",
            "social security", "your account has been", "unusual activity",
            "suspended", "bitcoin", "cryptocurrency", "inheritance",
            "million dollars", "guaranteed return", "no risk", "free gift",
            "congratulations you", "dear winner", "urgent response required",
            "confirm your identity", "account will be closed", "immediate action",
            "one time offer", "expires today", "final notice", "last chance",
            "you have been selected", "exclusive offer", "risk free",
            # AI-generated spam common markers
            "hope this email finds you well", "in today's digital landscape",
            "unlock your potential", "exclusive opportunity for you",
            "revolutionize your workflow", "streamline your process",
            "take your business to the next level", "synergy and growth",
            "leverage our expertise", "carefully curated for you",
            "paradigm shift", "empower your journey", "seamless integration"
        ]

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
                pass # Silently fail during initialization if lookup missing

    def detect_template(self, subject: str, body: str) -> str:
        """Detect if email matches a known SPAM or suspicious template from dataset."""
        text = f"{subject} {body}".lower()

        for name, regex in self.templates.items():
            if regex.search(text):
                return name
        
        if 'guaranteed returns' in text or 'guaranteed return' in text:
            return 'SPAM_TEMPLATE_C'

        return 'NO_TEMPLATE'

    def get_keyword_match_score(self, text: str, keyword_lookup: dict) -> dict:
        """Score email against labeled keyword lookup table."""
        import string
        # Clean text: remove punctuation and lowercase
        clean_text = text.lower().translate(str.maketrans('', '', string.punctuation))
        words = clean_text.split()
        total = max(len(words), 1)

        scam_hits = [w for w in words if keyword_lookup.get(w) in ['spam', 'SPAM', 'scam']]
        suspicious_hits = [w for w in words if keyword_lookup.get(w) == 'suspicious']
        safe_hits = [w for w in words if keyword_lookup.get(w) == 'safe']

        return {
            'keyword_scam_ratio': len(scam_hits) / total,
            'keyword_suspicious_ratio': len(suspicious_hits) / total,
            'keyword_safe_ratio': len(safe_hits) / total,
            'keyword_scam_count': len(scam_hits),
            'keyword_suspicious_count': len(suspicious_hits),
            'keyword_safe_count': len(safe_hits),
            'matched_scam_keywords': list(set(scam_hits))[:10],
            'matched_suspicious_keywords': list(set(suspicious_hits))[:10],
            'keyword_dominant': (
                'spam' if len(scam_hits) > len(suspicious_hits) and len(scam_hits) > len(safe_hits)
                else 'suspicious' if len(suspicious_hits) > len(safe_hits)
                else 'safe'
            )
        }

    def get_sender_risk(self, sender: str) -> dict:
        """Extract risk signals from sender email address."""
        sender = str(sender).lower().strip()
        domain = sender.split('@')[1].split('.')[0] if '@' in sender else ''

        SPAM_DOMAINS = ['fakemailgenerator', 'guerrillamail', 'tempmail',
                        'throwam', 'mailnull', 'spamgourmet', 'trashmail']
        SAFE_DOMAINS = ['company', 'gmail', 'outlook', 'university',
                        'yahoo', 'hotmail', 'corporate']

        return {
            'sender_is_spam_domain': domain in SPAM_DOMAINS,
            'sender_is_safe_domain': domain in SAFE_DOMAINS,
            'sender_has_numbers': any(c.isdigit() for c in (sender.split('@')[0] if '@' in sender else sender)),
            'sender_domain': domain,
            'sender_risk_boost': 0.30 if domain in SPAM_DOMAINS else -0.10 if domain in SAFE_DOMAINS else 0.0
        }


    def clean(self, text: str) -> str:
        if not text or not isinstance(text, str):
            return ""

        # Step 1: Decode base64 blocks
        def decode_b64(match):
            try:
                return base64.b64decode(match.group(1)).decode('utf-8', errors='ignore')
            except:
                return match.group(0)
        text = re.sub(r'base64,([A-Za-z0-9+/=]+)', decode_b64, text)

        # Step 2: Decode HTML entities
        text = html.unescape(text)

        # Step 3: Extract and preserve alt text from image tags
        def preserve_alt(match):
            alt_match = re.search(r'alt=["\'](.*?)["\']', match.group(0), re.IGNORECASE)
            return f" {alt_match.group(1)} " if alt_match else " "
        text = re.sub(r'<img[^>]+>', preserve_alt, text)

        # Step 4: Strip all HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)

        # Step 5: Remove zero-width and invisible unicode characters
        invisible_chars = [
            '\u200b', '\u200c', '\u200d', '\u200e', '\u200f', 
            '\ufeff', '\u00ad', '\u2060'
        ]
        for char in invisible_chars:
            text = text.replace(char, '')

        # Step 6: Normalize unicode (NFKD) and ASCII encode (ignore errors)
        text = unicodedata.normalize('NFKD', text)
        text = text.encode('ascii', 'ignore').decode('ascii')

        # Step 7: Normalize leet speak
        for char, replacement in self.leet_map.items():
            text = text.replace(char, replacement)

        # Step 8: Replace URLs with URLTOKEN
        url_pattern = r'https?://\S+|www\.\S+|[a-zA-Z0-9-]+\.(?:ru|com|net|org|biz|info|io|xyz)(?:/\S*)?'
        text = re.sub(url_pattern, ' URLTOKEN ', text)

        # Step 9: Replace email addresses with EMAILTOKEN
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        text = re.sub(email_pattern, ' EMAILTOKEN ', text)

        # Step 10: Replace phone numbers with PHONETOKEN
        phone_pattern = r'\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}'
        text = re.sub(phone_pattern, ' PHONETOKEN ', text)

        # Step 11: Replace currency amounts with MONEYTOKEN
        money_pattern = r'[\$\xA3\u20AC]\s?\d+(?:[.,]\d+)?(?:\s?(?:million|billion|dollars|euros|pounds))?|\d+\s?(?:million|billion|dollars|euros|pounds)'
        text = re.sub(money_pattern, ' MONEYTOKEN ', text, flags=re.IGNORECASE)

        # Step 12: Replace account/card numbers with ACCOUNTTOKEN
        account_pattern = r'\b(?:\d[ -]*?){13,19}\b'
        text = re.sub(account_pattern, ' ACCOUNTTOKEN ', text)

        # Step 13: Normalize whitespace
        text = re.sub(r'\s+', ' ', text)

        # Step 14: Lowercase everything
        text = text.lower()

        # Step 15: Strip leading/trailing whitespace
        text = text.strip()

        # Step 16: Return cleaned string
        return text

    def extract_signals(self, text: str) -> dict:
        original_text = text
        cleaned_text = self.clean(text)
        
        # Token counts in cleaned text
        url_count = len(re.findall(r'URLTOKEN', cleaned_text))
        email_count = len(re.findall(r'EMAILTOKEN', cleaned_text))
        phone_count = len(re.findall(r'PHONETOKEN', cleaned_text))
        money_count = len(re.findall(r'MONEYTOKEN', cleaned_text))
        account_count = len(re.findall(r'ACCOUNTTOKEN', cleaned_text))
        
        flagged_tokens = []
        if url_count > 0: flagged_tokens.append("URLTOKEN")
        if email_count > 0: flagged_tokens.append("EMAILTOKEN")
        if phone_count > 0: flagged_tokens.append("PHONETOKEN")
        if money_count > 0: flagged_tokens.append("MONEYTOKEN")
        if account_count > 0: flagged_tokens.append("ACCOUNTTOKEN")

        # Caps ratio in original text
        caps_count = sum(1 for c in original_text if c.isupper())
        total_chars = len(original_text)
        caps_ratio = caps_count / total_chars if total_chars > 0 else 0.0

        # Exclamation count in original text
        exclamation_count = original_text.count('!')

        # Word/Char counts
        words = cleaned_text.split()
        word_count = len(words)
        char_count = len(cleaned_text)
        avg_word_length = char_count / word_count if word_count > 0 else 0.0
        
        unique_words = set(words)
        unique_word_ratio = len(unique_words) / word_count if word_count > 0 else 0.0

        # Keyword match counts for threat rules
        keyword_scores = self.get_keyword_match_score(cleaned_text, self.keyword_lookup)

        return {
            "cleaned_text": cleaned_text,
            "flagged_tokens": flagged_tokens,
            "has_url": url_count > 0,
            "has_email": email_count > 0,
            "has_phone": phone_count > 0,
            "has_money": money_count > 0,
            "has_account": account_count > 0,
            "token_count": url_count + email_count + phone_count + money_count + account_count,
            "url_count": url_count,
            "exclamation_count": exclamation_count,
            "caps_ratio": caps_ratio,
            "word_count": word_count,
            "char_count": char_count,
            "avg_word_length": avg_word_length,
            "unique_word_ratio": unique_word_ratio,
            "keyword_scam_count": keyword_scores['keyword_scam_count'],
            "keyword_suspicious_count": keyword_scores['keyword_suspicious_count'],
            "keyword_safe_count": keyword_scores['keyword_safe_count']
        }

    def get_risk_phrases(self, text: str) -> list:
        # Scan original text for risk phrases
        found = []
        text_lower = text.lower()
        for phrase in self.risk_phrases_list:
            if phrase in text_lower:
                found.append(phrase)
        return found
