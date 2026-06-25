import type { ActiveSemanticEnvironment } from '@harmony/semantic-model/schema/environment'
import type { SemanticInputIdType as SemanticInputId } from '@harmony/semantic-model/schema/ids'
import type { CorrectionEvidenceSource, DocumentInput, PromptInput, SourceSpan } from '@harmony/semantic-model/schema/input'
import { DocumentEvidenceSource, EvidenceRef, PromptEvidenceSource } from '@harmony/semantic-model/schema/input'
import { DocumentParseResult, PromptParseResult } from '@harmony/semantic-model/schema/results'
import { CompetingInterpretation, ProhibitedAction, RelationAssertion, RequestFrame, RequestTarget, SemanticIr, UnresolvedSpan } from '@harmony/semantic-model/schema/semantic-ir'
import { Context, Effect, Layer, Schema } from 'effect'
import { deterministicInstant, documentParserVersion, promptParserVersion } from './constants.ts'
import { DocumentParseError, PromptParseError } from './errors.ts'
import { uniqueEvidenceRefs } from './shared/collections.ts'

const findPromptSpan = Effect.fn('findPromptSpan')(
  function* (input: PromptInput, text: string, label: string): Effect.fn.Return<SourceSpan, PromptParseError> {
    const exact = input.spans.find(span => span.text === text)
    if (exact !== undefined) {
      return exact
    }
    return yield* new PromptParseError({
      inputId: input.id,
      message: `Deterministic prompt fixture is missing ${label} span "${text}".`,
    })
  },
)

const firstPromptTargetRef = Effect.fn('firstPromptTargetRef')(
  function* (input: PromptInput): Effect.fn.Return<SemanticInputId, PromptParseError> {
    const targetRef = input.targetRefs[0]
    if (targetRef === undefined) {
      return yield* new PromptParseError({
        inputId: input.id,
        message: 'PromptInput must include a target document reference.',
      })
    }
    return targetRef
  },
)

function evidenceRef(source: PromptEvidenceSource | DocumentEvidenceSource | CorrectionEvidenceSource, span: SourceSpan) {
  return new EvidenceRef({
    sourceId: source.id,
    spanId: span.id,
  })
}

const firstSectionSpan = Effect.fn('firstSectionSpan')(
  function* (
    input: DocumentInput,
    section: DocumentInput['sections'][number],
  ): Effect.fn.Return<SourceSpan, DocumentParseError> {
    const span = section.spans[0]
    if (span === undefined) {
      return yield* new DocumentParseError({
        inputId: input.id,
        message: `Document section ${section.id} must carry at least one source span.`,
      })
    }
    return span
  },
)

