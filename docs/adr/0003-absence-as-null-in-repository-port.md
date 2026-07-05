# 3. Repository port returns null for absence; policy lives in the use case

- Status: accepted
- Date: 2026-07

## Context

The pricing flow needs the active price book, fetched through the
`PriceBookRepository` port. A real, expected situation is that no active price
book exists. Something has to decide what that absence *means* for the business.

In the original monolith, the repository threw `no_active_pricebook` directly
from the persistence layer. That places a business-policy decision (what an
absent price book implies) inside infrastructure, and it forces every concrete
repository implementation to reproduce that throwing behavior to remain
interchangeable — which undermines the point of depending on an interface.

The question was where the "what does absence mean" decision belongs: in the
adapter that reads the database, or in the application layer that owns business
policy.

## Decision

The port models absence as a **value**, not an exception:

```
interface PriceBookRepository {
  getActivePriceBook(): Promise<PriceBook | null>;
}
```

The repository's only job is to answer "here is the active price book, or `null`
if there isn't one." The **use case** interprets that `null` and decides the
policy (returning `{ ok: false, error: "no_pricebook" }`). Infrastructure
reports a fact; the application layer decides what it means.

## Consequences

**Positive**

- Business policy lives in the application layer, not in infrastructure —
  correct separation of concerns and a clean application of the Dependency
  Inversion Principle.
- Any implementation of the port (the Postgres adapter, the in-memory fake) is
  interchangeable without replicating throwing behavior, so Liskov substitution
  holds. The fake returns `null` exactly as the real adapter does.
- The use case is trivially testable for the absence path: inject a fake
  constructed with `null`, assert the resulting `Result`. No database, no thrown
  errors to catch.

**Negative / trade-offs**

- Callers must remember to handle the `null` branch — but this is enforced by the
  type (`PriceBook | null`), so the compiler catches omissions.
- A nullable return is a mild departure from an "always returns a value or
  throws" style; the trade is deliberate in favor of testability and clear
  ownership of policy.

## Alternatives considered

- **Throw from the repository (the monolith's approach).** Rejected: it couples
  persistence to business rules and makes adapters non-substitutable without
  copying the throw, defeating the purpose of the port.
- **Return an empty object or sentinel value.** Rejected: less explicit than
  `null`, and it invites accidental use of a meaningless "empty" price book in
  the pricing calculation. `null` forces an explicit decision at the boundary.
