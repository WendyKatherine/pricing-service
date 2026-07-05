# 4. Product-agnostic contract (bounded context boundary)

- Status: accepted
- Date: 2026-07

## Context

The monolith's original quote endpoint accepted product identifiers, fetched
product records, and derived pricing attributes (category, locations, add-ons)
from them before computing a quote. Extracting the pricing service raised a
boundary question: should the service still know about *products*, or only about
*pricing facts*?

Two contract shapes were possible:

- **Product-aware:** the service receives a product (or product id), looks it up,
  and derives pricing attributes itself.
- **Product-agnostic:** the caller (whoever owns the catalog) derives the pricing
  attributes first and sends already-resolved facts.

Catalog and pricing are different bounded contexts. Products, their admin, and
their storage belong to the catalog context, which still lives in the monolith.
Letting the pricing service depend on the shape of a product would blur that
boundary — and a variant where the service fetches products from another
context's data store is a clear microservice anti-pattern.

## Decision

The pricing service is **product-agnostic**. Its request carries resolved
pricing facts only:

```
{ country, postalCode, items: [{ lineId, pricingCategory, quantity,
                                 locations, addOnPerUnit, technique }] }
```

No product ids, no product objects, no product lookups. Whoever owns the catalog
performs the `product → pricing attributes` derivation *before* calling. The
service exposes a *pricing* contract, not a *product* one.

## Consequences

**Positive**

- The pricing bounded context stays clean: the service depends on pricing
  concepts, not on catalog concepts.
- Only one repository port is needed (`PriceBookRepository`); there is no
  coupling to a product store and no cross-context data access.
- The service's infrastructure stays minimal — a decision that made the
  persistence layer (Day 4) small and self-contained.
- The contract is stable against catalog changes: reshaping a product does not
  ripple into the pricing service.

**Negative / trade-offs**

- The `product → category` derivation must live in the caller (the catalog
  context). Responsibility moves upstream rather than disappearing.
- As a direct consequence, the product-pricing resolver that was migrated during
  extraction became caller-less in this service and was removed (the monolith
  keeps its own copy). Choosing this boundary meant deliberately not reusing that
  code here — a trade accepted to keep the boundary honest.

## Alternatives considered

- **Service receives a product object and derives internally.** Rejected: couples
  the pricing contract to the product shape, a catalog concern, blurring the
  bounded context.
- **Service receives a product id and fetches the product from a store.**
  Rejected outright: reaching into another bounded context's data is a
  microservice anti-pattern that creates hidden coupling and a shared-database
  dependency.
