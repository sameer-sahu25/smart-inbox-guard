import sys
import os
import pytest

# Add parent directory to path to import core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.preprocessor import EmailPreprocessor

@pytest.fixture
def preprocessor():
    return EmailPreprocessor()

def test_leet_speak(preprocessor):
    # Test normalization of common leet speak
    assert "free" in preprocessor.clean("fr3e g1ft")
    assert "money" in preprocessor.clean("m0n3y")
    assert "urgent" in preprocessor.clean("urg€nt")

def test_html_stripping(preprocessor):
    # Test stripping of HTML tags
    assert "<b>" not in preprocessor.clean("<b>urgent</b>")
    assert "<div>" not in preprocessor.clean("<div>click here</div>")
    assert "urgent" in preprocessor.clean("<b>urgent</b>")

def test_url_replacement(preprocessor):
    # Test replacement of various URL patterns
    assert "URLTOKEN" in preprocessor.clean("visit http://spam.ru")
    assert "URLTOKEN" in preprocessor.clean("check www.paypal-secure.com")
    assert "URLTOKEN" in preprocessor.clean("go to https://bit.ly/123")

def test_money_replacement(preprocessor):
    # Test replacement of currency patterns
    assert "MONEYTOKEN" in preprocessor.clean("earn $1,000,000")
    assert "MONEYTOKEN" in preprocessor.clean("you won £500")
    assert "MONEYTOKEN" in preprocessor.clean("transfer 1 million dollars")

def test_zero_width_chars(preprocessor):
    # Test removal of invisible unicode characters
    assert "\u200b" not in preprocessor.clean("ur\u200bgent")
    assert "\u200c" not in preprocessor.clean("spam\u200cm")
    assert "urgent" == preprocessor.clean("ur\u200bgent")

def test_unicode_homoglyphs(preprocessor):
    # Test normalization of Cyrillic lookalikes (а is Cyrillic)
    assert "account" in preprocessor.clean("аccount")
    assert "free" in preprocessor.clean("𝓯𝓻𝓮𝓮")

def test_html_entities(preprocessor):
    # Test unescaping of HTML entities
    assert "&amp;" not in preprocessor.clean("click &amp; win")
    assert "click & win" in preprocessor.clean("click &amp; win")
    assert "f" in preprocessor.clean("&#x66;") # &#x66; is 'f'

def test_empty_input(preprocessor):
    # Test handling of empty or whitespace input
    assert preprocessor.clean("") == ""
    assert preprocessor.clean("   ") == ""

def test_only_html(preprocessor):
    # Test input containing only HTML tags
    result = preprocessor.clean("<html><body></body></html>")
    assert result.strip() == ""

def test_caps_normalization(preprocessor):
    # Test lowercasing of input
    assert preprocessor.clean("URGENT FREE GIFT") == "urgent free gift"

def test_complex_obfuscation(preprocessor):
    # Test combination of multiple techniques
    text = "<b>URG€NT</b>: Cl!ck <a href='http://spam.ru'>h€r€</a> for your $1,000 pr!z€!"
    cleaned = preprocessor.clean(text)
    assert "urgent" in cleaned
    assert "click" in cleaned
    assert "URLTOKEN" in cleaned
    assert "MONEYTOKEN" in cleaned
    assert "prize" in cleaned

if __name__ == "__main__":
    pytest.main([__file__])
