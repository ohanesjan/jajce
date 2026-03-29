import AvailabilityNote from "@/components/AvailabilityNote";
import PriceTransparency from "@/components/PriceTransparency";

export default function FarmLedgerSection() {
  return (
    <section className="section-shell py-14 md:py-18">
      <div className="mx-auto max-w-[46rem]">
        <div className="h-px w-16 mx-auto bg-gray-200/50" />
        <AvailabilityNote compact />
        <div className="mx-auto mt-8 h-px w-full max-w-[30rem] bg-gradient-to-r from-transparent via-soil/10 to-transparent" />
        <PriceTransparency compact />
      </div>
    </section>
  );
}
