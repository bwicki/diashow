# Changelog — Diashow

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
