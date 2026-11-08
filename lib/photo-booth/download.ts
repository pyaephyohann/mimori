/**
 * Saving a print from Mimori to the visitor's own device.
 *
 * The file is the JPEG the canvas renderer just produced from the current
 * settings — never the print stored in the session, which may be an older
 * version of the page. The filename is a friendly constant rather than the
 * Cloudinary id, so a downloaded print is recognisable in a downloads folder.
 */

/** How the browser names the file it saves. */
export const PRINT_FILE_NAME = "mimori-our-little-moments.jpg";

/**
 * Offers a rendered JPEG as a download.
 *
 * A temporary object URL and a synthetic click are the one way to save a Blob
 * from the browser without a server round-trip. The URL is released on a delay,
 * not straight away, because some browsers read it after the click returns.
 */
export function downloadBlob(blob: Blob, fileName = PRINT_FILE_NAME): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
