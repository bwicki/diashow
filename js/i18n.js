/* Diashow — Oberflächentexte DE/EN. t('key', {vars}) liefert den Text der
 * aktiven Sprache; fehlt ein Schlüssel, erscheint er selbst (fällt im Test auf).
 */
const KEYS_HELP_DE = 'Klicker/Tastatur: <kbd>→</kbd> <kbd>Bild↓</kbd> weiter · <kbd>←</kbd> <kbd>Bild↑</kbd> zurück · <kbd>Leertaste</kbd> Auto an/aus · <kbd>B</kbd>/<kbd>.</kbd> Schwarzbild · <kbd>Esc</kbd> beenden · Klick auf das Bild = weiter, Rechtsklick = zurück';
const KEYS_HELP_EN = 'Clicker/keyboard: <kbd>→</kbd> <kbd>PgDn</kbd> next · <kbd>←</kbd> <kbd>PgUp</kbd> back · <kbd>Space</kbd> auto on/off · <kbd>B</kbd>/<kbd>.</kbd> black screen · <kbd>Esc</kbd> end · click on the picture = next, right-click = back';

const DE = {
  appName: 'Diashow', eyebrow: 'Ballon · Diashow',
  nav_lib: 'Bilder auswählen', nav_ed: 'Diashow bearbeiten', nav_play: 'Vorführen',
  showLabel: 'Diashow', unnamed: 'Unbenannt', unsaved: 'nicht gespeichert', slidesN: 'Dias',
  new: 'Neu', newTip: 'Neue, leere Diashow beginnen', open: 'Öffnen', save: 'Speichern', saveAs: 'Speichern unter …',
  changeRoot: 'Stammordner ändern …', theme: 'Hell / dunkel', clearCache: 'Vorschau-Zwischenspeicher leeren', cacheCleared: 'Vorschau-Zwischenspeicher geleert.',
  about: 'Über diese App', copy: 'Kopieren', copyAll: 'Alle kopieren', close: 'Schliessen', cancel: 'Abbrechen',
  aboutText: 'Zeigt Bilder, PDF-Seiten und Videos direkt aus den lokalen (Dropbox-)Ordnern als Diashow – ohne Kopien. Gespeichert werden nur kleine Diashow-Dateien mit Verweisen im Ordner <b>_DIASHOWS</b>. Die Bilder verlassen den Rechner nicht.',
  aboutLibs: 'Mitgelieferte Bibliotheken: pdf.js (Apache-2.0), heic2any (MIT), exifr (MIT). © 2026 Balthasar Wicki, Wicki Aero GmbH.',
  // Zugriff
  accessTitle: 'Bilderordner freigeben', accessUnsupported: 'Dieser Browser kann nicht direkt auf lokale Ordner zugreifen. Bitte Google Chrome oder Microsoft Edge (Windows/Mac) verwenden.',
  accessText1: 'Die App liest die Bilder direkt aus deinem Ordner – es wird nichts kopiert oder hochgeladen. Dazu braucht Chrome einmalig deine Erlaubnis für einen Stammordner.',
  accessText2: 'Empfohlen: <b>…\\Dropbox\\01_BALLONFAHREN\\__HB-QWP, QWZ, QWV, QPJ\\02 Pix</b>. Alle Fahrt-Ordner darunter und der Ordner <b>_DIASHOWS</b> für gespeicherte Diashows sind dann erreichbar. Chrome fragt nach «Bearbeiten erlauben» – nötig, damit Diashows gespeichert werden können; Bilder werden nie verändert.',
  accessAgain: 'Chrome fragt nach jedem Neustart einmal nach. Freigegeben ist:', accessAllow: 'Zugriff erlauben', accessOther: 'Anderen Ordner wählen …', accessPick: 'Stammordner wählen …',
  rootSet: 'Stammordner: {n}', rootFail: 'Ordner konnte nicht freigegeben werden:', needRoot: 'Zuerst einen Stammordner freigeben (Schritt 1).', rootFolder: 'Stammordner',
  // Öffnen/Speichern
  discardTitle: 'Ungespeicherte Änderungen', discardText: 'Die aktuelle Diashow hat ungespeicherte Änderungen. Was soll geschehen?', saveFirst: 'Zuerst speichern', discard: 'Verwerfen',
  noShows: 'Noch keine gespeicherten Diashows in {d}.', openTitle: 'Diashow öffnen', notAShow: 'Keine Diashow-Datei.', opened: 'Geöffnet: «{n}» ({k} Dias).', openFail: 'Öffnen fehlgeschlagen:',
  saveTitle: 'Diashow speichern', name: 'Name', namePh: 'z. B. GB26 Vortrag Rotary', saveHint: 'Gespeichert wird nur eine kleine Datei mit Verweisen auf die Originale (keine Bildkopien) in {d}.',
  overwriteTitle: 'Datei existiert', overwriteText: 'Eine Diashow «{n}» gibt es schon. Überschreiben?', overwrite: 'Überschreiben',
  saved: 'Gespeichert: {f}', saveFail: 'Speichern fehlgeschlagen:',
  // Bibliothek
  sort: 'Sortierung', byFolder: 'nach Ordner', byDate: 'nach Aufnahmedatum', show: 'Zeigen', fAll: 'Alles', fImg: 'nur Bilder', fPdf: 'nur PDF', fVideo: 'nur Videos',
  subfolders: 'Unterordner', size: 'Grösse', selectAll: 'Alle hier wählen', reload: 'Ordner neu einlesen',
  loading: 'Lade …', loadingN: 'Lese Ordner … {d} Ordner, {f} Dateien', readingDates: 'Lese Aufnahmedaten … {n} / {k}', listFail: 'Ordner konnte nicht gelesen werden:',
  emptyFolder: 'Keine Bilder, PDFs oder Videos in diesem Ordner.', pickFolder: 'Links einen Fahrt-Ordner wählen. (Im Stammordner selbst werden Unterordner nicht automatisch eingelesen.)', hiddenFiles: '{n} andere Dateien (z. B. ZIP) sind ausgeblendet.',
  select: 'Auswählen', pagesSel: '{n} Seiten gewählt', pagesN: 'Seiten', videoUnplayable: 'Video-Format hier nicht abspielbar', videoUnplayableTip: 'Dieses Video kann Chrome auf diesem Rechner nicht abspielen (meist iPhone-HEVC). Abhilfe: Video als MP4 (H.264) exportieren.',
  noPreview: 'Keine Vorschau', addedN: '{n} Dateien hinzugefügt.', selectedN: '{n} ausgewählt', clearSel: 'Auswahl leeren', clearSelQ: 'Alle Bilder aus der Diashow entfernen? (Titelfolien bleiben.)', toEditor: 'Weiter zur Diashow →',
  inShow: 'in der Diashow', closeEsc: 'Schliessen (Esc)', lbHint: '← → blättern · Leertaste = auswählen · Esc = schliessen', pdfHint: 'Seiten ankreuzen, die in die Diashow sollen (Klick auf eine Seite = gross ansehen):', pageN: 'Seite {p}',
  // Editor
  order: 'Reihenfolge', orderHint: 'Ziehen = verschieben · Klick = bearbeiten · Entf = entfernen · Alt+←/→ = verschieben',
  addTitle: '+ Titelfolie', titleDefault: 'Gordon Bennett 2026', shuffleOnce: 'Einmal mischen', sortDate: 'Nach Datum ordnen', addImages: '+ Bilder hinzufügen',
  noSlides: 'Noch keine Dias. In «1 · Bilder auswählen» Bilder ankreuzen.', titleSlide: 'Titelfolie', fileMissing: 'Datei fehlt', fileMissingLong: 'Die Datei ist nicht mehr am gespeicherten Ort (umbenannt oder verschoben).',
  searchByName: 'Per Dateiname neu suchen', searching: 'Suche «{n}» …', searchingN: 'Suche «{n}» … {d} Ordner, {f} Dateien', notFound: '«{n}» wurde im Stammordner nicht gefunden.', relocated: 'Neuer Ort: {p}',
  selSlide: 'Ausgewähltes Dia', noSel: 'Kein Dia ausgewählt.', titleText: 'Titeltext (Zeilenumbruch erlaubt)', caption: 'Bildtext (auf dem Beamer)', captionPh: 'z. B. Start in Rovaniemi',
  note: 'Notiz (nur Referentensicht)', notePh: 'Stichworte für dich', duration: 'Anzeigedauer', standard: 'Standard', untilEnd: 'bis Videoende', transition: 'Übergang', random: 'Zufall',
  videoSound: 'Video mit Ton abspielen', videoNote: 'Ohne Ton läuft Spotify ungestört weiter. Mit Ton mischen sich beide – Spotify vorher leiser stellen.',
  moveLeft: 'Nach vorne', moveRight: 'Nach hinten', remove: 'Entfernen', cropLater: 'Zuschneiden (Ausschnitt) folgt in Version 1.1.',
  wholeShow: 'Ganze Diashow', advance: 'Weiterschalten', auto: 'Auto', manual: 'Manuell', defDur: 'Standarddauer', trDur: 'Übergangsdauer', playOrder: 'Reihenfolge', asAbove: 'wie festgelegt', randomOrder: 'zufällig',
  fit: 'Bildfüllung', fitContain: 'ganzes Bild', fitCover: 'füllend', loop: 'Endlosschleife', kenburns: 'Ken-Burns-Bewegung', captions: 'Bildtexte zeigen',
  pool: 'Übergänge im Zufalls-Pool', poolHint: 'Bei «Zufall» wählt die App pro Dia einen Übergang aus diesem Pool, nie zweimal denselben hintereinander.', totalTime: 'Gesamtdauer im Auto-Modus: ca. {t}',
  tr_fade: 'Überblenden', tr_slide: 'Schieben', tr_zoom: 'Zoom', tr_wipe: 'Wischen', tr_cube: 'Würfel', tr_black: 'Über Schwarz', tr_circle: 'Kreis',
  // Vorführen
  prepTitle: 'Vorbereitung', prepText: 'Diashow «{name}» mit {n} Dias. Alle Bilder werden vorab geladen bzw. umgewandelt (HEIC, PDF), damit die Vorführung nicht ruckelt.',
  preparing: 'Bereite vor …', prepN: 'Bereite vor … {i} / {k}', prepDone: 'Bereit: alle {n} Dias.', prepDoneProbs: 'Bereit: {n} von {k} Dias – {p} Problem(e), diese Dias werden übersprungen:',
  slide: 'Dia', stillPreparing: 'Die Vorbereitung läuft noch – bitte kurz warten.', noPlayable: 'Keine abspielbaren Dias.',
  screensTitle: 'Bildschirme', screensNoApi: 'Dieser Browser kann den Beamer nicht direkt ansteuern; die Vorführung startet im Vollbild auf diesem Bildschirm.',
  screen: 'Bildschirm', primary: 'Hauptbildschirm', thisScreen: 'hier (Laptop)', beamer: '→ Beamer', oneScreen: 'Nur ein Bildschirm erkannt. In Windows mit Win+P «Erweitern» wählen (nicht «Duplizieren»), dann neu laden.',
  detectScreens: 'Bildschirme erkennen', multiDetected: 'Zweiter Bildschirm vorhanden – Chrome fragt einmal nach der Erlaubnis «Fenster verwalten».', extendHint: 'Beamer anschliessen und mit Win+P «Erweitern» wählen.',
  screensDenied: 'Bildschirme konnten nicht abgefragt werden (Erlaubnis «Fenster verwalten» verweigert?). Die Vorführung läuft dann auf diesem Bildschirm.',
  withRef: 'Referentensicht auf dem Laptop (bei zwei Bildschirmen)',
  screensHint: 'Beamer-Ausgabe: Vollbild auf dem gewählten Bildschirm. Referentensicht: eigenes Fenster auf dem Laptop mit aktuellem und nächstem Dia, Notiz, Zeiten.',
  startTitle: 'Start', openRef: 'Referentensicht öffnen', startShow: 'Vorführung starten',
  startHint: 'Empfohlen: zuerst <b>Referentensicht öffnen</b>, dann <b>Vorführung starten</b>. Musik: Spotify einfach separat laufen lassen. <kbd>F5</kbd> (auch Start-Taste am Klicker) startet hier ebenfalls.',
  keyTest: 'Klicker-Test', keyTestHint: 'Taste am Klicker drücken …', keysHelp: KEYS_HELP_DE,
  act_next: 'weiter', act_prev: 'zurück', act_pause: 'Auto an/aus', act_black: 'Schwarzbild', act_first: 'erstes Dia', act_last: 'letztes Dia', act_start: 'Start', act_end: 'Ende',
  fsFail: 'Vollbild nicht möglich:', refBlocked: 'Die Referentensicht konnte nicht geöffnet werden (Popup blockiert?). In Chrome Popups für diese Seite erlauben oder die Referentensicht vor dem Start öffnen.',
  refTitle: 'Referentensicht', refIdle: 'Bereit. Im Hauptfenster «Vorführung starten» klicken.',
  next: 'Als Nächstes', elapsed: 'Laufzeit', slideRemain: 'Dia noch', clock: 'Uhrzeit', blackBtn: 'Schwarz', endBtn: 'Beenden', video: 'Video',
  soundOn: 'Ton an', soundOff: 'Ton aus', paused: 'Pause', nowOnBeamer: 'Jetzt auf dem Beamer', blackActive: 'SCHWARZBILD', endOfShow: 'Ende der Diashow',
};

