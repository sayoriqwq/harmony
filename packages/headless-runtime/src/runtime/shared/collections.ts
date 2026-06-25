import type { EvidenceRef } from '@harmony/semantic-model/schema/input'

export function unique<A>(items: ReadonlyArray<A>): Array<A> {
  return Array.from(new Set(items))
}

export function uniqueEvidenceRefs(items: ReadonlyArray<EvidenceRef>): Array<EvidenceRef> {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.sourceId}:${item.spanId}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
