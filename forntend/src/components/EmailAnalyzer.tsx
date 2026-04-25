import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, CheckCircle, Shield, Loader2, Send, AlertCircle, Eye, RefreshCw, Server, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useScanning } from "../hooks/use-scanning";
import { useAuth } from "../hooks/use-auth";

import { toast } from "sonner";

interface ThreatDimension {
  id: string;
  label: string;
  category: string;
  threatScore: number;
  safetyScore: number;
  weight: number;
  color: string;
  status: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "CLEAN";
  details: string;
  // Legacy
  fill_color: string;
  background_color: string;
  fill_percentage: number;
  score: number;
}

interface DetectedProblem {
  id: number;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severityColor: string;
  category: string;
  categoryIcon: string;
  confidence: number;
  evidenceSnippets: string[];
  recommendation: string;
  cvssLikeScore: number;
}

interface NeuralFlag {
  id: string;
  indicator: string;
  detail: string;
  confidence: number;
  severity: string;
  color: string;
}

interface SafetyAssessment {
  statusBadge: {
    label: string;
    color: string;
    icon: string;
  };
  action: {
    label: string;
    description: string;
    color: string;
    icon: string;
    urgencyLevel: "ROUTINE" | "ELEVATED" | "URGENT" | "IMMEDIATE" | "EMERGENCY";
  };
  userRisk: {
    level: "NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    color: string;
    description: string;
    impactAreas: string[];
  };
  dataRisk: {
    level: "MINIMAL" | "LOW" | "MODERATE" | "HIGH" | "SEVERE";
    color: string;
    description: string;
    atRiskDataTypes: string[];
  };
  recommended: {
    primary: string;
    actionItems: string[];
    urgencyLabel: string;
    urgencyColor: string;
  };
}

interface ModelInfo {
  modelVersion: string;
  inferenceLatencyMs: number;
  datasetVersion: string;
  ensembleMethod: string;
}

interface AnalysisResult {
  analysisId: string;
  timestamp: string;
  emailMessageId: string;
  verdict: "SAFE" | "SUSPICIOUS" | "SPAM" | "OFFLINE" | "UNKNOWN";
  safetyGrade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  neuralSafetyScore: number;
  scamProbability: number;
  confidenceLevel: "HIGH" | "MODERATE" | "LOW" | "UNCERTAIN";
  confidencePercentage: number;
  explanation?: string;
  threatDimensions: ThreatDimension[];
  safetyAssessment: SafetyAssessment;
  identifiedProblems: DetectedProblem[];
  totalProblemsCount: number;
  criticalProblemsCount: number;
  highProblemsCount: number;
  senderTrust: any;
  neuralFlags: NeuralFlag[];
  totalFlagsCount: number;
  modelInfo: ModelInfo;
  validationResult: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    autoFixes: string[];
    validatedAt: string;
  };
  // Legacy fields for transition
  label: "safe" | "suspicious" | "spam" | "unknown";
  safety_grade: string;
  neural_safety_score: number;
  confidence_label: string;
  reasoning_rationale: string;
  supporting_justification: string;
  threat_segments: ThreatDimension[];
  neural_flags: NeuralFlag[];
  safety_assessment: any;
  identified_problems: DetectedProblem[];
  sender_trust: any;
  model_metadata: any;
}

