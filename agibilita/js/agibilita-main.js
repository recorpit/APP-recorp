// agibilita-main.js - Entry Point Sistema Agibilità RECORP
console.log('🚀 Inizializzazione sistema agibilità...');

// Import moduli core
import DebugSystem from './utils/debug-system.js';
import StateManager from './modules/core/state-management.js';
import SystemInitializer from './modules/core/initialization.js';
import EventManager from './modules/core/event-handlers.js';

// Import moduli UI base
import ToastSystem from './modules/ui/toast-system.js';
import NavigationManager from './modules/ui/navigation.js';

/**
 * Classe principale del sistema Agibilità
 */
class AgibilitaSystem {
    constructor() {
        console.log('🏗️ Costruzione AgibilitaSystem...');
        
        // Core components
        this.stateManager = null;
        this.eventManager = null;
        this.debugSystem = DebugSystem;
        
        // UI Managers
        this.uiManager = {
            toast: null,
            navigation: null,
            modal: null,
            progressBar: null
        };
        
        // Moduli sistema
        this.modules = {
            // Artists
            artistSearch: null,
            artistList: null,
            artistValidation: null,
            
            // Locations
            locationLoader: null,
            venueSearch: null,
            invoiceData: null,
            
            // XML
            xmlGenerator: null,
            xmlIntermittenti: null,
            xmlValidation: null,
            
            // Drafts
            draftManager: null,
            autoSave: null,
            lockSystem: null,
            
            // Requests
            requestManager: null,
            requestTabs: null,
            requestFilters: null,
            
            // Utils
            databaseHelper: null,
            formUtils: null,
            validationUtils: null
        };
        
        // Status
        this.isInitialized = false;
        this.loadedModules = [];
        this.initializationStartTime = Date.now();
        
        console.log('✅ AgibilitaSystem costruito');
    }
    
    /**
     * Inizializza il sistema completo
     */
    async initialize() {
        try {
            console.log('⚙️ Inizializzazione sistema...');
            
            // 1. Abilita debug in development
            this.setupDebug();
            
            // 2. Inizializza StateManager
            this.stateManager = new StateManager();
            DebugSystem.log(DebugSystem.zones.CORE, 'StateManager inizializzato');
            
            // 3. Inizializza UI Manager base
            await this.initializeBaseUI();
            
            // 4. Inizializza EventManager
            this.eventManager = new EventManager(this.stateManager, this.uiManager);
            this.eventManager.setupGlobalListeners();
            DebugSystem.log(DebugSystem.zones.EVENTS, 'EventManager inizializzato');
            
            // 5. Inizializza il sistema via SystemInitializer
            const initSuccess = await SystemInitializer.init(this.stateManager);
            if (!initSuccess) {
                throw new Error('Errore inizializzazione SystemInitializer');
            }
            
            // 6. Carica moduli lazy (non bloccanti)
            this.loadModulesLazy();
            
            // 7. Espone sistema globalmente per debug
            this.exposeGlobally();
            
            // 8. Marca come inizializzato
            this.isInitialized = true;
            const initTime = Date.now() - this.initializationStartTime;
            
            console.log(`✅ Sistema agibilità inizializzato con successo in ${initTime}ms`);
            DebugSystem.log(DebugSystem.zones.CORE, `Sistema inizializzato in ${initTime}ms`);
            
            // Mostra toast di benvenuto
            this.uiManager.toast.show('Sistema agibilità caricato con successo', 'success', 2000);
            
            return true;
            
        } catch (error) {
            console.error('💥 Errore critico inizializzazione:', error);
            this.handleInitializationError(error);
            return false;
        }
    }
    
    /**
     * Setup del sistema di debug
     */
    setupDebug() {
        // Abilita debug in development
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            DebugSystem.enableAll();
            this.stateManager?.update('ui.debugMode', true);
        } else {
            // Production: abilita solo core e errori
            DebugSystem.enable(DebugSystem.zones.CORE);
        }
        
