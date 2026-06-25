import type { SemanticPackageRef } from '@harmony/semantic-model/schema/correction-diagnosis'
import type { PackageDefinitionExpectedImpact } from '@harmony/semantic-model/schema/semantic-patch'
import type { PackageCurrentView } from '@harmony/semantic-model/schema/workflow-result'
import type { LedgerViewNotFound } from './ledger.ts'
import { PackageVersionPublishedRecord, RegressionCaseCreatedRecord, RegressionRunCompletedRecord, SemanticPatchCandidatePublishedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { Definition, PackageVersion, PublishedSemanticPackage, RuntimeBindingIdentity } from '@harmony/semantic-model/schema/package'
import { PackageDefinitionContainsAssertion, RegressionAssertionResult, RegressionCase, RegressionRun } from '@harmony/semantic-model/schema/regression'
import { SemanticPatchCandidatePublicationSource } from '@harmony/semantic-model/schema/results'
import { SemanticPatchCandidate } from '@harmony/semantic-model/schema/semantic-patch'
import { RegressionCaseCreationResult, RegressionRunResult, SemanticPatchPublicationResult } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Schema } from 'effect'
import { compilerVersion, deterministicInstant, effectVersion, semanticPatchPublisherVersion } from './constants.ts'
import { PatchPublicationBlocked } from './errors.ts'
import { SemanticLedger } from './ledger.ts'

const domainPackageRefForCandidate = Effect.fn('domainPackageRefForCandidate')(
  function* (candidate: SemanticPatchCandidate): Effect.fn.Return<SemanticPackageRef, PatchPublicationBlocked> {
    if (
      candidate.candidateKind !== 'domain_package_patch'
      || candidate.scope.scopeKind !== 'domain'
      || candidate.target.targetKind !== 'semantic_package'
      || candidate.target.packageRef.role !== 'domain'
    ) {
      return yield* new PatchPublicationBlocked({
        candidateId: candidate.id,
        expectedOutcome: 'domain_patch_candidate',
        message: 'Publication in this slice only accepts Domain Semantic Patch Candidates.',
      })
    }
    return candidate.target.packageRef
  },
)

const packageDefinitionImpactForCandidate = Effect.fn('packageDefinitionImpactForCandidate')(
  function* (
    candidate: SemanticPatchCandidate,
  ): Effect.fn.Return<PackageDefinitionExpectedImpact, PatchPublicationBlocked> {
    if (candidate.expectedImpact.impactKind !== 'package_definition_update') {
      return yield* new PatchPublicationBlocked({
        candidateId: candidate.id,
        expectedOutcome: 'domain_patch_candidate',
        message: 'Domain patch publication requires a package definition expected impact.',
      })
    }
    return candidate.expectedImpact
  },
)

function candidateWithState(
  candidate: SemanticPatchCandidate,
  lifecycle: SemanticPatchCandidate['lifecycle'],
  state: SemanticPatchCandidate['state'],
) {
  return new SemanticPatchCandidate({
    ...candidate,
    lifecycle,
    state,
  })
}

function patchedArtifactsFromImpact(
  view: PackageCurrentView,
  impact: PackageDefinitionExpectedImpact,
): PublishedSemanticPackage['artifacts'] {
  return {
    terms: view.publishedPackage.artifacts.terms,
    lexicalSenses: view.publishedPackage.artifacts.lexicalSenses,
    concepts: view.publishedPackage.artifacts.concepts,
    definitions: view.publishedPackage.artifacts.definitions.map(definition =>
      new Definition({
        ...definition,
        text: impact.expectedDefinitionText,
      })),
  }
}

function definitionTextForPatchedPackage(view: PackageCurrentView, impact: PackageDefinitionExpectedImpact) {
  return patchedArtifactsFromImpact(view, impact)
    .definitions
    .map(definition => definition.text)
    .join('\n')
}

function candidatePackageVersionIdForView(nextVersion: number, view: PackageCurrentView) {
  return Schema.decodeUnknownSync(PackageVersion.fields.id)(
    `package-version:${view.publishedPackage.namespace}:v${nextVersion}`,
  )
}

function expectedTextForAssertion(assertion: RegressionCase['expectedAssertions'][number]) {
  switch (assertion.assertionKind) {
    case 'package_definition_contains':
      return assertion.requiredText
    case 'package_definition_equals':
      return assertion.expectedText
    case 'request_clarification_expected':
    case 'semantic_unknown_expected':
      return assertion.summary
  }

  const _exhaustive: never = assertion
  return _exhaustive
}

function actualTextForAssertion(assertion: RegressionCase['expectedAssertions'][number], packageDefinitionText: string) {
  switch (assertion.assertionKind) {
    case 'package_definition_contains':
    case 'package_definition_equals':
      return packageDefinitionText
    case 'request_clarification_expected':
    case 'semantic_unknown_expected':
      return `Package definition regression runner did not observe ${assertion.assertionKind}.`
  }

  const _exhaustive: never = assertion
  return _exhaustive
}

