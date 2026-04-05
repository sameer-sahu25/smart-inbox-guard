import re

class ThreatRuleEngine:
    def evaluate(self, subject: str, body: str, sender: str, signals: dict) -> dict:
        body_lower = body.lower()
        cleaned_body = signals.get('cleaned_text', body_lower)
        
        # Integrate sender signals if they exist in the signals dict
        sender_lower = sender.lower()
        
        # Hard rules (override_ml = True, rule_confidence = 1.0)
        
        # RULE_DATASET_TEMPLATE_A — catches "Invest in X now" SPAM template
        if re.search(r'invest in .+ now and earn .+ in just \d+ hours', body_lower):
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_DATASET_TEMPLATE_A"],
                "rule_verdict": "SPAM",
                "rule_confidence": 1.0,
                "override_ml": True
            }

        # RULE_DATASET_TEMPLATE_B — catches "bank details" approval SPAM
        if "waiting for your approval" in body_lower and "bank details" in body_lower:
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_DATASET_TEMPLATE_B"],
                "rule_verdict": "SPAM",
                "rule_confidence": 1.0,
                "override_ml": True
            }

        # RULE_GUARANTEED_RETURNS — Narrowed to prevent false positives
        if ("guaranteed returns" in body_lower or "guaranteed return" in body_lower) and \
           ("crypto" in body_lower or "bitcoin" in body_lower or "invest" in body_lower):
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_GUARANTEED_RETURNS"],
                "rule_verdict": "SPAM",
                "rule_confidence": 0.95,
                "override_ml": True
            }

        # RULE_SPAM_DOMAIN_SENDER — sender domain is known disposable
        SPAM_DOMAINS = ['fakemailgenerator', 'guerrillamail', 'tempmail', 'throwam', 'mailnull', 'spamgourmet', 'trashmail']
        domain = sender_lower.split('@')[1].split('.')[0] if '@' in sender_lower else ''
        if domain in SPAM_DOMAINS:
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_SPAM_DOMAIN_SENDER"],
                "rule_verdict": "SPAM",
                "rule_confidence": 0.92,
                "override_ml": True
            }

        # RULE_PURE_SAFE_VOCABULARY — email uses only safe keywords, zero threat signals
        if (signals.get('keyword_safe_count', 0) >= 3 and 
            signals.get('keyword_scam_count', 0) == 0 and 
            signals.get('keyword_suspicious_count', 0) == 0):
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_PURE_SAFE_VOCABULARY"],
                "rule_verdict": "safe",
                "rule_confidence": 0.92,
                "override_ml": True
            }

        # RULE_KNOWN_SPAM_TEMPLATE
        # body contains 3 or more of these simultaneously: "wire transfer" + "million" + "urgent" + any MONEYTOKEN
        if ("wire transfer" in body_lower and 
            "million" in body_lower and 
            "urgent" in body_lower and 
            signals.get('has_money', False)):
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_KNOWN_SPAM_TEMPLATE"],
                "rule_verdict": "SPAM",
                "rule_confidence": 1.0,
                "override_ml": True
            }

        # RULE_CREDENTIAL_HARVEST
        # body contains "verify your" + URLTOKEN + "account" or "password"
        if ("verify your" in body_lower and 
            "URLTOKEN" in cleaned_body and 
            ("account" in body_lower or "password" in body_lower)):
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_CREDENTIAL_HARVEST"],
                "rule_verdict": "SPAM",
                "rule_confidence": 1.0,
                "override_ml": True
            }

        # RULE_ADVANCE_FEE
        # body contains "inheritance" or "deceased" + MONEYTOKEN + EMAILTOKEN
        if (("inheritance" in body_lower or "deceased" in body_lower) and 
            signals.get('has_money', False) and 
            signals.get('has_email', False)):
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_ADVANCE_FEE"],
                "rule_verdict": "SPAM",
                "rule_confidence": 1.0,
                "override_ml": True
            }

        # RULE_LOTTERY_SPAM
        # body contains ("won" or "winner" or "selected") + ("lottery" or "prize" or "reward") + MONEYTOKEN
        if (any(word in body_lower for word in ["won", "winner", "selected"]) and 
            any(word in body_lower for word in ["lottery", "prize", "reward"]) and 
            signals.get('has_money', False)):
            return {
                "rule_triggered": True,
                "triggered_rules": ["RULE_LOTTERY_SPAM"],
                "rule_verdict": "SPAM",
                "rule_confidence": 1.0,
                "override_ml": True
            }

        # Soft Rules (override_ml = False, rule_confidence = 0.8)
        
        soft_triggered = []
        
        # RULE_KEYWORD_CLUSTER_SPAM — 4+ SPAM keywords from keyword lookup
        if signals.get('keyword_scam_count', 0) >= 4:
            soft_triggered.append("RULE_KEYWORD_CLUSTER_SPAM")

        # RULE_HIGH_CAPS
        if signals.get('caps_ratio', 0.0) > 0.4 and signals.get('word_count', 0) > 20:
            soft_triggered.append("RULE_HIGH_CAPS")

        # RULE_EXCESSIVE_URLS
        if signals.get('url_count', 0) > 5:
            soft_triggered.append("RULE_EXCESSIVE_URLS")

        # RULE_URGENCY_OVERLOAD
        if len(signals.get('risk_phrases', [])) > 4:
            soft_triggered.append("RULE_URGENCY_OVERLOAD")

        # RULE_MONEY_PLUS_URL
        if signals.get('has_money', False) and signals.get('has_url', False):
            soft_triggered.append("RULE_MONEY_PLUS_URL")
            
        # RULE_SUSPICIOUS_SENDER (Long domain + free provider + urgency)
        if (signals.get('sender_domain_length', 0) > 25 or signals.get('sender_is_free_provider', False)) and \
           (len(signals.get('risk_phrases', [])) > 2 or "urgent" in body_lower):
            soft_triggered.append("RULE_SUSPICIOUS_SENDER")

        if soft_triggered:
            return {
                "rule_triggered": True,
                "triggered_rules": soft_triggered,
                "rule_verdict": "suspicious",
                "rule_confidence": 0.8,
                "override_ml": False
            }

        # No rules matched
        return {
            "rule_triggered": False,
            "triggered_rules": [],
            "rule_verdict": "none",
            "rule_confidence": 0.0,
            "override_ml": False
        }
