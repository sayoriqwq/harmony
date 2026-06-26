export const baseVocabularyNamespace = 'base.agent-runtime'

export const baseVocabularyManifestV1 = {
  schemaVersion: 'structured-vocabulary-manifest.v1',
  manifestVersion: 'v1',
  vocabularyKind: 'base',
  namespace: baseVocabularyNamespace,
  concepts: [
    {
      id: 'base.request_frame',
      canonicalLabel: '请求帧',
      definition: '用户表达中可以驱动系统行为的请求结构，包含动作、目标、约束、证据和未解析项。',
      lexicalSenses: [
        { term: '请求', language: 'zh' },
        { term: '任务', language: 'zh' },
        { term: 'request', language: 'en' },
      ],
    },
    {
      id: 'base.request_frame.none',
      canonicalLabel: '无请求帧',
      definition: '输入没有形成可执行、可验证或需澄清的用户请求时的显式未知状态。',
      lexicalSenses: [
        { term: '无请求', language: 'zh' },
        { term: 'no request frame', language: 'en' },
      ],
    },
    {
      id: 'base.action.inspect',
      canonicalLabel: '查看',
      definition: '观察或读取目标内容，不直接判断是否满足规则，也不改变目标内容。',
      lexicalSenses: [
        { term: '查看', language: 'zh' },
        { term: '看看', language: 'zh' },
        { term: 'inspect', language: 'en' },
        { term: 'view', language: 'en' },
        { term: 'look', language: 'en' },
      ],
    },
    {
      id: 'base.action.validate',
      canonicalLabel: '检查',
      definition: '对目标内容进行验证、审阅或判断，不直接修改目标内容。',
      lexicalSenses: [
        { term: '检查', language: 'zh' },
        { term: '审阅', language: 'zh' },
        { term: '验证', language: 'zh' },
        { term: 'check', language: 'en' },
        { term: 'review', language: 'en' },
        { term: 'validate', language: 'en' },
      ],
    },
    {
      id: 'base.action.rewrite',
      canonicalLabel: '修改',
      definition: '对目标内容进行编辑、改写、替换、修复或改变。',
      lexicalSenses: [
        { term: '修改', language: 'zh' },
        { term: '改写', language: 'zh' },
        { term: '编辑', language: 'zh' },
        { term: 'rewrite', language: 'en' },
        { term: 'edit', language: 'en' },
        { term: 'modify', language: 'en' },
        { term: 'fix', language: 'en' },
        { term: 'improve', language: 'en' },
      ],
    },
    {
      id: 'base.action.create',
      canonicalLabel: '创建',
      definition: '生成新的目标内容、记录、文件或结构。',
      lexicalSenses: [
        { term: '创建', language: 'zh' },
        { term: '新建', language: 'zh' },
        { term: 'create', language: 'en' },
        { term: 'add', language: 'en' },
      ],
    },
    {
      id: 'base.action.delete',
      canonicalLabel: '删除',
      definition: '移除、丢弃或破坏已有目标内容、记录、文件或结构。',
      lexicalSenses: [
        { term: '删除', language: 'zh' },
        { term: '移除', language: 'zh' },
        { term: 'delete', language: 'en' },
        { term: 'remove', language: 'en' },
      ],
    },
    {
      id: 'base.action.execute',
      canonicalLabel: '执行',
      definition: '运行命令、工具、程序或外部操作。',
      lexicalSenses: [
        { term: '执行', language: 'zh' },
        { term: '运行', language: 'zh' },
        { term: 'execute', language: 'en' },
        { term: 'run', language: 'en' },
      ],
    },
    {
      id: 'base.constraint.prohibit',
      canonicalLabel: '禁止',
      definition: '用户明确要求不要执行某类动作或不要改变某个目标。',
      lexicalSenses: [
        { term: '不要', language: 'zh' },
        { term: '禁止', language: 'zh' },
        { term: '别', language: 'zh' },
        { term: 'do not', language: 'en' },
        { term: 'don\'t', language: 'en' },
        { term: 'prohibit', language: 'en' },
      ],
    },
    {
      id: 'base.constraint.allow',
      canonicalLabel: '允许',
      definition: '用户明确允许某类动作、范围或例外。',
      lexicalSenses: [
        { term: '允许', language: 'zh' },
        { term: '可以', language: 'zh' },
        { term: 'allow', language: 'en' },
      ],
    },
    {
      id: 'base.constraint.require',
      canonicalLabel: '要求',
      definition: '用户明确要求系统必须满足某个条件、动作或结果。',
      lexicalSenses: [
        { term: '要求', language: 'zh' },
        { term: '必须', language: 'zh' },
        { term: '需要', language: 'zh' },
        { term: 'require', language: 'en' },
        { term: 'must', language: 'en' },
      ],
    },
    {
      id: 'base.constraint.scope',
      canonicalLabel: '范围',
      definition: '语义断言、动作或约束适用的边界。',
      lexicalSenses: [
        { term: '范围', language: 'zh' },
        { term: '作用域', language: 'zh' },
        { term: 'scope', language: 'en' },
      ],
    },
    {
      id: 'base.evidence.source_text',
      canonicalLabel: '原文证据',
      definition: '用户、文档或词库中保留的原始文本证据。',
      lexicalSenses: [
        { term: '原文', language: 'zh' },
        { term: 'source text', language: 'en' },
      ],
    },
    {
      id: 'base.evidence.span',
      canonicalLabel: '证据片段',
      definition: '原文中支撑某个语义解释的连续文本片段。',
      lexicalSenses: [
        { term: '片段', language: 'zh' },
        { term: 'span', language: 'en' },
      ],
    },
    {
      id: 'base.evidence.offset',
      canonicalLabel: '证据偏移',
      definition: '证据片段在原文中的开始与结束位置。',
      lexicalSenses: [
        { term: '偏移', language: 'zh' },
        { term: 'offset', language: 'en' },
      ],
    },
    {
      id: 'base.effect.pure',
      canonicalLabel: '纯效果',
      definition: '不读取或改变外部事实源的计算效果。',
      lexicalSenses: [
        { term: '纯效果', language: 'zh' },
        { term: 'pure', language: 'en' },
      ],
    },
    {
      id: 'base.effect.readonly',
      canonicalLabel: '只读效果',
      definition: '读取或观察目标，但不改变目标内容或外部事实源。',
      lexicalSenses: [
        { term: '只读', language: 'zh' },
        { term: 'readonly', language: 'en' },
        { term: 'read-only', language: 'en' },
      ],
    },
    {
      id: 'base.effect.mutating',
      canonicalLabel: '修改效果',
      definition: '会改变目标内容、状态或外部事实源的效果。',
      lexicalSenses: [
        { term: '修改效果', language: 'zh' },
        { term: 'mutating', language: 'en' },
      ],
    },
    {
      id: 'base.effect.destructive',
      canonicalLabel: '破坏性效果',
      definition: '会删除、覆盖、丢失或不可逆改变目标内容的效果。',
      lexicalSenses: [
        { term: '破坏性', language: 'zh' },
        { term: 'destructive', language: 'en' },
      ],
    },
    {
      id: 'base.effect.external',
      canonicalLabel: '外部效果',
      definition: '会触达工具、进程、网络、文件系统或其他外部系统的效果。',
      lexicalSenses: [
        { term: '外部效果', language: 'zh' },
        { term: 'external', language: 'en' },
      ],
    },
    {
      id: 'base.risk.requires_confirmation',
      canonicalLabel: '需要确认',
      definition: '执行前需要明确用户授权或更高权限确认的风险标记。',
      lexicalSenses: [
        { term: '需要确认', language: 'zh' },
        { term: 'requires confirmation', language: 'en' },
      ],
    },
  ],
  relations: [
    {
      subject: 'base.action.inspect',
      predicate: 'has_trait',
      object: 'base.effect.readonly',
      rationale: '查看只读取或观察目标内容。',
    },
    {
      subject: 'base.action.validate',
      predicate: 'has_trait',
      object: 'base.effect.readonly',
      rationale: '检查和验证不直接改变目标内容。',
    },
    {
      subject: 'base.action.rewrite',
      predicate: 'has_trait',
      object: 'base.effect.mutating',
      rationale: '修改、改写和编辑会改变目标内容。',
    },
    {
      subject: 'base.action.create',
      predicate: 'has_trait',
      object: 'base.effect.mutating',
      rationale: '创建会产生新的内容或状态。',
    },
    {
      subject: 'base.action.delete',
      predicate: 'has_trait',
      object: 'base.effect.mutating',
      rationale: '删除会改变已有内容或状态。',
    },
    {
      subject: 'base.action.delete',
      predicate: 'has_trait',
      object: 'base.effect.destructive',
      rationale: '删除可能导致内容丢失。',
    },
    {
      subject: 'base.action.delete',
      predicate: 'has_risk',
      object: 'base.risk.requires_confirmation',
      rationale: '破坏性删除通常需要明确确认。',
    },
    {
      subject: 'base.action.execute',
      predicate: 'has_trait',
      object: 'base.effect.external',
      rationale: '执行会运行工具、命令或外部操作。',
    },
    {
      subject: 'base.action.execute',
      predicate: 'has_risk',
      object: 'base.risk.requires_confirmation',
      rationale: '外部执行通常需要明确授权。',
    },
  ],
}
