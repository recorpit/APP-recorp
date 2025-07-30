// event-handlers.js - Gestione Eventi Sistema Agibilità
console.log('🎧 Caricamento EventManager...');

export class EventManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.searchTimeouts = new Map();
        this.debounceDelay = 300;
        
        console.log('🎧 EventManager creato');
    }
    
    /**
     * Inizializza il gestore eventi
     */
    initialize() {
        console.log('🎧 Inizializzazione EventManager...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup form validation
        this.setupFormValidation();
        
        // Setup state listeners
        this.setupStateListeners();
        
        console.log('✅ EventManager inizializzato');
    }
    
    /**
     * Setup event listeners principali
     */
    setupEventListeners() {
        // Event delegation per data-action
        document.addEventListener('click', (e) => {
            const actionElement = e.target.closest('[data-action]');
            if (actionElement) {
                const action = actionElement.dataset.action;
                console.log(`🎧 Azione rilevata: ${action}`);
                this.handleAction(action, actionElement, e);
            }
        });

        // Event delegation per tab switching
        document.addEventListener('click', (e) => {
            const tabElement = e.target.closest('[data-tab]');
            if (tabElement) {
                const tab = tabElement.dataset.tab;
                console.log(`📋 Tab rilevato: ${tab}`);
                this.handleTabSwitch(tab, tabElement, e);
            }
        });

        // Event delegation per ricerche
        document.addEventListener('input', (e) => {
            if (e.target.dataset.searchField) {
                const searchField = e.target.dataset.searchField;
                const searchTerm = e.target.value;
                console.log(`🔍 Ricerca: ${searchField} = "${searchTerm}"`);
                this.handleSearch(searchField, searchTerm, e.target);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        console.log('✅ Event listeners configurati');
    }
    
    /**
     * Gestisce le azioni dai pulsanti
     */
    handleAction(action, element, event) {
        console.log(`🎬 Esecuzione azione: ${action}`);
        
        switch (action) {
            // ==================== NAVIGAZIONE PRINCIPALE ====================
            case 'startNewAgibilita':
                this.startNewAgibilita();
                break;
                
            case 'showEditAgibilita':
                this.showEditAgibilita();
                break;
                
            case 'showBozzeRichieste':
                this.showBozzeRichieste();
                break;
                
            case 'goToHome':
                this.goToHome();
                break;
                
            case 'goToStep1':
                this.goToStep(1);
                break;
                
            case 'goToStep2':
                this.goToStep(2);
                break;
                
            case 'goToStep3':
                this.goToStep(3);
                break;
                
            // ==================== AZIONI ARTISTI ====================
            case 'showAddArtistModal':
                this.showAddArtistModal();
                break;
                
            case 'clearSearch':
                this.clearSearch();
                break;
                
            case 'registerNewArtist':
                this.registerNewArtist();
                break;
                
            // ==================== AZIONI LOCALITÀ ====================
            case 'searchInvoiceData':
                this.searchInvoiceData();
                break;
                
            case 'copyVenueAddress':
                this.copyVenueAddress();
                break;
                
            case 'clearInvoiceFields':
                this.clearInvoiceFields();
                break;
                
            // ==================== AZIONI STEP 3 ====================
            case 'validateAndGenerate':
                this.validateAndGenerate();
                break;
                
            case 'saveAsBozza':
                this.saveAsBozza();
                break;
                
            case 'finalizeAgibilita':
                this.finalizeAgibilita();
                break;
                
            // ==================== AZIONI BOZZE ====================
            case 'refreshBozze':
                this.refreshBozze();
                break;
                
            case 'refreshRichieste':
                this.refreshRichieste();
                break;
                
            case 'refreshArchivio':
                this.refreshArchivio();
                break;
                
            // ==================== AZIONI MODAL ====================
            case 'closeModal':
                this.closeModal();
                break;
                
            case 'confirmValidation':
                this.confirmValidation();
                break;
                
            case 'deleteBozza':
                this.deleteBozza();
                break;
                
            case 'loadBozza':
                this.loadBozza();
                break;
                
            default:
                console.warn(`⚠️ Azione non gestita: ${action}`);
                this.showToast(`Funzione "${action}" non ancora implementata`, 'warning');
        }
    }
    
    // ==================== TAB MANAGEMENT ====================
    
    /**
     * Gestisce il cambio tab
     */
    handleTabSwitch(tab, tabElement, event) {
        console.log(`📋 Cambio tab: ${tab}`);
        
        // Trova il container dei tab
        const tabContainer = tabElement.closest('.tabs');
        const contentContainer = tabContainer?.nextElementSibling || 
                                document.querySelector('.tab-content').parentElement;
        
        if (!tabContainer || !contentContainer) {
            console.warn('⚠️ Container tab non trovato');
            return;
        }
        
        // Rimuovi active da tutti i tab
        const allTabs = tabContainer.querySelectorAll('.tab');
        allTabs.forEach(t => t.classList.remove('active'));
        
        // Aggiungi active al tab corrente
        tabElement.classList.add('active');
        
        // Nascondi tutti i contenuti
        const allContents = contentContainer.querySelectorAll('.tab-content');
        allContents.forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        // Mostra contenuto corrispondente
        const targetContent = document.getElementById(`${tab}Content`);
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
            
            // Carica contenuto se necessario
            this.loadTabContent(tab);
        }
        
        this.showToast(`Passaggio a tab: ${this.getTabDisplayName(tab)}`, 'info', 2000);
    }
    
    /**
     * Carica contenuto del tab
     */
    loadTabContent(tab) {
        switch (tab) {
            case 'bozze':
                this.loadBozzeContent();
                break;
                
            case 'richieste':
                this.loadRichiesteContent();
                break;
                
            case 'archivio':
                this.loadArchivioContent();
                break;
                
            default:
                console.warn(`⚠️ Tab non gestito: ${tab}`);
        }
    }
    
    /**
     * Carica contenuto bozze
     */
    loadBozzeContent() {
        console.log('📝 Caricamento contenuto bozze...');
        const bozzeList = document.getElementById('bozzeList');
        if (bozzeList) {
            bozzeList.innerHTML = '<div class="loading-message">🔄 Caricamento bozze in corso...</div>';
            
            // Simula caricamento
            setTimeout(() => {
                bozzeList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <h3>Nessuna bozza trovata</h3>
                        <p>Le tue bozze salvate appariranno qui</p>
                        <button class="btn btn-primary" data-action="startNewAgibilita">
                            <i class="fas fa-plus"></i> Crea Prima Agibilità
                        </button>
                    </div>
                `;
            }, 1000);
        }
    }
    
    /**
     * Carica contenuto richieste
     */
    loadRichiesteContent() {
        console.log('📥 Caricamento contenuto richieste...');
        const richiesteList = document.getElementById('richiesteList');
        if (richiesteList) {
            richiesteList.innerHTML = '<div class="loading-message">🔄 Caricamento richieste in corso...</div>';
            
            // Simula caricamento
            setTimeout(() => {
                richiesteList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📥</div>
                        <h3>Nessuna richiesta attiva</h3>
                        <p>Le richieste esterne appariranno qui quando disponibili</p>
                        <small class="text-muted">Funzionalità in sviluppo</small>
                    </div>
                `;
            }, 800);
        }
    }
    
    /**
     * Carica contenuto archivio
     */
    loadArchivioContent() {
        console.log('🗄️ Caricamento contenuto archivio...');
        const archivioList = document.getElementById('archivioList');
        if (archivioList) {
            archivioList.innerHTML = '<div class="loading-message">🔄 Caricamento archivio in corso...</div>';
            
            // Simula caricamento
            setTimeout(() => {
                archivioList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🗄️</div>
                        <h3>Archivio vuoto</h3>
                        <p>Le agibilità completate e archiviate appariranno qui</p>
                        <small class="text-muted">Funzionalità in sviluppo</small>
                    </div>
                `;
            }, 600);
        }
    }
    
    /**
     * Ottiene nome display del tab
     */
    getTabDisplayName(tab) {
        const names = {
            'bozze': 'Bozze',
            'richieste': 'Richieste',
            'archivio': 'Archivio'
        };
        return names[tab] || tab;
    }
    
    /**
     * Avvia nuova agibilità (va allo step 1)
     */
    startNewAgibilita() {
        console.log('🎭 Avvio nuova agibilità');
        this.showToast('Avvio creazione nuova agibilità', 'info');
        
        // Reset stato per nuova agibilità
        if (this.stateManager) {
            this.stateManager.update('selectedArtists', []);
            this.stateManager.update('currentStep', 1);
        }
        
        // Naviga allo step 1
        if (window.navigationManager) {
            window.navigationManager.showSection('step1');
        }
    }
    
    /**
     * Mostra sezione modifica agibilità
     */
    showEditAgibilita() {
        console.log('✏️ Modifica agibilità');
        this.showToast('Funzione modifica agibilità in sviluppo', 'warning');
        // TODO: Implementare caricamento agibilità esistenti
    }
    
    /**
     * Mostra sezione bozze e richieste
     */
    showBozzeRichieste() {
        console.log('📁 Bozze e richieste');
        this.showToast('Apertura gestione bozze e richieste', 'info');
        
        if (window.navigationManager) {
            window.navigationManager.showSection('bozzeRichiesteSection');
        }
    }
    
    /**
     * Torna alla home
     */
    goToHome() {
        console.log('🏠 Torna alla home');
        
        if (window.navigationManager) {
            window.navigationManager.showSection('homeSection');
        }
    }
    
    /**
     * Va a uno step specifico
     */
    goToStep(stepNumber) {
        console.log(`🎯 Navigazione step ${stepNumber}`);
        
        if (this.stateManager) {
            this.stateManager.update('currentStep', stepNumber);
        }
        
        if (window.navigationManager) {
            window.navigationManager.showSection(`step${stepNumber}`);
        }
    }
    
    // ==================== METODI RICERCA ====================
    
    /**
     * Gestisce le ricerche con debouncing
     */
    handleSearch(searchField, searchTerm, inputElement) {
        // Cancella timeout precedente
        if (this.searchTimeouts.has(searchField)) {
            clearTimeout(this.searchTimeouts.get(searchField));
        }
        
        // Nuovo timeout con debouncing
        const timeoutId = setTimeout(() => {
            this.performSearch(searchField, searchTerm, inputElement);
        }, this.debounceDelay);
        
        this.searchTimeouts.set(searchField, timeoutId);
    }
    
    /**
     * Esegue la ricerca specifica
     */
    performSearch(searchField, searchTerm, inputElement) {
        console.log(`🔍 Ricerca eseguita: ${searchField} = "${searchTerm}"`);
        
        switch (searchField) {
            case 'artist':
                this.searchArtists(searchTerm, inputElement);
                break;
                
            case 'modal-artist':
                this.searchModalArtists(searchTerm, inputElement);
                break;
                
            case 'venue':
                this.searchVenues(searchTerm, inputElement);
                break;
                
            default:
                console.warn(`⚠️ Campo ricerca non gestito: ${searchField}`);
        }
    }
    
    // ==================== METODI ARTISTI (PLACEHOLDER) ====================
    
    /**
     * Ricerca artisti nella ricerca principale
     */
    searchArtists(searchTerm, inputElement) {
        console.log(`🎭 Ricerca artisti: "${searchTerm}"`);
        this.showToast('Ricerca artisti - Modulo in sviluppo', 'info');
        // TODO: Implementare ricerca artisti reale
    }
    
    /**
     * Ricerca artisti nel modal
     */
    searchModalArtists(searchTerm, inputElement) {
        console.log(`🎭 Ricerca modal artisti: "${searchTerm}"`);
        this.showToast('Ricerca modal artisti - Modulo in sviluppo', 'info');
        // TODO: Implementare ricerca modal artisti
    }
    
    /**
     * Mostra modal aggiungi artista
     */
    showAddArtistModal() {
        console.log('🎭 Mostra modal artisti');
        this.showToast('Modal artisti - In sviluppo', 'warning');
        // TODO: Implementare modal artisti
    }
    
    /**
     * Pulisce la ricerca artisti
     */
    clearSearch() {
        console.log('🧹 Pulisci ricerca');
        const searchInput = document.getElementById('artistSearchInput');
        if (searchInput) {
            searchInput.value = '';
            this.showToast('Ricerca pulita', 'success');
        }
    }
    
    /**
     * Registra nuovo artista
     */
    registerNewArtist() {
        console.log('👤 Registra nuovo artista');
        this.showToast('Registrazione artista - In sviluppo', 'warning');
        // TODO: Implementare registrazione artista
    }
    
    // ==================== METODI LOCALITÀ (PLACEHOLDER) ====================
    
    /**
     * Ricerca venues
     */
    searchVenues(searchTerm, inputElement) {
        console.log(`🏛️ Ricerca venues: "${searchTerm}"`);
        this.showToast('Ricerca venues - Modulo in sviluppo', 'info');
        // TODO: Implementare ricerca venues
    }
    
    /**
     * Cerca dati fatturazione
     */
    searchInvoiceData() {
        console.log('🧾 Cerca dati fatturazione');
        this.showToast('Ricerca dati fatturazione - In sviluppo', 'warning');
        // TODO: Implementare ricerca dati fatturazione
    }
    
    /**
     * Copia indirizzo venue nei campi fatturazione
     */
    copyVenueAddress() {
        console.log('📋 Copia indirizzo venue');
        this.showToast('Copia indirizzo - In sviluppo', 'warning');
        // TODO: Implementare copia indirizzo
    }
    
    /**
     * Pulisce campi fatturazione
     */
    clearInvoiceFields() {
        console.log('🧹 Pulisci campi fatturazione');
        this.showToast('Pulizia campi fatturazione - In sviluppo', 'warning');
        // TODO: Implementare pulizia campi
    }
    
    // ==================== METODI STEP 3 (PLACEHOLDER) ====================
    
    /**
     * Valida e genera XML
     */
    validateAndGenerate() {
        console.log('✅ Valida e genera XML');
        this.showToast('Validazione e generazione XML - In sviluppo', 'warning');
        // TODO: Implementare validazione e generazione
    }
    
    /**
     * Salva come bozza
     */
    saveAsBozza() {
        console.log('💾 Salva come bozza');
        this.showToast('Salvataggio bozza - In sviluppo', 'warning');
        // TODO: Implementare salvataggio bozza
    }
    
    /**
     * Finalizza agibilità
     */
    finalizeAgibilita() {
        console.log('🎯 Finalizza agibilità');
        this.showToast('Finalizzazione agibilità - In sviluppo', 'warning');
        // TODO: Implementare finalizzazione
    }
    
    // ==================== METODI BOZZE (PLACEHOLDER) ====================
    
    /**
     * Aggiorna bozze
     */
    refreshBozze() {
        console.log('🔄 Aggiorna bozze');
        this.showToast('Aggiornamento bozze - In sviluppo', 'info');
        // TODO: Implementare refresh bozze
    }
    
    /**
     * Aggiorna richieste
     */
    refreshRichieste() {
        console.log('🔄 Aggiorna richieste');
        this.showToast('Aggiornamento richieste - In sviluppo', 'info');
        // TODO: Implementare refresh richieste
    }
    
    /**
     * Aggiorna archivio
     */
    refreshArchivio() {
        console.log('🔄 Aggiorna archivio');
        this.showToast('Aggiornamento archivio - In sviluppo', 'info');
        // TODO: Implementare refresh archivio
    }
    
    // ==================== METODI MODAL (PLACEHOLDER) ====================
    
    /**
     * Chiude modal
     */
    closeModal() {
        console.log('❌ Chiudi modal');
        if (window.modalManager) {
            // TODO: Implementare chiusura modal specifica
            this.showToast('Chiusura modal - In sviluppo', 'info');
        }
    }
    
    /**
     * Conferma validazione
     */
    confirmValidation() {
        console.log('✅ Conferma validazione');
        this.showToast('Conferma validazione - In sviluppo', 'warning');
        // TODO: Implementare conferma validazione
    }
    
    /**
     * Elimina bozza
     */
    deleteBozza() {
        console.log('🗑️ Elimina bozza');
        this.showToast('Eliminazione bozza - In sviluppo', 'warning');
        // TODO: Implementare eliminazione bozza
    }
    
    /**
     * Carica bozza
     */
    loadBozza() {
        console.log('📂 Carica bozza');
        this.showToast('Caricamento bozza - In sviluppo', 'warning');
        // TODO: Implementare caricamento bozza
    }
    
    // ==================== KEYBOARD SHORTCUTS ====================
    
    /**
     * Gestisce keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl+S - Salva bozza
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.saveAsBozza();
            return;
        }
        
        // ESC - Chiudi modal
        if (event.key === 'Escape') {
            this.closeModal();
            return;
        }
        
        // Ctrl+H - Torna alla home
        if (event.ctrlKey && event.key === 'h') {
            event.preventDefault();
            this.goToHome();
            return;
        }
    }
    
    // ==================== FORM VALIDATION ====================
    
    /**
     * Setup validazione form
     */
    setupFormValidation() {
        // Validazione real-time per campi richiesti
        document.addEventListener('blur', (e) => {
            if (e.target.hasAttribute('required')) {
                this.validateField(e.target);
            }
        }, true);
        
        // Validazione cascata località
        this.setupLocationCascade();
        
        console.log('✅ Validazione form configurata');
    }
    
    /**
     * Setup cascata località provincia->città->CAP
     */
    setupLocationCascade() {
        const provinciaSelect = document.getElementById('provinciaSelect');
        const cittaSelect = document.getElementById('cittaSelect');
        const capSelect = document.getElementById('capSelect');
        
        if (provinciaSelect) {
            provinciaSelect.addEventListener('change', (e) => {
                this.handleProvinciaChange(e.target.value);
            });
        }
        
        if (cittaSelect) {
            cittaSelect.addEventListener('change', (e) => {
                this.handleCittaChange(e.target.value);
            });
        }
    }
    
    /**
     * Gestisce cambio provincia
     */
    handleProvinciaChange(provincia) {
        console.log(`📍 Provincia selezionata: ${provincia}`);
        this.showToast('Caricamento cascata località - In sviluppo', 'info');
        // TODO: Implementare caricamento città
    }
    
    /**
     * Gestisce cambio città
     */
    handleCittaChange(citta) {
        console.log(`🏙️ Città selezionata: ${citta}`);
        this.showToast('Caricamento CAP - In sviluppo', 'info');
        // TODO: Implementare caricamento CAP
    }
    
    /**
     * Valida singolo campo
     */
    validateField(field) {
        const isValid = field.checkValidity();
        
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
        }
        
        return isValid;
    }
    
    // ==================== STATE LISTENERS ====================
    
    /**
     * Setup listeners per cambiamenti stato
     */
    setupStateListeners() {
        if (!this.stateManager) return;
        
        // Listen per cambiamenti step
        this.stateManager.addListener('currentStep', (step) => {
            console.log(`📊 Step cambiato: ${step}`);
            this.updateStepUI(step);
        });
        
        // Listen per cambiamenti artisti selezionati
        this.stateManager.addListener('selectedArtists', (artists) => {
            console.log(`🎭 Artisti selezionati: ${artists.length}`);
            this.updateArtistsUI(artists);
        });
        
        console.log('✅ State listeners configurati');
    }
    
    /**
     * Aggiorna UI per cambio step
     */
    updateStepUI(step) {
        // Aggiorna progress bar
        if (window.progressBarManager) {
            window.progressBarManager.updateProgress(step);
        }
        
        // Aggiorna navigation buttons
        this.updateNavigationButtons(step);
    }
    
    /**
     * Aggiorna UI per artisti selezionati
     */
    updateArtistsUI(artists) {
        // Aggiorna contatore
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = artists.length;
        }
        
        // Aggiorna stato pulsante avanti step 1
        const goToStep2Btn = document.getElementById('goToStep2');
        if (goToStep2Btn) {
            goToStep2Btn.disabled = artists.length === 0;
        }
    }
    
    /**
     * Aggiorna pulsanti navigazione
     */
    updateNavigationButtons(step) {
        // Step 2 - Verifica completamento step 1
        const goToStep2Btn = document.getElementById('goToStep2');
        if (goToStep2Btn && step === 1) {
            const selectedArtists = this.stateManager.get('selectedArtists') || [];
            goToStep2Btn.disabled = selectedArtists.length === 0;
        }
        
        // Step 3 - Verifica completamento step 2
        const goToStep3Btn = document.getElementById('goToStep3');
        if (goToStep3Btn && step === 2) {
            // TODO: Implementare validazione step 2
            goToStep3Btn.disabled = false; // Temporaneo
        }
        
        // Finalizza - Verifica completamento step 3
        const finalizeBtn = document.getElementById('finalizeAgibilita');
        if (finalizeBtn && step === 3) {
            // TODO: Implementare validazione step 3
            finalizeBtn.disabled = false; // Temporaneo
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Mostra toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        if (window.toastSystem) {
            window.toastSystem.show(message, type, duration);
        } else {
            console.log(`🔔 Toast: ${message} (${type})`);
        }
    }
    
    /**
     * Debug event manager
     */
    debug() {
        return {
            searchTimeouts: this.searchTimeouts.size,
            debounceDelay: this.debounceDelay,
            stateManagerConnected: !!this.stateManager,
            eventsRegistered: [
                'click (data-action)',
                'input (data-search-field)', 
                'keydown (shortcuts)',
                'blur (validation)'
            ]
        };
    }
    
    /**
     * Cleanup event manager
     */
    cleanup() {
        // Pulisci timeout ricerche
        for (const timeoutId of this.searchTimeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.searchTimeouts.clear();
        
        console.log('🧹 EventManager cleanup completato');
    }
}

// Esporta classe
export default EventManager;

console.log('✅ EventManager module loaded');