function assertionPassed(assertion: RegressionCase['expectedAssertions'][number], packageDefinitionText: string) {
  switch (assertion.assertionKind) {
    case 'package_definition_contains':
      return packageDefinitionText.includes(assertion.requiredText)
    case 'package_definition_equals':
      return packageDefinitionText === assertion.expectedText
    case 'request_clarification_expected':
    case 'semantic_unknown_expected':
      return false
  }

  const _exhaustive: never = assertion
  return _exhaustive
}

function resultForAssertion(
  assertion: RegressionCase['expectedAssertions'][number],
  packageDefinitionText: string,
) {
  const outcome = assertionPassed(assertion, packageDefinitionText) ? 'passed' : 'failed'
  return new RegressionAssertionResult({
    assertionKind: assertion.assertionKind,
    expectationKind: assertion.expectationKind,
    outcome,
    expected: expectedTextForAssertion(assertion),
    actual: actualTextForAssertion(assertion, packageDefinitionText),
    expectedAssertion: assertion,
    evidenceRefs: assertion.evidenceRefs,
  })
}

export class SemanticPatchPublicationWorkflow extends Context.Service<SemanticPatchPublicationWorkflow, {
  createRegressionCase: (
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<RegressionCaseCreationResult, PatchPublicationBlocked | Schema.SchemaError>
  runRegression: (
    regressionCase: RegressionCase,
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<RegressionRunResult, PatchPublicationBlocked | LedgerViewNotFound | Schema.SchemaError>
  runRegressionSuite: (
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<ReadonlyArray<RegressionRunResult>, PatchPublicationBlocked | LedgerViewNotFound | Schema.SchemaError>
  publishCandidate: (
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<
    SemanticPatchPublicationResult,
    PatchPublicationBlocked | LedgerViewNotFound | Schema.SchemaError
  >
}>()('harmony/headless-runtime/SemanticPatchPublicationWorkflow') {
  static readonly layer = Layer.effect(
    SemanticPatchPublicationWorkflow,
    Effect.gen(function* () {
      const ledger = yield* SemanticLedger

      const createRegressionCase = Effect.fn('SemanticPatchPublicationWorkflow.createRegressionCase')(
        function* (candidate: SemanticPatchCandidate) {
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          const impact = yield* packageDefinitionImpactForCandidate(candidate)
          const regressionCase = new RegressionCase({
            id: Schema.decodeUnknownSync(RegressionCase.fields.id)(
              `regression-case:${candidate.id}:publication`,
            ),
            artifactKind: 'regression-case',
            patchCandidateId: candidate.id,
            sourceCaseId: candidate.sourceCaseId,
            sourceCorrectionId: candidate.sourceCorrectionId,
            targetPackage,
            caseRole: 'target_fix',
            expectedAssertions: [
              new PackageDefinitionContainsAssertion({
                assertionKind: 'package_definition_contains',
                expectationKind: 'confirmed_success',
                packageId: targetPackage.packageId,
                requiredText: impact.expectedDefinitionText,
                evidenceRefs: candidate.evidenceRefs,
              }),
            ],
            rationale: impact.expectedBehavior,
            createdAt: deterministicInstant,
          })
          const recordsBeforeCase = yield* ledger.records
          const ledgerRecord = new RegressionCaseCreatedRecord({
            id: Schema.decodeUnknownSync(RegressionCaseCreatedRecord.fields.id)(
              `ledger-record:${regressionCase.id}:${recordsBeforeCase.length + 1}-regression-case-created`,
            ),
            recordKind: 'RegressionCaseCreated',
            recordedAt: deterministicInstant,
            regressionCase,
          })
          yield* ledger.append(ledgerRecord)

          return yield* Schema.decodeUnknownEffect(RegressionCaseCreationResult)(
            new RegressionCaseCreationResult({
              regressionCase,
              ledgerRecord,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      const runRegression = Effect.fn('SemanticPatchPublicationWorkflow.runRegression')(
        function* (regressionCase: RegressionCase, candidate: SemanticPatchCandidate) {
          const decodedCase = yield* Schema.decodeUnknownEffect(RegressionCase)(regressionCase)
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          const impact = yield* packageDefinitionImpactForCandidate(candidate)

          if (decodedCase.patchCandidateId !== candidate.id && decodedCase.caseRole !== 'historical_behavior') {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'RegressionCase patchCandidateId must match the Semantic Patch Candidate.',
            })
          }
          if (decodedCase.expectedAssertions.length === 0) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'RegressionCase must contain at least one structured expected assertion.',
            })
          }
          if (decodedCase.targetPackage.packageId !== targetPackage.packageId) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'domain_patch_candidate',
              message: 'RegressionCase target package must match the Domain Semantic Patch Candidate target.',
            })
          }

          const view = yield* ledger.currentPackageView(targetPackage.packageId)
          const actual = definitionTextForPatchedPackage(view, impact)
          const nextVersion = (yield* ledger.countPublishedVersions(targetPackage.packageId)) + 1
          const candidatePackageVersionId = candidatePackageVersionIdForView(nextVersion, view)
          const assertionResults = decodedCase.expectedAssertions.map(assertion =>
            resultForAssertion(assertion, actual),
          )
          const passed = assertionResults.every(result => result.outcome === 'passed')
          const outcome = passed ? 'passed' : 'failed'
          const runOrdinal = (yield* ledger.countRegressionRunsForCase(candidate, decodedCase)) + 1
          const regressionRun = new RegressionRun({
            id: Schema.decodeUnknownSync(RegressionRun.fields.id)(
              `regression-run:${decodedCase.id}:${outcome}:run-${runOrdinal}`,
            ),
            artifactKind: 'regression-run',
            regressionCaseId: decodedCase.id,
            patchCandidateId: candidate.id,
            sourceCaseId: decodedCase.sourceCaseId,
            sourceCorrectionId: decodedCase.sourceCorrectionId,
            targetPackageId: targetPackage.packageId,
            targetPackageVersionId: view.packageVersion.id,
            oldPackageVersionId: view.packageVersion.id,
            candidatePackageVersionId,
            outcome,
            assertionResults,
            startedAt: deterministicInstant,
            completedAt: deterministicInstant,
          })
          const regressedCandidate = candidateWithState(
            candidate,
            'proposed',
            passed ? 'regression_passed' : 'regression_failed',
          )
          const recordsBeforeRun = yield* ledger.records
          const ledgerRecord = new RegressionRunCompletedRecord({
            id: Schema.decodeUnknownSync(RegressionRunCompletedRecord.fields.id)(
              `ledger-record:${regressionRun.id}:${recordsBeforeRun.length + 1}-regression-run-completed`,
            ),
            recordKind: 'RegressionRunCompleted',
            recordedAt: deterministicInstant,
            regressionRun,
            patchCandidate: regressedCandidate,
          })
          yield* ledger.append(ledgerRecord)

          return yield* Schema.decodeUnknownEffect(RegressionRunResult)(
            new RegressionRunResult({
              regressionCase: decodedCase,
              regressionRun,
              patchCandidate: regressedCandidate,
              ledgerRecord,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      const runRegressionSuite = Effect.fn('SemanticPatchPublicationWorkflow.runRegressionSuite')(
        function* (candidate: SemanticPatchCandidate) {
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          yield* packageDefinitionImpactForCandidate(candidate)
          const regressionCases = yield* ledger.relevantRegressionCaseRecords(candidate, targetPackage)
          if (regressionCases.length === 0) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires at least one target RegressionCase for this candidate.',
            })
          }
          return yield* Effect.forEach(
            regressionCases,
            record => runRegression(record.regressionCase, candidate),
          )
        },
      )

      const publishCandidate = Effect.fn('SemanticPatchPublicationWorkflow.publishCandidate')(
        function* (candidate: SemanticPatchCandidate) {
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          const impact = yield* packageDefinitionImpactForCandidate(candidate)
          const existingPublication = yield* ledger.publishedRecordForPatchCandidate(candidate)
          if (existingPublication !== undefined) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'SemanticPatchCandidate has already been published.',
            })
          }

          const relevantCaseRecords = yield* ledger.relevantRegressionCaseRecords(candidate, targetPackage)
          if (relevantCaseRecords.length === 0) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires at least one RegressionCase for this candidate.',
            })
          }

          const runRecords = yield* Effect.forEach(
            relevantCaseRecords,
            record =>
              ledger.latestRegressionRunRecordForCase(candidate, record.regressionCase).pipe(
                Effect.map(runRecord => ({
                  caseRecord: record,
                  runRecord,
                })),
              ),
          )
          const missingRun = runRecords.find(record => record.runRecord === undefined)
          if (missingRun !== undefined) {
            const expectedOutcome = missingRun.caseRecord.regressionCase.caseRole === 'historical_behavior'
              ? 'historical_behavior_preserved'
              : 'regression_run_passed'
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome,
              message: 'Publication requires each relevant RegressionCase to be rerun against this candidate.',
            })
          }

