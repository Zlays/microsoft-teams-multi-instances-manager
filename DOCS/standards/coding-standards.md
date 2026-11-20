# Standard di Sviluppo e Convenzioni di Codice

Questo documento stabilisce le linee guida obbligatorie per lo sviluppo, la formattazione, la gestione dello stato, la sicurezza degli input, il testing unitario e l'analisi statica/linting all'interno del progetto `microsoft-teams-instances-manager`.

---

## 1. Convenzioni TypeScript, React 19 e Contratti IPC

Il progetto adotta TypeScript con configurazione rigorosa in `tsconfig.json`, integrando le API di **React 19.3.1** e **Next.js 16.4.6**. È fatto obbligo di tipizzare esplicitamente tutte le strutture di dati condivise, lo stato React, le props dei componenti e i contratti IPC esposti dal Preload Script.

### 1.1 Definizione dei Contratti di Dati e dell'Interfaccia IPC

Tutti i modelli di configurazione e le operazioni di sistema esposte al Renderer Process sono formalizzati centralmente in `src/types/teams-api.d.ts:1-19`:

```typescript
// src/types/teams-api.d.ts:1-13
export interface Settings {
  onStartup: boolean; // Flag di esecuzione simultanea dei profili al boot
  autoLaunch: boolean; // Flag di registrazione nel registro di avvio di Windows
}

export interface TeamsManagerAPI {
  getProfiles(): Promise<string[]>;
  createProfile(name: string): Promise<{ success: boolean; error?: string }>;
  deleteProfile(name: string): Promise<{ success: boolean; error?: string }>;
  launchProfile(name: string): Promise<{ success: boolean; error?: string }>;
  getSettings(): Promise<Settings>;
  updateSettings(settings: Settings): Promise<void>;
}

declare global {
  interface Window {
    teamsManagerAPI: TeamsManagerAPI;
  }
}
```

### 1.2 Regole di Tipizzazione e Disaccoppiamento

1. **Evitare `any`**: L'uso del tipo `any` è severamente scoraggiato; utilizzare `unknown` con type guarding, oppure generici parametrici.
2. **Disaccoppiamento Totale della UI dal Filesystem**:
   Nessun componente o hook React sotto `src/` (esclusi `src/main/` e `src/preload.ts`) può importare o accedere direttamente a `fs`, `child_process`, `os`, `path` o `auto-launch`. Tutte le interazioni con il sistema operativo devono avvenire tramite invocazioni asincrone fortemente tipizzate su `window.teamsManagerAPI`.
3. **Tipizzazione delle Props dei Componenti**:
   Ogni componente React deve esportare o dichiarare un'interfaccia `Props` locale che elenchi tutte le proprietà in ingresso e le signature dei callback di evento:
   ```typescript
   // src/components/Profile.tsx:12-16
   interface Props {
     text: string;
     onRun: (profileName: string) => void;
     onDelete: (profileName: string) => void;
   }
   ```
   ```typescript
   // src/components/Button.tsx:28-31
   interface Props {
     text: string;
     click: () => void;
   }
   ```
   ```typescript
   // src/components/ErrorBox.tsx:17-19
   interface Props {
     text: string;
   }
   ```

---

## 2. Struttura Modulare dei Componenti React (React 19 / Next.js 16)

### 2.1 Pattern dei Componenti Funzionali e Mounting React 19

- **Mounting Moderno con `createRoot` (`src/index.tsx:1-9`)**:
  In conformità a React 19, il bootstrap dell'applicazione abbandona il deprecato `ReactDOM.render` a favore di `createRoot` da `react-dom/client`:

  ```typescript
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import App from './App';

  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  }
  ```

- **Integrazione Client Next.js 16 (`src/pages/index.tsx:1-18`)**:
  Il componente pagina per l'export statico (`output: 'export'`) dichiara la direttiva `'use client'` e monta l'applicazione dopo la verifica del montaggio lato client (`mounted && typeof window !== 'undefined'`).
