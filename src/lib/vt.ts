/**
 * View-transition names and types (brief §E1, §E5). Import these instead of
 * typing strings, so the figure (WP1) and the direction header (WP2) agree.
 * CSS for every class lives in src/styles/motion.css.
 *
 * Rules:
 * - Exactly ONE mounted element per `pearl-{slug}` name at a time.
 * - Decorative pearls (tags, compact clusters) never carry a name.
 */

/** Shared-element name for a direction pearl (figure ↔ direction header ↔ sibling rail). */
export const pearlVtName = (slug: string) => `pearl-${slug}`;

/** `share` class for the pearl morph: <ViewTransition name={pearlVtName(s)} share={VT.morph} default="none"> */
export const VT = {
  morph: "pearl-morph",
  pageSwap: "page-swap",
  bandFade: "band-fade",
  navForward: "nav-forward",
  navBack: "nav-back",
} as const;

/** `transitionTypes` values for <Link>. */
export const TRANSITION = {
  pearlOpen: "pearl-open",
  pearlClose: "pearl-close",
  navForward: "nav-forward",
  navBack: "nav-back",
} as const;
export type TransitionType = (typeof TRANSITION)[keyof typeof TRANSITION];

/**
 * enter/exit maps for a page-level <ViewTransition> (put it in page.tsx, not a layout):
 *   <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
 */
export const PAGE_ENTER_EXIT = {
  [TRANSITION.pearlOpen]: VT.pageSwap,
  [TRANSITION.pearlClose]: VT.pageSwap,
  [TRANSITION.navForward]: VT.navForward,
  [TRANSITION.navBack]: VT.navBack,
  default: "none",
} as const;

/** Header element name kept static during transitions (see SiteHeader). */
export const SITE_HEADER_VT_NAME = "site-header";
