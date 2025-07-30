# setup-agibilita.ps1 - Setup completo sistema modulare
# Esegui con: PowerShell -ExecutionPolicy Bypass -File setup-agibilita.ps1

Write-Host "🚀 SETUP SISTEMA AGIBILITÀ MODULARE" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Definisci i contenuti dei file
$fileContents = @{
    # === CORE MODULES ===
    "js\modules\core\state-management.js" = @"
// Gestione stato globale
import { DebugSystem } from '../../utils/debug-system.js';

export class StateManager {
    constructor() {
        this.state = {
            selectedArtists: [],
            agibilitaData: {
                isModifica: false,
                codiceAgibilita: null,
                numeroRiservato: null,
                reservationId: null,
                numeroProgressivo: null
            },
            currentSection: 'tipoSection',
            currentBozzaId: null,
            currentRichiestaId: null,
            userSession: {},
            
            // Database cache
            artistsDB: [],
            agibilitaDB: [],
            venuesDB: [],
            invoiceDB: [],
            bozzeDB: [],
            richiesteDB: []
        };
        
        this.listeners = new Map();
        DebugSystem.log('STATE', '🗄️ StateManager inizializzato');
    }
    
    get(key) {
        const value = this.state[key];
        DebugSystem.log('STATE', `📖 Get: `${key}`, Array.isArray(value) ? `Array(`${value.length})` : typeof value);
        return value;
    }
    
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        DebugSystem.log('STATE', `💾 Set: `${key}`, { 
            old: Array.isArray(oldValue) ? `Array(`${oldValue.length})` : typeof oldValue, 
            new: Array.isArray(value) ? `Array(`${value.length})` : typeof value 
        });
        
        // Notifica listeners
        this.notifyListeners(key, value, oldValue);
    }
    
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        DebugSystem.log('STATE', `🔔 Nuovo listener per: `${key}`);
    }
    
    unsubscribe(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
            DebugSystem.log('STATE', `🔕 Listener rimosso per: `${key}`);
        }
    }
    
    notifyListeners(key, newValue, oldValue) {
        if (this.listeners.has(key)) {
            const listeners = this.listeners.get(key);
            DebugSystem.log('STATE', `📢 Notifica `${listeners.size}` listeners per: `${key}`);
            
            listeners.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    DebugSystem.error('STATE', `❌ Errore listener per `${key}`:`, error);
                }
            });
        }
    }
    
    reset() {
        DebugSystem.log('STATE', '🧹 Reset completo dello stato');
        this.set('selectedArtists', []);
        this.set('currentBozzaId', null);
        this.set('currentRichiestaId', null);
        this.set('currentSection', 'tipoSection');
        this.set('agibilitaData', {
            isModifica: false,
            codiceAgibilita: null,
            numeroRiservato: null,
            reservationId: null,
            numeroProgressivo: null
        });
    }
    
    getDebugInfo() {
        return {
            stateKeys: Object.keys(this.state),
            listenersCount: this.listeners.size,
            selectedArtistsCount: this.state.selectedArtists.length,
            currentSection: this.state.currentSection,
            hasReservedNumber: !!this.state.agibilitaData.numeroRiservato
        };
    }
}
"@

    # === DEBUG SYSTEM ===
    "js\utils\debug-system.js" = @"
// Sistema di debug zonale
export class DebugSystem {
    static zones = {
        CORE: 'core',
        ARTISTS: 'artists',
        LOCATIONS: 'locations', 
        XML: 'xml',
        DRAFTS: 'drafts',
        REQUESTS: 'requests',
        UI: 'ui',
        EVENTS: 'events',
        STATE: 'state'
    };
    
    static enabledZones = new Set();
    static allEnabled = false;
    static logHistory = [];
    static maxHistorySize = 100;
    
    static enable(zone) {
        this.enabledZones.add(zone);
        console.log(`🔧 Debug enabled for zone: `${zone}`);
    }
    
    static enableAll() {
        this.allEnabled = true;
        console.log('🔧 Debug enabled for ALL zones');
        console.log('📊 Available zones:', Object.values(this.zones));
    }
    
    static disable(zone) {
        this.enabledZones.delete(zone);
        console.log(`🔇 Debug disabled for zone: `${zone}`);
    }
    
    static disableAll() {
        this.allEnabled = false;
        this.enabledZones.clear();
        console.log('🔇 Debug disabled for all zones');
    }
    
    static isEnabled(zone) {
        return this.allEnabled || this.enabledZones.has(zone);
    }
    
    static log(zone, message, data = null) {
        if (this.isEnabled(zone)) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp,
                zone,
                message,
                data,
                type: 'log'
            };
            
            this.addToHistory(logEntry);
            
