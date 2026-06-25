const promptText = 'check this document; do not edit it'
const targetDocumentRef = 'semantic-input:patch-publication-target-document'
export const originalDomainDefinition = 'Domain package controls refund review semantics'

export const baseGlossaryFixture = {
  id: 'vocabulary-input:base-patch-publication',
  inputKind: 'vocabulary',
  content: 'document：content supplied as the patch publication target',
  vocabularyKind: 'base',
  namespace: 'base.patch-publication',
  spans: [
    {
      id: 'source-span:base-patch-publication:entry',
      startOffset: 0,
      endOffset: 56,
      text: 'document：content supplied as the patch publication target',
    },
    {
      id: 'source-span:base-patch-publication:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-patch-publication:definition',
      startOffset: 9,
      endOffset: 56,
      text: 'content supplied as the patch publication target',
    },
  ],
}

export const domainGlossaryFixture = {
  id: 'vocabulary-input:domain-patch-publication',
  inputKind: 'vocabulary',
  content: `RefundReviewRule：${originalDomainDefinition}`,
  vocabularyKind: 'domain',
  namespace: 'domain.patch-publication',
  spans: [
    {
      id: 'source-span:domain-patch-publication:entry',
      startOffset: 0,
      endOffset: 62,
      text: `RefundReviewRule：${originalDomainDefinition}`,
    },
    {
      id: 'source-span:domain-patch-publication:term',
      startOffset: 0,
      endOffset: 16,
      text: 'RefundReviewRule',
    },
    {
      id: 'source-span:domain-patch-publication:definition',
      startOffset: 17,
      endOffset: 62,
      text: originalDomainDefinition,
    },
  ],
}

export const localContextFixture = {
  id: 'local-context:patch-publication',
  contextKind: 'case-local',
  description: 'Patch publication fixture that promotes a domain candidate after regression.',
  evidenceRefs: [],
}

export const promptFixture = {
  id: 'semantic-input:prompt-patch-publication',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-patch-publication:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
    },
    {
      id: 'source-span:prompt-patch-publication:action',
      startOffset: 0,
      endOffset: 5,
      text: 'check',
    },
    {
      id: 'source-span:prompt-patch-publication:target',
      startOffset: 6,
      endOffset: 19,
      text: 'this document',
    },
    {
      id: 'source-span:prompt-patch-publication:prohibited-action',
      startOffset: 21,
      endOffset: 35,
      text: 'do not edit it',
    },
  ],
}
