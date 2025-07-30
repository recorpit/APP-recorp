// agibilita-main.js - Entry Point Sistema Agibilità
// Import configurazioni dedicate agibilità
import { DatabaseService } from './config/supabase-config-agibilita.js';
import { AuthGuard } from './config/auth-guard-agibilita.js';

// Import moduli core
import { DebugSystem } from './utils/debug-system.js';
import { StateManager } from './modules/core/state-management.js';
import { SystemInitializer } from './modules/core/initialization.js';
import { EventManager } from './modules/core/event-handlers.js';
import { ToastSystem } from './modules/ui/toast-system.js';
import { NavigationManager } from './modules/ui/navigation.js';
import { ProgressBarManager } from './modules/ui/progress-bar.js';
import { ModalManager } from './modules/ui/modals.js';

console.log('🚀 Inizializzazione sistema agibilità...');

/**
 * Sistema Agibilità - Coordinatore Principale
 */
class AgibilitaSystem {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.startTime = Date.now();
        
        console.log('🎭 AgibilitaSystem creato');
    }
    
    /**
     * Inizializzazione principale del sistema
     */
    async initialize() {
        try {
            console.log('🔧 Inizializzazione sistema agibilità in corso...');
            
            // Phase 1: Protezione autenticazione (PRIMA DI TUTTO)
            await this.initializeAuthentication();
            
            // Phase 2: Core Systems
            await this.initializeCoreModules();
            
            // Phase 3: UI Systems  
            await this.initializeUIModules();
            
            // Phase 4: Post-initialization
            await this.finalizeInitialization();
            
            this.initialized = true;
            const initTime = Date.now() - this.startTime;
            
            console.log('✅ Sistema agibilità inizializzato con successo in ' + initTime + 'ms');
            
            // Nascondi loading overlay
            this.hideLoadingOverlay();
            
            // Mostra messaggio di benvenuto
            this.showWelcomeMessage();
            
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione sistema agibilità:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }
    
    /**
     * Inizializza moduli core
     */
    async initializeCoreModules() {
        console.log('🏗️ Inizializzazione moduli core...');
        
        // Debug System
        console.log('🔧 Caricamento DebugSystem...');
        if (!window.DebugSystem) {
            window.DebugSystem = DebugSystem;
            DebugSystem.initialize();
            console.log('✅ DebugSystem inizializzato');
        }
        
        // State Manager
        console.log('🗄️ Caricamento StateManager...');
        const stateManager = new StateManager();
        // StateManager non richiede initialize()
        this.modules.set('stateManager', stateManager);
        window.stateManager = stateManager; // Per debug
        console.log('✅ StateManager inizializzato');
        
        // System Initializer
        console.log('🚀 Caricamento SystemInitializer...');
        const systemInitializer = new SystemInitializer(stateManager);
        if (systemInitializer.initialize) {
            await systemInitializer.initialize();
        }
        this.modules.set('systemInitializer', systemInitializer);
        console.log('✅ SystemInitializer pronto');
        
        // Event Manager
        console.log('🎧 Caricamento EventManager...');
        const eventManager = new EventManager(stateManager);
        if (eventManager.initialize) {
            await eventManager.initialize();
        }
        this.modules.set('eventManager', eventManager);
        window.eventManager = eventManager; // Per debug
        console.log('✅ EventManager inizializzato');
    }
    
    /**
     * Inizializza moduli UI
     */
    async initializeUIModules() {
        console.log('🎨 Inizializzazione moduli UI...');
        
        const stateManager = this.modules.get('stateManager');
        
        // Toast System
        console.log('🔔 Caricamento ToastSystem...');
        const toastSystem = new ToastSystem();
        if (toastSystem.initialize) {
            await toastSystem.initialize();
        }
        this.modules.set('toastSystem', toastSystem);
        window.toastSystem = toastSystem; // Per uso globale
        console.log('✅ ToastSystem pronto');
        
        // Navigation Manager
        console.log('🧭 Caricamento NavigationManager...');
        const navigationManager = new NavigationManager(stateManager);
        if (navigationManager.initialize) {
            await navigationManager.initialize();
        }
        this.modules.set('navigationManager', navigationManager);
        window.navigationManager = navigationManager; // Per uso globale
        console.log('✅ NavigationManager pronto');
        
        // Progress Bar Manager
        console.log('📊 Caricamento ProgressBarManager...');
        const progressBarManager = new ProgressBarManager(stateManager);
        if (progressBarManager.initialize) {
            await progressBarManager.initialize();
        }
        this.modules.set('progressBarManager', progressBarManager);
        window.progressBarManager = progressBarManager; // Per uso globale
        console.log('✅ ProgressBarManager pronto');
        
        // Modal Manager
        console.log('🔔 Caricamento ModalManager...');
        const modalManager = new ModalManager();
        if (modalManager.initialize) {
            await modalManager.initialize();
        }
        this.modules.set('modalManager', modalManager);
        window.modalManager = modalManager; // Per uso globale
        console.log('✅ ModalManager pronto');
    }
    
    /**
     * Inizializza protezione autenticazione
     */
    async initializeAuthentication() {
        try {
            console.log('🛡️ Inizializzazione protezione autenticazione...');
            
            // Inizializza protezione pagina agibilità
            const session = await AuthGuard.initAgibilitaPageProtection();
            
            console.log('✅ Protezione autenticazione attivata');
            return session;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione autenticazione:', error);
            // L'errore viene gestito da AuthGuard che fa il redirect
            throw error;
        }
    }
    
    /**
     * Finalizza inizializzazione
     */
    async finalizeInitialization() {
        console.log('🎯 Finalizzazione inizializzazione...');
        
        // Setup auto-update per navigation controls
        const navigationManager = this.modules.get('navigationManager');
        if (navigationManager && navigationManager.setupAutoUpdate) {
            navigationManager.setupAutoUpdate();
        }
        
        // Setup integrations tra moduli
        this.setupModuleIntegrations();
        
        // Registra sistema globalmente per debug
        window.agibilitaSystem = this;
        
        console.log('✅ Finalizzazione completata');
    }
    
    /**
     * Setup integrazioni tra moduli
     */
    setupModuleIntegrations() {
        const stateManager = this.modules.get('stateManager');
        const toastSystem = this.modules.get('toastSystem');
        const navigationManager = this.modules.get('navigationManager');
        const progressBarManager = this.modules.get('progressBarManager');
        
        // Integrazione StateManager -> ToastSystem
        if (stateManager && toastSystem) {
            stateManager.addListener('error', (error) => {
                toastSystem.show(error.message || 'Errore sistema', 'error');
            });
            
            stateManager.addListener('success', (message) => {
                toastSystem.show(message, 'success');
            });
        }
        
        // Integrazione StateManager -> ProgressBar
        if (stateManager && progressBarManager) {
            stateManager.addListener('currentStep', (step) => {
                progressBarManager.updateProgress(step);
            });
        }
        
        console.log('🔗 Integrazioni moduli configurate');
    }
    
    /**
     * Nasconde loading overlay
     */
    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.transition = 'opacity 0.5s ease';
            loadingOverlay.style.opacity = '0';
            
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
            
            console.log('✅ Loading overlay nascosto');
        }
    }
    
    /**
     * Mostra messaggio di benvenuto
     */
    showWelcomeMessage() {
        const toastSystem = this.modules.get('toastSystem');
        if (toastSystem) {
            setTimeout(() => {
                toastSystem.show('🎭 Sistema agibilità pronto!', 'success', 3000);
            }, 600);
        }
    }
    
    /**
     * Gestisce errori di inizializzazione
     */
    handleInitializationError(error) {
        console.error('💥 Errore critico inizializzazione:', error);
        
        // Mostra errore user-friendly
        const errorDiv = document.createElement('div');
        errorDiv.id = 'system-error';
        errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); color: white; display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
        
        const errorMessage = error.message || 'Errore sconosciuto';
        
        errorDiv.innerHTML = '<div style="text-align: center; max-width: 500px; padding: 40px;">' +
            '<div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>' +
            '<h2 style="margin-bottom: 16px;">Errore Sistema Agibilità</h2>' +
            '<p style="margin-bottom: 24px; opacity: 0.8; line-height: 1.5;">Si è verificato un errore durante l\'inizializzazione del sistema.</p>' +
            '<div style="background: rgba(255, 255, 255, 0.1); padding: 16px; border-radius: 8px; margin-bottom: 24px; font-family: monospace; font-size: 14px; text-align: left;">' + errorMessage + '</div>' +
            '<button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">🔄 Ricarica Pagina</button>' +
            '</div>';
        
        document.body.appendChild(errorDiv);
        
        // Nascondi loading overlay se presente
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    /**
     * Ottiene modulo per nome
     */
    getModule(name) {
        return this.modules.get(name);
    }
    
    /**
     * Verifica se sistema è inizializzato
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Ottiene info sistema per debug
     */
    debug() {
        const moduleStatus = {};
        for (const [name, module] of this.modules) {
            moduleStatus[name] = {
                loaded: !!module,
                hasDebug: typeof module.debug === 'function'
            };
        }
        
        return {
            initialized: this.initialized,
            startTime: this.startTime,
            initTime: this.initialized ? Date.now() - this.startTime : null,
            modules: moduleStatus,
            globalReferences: {
                DebugSystem: !!window.DebugSystem,
                stateManager: !!window.stateManager,
                toastSystem: !!window.toastSystem,
                navigationManager: !!window.navigationManager,
                progressBarManager: !!window.progressBarManager,
                modalManager: !!window.modalManager,
                agibilitaSystem: !!window.agibilitaSystem
            },
            authentication: {
                AuthGuard: !!window.AuthGuard,
                DatabaseService: DatabaseService.isReady()
            }
        };
    }
    
    /**
     * Cleanup completo sistema
     */
    cleanup() {
        console.log('🧹 Cleanup sistema agibilità...');
        
        // Cleanup moduli
        for (const [name, module] of this.modules) {
            if (module.cleanup && typeof module.cleanup === 'function') {
                try {
                    module.cleanup();
                    console.log('✅ Cleanup ' + name + ' completato');
                } catch (error) {
                    console.warn('⚠️ Errore cleanup ' + name + ':', error);
                }
            }
        }
        
        // Cleanup AuthGuard
        if (AuthGuard.cleanup) {
            AuthGuard.cleanup();
        }
        
        // Cleanup variabili globali
        delete window.DebugSystem;
        delete window.stateManager;
        delete window.eventManager;
        delete window.toastSystem;
        delete window.navigationManager;
        delete window.progressBarManager;
        delete window.modalManager;
        delete window.agibilitaSystem;
        
        this.modules.clear();
        this.initialized = false;
        
        console.log('✅ Cleanup sistema agibilità completato');
    }
    
    /**
     * Ricarica sistema
     */
    async reload() {
        console.log('🔄 Ricarica sistema agibilità...');
        
        this.cleanup();
        await this.initialize();
        
        console.log('✅ Sistema agibilità ricaricato');
    }
}

