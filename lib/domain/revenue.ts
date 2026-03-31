export type RevenueRecognitionOrderLike = {
  date: Date;
  fulfilled_at?: Date | null;
};

export function getRevenueRecognitionDate({
  date,
  fulfilled_at,
}: RevenueRecognitionOrderLike): Date {
  return new Date((fulfilled_at ?? date).getTime());
}
