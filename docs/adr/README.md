# Architecture Decision Records

This directory documents the significant architectural decisions made while
extracting and building the pricing service. Each record captures the context
that forced a decision, the decision itself, its consequences (including
trade-offs), and the alternatives that were considered and rejected.

Format: lightweight [MADR](https://adr.github.io/madr/).

## Index

| # | Decision | Summary |
|---|----------|---------|
| [0001](0001-monolith-plus-one-service-over-microservices.md) | Monolith + one extracted service over full microservices | Extract one service along a real bounded context instead of splitting aggressively into a distributed monolith. |
| [0002](0002-typed-result-over-exceptions.md) | Typed Result over exceptions for failure modes | The use case returns a typed `Result` for expected failures, keeping them visible in the type and testable without `try/catch`. |
| [0003](0003-absence-as-null-in-repository-port.md) | Repository port returns null; policy in the use case | Infrastructure reports a fact (`PriceBook | null`); the application layer owns what absence means. |
| [0004](0004-product-agnostic-bounded-context.md) | Product-agnostic contract | The service accepts resolved pricing facts, not products, keeping the pricing bounded context clean. |
| [0005](0005-environment-config-strategy.md) | One artifact, env config injected at runtime | The same image runs everywhere; config and secrets are injected at runtime, never baked in. |
