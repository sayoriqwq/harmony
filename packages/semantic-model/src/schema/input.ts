import { Schema } from 'effect'
import { CaseId, CorrectionId, DocumentSectionId, EvidenceSourceId, Namespace, SemanticInputId, SemanticIrId, SourceSpanId, VocabularyInputId } from './ids.ts'
import { DeclaredCompleteness, PromptRole, VocabularyKind } from './literals.ts'

export class SourceSpan extends Schema.Class<SourceSpan>('harmony.semantic-model/SourceSpan')({
  id: SourceSpanId,
  startOffset: Schema.Number,
  endOffset: Schema.Number,
  text: Schema.NonEmptyString,
}) {}

export class DocumentSection extends Schema.Class<DocumentSection>('harmony.semantic-model/DocumentSection')({
  id: DocumentSectionId,
  title: Schema.NonEmptyString,
  content: Schema.NonEmptyString,
  declaredCompleteness: DeclaredCompleteness,
  spans: Schema.Array(SourceSpan),
}) {}

export class VocabularyInput extends Schema.Class<VocabularyInput>('harmony.semantic-model/VocabularyInput')({
  id: VocabularyInputId,
  inputKind: Schema.Literal('vocabulary'),
  content: Schema.NonEmptyString,
  vocabularyKind: VocabularyKind,
  namespace: Namespace,
  spans: Schema.Array(SourceSpan),
}) {}

export class PromptInput extends Schema.Class<PromptInput>('harmony.semantic-model/PromptInput')({
  id: SemanticInputId,
  inputKind: Schema.Literal('prompt'),
  content: Schema.NonEmptyString,
  promptRole: PromptRole,
  targetRefs: Schema.Array(SemanticInputId),
  spans: Schema.Array(SourceSpan),
}) {}

export class DocumentInput extends Schema.Class<DocumentInput>('harmony.semantic-model/DocumentInput')({
  id: SemanticInputId,
  inputKind: Schema.Literal('document'),
  content: Schema.NonEmptyString,
  declaredCompleteness: DeclaredCompleteness,
  sections: Schema.Array(DocumentSection),
  spans: Schema.Array(SourceSpan),
}) {}

export const SemanticInput = Schema.Union([PromptInput, DocumentInput, VocabularyInput])
export type SemanticInputType = typeof SemanticInput.Type

export class EvidenceRef extends Schema.Class<EvidenceRef>('harmony.semantic-model/EvidenceRef')({
  sourceId: EvidenceSourceId,
  spanId: SourceSpanId,
}) {}

export class EvidenceSource extends Schema.Class<EvidenceSource>('harmony.semantic-model/EvidenceSource')({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('vocabulary-source'),
  inputRef: VocabularyInputId,
  originalText: Schema.NonEmptyString,
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class PromptEvidenceSource extends Schema.Class<PromptEvidenceSource>(
  'harmony.semantic-model/PromptEvidenceSource',
)({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('prompt-source'),
  inputRef: SemanticInputId,
  originalText: Schema.NonEmptyString,
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class DocumentEvidenceSource extends Schema.Class<DocumentEvidenceSource>(
  'harmony.semantic-model/DocumentEvidenceSource',
)({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('document-source'),
  inputRef: SemanticInputId,
  originalText: Schema.NonEmptyString,
  sections: Schema.Array(DocumentSection),
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class CorrectionEvidenceSource extends Schema.Class<CorrectionEvidenceSource>(
  'harmony.semantic-model/CorrectionEvidenceSource',
)({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('correction-source'),
  caseRef: CaseId,
  correctionRef: CorrectionId,
  originalText: Schema.NonEmptyString,
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class Correction extends Schema.Class<Correction>('harmony.semantic-model/Correction')({
  id: CorrectionId,
  artifactKind: Schema.Literal('correction'),
  caseId: CaseId,
  targetIrRef: SemanticIrId,
  evidenceSourceId: EvidenceSourceId,
  userText: Schema.NonEmptyString,
  capturedAt: Schema.NonEmptyString,
}) {}
