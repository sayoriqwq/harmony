import { PatchPublicationExpectedOutcome } from '@harmony/semantic-model/schema/literals'
import { Schema } from 'effect'

export class VocabularyCompileError extends Schema.TaggedErrorClass<VocabularyCompileError>()(
  'VocabularyCompileError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class PromptParseError extends Schema.TaggedErrorClass<PromptParseError>()(
  'PromptParseError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class DocumentParseError extends Schema.TaggedErrorClass<DocumentParseError>()(
  'DocumentParseError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class RequestDecisionUnsupported extends Schema.TaggedErrorClass<RequestDecisionUnsupported>()(
  'RequestDecisionUnsupported',
  {
    irId: Schema.String,
    message: Schema.String,
  },
) {}

export class SemanticLintUnsupported extends Schema.TaggedErrorClass<SemanticLintUnsupported>()(
  'SemanticLintUnsupported',
  {
    irId: Schema.String,
    message: Schema.String,
  },
) {}

export class CaseSemanticEditApplicationError extends Schema.TaggedErrorClass<CaseSemanticEditApplicationError>()(
  'CaseSemanticEditApplicationError',
  {
    caseId: Schema.String,
    editKind: Schema.String,
    message: Schema.String,
  },
) {}

export class CorrectionDiagnosisError extends Schema.TaggedErrorClass<CorrectionDiagnosisError>()(
  'CorrectionDiagnosisError',
  {
    caseId: Schema.String,
    message: Schema.String,
  },
) {}

export class PatchPublicationBlocked extends Schema.TaggedErrorClass<PatchPublicationBlocked>()(
  'PatchPublicationBlocked',
  {
    candidateId: Schema.String,
    expectedOutcome: PatchPublicationExpectedOutcome,
    message: Schema.String,
  },
) {}
