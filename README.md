# CV Builder - Lebenslauf Baukasten

Ein moderner, interaktiver Lebenslauf-Builder mit Live-Vorschau und beeindruckenden visuellen Effekten.

## Features

- **Split-Screen Layout**: Formular links, Live-Vorschau rechts
- **Moderne UI**: Glassmorphism-Effekte, Dark Mode, animierte Verläufe
- **Smooth Animations**: Powered by Framer Motion
- **Responsive Design**: Optimiert für alle Bildschirmgrößen
- **Auto-Save**: Speichert automatisch in LocalStorage
- **TypeScript**: Vollständig typsicher
- **Latest Tech Stack**:
  - Next.js 15 mit Turbopack
  - React 19
  - TypeScript
  - Tailwind CSS
  - Framer Motion
  - Shadcn/ui

## Sections

1. **Persönliche Daten**
   - Vor- und Nachname
   - E-Mail und Telefon
   - Standort
   - Berufstitel
   - Zusammenfassung

2. **Berufserfahrung**
   - Unbegrenzte Einträge hinzufügen
   - Firma, Position, Zeitraum
   - Detaillierte Beschreibungen
   - "Aktuelle Position" Checkbox

3. **Ausbildung**
   - Unbegrenzte Einträge
   - Institution, Abschluss, Fachrichtung
   - Zeitraum

4. **Skills**
   - Skills mit Levels (1-5)
   - Visuelle Fortschrittsbalken
   - Animierte Darstellung

## Installation

```bash
cd cv-builder
npm install
```

## Development

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Build

```bash
npm run build
npm start
```

## Design Features

- **Glassmorphism**: Transparente, verschwommene Hintergründe
- **Gradient Text**: Verlaufstexte für Überschriften
- **Hover Effects**: Elegante Hover-Animationen
- **Floating Particles**: Animierte Partikel im Hintergrund
- **Custom Scrollbar**: Stilisierte Scrollbars
- **Shadow Effects**: Glühende Schatten für wichtige Elemente

## Keyboard & UX

- Alle Formulare sind vollständig mit der Tastatur bedienbar
- Smooth Transitions zwischen allen Zuständen
- Echtzeit-Synchronisation zwischen Form und Preview
- Responsive Breakpoints für alle Geräte

## Technologien

- **Framework**: Next.js 15 mit App Router
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS
- **Animationen**: Framer Motion
- **UI Components**: Shadcn/ui (custom styled)
- **Icons**: Lucide React

## Projektstruktur

```
cv-builder/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── cv-form.tsx
│   ├── cv-preview.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── textarea.tsx
├── types/
│   └── cv.ts
└── lib/
    └── utils.ts
```

## Zukünftige Features

- PDF Export
- Verschiedene Templates
- Drag & Drop für Reihenfolge
- Mehrsprachigkeit
- Cloud Sync
- Teilen via Link

---

Made with Next.js 15 + TypeScript + Tailwind + Framer Motion
