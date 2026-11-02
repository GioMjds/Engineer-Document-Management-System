/**
 * Utility for reliable browser file downloads.
 * Converts URLs (including cross-origin signed URLs) to same-origin blobs
 * so the HTML5 `download` attribute is always respected without navigating away.
 */

export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Keep object URL alive for 60 seconds to allow Chromium to start download
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60000);
}

export async function downloadFileFromUrl(
  url: string,
  fileName: string,
): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Download request failed with status ${res.status}`);
    }
    const blob = await res.blob();
    downloadBlob(blob, fileName);
  } catch {
    // Fallback: open URL in a detached blank context with download intent
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
