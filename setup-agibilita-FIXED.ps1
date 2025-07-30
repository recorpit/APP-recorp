# setup-agibilita-FIXED.ps1 - Script PowerShell Corretto
# Esegui con: PowerShell -ExecutionPolicy Bypass -File setup-agibilita-FIXED.ps1

Write-Host "🚀 SETUP SISTEMA AGIBILITÀ MODULARE" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Vai nella cartella agibilita
if (Test-Path "agibilita") {
    Write-Host "✅ Cartella agibilita trovata" -ForegroundColor Green
} else {
    Write-Host "❌ Cartella agibilita non trovata - Creazione..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "agibilita" -Force | Out-Null
}

Set-Location "agibilita"

Write-Host "📁 Creazione struttura moduli..." -ForegroundColor Yellow

# Crea tutte le cartelle necessarie
$folders = @(
    "js\modules\core",
    "js\modules\artists", 
    "js\modules\locations",
    "js\modules\xml",
    "js\modules\drafts",
    "js\modules\requests",
    "js\modules\ui",
    "js\utils",
    ".vscode"
)

foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "📂 $folder" -ForegroundColor Gray
    }
}

Write-Host "📄 Creazione file principali..." -ForegroundColor Yellow

# === DEBUG SYSTEM ===
$debugContent = @'
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
    
    static enableAll() {
        this.allEnabled = true;
        console.log('🔧 Debug enabled for ALL zones');
    }
    
    static enable(zone) {
        this.enabledZones.add(zone);
        console.log(`🔧 Debug enabled for: ${zone}`);
    }
    
    static log(zone, message, data = null) {
        if (this.allEnabled || this.enabledZones.has(zone)) {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}][${zone.toUpperCase()}]`;
            
            if (data !== null) {
                console.log(`${prefix} ${message}`, data);
            } else {
                console.log(`${prefix} ${message}`);
            }
        }
    }
    
    static error(zone, message, error = null) {
        if (this.allEnabled || this.enabledZones.has(zone)) {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}][${zone.toUpperCase()}][ERROR]`;
            
            if (error !== null) {
                console.error(`${prefix} ${message}`, error);
            } else {
                console.error(`${prefix} ${message}`);
            }
        }
    }
    
    static warn(zone, message, data = null) {
        if (this.allEnabled || this.enabledZones.has(zone)) {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}][${zone.toUpperCase()}][WARN]`;
            
            if (data !== null) {
                console.warn(`${prefix} ${message}`, data);
            } else {
                console.warn(`${prefix} ${message}`);
            }
        }
    }
}

// Auto-enable per development
if (typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    DebugSystem.enableAll();
    window.DebugSystem = DebugSystem;
}
'@

$debugContent | Out-File -FilePath "js\utils\debug-system.js" -Encoding UTF8
Write-Host "✅ js\utils\debug-system.js" -ForegroundColor Green

# === STATE MANAGER ===
$stateContent = @'
// Gestione stato globale
import { DebugSystem } from '../../utils/debug-system.js';

export class StateManager {
    constructor() {
        this.state = {
            selectedArtists: [],
            agibilitaData: {
                isModifica: false,
                codiceAgibilita: null,
                numeroRiservato: null
            },
            currentSection: 'tipoSection',
            artistsDB: [],
            agibilitaDB: [],
            bozzeDB: [],
            richiesteDB: []
        };
        
        this.listeners = new Map();
        DebugSystem.log('STATE', '🗄️ StateManager inizializzato');
    }
    
    get(key) {
        return this.state[key];
    }
    
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        DebugSystem.log('STATE', `💾 Set: ${key}`);
        this.notifyListeners(key, value, oldValue);
    }
    
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }
    
    notifyListeners(key, newValue, oldValue) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    DebugSystem.error('STATE', `❌ Errore listener per ${key}`, error);
                }
            });
        }
    }
    
    reset() {
        DebugSystem.log('STATE', '🧹 Reset stato');
        this.set('selectedArtists', []);
        this.set('currentSection', 'tipoSection');
        this.set('agibilitaData', {
            isModifica: false,
            codiceAgibilita: null,
            numeroRiservato: null
        });
    }
    
    getDebugInfo() {
        return {
            stateKeys: Object.keys(this.state),
            selectedArtistsCount: this.state.selectedArtists.length,
            currentSection: this.state.currentSection
        };
    }
}
'@

$stateContent | Out-File -FilePath "js\modules\core\state-management.js" -Encoding UTF8
Write-Host "✅ js\modules\core\state-management.js" -ForegroundColor Green

# === EVENT HANDLERS ===
$eventContent = @'
// Gestione eventi centrali
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
                DebugSystem.log('EVENTS', `🖱️ Type card clicked: ${action}`);
                
                if (window.agibilitaSystem) {
                    window.agibilitaSystem.handleAction(action);
                }
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                DebugSystem.log('EVENTS', '⌨️ Ctrl+S pressed');
            }
            
            if (e.key === 'Escape') {
                DebugSystem.log('EVENTS', '⌨️ Escape pressed');
                this.closeAllModals();
            }
        });
        
        DebugSystem.log('EVENTS', '✅ Global listeners configurati');
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
}
'@

$eventContent | Out-File -FilePath "js\modules\core\event-handlers.js" -Encoding UTF8
Write-Host "✅ js\modules\core\event-handlers.js" -ForegroundColor Green

# === INITIALIZATION ===
$initContent = @'
// Inizializzazione sistema
import { DebugSystem } from '../../utils/debug-system.js';

export class SystemInitializer {
    static async init(stateManager) {
        DebugSystem.log('CORE', '🔧 Inizializzazione core systems...');
        
        try {
            await this.checkDependencies();
            await this.loadInitialData(stateManager);
            await this.setupInitialUI();
            DebugSystem.log('CORE', '✅ Core systems inizializzati');
        } catch (error) {
            DebugSystem.error('CORE', '❌ Errore inizializzazione core:', error);
            throw error;
        }
    }
    
    static async checkDependencies() {
        const services = ['DatabaseService', 'AuthGuard', 'GIDatabase'];
        
        services.forEach(service => {
            if (window[service]) {
                DebugSystem.log('CORE', `✅ Servizio disponibile: ${service}`);
            } else {
                DebugSystem.warn('CORE', `⚠️ Servizio mancante: ${service}`);
            }
        });
    }
    
    static async loadInitialData(stateManager) {
        DebugSystem.log('CORE', '📥 Caricamento dati iniziali...');
        
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
        stateManager.set('richiesteDB', []);
    }
    
    static async setupInitialUI() {
        DebugSystem.log('CORE', '🎨 Setup UI iniziale...');
        
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
        
        const tipoSection = document.getElementById('tipoSection');
        if (tipoSection) {
            tipoSection.classList.add('active');
        }
        
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dataInizio = document.getElementById('dataInizio');
        const dataFine = document.getElementById('dataFine');
        
        if (dataInizio) dataInizio.value = today;
        if (dataFine) dataFine.value = tomorrow.toISOString().split('T')[0];
    }
}
'@

$initContent | Out-File -FilePath "js\modules\core\initialization.js" -Encoding UTF8
Write-Host "✅ js\modules\core\initialization.js" -ForegroundColor Green

# === MAIN SYSTEM ===
$mainContent = @'
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
            DebugSystem.log('CORE', '✅ Sistema inizializzato');
            
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
        DebugSystem.log('CORE', `⚡ Handling action: ${action}`, data);
        
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

document.addEventListener('DOMContentLoaded', async () => {
    DebugSystem.log('CORE', '🌐 DOM Ready - Inizializzazione...');
    
    try {
        const system = new AgibilitaSystem();
        await system.initialize();
        
        window.agibilitaSystem = system;
        
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
    }
});

export default AgibilitaSystem;
'@

$mainContent | Out-File -FilePath "js\agibilita-main.js" -Encoding UTF8
Write-Host "✅ js\agibilita-main.js" -ForegroundColor Green

Write-Host "📄 Creazione file placeholder..." -ForegroundColor Yellow

# Crea file placeholder per i moduli rimanenti
$placeholderFiles = @(
    "js\modules\artists\artist-manager.js",
    "js\modules\artists\artist-search.js",
    "js\modules\locations\location-manager.js",
    "js\modules\xml\xml-generator.js",
    "js\modules\drafts\draft-manager.js",
    "js\modules\ui\toast-system.js"
)

foreach ($file in $placeholderFiles) {
    $placeholder = "// Placeholder module`nexport default class { constructor() { console.log('📦 Modulo caricato'); } }"
    $placeholder | Out-File -FilePath $file -Encoding UTF8
    Write-Host "📄 $file" -ForegroundColor Gray
}

