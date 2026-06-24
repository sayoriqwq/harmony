# Use Effect Schema as the semantic model source of truth

Durable Harmony semantic objects are defined with Effect Schema first, with TypeScript types derived from the schemas. This applies to objects that cross import, parse, correction, patch, regression, package version, storage, provider, or future API boundaries. The decision avoids a split between static interfaces and hand-written runtime validation, and makes schema decode fixtures part of V1 acceptance.

**Consequences**

- `semantic-model` may depend directly on `effect`.
- Branded identifiers protect compile-time identity boundaries, while runtime format or refinement constraints must be explicitly encoded and tested.
- Total state transitions over already-decoded objects may remain ordinary pure functions; Effect is required at boundaries and orchestration points, not around every expression.
