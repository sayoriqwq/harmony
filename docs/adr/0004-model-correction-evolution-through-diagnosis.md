# Model correction evolution through diagnosis

Harmony does not turn a user Correction directly into a long-term semantic rule. A Correction first produces a typed CaseSemanticEdit for the current Case, then a closed Correction Diagnosis explains whether the cause is local, package-related, parser-related, rule-related, scope-related, or version-related. Only diagnoses that justify long-term change may create a scoped Semantic Patch Candidate and regression case.

**Considered Options**

- Save correction text only: rejected because it cannot reliably update current Semantic IR or drive regression assertions.
- Promote every correction into a package patch: rejected because one Case is not automatically a global rule.
- Use free-text diagnosis only: rejected because patch policy needs exhaustive handling over stable diagnosis kinds.
