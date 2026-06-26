import { SemanticKernelIdentity } from '@harmony/semantic-model/schema/package'
import { Schema } from 'effect'

export const deterministicInstant = '2026-06-24T00:00:00.000Z'
export const compilerVersion = 'deterministic-glossary-compiler@0.1.0'
export const publisherVersion = 'deterministic-package-publisher@0.1.0'
export const effectVersion = 'effect@4.0.0-beta.90'
export const activeEnvironmentBuilderVersion = 'deterministic-active-environment-builder@0.1.0'
export const promptParserVersion = 'deterministic-prompt-parser@0.1.0'
export const promptDecisionVersion = 'deterministic-request-decision@0.1.0'
export const documentParserVersion = 'deterministic-document-parser@0.1.0'
export const semanticLintVersion = 'deterministic-semantic-lint@0.1.0'
export const correctionWorkflowVersion = 'deterministic-correction-workflow@0.1.0'
export const semanticPatchPublisherVersion = 'deterministic-semantic-patch-publisher@0.1.0'

export const defaultSemanticKernelIdentity = new SemanticKernelIdentity({
  id: Schema.decodeUnknownSync(SemanticKernelIdentity.fields.id)('semantic-kernel:harmony-v1'),
  protocolVersion: 'semantic-kernel.v1',
  version: 'harmony-semantic-kernel@0.1.0',
})
