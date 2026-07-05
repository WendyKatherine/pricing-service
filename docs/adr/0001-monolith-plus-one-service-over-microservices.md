# 1. Monolith + one extracted service over full microservices

- Status: accepted
- Date: 2026-07

## Context

The pricing logic lived inside an inherited legacy Next.js monolith that owned
everything: storefront, API routes, pricing, and persistence, shipped as a single
deployable. The goal was to produce a portfolio-grade demonstration of
microservice extraction and operational readiness, not to re-platform the whole
product.

A naive reading of "modernize into microservices" would split the monolith into
many services. But the number of services is a means, not the goal — the goal is
a clean, independently deployable, well-operated service that demonstrates sound
boundaries. Splitting aggressively under time pressure risks producing a
*distributed monolith*: services that must be deployed together and share hidden
coupling, which is worse than the monolith it replaced.

The domain of a small project rarely justifies many services, and a reviewer can
tell the difference between boundaries drawn along real domain seams and
boundaries drawn arbitrarily to inflate a count.

## Decision

Extract exactly **one** service — the pricing service — along a genuine bounded
context, and leave the rest of the system as the (unchanged) monolith. The
pricing domain already had clean internal boundaries in the monolith, making it
the natural, low-risk candidate to carve out into its own process, database, and
deployment lifecycle.

The resulting topology is still multi-service (the monolith plus the pricing
service), which provides real service-to-service communication to orchestrate,
without the cost and risk of an aggressive split.

## Consequences

**Positive**

- The extraction targets a boundary that already existed, so it moves a piece
  with clean seams rather than untangling coupled code.
- Demonstrates the more senior signal — knowing *when not to split* — rather than
  splitting everything by default.
- Keeps effort proportional to value: the operational layer (containerization,
  CI/CD, migrations, observability) gets the focus, which is where the portfolio
  value lies, instead of being spent managing many services.
- Avoids the distributed-monolith failure mode.

**Negative / trade-offs**

- A single extracted service shows fewer inter-service concerns (service
  discovery, distributed tracing across many hops) than a larger fleet would.
- The remaining monolith keeps its known technical debt; it is explicitly out of
  scope and isolated behind the service boundary rather than paid down.

**Neutral**

- If the system grew, additional services would be extracted the same way — one
  clean bounded context at a time — rather than by a big-bang decomposition.

## Alternatives considered

- **Full decomposition into many microservices.** Rejected: high effort and high
  risk of a distributed monolith under time constraints, with no proportional
  gain in demonstrated skill for this domain size.
- **Leave everything in the monolith.** Rejected: it would not demonstrate
  extraction, independent deployability, or the operational maturity the project
  set out to show.
