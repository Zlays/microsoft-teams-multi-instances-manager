# Microsoft Teams Multi-Instances Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-11.x-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-17.x-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178C6.svg)](https://www.typescriptlang.org/)

**Microsoft Teams Multi-Instances Manager** è un'applicazione desktop progettata per Windows che consente di configurare, avviare e gestire simultaneamente sessioni e profili multipli e completamente indipendenti del client desktop Microsoft Teams.

Supera la limitazione nativa di Microsoft Teams (che vincola a un singolo account desktop attivo alla volta), consentendo a professionisti, consulenti e organizzazioni multi-tenant di operare su account aziendali distinti in parallelo, senza doversi disconnettere o utilizzare sessioni browser limitate.

---

## Funzionalità Chiave

- **Gestione Dinamica dei Profili**: Creazione, visualizzazione e cancellazione immediata di profili dedicati per ciascun tenant o cliente.
- **Ambienti Utente e Sessioni Isolate**: Ogni profilo opera in una cartella locale dedicata (`profiles/<profileName>`), reindirizzando la variabile d'ambiente `USERPROFILE`. Cache, cookie, cronologia e token di accesso rimangono rigorosamente separati.
- **Avvio Automatico delle Istanze (`Run instances on startup`)**: Possibilità di avviare tutte le istanze Teams configurate all'apertura dell'applicazione.
- **Avvio al Boot del Sistema (`AutoLaunch`)**: Integrazione opzionale nel registro di Windows per lanciare il Manager all'accesso dell'utente.
- **Minimizzazione nel System Tray**: L'applicazione scompare nell'area di notifica (vassoio di sistema) alla minimizzazione della finestra, con menu contestuale rapido per il ripristino o l'uscita.
- **Sanitizzazione Input di Sicurezza**: Validazione in tempo reale dei nomi dei profili per prevenire iniezioni shell o percorsi file non validi.
- **Logging su File Locale**: Tracciamento strutturato delle operazioni e degli errori del filesystem in `logs/log.log` via `electron-log`.

---

## Prerequisiti

- **Sistema Operativo**: Windows 10 o Windows 11 (64-bit).
- **Microsoft Teams (Classico)**: Installato nel percorso standard utente `%LOCALAPPDATA%\Microsoft\Teams\current\Teams.exe`.
- **Node.js**: Versione `>= 14.x` (consigliata versione LTS).
- **Gestore Pacchetti**: [Yarn](https://yarnpkg.com/) (`v1.x` Classic).

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
Avvia il server di sviluppo Webpack per il renderer e il processo principale Electron:
```bash
yarn start
```

---

## Script di Compilazione, Test e Packaging

Il file `package.json` mette a disposizione i seguenti comandi:

| Comando | Descrizione |
| :--- | :--- |
| `yarn start` | Avvia l'applicazione in modalità sviluppo con hot reload e React DevTools. |
| `yarn build` | Esegue la compilazione Webpack per entrambi i processi (`main` e `renderer`). |
| `yarn test` | Esegue la suite di test unitari con Jest e React Testing Library. |
| `yarn lint` | Esegue l'analisi statica del codice TypeScript/JavaScript con ESLint. |
| `yarn package:win` | Compila l'applicazione e genera il pacchetto d'installazione eseguibile per Windows (`.exe` NSIS in `release/`). |
| `yarn rebuild` | Ricompila i moduli nativi con `electron-rebuild`. |

---

## Architettura e Documentazione Tecnica

L'applicazione segue un'architettura rigorosamente documentata e conforme allo standard modulare di progetto. La documentazione di dettaglio è consultabile nella cartella [`DOCS/`](./DOCS/):

- **[Specifiche Funzionali del Modulo (`DOCS/core/instance-management/spec.md`)](./DOCS/core/instance-management/spec.md)**:
  - Casi d'uso formattati (`US-01` .. `US-05`) e scenari di accettazione Gherkin.
  - Mappa dei componenti UI (`src/App.tsx`, `src/components/*`) con citazioni `file:line` verificate.
  - Diagramma di sequenza Mermaid del flusso end-to-end (dall'input utente all'avvio isolato via PowerShell).
  - Modello dati (`Settings`), regole di validazione e matrice RBAC.
  - Isolamento dei gap tecnici noti e raccomandazioni correttive.
- **[Standard Architetturale Baseline (`DOCS/standards/architectural-baseline.md`)](./DOCS/standards/architectural-baseline.md)**:
  - Architettura a due processi Electron (Main Process `src/main.dev.ts` vs Renderer Process `src/App.tsx`).
  - Meccanismo di isolamento multi-istanza tramite override della variabile d'ambiente `USERPROFILE`.
  - Struttura dello storage locale e risoluzione dinamica dei percorsi (`src/utils/ResourcesPath.tsx`).
  - Ciclo di vita applicativo, tray icon e registrazione al boot via `auto-launch`.
  - Analisi delle politiche di sicurezza (`nodeIntegration` vs migrazione a `contextIsolation`/`preload.ts`).
- **[Standard di Sviluppo e Codifica (`DOCS/standards/coding-standards.md`)](./DOCS/standards/coding-standards.md)**:
  - Convenzioni TypeScript e tipizzazione forte di interfacce e props.
  - Modularità dei componenti React e styling con `styled-components`.
  - Sanitizzazione degli input con espressione regolare via `Validator.tsx`.
  - Logging strutturato su file locale via `Logger.tsx`.
  - Standard per i test unitari con Jest.

---

## Download e Release Ufficiali

Gli installer precompilati per Windows (pacchetti eseguibili `.exe`) sono disponibili nella sezione release del repository:

- **[Download Ufficiale Ultima Release](https://github.com/ZlaysWorkshop/microsoft-teams-instances-manager/releases)**

---

## Licenza

Questo progetto è distribuito sotto licenza **MIT**. Consultare il file [LICENSE](LICENSE) per i termini completi.
