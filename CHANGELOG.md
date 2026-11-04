# Changelog — Diashow

## 1.8.1 — 2026-11-04

- Bildschirm bleibt während der Vorführung und im Betrachter an (Screen Wake Lock) – wichtig, wenn die Diashow
  unbeaufsichtigt läuft; sonst schaltet Windows den Bildschirm nach der eingestellten Zeit ab.

## 1.8.0 — 2026-11-04

- **Musik:** Wiedergabeliste für die ganze Diashow (Diashow bearbeiten → Musik) und auf Wunsch je Kapitel
  (Titelfolie → «Musik ab diesem Kapitel»: weiter wie bisher / eigene Musik / keine Musik). MP3, M4A, WAV, OGG, FLAC.
- Bei Videos mit Ton blendet die Musik ganz aus und läuft danach an derselben Stelle weiter; Pause und Schwarzbild
  blenden ebenfalls aus; Ende der Diashow blendet langsam aus. Springt man in ein Kapitel zurück, läuft dessen Musik
  dort weiter, wo sie war. Lautstärke und Ein-/Ausblenddauer einstellbar; im Probelauf keine Musik.
- Referentensicht: Musik an/aus, nächster Titel, leiser/lauter, Anzeige des Titels.
- Geteilte Links nehmen die Musik mit (Dateien unverändert); im Betrachter Knopf ♪ zum Stummschalten.

## 1.7.1 — 2026-11-04

- Einstellungen «Bildtext aus Aufnahmedaten» als eigener Abschnitt über «Ganze Diashow»; Ort/Datum/Zeit, «Dias ohne GPS»
  und Ecke sind immer sichtbar (ausgegraut, solange ausgeschaltet).
- Service Worker fragt bei jedem Programmteil beim Server nach (kein Mischen alter und neuer Teile nach einem Update).

## 1.7.0 — 2026-11-04

- **Bildtext aus Aufnahmedaten neu:** Ort, Datum und Zeit einzeln wählbar (z. B. «DE-Gladbeck · 29.08.2026 · 08:16»);
  «Dias ohne GPS»: Datum/Zeit trotzdem zeigen oder nichts; Ecke wählbar (oben/unten, links/rechts). Steht das Logo in
  derselben Ecke, weicht der Text zur anderen Seite aus.
- Datum und Zeit **nur noch aus EXIF** – kein Ersatz mehr aus Dateiname oder Dateidatum (war bei WhatsApp- und
  Dropbox-Kopien oft falsch).
- **Schriftfarbe nach Helligkeit:** Die App misst die Fläche hinter dem Text (mit Ausschnitt und Hochformat-Hintergrund);
  auf hellem Grund dunkle Schrift mit hellem Schein, sonst weisse Schrift mit Schatten. Gilt auch für eigene Bildtexte.
  Pro Dia übersteuerbar: «Farbe des Bildtexts» automatisch / hell / dunkel.
- Grossansicht im Editor zeigt den Bildtext wie auf dem Beamer; geteilte Links übernehmen Ecke und Farbe.
- Bestehende Diashows: die alte Einstellung (Datum / Datum und Zeit / mit Ort) wird übernommen.

## 1.6.0 — 2026-11-02

- **Phase 2: Diashow über einen Link teilen** (≡ → «Diashow teilen (Link) …»). Jeder Link hat sein eigenes
  Passwort, kein Ablaufdatum. Bilder werden im Browser aufbereitet (Ausschnitt, höchstens 2560 px,
  **Logo eingebrannt**, ohne EXIF/GPS) und hochgeladen; Videos unverändert (Logo als Überlagerung); Titel- und
  Karten-Folien als Daten. Notizen bleiben privat. Erneutes Teilen unter demselben Link lädt nur Geändertes hoch.
- Betrachter `diashow.wicki.aero/s/<id>`: Passwort, Abspielen mit denselben Übergängen, Tasten/Wischen,
  Vollbild, kein Download-Knopf, kein Kontextmenü, `noindex`.
- **Aufrufstatistik im Menü ≡**: Aufrufe je geteilter Diashow direkt im Menü; «Geteilte Diashows & Statistik …»
  mit Aufrufen, «bis zum Ende», letztem Aufruf, Aufrufen je Tag; Link kopieren, Passwort ändern, löschen.
  Gezählt wird jede erfolgreiche Öffnung (Neu laden im selben Tab zählt nicht doppelt); keine IP-Adressen.
