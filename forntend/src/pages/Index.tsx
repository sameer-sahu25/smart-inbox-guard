import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { PinkWave } from "@/components/PinkWave";
import FeaturesSection from "@/components/FeaturesSection";
import ApiSection from "@/components/ApiSection";
import AnalyticsSection from "@/components/AnalyticsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="relative z-10">
        <HeroSection />
        <PinkWave />
        <FeaturesSection />
        <ApiSection />
        <AnalyticsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;