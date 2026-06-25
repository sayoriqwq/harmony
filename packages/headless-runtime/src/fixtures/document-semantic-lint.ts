export const baseGlossaryFixture = {
  id: 'vocabulary-input:base-document-lint',
  inputKind: 'vocabulary',
  content: 'document：content supplied for semantic lint',
  vocabularyKind: 'base',
  namespace: 'base.document-lint',
  spans: [
    {
      id: 'source-span:base-document-lint:entry',
      startOffset: 0,
      endOffset: 39,
      text: 'document：content supplied for semantic lint',
    },
    {
      id: 'source-span:base-document-lint:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-document-lint:definition',
      startOffset: 9,
      endOffset: 39,
      text: 'content supplied for semantic lint',
    },
  ],
}

export const domainGlossaryFixture = {
  id: 'vocabulary-input:domain-refund-lint',
  inputKind: 'vocabulary',
  content: 'PriorPaymentRequired：Complete refund sections must mention prior payment evidence',
  vocabularyKind: 'domain',
  namespace: 'domain.refund-lint',
  spans: [
    {
      id: 'source-span:domain-refund-lint:entry',
      startOffset: 0,
      endOffset: 76,
      text: 'PriorPaymentRequired：Complete refund sections must mention prior payment evidence',
    },
    {
      id: 'source-span:domain-refund-lint:term',
      startOffset: 0,
      endOffset: 20,
      text: 'PriorPaymentRequired',
    },
    {
      id: 'source-span:domain-refund-lint:definition',
      startOffset: 21,
      endOffset: 76,
      text: 'Complete refund sections must mention prior payment evidence',
    },
  ],
}

export const localContextFixture = {
  id: 'local-context:document-semantic-lint',
  contextKind: 'case-local',
  description: 'Document Semantic Lint classification fixture.',
  evidenceRefs: [],
}

const documentSections = [
  {
    id: 'document-section:refund-lint:supported',
    title: 'Supported section',
    content: 'Refund section includes prior payment record.',
    declaredCompleteness: 'unspecified',
    spans: [
      {
        id: 'source-span:refund-lint:supported:full',
        startOffset: 0,
        endOffset: 45,
        text: 'Refund section includes prior payment record.',
      },
      {
        id: 'source-span:refund-lint:supported:prior-payment',
        startOffset: 24,
        endOffset: 44,
        text: 'prior payment record',
      },
    ],
  },
  {
    id: 'document-section:refund-lint:violated',
    title: 'Violated section',
    content: 'Refund section lists amount and recipient.',
    declaredCompleteness: 'unspecified',
    spans: [
      {
        id: 'source-span:refund-lint:violated:full',
        startOffset: 46,
        endOffset: 86,
        text: 'Refund section lists amount and recipient.',
      },
    ],
  },
  {
    id: 'document-section:refund-lint:unknown',
    title: 'Partial section',
    content: 'Refund section lists recipient.',
    declaredCompleteness: 'partial',
    spans: [
      {
        id: 'source-span:refund-lint:unknown:full',
        startOffset: 87,
        endOffset: 118,
        text: 'Refund section lists recipient.',
      },
    ],
  },
  {
    id: 'document-section:refund-lint:conflicted',
    title: 'Conflicted section',
    content: 'Refund section includes prior payment record but also says no prior payment.',
    declaredCompleteness: 'complete',
    spans: [
      {
        id: 'source-span:refund-lint:conflicted:full',
        startOffset: 119,
        endOffset: 191,
        text: 'Refund section includes prior payment record but also says no prior payment.',
      },
      {
        id: 'source-span:refund-lint:conflicted:prior-payment',
        startOffset: 143,
        endOffset: 163,
        text: 'prior payment record',
      },
      {
        id: 'source-span:refund-lint:conflicted:negation',
        startOffset: 178,
        endOffset: 194,
        text: 'no prior payment',
      },
    ],
  },
  {
    id: 'document-section:refund-lint:parse-uncertain',
    title: 'Uncertain section',
    content: 'Refund section says receipt may prove payment.',
    declaredCompleteness: 'complete',
    spans: [
      {
        id: 'source-span:refund-lint:parse-uncertain:full',
        startOffset: 195,
        endOffset: 239,
        text: 'Refund section says receipt may prove payment.',
      },
      {
        id: 'source-span:refund-lint:parse-uncertain:alias',
        startOffset: 215,
        endOffset: 240,
        text: 'receipt may prove payment',
      },
    ],
  },
]

export const documentFixture = {
  id: 'semantic-input:refund-lint-document',
  inputKind: 'document',
  content: documentSections.map(section => section.content).join('\n\n'),
  declaredCompleteness: 'complete',
  sections: documentSections,
  spans: documentSections.flatMap(section => section.spans),
}

export const malformedDocumentFixture = {
  ...documentFixture,
  sections: [
    {
      ...documentSections[0],
      declaredCompleteness: 'closed',
    },
  ],
}
