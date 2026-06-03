export const invNum = (data: Record<string, unknown> | null | undefined, key: string): number => {
  const v = data?.[key]
  return typeof v === 'number' ? v : 0
}
