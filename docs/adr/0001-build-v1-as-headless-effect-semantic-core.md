# Build V1 as a headless Effect semantic core

Harmony V1 will land the semantic loop as a headless core before adding HTTP, CLI, UI, or a real LLM provider. The first monorepo boundary is `packages/semantic-model` for durable semantic objects and pure state transitions, plus `packages/headless-runtime` for Effect services, layers, in-memory repositories, parser contracts, validators, correction handling, patch proposal, and regression running. This keeps V1 acceptance focused on the semantic invariants while leaving apps, providers, and persistence adapters as replaceable boundary layers.

**Considered Options**

- Build an app or API first: rejected because interaction shape would become the accidental V1 acceptance surface.
- Put all V1 code in one package: rejected because semantic contracts and runtime orchestration need to evolve at different speeds.
- Create broad `apps/*` and `libs/*` scaffolding now: rejected until there is an executable acceptance path that needs them.
