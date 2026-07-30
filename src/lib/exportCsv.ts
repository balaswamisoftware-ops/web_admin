/**
 * Download an array of rows as a CSV file (opens in Excel / Sheets).
 * `columns` maps a header label to a value accessor.
 */
export function exportCsv<T>(
  filename: string,
  rows: T[],
  columns: { header: string; value: (row: T) => string | number | null | undefined }[],
): void {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const header = columns.map(c => escape(c.header)).join(',')
  const body = rows
    .map(row => columns.map(c => escape(c.value(row))).join(','))
    .join('\n')
  const csv = `${header}\n${body}`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
