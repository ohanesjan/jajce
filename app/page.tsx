import { Footer } from "@/components/Footer";
import FarmLedgerSection from "@/components/FarmLedgerSection";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { NotifySection } from "@/components/NotifySection";
import { Story } from "@/components/Story";
import { TrustSection } from "@/components/TrustSection";
import { getHomepageData } from "@/lib/services/homepage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const homepageData = await getHomepageData();

  return (
    <main>
      <Hero />
      <FarmLedgerSection
        today={homepageData.today_eggs_collected_for_sale}
        yesterday={homepageData.yesterday_eggs_collected_for_sale}
        chickens={homepageData.latest_chicken_count}
        publicPrice={homepageData.public_price}
        availabilityMessages={homepageData.availability}
        publicNote={homepageData.public_note}
      />
      <Story />
      <HowItWorks />
      <NotifySection />
      <TrustSection />
      <Footer />
    </main>
  );
}
