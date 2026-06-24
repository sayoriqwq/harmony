# Separate evidence sources from structured semantic artifacts

Harmony stores original user-facing sources as Evidence Sources and consumes decoded Structured Semantic Artifacts for runtime behavior. Vocabulary text, prompt text, document text, corrections, and regression sources remain audit records; packages, Semantic IR, lint findings, CaseSemanticEdit, Semantic Patch Candidate, and expected regression assertions are structured artifacts that must trace back to evidence. This prevents derived interpretations from overwriting source material while still giving the runtime typed objects to validate and evolve.

**Consequences**

- V1 storage uses append-only ledger semantics with derived current views, even when implemented in memory.
- Correction text is preserved as evidence, but the current Case is changed through a typed CaseSemanticEdit.
- Regression cases must contain structured expected assertions, not only natural-language expectations.
