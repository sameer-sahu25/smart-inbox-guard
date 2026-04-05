import { Code, Copy, Check, Terminal, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const ApiSection = () => {
  const [copied, setCopied] = useState(false);
  const { isAuthenticated } = useAuth();

  // Secure conditional rendering: Hide completely if not authenticated
  if (!isAuthenticated) return null;

  const codeExample = `// Analyze an email with SpamShield API
const response = await fetch('https://api.spamshield.ai/v1/analyze', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sender: 'suspicious@example.com',
    subject: 'You won $1,000,000!',
    body: 'Click here to claim your prize...',
    check_links: true,
    include_explanation: true
  })
});

const result = await response.json();
// {
//   "classification": "spam",
//   "score": 94.5,
//   "score_band": "90-100%",
//   "explanation": "Critical Risk (94.5%): Promotional language...",
//   "reasons": ["Financial Vector detected", "Urgency tactics"]
// }`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="api" className="py-24 bg-navy text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 mb-6 backdrop-blur-sm">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white">
                Developer API
              </span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white">
              Integrate Spam Detection
              <span className="block text-primary">In Minutes</span>
            </h2>
            
            <p className="text-lg text-white font-medium mb-8 leading-relaxed">
              Our RESTful API makes it easy to add powerful spam detection to your apps. 
              Support for batch processing, webhooks, and real-time streaming.
            </p>

            <div className="grid sm:grid-cols-3 gap-6 mb-8">
              <div className="p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
                <div className="text-3xl font-display font-bold text-primary mb-1">99.9%</div>
                <div className="text-sm text-white font-bold">Accuracy Rate</div>
              </div>
              <div className="p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
                <div className="text-3xl font-display font-bold text-primary mb-1">&lt;100ms</div>
                <div className="text-sm text-white font-bold">Response Time</div>
              </div>
              <div className="p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
                <div className="text-3xl font-display font-bold text-primary mb-1">10M+</div>
                <div className="text-sm text-white font-bold">API Calls/Day</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 group font-bold shadow-lg shadow-primary/20">
                Get API Key
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-bold backdrop-blur-sm">
                Read Documentation
              </Button>
            </div>
          </div>

          {/* Right: Code Block */}
          <div className="relative z-10">
            <div className="glass-dark rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/10 border-b border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-sm text-white font-bold ml-2">api-example.js</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                  className="text-white hover:text-white hover:bg-white/10 font-bold"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {/* Code */}
              <div className="p-4 overflow-x-auto bg-black/60 backdrop-blur-xl">
                <pre className="text-sm font-mono text-white leading-relaxed">
                  <code className="block">{codeExample}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApiSection;