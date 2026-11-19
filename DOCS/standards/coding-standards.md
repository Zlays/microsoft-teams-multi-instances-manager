# Standard di Sviluppo e Convenzioni di Codice

Questo documento stabilisce le linee guida obbligatorie per lo sviluppo, la formattazione, la gestione dello stato, la sicurezza degli input e il testing unitario all'interno del progetto `microsoft-teams-instances-manager`.

---

## 1. Convenzioni TypeScript e Tipizzazione delle Interfacce

Il progetto adotta TypeScript con configurazione rigorosa in `tsconfig.json`. È fatto obbligo di tipizzare esplicitamente tutte le strutture di dati condivise, lo stato React e le proprietà dei componenti grafici.

### 1.1 Definizione dei Contratti di Dati
Tutti i modelli di configurazione e opzioni devono essere formalizzati tramite interfacce TypeScript dedicate.

Esempio di riferimento per le impostazioni applicative (`src/App.tsx:21-24`):
```typescript
interface Settings {
  onStartup: boolean;   // Flag di esecuzione simultanea dei profili al boot
  autoLaunch: boolean;  // Flag di registrazione nel registro di avvio di Windows
}
```

### 1.2 Regole di Tipizzazione
1. **Evitare `any`**: L'uso del tipo `any` è severamente scoraggiato; nei casi di tipo non immediatamente noto, utilizzare `unknown` con type guarding, oppure generici parametrici.
2. **Tipizzazione delle Props dei Componenti**:
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

## 2. Struttura Modulare dei Componenti React e Styling

### 2.1 Pattern dei Componenti Funzionali
I componenti grafici devono risiedere sotto la directory `src/components/` ed essere strutturati secondo il paradigma funzionale di React (FC) con destrutturazione esplicita delle props:
- **Separazione delle Responsabilità**: I componenti di visualizzazione (`Profile.tsx`, `Button.tsx`, `ErrorBox.tsx`) non devono accedere direttamente al filesystem o a moduli nativi di sistema operativo, delegando tali azioni al container genitore (`Main` in `src/App.tsx:26`) tramite callback tipizzati.
- **Rendering Condizionale Pulito**: I componenti che possono non avere output visivo (come i banner di errore) devono incapsulare la condizione internamente (`src/components/ErrorBox.tsx:23`):
  ```typescript
  function ErrorBox(props: Props) {
    const { text } = props;
    return <>{text ? <ErrorBoxCSS>{text}</ErrorBoxCSS> : null}</>;
  }
  ```

### 2.2 Styling tramite `styled-components`
L'applicazione utilizza `styled-components` per il CSS-in-JS incapsulato:
- **Primitive di Layout Riutilizzabili**: Le definizioni di Flexbox condivise risiedono in `src/components/FlexCSS.tsx` (`Root`, `Row`, `FlexItem`, `FlexBottomItem`, `LeftFlexTextCSS`).
- **Trattamento dell'Overflow di Testo**: Nomi di profilo particolarmente lunghi devono preservare il layout orizzontale mediante ellissi CSS (`src/components/FlexCSS.tsx:40-48`):
  ```typescript
  const LeftFlexTextCSS = styled(FlexItem)`
    display: inline-block;
    flex-grow: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  ```
- **Feedback Visivo degli Elementi Interattivi**: Tutti i pulsanti devono definire chiaramente gli stati `:hover` e `:active` (`src/components/Button.tsx:18-25`).

---

## 3. Sanitizzazione Obbligatoria degli Input Utente

Poiché i nomi dei profili vengono utilizzati per creare cartelle su disco e comporre comandi di avvio shell, la sanitizzazione tempestiva è un vincolo architetturale non negoziabile.

### 3.1 Funzione `inputValidator` (`src/utils/Validator.tsx:1-4`)
```typescript
const regex = new RegExp('[^a-zA-Z0-9 ]');

export default function inputValidator(text: string): string {
  return text.replace(regex, '');
}
```

### 3.2 Regole di Enforcement
1. **Sanitizzazione in Tempo Reale (`Controlled Input`)**:
   In `src/App.tsx:189-191`, l'evento `onChange` del campo di input deve filtrare immediatamente i caratteri digitati:
   ```typescript
   function handleProfileNameBox({ target }) {
     setProfileNameBox(() => inputValidator(target.value));
   }
   ```
2. **Whitelist dei Caratteri Ammessi**:
   Sono consentite unicamente le lettere minuscole e maiuscole (`a-z`, `A-Z`), i numeri (`0-9`) e lo spazio (` `). Qualsiasi altro carattere (inclusi simboli di path traversal `../`, caratteri riservati NTFS `\/:*?"<>|` e caratteri di concatenazione shell `;|&$`) viene eliminato prima che il testo possa raggiungere lo stato dell'applicazione.
3. **Controllo Trim e Non-Vuoto**:
   Prima di creare una directory su disco, il nome del profilo deve essere verificato con `profileName.trim()` (`src/App.tsx:165, 168`).

---

## 4. Logging Applicativo Strutturato

Tutti gli eventi operativi, gli errori del filesystem, le configurazioni caricate e l'avvio delle istanze devono essere tracciati tramite il modulo centralizzato `src/utils/Logger.tsx:20`.

### 4.1 Livelli di Log e Destinazione
Il logger si interfaccia con `electron-log` configurando la scrittura persistente su disco nel file `logs/log.log` (`src/utils/Logger.tsx:5`).

| Livello | Metodo / Caso d'Uso | Esempio nel Codice |
| :--- | :--- | :--- |
| `info` | Notifiche informative sulle impostazioni o avanzamento updater. | `Logger('config loaded: ...', 'info')` |
| `debug` | Azioni ordinarie di caricamento, creazione ed eliminazione cartelle. | `Logger('profile loaded: AziendaA')` |
| `error` | Errori del filesystem (`fs.mkdir`, `fs.writeFile`, `fs.readdir`, `fs.rmdir`). | `Logger(err, 'error')` |

### 4.2 Inizializzazione Autonoma
Il modulo `Logger.tsx` garantisce la preventiva creazione della directory `logs/` prima di qualsiasi tentativo di scrittura (`src/utils/Logger.tsx:7-18`), evitando eccezioni non gestite al primo avvio.

---

## 5. Standard di Test Unitari

La suite di testing automatico è basata su **Jest** e **React Testing Library** con configurazione standard definita in `package.json` ed eseguibile tramite `yarn test`.

### 5.1 Test di Rendering e Montaggio (`src/__tests__/App.test.tsx:1-10`)
Tutti i componenti radice e i singoli componenti visivi devono disporre di test di mount per verificare che l'albero DOM venga generato senza errori a runtime:
```typescript
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('should render', () => {
    expect(render(<App />)).toBeTruthy();
  });
});
```

### 5.2 Linee Guida per Nuovi Test
1. **Mocking dei Moduli Nativi**:
   Dato che il componente `Main` invoca `fs` e `child_process`, i test unitari approfonditi devono utilizzare i mock di Jest per simulare le risposte del filesystem (`jest.mock('fs')`) e della shell (`jest.mock('child_process')`).
2. **Copertura dei Casi di Errore**:
   Implementare scenari di test che verifichino la comparsa del banner `ErrorBox` al tentativo di inserimento di un profilo duplicato o in caso di errore di eliminazione cartella.
3. **Verifica della Sanitizzazione**:
   Scrivere test unitari dedicati per `Validator.tsx` verificando che stringhe malevole (es. `Profilo; rm -rf /`, `Test/../Tenant`) vengano trasformate correttamente in stringhe innocue e valide (`Profilo rm -rf `, `TestTenant`).
