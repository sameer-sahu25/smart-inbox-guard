
import { describe, it, expect } from 'vitest';

const ColorSystem = {
  CRITICAL: "#ff0033",
  HIGH: "#ff4400",
  MODERATE: "#ff8800",
  LOW: "#ffcc00",
  SAFE: "#00cc66",
  NEUTRAL: "#aaaaaa"
} as const;

type SecurityColor = typeof ColorSystem[keyof typeof ColorSystem];

const getThreatColor = (score: number, status?: string): SecurityColor => {
  // Prioritize explicit status labels from the consistency-validated backend
  if (status === "CRITICAL") return ColorSystem.CRITICAL;
  if (status === "HIGH") return ColorSystem.HIGH;
  if (status === "MODERATE") return ColorSystem.MODERATE;
  if (status === "LOW") return ColorSystem.LOW;
  if (status === "CLEAN") return ColorSystem.SAFE;

  // Fallback to score-based mapping if status is missing/unknown
  if (score >= 90) return ColorSystem.CRITICAL;
  if (score >= 70) return ColorSystem.HIGH;
  if (score >= 40) return ColorSystem.MODERATE;
  if (score >= 15) return ColorSystem.LOW;
  return ColorSystem.SAFE;
};

const validateSecurityColor = (color: string | undefined): SecurityColor => {
  const allowedColors = Object.values(ColorSystem);
  if (color && allowedColors.includes(color as SecurityColor)) {
    return color as SecurityColor;
  }
  return ColorSystem.NEUTRAL;
};

describe('Security Color Logic', () => {
  describe('getThreatColor', () => {
    it('should map CRITICAL status to correct color', () => {
      expect(getThreatColor(0, "CRITICAL")).toBe(ColorSystem.CRITICAL);
    });

    it('should map high score to CRITICAL color', () => {
      expect(getThreatColor(95)).toBe(ColorSystem.CRITICAL);
    });

    it('should map HIGH status to correct color', () => {
      expect(getThreatColor(0, "HIGH")).toBe(ColorSystem.HIGH);
    });

    it('should map mid-high score to HIGH color', () => {
      expect(getThreatColor(75)).toBe(ColorSystem.HIGH);
    });

    it('should map CLEAN status to SAFE color', () => {
      expect(getThreatColor(99, "CLEAN")).toBe(ColorSystem.SAFE);
    });

    it('should map low score to SAFE color', () => {
      expect(getThreatColor(5)).toBe(ColorSystem.SAFE);
    });
  });

  describe('validateSecurityColor', () => {
    it('should allow approved colors', () => {
      expect(validateSecurityColor("#ff0033")).toBe(ColorSystem.CRITICAL);
      expect(validateSecurityColor("#00cc66")).toBe(ColorSystem.SAFE);
    });

    it('should reject unapproved colors and return NEUTRAL', () => {
      expect(validateSecurityColor("#123456")).toBe(ColorSystem.NEUTRAL);
      expect(validateSecurityColor("red")).toBe(ColorSystem.NEUTRAL);
      expect(validateSecurityColor(undefined)).toBe(ColorSystem.NEUTRAL);
    });

    it('should prevent potentially harmful strings', () => {
      expect(validateSecurityColor("javascript:alert(1)")).toBe(ColorSystem.NEUTRAL);
      expect(validateSecurityColor("<script>")).toBe(ColorSystem.NEUTRAL);
    });
  });
});
