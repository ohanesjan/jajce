export type DailyEggInputs = {
  eggs_collected_for_sale: number;
  eggs_used_other_purpose: number;
  eggs_broken: number;
  eggs_unusable_other: number;
};

export function calculateEggsTotalYield({
  eggs_collected_for_sale,
  eggs_used_other_purpose,
  eggs_broken,
  eggs_unusable_other,
}: DailyEggInputs): number {
  return (
    eggs_collected_for_sale +
    eggs_used_other_purpose +
    eggs_broken +
    eggs_unusable_other
  );
}