- **Disaccoppiamento del Container `Main` (`src/App.tsx:10-197`)**:
  Il componente radice `Main` non contiene alcuna logica I/O a basso livello. Tutta la persistenza delle preferenze, l'avvio delle istanze Teams e la gestione del ciclo di vita dei profili sono delegati a `window.teamsManagerAPI`:
  - `loadInitialData()`: carica impostazioni e profili all'avvio (`src/App.tsx:24-52`).
  - `addProfile()`: invoca `window.teamsManagerAPI.createProfile(profileName)` (`src/App.tsx:59-84`).
  - `onDelete()`: invoca `window.teamsManagerAPI.deleteProfile(profile)` (`src/App.tsx:90-103`).
  - `onRun()`: invoca `window.teamsManagerAPI.launchProfile(profile)` (`src/App.tsx:105-116`).
  - `handleOnStartup()` / `handleAutoLaunch()`: aggiornano lo stato locale e invocano `window.teamsManagerAPI.updateSettings(newSettings)` (`src/App.tsx:118-148`).
- **Componenti di Presentazione Puri**: I componenti grafici (`Profile.tsx`, `Button.tsx`, `ErrorBox.tsx`) rimangono funzioni pure orientate unicamente alla visualizzazione e propagano gli eventi tramite callback tipizzati.
- **Rendering Condizionale Pulito**: I componenti che possono non avere output visivo (come i banner di errore) incapsulano la condizione internamente (`src/components/ErrorBox.tsx:23`):
  ```typescript
  function ErrorBox(props: Props) {
    const { text } = props;
    return <>{text ? <ErrorBoxCSS>{text}</ErrorBoxCSS> : null}</>;
  }
  ```
- **Deprecazione del CSS-in-JS a Runtime**: L'uso legacy di `styled-components` e delle primitive di layout `src/components/FlexCSS.tsx` è formalmente deprecato e in fase di dismissione in favore del nuovo Standard Architetturale di Styling UI (Sezione 3).

---

## 3. Standard Architetturale di Styling UI ed Ergonomia Desktop

A partire dalla Fase 4, l'applicazione adotta lo standard **Zero-Runtime CSS** basato su **Tailwind CSS**, design token semantici su variabili CSS native ed elementi atomici accessibili per l'ambiente desktop Electron.

### 3.1 Principi Guida: Zero-Runtime CSS e Divieto di Soluzioni a Runtime

1. **Compilazione Statica a Build-Time**: Tutto il CSS deve essere generato in fase di compilazione statica tramite il compilatore Tailwind CSS e PostCSS (`output: 'export'`). Nessun foglio di stile può essere calcolato, generato o iniettato via runtime JavaScript durante l'esecuzione del Renderer Process.
2. **Divieto Assoluto di CSS-in-JS a Runtime**: È tassativamente vietato l'utilizzo di librerie CSS-in-JS che calcolano classi a runtime (quali `styled-components`, `@emotion/react`, `@emotion/styled`). La dipendenza `styled-components` viene rimossa da `package.json`.
3. **Divieto di Preprocessori e Loader Obsoleti**: È fatto divieto di introdurre preprocessori CSS (`sass`, `less`, `stylus`) o loader non standard (`sass-loader`, `style-loader`, `css-loader` legacy di Webpack). Il processing degli stili è interamente governato da PostCSS con i plugin `tailwindcss` e `autoprefixer`.
4. **Divieto di Reset Globali Distruttivi**: È vietata qualsiasi regola globale che applichi margini o spaziature indiscriminate a tutti gli elementi (come il legacy `body * { margin: 0.2rem; }` in `src/App.global.css:7-9`). Il reset deve attenersi al reset moderno e non distruttivo fornito da `@tailwind base`.

### 3.2 Design Token Semantici basati su CSS Variables e Supporto Temi (Light/Dark Mode)

I valori cromatici, le ombre e i bordi non possono essere definiti con valori esadecimali, RGB o nomi di colori hardcoded (es. `#1e53bd`, `#3174c7`, `tomato`) all'interno dei componenti o delle classi. Devono essere utilizzati unicamente i **Design Token Semantici** definiti come variabili CSS in formato HSL all'interno di `src/styles/globals.css` e mappati in `tailwind.config.ts`:

