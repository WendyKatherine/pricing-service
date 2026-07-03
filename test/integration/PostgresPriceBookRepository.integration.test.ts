import { Pool } from "pg";
import { startPostgresContainer } from "./helpers/postgresContainer";
import { seedPriceBook } from "./helpers/seedPriceBook";
import { PostgresPriceBookRepository } from "../../src/infrastructure/repositories/PostgresPriceBookRepository";
import { computeQuote } from "../../src/domain/pricing/engine/computeQuote";
import type { StartedContainer } from "./helpers/postgresContainer";

/* ------------------------------------------------------------------ */
/*  Anchored request — MUST match computeQuote.characterization.test   */
/* ------------------------------------------------------------------ */
const ANCHORED_REQUEST = {
  country: "CA" as const,
  postalCode: "E1A1A1",
  items: [
    {
      lineId: "line-1",
      pricingCategory: "tshirt" as const,
      quantity: 10,
      locations: 2,
      addOnPerUnit: 1,
      technique: "screenprint" as const,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Fixture lifecycle                                                  */
/* ------------------------------------------------------------------ */
describe("PostgresPriceBookRepository", () => {
  let container: StartedContainer;
  let pool: Pool;
  let repo: PostgresPriceBookRepository;

  beforeAll(async () => {
    container = await startPostgresContainer();
    pool = new Pool({ connectionString: container.connectionString });
    repo = new PostgresPriceBookRepository(pool);
  }, 60000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  /* -------------------------------------------------------------- */
  /*  1. Happy path — seed → domain mapping → computeQuote parity     */
  /* -------------------------------------------------------------- */
  it("returns a PriceBook domain object and produces the anchored subtotal", async () => {
    await seedPriceBook(pool);

    const pb = await repo.getActivePriceBook();

    expect(pb).not.toBeNull();
    expect(pb!.setupCost).toBe(40);
    expect(typeof pb!.setupCost).toBe("number");
    expect(typeof pb!.baseCosts).toBe("object");
    expect(pb!.baseCosts).toEqual({ tshirt: 6, hoodie: 14, hat: 10 });

    const quote = computeQuote(pb!, ANCHORED_REQUEST);

    expect(quote.subtotal).toBeCloseTo(275.4, 1);
    expect(quote.items[0].unitPrice).toBeCloseTo(27.54, 1);
  });

  /* -------------------------------------------------------------- */
  /*  2. No active price book → null                                 */
  /* -------------------------------------------------------------- */
  it("returns null when no active price book exists", async () => {
    await seedPriceBook(pool);
    await pool.query("UPDATE price_books SET is_active = false WHERE is_active = true");

    const pb = await repo.getActivePriceBook();

    expect(pb).toBeNull();
  });

  /* -------------------------------------------------------------- */
  /*  3. Unique partial index rejects a second is_active = true      */
  /* -------------------------------------------------------------- */
  it("rejects a second active row (one_active_price_book index)", async () => {
    await pool.query("TRUNCATE TABLE price_books RESTART IDENTITY");

    // First active — succeeds
    await pool.query(
      `INSERT INTO price_books
         (version, setup_cost, application_per_unit, base_costs,
          zone_rates, profit_variable, technique_rules, is_active)
       VALUES ('v1', 1, 1, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, true)`,
    );

    // Second active — must fail
    await expect(
      pool.query(
        `INSERT INTO price_books
           (version, setup_cost, application_per_unit, base_costs,
            zone_rates, profit_variable, technique_rules, is_active)
         VALUES ('v2', 2, 2, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, true)`,
      ),
    ).rejects.toThrow();
  });
});
