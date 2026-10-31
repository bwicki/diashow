# Diashow — Bilder vergangener Ballonfahrten zeigen

Zeigt Bilder, PDF-Seiten und Videos **direkt aus den lokalen Dropbox-Ordnern** als Diashow mit
zufälligen Übergängen – ohne Bilder zu kopieren. Gespeichert werden nur kleine Diashow-Dateien
mit Verweisen. Referentensicht auf dem Laptop, Bild auf dem Beamer, Steuerung mit dem Klicker.
Musik: Spotify läuft einfach separat. Zweisprachig DE/EN.

**Live:** https://diashow.wicki.aero · **Repository:** https://github.com/bwicki/diashow
**Stack:** HTML/CSS/JS ohne Build-Schritt (GitHub Pages), File System Access API und Window
Management API von Chrome. Gestaltung, Tokens und Bedienidiom aus GaforCast/ops.

> Läuft in **Google Chrome** (oder Microsoft Edge) auf Windows/Mac. Firefox und Safari können
> nicht direkt auf lokale Ordner zugreifen.

Stand: Version 1.0.0 (Phase 1, lokal). Phase 2 (Teilen per Link mit Passwort) siehe Konzept im
Projektordner `05_3D-Prints\042 WebAPP diashow`.

---

## Die App von oben nach unten

### Kopfzeile

Titel mit Version (Klick = «Über»), die drei Schritte als Reiter, rechts **Neu**, **Öffnen**,
**Speichern** und das Menü ≡ (Speichern unter, Stammordner ändern, English/Deutsch, hell/dunkel,
Vorschau-Zwischenspeicher leeren). Unter der Kopfzeile stehen die **Meldungen**: sie bleiben stehen,
bis man sie schliesst, und lassen sich einzeln oder gesamthaft kopieren. `Ctrl+S` speichert.

### Erster Start: Stammordner freigeben

Beim ersten Start fragt die App nach dem **Stammordner**, empfohlen
`…\Dropbox\01_BALLONFAHREN\__HB-QWP, QWZ, QWV, QPJ\02 Pix`. Chrome fragt nach «Bearbeiten
erlauben» – das braucht es nur, damit Diashows in `_DIASHOWS` gespeichert werden können; Bilder
werden nie verändert. Nach jedem Neustart von Chrome genügt ein Klick auf **Zugriff erlauben**.

### 1 · Bilder auswählen

- Links der **Ordnerbaum**, rechts **grosse Vorschaukacheln**. Die Klickbox oben links nimmt ein
  Bild in die Diashow auf; die Auswahl bleibt beim Ordnerwechsel erhalten, Bilder aus beliebigen
  Ordnern lassen sich kombinieren.
- **Sortierung** nach Ordner oder Aufnahmedatum (EXIF, sonst Datum im Dateinamen, sonst
  Änderungsdatum), **Filter** Bilder/PDF/Video, **Unterordner** einbeziehen, **Grösse** der Kacheln.
- Klick auf ein Bild öffnet die **Grossansicht**. Der Knopf **«✓ Auswählen & weiter»** (Taste Enter)
  nimmt das Bild auf und öffnet sofort das nächste – so geht man einen Ordner zügig durch. Am Ende
  eines Ordners geht es automatisch im nächsten Ordner des Baums weiter.
  «Überspringen ›» (→), «‹ Zurück» (←), «Abwählen» (Leertaste), Esc schliesst.
- **PDF:** in der Grossansicht geht «Auswählen & weiter» Seite für Seite; die Seitenleiste zeigt alle
  Seiten mit Klickbox.
- Unten die **Ablage** mit Anzahl und Miniaturen, «Weiter zur Diashow».

### 2 · Diashow bearbeiten

- Alle Dias als Kacheln; **Ziehen** ändert die Reihenfolge (Alt+←/→ verschiebt das gewählte Dia,
  Entf entfernt es). Knöpfe: **+ Titelfolie**, **Einmal mischen**, **Nach Datum ordnen**.
- Je Dia: **Bildtext** (auf dem Beamer), **Notiz** (nur Referentensicht), **Anzeigedauer**,
  **Übergang** (oder Zufall), bei Videos **mit Ton** ja/nein.
- Ganze Diashow: **Auto/Manuell**, Standard- und Übergangsdauer, Reihenfolge **wie festgelegt** oder
  **zufällig**, Bildfüllung, Endlosschleife, Ken-Burns-Bewegung, Bildtexte, **Pool** der
  Zufallsübergänge.
- **Mehrfachauswahl:** Ctrl-Klick, Shift-Klick oder Ctrl+A («Alle markieren»); Dauer, Übergang,
  Wasserzeichen und Entfernen gelten dann für alle markierten Dias.