```css
/* src/styles/globals.css */
@layer base {
  :root {
    --background: 220 20% 97%;
    --foreground: 220 25% 10%;
    --card: 0 0% 100%;
    --card-foreground: 220 25% 10%;
    --primary: 217 91% 50%;
    --primary-foreground: 0 0% 100%;
    --primary-hover: 217 91% 45%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --muted: 220 15% 90%;
    --muted-foreground: 220 10% 40%;
    --border: 220 15% 85%;
    --input: 220 15% 85%;
    --ring: 217 91% 50%;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 222 47% 14%;
    --card-foreground: 210 40% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 11%;
    --primary-hover: 217 91% 55%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 210 40% 98%;
    --muted: 217 33% 20%;
    --muted-foreground: 215 20% 65%;
    --border: 217 33% 22%;
    --input: 217 33% 22%;
    --ring: 217 91% 60%;
  }
}
```

- **Mappatura in Tailwind**: Le utility class (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, ecc.) risolvono i valori semantici rispettando la variante dark/light attiva.
- **Divieto di Hardcoded Colors**: Qualsiasi nuovo componente o refactoring che introduca valori esadecimali diretti o classi arbitrarie con valori fissi (es. `bg-[#1e53bd]`) verrà respinto dal Quality Gate.

### 3.3 Funzione di Composizione Classi `cn()` (`src/lib/utils.ts`)

Tutti i componenti visivi devono aggregare le classi CSS condizionali e consentire l'override da parte dei consumatori utilizzando l'helper standard `cn()` formalizzato in `src/lib/utils.ts`:

```typescript
// src/lib/utils.ts:1-7
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- **Risoluzione Automatica dei Conflitti**: `twMerge` garantisce che classi Tailwind in conflitto (es. `p-2` sostituito da `p-4`) vengano risolte in modo deterministico a favore dell'ultima dichiarata, evitando specificità CSS non predicibili.
- **Condizionalità Typesafe**: `clsx` permette la gestione typesafe di classi booleane o opzionali: `cn('base-class', isActive && 'active-class', className)`.

### 3.4 Regole di Ergonomia Desktop per Electron (REQ-EL-01..REQ-EL-04)

Per garantire una reale esperienza desktop integrata con l'ambiente Windows, i componenti e il layout devono rispettare quattro requisiti ergonomici non negoziabili:

1. **`REQ-EL-01`: Prevenzione della Selezione Testuale Accidentale (`user-select`)**:
   - L'intera interfaccia grafica (`body`, container, pulsanti, etichette, liste) deve impostare `user-select: none;` (`select-none` in Tailwind o regola globale su `body`).
   - È consentita la selezione del testo (`user-select: text;` / `select-text`) **esclusivamente** sui campi di input (`<input type="text">`) e su eventuali aree dedicate alla consultazione o copia di percorsi e log di sistema.
2. **`REQ-EL-02`: Navigabilità da Tastiera e Segnalazione Focus (`focus-visible`)**:
   - Tutti gli elementi interattivi (pulsanti, checkbox, campi di testo) devono essere elementi HTML nativi semantici (`<button>`, `<input>`). È severamente vietato l'uso di tag `<div>` con handler `onClick` non accessibili.
   - Tutti i componenti devono implementare un indicatore di focus visibile e ad alto contrasto per la navigazione via tastiera: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
   - Conformità piena al livello AA delle linee guida WCAG 2.1 per il contrasto di colore.
3. **`REQ-EL-03`: Sincronizzazione Dinamica con il Tema di Sistema (Light/Dark Mode)**:
   - L'applicazione deve integrarsi con la modalità di sistema dell'utente (Windows Dark/Light Mode), adottando la media query standard `@media (prefers-color-scheme: dark)` o la sincronizzazione della classe `.dark` al montaggio del Renderer.
   - Il passaggio tra tema chiaro e tema scuro deve avvenire istantaneamente e senza richiedere il riavvio dell'applicazione Electron.
4. **`REQ-EL-04`: Controllo dell'Overflow e Styling Scrollbars Desktop**:
   - Considerata la dimensione fissa della finestra definita nel Main Process (`width: 400px, height: 500px` in `src/main.dev.ts:78-98`), il contenitore principale dell'applicazione deve occupare esattamente l'altezza del viewport (`h-screen flex flex-col overflow-hidden`).
   - L'area contenente la lista dei profili deve essere confinata in un blocco a scorrimento verticale dedicato (`flex-1 overflow-y-auto`), evitando lo sfasamento dell'header o l'occorrenza di barre di scorrimento globali sull'intero body.
   - Le scrollbars devono essere personalizzate per rispettare l'estetica Fluent di Windows 11 (larghezza ridotta, angoli arrotondati, colore coerente con i token `--muted` e `--muted-foreground`).

### 3.5 Struttura di Governance e Organizzazione delle Directory di Styling

L'architettura del Renderer Process organizza il codice di presentazione e styling secondo una chiara separazione delle responsabilità:

```
src/
├── styles/
│   └── globals.css        # Direttive Tailwind (@tailwind), CSS variables dei token e reset ergonomico
├── lib/
│   └── utils.ts           # Utility condivise del renderer (esportazione della funzione cn())
├── components/
│   ├── ui/                # Catalogo componenti atomici accessibili (Button, Input, Checkbox, Alert)
│   ├── Profile.tsx        # Componente di dominio riga profilo (refactorizzato con utility Tailwind)
│   └── ErrorBox.tsx       # Componente di errore (migrato verso Alert atomico)
```

- **`src/styles/globals.css`**: È l'unico punto di ingresso per i fogli di stile globali, importato in `src/pages/_app.tsx`.
- **`src/lib/utils.ts`**: Contiene funzioni di utilità generale indipendenti dal framework UI, tra cui `cn()`.
- **`src/components/ui/`**: Directory riservata ai componenti visuali generici e disaccoppiati dalla logica di business (`button.tsx`, `input.tsx`, `checkbox.tsx`, `alert.tsx`).
- **Dismissione di `src/components/FlexCSS.tsx` e `src/App.global.css`**: Nessun nuovo componente può importare o fare riferimento a questi file legacy, destinati all'eliminazione al termine della Fase 4.2.

---

## 4. Sanitizzazione Obbligatoria degli Input Utente

Poiché i nomi dei profili vengono utilizzati per creare cartelle su disco e comporre comandi di avvio shell, la sanitizzazione tempestiva è un vincolo architetturale non negoziabile.

### 4.1 Funzione `inputValidator` (`src/utils/Validator.tsx:1-4`)

```typescript
const regex = new RegExp('[^a-zA-Z0-9 ]');