            const prefix = `[`${timestamp}`][`${zone.toUpperCase()}`]`;
            
            if (data !== null && data !== undefined) {
                console.log(`{prefix} `${message}`, data);
            } else {
                console.log(`{prefix} `${message}`);
            }
        }
    }
    
    static error(zone, message, error = null) {
        if (this.isEnabled(zone)) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp,
                zone,
                message,
                data: error,
                type: 'error'
            };
            
            this.addToHistory(logEntry);
            
            const prefix = `[`${timestamp}`][`${zone.toUpperCase()}`][ERROR]`;
            
            if (error !== null) {
                console.error(`{prefix} `${message}`, error);
            } else {
                console.error(`{prefix} `${message}`);
            }
        }
    }
    
    static warn(zone, message, data = null) {
        if (this.isEnabled(zone)) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp,
                zone,
                message,
                data,
                type: 'warn'
            };
            
            this.addToHistory(logEntry);
            
            const prefix = `[`${timestamp}`][`${zone.toUpperCase()}`][WARN]`;
            
            if (data !== null) {
                console.warn(`{prefix} `${message}`, data);
            } else {
                console.warn(`{prefix} `${message}`);
            }
        }
    }
    
    static addToHistory(logEntry) {
        this.logHistory.push(logEntry);
        
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
    }
    
    static getHistory(zone = null, type = null) {
        let filtered = this.logHistory;
        
        if (zone) {
            filtered = filtered.filter(entry => entry.zone === zone);
        }
        
        if (type) {
            filtered = filtered.filter(entry => entry.type === type);
        }
        
        return filtered;
    }
    
    static clearHistory() {
        this.logHistory = [];
        console.log('🧹 Debug history cleared');
    }
    
    static showStats() {
        const stats = {
            totalLogs: this.logHistory.length,
            byZone: {},
            byType: {}
        };
        
        this.logHistory.forEach(entry => {
            stats.byZone[entry.zone] = (stats.byZone[entry.zone] || 0) + 1;
            stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
        });
        
        console.table(stats);
        return stats;
    }
}

// Auto-enable per development
if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('dev')) {
        
        DebugSystem.enableAll();
        
        window.DebugSystem = DebugSystem;
        window.debugAgobilita = {
            stats: () => DebugSystem.showStats(),
            history: (zone, type) => DebugSystem.getHistory(zone, type),
            clear: () => DebugSystem.clearHistory(),
            enable: (zone) => DebugSystem.enable(zone),
            disable: (zone) => DebugSystem.disable(zone)
        };
        
        console.log('🛠️ Debug utilities available at window.debugAgobilita');
    }
}
"@

    # === MAIN ENTRY POINT (versione compatta) ===
    "js\agibilita-main.js" = @"
// Entry point principale del sistema agibilità modulare
import { SystemInitializer } from './modules/core/initialization.js';
import { StateManager } from './modules/core/state-management.js';
import { EventManager } from './modules/core/event-handlers.js';
import { DebugSystem } from './utils/debug-system.js';

class AgibilitaSystem {
    constructor() {
        this.state = new StateManager();
        this.events = new EventManager(this.state);
        this.modules = new Map();
        this.initialized = false;
        
        DebugSystem.log('CORE', '🚀 AgibilitaSystem costruito');
    }
    
    async initialize() {
        if (this.initialized) return;
        
        DebugSystem.log('CORE', '🔧 Inizializzazione sistema agibilità...');
        
        try {
            await SystemInitializer.init(this.state);
            this.events.setupGlobalListeners();
            this.setupGlobalFunctions();
            
            this.initialized = true;
            DebugSystem.log('CORE', '✅ Sistema agibilità inizializzato');
            
            if (window.showToast) {
                window.showToast('Sistema caricato correttamente', 'success', 2000);
            }
            
        } catch (error) {
            DebugSystem.error('CORE', '❌ Errore inizializzazione:', error);
            throw error;
        }
    }
    
    setupGlobalFunctions() {
        window.startNewAgibilita = () => this.handleAction('startNewAgibilita');
        window.showEditAgibilita = () => this.handleAction('showEditAgibilita');
        window.showBozzeRichieste = () => this.handleAction('showBozzeRichieste');
        window.showSection = (sectionId) => this.showSection(sectionId);
        window.saveBozza = () => this.handleAction('saveBozza');
    }
    
