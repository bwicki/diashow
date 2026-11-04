/* Diashow — die eine Stelle, an der die Version steht.
 * Beim Release: APP.version/date hier, Eintrag in CHANGELOG.md (der Cache-Name im
 * Service Worker leitet sich von APP.cache ab).
 */
export const APP = {
  name: 'Diashow',
  version: '1.8.1',
  date: '2026-11-04',
  cache: 'diashow-v1.8.1',
  api: 'https://diashow-api.balthasar.workers.dev',   // Worker für geteilte Diashows (Phase 2)
  repo: 'https://github.com/bwicki/diashow',
};
