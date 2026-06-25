export const promptText = 'check this document; do not edit it'
export const correctionText = 'I meant validate/check, not rewrite; do not edit the document.'
const targetDocumentRef = 'semantic-input:document-under-correction'

export const baseGlossaryFixture = {
  id: 'vocabulary-input:base-correction',
  inputKind: 'vocabulary',
  content: 'document：content supplied as the correction target',
  vocabularyKind: 'base',
  namespace: 'base.correction',
  spans: [
    {
      id: 'source-span:base-correction:entry',
      startOffset: 0,
      endOffset: 48,
      text: 'document：content supplied as the correction target',
    },
    {
      id: 'source-span:base-correction:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-correction:definition',
      startOffset: 9,
      endOffset: 48,
      text: 'content supplied as the correction target',
    },
  ],
}

export const localContextFixture = {
  id: 'local-context:case-correction',
  contextKind: 'case-local',
  description: 'Correction fixture that resolves prompt action ambiguity locally.',
  evidenceRefs: [],
}

export const promptFixture = {
  id: 'semantic-input:prompt-check-correction',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-check-correction:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
    },
    {
      id: 'source-span:prompt-check-correction:action',
      startOffset: 0,
      endOffset: 5,
      text: 'check',
    },
    {
      id: 'source-span:prompt-check-correction:target',
      startOffset: 6,
      endOffset: 19,
      text: 'this document',
    },
    {
      id: 'source-span:prompt-check-correction:prohibited-action',
      startOffset: 21,
      endOffset: 35,
      text: 'do not edit it',
    },
  ],
}
