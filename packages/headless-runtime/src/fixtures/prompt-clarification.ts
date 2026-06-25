export const promptText = 'check this document; do not edit it'
const targetDocumentRef = 'semantic-input:document-under-review'

export const baseGlossaryFixture = {
  id: 'vocabulary-input:base-review',
  inputKind: 'vocabulary',
  content: 'document：content supplied as the request target',
  vocabularyKind: 'base',
  namespace: 'base.review',
  spans: [
    {
      id: 'source-span:base-review:entry',
      startOffset: 0,
      endOffset: 47,
      text: 'document：content supplied as the request target',
    },
    {
      id: 'source-span:base-review:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-review:definition',
      startOffset: 9,
      endOffset: 47,
      text: 'content supplied as the request target',
    },
  ],
}

export const localContextFixture = {
  id: 'local-context:prompt-clarification',
  contextKind: 'case-local',
  description: 'Prompt action ambiguity fixture.',
  evidenceRefs: [],
}

export const promptFixture = {
  id: 'semantic-input:prompt-check-document',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-check-document:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
    },
    {
      id: 'source-span:prompt-check-document:action',
      startOffset: 0,
      endOffset: 5,
      text: 'check',
    },
    {
      id: 'source-span:prompt-check-document:target',
      startOffset: 6,
      endOffset: 19,
      text: 'this document',
    },
    {
      id: 'source-span:prompt-check-document:prohibited-action',
      startOffset: 21,
      endOffset: 35,
      text: 'do not edit it',
    },
  ],
}

export const promptWithDocumentOnlyField = {
  ...promptFixture,
  declaredCompleteness: 'complete',
}