        DebugSystem.log(DebugSystem.zones.CORE, 'Sistema debug configurato');
    }
    
    /**
     * Inizializza i componenti UI di base
     */
    async initializeBaseUI() {
        try {
            // Toast System (priorità alta)
            this.uiManager.toast = new ToastSystem();
            this.uiManager.toast.initialize();
            this.loadedModules.push('ToastSystem');
            DebugSystem.log(DebugSystem.zones.UI, 'ToastSystem inizializzato');
            
            // Navigation Manager (priorità alta)
            this.uiManager.navigation = new NavigationManager(this.stateManager);
            this.uiManager.navigation.initialize();
            this.loadedModules.push('NavigationManager');
            DebugSystem.log(DebugSystem.zones.UI, 'NavigationManager inizializzato');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione UI base:', error);
            throw new Error(`Errore UI base: ${error.message}`);
        }
    }
    
    /**
     * Carica moduli in modo lazy (non bloccante)
     */
    loadModulesLazy() {
        // Carica moduli con priorità differite
        setTimeout(() => this.loadArtistModules(), 100);
        setTimeout(() => this.loadLocationModules(), 200);
        setTimeout(() => this.loadUIModules(), 300);
        setTimeout(() => this.loadUtilModules(), 400);
        setTimeout(() => this.loadAdvancedModules(), 500);
    }
    
    /**
     * Carica moduli artists
     */
    async loadArtistModules() {
        try {
            DebugSystem.log(DebugSystem.zones.ARTISTS, 'Caricamento moduli artisti...');
            
            // Carica in sequenza per gestire dipendenze
            const { default: ArtistSearch } = await import('./modules/artists/artist-search.js');
            this.modules.artistSearch = new ArtistSearch(this.stateManager);
            
            const { default: ArtistList } = await import('./modules/artists/artist-list.js');
            this.modules.artistList = new ArtistList(this.stateManager);
            
            const { default: ArtistValidation } = await import('./modules/artists/artist-validation.js');
            this.modules.artistValidation = new ArtistValidation(this.stateManager);
            
            this.loadedModules.push('ArtistModules');
            DebugSystem.log(DebugSystem.zones.ARTISTS, 'Moduli artisti caricati');
            
        } catch (error) {
            DebugSystem.error(DebugSystem.zones.ARTISTS, 'Errore caricamento moduli artisti', error);
        }
    }
    
    /**
     * Carica moduli location
     */
    async loadLocationModules() {
        try {
            DebugSystem.log(DebugSystem.zones.LOCATIONS, 'Caricamento moduli località...');
            
            const { default: LocationLoader } = await import('./modules/locations/location-loader.js');
            this.modules.locationLoader = new LocationLoader(this.stateManager);
            
            const { default: VenueSearch } = await import('./modules/locations/venue-search.js');
            this.modules.venueSearch = new VenueSearch(this.stateManager);
            
            const { default: InvoiceData } = await import('./modules/locations/invoice-data.js');
            this.modules.invoiceData = new InvoiceData(this.stateManager);
            
            this.loadedModules.push('LocationModules');
            DebugSystem.log(DebugSystem.zones.LOCATIONS, 'Moduli località caricati');
            
        } catch (error) {
            DebugSystem.error(DebugSystem.zones.LOCATIONS, 'Errore caricamento moduli località', error);
        }
    }
    
    /**
     * Carica moduli UI rimanenti
     */
    async loadUIModules() {
        try {
            DebugSystem.log(DebugSystem.zones.UI, 'Caricamento moduli UI...');
            
            const { default: ModalManager } = await import('./modules/ui/modals.js');
            this.uiManager.modal = new ModalManager();
            this.uiManager.modal.initialize();
            
            const { default: ProgressBar } = await import('./modules/ui/progress-bar.js');
            this.uiManager.progressBar = new ProgressBar(this.stateManager);
            this.uiManager.progressBar.initialize();
            
            this.loadedModules.push('UIModules');
            DebugSystem.log(DebugSystem.zones.UI, 'Moduli UI caricati');
            
        } catch (error) {
            DebugSystem.error(DebugSystem.zones.UI, 'Errore caricamento moduli UI', error);
        }
    }
    
    /**
     * Carica moduli utils
     */
    async loadUtilModules() {
        try {
            DebugSystem.log(DebugSystem.zones.CORE, 'Caricamento moduli utils...');
            
            const { default: DatabaseHelper } = await import('./utils/database-helper.js');
            this.modules.databaseHelper = DatabaseHelper;
            
            const { default: FormUtils } = await import('./utils/form-utils.js');
            this.modules.formUtils = FormUtils;
            
            const { default: ValidationUtils } = await import('./utils/validation-utils.js');
            this.modules.validationUtils = ValidationUtils;
            
            this.loadedModules.push('UtilModules');
            DebugSystem.log(DebugSystem.zones.CORE, 'Moduli utils caricati');
            
        } catch (error) {
            DebugSystem.error(DebugSystem.zones.CORE, 'Errore caricamento moduli utils', error);
        }
    }
    
    /**
     * Carica moduli avanzati (drafts, XML, requests)
     */
    async loadAdvancedModules() {
        try {
            DebugSystem.log(DebugSystem.zones.CORE, 'Caricamento moduli avanzati...');
            
            // Drafts
            const { default: DraftManager } = await import('./modules/drafts/draft-manager.js');
            this.modules.draftManager = new DraftManager(this.stateManager);
            
            // XML
            const { default: XMLGenerator } = await import('./modules/xml/xml-generator.js');
            this.modules.xmlGenerator = new XMLGenerator(this.stateManager);
            
            // Requests
            const { default: RequestManager } = await import('./modules/requests/request-manager.js');
            this.modules.requestManager = new RequestManager(this.stateManager);
            
            const { default: RequestTabs } = await import('./modules/requests/request-tabs.js');
            this.modules.requestTabs = new RequestTabs();
            
            this.loadedModules.push('AdvancedModules');
            DebugSystem.log(DebugSystem.zones.CORE, 'Moduli avanzati caricati');
            
        } catch (error) {
            DebugSystem.error(DebugSystem.zones.CORE, 'Errore caricamento moduli avanzati', error);
        }
    }
    
    /**
     * Espone il sistema globalmente per debug e compatibilità
     */
    exposeGlobally() {
        // Esponi sistema principale
        window.agibilitaSystem = this;
        
        // Esponi funzioni legacy per compatibilità HTML
        window.startNewAgibilita = () => this.eventManager?.executeAction('startNewAgibilita');
        window.showEditAgibilita = () => this.eventManager?.executeAction('showEditAgibilita');
        window.showBozzeRichieste = () => this.eventManager?.executeAction('showBozzeRichieste');
        window.showAddArtistModal = () => this.eventManager?.executeAction('showAddArtistModal');
        
        // Esponi debug utilities
        window.agibilitaDebug = {
            system: () => this.debug(),
            state: () => this.stateManager?.getAll(),
            modules: () => this.loadedModules,
            logs: () => DebugSystem.showStats(),
            zones: () => DebugSystem.showZoneToggle()
        };
        
        DebugSystem.log(DebugSystem.zones.CORE, 'Sistema esposto globalmente');
    }
    
    /**
     * Gestisce errori di inizializzazione
     */
    handleInitializationError(error) {
        console.error('💥 Errore critico sistema:', error);
        
        // Mostra errore nel loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div style="text-align: center; color: #ff3b30;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Errore di Inizializzazione</h3>
                    <p><strong>${error.message}</strong></p>
                    <details style="margin: 1rem 0; text-align: left;">
                        <summary style="cursor: pointer; color: #007aff;">Dettagli Tecnici</summary>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px; overflow: auto;">
${error.stack || 'Stack trace non disponibile'}
                        </pre>
                    </details>
                    <div style="margin-top: 1rem;">
                        <button onclick="location.reload()" 
                                style="padding: 12px 24px; background: #007aff; color: white; 
                                       border: none; border-radius: 8px; cursor: pointer; margin-right: 10px;">
                            Ricarica Pagina
                        </button>
                        <button onclick="window.agibilitaDebug?.logs()" 
                                style="padding: 12px 24px; background: #ff9500; color: white; 
                                       border: none; border-radius: 8px; cursor: pointer;">
                            Mostra Log
                        </button>
                    </div>
                </div>
            `;
            loadingOverlay.style.display = 'flex';
        }
        
        // Mostra toast di errore se disponibile
        if (this.uiManager?.toast) {
            this.uiManager.toast.show(`Errore sistema: ${error.message}`, 'error', 10000);
        }
    }
    
    /**
     * Ottiene informazioni sullo stato del sistema
     */
    getSystemInfo() {
        return {
            isInitialized: this.isInitialized,
            loadedModules: this.loadedModules,
            initializationTime: Date.now() - this.initializationStartTime,
            modulesCount: Object.keys(this.modules).length,
            activeModules: Object.entries(this.modules)
                .filter(([key, module]) => module !== null)
                .map(([key]) => key)
        };
    }
    
    /**
     * Ricarica un modulo specifico
     */
    async reloadModule(moduleName) {
        try {
            DebugSystem.log(DebugSystem.zones.CORE, `Ricarica modulo: ${moduleName}`);
            
            // Implementa ricarica specifica per ogni tipo di modulo
            if (moduleName.includes('artist')) {
                await this.loadArtistModules();
            } else if (moduleName.includes('location')) {
                await this.loadLocationModules();
            } else if (moduleName.includes('ui')) {
                await this.loadUIModules();
            }
            
            DebugSystem.log(DebugSystem.zones.CORE, `Modulo ${moduleName} ricaricato`);
            return true;
            
        } catch (error) {
            DebugSystem.error(DebugSystem.zones.CORE, `Errore ricarica modulo ${moduleName}`, error);
            return false;
        }
    }
    
    /**
     * Cleanup del sistema
     */
    cleanup() {
        DebugSystem.log(DebugSystem.zones.CORE, 'Cleanup sistema...');
        
        // Cleanup SystemInitializer
        SystemInitializer.cleanup(this.stateManager);
        
        // Cleanup moduli
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.cleanup === 'function') {
                module.cleanup();
            }
        });
        
        // Cleanup UI
        Object.values(this.uiManager).forEach(uiModule => {
            if (uiModule && typeof uiModule.cleanup === 'function') {
                uiModule.cleanup();
            }
        });
        
        // Reset stato
        this.isInitialized = false;
        
        DebugSystem.log(DebugSystem.zones.CORE, 'Cleanup completato');
    }
    
    /**
     * Debug: mostra informazioni complete del sistema
     */
    debug() {
        console.group('🎭 Debug Sistema Agibilità');
        console.log('🚀 Stato inizializzazione:', this.isInitialized);
        console.log('📦 Moduli caricati:', this.loadedModules);
        console.log('⏱️ Tempo inizializzazione:', Date.now() - this.initializationStartTime, 'ms');
        console.log('🗄️ StateManager:', this.stateManager ? '✅' : '❌');
        console.log('🎧 EventManager:', this.eventManager ? '✅' : '❌');
        console.log('🖥️ UI Managers:', Object.entries(this.uiManager).map(([k,v]) => `${k}: ${v ? '✅' : '❌'}`));
        console.log('🔧 Moduli attivi:', Object.entries(this.modules).filter(([k,v]) => v !== null).map(([k]) => k));
        console.groupEnd();
        
        // Debug componenti individuali
        this.stateManager?.debug();
        this.eventManager?.debug();
        DebugSystem.showStats();
        
        return this.getSystemInfo();
    }
}

/**
 * Inizializzazione automatica del sistema
 */
async function initializeAgibilitaSystem() {
    try {
        DebugSystem.log(DebugSystem.zones.CORE, 'Avvio inizializzazione automatica...');
        
        // Crea istanza sistema
        const agibilitaSystem = new AgibilitaSystem();
        
        // Inizializza
        const success = await agibilitaSystem.initialize();
        
        if (success) {
            DebugSystem.log(DebugSystem.zones.CORE, 'Sistema agibilità operativo');
        } else {
            throw new Error('Inizializzazione fallita');
        }
        
        return agibilitaSystem;
        
    } catch (error) {
        console.error('💥 Errore inizializzazione automatica:', error);
        throw error;
    }
}

// Avvia il sistema quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAgibilitaSystem);
} else {
    // DOM già pronto, avvia subito
    initializeAgibilitaSystem();
}

// Export per utilizzo modulare
export { AgibilitaSystem, initializeAgibilitaSystem };
export default AgibilitaSystem;

console.log('✅ Agibilita-main module loaded');