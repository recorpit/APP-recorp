/**
 * agibilita-main.js - Entry Point Sistema Agibilità con Moduli Artists
 * 
 * Sistema completo per gestione agibilità RECORP con ricerca artisti funzionante
 * 
 * @author RECORP ALL-IN-ONE
 * @version 3.0 - Con Artists System Integrato
 */

// ==================== IMPORT MODULI CORE ====================
import { DatabaseService } from '../config/supabase-config-agibilita.js';
import { AuthGuard } from '../config/auth-guard-agibilita.js';
import { DebugSystem } from '../utils/debug-system.js';

// ==================== IMPORT MODULI UI CORE ====================
import { StateManager } from '../modules/core/state-manager.js';
import { ToastSystem } from '../modules/ui/toast-system.js';
import { NavigationManager } from '../modules/ui/navigation-manager.js';
import { ProgressBar } from '../modules/ui/progress-bar.js';
import { ModalSystem } from '../modules/ui/modal-system.js';
import { EventManager } from '../modules/core/event-manager.js';

// 🆕 ==================== IMPORT MODULI ARTISTS ====================
import { ArtistSearch } from '../modules/features/artist-search.js';
import { ArtistList } from '../modules/features/artist-list.js';
import { ArtistValidation } from '../modules/features/artist-validation.js';
import { ArtistModal } from '../modules/features/artist-modal.js';
import { ArtistsIntegration } from '../modules/features/artists-integration.js';

// ==================== CONFIGURAZIONE SISTEMA ====================
const AGIBILITA_CONFIG = {
    debug: true,
    environment: 'development',
    version: '3.0',
    modules: {
        core: ['state', 'events', 'auth', 'database'],
        ui: ['toast', 'navigation', 'progress', 'modal'],
        features: ['artists', 'locations', 'generation'] // 🆕 Artists ora disponibile
    },
    artists: {
        searchEnabled: true,           // 🆕 Ricerca artisti abilitata
        validationEnabled: true,       // 🆕 Validazione artisti abilitata
        modalEnabled: true,            // 🆕 Modal registrazione abilitato
        listManagementEnabled: true    // 🆕 Gestione lista abilitata
    }
};

// ==================== VARIABILI GLOBALI ====================
let systemInstances = {};
let systemReady = false;

// ==================== INIZIALIZZAZIONE SISTEMA ====================
document.addEventListener('DOMContentLoaded', async function() {
    DebugSystem.log('🚀 Inizializzazione Sistema Agibilità v3.0 con Artists...');
    
    try {
        // 1. Inizializza sistemi core
        await initializeCoreModules();
        
        // 2. Inizializza sistemi UI
        await initializeUIModules();
        
        // 3. 🆕 Inizializza moduli Artists
        await initializeArtistsModules();
        
        // 4. Setup event handlers finali
        setupFinalEventHandlers();
        
        // 5. Sistema pronto
        systemReady = true;
        DebugSystem.log('✅ Sistema Agibilità completamente inizializzato!');
        
        // Nascondi loading e mostra interfaccia
        hideLoadingAndShowInterface();
        
        // 🆕 Test immediato ricerca artisti se in debug
        if (AGIBILITA_CONFIG.debug) {
            setTimeout(() => {
                testArtistsSystemImmediate();
            }, 1000);
        }
        
    } catch (error) {
        DebugSystem.error('❌ Errore inizializzazione sistema:', error);
        showCriticalError(error);
    }
});

// ==================== INIZIALIZZAZIONE MODULI CORE ====================
async function initializeCoreModules() {
    DebugSystem.log('🔧 Inizializzazione moduli core...');
    
    // State Manager
    systemInstances.state = new StateManager({
        debug: AGIBILITA_CONFIG.debug,
        persistent: true
    });
    
    // Event Manager  
    systemInstances.events = new EventManager({
        debug: AGIBILITA_CONFIG.debug
    });
    
    // Auth Guard
    systemInstances.auth = new AuthGuard({
        requiredRole: 'user',
        redirectOnFail: '/login.html'
    });
    
    // Database Service (già inizializzato nel config)
    systemInstances.database = DatabaseService;
    
    DebugSystem.log('✅ Moduli core inizializzati');
}

// ==================== INIZIALIZZAZIONE MODULI UI ====================
async function initializeUIModules() {
    DebugSystem.log('🎨 Inizializzazione moduli UI...');
    
    // Toast System
    systemInstances.toast = new ToastSystem({
        position: 'top-right',
        duration: 4000,
        debug: AGIBILITA_CONFIG.debug
    });
    
    // Navigation Manager
    systemInstances.navigation = new NavigationManager({
        steps: ['artists', 'locations', 'generation'],
        currentStep: 'artists',
        validation: true
    });
    
    // Progress Bar
    systemInstances.progress = new ProgressBar({
        container: 'progressBarContainer',
        steps: 3,
        currentStep: 1
    });
    
    // Modal System
    systemInstances.modal = new ModalSystem({
        debug: AGIBILITA_CONFIG.debug
    });
    
    DebugSystem.log('✅ Moduli UI inizializzati');
}

