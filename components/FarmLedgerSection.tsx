import AvailabilityNote from "@/components/AvailabilityNote";
import PriceTransparency from "@/components/PriceTransparency";
import type { HomepageAvailabilityMessages } from "@/lib/services/homepage";

export default function FarmLedgerSection({
  today,
  yesterday,
  chickens,
  publicPrice,
  availabilityMessages,
  publicNote,
}: {
  today: number | null;
  yesterday: number | null;
  chickens: number | null;
  publicPrice: number;
  availabilityMessages: HomepageAvailabilityMessages;
  publicNote: string | null;
}) {
  return (
    <section className="section-shell py-14 md:py-18">
      <div className="mx-auto max-w-[46rem]">
        <div className="h-px w-16 mx-auto bg-gray-200/50" />
        <AvailabilityNote
          compact
          today={today}
          yesterday={yesterday}
          chickens={chickens}
          availabilityMessages={availabilityMessages}
          publicNote={publicNote}
        />
        <div className="mx-auto mt-8 h-px w-full max-w-[30rem] bg-gradient-to-r from-transparent via-soil/10 to-transparent" />
        <PriceTransparency compact price={publicPrice} />
      </div>
    </section>
  );
}
