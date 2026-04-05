import { useState } from "react";
import { Shield, Github, Twitter, Linkedin, Mail, Send, Loader2 } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Successfully joined the protection network!");
      setEmail("");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-navy text-white py-16 relative overflow-hidden z-50">
      {/* Background decorations - Subtle magenta glows to match theme */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
      </div>

      <div className="container mx-auto px-4 relative z-20">
        <div className="grid md:grid-cols-4 gap-12 mb-16 p-8 md:p-12 bg-black/40 border border-white/10 rounded-[2.5rem] backdrop-blur-xl hover:bg-black/50 hover:border-white/20 transition-all duration-500 shadow-2xl">
          {/* Brand & Newsletter */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <BrandLogo size={40} className="secondary-glow" />
              <span className="text-2xl font-display font-bold tracking-tighter dual-text-glow">
                Spam <span className="text-primary italic">AI</span>
              </span>
            </div>
            <p className="text-white/60 text-lg mb-8 max-w-md leading-relaxed">
              Next-gen email protection powered by advanced neural intelligence. 
              Join thousands of users who trust Spam AI to keep their inboxes safe.
            </p>
            
            {/* Newsletter Subscription */}
            <div className="max-w-md">
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4 text-primary">Stay Protected</h4>
              <form onSubmit={handleSubscribe} className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-md focus-within:border-primary/50 transition-all duration-300 focus-within:shadow-[0_0_20px_rgba(236,72,153,0.1)]">
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" 
                  aria-label="Newsletter email subscription"
                  className="bg-transparent border-none text-white placeholder:text-white/30 focus-visible:ring-0 h-11"
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-white font-bold px-6 rounded-md transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Join
                    </>
                  )}
                </Button>
              </form>
              <p className="text-[10px] text-white/30 mt-3 uppercase tracking-tighter">
                * Weekly threat reports and security tips. Unsubscribe anytime.
              </p>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div>
              <h4 className="font-display font-bold mb-6 text-sm uppercase tracking-widest">Resources</h4>
              <ul className="space-y-4">
                <li><a href="#features" className="text-white/50 hover:text-primary text-[13px] transition-all flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-primary/30 rounded-full group-hover:w-2 transition-all" />
                  Features
                </a></li>
                <li><a href="#api" className="text-white/50 hover:text-primary text-[13px] transition-all flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-primary/30 rounded-full group-hover:w-2 transition-all" />
                  API Access
                </a></li>
                <li><a href="#" className="text-white/50 hover:text-primary text-[13px] transition-all flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-primary/30 rounded-full group-hover:w-2 transition-all" />
                  Documentation
                </a></li>
                <li><a href="#" className="text-white/50 hover:text-primary text-[13px] transition-all flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-primary/30 rounded-full group-hover:w-2 transition-all" />
                  Status
                </a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold mb-6 text-sm uppercase tracking-widest">Connect</h4>
              <div className="flex flex-wrap gap-4 mb-8">
                <a href="#" aria-label="Twitter Profile" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all group">
                  <Twitter className="w-5 h-5 text-white/60 group-hover:text-primary" />
                </a>
                <a href="#" aria-label="Github Profile" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all group">
                  <Github className="w-5 h-5 text-white/60 group-hover:text-primary" />
                </a>
                <a href="https://www.linkedin.com/in/sameer-sahu-303449354" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all group">
                  <Linkedin className="w-5 h-5 text-white/60 group-hover:text-primary" />
                </a>
                <a href="mailto:sameer.896255@gmail.com" aria-label="Email Us" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all group">
                  <Mail className="w-5 h-5 text-white/60 group-hover:text-primary" />
                </a>
              </div>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">
                Questions? <br />
                <a href="mailto:sameer.896255@gmail.com" className="text-white/60 hover:text-primary transition-colors duration-300">sameer.896255@gmail.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest">
              © 2024 Spam AI Intelligence. All rights reserved.
            </p>
            <div className="flex items-center gap-8">
              <a href="#" className="text-white/30 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors">Privacy</a>
              <a href="#" className="text-white/30 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors">Terms</a>
              <a href="#" className="text-white/30 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;