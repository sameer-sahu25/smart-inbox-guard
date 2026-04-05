import { 
  Shield, 
  Zap, 
  Brain, 
  Link2, 
  MessageSquare, 
  BarChart3, 
  Lock, 
  Globe,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Web3 Revenue Streams",
    description: "Unlocks Web3 revenue models for email protection services.",
  },
  {
    icon: Shield,
    title: "Correlation Analysis",
    description: "Highlights existing patterns in malicious email distributions.",
  },
  {
    icon: Zap,
    title: "Web3 Trend Predictions",
    description: "Uses blockchain data-feeds to anticipate new spam waves.",
  },
  {
    icon: Lock,
    title: "Spam Bot Detection",
    description: "Removes the noise of spam using advanced neural filtering.",
  },
  {
    icon: MessageSquare,
    title: "Web3 Campaign Automation",
    description: "Automates the process of identifying phishing campaigns.",
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 relative bg-black overflow-hidden">
      <div className="container mx-auto px-4 animate-wave-fade [animation-delay:0.5s]">
        {/* Section Header - Reference Style */}
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-6xl font-display font-extrabold text-white tracking-tighter mb-4 italic uppercase">
            The <span className="text-primary not-italic">Solution</span>
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mb-12 magenta-glow" />
        </div>

        {/* Features Grid - Reference Style "The Solution" */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-0 border-y border-white/5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-10 border-x border-white/5 hover:bg-white/[0.02] transition-all duration-500 relative overflow-hidden"
            >
              {/* Reference Style Icon */}
              <div className="mb-8 relative">
                <feature.icon className="w-8 h-8 text-primary magenta-text-glow transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 leading-tight group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-[11px] text-white/40 font-medium leading-relaxed tracking-wider group-hover:text-white/60 transition-colors">
                {feature.description}
              </p>

              {/* Decorative Corner Line */}
              <div className="absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-4 right-4 w-px h-4 bg-primary/30" />
                <div className="absolute bottom-4 right-4 w-4 h-px bg-primary/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;