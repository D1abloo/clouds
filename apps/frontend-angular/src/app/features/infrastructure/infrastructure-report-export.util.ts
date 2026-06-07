export const slugifyFilename = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const downloadTextFile = (content: string, filename: string, mime = 'text/plain;charset=utf-8'): void => {
  triggerBlobDownload(new Blob([content], { type: mime }), filename)
}

export const downloadJsonFile = (data: unknown, filename: string): void => {
  downloadTextFile(JSON.stringify(data, null, 2), filename, 'application/json;charset=utf-8')
}

export const csvEscape = (value: string | number): string => {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}
