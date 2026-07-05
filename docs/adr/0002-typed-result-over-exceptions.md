# 2. Typed Result over exceptions for use-case failure modes

- Status: accepted
- Date: 2026-07

## Context

The `getQuote` use case orchestrates the pricing flow: fetch the active price
book through a repository port, then compute the quote. One expected outcome is
that no active price book exists — a legitimate business state, not a programming
error.

There are two common ways to signal such an outcome from a use case: throw an
exception, or return a value that encodes success or failure. The original
monolith threw a `no_active_pricebook` error from deep inside the persistence
layer, which mixed failure *policy* with infrastructure and forced every caller
to know which exceptions to catch — coupling that is invisible in the type
signature.

Because testability is a design constraint here, the deciding question was: which
approach lets the use case be tested without `try/catch` gymnastics and makes the
failure modes explicit to callers?

## Decision

The use case returns a **typed discriminated union** (`Result`) rather than
throwing for expected failures:

```
type GetQuoteResult =
  | { ok: true; quote: QuoteResult; priceBookVersion: string }
  | { ok: false; error: "no_pricebook" };
```

Expected failure modes are values in the return type. Unexpected, truly
exceptional conditions (e.g. the database being unreachable mid-request) may
still throw and are handled at the HTTP boundary as `500`.

## Consequences

**Positive**

- Failure modes are visible in the type signature — a caller cannot forget to
  handle `no_pricebook`, because the compiler forces it.
- The use case is tested by asserting on the returned value (`result.ok === false
  && result.error === "no_pricebook"`), with no `try/catch` and no exception
  plumbing. Testability improves directly.
- Keeps failure *policy* in the application layer (the use case decides what an
  absent price book means) instead of in infrastructure.
- The HTTP layer maps each `Result` variant to a semantic status code
  (`no_pricebook` → `409`), keeping the mapping explicit and in one place.

**Negative / trade-offs**

- Slightly more verbose at call sites than letting an exception propagate — each
  caller must branch on `ok`.
- Requires discipline about the boundary between *expected* failures (Result) and
  *exceptional* ones (throw); misclassifying an error as one or the other is a
  design decision that must be made deliberately, not by habit.

## Alternatives considered

- **Throw a typed domain exception** for `no_pricebook`. Valid and idiomatic in
  many codebases, but it hides the failure mode from the type signature and
  pushes callers into `try/catch`, which is harder to test exhaustively and
  easier to forget.
- **Throw from the repository (as the monolith did).** Rejected: it leaks failure
  policy into the infrastructure layer, coupling persistence to business rules
  and making the adapter non-substitutable without replicating its throwing
  behavior.
