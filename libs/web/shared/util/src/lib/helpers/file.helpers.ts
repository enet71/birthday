export function downloadBlob(blob: Blob, fileName: string): void {
  const link: HTMLAnchorElement = document.createElement('a');
  link.setAttribute('href', window.URL.createObjectURL(blob));
  link.setAttribute('style', 'display: none');
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