- Server: Cloudflare Worker `diashow-api` (R2 `diashow-share`, D1 `diashow`), Deploy per GitHub Action.

## 1.5.1 — 2026-11-01

- **Referentensicht auf nur einem Bildschirm:** Klickte man in die Referentensicht, verlor das Beamer-Fenster das
  Vollbild und die Vorführung brach ab – danach reagierten die Tasten nicht mehr. Jetzt läuft die Vorführung im
  Fenster weiter und bleibt über die Referentensicht steuerbar.
- Neu in «Vorführen»: **Ohne Vollbild starten** (zum Üben mit Referentensicht auf einem Bildschirm).
- F5 in der Referentensicht lädt sie nicht mehr neu.

## 1.5.0 — 2026-11-01

- **Springen während der Vorführung:** Dia-Nummer eintippen (z. B. 134) und Enter – oder kurz warten – springt zu
  diesem Dia; die Vorführung läuft von dort weiter. Die eingegebene Nummer erscheint in der Referentensicht
  (ohne Referentensicht dezent unten links auf dem Beamer).
- **Kapitel per Buchstabe:** A, B, C … springen zur 1., 2., 3. Titelfolie (ersetzt die Tasten 1–9).
  Kapitel-Knöpfe in der Referentensicht mit Buchstaben.
- Schwarzbild jetzt mit «.» (PowerPoint-Konvention). Sendet die Schwarzbild-Taste des Klickers «b», lässt sich
  in «Vorführen» einstellen: «Taste B = Schwarzbild». Die Buchstaben N, P, K, W sind nicht mehr belegt.
- Referentensicht zeigt die Dia-Nummer aus «Diashow bearbeiten» (auch bei zufälliger Reihenfolge).

## 1.4.2 — 2026-11-01

- Filter in «Diashow bearbeiten»: **Hochformat** und **Querformat** (berücksichtigt einen Ausschnitt).
- Grossansicht im Editor im Seitenverhältnis der eingestellten Beamer-Auflösung (Menü ≡).
- Bildtext weicht dem Wasserzeichen aus (automatischer Bildtext nach links, wenn das Logo unten rechts steht;
  eigener Bildtext höher, wenn das Logo unten Mitte steht).

## 1.4.1 — 2026-11-01

- «Diashow bearbeiten»: **Grossansicht** per Doppelklick auf eine Kachel oder Symbol ⤢ – zeigt das Dia wie
  auf dem Beamer (16:9, Ausschnitt, Hochformat-Hintergrund, Wasserzeichen, Bildtext); ← → bzw. Bild↑/↓ blättern
  (nur gefilterte Dias), Esc schliesst.
- Knöpfe brechen nicht mehr um (z. B. «Ersetzen …»).

## 1.4.0 — 2026-11-01

- **Kapitel:** Titelfolien gelten als Kapitel. In der Referentensicht stehen sie als Knöpfe (aktuelles Kapitel
  hervorgehoben); Tasten 1–9 springen während der Vorführung direkt zum Kapitel.
- **Zuschneiden:** Ausschnitt je Bild (frei, 16:9, 4:3, 3:2, 1:1), Rahmen verschieben und an den Ecken ziehen;
  das Original bleibt unverändert (CSS object-view-box). Wirkt in Kacheln, Vorschau, Beamer und Referentensicht.
- **Hochformat aufwerten:** unscharfer, abgedunkelter Bildhintergrund statt schwarzer Ränder (Schalter, Standard an).
- **Karten-Folie «+ Karte»:** Trajektorie aus GPX, IGC oder KML (Stammordner; sonst Kopie nach `_DIASHOWS/Tracks`)
  auf OpenStreetMap, Satellit, topografisch oder schlicht (ohne Internet); die Trajektorie entsteht während der
  Folie, Titel auf der Karte, Linienfarbe und -breite. Leaflet 1.9.4 mitgeliefert.
- **Bildtext aus Aufnahmedaten:** aus / Datum / Datum + Zeit / Datum + Zeit + Ort (GPS → OpenStreetMap Nominatim,
  Ort mit Länderkürzel, z. B. «CH-Baden»). Manueller Bildtext hat Vorrang.
