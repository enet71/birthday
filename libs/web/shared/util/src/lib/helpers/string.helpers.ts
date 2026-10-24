export function extractPlainTextFromHtml(html: string): string {
  const doc: Document = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