export default function inputValidator(text: string): string {
  return text.replace(regex, '');
}
```

### 4.2 Regole di Enforcement

1. **Sanitizzazione in Tempo Reale (`Controlled Input`)**:
   In `src/App.tsx:86-88`, l'evento `onChange` del campo di input deve filtrare immediatamente i caratteri digitati:
   ```typescript
   function handleProfileNameBox({
     target,
   }: React.ChangeEvent<HTMLInputElement>) {
     setProfileNameBox(() => inputValidator(target.value));
   }
   ```
2. **Whitelist dei Caratteri Ammessi**:
   Sono consentite unicamente le lettere minuscole e maiuscole (`a-z`, `A-Z`), i numeri (`0-9`) e lo spazio (` `). Qualsiasi altro carattere (inclusi simboli di path traversal `../`, caratteri riservati NTFS `\/:*?"<>|` e caratteri di concatenazione shell `;|&$`) viene eliminato prima che il testo possa raggiungere lo stato dell'applicazione.
3. **Controllo Trim e Non-Vuoto**:
   Prima di richiedere la creazione di una directory, il nome del profilo viene normalizzato con `profileNameBox.trim()` (`src/App.tsx:60`) e validato nuovamente nel Main Process prima della creazione effettiva (`src/main/ipcHandlers.ts:54-56`).

---

## 5. Logging Applicativo Strutturato

Tutti gli eventi operativi, gli errori del filesystem, le configurazioni caricate e l'avvio delle istanze devono essere tracciati tramite il modulo centralizzato `src/utils/Logger.tsx:20` nel Renderer o direttamente con `electron-log` nel Main Process (`src/main/ipcHandlers.ts:6`).

### 5.1 Livelli di Log e Destinazione

Il logger si interfaccia con `electron-log` configurando la scrittura persistente su disco nel file `logs/log.log` (`src/utils/Logger.tsx:5`).