const findSectionSpan = Effect.fn('findSectionSpan')(
  function* (
    input: DocumentInput,
    section: DocumentInput['sections'][number],
    text: string,
    label: string,
  ): Effect.fn.Return<SourceSpan, DocumentParseError> {
    const exact = section.spans.find(span => span.text === text)
    if (exact !== undefined) {
      return exact
    }
    return yield* new DocumentParseError({
      inputId: input.id,
      message: `Deterministic document fixture is missing ${label} span "${text}".`,
    })
  },
)
export class SemanticParser extends Context.Service<SemanticParser, {
  parsePrompt: (
    input: PromptInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<PromptParseResult, PromptParseError | Schema.SchemaError>
  parseDocument: (
    input: DocumentInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<DocumentParseResult, DocumentParseError | Schema.SchemaError>
}>()('harmony/headless-runtime/SemanticParser') {
  static readonly layerDeterministic = Layer.succeed(
    SemanticParser,
    SemanticParser.of({
      parsePrompt: Effect.fn('SemanticParser.parsePrompt')(function* (input, environment) {
        const actionSpan = yield* findPromptSpan(input, 'check', 'action cue')
        const targetSpan = yield* findPromptSpan(input, 'this document', 'target cue')
        const prohibitedSpan = yield* findPromptSpan(input, 'do not edit it', 'prohibited action cue')
        const targetRef = yield* firstPromptTargetRef(input)
        const evidenceSource = new PromptEvidenceSource({
          id: Schema.decodeUnknownSync(PromptEvidenceSource.fields.id)(
            `evidence-source:${input.id}:${promptParserVersion}`,
          ),
          evidenceKind: 'prompt-source',
          inputRef: input.id,
          originalText: input.content,
          spans: input.spans,
          capturedAt: deterministicInstant,
        })
        const actionEvidence = evidenceRef(evidenceSource, actionSpan)
        const targetEvidence = evidenceRef(evidenceSource, targetSpan)
        const prohibitedEvidence = evidenceRef(evidenceSource, prohibitedSpan)
        const target = new RequestTarget({
          targetKind: 'referenced_document',
          targetRef,
          evidenceRefs: [targetEvidence],
        })
        const prohibitedRewrite = new ProhibitedAction({
          action: 'rewrite',
          evidenceRefs: [prohibitedEvidence],
        })
        const validateFrame = new RequestFrame({
          id: Schema.decodeUnknownSync(RequestFrame.fields.id)(`request-frame:${input.id}:validate`),
          frameKind: 'request',
          action: 'validate',
          target,
          prohibitedActions: [prohibitedRewrite],
          actionEvidenceRefs: [actionEvidence],
          targetEvidenceRefs: [targetEvidence],
          prohibitedActionEvidenceRefs: [prohibitedEvidence],
        })
        const rewriteFrame = new RequestFrame({
          id: Schema.decodeUnknownSync(RequestFrame.fields.id)(`request-frame:${input.id}:rewrite`),
          frameKind: 'request',
          action: 'rewrite',
          target,
          prohibitedActions: [prohibitedRewrite],
          actionEvidenceRefs: [actionEvidence],
          targetEvidenceRefs: [targetEvidence],
          prohibitedActionEvidenceRefs: [prohibitedEvidence],
        })
        const validateInterpretation = new CompetingInterpretation({
          id: Schema.decodeUnknownSync(CompetingInterpretation.fields.id)(
            `competing-interpretation:${input.id}:validate`,
          ),
          interpretationKind: 'request-frame',
          frameId: validateFrame.id,
          action: 'validate',
          behavior: 'review_without_modifying',
          summary: 'Interpret "check" as validate/review the referenced document without modifying it.',
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
        })
        const rewriteInterpretation = new CompetingInterpretation({
          id: Schema.decodeUnknownSync(CompetingInterpretation.fields.id)(
            `competing-interpretation:${input.id}:rewrite`,
          ),
          interpretationKind: 'request-frame',
          frameId: rewriteFrame.id,
          action: 'rewrite',
          behavior: 'modify_target_content',
          summary: 'Interpret "check" as rewrite/modify the referenced document, which conflicts with the prohibition.',
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
        })
        const semanticIr = new SemanticIr({
          id: Schema.decodeUnknownSync(SemanticIr.fields.id)(`semantic-ir:${input.id}:${environment.id}`),
          artifactKind: 'semantic-ir',
          inputKind: 'prompt',
          inputRef: input.id,
          environmentRef: environment.id,
          frameInstances: [validateFrame, rewriteFrame],
          relationAssertions: [],
          competingInterpretations: [validateInterpretation, rewriteInterpretation],
          unresolvedSpans: [],
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
          decisionState: 'requires_clarification',
        })
        const result = new PromptParseResult({
          evidenceSource,
          semanticIr,
        })

        return yield* Schema.decodeUnknownEffect(PromptParseResult)(result)
      }),
      parseDocument: Effect.fn('SemanticParser.parseDocument')(function* (input, environment) {
        const evidenceSource = new DocumentEvidenceSource({
          id: Schema.decodeUnknownSync(DocumentEvidenceSource.fields.id)(
            `evidence-source:${input.id}:${documentParserVersion}`,
          ),
          evidenceKind: 'document-source',
          inputRef: input.id,
          originalText: input.content,
          sections: input.sections,
          spans: input.spans,
          capturedAt: deterministicInstant,
        })
        const relationAssertions: Array<RelationAssertion> = []
        const unresolvedSpans: Array<UnresolvedSpan> = []
        const evidenceRefs: Array<EvidenceRef> = []

        for (const section of input.sections) {
          const sectionSpan = yield* firstSectionSpan(input, section)
          const sectionEvidence = evidenceRef(evidenceSource, sectionSpan)
          evidenceRefs.push(sectionEvidence)

          const hasPositivePriorPayment = section.content.includes('prior payment record')
          const hasNegativePriorPayment = section.content.includes('no prior payment')

          if (hasPositivePriorPayment) {
            const span = yield* findSectionSpan(input, section, 'prior payment record', 'prior payment evidence')
            const assertionEvidence = evidenceRef(evidenceSource, span)
            evidenceRefs.push(assertionEvidence)
            relationAssertions.push(new RelationAssertion({
              id: Schema.decodeUnknownSync(RelationAssertion.fields.id)(
                `relation-assertion:${input.id}:${section.id}:prior-payment-present`,
              ),
              sectionId: section.id,
              subject: 'refund_section',
              predicate: 'mentions_required_evidence',
              object: 'prior_payment',
              assertionStatus: hasNegativePriorPayment ? 'conflicted' : 'extracted',
              evidenceRefs: [assertionEvidence],
            }))
          }

          if (hasNegativePriorPayment) {
            const span = yield* findSectionSpan(input, section, 'no prior payment', 'prior payment negation')
            const assertionEvidence = evidenceRef(evidenceSource, span)
            evidenceRefs.push(assertionEvidence)
            relationAssertions.push(new RelationAssertion({
              id: Schema.decodeUnknownSync(RelationAssertion.fields.id)(
                `relation-assertion:${input.id}:${section.id}:prior-payment-negated`,
              ),
              sectionId: section.id,
              subject: 'refund_section',
              predicate: 'negates_required_evidence',
              object: 'prior_payment',
              assertionStatus: hasPositivePriorPayment ? 'conflicted' : 'extracted',
              evidenceRefs: [assertionEvidence],
            }))
          }

          if (section.content.includes('receipt may prove payment')) {
            const span = yield* findSectionSpan(input, section, 'receipt may prove payment', 'uncertain payment alias')
            const uncertainEvidence = evidenceRef(evidenceSource, span)
            evidenceRefs.push(uncertainEvidence)
            unresolvedSpans.push(new UnresolvedSpan({
              spanId: span.id,
              reason: 'Potential alias for prior payment evidence needs clarification before conformance is judged.',
              evidenceRefs: [uncertainEvidence],
            }))
          }
        }

        const semanticIr = new SemanticIr({
          id: Schema.decodeUnknownSync(SemanticIr.fields.id)(`semantic-ir:${input.id}:${environment.id}`),
          artifactKind: 'semantic-ir',
          inputKind: 'document',
          inputRef: input.id,
          environmentRef: environment.id,
          frameInstances: [],
          relationAssertions,
          competingInterpretations: [],
          unresolvedSpans,
          evidenceRefs: uniqueEvidenceRefs(evidenceRefs),
          decisionState: unresolvedSpans.length === 0 ? 'parsed' : 'parse_uncertain',
        })
        const result = new DocumentParseResult({
          evidenceSource,
          semanticIr,
        })

        return yield* Schema.decodeUnknownEffect(DocumentParseResult)(result)
      }),
    }),
  )
}