// ==================== INIZIALIZZAZIONE AUTOMATICA ====================

// Crea istanza sistema
const agibilitaSystem = new AgibilitaSystem();

// Inizializza quando DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        agibilitaSystem.initialize().catch(error => {
            console.error('❌ Fallimento inizializzazione agibilità:', error);
        });
    });
} else {
    // DOM già pronto
    agibilitaSystem.initialize().catch(error => {
        console.error('❌ Fallimento inizializzazione agibilità:', error);
    });
}

// Timeout di sicurezza
setTimeout(() => {
    if (!agibilitaSystem.isInitialized()) {
        console.error('⏰ Timeout inizializzazione sistema agibilità');
        agibilitaSystem.handleInitializationError(
            new Error('Sistema non si è inizializzato entro 10 secondi')
        );
    }
}, 10000);

// ==================== EXPORT GLOBALI LEGACY ====================

// Per compatibilità con HTML esistente
window.showSection = (sectionId) => {
    if (window.navigationManager) {
        return window.navigationManager.showSection(sectionId);
    }
    console.warn('⚠️ NavigationManager non inizializzato');
    return false;
};

window.goToStep = (stepNumber) => {
    if (window.navigationManager) {
        return window.navigationManager.showSection('step' + stepNumber);
    }
    console.warn('⚠️ NavigationManager non inizializzato');
    return false;
};

window.goHome = () => {
    if (window.navigationManager) {
        return window.navigationManager.showSection('homeSection');
    }
    console.warn('⚠️ NavigationManager non inizializzato');
    return false;
};

// Debug utilities globali
window.debugAgibilita = () => {
    if (window.agibilitaSystem) {
        return window.agibilitaSystem.debug();
    }
    console.warn('⚠️ Sistema agibilità non inizializzato');
    return null;
};

window.reloadAgibilita = () => {
    if (window.agibilitaSystem) {
        return window.agibilitaSystem.reload();
    } else {
        window.location.reload();
    }
};

// Export per moduli
export { agibilitaSystem };
export default agibilitaSystem;

console.log('🎭 Sistema agibilità configurato e pronto per l\'inizializzazione');
