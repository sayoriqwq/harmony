import { Schema } from 'effect'
import { Namespace } from './ids.ts'
import { VocabularyKind } from './literals.ts'

export class VocabularyManifestLexicalSense extends Schema.Class<VocabularyManifestLexicalSense>(
  'harmony.semantic-model/VocabularyManifestLexicalSense',
)({
  term: Schema.NonEmptyString,
  language: Schema.NonEmptyString,
}) {}

export class VocabularyManifestConcept extends Schema.Class<VocabularyManifestConcept>(
  'harmony.semantic-model/VocabularyManifestConcept',
)({
  id: Namespace,
  canonicalLabel: Schema.NonEmptyString,
  definition: Schema.NonEmptyString,
  lexicalSenses: Schema.NonEmptyArray(VocabularyManifestLexicalSense),
}) {}

export class VocabularyManifestRelation extends Schema.Class<VocabularyManifestRelation>(
  'harmony.semantic-model/VocabularyManifestRelation',
)({
  subject: Namespace,
  predicate: Schema.NonEmptyString,
  object: Namespace,
  rationale: Schema.NonEmptyString,
}) {}

export class StructuredVocabularyManifest extends Schema.Class<StructuredVocabularyManifest>(
  'harmony.semantic-model/StructuredVocabularyManifest',
)({
  schemaVersion: Schema.Literal('structured-vocabulary-manifest.v1'),
  manifestVersion: Schema.NonEmptyString,
  vocabularyKind: VocabularyKind,
  namespace: Namespace,
  concepts: Schema.NonEmptyArray(VocabularyManifestConcept),
  relations: Schema.Array(VocabularyManifestRelation),
}) {}

export type StructuredVocabularyManifestType = typeof StructuredVocabularyManifest.Type
