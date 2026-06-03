/** Unwrap list payloads: raw array, or { data }, { records }, { items }. */
export const unwrapList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    for (const key of ['data', 'records', 'items', 'results']) {
      if (Array.isArray(obj[key])) return obj[key] as T[]
    }
  }
  return []
}
