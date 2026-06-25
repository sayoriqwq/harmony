export const refundText = '退款：将已支付金额返还给用户'
const chargebackText = '拒付：持卡人发起的支付争议'

export const glossaryFixture = {
  id: 'vocabulary-input:refund-glossary',
  inputKind: 'vocabulary',
  content: refundText,
  vocabularyKind: 'base',
  namespace: 'base.refund',
  spans: [
    {
      id: 'source-span:refund-entry',
      startOffset: 0,
      endOffset: 14,
      text: refundText,
    },
    {
      id: 'source-span:refund-term',
      startOffset: 0,
      endOffset: 2,
      text: '退款',
    },
    {
      id: 'source-span:refund-definition',
      startOffset: 3,
      endOffset: 14,
      text: '将已支付金额返还给用户',
    },
  ],
}

export const otherGlossaryFixture = {
  id: 'vocabulary-input:chargeback-glossary',
  inputKind: 'vocabulary',
  content: chargebackText,
  vocabularyKind: 'domain',
  namespace: 'domain.chargeback',
  spans: [
    {
      id: 'source-span:chargeback-entry',
      startOffset: 0,
      endOffset: 14,
      text: chargebackText,
    },
    {
      id: 'source-span:chargeback-term',
      startOffset: 0,
      endOffset: 2,
      text: '拒付',
    },
    {
      id: 'source-span:chargeback-definition',
      startOffset: 3,
      endOffset: 14,
      text: '持卡人发起的支付争议',
    },
  ],
}

export const malformedFixture = {
  ...glossaryFixture,
  id: '',
  namespace: '',
}