// 🆕 ==================== INIZIALIZZAZIONE MODULI ARTISTS ====================
async function initializeArtistsModules() {
    DebugSystem.log('🎭 Inizializzazione moduli Artists...');
    
    // Artist Search - Ricerca artisti real-time
    systemInstances.artistSearch = new ArtistSearch({
        container: 'artistSearchContainer',
        input: 'artistSearchInput',
        results: 'artistSearchResults',
        database: systemInstances.database,
        toast: systemInstances.toast,
        debug: AGIBILITA_CONFIG.debug
    });
    
    // Artist List - Gestione lista artisti selezionati
    systemInstances.artistList = new ArtistList({
        container: 'selectedArtistsContainer',
        template: 'artistItemTemplate',
        state: systemInstances.state,
        toast: systemInstances.toast,
        debug: AGIBILITA_CONFIG.debug
    });
    
    // Artist Validation - Validazione dati artisti
    systemInstances.artistValidation = new ArtistValidation({
        container: 'validationPanelContainer',
        state: systemInstances.state,
        navigation: systemInstances.navigation,
        toast: systemInstances.toast,
        debug: AGIBILITA_CONFIG.debug
    });
    
    // Artist Modal - Modal registrazione nuovi artisti
    systemInstances.artistModal = new ArtistModal({
        modalId: 'artistRegistrationModal',
        database: systemInstances.database,
        toast: systemInstances.toast,
        callback: (artist) => handleNewArtistRegistered(artist),
        debug: AGIBILITA_CONFIG.debug
    });
    
    // Artists Integration - Coordinamento moduli
    systemInstances.artistsIntegration = new ArtistsIntegration({
        search: systemInstances.artistSearch,
        list: systemInstances.artistList,
        validation: systemInstances.artistValidation,
        modal: systemInstances.artistModal,
        state: systemInstances.state,
        events: systemInstances.events,
        debug: AGIBILITA_CONFIG.debug
    });
    
    DebugSystem.log('✅ Moduli Artists inizializzati e integrati');
}

// ==================== EVENT HANDLERS FINALI ====================
function setupFinalEventHandlers() {
    DebugSystem.log('🔗 Setup event handlers finali...');
    
    // Event handlers per navigazione
    const nextBtn = document.getElementById('nextStepBtn');
    const prevBtn = document.getElementById('prevStepBtn');
    
    if (nextBtn) {
        nextBtn.addEventListener('click', handleNextStep);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', handlePrevStep);
    }
    
    // 🆕 Event handlers per Artists system
    setupArtistsEventHandlers();
    
    // Event handlers per tab switching
    setupTabEventHandlers();
    
    DebugSystem.log('✅ Event handlers configurati');
}

// 🆕 ==================== EVENT HANDLERS ARTISTS ====================
function setupArtistsEventHandlers() {
    // Pulsante apertura modal registrazione artista
    const newArtistBtn = document.getElementById('newArtistBtn');
    if (newArtistBtn) {
        newArtistBtn.addEventListener('click', () => {
            DebugSystem.log('🆕 Apertura modal registrazione artista');
            systemInstances.artistModal.show();
        });
    }
    
    // Pulsante reset ricerca
    const resetSearchBtn = document.getElementById('resetArtistSearchBtn');
    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', () => {
            systemInstances.artistSearch.reset();
            systemInstances.toast.show('Ricerca azzerata', 'info');
        });
    }
    
    // Pulsante reset lista artisti
    const resetListBtn = document.getElementById('resetArtistsListBtn');
    if (resetListBtn) {
        resetListBtn.addEventListener('click', () => {
            if (confirm('Confermi di voler rimuovere tutti gli artisti dalla lista?')) {
                systemInstances.artistList.reset();
                systemInstances.toast.show('Lista artisti azzerata', 'warning');
            }
        });
    }
    
    DebugSystem.log('✅ Event handlers Artists configurati');
}

// ==================== GESTIONE NAVIGAZIONE ====================
function handleNextStep() {
    DebugSystem.log('▶️ Richiesta step successivo');
    
    const currentStep = systemInstances.navigation.getCurrentStep();
    
    if (currentStep === 'artists') {
        // Valida step artisti prima di procedere
        const validation = systemInstances.artistValidation.validateStep();
        
        if (validation.isValid) {
            systemInstances.navigation.next();
            systemInstances.progress.next();
            systemInstances.toast.show('Step artisti completato!', 'success');
        } else {
            systemInstances.toast.show(`Errori step artisti: ${validation.errors.join(', ')}`, 'error');
        }
    } else {
        // Altri step (locations, generation)
        systemInstances.navigation.next();
        systemInstances.progress.next();
    }
}

function handlePrevStep() {
    DebugSystem.log('◀️ Richiesta step precedente');
    systemInstances.navigation.prev();
    systemInstances.progress.prev();
}

