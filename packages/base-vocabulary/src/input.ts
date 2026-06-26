import { SourceSpan, VocabularyInput } from '@harmony/semantic-model/schema/input'
import { Schema } from 'effect'
import { baseVocabularyManifestV1, baseVocabularyNamespace } from './manifest.ts'

export const baseVocabularyContentV1 = JSON.stringify(baseVocabularyManifestV1, null, 2)

export const baseVocabularyMcpSourceV1 = {
  namespace: baseVocabularyNamespace,
  vocabulary_kind: 'base',
  content: baseVocabularyContentV1,
} as const

export const baseVocabularyInputV1 = new VocabularyInput({
  id: Schema.decodeUnknownSync(VocabularyInput.fields.id)(`vocabulary-input:${baseVocabularyNamespace}:v1`),
  inputKind: 'vocabulary',
  content: baseVocabularyContentV1,
  vocabularyKind: 'base',
  namespace: Schema.decodeUnknownSync(VocabularyInput.fields.namespace)(baseVocabularyNamespace),
  spans: [
    new SourceSpan({
      id: Schema.decodeUnknownSync(SourceSpan.fields.id)(`source-span:${baseVocabularyNamespace}:manifest-v1`),
      startOffset: 0,
      endOffset: baseVocabularyContentV1.length,
      text: baseVocabularyContentV1,
    }),
  ],
})
