/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable("price_books", {
    id: { type: "serial", primaryKey: true },
    version: { type: "text", notNull: true },
    setup_cost: { type: "numeric", notNull: true },
    application_per_unit: { type: "numeric", notNull: true },
    base_costs: { type: "jsonb", notNull: true },
    zone_rates: { type: "jsonb", notNull: true },
    profit_variable: { type: "jsonb", notNull: true },
    technique_rules: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    is_active: { type: "boolean", notNull: true, default: false },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // At most one active price book at the DB level
  pgm.createIndex("price_books", "is_active", {
    name: "one_active_price_book",
    unique: true,
    where: "is_active = true",
  });
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropIndex("price_books", "is_active", {
    name: "one_active_price_book",
  });
  pgm.dropTable("price_books");
};