const EmailAnalyzer = () => {
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const { isScanning, setIsScanning } = useScanning();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { token } = useAuth();
  const [mlStatus, setMlStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const autoRetryRef = useRef<boolean>(false);

  // Check ML service status (Fix 4 & 5)
  const checkMLHealth = useCallback(async (isAutoRetry = false) => {
    try {
      const response = await fetch('/api/v1/health');
      const data = await response.json();
      const isOnline = data.success && data.mlService === 'available';
      
      setMlStatus(isOnline ? 'online' : 'offline');
      setLastCheckTime(new Date());

      // If it just came back online and we were offline, auto-retry the last analysis
      if (isOnline && (result?.verdict === 'OFFLINE' || mlStatus === 'offline') && (body.trim() || sender.trim())) {
        if (isAutoRetry) {
          toast.success("ML Service restored! Re-analyzing...");
          analyzeEmail();
        }
      }
      
      return isOnline;
    } catch (err) {
      setMlStatus('offline');
      setLastCheckTime(new Date());
      return false;
    }
  }, [result, body, sender, mlStatus]);

  // Periodic health check every 10s (Fix 4) and 15s (Fix 5 - combined here for efficiency)
  useEffect(() => {
    checkMLHealth();
    const interval = setInterval(() => checkMLHealth(true), 10000); 
    return () => clearInterval(interval);
  }, [checkMLHealth]);

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, timeout = 30000) => {
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }
        return response;
      } catch (err: any) {
        clearTimeout(id);
        if (err.name === 'AbortError') {
          console.warn(`Attempt ${i + 1} timed out after ${timeout}ms`);
          if (i === retries - 1) throw new Error(`Request timed out after ${retries} attempts`);
        } else if (i === retries - 1) {
          throw err;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('All retry attempts failed');
  };

  const analyzeEmail = async () => {
    if (!body.trim() && !sender.trim()) return;
    
    setIsScanning(true);
    setResult(null);
    setAnalysisError(null);
    setShowMetadata(false); // Robust Reset: Hide technical metadata on new scan

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetchWithRetry('/api/v1/analyze/classify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ subject, body, sender }),
      });

      const json = await response.json();
      if (json.success) {
        let finalResult = json.data;
        if (finalResult.verdict === 'SAFE' && (finalResult.neuralFlags ?? []).some((flag: NeuralFlag) => flag.severity === 'CRITICAL')) {
          finalResult.verdict = 'SUSPICIOUS';
          finalResult.gradeLabel = 'Warning: ML service may be miscalibrated';
        }
        setResult(finalResult);
        toast.success('Neural analysis complete.');
      } else {
        throw new Error(json.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Error analyzing email:', error);
      let errorMessage = 'Analysis failed. Please try again later.';
      
      if (error.name === 'AbortError' || error.message.includes('timed out')) {
        errorMessage = 'The analysis timed out. The neural engine is taking longer than usual to process this request.';
      } else if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not reach the security server. Please check your connection and ensure the backend is running.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Endpoint configuration error: The analysis service could not be found (404).';
      } else {
        errorMessage = error.message || 'An unexpected error occurred during analysis.';
      }
      
      setAnalysisError(errorMessage);
      toast.error(errorMessage, {
        description: 'Try refining your input or checking service status.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getClassificationStyles = () => {
    const defaultStyles = {
      icon: Shield,
      color: "text-white/40",
      bg: "bg-white/10",
      border: "border-white/10",
      glow: ""
    };

    if (!result) return defaultStyles;

    const classification = (result.verdict || result.label || "").toLowerCase();
    switch (classification) {
      case "safe":
        return { 
          icon: CheckCircle, 
          color: "text-success", 
          bg: "bg-success/10", 
          border: "border-success/30",
          glow: "glow-success"
        };
      case "suspicious":
        return { 
          icon: AlertCircle, 
          color: "text-amber-500", 
          bg: "bg-amber-500/10", 
          border: "border-amber-500/30",
          glow: ""
        };
      case "spam":
      case "scam":
        return { 
          icon: AlertTriangle, 
          color: "text-destructive", 
          bg: "bg-destructive/10", 
          border: "border-destructive/30",
          glow: "glow-destructive"
        };
    
      default:
        return defaultStyles;
    }
  };

  const getTrustLevelStyles = (score: number) => {
    // 1-30 are labeled as "scam"
    if (score <= 30) {
      return {
        label: "scam",
        color: "text-destructive",
        bg: "bg-destructive/20",
        icon: AlertTriangle
      };
    } 
    // 31-79 are labeled as "suspicious"
    else if (score < 80) {
      return {
        label: "SUSPICIOUS",
        color: "text-amber-500",
        bg: "bg-amber-500/20",
        icon: AlertCircle
      };
    } 
    // 80-100 are labeled as "safe"
    else {
      return {
        label: "SAFE",
        color: "text-success",
        bg: "bg-success/20",
        icon: Shield
      };
    }
  };

  const getNeuralSafetyScore = (result: AnalysisResult): number => { 
    const score = result.neuralSafetyScore ?? result.neural_safety_score ?? 1;
    return Math.max(1, Math.min(100, Math.round(score)));
  };

  const getSafetyGrade = (result: AnalysisResult): { 
    grade: string; 
    color: string; 
    description: string; 
  } => { 
    const grade = result.safetyGrade || result.safety_grade || 'C';
    const label = result.gradeLabel || "Unknown";
  
    const gradeMap: Record<string, { color: string, description: string }> = {
      'A+': { color: '#00ee77', description: 'Fully Trusted' },
      'A': { color: '#00cc66', description: 'Verified Safe' },
      'B': { color: '#88cc44', description: 'Likely Safe' },
      'C+': { color: '#ffaa00', description: 'Slightly Suspicious' },
      'C': { color: '#ff8800', description: 'Suspicious' },
      'C-': { color: '#ff6600', description: 'Highly Suspicious' },
      'D': { color: '#ff4400', description: 'Elevated Threat' },
      'E': { color: '#ff2200', description: 'High Threat' },
      'F': { color: '#ff0033', description: 'Confirmed Attack' }
    };

    return { 
      grade, 
      color: gradeMap[grade]?.color || '#aaaaaa', 
      description: label || gradeMap[grade]?.description || 'Unknown'
    };
  };

  const getIdentifiedProblems = (result: AnalysisResult) => { 
    return result.identifiedProblems || result.identified_problems || [];
  };

  const getSenderTrust = (result: AnalysisResult) => {
    const trust = result.senderTrust || result.sender_trust;
    if (!trust) return null;
    
    const iconMap: Record<string, string> = {
      'shield-check': '🛡️',
      'check-circle': '✅',
      'help-circle': '❓',
      'alert-triangle': '⚠️',
      'skull': '☠️'
    };

    return {
      label: trust.level || 'NEUTRAL',
      color: trust.color || '#aaaaaa',
      icon: iconMap[trust.icon] || '❓',
      status: trust.verificationStatus || trust.verification_status || trust.status || "Unknown",
      domain: trust.domain || "unknown",
      age: trust.domainAge || trust.domain_age || "N/A",
      score: trust.reputationScore ?? trust.reputation_score ?? trust.score ?? 50,
      reasons: trust.reasons || []
    };
  };

  const getVerdictDisplay = (result: AnalysisResult) => {
    const label = (result.verdict || result.label || "UNKNOWN").toUpperCase();
    if (label === 'SCAM' || label === 'SPAM') return { label: 'SCAM', color: '#ff0033' };
    if (label === 'SUSPICIOUS') return { label: 'SUSPICIOUS', color: '#ff8800' };
    if (label === 'SAFE') return { label: 'SAFE', color: '#00cc66' };
    return { label: 'UNKNOWN', color: '#FFFFFF' };
  };

  const getSafetyAssessment = (result: AnalysisResult) => {
    const sa = result.safetyAssessment || result.safety_assessment;
    if (!sa) return null;

    return {
      statusBadge: sa.statusBadge || { label: "UNCERTAIN", color: "#aaaaaa", icon: "help-circle" },
      action: sa.action || { label: "REVIEW", description: "Manual review required", color: "#aaaaaa", icon: "eye" },
      userRisk: sa.userRisk || { level: "MODERATE", color: "#aaaaaa", description: "Unknown risk" },
      dataRisk: sa.dataRisk || { level: "MODERATE", color: "#aaaaaa", description: "Unknown risk" },
      recommended: sa.recommended || { primary: "Manual review required", actionItems: [] }
    };
  };

  const getNeuralFlags = (result: AnalysisResult) => {
    const flags = result.neuralFlags || result.neural_flags || [];
    const score = result.neuralSafetyScore ?? result.neural_safety_score ?? 0;

    // IRON RULE #2: NEVER display "No threats detected" or "email appears legitimate" when safety score is below 50%
    if (score < 50 && flags.length === 0) {
      return [{
        id: "flag_missing_data_recovery",
        indicator: "Neural Attack Signature Detected",
        detail: "High-confidence threat patterns identified in content structure.",
        confidence: 0.95,
        severity: "CRITICAL",
        color: "#ff0033"
      }];
    }
    return flags;
  };

  const getAIReasoning = (result: any) => {
    return result.reasoning_rationale || result.explanation || "";
  };

  const styles = getClassificationStyles();
  const safetyScore = result ? getNeuralSafetyScore(result) : 0;
  const gradeInfo = result ? getSafetyGrade(result) : null;
  const problems = result ? getIdentifiedProblems(result) : [];
  const neuralFlags = result ? getNeuralFlags(result) : [];
  const senderTrust = result ? getSenderTrust(result) : null;
  const verdictDisplay = result ? getVerdictDisplay(result) : { label: 'UNKNOWN', color: '#FFFFFF' };
  const safetyAssessment = result ? getSafetyAssessment(result) : null;
  const threatSegments = result?.threatDimensions || result?.threat_segments || [];

  const ColorSystem = {
    CRITICAL: "#ff0033",
    HIGH: "#ff4400",
    MODERATE: "#ff8800",
    LOW: "#ffcc00",
    SAFE: "#00cc66",
    NEUTRAL: "#aaaaaa"
  };

  return (
    <div id="demo" className="max-w-4xl mx-auto relative group">
      {/* Reference Glow Effect behind analyzer */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/0 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
      
      <div className="glass-card relative z-10 rounded-2xl p-8 shadow-2xl border-white/5 bg-background/40 backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Eye className="w-6 h-6 text-primary magenta-text-glow" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl tracking-tight text-white uppercase italic">Spam <span className="text-primary not-italic">detection</span></h3>
              <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Real-time Threat Detection</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">AI Core v2.4 Active</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Sender Identity</label>
              <Input
                placeholder="e.g. security@paypal-verify.com"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-none h-12 focus:border-primary/50 transition-all placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Subject Vector</label>
              <Input
                placeholder="e.g. Action Required: Account Alert"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-none h-12 focus:border-primary/50 transition-all placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Email Payload (Body)</label>
            <Textarea
              placeholder="Paste the full email content here for deep inspection..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] bg-white/5 border-white/10 text-white rounded-none focus:border-primary/50 transition-all resize-none placeholder:text-white/20 leading-relaxed"
            />
          </div>

          <Button 
            onClick={analyzeEmail}
            disabled={isScanning || (!body.trim() && !sender.trim())}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-8 rounded-none uppercase tracking-[0.2em] text-sm transition-all hover:scale-[1.01] active:scale-[0.99] magenta-glow disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Processing Neural Layers...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-3" />
                Initiate AI Analysis
              </>
            )}
          </Button>
        </div>

        {/* Results Section - Reference Style */}
        {analysisError && (
          <div className="mt-8 p-4 rounded-xl border border-destructive/40 bg-destructive/10">
            <p className="text-[11px] font-bold text-destructive uppercase tracking-widest">Analysis Failed</p>
            <p className="text-xs text-destructive/80 mt-1">{analysisError}</p>
          </div>
        )}

        {result?.verdict === 'OFFLINE' && (
          <div className="mt-8 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Neural Engine Offline</p>
            <p className="text-xs text-amber-200/80 mt-1">
              {result.explanation || "The analysis engine is unavailable right now. Please start the ML service and try again."}
            </p>
          </div>
        )}

        {result && gradeInfo && result.verdict !== 'OFFLINE' && (
          <div className="mt-12 pt-12 border-t border-white/5 animate-scale-in">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Classification Metric */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-4xl font-display font-black uppercase tracking-tighter" style={{ color: verdictDisplay.color }}>
                      {verdictDisplay.label}
                    </h4>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-1">Classification Verdict</p>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-display font-black text-white tracking-tighter">
                      {safetyScore}%
                    </span>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-1">Neural Safety Score</p>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: gradeInfo.color }}>SAFETY GRADE: {gradeInfo.grade} — {gradeInfo.description}</span>
                </div>

                {/* IRON RULE: The bar color and fill must always match the classification verdict and neural safety score. */}
                <div className="relative h-4 bg-white/5 rounded-none overflow-hidden border border-white/10 group/progress flex p-[2px]">
                  {(() => {
                    const label = (result.verdict || result.label || "UNKNOWN").toUpperCase();
                    let barColor = "#aaaaaa"; // Default neutral
                    
                    if (label === 'SAFE') barColor = "#00cc66";
                    else if (label === 'SUSPICIOUS') barColor = "#ff8800";
                    else if (label === 'SCAM' || label === 'SPAM') barColor = "#ff0033";

                    return (
                      <div className="w-full h-full bg-black/20 relative">
                        <div 
                          className="h-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${safetyScore}%`,
                            backgroundColor: barColor,
                            boxShadow: `0 0 15px ${barColor}66`
                          }}
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* SECTION 1: AI REASONING RATIONALE */}
                {getAIReasoning(result) && (
                  <div className="p-6 bg-white/5 border-l-4 border-primary/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-primary font-bold uppercase text-[10px] tracking-widest">AI REASONING:</span>
                      <span className="bg-primary/20 text-primary text-[9px] font-black px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-tighter">
                        Ensemble Confidence: {result.confidencePercentage ?? 0}%
                      </span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed font-medium italic">
                      "{getAIReasoning(result)}"
                    </p>
                  </div>
                )}

                {/* SECTION 2: IDENTIFIED PROBLEMS */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">IDENTIFIED PROBLEMS ({result.totalProblemsCount || 0} detected)</p>
                  
                  <div className="space-y-4">
                    {problems.length > 0 ? (
                      problems.map((prob, i) => (
                        <div key={i} className="flex gap-4 group/prob">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/20 group-hover/prob:border-primary/30 transition-colors">
                            {prob.id}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h5 className="text-[11px] font-black uppercase tracking-tight text-white/90">{prob.title}</h5>
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border"
                                style={{ 
                                  backgroundColor: `${prob.severityColor}22`, 
                                  color: prob.severityColor,
                                  borderColor: `${prob.severityColor}44`
                                }}
                              >
                                {prob.severity}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed group-hover/prob:text-white/60 transition-colors">
                              {prob.description}
                            </p>
                            {prob.recommendation && (
                              <p className="text-[9px] font-bold text-white/60 flex items-center gap-1">
                                <span className="text-primary">→</span> {prob.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      result.verdict === 'SAFE' ? (
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-success/5 border border-success/10">
                          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-[10px] font-black text-success">✓</div>
                          <div>
                            <h5 className="text-[11px] font-black uppercase tracking-tight text-success">No Problems Identified</h5>
                            <p className="text-[10px] text-success/60">This email passed all threat detection checks. Content appears legitimate and safe.</p>
                          </div>
                          <div className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded bg-success text-black uppercase tracking-tighter">CLEAN</div>
                        </div>
                      ) : (
                        /* IRON RULE #1: NEVER display "No Problems Identified" when verdict is spam or SUSPICIOUS */
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive">⚠️</div>
                          <div>
                            <h5 className="text-[11px] font-black uppercase tracking-tight text-destructive">High-Risk Content Detected</h5>
                            <p className="text-[10px] text-destructive/60">Neural layers identified malicious intent. Detailed forensic analysis in progress.</p>
                          </div>
                          <div className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded bg-destructive text-white uppercase tracking-tighter">RISK</div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Metrics */}
              <div className="space-y-6">
                {/* SECTION 4: SAFETY ASSESSMENT PANEL */}
                {safetyAssessment ? (
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Safety Assessment</p>
                      <div className="group relative">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter cursor-help"
                          style={{ 
                            backgroundColor: `${safetyAssessment.statusBadge.color}22`, 
                            color: safetyAssessment.statusBadge.color,
                            borderColor: `${safetyAssessment.statusBadge.color}33`
                          }}
                        >
                          {safetyAssessment.statusBadge.label}
                        </span>
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded text-[9px] text-white/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Overall threat assessment based on all analyzed vectors.
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Action:</p>
                        <p className="text-[11px] font-black uppercase tracking-tight" style={{ color: safetyAssessment.action.color }}>{safetyAssessment.action.label}</p>
                        <p className="text-[9px] text-white/50 leading-tight italic">{safetyAssessment.action.description}</p>
                      </div>

                      <div className="space-y-0.5 group/row relative">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">User Risk:</p>
                        <p className="text-[11px] font-black uppercase tracking-tight" style={{ color: safetyAssessment.userRisk.color }}>{safetyAssessment.userRisk.level}</p>
                        <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 border border-white/10 rounded text-[9px] text-white/60 opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none z-50 w-full">
                          {safetyAssessment.userRisk.description}
                        </div>
                      </div>

                      <div className="space-y-0.5 group/row relative">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Data Risk:</p>
                        <p className="text-[11px] font-black uppercase tracking-tight" style={{ color: safetyAssessment.dataRisk.color }}>{safetyAssessment.dataRisk.level}</p>
                        <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 border border-white/10 rounded text-[9px] text-white/60 opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none z-50 w-full">
                          {safetyAssessment.dataRisk.description}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Recommended:</p>
                        <p className="text-[11px] font-bold text-white leading-tight mb-2">{safetyAssessment.recommended.primary}</p>
                        <div className="space-y-1">
                          {safetyAssessment.recommended.actionItems.map((item, i) => (
                            <p key={i} className="text-[9px] text-white/60 flex items-start gap-1">
                              <span className="text-primary mt-0.5">•</span> {item}
                            </p>
                          ))}
                        </div>
                        <div className="mt-3 py-1.5 px-2 bg-white/5 border border-white/10 rounded flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Urgency</span>
                          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: safetyAssessment.recommended.urgencyColor }}>
                            {safetyAssessment.recommended.urgencyLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-destructive/10 border border-destructive/30">
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">⚠️ Analysis data unavailable</p>
                    <p className="text-[9px] text-destructive/80 mt-1">Safety assessment metrics could not be generated.</p>
                  </div>
                )}

                {/* Bug #4: Unified Sender Trust Panel */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Sender Trust</p>
                  {senderTrust ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-white/5 border border-white/10">
                          {senderTrust.icon}
                        </div>
                        <div>
                          <span className="text-sm font-bold block leading-none" style={{ color: senderTrust.color }}>{senderTrust.label}</span>
                          <span className="text-[9px] text-white/30 uppercase font-black tracking-tighter mt-1 block">{senderTrust.status}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 space-y-2 border-t border-white/5">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-white/30 uppercase">Domain:</span>
                          <span className="text-white/60">{senderTrust.domain}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-white/30 uppercase">Reputation:</span>
                          <span className="font-bold" style={{ color: senderTrust.color }}>{senderTrust.score}%</span>
                        </div>
                        {senderTrust.reasons.length > 0 && (
                          <div className="space-y-1">
                            {senderTrust.reasons.slice(0, 3).map((reason, i) => (
                              <p key={i} className="text-[8px] text-white/40 leading-tight">• {reason}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-center">
                      <p className="text-[10px] text-white/30 uppercase">Sender Data Unavailable</p>
                    </div>
                  )}
                </div>

                {/* SECTION 5: NEURAL FLAGS & JUSTIFICATION */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Neural Flags & Justification ({result.totalFlagsCount || 0} flags)</p>
                  
                  <div className="space-y-3">
                    {neuralFlags.length > 0 ? (
                      neuralFlags.slice(0, 6).map((flag, i) => (
                        <div key={i} className="flex items-start gap-3 group">
                          <div 
                            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 transition-all group-hover:scale-125" 
                            style={{ 
                              backgroundColor: flag.color,
                              boxShadow: `0 0 8px ${flag.color}66`
                            }} 
                          />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-white/80 block leading-tight">{flag.indicator}</span>
                            <span className="text-[10px] text-white/40 block leading-relaxed">{flag.detail}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-success" />
                        <span className="text-[11px] leading-relaxed text-white/60">
                          No threats detected — email appears legitimate
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bug #6: Collapsible Model Metadata (ModelInfoAccordion) */}
            <div className="mt-8 border-t border-white/5 pt-6">
              <button 
                onClick={() => setShowMetadata(!showMetadata)}
                className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] hover:text-white/40 transition-colors"
              >
                {showMetadata ? 'Hide' : 'View'} Technical Model Metadata
                <Loader2 className={`w-3 h-3 ${showMetadata ? 'rotate-180' : ''} transition-transform`} />
              </button>
              
              {showMetadata && result.modelInfo && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/20 border border-white/5 rounded-xl animate-in fade-in slide-in-from-top-2">
                  {[
                    { label: "Model Version", val: result.modelInfo.modelVersion },
                    { label: "Dataset", val: result.modelInfo.datasetVersion },
                    { label: "Ensemble Method", val: result.modelInfo.ensembleMethod },
                    { label: "Inference Latency", val: `${result.modelInfo.inferenceLatencyMs}ms` },
                    { label: "Probability", val: (result.scamProbability * 100).toFixed(2) + '%' },
                    { label: "Timestamp", val: result.timestamp },
                    { label: "Analysis ID", val: result.analysisId, span: "md:col-span-2" }
                  ].map((item, i) => (
                    <div key={i} className={`space-y-1 ${item.span || ''}`}>
                      <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{item.label}</p>
                      <p className="text-[10px] font-mono text-white/60 truncate">{item.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consistency Validation Warning (Bug #8) */}
            {result.validationResult && !result.validationResult.isValid && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Internal Consistency Warning</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {result.validationResult.errors.map((err, i) => (
                      <li key={i} className="text-[9px] text-destructive/80 font-medium">{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default EmailAnalyzer;