    async handleAction(action, data = {}) {
        DebugSystem.log('CORE', `⚡ Handling action: `${action}`, data);
        
        switch(action) {
            case 'startNewAgibilita':
                this.state.reset();
                this.showSection('step1');
                if (window.showToast) window.showToast('Inizia selezionando gli artisti', 'info');
                break;
                
            case 'showEditAgibilita':
                this.showSection('editListSection');
                break;
                
            case 'showBozzeRichieste':
                this.showSection('bozzeRichiesteSection');
                break;
                
            case 'saveBozza':
                if (window.showToast) window.showToast('Funzione salvataggio in sviluppo', 'warning');
                break;
        }
    }
    
    showSection(sectionId) {
        document.querySelectorAll('.step-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.state.set('currentSection', sectionId);
        }
    }
    
    getSystemInfo() {
        return {
            initialized: this.initialized,
            modulesLoaded: Array.from(this.modules.keys()),
            currentSection: this.state.get('currentSection'),
            selectedArtistsCount: this.state.get('selectedArtists').length
        };
    }
}

// Inizializzazione globale
document.addEventListener('DOMContentLoaded', async () => {
    DebugSystem.log('CORE', '🌐 DOM Ready - Inizializzazione...');
    
    try {
        const system = new AgibilitaSystem();
        await system.initialize();
        
        window.agibilitaSystem = system;
        
        // Debug utilities
        if (window.location.hostname === 'localhost') {
            window.agibilitaDebug = {
                system: () => system.getSystemInfo(),
                modules: () => Array.from(system.modules.keys()),
                state: () => system.state.getDebugInfo()
            };
        }
        
        DebugSystem.log('CORE', '🎉 Sistema pronto!');
        
    } catch (error) {
        DebugSystem.error('CORE', '💥 Errore critico:', error);
        document.body.innerHTML += `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 10001; max-width: 500px;">
                <h3 style="color: #dc3545;">⚠️ Errore Sistema</h3>
                <p>Errore nell'inizializzazione: `${error.message}`</p>
                <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px;">
                    🔄 Ricarica
                </button>
            </div>
        `;
    }
});

export default AgibilitaSystem;
"@

    # === PLACEHOLDER FILES ===
    "js\modules\core\event-handlers.js" = @"
// Event handlers - PLACEHOLDER
import { DebugSystem } from '../../utils/debug-system.js';

export class EventManager {
    constructor(stateManager) {
        this.state = stateManager;
        DebugSystem.log('EVENTS', '🎧 EventManager inizializzato');
    }
    
    setupGlobalListeners() {
        DebugSystem.log('EVENTS', '🎧 Setup global listeners...');
        
        document.addEventListener('click', (e) => {
            const typeCard = e.target.closest('.type-card[data-action]');
            if (typeCard) {
                e.preventDefault();
                const action = typeCard.getAttribute('data-action');
                DebugSystem.log('EVENTS', `🖱️ Type card: `${action}`);
                
                if (window.agibilitaSystem) {
                    window.agibilitaSystem.handleAction(action);
                }
            }
        });
        
        DebugSystem.log('EVENTS', '✅ Global listeners configurati');
    }
}
"@

    "js\modules\core\initialization.js" = @"
// Inizializzazione sistema - PLACEHOLDER
import { DebugSystem } from '../../utils/debug-system.js';

export class SystemInitializer {
    static async init(stateManager) {
        DebugSystem.log('CORE', '🔧 Inizializzazione core...');
        
        // Setup dati mock di base
        stateManager.set('artistsDB', [
            {
                id: 1,
                nome: 'Mario',
                cognome: 'Rossi',
                codice_fiscale: 'RSSMRA80A01H501Z',
                mansione: 'DJ'
            }
        ]);
        
        stateManager.set('agibilitaDB', []);
        stateManager.set('bozzeDB', []);
        
        // Setup UI base
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 300);
        }
        
        // Mostra sezione tipo
        const tipoSection = document.getElementById('tipoSection');
        if (tipoSection) {
            tipoSection.classList.add('active');
        }
        
        DebugSystem.log('CORE', '✅ Core inizializzato');
    }
}
"@
}

# Crea i file con contenuto
Write-Host "📁 Creazione file con contenuto..." -ForegroundColor Yellow