- **Probelauf im Fenster:** spielt alle Dias schnell (1.5 s) im Fenster ab, ohne Beamer.
- Grossansicht: Bilder werden immer ganz gezeigt (Hochformat in voller Höhe).

## 1.3.1 — 2026-11-01

- Meldungen schieben die Ansicht nicht mehr nach unten: sie stehen im **Protokoll** hinter dem Symbol
  in der Kopfzeile (neueste oben, einzeln oder alle kopierbar, «Leeren»). Das Symbol zeigt die Zahl neuer
  Meldungen, bei Warnungen und Fehlern rot.

## 1.3.0 — 2026-11-01

- **Wasserzeichen:** Grösse (2–40 % der Bildhöhe), Deckkraft und Position ändern sich sofort, auch bei
  vielen markierten Dias (nur noch Stil statt Neuaufbau). Logo «Ersetzen …». Neu: **farbige Platte hinter
  dem Logo** (Farbe, Deckkraft) für transparente Logos auf dunklen Bildern. Vorschau auch bei Mehrfachauswahl.
- Knopf **«Dieses Wasserzeichen auf alle Bild-Dias übernehmen»** jetzt direkt unter den Wasserzeichen-Feldern;
  das übernommene Wasserzeichen gilt danach als Standard für neue Dias (statt fest des Wicki-Logos).
- **Filter in «Diashow bearbeiten»:** nur mit Hinweisen, Auflösung, unscharf, Doublette, JPG/PNG, HEIC, RAW,
  PDF, Videos, Titelfolien, ohne Wasserzeichen. «Alle markieren» markiert nur die sichtbaren Dias.
- Qualitätshinweise auch auf den Kacheln in «Diashow bearbeiten» (Doubletten innerhalb der Diashow mit Dia-Nummer).
- Menü ≡ → **Beamer-Auflösung für Hinweise** (1280×720 bis 3840×2160); die Grenzwerte richten sich danach.

## 1.2.0 — 2026-11-01

- **Qualitätshinweise in «Bilder auswählen»** (Symbole links oben im Bild, Details beim Darüberfahren und in
  der Grossansicht): ▦ Auflösung knapp (< 1600×900 px) bzw. deutlich zu klein (lange Seite < 1000 px),
  ◌ vermutlich unscharf (Varianz des Laplace-Operators, Heuristik), ⧉ mutmassliche Doublette / sehr
  ähnliches Bild in derselben Ansicht (Wahrnehmungs-Hash). Vorschaubilder werden dazu einmal neu berechnet.
- **Titelfolie einfügen** mit kurzem Dialog: Titel, Untertitel und Ort (vor/nach dem markierten Dia,
  am Anfang, am Schluss); Vorgabe «vor dem markierten Dia».
- «Wicki-Logo jetzt auf alle Bild-Dias setzen» (Ganze Diashow).
- **Schutz vor Überschreiben:** Wurde die Diashow-Datei seit dem Öffnen anderswo geändert, fragt
  «Speichern» nach, statt die neuere Fassung stillschweigend zu überschreiben.

## 1.1.2 — 2026-10-31

- «Diashow bearbeiten»: Schieberegler «Grösse» für die Kacheln (klein = viele Dias auf einen Blick, um
  Gruppen mit Shift-/Ctrl-Klick zu markieren und gemeinsam zu verschieben oder zu bearbeiten).

## 1.1.1 — 2026-10-31

- **Fehler behoben:** Bei grossen Diashows (z. B. 250 Dias) schrumpften die Kacheln in «Diashow bearbeiten»
  auf Strichhöhe und liessen sich nicht mehr bearbeiten (Rasterzeilen wurden auf die Fensterhöhe gestaucht).
  Gleiche Absicherung im Bilderraster.
- Neue Titelfolien starten mit der Vorlage «Schwarz».
- Neue Dias erhalten standardmässig das Wicki-Partners-Logo oben rechts als Wasserzeichen
  (abschaltbar unter «Ganze Diashow»).

## 1.1.0 — 2026-10-31

- **Titelfolien-Editor:** Titel und Untertitel, Vorlagen (Nacht, Tag, Amber, Grün, Schwarz, Weiss),
  Hintergrund als Verlauf, Farbe oder Bild (mit Abdunkeln), Textfarbe, Titel- und Untertitelgrösse,
  Schriftart, fett, Ausrichtung links/Mitte/rechts und oben/Mitte/unten, Logo mit Position und Grösse.
  Live-Vorschau; Titelfolie duplizieren.