| Livello | Metodo / Caso d'Uso                                                           | Esempio nel Codice                     |
| :------ | :---------------------------------------------------------------------------- | :------------------------------------- |
| `info`  | Notifiche informative sulle impostazioni o avanzamento updater.               | `Logger('config loaded: ...', 'info')` |
| `debug` | Azioni ordinarie di caricamento, creazione ed eliminazione cartelle.          | `Logger('profile loaded: AziendaA')`   |
| `error` | Errori del filesystem (`fs.mkdir`, `fs.writeFile`, `fs.readdir`, `fs.rmdir`). | `Logger(err, 'error')`                 |

### 5.2 Inizializzazione Autonoma

Il modulo `Logger.tsx` garantisce la preventiva creazione della directory `logs/` prima di qualsiasi tentativo di scrittura (`src/utils/Logger.tsx:7-18`), evitando eccezioni non gestite al primo avvio.

---

## 6. Standard di Test Unitari (Jest + React Testing Library)

La suite di testing automatico adotta moderni standard basati su **Jest** e **React Testing Library** (`@testing-library/react` v16+ per compatibilità nativa con React 19). È formalmente deprecato l'uso di Enzyme o di test basati su rendering shallow.

### 6.1 Test di Rendering, Asincronismo e Mock Tipizzato (`src/__tests__/App.test.tsx:1-32`)

Grazie al disaccoppiamento totale introdotto con la risoluzione di GAP-SEC-01, i test del frontend non necessitano più di mockare moduli nativi di Node.js (`fs`, `child_process`). Il mocking viene effettuato in modo deterministico e centralizzato sull'interfaccia globale `window.teamsManagerAPI`:

```typescript
// src/__tests__/App.test.tsx:1-17
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.teamsManagerAPI = {
      getProfiles: jest.fn().mockResolvedValue(['TestProfile']),
      createProfile: jest.fn().mockResolvedValue({ success: true }),
      deleteProfile: jest.fn().mockResolvedValue({ success: true }),
      launchProfile: jest.fn().mockResolvedValue({ success: true }),
      getSettings: jest
        .fn()
        .mockResolvedValue({ onStartup: true, autoLaunch: true }),
      updateSettings: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should render and load profiles and settings on mount', async () => {
    render(<App />);

    expect(window.teamsManagerAPI.getSettings).toHaveBeenCalled();
    expect(window.teamsManagerAPI.getProfiles).toHaveBeenCalled();

    expect(await screen.findByText('TestProfile')).toBeInTheDocument();
    expect(screen.getByText('Run instances on startup')).toBeInTheDocument();
    expect(screen.getByText('Run app on startup')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.teamsManagerAPI.launchProfile).toHaveBeenCalledWith(
        'TestProfile'
      );
    });
  });
});
```

### 6.2 Linee Guida per Nuovi Test

1. **Mocking dell'Oggetto Globale `teamsManagerAPI`**:
   Configurare sempre il mock di `window.teamsManagerAPI` all'interno del blocco `beforeEach`, verificando le invocazioni IPC con asserzioni esplicite (`expect(window.teamsManagerAPI.<method>).toHaveBeenCalledWith(...)`).
2. **Copertura dei Flussi Asincroni e Casi di Errore**:
   - Utilizzare le utility asincrone di React Testing Library (`findBy*`, `waitFor`) per attendere l'aggiornamento dello stato dopo il completamento delle Promise simulate.
   - Verificare la comparsa del banner `ErrorBox` simulando fallimenti IPC (es. `mockResolvedValueOnce({ success: false, error: 'Name of the profile already used' })` o rigetto di promessa in caso di Teams aperto durante la cancellazione).
3. **Verifica della Sanitizzazione**:
   Scrivere test che simulino l'interazione utente (`fireEvent.change`) verificando che caratteri proibiti (`!@#$%^&*()`) vengano eliminati istantaneamente dal campo di input controllato prima dell'invio (`src/__tests__/App.test.tsx:34-56`).

---

## 7. Standard di Linting e Analisi Statica (Flat Config)

Il progetto adotta la specifica **ESLint Flat Config** (`eslint.config.mjs:1-120`) con architettura moderna compatibile nativamente con **ESLint 9 e ESLint 10** (range semver `^9.39.5 || ^10.0.0` per `eslint` in `package.json:184` e `@eslint/js` in `package.json:154`) per l'analisi statica del codice, la prevenzione dei difetti e l'uniformità stilistica dell'intero repository.

