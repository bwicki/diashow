# Changelog — Diashow

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
