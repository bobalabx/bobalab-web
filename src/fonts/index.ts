import localFont from "next/font/local";

/**
 * Self-hosted type (DECISIONS D-13 item 3): one family, Archivo, as one variable
 * file with both axes (wdth 62–125 × wght 100–900, latin subset).
 * Preloaded total: 90,104 B = 88.0 KiB (budget ≤ 100 KiB). A unit test re-checks it.
 *  - normal width (wdth 100) for text, nav, meta and h2/h3;
 *  - condensed (wdth 68, wght 700) for the h1, figure lane labels and year headings;
 *  - DOI and BibTeX use the system ui-monospace stack (no mono webfont).
 * Licence: SIL OFL-1.1, see ./OFL.txt.
 */
export const archivo = localFont({
  src: "./archivo-latin-wdth-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-archivo",
  adjustFontFallback: "Arial",
  fallback: ["Arial", "Helvetica", "sans-serif"],
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const fontVariables = archivo.variable;
