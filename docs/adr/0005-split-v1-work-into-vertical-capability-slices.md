# Split V1 work into vertical capability slices

Harmony V1 implementation issues will be split by executable semantic capability, not by package or layer. Each slice may touch `semantic-model`, `headless-runtime`, fixtures, and tests, but it must close over a theory invariant, Effect service contract, deterministic layer, schema decode fixture, `it.effect` acceptance test, and regression assertion. This makes each issue independently verifiable and prevents horizontal scaffolding from drifting away from the semantic loop.

**Consequences**

- The PRD and issue bodies should use Executable Semantic Capability Spec as the acceptance unit.
- `ready-for-agent` issues must include fixture inputs, expected structured artifacts, Effect-specific acceptance, verify commands, and dependency links.
- The first V1 capability is glossary Vocabulary compile to Published Semantic Package, because later Active Environment, Semantic IR, Correction, Patch, and Regression behavior need a package version root.