### 7.1 Adozione di ESLint Flat Config, Supporto ESLint 10 e Compatibilità TypeScript 5.9.3

La configurazione risiede centralmente in `eslint.config.mjs` ed è formalizzata come array di configurazioni conforme allo standard Flat Config di ESLint 9/10:

- **`eslint` e `@eslint/js` (`eslint.config.mjs:1, 57`, `package.json:154, 184`)**: forniscono il core engine e il set di raccomandazioni base per JavaScript moderno (`js.configs.recommended`), allineati al range `^9.39.5 || ^10.0.0`.
- **`typescript-eslint`, `@typescript-eslint/parser` e `@typescript-eslint/eslint-plugin` (`eslint.config.mjs:2, 58`, `package.json:167-168, 204`)**: adozione del tooling unificato v8 (`typescript-eslint: ^8.24.0`, `@typescript-eslint/parser: ^8.24.0`, `@typescript-eslint/eslint-plugin: ^8.24.0`) che estende le regole TypeScript raccomandate (`tseslint.configs.recommended`). Il tooling unificato e il parser AST `@typescript-eslint/typescript-estree` (v8.73.0) garantiscono supporto nativo sia a **TypeScript 5.9.3** (`package.json:203`, risolto alla v5.9.3 in `node_modules/typescript`) che a **ESLint 10** (`package.json:184`), operando con zero warning di versione o conflitti di compatibilità parser/ESTree durante l'analisi statica.
- **Ambiente Globale e Parser (`eslint.config.mjs:7, 68-79`)**: inclusione dei namespace globali `browser`, `node` ed `es2021` tramite `globals` (`package.json:190`), con supporto parser JSX attivato in `languageOptions.parserOptions.ecmaFeatures.jsx` (`eslint.config.mjs:70-72`).

### 7.2 Plugin Attivi e Integrazione Prettier

L'ecosistema di analisi statica include plugin specialistici configurati per i diversi ambiti dell'applicazione:

1. **`eslint-plugin-react` (`eslint.config.mjs:3, 62, 86`, `package.json:187`)**: analisi delle best practice e pattern React con rilevamento automatico della versione runtime installata (`settings.react.version: 'detect'`, `eslint.config.mjs:80-84`).
2. **`eslint-plugin-react-hooks` (`eslint.config.mjs:4, 63, 87`, `package.json:188`)**: verifica puntuale del rispetto delle regole dei React Hooks (`reactHooksPlugin.configs.recommended.rules`).
3. **`eslint-plugin-jest` (`eslint.config.mjs:5, 108, 116`, `package.json:186`)**: attivo con regole raccomandate esclusivamente sui file di test (`**/__tests__/**/*.{js,jsx,ts,tsx}`, `**/*.test.*`, `**/*.spec.*`, `eslint.config.mjs:102-106`), con iniezione dei globali di testing (`languageOptions.globals: globals.jest`, `eslint.config.mjs:110-114`).
4. **`eslint-config-prettier` (`eslint.config.mjs:6, 119`, `package.json:185`)**: collocato al termine della catena di configurazione per disattivare tutte le regole ESLint che potrebbero entrare in conflitto con Prettier.

### 7.3 Mappatura ed Eliminazione Completa dei File Legacy (`.eslintrc` e `.eslintignore`)

Con la migrazione integrale a Flat Config, tutti i meccanismi legacy basati su file a cascata sono stati interamente rimossi:

- **Eliminazione Radice di `.eslintrc.js` e `.eslintignore`**: la configurazione legacy CommonJS `.eslintrc.js` e il file `.eslintignore` presenti nella root del repository sono stati definitivamente rimossi. Tutti i pattern di esclusione e ignore sono ora centralizzati nell'oggetto iniziale `ignores` della Flat Config (`eslint.config.mjs:10-56`), coprendo directory di build (`dist/`, `.next/`, `release/`, `build/Release/`), artefatti intermedi (`.erb/`, `dll/`), cache (`.eslintcache`), log (`logs/`, `*.log`) e bundle generati (`*.prod.js`).
- **Eliminazione dei File Legacy Residui nei Sottodirettori**: rimozione e bonifica completa dei file residui `.eslintrc` annidati, specificamente `.erb/scripts/.eslintrc` e `.erb/configs/.eslintrc`. Nessuna configurazione legacy a cascata sopravvive nella codebase, eliminando il rischio di divergenze di regole o fallimenti durante il linting dei file di build Webpack o degli script ausiliari.

