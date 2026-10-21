/*
 * Start Decap CMS (WP6). Loaded last by /admin/.
 *
 * cms-data.js sets window.CMS_MANUAL_INIT before decap-cms.js runs, so Decap
 * waits until cms-hooks.js and preview-templates.js have registered. Without
 * this, a slow download of a later script let Decap render its unstyled
 * default preview first (MEASURED 2026-10-20: about 1 load in 10 on the dev server).
 */
(function () {
  "use strict";
  if (window.CMS && typeof window.CMS.init === "function") window.CMS.init();
})();