Write-Host "⚙️ Creazione configurazioni VS Code..." -ForegroundColor Yellow

# VS Code Settings (usando Here-String per evitare problemi JSON)
$vscodeSettings = @'
{
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "editor.wordWrap": "on",
    "explorer.fileNesting.enabled": true
}
'@

$vscodeSettings | Out-File -FilePath ".vscode\settings.json" -Encoding UTF8
Write-Host "✅ .vscode\settings.json" -ForegroundColor Green

# VS Code Tasks  
$vscodeTasks = @'
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start Dev Server",
            "type": "shell",
            "command": "python",
            "args": ["-m", "http.server", "8000"]
        }
    ]
}
'@

$vscodeTasks | Out-File -FilePath ".vscode\tasks.json" -Encoding UTF8
Write-Host "✅ .vscode\tasks.json" -ForegroundColor Green

# README
$readme = @'
# Sistema Agibilità RECORP - Versione Modulare

## 🚀 Setup Completato!

### Test Immediato:
```bash
python -m http.server 8000
# Apri: http://localhost:8000/agibilita.html
```

### Debug Console:
```javascript
window.agibilitaDebug.system()  // Info sistema
DebugSystem.log('TEST', 'Hello World')
```

### Prossimi Step:
1. Sostituire agibilita.html con versione modulare
2. Testare navigazione tra sezioni
3. Migrare funzioni esistenti nei moduli

Creato automaticamente con PowerShell
'@

$readme | Out-File -FilePath "README.md" -Encoding UTF8
Write-Host "✅ README.md" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 SETUP COMPLETATO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "✅ File principali creati con contenuto funzionante" -ForegroundColor Green
Write-Host "✅ Placeholder per migrazione graduale" -ForegroundColor Green  
Write-Host "✅ Configurazioni VS Code" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PROSSIMI STEP:" -ForegroundColor Yellow
Write-Host "1. code . (apri in VS Code)" -ForegroundColor White
Write-Host "2. Sostituisci agibilita.html con versione modulare" -ForegroundColor White
Write-Host "3. python -m http.server 8000" -ForegroundColor White
Write-Host "4. Apri http://localhost:8000/agibilita.html" -ForegroundColor White
Write-Host ""
Write-Host "🔧 DEBUG CONSOLE:" -ForegroundColor Cyan  
Write-Host "window.agibilitaDebug.system()" -ForegroundColor White
Write-Host "DebugSystem.log('TEST', 'Hello World')" -ForegroundColor White

# Torna alla cartella originale
Set-Location ..