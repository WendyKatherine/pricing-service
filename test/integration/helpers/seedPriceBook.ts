import { Pool } from "pg";

/**
 * Default test price book — MUST match the anchored price book
 * used in computeQuote.characterization.test.ts and scripts/seed.ts.
 *
 * With the anchored QuoteRequest (country=CA, postal=E1A1A1, 10×tshirt,
 * 2 locations, 1 addOn, screenprint), these values produce subtotal = 275.4.
 *
 * This is the parity thread for the entire project — do NOT change these values.
 */
const DEFAULT_PRICE_BOOK = {
  version: "test.v1",
  setup_cost: 40,
  application_per_unit: 3,
  base_costs: { tshirt: 6, hoodie: 14, hat: 10 },
  zone_rates: { M: 0, V: 0, P: 0, E: 2, R: 2, default: 0, US: 0 },
  profit_variable: [
    { max: 49, value: 2.0 },
    { min: 50, max: 99, value: 1.9 },
    { min: 100, value: 1.8 },
  ],
  technique_rules: {},
};

/**
 * Seeds the price_books table with exactly one active row.
 *
 * Idempotent — truncates the table before inserting so each call
 * produces a clean, predictable state regardless of previous runs.
 *
 * @param pool      Connected pg Pool
 * @param overrides Partial overrides for the default seed data
 * @returns The inserted price_book id
 */
export async function seedPriceBook(
  pool: Pool,
  overrides?: Partial<typeof DEFAULT_PRICE_BOOK>,
): Promise<number> {
  const data = { ...DEFAULT_PRICE_BOOK, ...overrides };

  await pool.query("TRUNCATE TABLE price_books RESTART IDENTITY");

  const { rows } = await pool.query(
    `INSERT INTO price_books
       (version, setup_cost, application_per_unit, base_costs,
        zone_rates, profit_variable, technique_rules, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id`,
    [
      data.version,
      data.setup_cost,
      data.application_per_unit,
      JSON.stringify(data.base_costs),
      JSON.stringify(data.zone_rates),
      JSON.stringify(data.profit_variable),
      JSON.stringify(data.technique_rules),
    ],
  );

  return rows[0].id as number;
}
