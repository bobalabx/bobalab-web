/**
 * Unsaved uploads in the editor live preview (src/app/editor-preview): the
 * content manager posts its draft images as data URLs keyed by their public
 * path ("/uploads/x.jpg" → "data:image/jpeg;base64,…"), and <Img> draws the data
 * URL instead of the deployed file. Empty on the public site: nothing ever
 * calls setAssetOverrides() there.
 */

let overrides: Record<string, string> = {};

/** Replace the whole map (the preview re-renders afterwards). */
export function setAssetOverrides(map: Record<string, string>): void {
  overrides = { ...map };
}

/** The data URL for a public path, when the editor has an unsaved upload there. */
export function assetOverride(src: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(overrides, src) ? overrides[src] : undefined;
}