- **Titelfolien gestalten:** Titel, Untertitel, Vorlagen, Hintergrund (Verlauf, Farbe oder Bild mit
  Abdunkeln), Textfarbe und -grösse, Schriftart, Ausrichtung, Logo mit Position und Grösse.
- **Wasserzeichen:** Logo über einzelnen oder markierten Dias (Position, Grösse, Deckkraft);
  verschiedene Logos in einer Diashow sind möglich. Logos ausserhalb des Stammordners werden einmalig
  nach `_DIASHOWS/Logos` kopiert.
- Fehlt eine Datei (umbenannt/verschoben), ist das Dia rot markiert; **Per Dateiname neu suchen**
  findet sie im Stammordner.

### 3 · Vorführen

1. **Vorbereitung** lädt alle Dias vorab (HEIC und PDF werden umgewandelt) und listet Probleme.
2. **Bildschirme:** Beamer anschliessen, in Windows mit `Win+P` **Erweitern** wählen. Chrome fragt
   einmal nach der Erlaubnis **Fenster verwalten**; danach ist der Beamer-Bildschirm wählbar.
3. **Referentensicht öffnen** (Fenster auf dem Laptop), dann **Vorführung starten** (Vollbild auf dem
   Beamer). Der **Klicker-Test** zeigt, welche Taste der Klicker sendet.

| Taste / Klicker | Wirkung |
|---|---|
| → · Bild↓ · Enter · Klick aufs Bild | weiter |
| ← · Bild↑ · Rechtsklick | zurück |
| Leertaste | Auto an/aus (Pause) |
| B · «.» | Schwarzbild |
| Esc | beenden |
| F5 (Vorführen-Ansicht) | starten |

Die Referentensicht zeigt aktuelles und nächstes Dia, Notiz, Laufzeit, Restzeit des Dias, Uhrzeit,
Knöpfe (zurück, Pause, weiter, Schwarz, Ton, Beenden) und eine Leiste aller Dias zum Springen.

## Formate

| Format | Behandlung |
|---|---|
| JPG, PNG, WebP, GIF, AVIF, BMP | direkt |
| HEIC/HEIF (iPhone) | lokale Umwandlung (heic2any), zwischengespeichert |
| RAW (CR2, NEF, ARW, DNG …) | eingebettetes JPEG-Vorschaubild; umbenannte JPEGs werden erkannt |
| PDF | einzelne Seiten, gerendert mit pdf.js |
| MP4, MOV, M4V, WebM | Video; iPhone-MOV (HEVC) nur, wenn Chrome/Grafikkarte HEVC können – sonst markiert |

## Datenschutz

Die Bilder verlassen den Rechner nicht. Vorschaubilder und umgewandelte HEIC/PDF-Seiten liegen im
Browser-Zwischenspeicher (IndexedDB) dieses Rechners und lassen sich im Menü löschen. Die Seite meldet
dem Portal (portal.wicki.aero) nur einen anonymen Aufruf.

## Diashow-Datei

`_DIASHOWS/<Name>.diashow.json` – Pfade relativ zum Stammordner:

```json
{ "app": "diashow", "format": 1, "name": "GB26 Vortrag",
  "settings": { "mode": "auto", "dur": 6, "trDur": 1, "order": "fixed", "loop": true,
                "kenburns": true, "captions": true, "fit": "contain", "pool": ["fade", "slide"] },
  "slides": [ { "id": "a1", "type": "title", "cap": "Gordon Bennett 2026" },
              { "id": "b2", "type": "file", "path": "260901 GB26/von Nicole/IMG_1.heic", "cap": "Start" },
              { "id": "c3", "type": "file", "path": "260901 GB26/Auswertung.pdf", "page": 3 } ] }
```

## Aufbau

```
index.html, presenter.html (Referentensicht), sw.js, manifest.webmanifest
css/base.css (Tokens wie ops), css/app.css
js/app.js (Kopfzeile, Öffnen/Speichern) · js/fsx.js (Ordnerzugriff) · js/media.js (Formate, Vorschau)
js/show.js (Datenmodell) · js/i18n.js (DE/EN) · js/util.js · js/version.js
js/ui/library.js · js/ui/editor.js · js/ui/present.js
js/vendor/ (pdf.js, heic2any, exifr – mit Lizenzen)
```

Release: Version in `js/version.js`, Eintrag in `CHANGELOG.md`.

## Lizenz

Source-available, siehe `LICENSE`. © 2026 Balthasar Wicki, Wicki Aero GmbH.
