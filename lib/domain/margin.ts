export type DailyMarginInputs = {
  eggs_total_yield: number;
  eggs_collected_for_sale: number;
  daily_sold_eggs: number;
  chicken_count: number;
  revenue: number;
  direct_cost: number;
  allocated_cost: number;
};

export type DailyMarginMetrics = {
  eggs_total_yield: number;
  eggs_collected_for_sale: number;
  daily_sold_eggs: number;
  chicken_count: number;
  revenue: number;
  direct_cost: number;
  allocated_cost: number;
  total_cost: number;
  gross_margin: number;
  direct_margin: number;
  cost_per_collected_egg: number | null;
  margin_per_sold_egg: number | null;
  total_yield_per_chicken: number | null;
  sale_yield_per_chicken: number | null;
};

export type RollingSummaryRecord = {
  date: Date;
  eggs_total_yield: number;
  eggs_collected_for_sale: number;
  eggs_sold: number;
  revenue: number;
  direct_cost: number;
  allocated_cost: number;
};

export type RollingSummary = {
  window_days: number;
  start_date: Date | null;
  end_date: Date | null;
  eggs_total_yield: number;
  eggs_collected_for_sale: number;
  eggs_sold: number;
  revenue: number;
  direct_cost: number;
  allocated_cost: number;
  total_cost: number;
  gross_margin: number;
};

export function calculateDailyMarginMetrics(
  input: DailyMarginInputs,
): DailyMarginMetrics {
  const total_cost = input.direct_cost + input.allocated_cost;
  const gross_margin = input.revenue - total_cost;
  const direct_margin = input.revenue - input.direct_cost;

  return {
    ...input,
    total_cost,
    gross_margin,
    direct_margin,
    cost_per_collected_egg:
      input.eggs_collected_for_sale > 0
        ? total_cost / input.eggs_collected_for_sale
        : null,
    margin_per_sold_egg:
      input.daily_sold_eggs > 0 ? gross_margin / input.daily_sold_eggs : null,
    total_yield_per_chicken:
      input.chicken_count > 0
        ? input.eggs_total_yield / input.chicken_count
        : null,
    sale_yield_per_chicken:
      input.chicken_count > 0
        ? input.eggs_collected_for_sale / input.chicken_count
        : null,
  };
}

export function calculateRollingSummary(
  records: readonly RollingSummaryRecord[],
  window_days: number,
  anchor_date: Date = new Date(),
): RollingSummary {
  const windowDates = getRollingWindowBounds(anchor_date, window_days);
  const recordsInWindow = records.filter((record) => {
    const normalizedRecordDate = normalizeToUtcDate(record.date).getTime();

    return (
      normalizedRecordDate >= windowDates.start_date.getTime() &&
      normalizedRecordDate <= windowDates.end_date.getTime()
    );
  });

  const totals = recordsInWindow.reduce(
    (summary, record) => ({
      eggs_total_yield: summary.eggs_total_yield + record.eggs_total_yield,
      eggs_collected_for_sale:
        summary.eggs_collected_for_sale + record.eggs_collected_for_sale,
      eggs_sold: summary.eggs_sold + record.eggs_sold,
      revenue: summary.revenue + record.revenue,
      direct_cost: summary.direct_cost + record.direct_cost,
      allocated_cost: summary.allocated_cost + record.allocated_cost,
    }),
    {
      eggs_total_yield: 0,
      eggs_collected_for_sale: 0,
      eggs_sold: 0,
      revenue: 0,
      direct_cost: 0,
      allocated_cost: 0,
    },
  );

  const total_cost = totals.direct_cost + totals.allocated_cost;

  return {
    window_days,
    start_date: recordsInWindow.length > 0 ? windowDates.start_date : null,
    end_date: recordsInWindow.length > 0 ? windowDates.end_date : null,
    ...totals,
    total_cost,
    gross_margin: totals.revenue - total_cost,
  };
}

export function calculateSevenDaySummary(
  records: readonly RollingSummaryRecord[],
  anchor_date?: Date,
): RollingSummary {
  return calculateRollingSummary(records, 7, anchor_date);
}

export function calculateThirtyDaySummary(
  records: readonly RollingSummaryRecord[],
  anchor_date?: Date,
): RollingSummary {
  return calculateRollingSummary(records, 30, anchor_date);
}

function getRollingWindowBounds(anchor_date: Date, window_days: number) {
  const end_date = normalizeToUtcDate(anchor_date);
  const start_date = new Date(end_date.getTime());

  start_date.setUTCDate(start_date.getUTCDate() - (window_days - 1));

  return { start_date, end_date };
}

function normalizeToUtcDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