const EN = {
  appName: 'Slideshow', eyebrow: 'Balloon · Slideshow',
  nav_lib: 'Choose pictures', nav_ed: 'Edit slideshow', nav_play: 'Present',
  showLabel: 'Slideshow', unnamed: 'Untitled', unsaved: 'not saved', slidesN: 'slides',
  new: 'New', newTip: 'Start a new, empty slideshow', open: 'Open', save: 'Save', saveAs: 'Save as …',
  changeRoot: 'Change root folder …', theme: 'Light / dark', clearCache: 'Clear preview cache', cacheCleared: 'Preview cache cleared.',
  about: 'About this app', copy: 'Copy', copyAll: 'Copy all', close: 'Close', cancel: 'Cancel',
  aboutText: 'Shows pictures, PDF pages and videos directly from local (Dropbox) folders as a slideshow – without copies. Only small slideshow files with references are saved in the <b>_DIASHOWS</b> folder. Pictures never leave the computer.',
  aboutLibs: 'Bundled libraries: pdf.js (Apache-2.0), heic2any (MIT), exifr (MIT). © 2026 Balthasar Wicki, Wicki Aero GmbH.',
  accessTitle: 'Share picture folder', accessUnsupported: 'This browser cannot access local folders directly. Please use Google Chrome or Microsoft Edge (Windows/Mac).',
  accessText1: 'The app reads pictures straight from your folder – nothing is copied or uploaded. Chrome needs your permission once for a root folder.',
  accessText2: 'Recommended: <b>…\\Dropbox\\01_BALLONFAHREN\\__HB-QWP, QWZ, QWV, QPJ\\02 Pix</b>. All flight folders below it and the <b>_DIASHOWS</b> folder for saved slideshows become reachable. Chrome asks to «allow editing» – needed to save slideshows; pictures are never changed.',
  accessAgain: 'Chrome asks once after each restart. Shared folder:', accessAllow: 'Allow access', accessOther: 'Choose another folder …', accessPick: 'Choose root folder …',
  rootSet: 'Root folder: {n}', rootFail: 'Folder could not be shared:', needRoot: 'Share a root folder first (step 1).', rootFolder: 'Root folder',
  discardTitle: 'Unsaved changes', discardText: 'The current slideshow has unsaved changes. What should happen?', saveFirst: 'Save first', discard: 'Discard',
  noShows: 'No saved slideshows in {d} yet.', openTitle: 'Open slideshow', notAShow: 'Not a slideshow file.', opened: 'Opened: «{n}» ({k} slides).', openFail: 'Open failed:',
  saveTitle: 'Save slideshow', name: 'Name', namePh: 'e.g. GB26 talk Rotary', saveHint: 'Only a small file with references to the originals (no picture copies) is saved in {d}.',
  overwriteTitle: 'File exists', overwriteText: 'A slideshow «{n}» already exists. Overwrite?', overwrite: 'Overwrite',
  saved: 'Saved: {f}', saveFail: 'Save failed:',
  sort: 'Sort', byFolder: 'by folder', byDate: 'by date taken', show: 'Show', fAll: 'All', fImg: 'pictures only', fPdf: 'PDF only', fVideo: 'videos only',
  subfolders: 'Subfolders', size: 'Size', selectAll: 'Select all here', reload: 'Re-read folder',
  loading: 'Loading …', loadingN: 'Reading folders … {d} folders, {f} files', readingDates: 'Reading dates … {n} / {k}', listFail: 'Folder could not be read:',
  emptyFolder: 'No pictures, PDFs or videos in this folder.', pickFolder: 'Choose a flight folder on the left. (Subfolders of the root folder itself are not read automatically.)', hiddenFiles: '{n} other files (e.g. ZIP) are hidden.',
  select: 'Select', pagesSel: '{n} pages selected', pagesN: 'pages', videoUnplayable: 'Video format not playable here', videoUnplayableTip: 'Chrome cannot play this video on this computer (usually iPhone HEVC). Fix: export the video as MP4 (H.264).',
  noPreview: 'No preview', addedN: '{n} files added.', selectedN: '{n} selected', clearSel: 'Clear selection', clearSelQ: 'Remove all pictures from the slideshow? (Title slides stay.)', toEditor: 'Continue to slideshow →',
  inShow: 'in slideshow', closeEsc: 'Close (Esc)', lbHint: '← → browse · Space = select · Esc = close', pdfHint: 'Tick the pages for the slideshow (click a page = view large):', pageN: 'Page {p}',
  order: 'Order', orderHint: 'Drag = move · Click = edit · Del = remove · Alt+←/→ = move',
  addTitle: '+ Title slide', titleDefault: 'Gordon Bennett 2026', shuffleOnce: 'Shuffle once', sortDate: 'Sort by date', addImages: '+ Add pictures',
  noSlides: 'No slides yet. Tick pictures in «1 · Choose pictures».', titleSlide: 'Title slide', fileMissing: 'File missing', fileMissingLong: 'The file is no longer at the saved location (renamed or moved).',
  searchByName: 'Search again by file name', searching: 'Searching «{n}» …', searchingN: 'Searching «{n}» … {d} folders, {f} files', notFound: '«{n}» was not found in the root folder.', relocated: 'New location: {p}',
  selSlide: 'Selected slide', noSel: 'No slide selected.', titleText: 'Title text (line breaks allowed)', caption: 'Caption (on the projector)', captionPh: 'e.g. Take-off in Rovaniemi',
  note: 'Note (presenter view only)', notePh: 'Keywords for you', duration: 'Duration', standard: 'Default', untilEnd: 'until video ends', transition: 'Transition', random: 'Random',
  videoSound: 'Play video with sound', videoNote: 'Without sound, Spotify keeps playing undisturbed. With sound both mix – turn Spotify down first.',
  moveLeft: 'Move forward', moveRight: 'Move back', remove: 'Remove', cropLater: 'Cropping follows in version 1.1.',
  wholeShow: 'Whole slideshow', advance: 'Advance', auto: 'Auto', manual: 'Manual', defDur: 'Default duration', trDur: 'Transition duration', playOrder: 'Order', asAbove: 'as arranged', randomOrder: 'random',
  fit: 'Picture fit', fitContain: 'whole picture', fitCover: 'fill screen', loop: 'Loop', kenburns: 'Ken Burns motion', captions: 'Show captions',
  pool: 'Transitions in the random pool', poolHint: 'With «Random» the app picks a transition from this pool for each slide, never the same twice in a row.', totalTime: 'Total duration in auto mode: approx. {t}',
  tr_fade: 'Cross-fade', tr_slide: 'Slide', tr_zoom: 'Zoom', tr_wipe: 'Wipe', tr_cube: 'Cube', tr_black: 'Through black', tr_circle: 'Circle',
  prepTitle: 'Preparation', prepText: 'Slideshow «{name}» with {n} slides. All pictures are loaded or converted in advance (HEIC, PDF) so the show runs smoothly.',
  preparing: 'Preparing …', prepN: 'Preparing … {i} / {k}', prepDone: 'Ready: all {n} slides.', prepDoneProbs: 'Ready: {n} of {k} slides – {p} problem(s), these slides are skipped:',
  slide: 'Slide', stillPreparing: 'Preparation still running – please wait a moment.', noPlayable: 'No playable slides.',
  screensTitle: 'Screens', screensNoApi: 'This browser cannot drive the projector directly; the show starts full-screen on this screen.',
  screen: 'Screen', primary: 'primary', thisScreen: 'here (laptop)', beamer: '→ projector', oneScreen: 'Only one screen detected. In Windows press Win+P and choose «Extend» (not «Duplicate»), then reload.',
  detectScreens: 'Detect screens', multiDetected: 'Second screen present – Chrome asks once for the «window management» permission.', extendHint: 'Connect the projector and choose «Extend» with Win+P.',
  screensDenied: 'Screens could not be queried (window management permission denied?). The show then runs on this screen.',
  withRef: 'Presenter view on the laptop (with two screens)',
  screensHint: 'Projector output: full screen on the chosen screen. Presenter view: separate window on the laptop with current and next slide, note, times.',
  startTitle: 'Start', openRef: 'Open presenter view', startShow: 'Start presentation',
  startHint: 'Recommended: first <b>open presenter view</b>, then <b>start presentation</b>. Music: simply run Spotify separately. <kbd>F5</kbd> (also the clicker start key) starts here too.',
  keyTest: 'Clicker test', keyTestHint: 'Press a clicker key …', keysHelp: KEYS_HELP_EN,
  act_next: 'next', act_prev: 'back', act_pause: 'auto on/off', act_black: 'black screen', act_first: 'first slide', act_last: 'last slide', act_start: 'start', act_end: 'end',
  fsFail: 'Full screen not possible:', refBlocked: 'The presenter view could not be opened (popup blocked?). Allow popups for this site in Chrome or open the presenter view before starting.',
  refTitle: 'Presenter view', refIdle: 'Ready. Click «Start presentation» in the main window.',
  next: 'Up next', elapsed: 'Elapsed', slideRemain: 'Slide left', clock: 'Time', blackBtn: 'Black', endBtn: 'End', video: 'Video',
  soundOn: 'Sound on', soundOff: 'Sound off', paused: 'Paused', nowOnBeamer: 'Now on the projector', blackActive: 'BLACK SCREEN', endOfShow: 'End of slideshow',
};

let cur = (() => { try { return JSON.parse(localStorage.getItem('diashow.lang')) || 'de'; } catch { return 'de'; } })();
export const lang = () => cur;
export function setLang(l) { cur = l === 'en' ? 'en' : 'de'; try { localStorage.setItem('diashow.lang', JSON.stringify(cur)); } catch { /* egal */ } document.documentElement.lang = cur; }
document.documentElement.lang = cur;
export function t(key, vars) {
  let s = (cur === 'en' ? EN : DE)[key] ?? DE[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
  return s;
}
export const _dicts = { DE, EN };
