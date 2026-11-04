/* Diashow — Hintergrundmusik mit sanftem Aus- und Einblenden.
 *
 * Wiedergabelisten: eine für die ganze Diashow (settings.music.list) und auf Wunsch je Kapitel
 * (Titelfolie: music = { mode: 'keep' | 'list' | 'off', list: [...] }).
 * Läuft ein Video mit Ton, blendet die Musik ganz aus und hält an; danach blendet sie an derselben
 * Stelle wieder ein. Pause und Schwarzbild blenden ebenfalls aus. Je Liste merkt sich der Spieler
 * Titel und Stelle, damit ein Kapitel beim Zurückspringen dort weiterläuft.
 */
export const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'weba'];
export const AUDIO_CT = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', weba: 'audio/webm' };
export const MUSIC_DEFAULT = { list: [], vol: 0.7, fade: 2 };
export const musicCfg = (S) => ({ ...MUSIC_DEFAULT, ...(S.music || {}), list: S.music?.list || [] });

/** Welche Liste gilt für Dia i? list = Abspielliste [{s, type}], showList = Liste der ganzen Diashow. */
export function musicFor(list, i, showList) {
  for (let j = i; j >= 0; j--) {
    const x = list[j];
    if (x?.type === 'title' && x.s.music && (x.s.music.mode === 'list' || x.s.music.mode === 'off')) {
      return { key: 'c:' + (x.s.id || j), paths: x.s.music.mode === 'off' ? [] : (x.s.music.list || []) };
    }
  }
  return { key: 'show', paths: showList || [] };
}
/** Hat die Diashow überhaupt Musik? */
export function hasMusic(S, slides) {
  return (musicCfg(S).list.length > 0) || slides.some((s) => s.type === 'title' && s.music?.mode === 'list' && s.music.list?.length);
}

export class Music {
  /** urlOf(path) → Promise<url>; onError(path, err); onChange() für Anzeigen. */
  constructor({ urlOf, vol = 0.7, fade = 2, onError, onChange }) {
    this.urlOf = urlOf; this.vol = vol; this.fade = fade; this.onError = onError; this.onChange = onChange;
    this.a = new Audio(); this.a.preload = 'auto'; this.a.volume = 0;
    this.state = new Map();          // key -> { paths, idx, time }
    this.key = null; this.paths = []; this.cur = '';
    this.ducked = false; this.held = false; this.muted = false; this.stopped = false;
    this.timer = null; this.seq = 0; this.fails = 0;
    this.a.addEventListener('ended', () => this.next());
    this.a.addEventListener('error', () => { this.onError?.(this.cur, this.a.error?.message || 'nicht abspielbar'); if (++this.fails < this.paths.length) this.next(); });
    this.a.addEventListener('playing', () => { this.fails = 0; });
  }
  get target() { return this.stopped || this.muted || this.ducked || this.held || !this.paths.length ? 0 : this.vol; }
  get name() { return this.cur ? this.cur.slice(this.cur.lastIndexOf('/') + 1) : ''; }
  get playing() { return !this.a.paused && this.target > 0; }

  _fade(to, sec, done) {
    clearInterval(this.timer);
    const from = this.a.volume; const t0 = performance.now(); const D = Math.max(1, sec * 1000);
    if (to > 0 && this.a.paused && this.a.src) this.a.play().catch(() => {});
    this.timer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / D);
      this.a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(this.timer); this.timer = null; if (to === 0) this.a.pause(); done?.(); }
    }, 40);
  }
  /** Lautstärke an den Zustand anpassen (sanft). */
  apply(sec = this.fade) { this._fade(this.target, sec); this.onChange?.(); }

  async _load(path, time = 0) {
    const my = ++this.seq;
    this.cur = path;
    let url; try { url = await this.urlOf(path); } catch (e) { this.onError?.(path, e?.message || e); return false; }
    if (my !== this.seq) return false;
    this.a.src = url;
    if (time) { try { await new Promise((r) => { this.a.addEventListener('loadedmetadata', r, { once: true }); setTimeout(r, 3000); }); this.a.currentTime = time; } catch { /* von vorn */ } }
    return my === this.seq;
  }
  _save() { if (this.key && this.paths.length) { const st = this.state.get(this.key); if (st) st.time = this.a.currentTime || 0; } }

  /** Liste wechseln (Kapitel). Gleiche Liste → nichts tun. */
  async setList(key, paths) {
    if (key === this.key && JSON.stringify(paths) === JSON.stringify(this.paths)) return;
    this._save();
    const old = this.key; this.key = key; this.paths = paths.slice();
    if (!this.state.has(key)) this.state.set(key, { idx: 0, time: 0 });
    const st = this.state.get(key);
    const swap = async () => {
      if (!this.paths.length) { this.a.pause(); this.cur = ''; this.onChange?.(); return; }
      st.idx = st.idx % this.paths.length;
      if (await this._load(this.paths[st.idx], st.time)) this.apply(this.fade);
    };
    if (old && !this.a.paused && this.a.volume > 0) this._fade(0, Math.min(1.2, this.fade), swap);
    else await swap();
  }
  async next() {
    if (!this.paths.length) return;
    const st = this.state.get(this.key); st.idx = (st.idx + 1) % this.paths.length; st.time = 0;
    if (await this._load(this.paths[st.idx], 0)) { this.a.volume = 0; this.apply(0.6); }
  }
  duck(on) { if (this.ducked === !!on) return; this.ducked = !!on; this.apply(); }
  hold(on) { if (this.held === !!on) return; this.held = !!on; this.apply(); }
  setMuted(on) { this.muted = !!on; this.apply(1); }
  setVolume(v) { this.vol = Math.max(0, Math.min(1, v)); this.apply(0.3); }
  stop(sec = 3) { this.stopped = true; this.apply(sec); }
  resume() { this.stopped = false; this.apply(); }
  dispose() { clearInterval(this.timer); this.seq++; this.a.pause(); this.a.removeAttribute('src'); this.a.load(); }
}
