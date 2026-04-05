import { ArrowRight, Shield, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmailAnalyzer from "./EmailAnalyzer";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  return <section className="relative pt-32 pb-16 overflow-hidden min-h-screen flex flex-col justify-center bg-black">
      {/* Background decorations - Subtle magenta glows */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto mb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center relative">
            {/* Visual Background Trail Effect for the Text Container */}
            <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden lg:overflow-visible">
              <svg
                className="absolute top-1/2 left-[-20%] w-[140%] h-[400px] -translate-y-1/2 opacity-40 blur-[2px]"
                viewBox="0 0 1200 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0,200 C300,100 600,300 1200,200"
                  stroke="url(#hero-trail-grad)"
                  strokeWidth="40"
                  strokeLinecap="round"
                  className="animate-float-trail"
                />
                <path
                  d="M-100,250 C200,150 800,350 1300,250"
                  stroke="url(#hero-trail-grad-2)"
                  strokeWidth="20"
                  strokeLinecap="round"
                  className="animate-float-trail-slow"
                />
                <defs>
                  <linearGradient id="hero-trail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="#db2777" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                  <linearGradient id="hero-trail-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="#9d174d" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Secondary Glows for contrast */}
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
            </div>

            <div className="text-left animate-wave-fade relative z-10">
              {/* Reference Style Heading with Dual Colors */}
              <div className="flex items-center gap-4 mb-6 animate-fade-in">
                <BrandLogo size={60} className="secondary-glow" />
                <div className="h-px w-12 bg-white/20" />
                <span className="text-xs font-bold text-white/40 uppercase tracking-[0.5em]">Next-Gen Security</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-extrabold mb-8 animate-fade-in tracking-tighter leading-[0.9] text-white">
                Introducing <span className="text-gradient block mt-2 dual-text-glow uppercase">Spam AI</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-white/60 max-w-xl mb-10 animate-fade-in leading-relaxed" style={{
                animationDelay: "0.1s"
              }}>
                Discover the power of our advanced AI-driven 'Spam Finder', designed to 
                provide you with in-depth insights and real-time data on the most impactful 
                threats in your digital workspace.
              </p>

              {/* CTA Buttons - Reference Style */}
              <div className="flex flex-wrap items-center gap-6 animate-fade-in" style={{
                animationDelay: "0.2s"
              }}>
                <div className={`transition-all duration-700 ease-in-out ${isAuthenticated ? 'opacity-0 scale-90 -translate-x-10 pointer-events-none w-0 overflow-hidden' : 'opacity-100 scale-100 translate-x-0'}`}>
                  {!isAuthenticated && (
                    <Button 
                      size="lg" 
                      onClick={() => navigate("/login")}
                      className="bg-white text-black hover:bg-white/90 rounded-none px-10 py-7 font-bold text-sm uppercase tracking-widest transition-all hover:scale-105"
                    >
                      Try Spam Guard
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <a href="#" className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 transition-colors">
                    <Zap className="w-5 h-5 text-white" />
                  </a>
                  <a href="#" className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 transition-colors">
                    <Shield className="w-5 h-5 text-white" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Side - Bento Style Decorative Element */}
            <div className="hidden lg:block relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="glass-card rounded-3xl p-8 border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="h-4 w-1/3 bg-white/10 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/5 rounded-full" />
                    <div className="h-2 w-5/6 bg-white/5 rounded-full" />
                    <div className="h-2 w-4/6 bg-white/5 rounded-full" />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 bg-white/10 rounded-full" />
                      <div className="h-2 w-full bg-white/5 rounded-full" />
                    </div>
                  </div>
                </div>
                {/* Reference Background Lines */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 border-[20px] border-primary/5 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Email Analyzer Demo - Transformed */}
        <div className="animate-fade-in relative" style={{
          animationDelay: "0.4s"
        }}>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent to-primary/50" />
          <EmailAnalyzer />
        </div>
      </div>
    </section>;
};
export default HeroSection;