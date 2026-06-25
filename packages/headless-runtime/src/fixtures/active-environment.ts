export const baseDefinition = '将已支付金额返还给用户'
export const domainDefinition = '退款域内指向支付订单的原路返还流程'

function glossaryFixture(
  inputIdSuffix: string,
  vocabularyKind: 'base' | 'domain',
  namespace: string,
  term: string,
  definition: string,
) {
  const content = `${term}：${definition}`
  return {
    id: `vocabulary-input:${inputIdSuffix}`,
    inputKind: 'vocabulary',
    content,
    vocabularyKind,
    namespace,
    spans: [
      {
        id: `source-span:${inputIdSuffix}:entry`,
        startOffset: 0,
        endOffset: content.length,
        text: content,
      },
      {
        id: `source-span:${inputIdSuffix}:term`,
        startOffset: 0,
        endOffset: term.length,
        text: term,
      },
      {
        id: `source-span:${inputIdSuffix}:definition`,
        startOffset: term.length + 1,
        endOffset: content.length,
        text: definition,
      },
    ],
  }
}

export const baseGlossaryFixture = glossaryFixture(
  'base-refund',
  'base',
  'base.refund',
  '退款',
  baseDefinition,
)

export const domainGlossaryFixture = glossaryFixture(
  'domain-refund-ops',
  'domain',
  'domain.refund-ops',
  '退款',
  domainDefinition,
)

export const localContextFixture = {
  id: 'local-context:refund-case',
  contextKind: 'case-local',
  description: 'Same refund case fixture used to compare disabled and enabled domain semantics.',
  evidenceRefs: [],
}
