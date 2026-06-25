import type { PackageIdType as PackageId } from '@harmony/semantic-model/schema/ids'
import type { SemanticKernelIdentity } from '@harmony/semantic-model/schema/package'
import { Layer } from 'effect'
import { ActiveEnvironmentBuilder } from './active-environment-builder.ts'
import { defaultSemanticKernelIdentity } from './constants.ts'
import { CorrectionDiagnosisWorkflow } from './correction-diagnosis-workflow.ts'
import { CorrectionWorkflow } from './correction-workflow.ts'
import { DocumentSemanticLintWorkflow, SemanticLintService } from './document-semantic-lint-workflow.ts'
import { layerInMemory } from './glossary-package-workflow.ts'
import { PromptClarificationWorkflow } from './prompt-clarification-workflow.ts'
import { RequestDecisionEngine } from './request-decision-engine.ts'
import { BaseSemanticLayer, SemanticKernel } from './semantic-kernel.ts'
import { SemanticParser } from './semantic-parser.ts'
import { SemanticPatchPublicationWorkflow } from './semantic-patch-publication-workflow.ts'

export function layerInMemoryWithActiveEnvironment(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return ActiveEnvironmentBuilder.layer.pipe(
    Layer.provide(SemanticKernel.layerFromIdentity(kernelIdentity)),
    Layer.provide(BaseSemanticLayer.layerFromPackageId(basePackageId)),
    Layer.provideMerge(layerInMemory),
  )
}

export function layerInMemoryWithPromptClarification(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return PromptClarificationWorkflow.layer.pipe(
    Layer.provide(RequestDecisionEngine.layer),
    Layer.provide(SemanticParser.layerDeterministic),
    Layer.provideMerge(layerInMemoryWithActiveEnvironment(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithCorrection(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return CorrectionWorkflow.layer.pipe(
    Layer.provideMerge(layerInMemoryWithPromptClarification(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithCorrectionDiagnosis(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return CorrectionDiagnosisWorkflow.layer.pipe(
    Layer.provideMerge(layerInMemoryWithCorrection(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithPatchPublication(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return SemanticPatchPublicationWorkflow.layer.pipe(
    Layer.provideMerge(layerInMemoryWithCorrectionDiagnosis(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithDocumentSemanticLint(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return DocumentSemanticLintWorkflow.layer.pipe(
    Layer.provide(SemanticLintService.layerDeterministic),
    Layer.provide(SemanticParser.layerDeterministic),
    Layer.provideMerge(layerInMemoryWithActiveEnvironment(basePackageId, kernelIdentity)),
  )
}