- **Wasserzeichen:** Logo auf einzelnen oder mehreren Dias (Position, Grösse, Deckkraft); verschiedene
  Logos in einer Diashow möglich. Eingebaut: Wicki Partners Ballonteam; weitere Logos «Aus Ordner wählen»
  (Dateien ausserhalb des Stammordners werden nach `_DIASHOWS/Logos` kopiert), zuletzt verwendete Logos.
- **Mehrfachauswahl** im Editor: Ctrl-Klick, Shift-Klick, Ctrl+A / «Alle markieren»; Dauer, Übergang,
  Wasserzeichen und Entfernen für alle markierten; mehrere Dias gemeinsam verschieben.
- Darstellung von Titel und Wasserzeichen identisch in Editor, Referentensicht und Beamer.

## 1.0.4 — 2026-10-31

- Helles Favicon und App-Icon (Variante V3: Ballon mit ▶), dazu favicon.ico und Apple-Touch-Icon.

## 1.0.3 — 2026-10-31

- Grossansicht: «Auswählen & weiter» springt am Ende eines Ordners automatisch in den nächsten Ordner
  des Baums mit Bildern (Baum klappt mit auf, Hinweis zeigt den neuen Ordner).

## 1.0.2 — 2026-10-31

- Grossansicht im Tag-Look mit Knopf **«✓ Auswählen & weiter»** (Taste Enter): wählt das Bild aus und öffnet
  sofort das nächste; bei PDFs Seite für Seite. Dazu «Überspringen ›» (→), «‹ Zurück» (←), «Abwählen»
  (Leertaste) und Zähler «12 / 87». Das nächste Bild wird im Voraus vorbereitet (HEIC, PDF).

## 1.0.1 — 2026-10-31

- Tag-Look als Standard wie ops (`data-theme="light"`); Nacht-Look weiterhin über Menü ≡ → «Hell / dunkel».
  Die Beamer-Bühne bleibt schwarz.

## 1.0.0 — 2026-10-31

Erste Version für die Vorträge ab 05.11.2026.

- **Bilder auswählen:** Stammordner einmalig in Chrome freigeben (File System Access API), Ordnerbaum,
  grosse Vorschaukacheln mit Klickbox, Grösse per Schieberegler, Sortierung nach Ordner oder
  Aufnahmedatum (EXIF → Dateiname → Änderungsdatum), Filter Bilder/PDF/Video, Unterordner,
  «Alle hier wählen», Grossansicht mit ← → und Leertaste. Bilder aus beliebigen Ordnern kombinierbar.
- **Formate:** JPG/PNG/WebP/GIF/AVIF, HEIC (lokale Umwandlung mit heic2any), RAW (eingebettetes
  JPEG; umbenannte JPEGs werden erkannt), PDF (einzelne Seiten wählbar, pdf.js), Video MP4/MOV/WebM
  (Abspielbarkeit je nach Codec; nicht abspielbare werden markiert).
- **Diashow bearbeiten:** Reihenfolge per Ziehen, Titelfolien, Bildtext, Notiz für die Referentensicht,
  Dauer und Übergang je Dia, Video mit/ohne Ton je Dia, einmal mischen, nach Datum ordnen,
  fehlende Dateien per Dateiname neu suchen.
- **Gesamteinstellungen:** Auto/Manuell, Standard- und Übergangsdauer, Reihenfolge fest/zufällig,
  Endlosschleife, Ken-Burns-Bewegung, Bildtexte, Bildfüllung, Pool der Zufallsübergänge
  (Überblenden, Schieben, Zoom, Wischen, Würfel, Über Schwarz, Kreis).
- **Speichern/Öffnen:** kleine JSON-Datei mit Verweisen in `_DIASHOWS` (keine Bildkopien).
- **Vorführen:** Vorbereitung aller Dias vorab, Vollbild auf dem Beamer (Window Management API),
  Referentensicht als eigenes Fenster (aktuelles/nächstes Dia, Notiz, Laufzeit, Restzeit, Uhrzeit,
  Leiste aller Dias), Klicker-Test, Tasten für Logitech-Presenter (Bild↑/↓, F5, Esc, «.»/B).
- Meldungen bleiben stehen und sind kopierbar; DE/EN; hell/dunkel; offline-fähig (Service Worker).