          const failedHistorical = runRecords.find(record =>
            record.caseRecord.regressionCase.caseRole === 'historical_behavior'
            && record.runRecord?.regressionRun.outcome !== 'passed',
          )
          if (failedHistorical !== undefined) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'historical_behavior_preserved',
              message: 'Publication is blocked because the candidate changes confirmed historical behavior.',
            })
          }

          const failedTarget = runRecords.find(record =>
            record.caseRecord.regressionCase.caseRole === 'target_fix'
            && record.runRecord?.regressionRun.outcome !== 'passed',
          )
          if (failedTarget !== undefined) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires the target RegressionRun for this candidate to pass.',
            })
          }
          const publicationRunRecord = runRecords.find(record =>
            record.caseRecord.regressionCase.caseRole === 'target_fix',
          )?.runRecord
          if (publicationRunRecord === undefined) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires a target RegressionCase for this candidate.',
            })
          }

          const previousView = yield* ledger.currentPackageView(targetPackage.packageId)
          const recordsBeforePublishAttempt = yield* ledger.records
          const nextVersion = (yield* ledger.countPublishedVersions(targetPackage.packageId)) + 1
          const version = `v${nextVersion}`
          const publishedPackage = new PublishedSemanticPackage({
            id: Schema.decodeUnknownSync(PublishedSemanticPackage.fields.id)(
              `published-package:${previousView.publishedPackage.namespace}:${version}`,
            ),
            packageId: previousView.packageId,
            namespace: previousView.publishedPackage.namespace,
            lifecycle: 'published',
            artifacts: patchedArtifactsFromImpact(previousView, impact),
            authoritativeRelations: [],
            authoritativeConstraints: [],
            publishedAt: deterministicInstant,
          })
          const packageVersion = new PackageVersion({
            id: Schema.decodeUnknownSync(PackageVersion.fields.id)(
              `package-version:${previousView.publishedPackage.namespace}:${version}`,
            ),
            packageId: previousView.packageId,
            version,
            state: 'published',
            publishedPackageId: publishedPackage.id,
            sourceDraftId: previousView.packageVersion.sourceDraftId,
            runtimeBinding: new RuntimeBindingIdentity({
              schemaVersion: 'semantic-package.v1',
              compilerVersion,
              publisherVersion: semanticPatchPublisherVersion,
              effectVersion,
            }),
            publishedAt: deterministicInstant,
          })
          const packageVersionRecord = new PackageVersionPublishedRecord({
            id: Schema.decodeUnknownSync(PackageVersionPublishedRecord.fields.id)(
              `ledger-record:${candidate.id}:${recordsBeforePublishAttempt.length + 1}-published-${version}`,
            ),
            recordKind: 'PackageVersionPublished',
            recordedAt: deterministicInstant,
            publishedPackage,
            packageVersion,
            publicationSource: new SemanticPatchCandidatePublicationSource({
              sourceKind: 'semantic_patch_candidate',
              patchCandidateId: candidate.id,
              sourceCaseId: candidate.sourceCaseId,
              sourceCorrectionId: candidate.sourceCorrectionId,
              sourceCaseSemanticEditId: candidate.sourceCaseSemanticEditId,
              sourceDiagnosisId: candidate.sourceDiagnosisId,
              regressionCaseId: publicationRunRecord.regressionRun.regressionCaseId,
              regressionRunId: publicationRunRecord.regressionRun.id,
              previousPackageVersionId: previousView.packageVersion.id,
            }),
          })
          yield* ledger.append(packageVersionRecord)

          const publishedCandidate = candidateWithState(candidate, 'published', 'published')
          const recordsBeforeCandidatePublished = yield* ledger.records
          const patchCandidatePublishedRecord = new SemanticPatchCandidatePublishedRecord({
            id: Schema.decodeUnknownSync(SemanticPatchCandidatePublishedRecord.fields.id)(
              `ledger-record:${candidate.id}:${recordsBeforeCandidatePublished.length + 1}-candidate-published`,
            ),
            recordKind: 'SemanticPatchCandidatePublished',
            recordedAt: deterministicInstant,
            patchCandidate: publishedCandidate,
            packageVersionId: packageVersion.id,
            publishedPackageId: publishedPackage.id,
            regressionRunId: publicationRunRecord.regressionRun.id,
          })
          yield* ledger.append(patchCandidatePublishedRecord)

          const currentView = yield* ledger.currentPackageView(targetPackage.packageId)

          return yield* Schema.decodeUnknownEffect(SemanticPatchPublicationResult)(
            new SemanticPatchPublicationResult({
              patchCandidate: publishedCandidate,
              regressionRun: publicationRunRecord.regressionRun,
              publishedPackage,
              packageVersion,
              previousPackageVersion: previousView.packageVersion,
              packageVersionRecord,
              patchCandidatePublishedRecord,
              currentView,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      return SemanticPatchPublicationWorkflow.of({
        createRegressionCase,
        runRegression,
        runRegressionSuite,
        publishCandidate,
      })
    }),
  )
}
