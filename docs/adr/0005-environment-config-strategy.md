# 5. One artifact, environment config injected at runtime

- Status: accepted
- Date: 2026-07

## Context

The service must run across environments (development, and production on Oracle
Cloud, with staging planned). Each environment needs different configuration —
database URL, credentials, log level — and production configuration includes
secrets.

Two failure modes had to be avoided: baking configuration or secrets into the
build (which makes each environment a different artifact and risks leaking
secrets into the image or repository), and conflating deployment environments
with source branches (a common confusion — environments are promotion targets,
not long-lived branches).

Security is a non-negotiable constraint: secrets must never be hardcoded or
committed, and every input — including environment configuration — must be
validated.

## Decision

**The same build artifact runs in every environment; only the injected
configuration differs.** Concretely:

- All configuration comes from environment variables, validated at boot with a
  fail-fast schema (Zod). A missing or malformed variable stops the process
  immediately with a clear error, rather than failing three requests later.
- No secrets in the image, the repository, or the compose files intended for
  deployment. Local development uses throwaway values; production secrets are
  injected at runtime (GitHub Actions secrets → the deployment host).
- The container image is identical across environments; promotion between
  environments is a configuration change, not a rebuild.

## Consequences

**Positive**

- 12-factor configuration: one artifact, environment-specific config, secrets out
  of the build. Promotion between environments is trivial and low-risk.
- Fail-fast validation turns a misconfigured deploy into an immediate, legible
  boot failure instead of a subtle runtime error.
- Security posture is explicit and verifiable: the image is non-root, ships no
  secrets, and reads everything from the environment.
- Environments are decoupled from branching — the pipeline promotes the same
  image, so there is no need for long-lived per-environment branches.

**Negative / trade-offs**

- Every required variable must be present in each environment or the service will
  not boot — intentional strictness that trades convenience for safety.
- Managing secrets externally (in the CI secret store and on the host) adds an
  operational step compared to a committed config file, but that step is the
  point.

## Alternatives considered

- **Per-environment config files committed to the repo.** Rejected: risks
  committing secrets, and makes environments diverge into different artifacts.
- **Baking configuration into the image at build time.** Rejected: each
  environment would need its own build, breaking the one-artifact model and
  coupling the image to a single environment.
- **Long-lived branches per environment (dev/staging/prod).** Rejected:
  environments are deployment/promotion targets, not source-control branches;
  mapping them to branches adds merge overhead and confuses config with code.