// ==================== GESTIONE TAB ====================
function setupTabEventHandlers() {
    const tabButtons = document.querySelectorAll('[data-tab]');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    DebugSystem.log(`🔄 Switch tab: ${tabName}`);
    
    // Nascondi tutti i tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Rimuovi active class da tutti i tab button
    document.querySelectorAll('[data-tab]').forEach(button => {
        button.classList.remove('active');
    });
    
    // Mostra tab selezionato
    const targetContent = document.getElementById(`${tabName}Tab`);
    if (targetContent) {
        targetContent.style.display = 'block';
    }
    
    // Attiva button
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
    
    systemInstances.toast.show(`Tab ${tabName} attivato`, 'info');
}

// 🆕 ==================== CALLBACK ARTISTI ====================
function handleNewArtistRegistered(artist) {
    DebugSystem.log('🎭 Nuovo artista registrato:', artist);
    
    // Aggiungi automaticamente alla lista se richiesto
    const shouldAddToList = confirm(`Artista ${artist.nome} ${artist.cognome} registrato! Aggiungerlo alla lista agibilità?`);
    
    if (shouldAddToList) {
        systemInstances.artistList.addArtist(artist);
        systemInstances.toast.show(`${artist.nome} ${artist.cognome} aggiunto alla lista!`, 'success');
    }
    
    // Aggiorna ricerca per includere il nuovo artista
    systemInstances.artistSearch.refreshData();
}

// 🆕 ==================== TEST SISTEMA ARTISTS ====================
function testArtistsSystemImmediate() {
    DebugSystem.log('🧪 Test immediato sistema Artists...');
    
    // Test ricerca artisti
    const searchInput = document.getElementById('artistSearchInput');
    if (searchInput) {
        searchInput.value = 'mario';
        searchInput.dispatchEvent(new Event('input'));
        
        setTimeout(() => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }, 2000);
    }
    
    systemInstances.toast.show('Test Artists system avviato', 'info');
}

// ==================== GESTIONE ERRORI ====================
function hideLoadingAndShowInterface() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const mainInterface = document.getElementById('mainInterface');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    if (mainInterface) {
        mainInterface.style.display = 'block';
    }
    
    // Inizializza tab di default
    switchTab('bozze');
}

function showCriticalError(error) {
    const errorContainer = document.getElementById('errorContainer') || document.body;
    
    errorContainer.innerHTML = `
        <div style="
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%);
            background: #fee2e2; 
            border: 2px solid #dc2626; 
            border-radius: 8px; 
            padding: 20px; 
            max-width: 500px;
            z-index: 10000;
        ">
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">❌ Errore Sistema Agibilità</h3>
            <p style="margin: 0 0 15px 0;">${error.message}</p>
            <button onclick="location.reload()" style="
                background: #dc2626; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 4px; 
                cursor: pointer;
            ">Ricarica Pagina</button>
        </div>
    `;
}

// ==================== API PUBBLICHE ====================
// Esporta istanze per debug e uso esterno
window.AgibilitaSystem = {
    instances: systemInstances,
    config: AGIBILITA_CONFIG,
    ready: () => systemReady,
    
    // 🆕 API Artists pubbliche
    artists: {
        search: (query) => systemInstances.artistSearch?.search(query),
        addToList: (artist) => systemInstances.artistList?.addArtist(artist),
        removeFromList: (artistId) => systemInstances.artistList?.removeArtist(artistId),
        getSelectedArtists: () => systemInstances.artistList?.getArtists(),
        validateStep: () => systemInstances.artistValidation?.validateStep(),
        openRegistrationModal: () => systemInstances.artistModal?.show(),
        resetAll: () => {
            systemInstances.artistSearch?.reset();
            systemInstances.artistList?.reset();
        }
    },
    
    // API sistema
    switchTab: switchTab,
    nextStep: handleNextStep,
    prevStep: handlePrevStep,
    showToast: (message, type = 'info') => systemInstances.toast?.show(message, type)
};

// ==================== DEBUG E LOGGING ====================
DebugSystem.log('📄 agibilita-main.js v3.0 con Artists System caricato');

// Verifica che tutti i moduli siano disponibili
setTimeout(() => {
    if (systemReady) {
        DebugSystem.log('🎉 Sistema Agibilità completamente operativo!');
        DebugSystem.log('🔧 API disponibili in window.AgibilitaSystem');
        
        // 🆕 Notifica che Artists system è pronto
        const artistModulesReady = [
            systemInstances.artistSearch,
            systemInstances.artistList, 
            systemInstances.artistValidation,
            systemInstances.artistModal
        ].every(module => module !== undefined);
        
        if (artistModulesReady) {
            DebugSystem.log('🎭 Moduli Artists completamente operativi!');
            systemInstances.toast?.show('Sistema Artists pronto!', 'success');
        }
    }
}, 2000);
