const promptText = 'check this document; do not edit it'
const targetDocumentRef = 'semantic-input:diagnosis-target-document'

export const baseGlossaryFixture = {
  id: 'vocabulary-input:base-correction-diagnosis',
  inputKind: 'vocabulary',
  content: 'document：content supplied as the correction diagnosis target',
  vocabularyKind: 'base',
  namespace: 'base.correction-diagnosis',
  spans: [
    {
      id: 'source-span:base-correction-diagnosis:entry',
      startOffset: 0,
      endOffset: 58,
      text: 'document：content supplied as the correction diagnosis target',
    },
    {
      id: 'source-span:base-correction-diagnosis:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-correction-diagnosis:definition',
      startOffset: 9,
      endOffset: 58,
      text: 'content supplied as the correction diagnosis target',
    },
  ],
}

export const domainGlossaryFixture = {
  id: 'vocabulary-input:domain-correction-diagnosis',
  inputKind: 'vocabulary',
  content: 'RefundReviewRule：Domain package controls refund review semantics',
  vocabularyKind: 'domain',
  namespace: 'domain.correction-diagnosis',
  spans: [
    {
      id: 'source-span:domain-correction-diagnosis:entry',
      startOffset: 0,
      endOffset: 62,
      text: 'RefundReviewRule：Domain package controls refund review semantics',
    },
    {
      id: 'source-span:domain-correction-diagnosis:term',
      startOffset: 0,
      endOffset: 16,
      text: 'RefundReviewRule',
    },
    {
      id: 'source-span:domain-correction-diagnosis:definition',
      startOffset: 17,
      endOffset: 62,
      text: 'Domain package controls refund review semantics',
    },
  ],
}

export const localContextFixture = {
  id: 'local-context:correction-diagnosis',
  contextKind: 'case-local',
  description: 'Correction Diagnosis fixture that gates patch candidate proposal.',
  evidenceRefs: [],
}

export const promptFixture = {
  id: 'semantic-input:prompt-correction-diagnosis',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-correction-diagnosis:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
    },
    {
      id: 'source-span:prompt-correction-diagnosis:action',
      startOffset: 0,
      endOffset: 5,
      text: 'check',
    },
    {
      id: 'source-span:prompt-correction-diagnosis:target',
      startOffset: 6,
      endOffset: 19,
      text: 'this document',
    },
    {
      id: 'source-span:prompt-correction-diagnosis:prohibited-action',
      startOffset: 21,
      endOffset: 35,
      text: 'do not edit it',
    },
  ],
}