### 7.4 Regole Specifiche Mantenute

Le seguenti regole di progetto sono esplicitamente mantenute e vincolate in `eslint.config.mjs:88-98`:

| Regola                                              | Livello / Valore                                                                        | Motivazione Architetturale e Tecnica                                                                                                                                                                                                                                                           |
| :-------------------------------------------------- | :-------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react/react-in-jsx-scope`                          | `'off'`                                                                                 | Disattivata in quanto superflua con il nuovo JSX Transform introdotto da React 17+ e confermato in React 19.3.1 (`eslint.config.mjs:88`).                                                                                                                                                      |
| `react/prop-types`                                  | `'off'`                                                                                 | Disattivata in quanto il progetto adotta TypeScript su tutta la codebase: la convalida dei tipi delle prop dei componenti React è garantita staticamente a compile-time da interfacce e tipi TS, rendendo ridondante e superflua la runtime validation con PropTypes (`eslint.config.mjs:89`). |
| `@typescript-eslint/explicit-function-return-type`  | `'off'`                                                                                 | Disattivata per favorire l'inferenza di tipo automatica su componenti React e funzioni ausiliarie locali, evitando ridondanze (`eslint.config.mjs:90`).                                                                                                                                        |
| `@typescript-eslint/explicit-module-boundary-types` | `'off'`                                                                                 | Disattivata per garantire flessibilità sui confini di modulo interni per le signature dei componenti (`eslint.config.mjs:91`).                                                                                                                                                                 |
| `@typescript-eslint/no-var-requires`                | `'off'`                                                                                 | Disattivata per consentire costrutti `require` negli script di build Webpack, Babel e configurazioni native di Electron (`eslint.config.mjs:92`).                                                                                                                                              |
| `@typescript-eslint/no-require-imports`             | `'off'`                                                                                 | Disattivata per preservare la compatibilità con moduli CommonJS e import condizionali nell'ambiente Node/Electron (`eslint.config.mjs:93`).                                                                                                                                                    |
| `@typescript-eslint/no-unused-vars`                 | `['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }]` | Segnala variabili non utilizzate, tollerando identificatori e argomenti intenzionalmente ignorati con prefisso `_` (`eslint.config.mjs:94-97`).                                                                                                                                                |
| `no-param-reassign`                                 | `['error', { props: false }]`                                                           | Errore in caso di riassegnazione diretta dei parametri di funzione, consentendo tuttavia la mutazione delle proprietà di oggetti passati come argomenti (`eslint.config.mjs:98`).                                                                                                              |

### 7.5 Comandi di Esecuzione, Gestione della Cache e Integrazione Pre-Commit (`lint-staged`)

- **Esecuzione Manuale, Pipeline CI/CD e Persistenza Cache (`package.json:11`)**:
  ```bash
  npm run lint
  ```
  Lo script `lint` esegue `eslint . --cache`, abilitando la persistenza della cache tramite il file `.eslintcache` (`eslint.config.mjs:36`). Questo meccanismo garantisce:
  1. **Ottimizzazione Locale e CI/CD**: riduce drasticamente i tempi di esecuzione sia durante lo sviluppo quotidiano che nei runner di continuous integration, limitando la validazione ai soli file modificati o non ancora analizzati.
  2. **Isolamento della Cache**: il file `.eslintcache` è rigorosamente incluso nelle direttive `ignores` di `eslint.config.mjs:36` e nel `.gitignore` di progetto, evitando che venga tracciato in Git.
- **Validazione Automatica Pre-Commit (`package.json:22-25, 255-259`)**:
  Grazie alla cooperazione tra `husky` (hook `pre-commit`) e `lint-staged`, ogni commit Git valida automaticamente i soli file JavaScript/TypeScript in staging prima di procedere:
  ```json
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --cache"
    ]
  }
  ```
  L'uso congiunto dell'argomento `--cache` all'interno di `lint-staged` e dello script di build assicura coerenza totale, prevenendo l'introduzione di regressioni o difetti stilistici senza impattare la reattività del developer workflow.