foreach ($file in $fileContents.Keys) {
    $fullPath = Join-Path "agibilita" $file
    $directory = Split-Path $fullPath -Parent
    
    # Crea directory se non esiste
    if (!(Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    
    # Scrivi contenuto
    $fileContents[$file] | Out-File -FilePath $fullPath -Encoding UTF8
    Write-Host "✅ $file" -ForegroundColor Green
}

# Crea file vuoti rimanenti
Write-Host "`n📄 Creazione file placeholder..." -ForegroundColor Yellow

$placeholderFiles = @(
    "js\modules\artists\artist-manager.js",
    "js\modules\artists\artist-search.js",
    "js\modules\artists\artist-validation.js",
    "js\modules\artists\artist-list.js",
    "js\modules\locations\location-manager.js",
    "js\modules\locations\location-loader.js",
    "js\modules\locations\venue-search.js",
    "js\modules\locations\invoice-data.js",
    "js\modules\xml\xml-manager.js",
    "js\modules\xml\xml-generator.js",
    "js\modules\xml\xml-validation.js",
    "js\modules\xml\xml-intermittenti.js",
    "js\modules\drafts\draft-manager.js",
    "js\modules\drafts\autosave.js",
    "js\modules\drafts\lock-system.js",
    "js\modules\requests\request-manager.js",
    "js\modules\requests\request-tabs.js",
    "js\modules\requests\request-filters.js",
    "js\modules\ui\ui-manager.js",
    "js\modules\ui\navigation.js",
    "js\modules\ui\modals.js",
    "js\modules\ui\toast-system.js",
    "js\modules\ui\progress-bar.js",
    "js\utils\database-helper.js",
    "js\utils\form-utils.js",
    "js\utils\validation-utils.js"
)

foreach ($file in $placeholderFiles) {
    $fullPath = Join-Path "agibilita" $file
    
    if (!(Test-Path $fullPath)) {
        $placeholder = @"
// $($file -replace 'js\\modules\\|js\\utils\\', '' -replace '\\', '/' -replace '.js', '') - PLACEHOLDER
// TODO: Implementare funzionalità

console.log('📦 Modulo caricato: $($file -replace 'js\\', '')');

// Export default per compatibilità 
export default class {
    constructor() {
        console.log('🔧 Placeholder class inizializzata');
    }
}
"@
        
        $placeholder | Out-File -FilePath $fullPath -Encoding UTF8
        Write-Host "📄 $file" -ForegroundColor Gray
    }
}

# Crea configurazioni VS Code
Write-Host "`n⚙️  Creazione configurazioni VS Code..." -ForegroundColor Yellow

$vscodeSettings = @"
{
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "editor.detectIndentation": false,
    "editor.wordWrap": "on",
    "explorer.fileNesting.enabled": true,
    "explorer.fileNesting.patterns": {
        "agibilita-main.js": "modules/*, utils/*"
    },
    "files.associations": {
        "*.js": "javascript"
    }
}
"@

$vscodeTasks = @"
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start Dev Server",
            "type": "shell",
            "command": "python",
            "args": ["-m", "http.server", "8000"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "panel": "new"
            }
        }
    ]
}
"@

New-Item -ItemType Directory -Path "agibilita\.vscode" -Force | Out-Null
$vscodeSettings | Out-File -FilePath "agibilita\.vscode\settings.json" -Encoding UTF8
$vscodeTasks | Out-File -FilePath "agibilita\.vscode\tasks.json" -Encoding UTF8

Write-Host "✅ .vscode\settings.json" -ForegroundColor Green
Write-Host "✅ .vscode\tasks.json" -ForegroundColor Green

# Crea README
$readme = @"
# Sistema Agibilità RECORP - Versione Modulare

## 🚀 Setup Completato!

### Struttura Creata:
- ✅ Moduli Core (state, events, initialization)  
- ✅ Sistema Debug zonale
- ✅ Entry point principale
- ✅ Placeholder per tutti i moduli
- ✅ Configurazioni VS Code

### Test Immediato:
```bash
cd agibilita
python -m http.server 8000
# Apri: http://localhost:8000/agibilita.html
```

### Debug Console:
```javascript
window.agibilitaDebug.system()  // Info sistema
DebugSystem.showStats()         // Statistiche debug
```

### Prossimi Step:
1. Sostituire agibilita.html con versione modulare
2. Testare navigazione tra sezioni
3. Migrare funzioni esistenti nei moduli appropriati

Creato il: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$readme | Out-File -FilePath "agibilita\README.md" -Encoding UTF8
Write-Host "✅ README.md" -ForegroundColor Green

Write-Host "`n🎉 SETUP COMPLETATO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "✅ File principali creati con contenuto funzionante" -ForegroundColor Green
Write-Host "✅ Placeholder per migrazione graduale" -ForegroundColor Green  
Write-Host "✅ Configurazioni VS Code" -ForegroundColor Green
Write-Host "`n📋 PROSSIMI STEP:" -ForegroundColor Yellow
Write-Host "1. cd agibilita" -ForegroundColor White
Write-Host "2. code . (apri in VS Code)" -ForegroundColor White
Write-Host "3. Sostituisci agibilita.html con versione modulare" -ForegroundColor White
Write-Host "4. python -m http.server 8000" -ForegroundColor White
Write-Host "5. Apri http://localhost:8000/agibilita.html" -ForegroundColor White

Write-Host "`n🔧 DEBUG CONSOLE:" -ForegroundColor Cyan  
Write-Host "window.agibilitaDebug.system()" -ForegroundColor White
Write-Host "DebugSystem.showStats()" -ForegroundColor White