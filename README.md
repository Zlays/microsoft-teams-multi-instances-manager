# Microsoft Teams Multi-Instances Manager

[![Release](https://img.shields.io/badge/Release-1.0.3-brightgreen.svg)](https://github.com/ZlaysWorkshop/microsoft-teams-instances-manager/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-44.x-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg)](https://tailwindcss.com/)

**Microsoft Teams Multi-Instances Manager** è un'applicazione desktop progettata per Windows che consente di configurare, avviare e gestire simultaneamente sessioni e profili multipli e completamente indipendenti del client desktop Microsoft Teams.

Supera la limitazione nativa di Microsoft Teams (che vincola a un singolo account desktop attivo alla volta), consentendo a professionisti, consulenti e organizzazioni multi-tenant di operare su account aziendali distinti in parallelo, senza doversi disconnettere o utilizzare sessioni browser limitate.

---

## Funzionalità Chiave

- **Gestione Dinamica dei Profili**: Creazione, visualizzazione e cancellazione immediata di profili dedicati per ciascun tenant o cliente.
- **Ambienti Utente e Sessioni Isolate**: Ogni profilo opera in una cartella locale dedicata (`profiles/<profileName>`), configurata come directory dati isolata (`--user-data-dir`) per istanze PWA Chromium o tramite reindirizzamento della variabile d'ambiente `USERPROFILE` per Teams Classic. Cache, cookie, cronologia e token di accesso rimangono rigorosamente separati.
- **Avvio Automatico delle Istanze (`Run instances on startup`)**: Possibilità di avviare tutte le istanze Teams configurate all'apertura dell'applicazione.
- **Avvio al Boot del Sistema (`AutoLaunch`)**: Integrazione opzionale nel registro di Windows per lanciare il Manager all'accesso dell'utente.
- **Minimizzazione nel System Tray**: L'applicazione scompare nell'area di notifica (vassoio di sistema) alla minimizzazione della finestra, con menu contestuale rapido per il ripristino o l'uscita.
- **Sanitizzazione Input di Sicurezza**: Validazione in tempo reale dei nomi dei profili per prevenire iniezioni shell o percorsi file non validi.
- **Logging su File Locale**: Tracciamento strutturato delle operazioni e degli errori del filesystem in `logs/log.log` via `electron-log`.

---

## Prerequisiti

- **Sistema Operativo**: Windows 10 o Windows 11 (64-bit).
- **Node.js**: Versione `>= 20.0.0` (in conformità con `package.json: "engines": { "node": ">=20.0.0" }`).
- **Gestore Pacchetti**: [Corepack](https://nodejs.org/api/corepack.html) abilitato con [Yarn](https://yarnpkg.com/) (es. eseguire `corepack enable` per abilitare `yarn v1.22.x`).
- **Microsoft Teams**: Rilevamento automatico browser Chromium per PWA ([Microsoft Edge](https://www.microsoft.com/edge) o [Google Chrome](https://www.google.com/chrome)) oppure Teams Classic desktop (`%LOCALAPPDATA%\Microsoft\Teams\current\Teams.exe`).

---

## Installazione e Avvio Rapido

### 1. Clonare il repository

```bash
git clone https://github.com/ZlaysWorkshop/microsoft-teams-instances-manager.git
cd microsoft-teams-instances-manager
```

### 2. Installare le dipendenze

```bash
yarn install
```

### 3. Avviare in ambiente di sviluppo

Avvia il server di sviluppo Next.js (con Turbopack e Fast Refresh per il renderer) e il processo principale Electron in parallelo:

```bash
yarn start
```

---

## Script di Compilazione, Test e Packaging

Il file `package.json` mette a disposizione i seguenti comandi:

| Comando                   | Descrizione                                                                                                            |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| `yarn start` / `yarn dev` | Avvia l'applicazione in modalità sviluppo (server di sviluppo Next.js per il renderer e processo principale Electron). |
| `yarn build`              | Esegue la compilazione del processo principale (Webpack) e del renderer (Next.js 16 static export).                    |
| `yarn test`               | Esegue la suite di test unitari con Jest e React Testing Library.                                                      |
| `yarn lint`               | Esegue l'analisi statica del codice TypeScript/JavaScript con ESLint.                                                  |
| `yarn package:win`        | Compila l'applicazione e genera il pacchetto d'installazione eseguibile per Windows (`.exe` NSIS in `release/`).       |
| `yarn rebuild`            | Ricompila i moduli nativi con `@electron/rebuild`.                                                                     |

---

## Architettura e Documentazione Tecnica

L'applicazione segue un'architettura rigorosamente documentata e conforme allo standard modulare di progetto basata su **Electron 44**, **React 19**, **Next.js 16** (con esportazione statica `output: 'export'`) e **Tailwind CSS**. La sicurezza è garantita dall'isolamento completo del contesto (`contextIsolation: true`, `nodeIntegration: false`) e dall'esposizione del bridge IPC fortemente tipizzato `window.teamsManagerAPI`. La documentazione di dettaglio è consultabile nella cartella [`DOCS/`](./DOCS/):

- **[Specifiche Funzionali del Modulo (`DOCS/core/instance-management/spec.md`)](./DOCS/core/instance-management/spec.md)**:
  - Casi d'uso formattati (`US-01` .. `US-05`) e scenari di accettazione Gherkin.
  - Mappa dei componenti UI (`src/App.tsx`, `src/components/*`) con citazioni `file:line` verificate.
  - Diagramma di sequenza Mermaid del flusso end-to-end (dall'interfaccia utente all'avvio isolato PWA/Classic via IPC).
  - Modello dati (`Settings`), regole di validazione e matrice RBAC.
  - Isolamento dei gap tecnici noti e raccomandazioni correttive.
- **[Standard Architetturale Baseline (`DOCS/standards/architectural-baseline.md`)](./DOCS/standards/architectural-baseline.md)**:
  - Architettura a tre livelli Electron (Main Process `src/main.dev.ts`, Preload Script `src/preload.ts`, Renderer Process Next.js/React `src/pages/index.tsx` e `src/App.tsx`).
  - Meccanismo di isolamento multi-istanza: avvio PWA Chromium (`--app=https://teams.microsoft.com` con `--user-data-dir`) e fallback Teams Classic con override `USERPROFILE`.
  - Struttura dello storage locale e risoluzione dinamica dei percorsi (`src/utils/ResourcesPath.tsx`).
  - Ciclo di vita applicativo, tray icon e registrazione al boot via `auto-launch`.
  - Politiche di sicurezza: `contextIsolation: true`, `nodeIntegration: false` e bridge IPC `window.teamsManagerAPI`.
- **[Standard di Sviluppo e Codifica (`DOCS/standards/coding-standards.md`)](./DOCS/standards/coding-standards.md)**:
  - Convenzioni TypeScript 5 e tipizzazione forte di contratti IPC (`src/types/teams-api.d.ts`), interfacce e props.
  - Modularità dei componenti React 19 con Next.js 16 (`use client`, `createRoot`).
  - Styling Zero-Runtime con Tailwind CSS (dismesso `styled-components`).
  - Sanitizzazione degli input con espressione regolare via `Validator.tsx`.
  - Logging strutturato su file locale via `Logger.tsx` ed `electron-log`.
  - Standard per i test unitari con Jest e React Testing Library.

---

## Download e Release Ufficiali

Gli installer precompilati per Windows (pacchetti eseguibili `.exe`) sono disponibili nella sezione release del repository:

- **[Download Ufficiale Ultima Release (v1.0.3)](https://github.com/ZlaysWorkshop/microsoft-teams-instances-manager/releases)**

---

## Licenza

Questo progetto è distribuito sotto licenza **MIT**. Consultare il file [LICENSE](LICENSE) per i termini completi.
