/* Diashow — die eine Stelle, an der die Version steht.
 * Beim Release: APP.version/date hier, Eintrag in CHANGELOG.md (der Cache-Name im
 * Service Worker leitet sich von APP.cache ab).
 */
export const APP = {
  name: 'Diashow',
  version: '1.9.0',
  date: '2026-11-05',
  cache: 'diashow-v1.9.0',
  api: 'https://diashow-api.balthasar.workers.dev',   // Worker für geteilte Diashows (Phase 2)
  repo: 'https://github.com/bwicki/diashow',
};
