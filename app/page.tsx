import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { NotifySection } from "@/components/NotifySection";
import { Story } from "@/components/Story";
import { TrustSection } from "@/components/TrustSection";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Story />
      <HowItWorks />
      <NotifySection />
      <TrustSection />
      <Footer />
    </main>
  );
}
