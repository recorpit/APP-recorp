// event-handlers.js - Gestione Eventi Sistema Agibilità
console.log('🎧 Caricamento EventManager...');

export class EventManager {
    constructor(stateManager, uiManager) {
        this.stateManager = stateManager;
        this.uiManager = uiManager;
        
        // Mappa delle azioni disponibili
        this.actionHandlers = new Map();
        
        console.log('🎧 EventManager inizializzato');
    }
    
    /**
     * Setup dei listeners globali del sistema
     */
    setupGlobalListeners() {
        console.log('🎧 Setup listeners globali...');
        
        // Event delegation per data-action
        document.addEventListener('click', this.handleClick.bind(this));
        
        // Input events per ricerche real-time
        document.addEventListener('input', this.handleInput.bind(this));
        
        // Change events per filtri e form
        document.addEventListener('change', this.handleChange.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Modal handlers
        this.setupModalHandlers();
        
        // Form handlers
        this.setupFormHandlers();
        
        // Tab handlers
        this.setupTabHandlers();
        
        // Registra azioni di sistema
        this.registerSystemActions();
        
        console.log('✅ Listeners globali configurati');
    }
    
    /**
     * Gestisce i click con event delegation
     */
    handleClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const element = target;
        
        // Previeni comportamento default se necessario
        if (target.tagName === 'A' || target.type === 'submit') {
            event.preventDefault();
        }
        
        // Esegui azione
        this.executeAction(action, element, event);
    }
    
    /**
     * Gestisce input events per ricerche real-time
     */
    handleInput(event) {
        const target = event.target;
        
        // Gestisci ricerche con debouncing
        if (target.dataset.searchField) {
            this.handleSearchInput(target);
        }
        
        // Gestisci validazione real-time
        if (target.classList.contains('form-control')) {
            this.handleFormValidation(target);
        }
    }
    
    /**
     * Gestisce change events per filtri e select
     */
    handleChange(event) {
        const target = event.target;
        
        // Gestisci cascata località
        if (target.id === 'provinciaSelect') {
            this.handleProvinciaChange(target);
        } else if (target.id === 'cittaSelect') {
            this.handleCittaChange(target);
        }
        
        // Gestisci filtri
        if (target.dataset.filter) {
            this.handleFilterChange(target);
        }
        
        // Gestisci date
        if (target.type === 'date') {
            this.handleDateChange(target);
        }
    }
    
    /**
     * Gestisce keyboard shortcuts
     */
    handleKeyboard(event) {
        // Ctrl+S per salvataggio
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.executeAction('saveAsBozza');
        }
        
        // Escape per chiudere modal
        if (event.key === 'Escape') {
            this.executeAction('closeModal');
        }
        
        // Enter per confermare in modal
        if (event.key === 'Enter' && event.target.closest('.agibilita-modal')) {
            const confirmButton = event.target.closest('.agibilita-modal')
                .querySelector('[data-action*="confirm"]');
            if (confirmButton) {
                confirmButton.click();
            }
        }
    }
    
    /**
     * Setup handlers per modal
     */
    setupModalHandlers() {
        // Click outside to close
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('agibilita-modal')) {
                this.executeAction('closeModal');
            }
        });
        
        // Auto-focus nei modal
        document.addEventListener('DOMNodeInserted', (event) => {
            if (event.target.classList && event.target.classList.contains('agibilita-modal')) {
                const firstInput = event.target.querySelector('input:not([type="hidden"])');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            }
        });
    }
    
    /**
     * Setup handlers per form
     */
    setupFormHandlers() {
        // Prevent form submission
        document.addEventListener('submit', (event) => {
            event.preventDefault();
        });
        
        // Auto-save indicators
        document.addEventListener('input', (event) => {
            if (event.target.classList.contains('form-control')) {
                this.stateManager.update('drafts.hasUnsavedChanges', true);
            }
        });
    }
    
    /**
     * Setup handlers per tab system
     */
    setupTabHandlers() {
        document.addEventListener('click', (event) => {
            const tab = event.target.closest('.tab[data-tab]');
            if (!tab) return;
            
            const tabName = tab.dataset.tab;
            this.handleTabClick(tabName, tab);
        });
    }
    
    /**
     * Registra le azioni di sistema
     */
    registerSystemActions() {
        // Azioni di navigazione
        this.registerAction('startNewAgibilita', this.startNewAgibilita.bind(this));
        this.registerAction('showEditAgibilita', this.showEditAgibilita.bind(this));
        this.registerAction('showBozzeRichieste', this.showBozzeRichieste.bind(this));
        this.registerAction('goToHome', this.goToHome.bind(this));
        this.registerAction('goToStep1', this.goToStep1.bind(this));
        this.registerAction('goToStep2', this.goToStep2.bind(this));
        this.registerAction('goToStep3', this.goToStep3.bind(this));
        
        // Azioni modal
        this.registerAction('showAddArtistModal', this.showAddArtistModal.bind(this));
        this.registerAction('closeModal', this.closeModal.bind(this));
        
        // Azioni ricerca
        this.registerAction('clearSearch', this.clearSearch.bind(this));
        this.registerAction('searchInvoiceData', this.searchInvoiceData.bind(this));
        this.registerAction('copyVenueAddress', this.copyVenueAddress.bind(this));
        this.registerAction('clearInvoiceFields', this.clearInvoiceFields.bind(this));
        
        // Azioni sistema
        this.registerAction('refreshBozze', this.refreshBozze.bind(this));
        this.registerAction('refreshRichieste', this.refreshRichieste.bind(this));
        this.registerAction('refreshArchivio', this.refreshArchivio.bind(this));
        this.registerAction('saveAsBozza', this.saveAsBozza.bind(this));
        this.registerAction('validateAndGenerate', this.validateAndGenerate.bind(this));
        this.registerAction('finalizeAgibilita', this.finalizeAgibilita.bind(this));
    }
    
    /**
     * Registra un'azione personalizzata
     */
    registerAction(actionName, handler) {
        this.actionHandlers.set(actionName, handler);
    }
    
    /**
     * Esegue un'azione
     */
    executeAction(actionName, element = null, event = null) {
        try {
            if (this.actionHandlers.has(actionName)) {
                const handler = this.actionHandlers.get(actionName);
                handler(element, event);
            } else {
                console.warn(`⚠️ Azione non trovata: ${actionName}`);
            }
        } catch (error) {
            console.error(`❌ Errore esecuzione azione ${actionName}:`, error);
            this.uiManager?.toast?.show(`Errore: ${error.message}`, 'error');
        }
    }
    
    /**
     * Gestisce input di ricerca con debouncing
     */
    handleSearchInput(target) {
        // Clear existing timeout
        if (target.searchTimeout) {
            clearTimeout(target.searchTimeout);
        }
        
        // Set new timeout per debouncing
        target.searchTimeout = setTimeout(() => {
            const searchField = target.dataset.searchField;
            const query = target.value.trim();
            
            if (searchField === 'artist' || searchField === 'modal-artist') {
                this.handleArtistSearch(query, target);
            } else if (searchField === 'venue') {
                this.handleVenueSearch(query, target);
            }
        }, 300);
    }
    
    /**
     * Gestisce ricerca artisti
     */
    handleArtistSearch(query, target) {
        console.log('🔍 Ricerca artisti:', query);
        
        if (query.length < 2) {
            this.hideSuggestions(target);
            return;
        }
        
        // Qui sarà collegato al modulo artist-search
        if (window.agibilitaSystem?.modules?.artistSearch) {
            window.agibilitaSystem.modules.artistSearch.searchArtists(query, target);
        }
    }
    
    /**
     * Gestisce ricerca venue
     */
    handleVenueSearch(query, target) {
        console.log('🔍 Ricerca venue:', query);
        
        if (query.length < 2) {
            return;
        }
        
        // Qui sarà collegato al modulo venue-search
        if (window.agibilitaSystem?.modules?.venueSearch) {
            window.agibilitaSystem.modules.venueSearch.searchVenue(query, target);
        }
    }
    
    /**
     * Nasconde suggestions dropdown
     */
    hideSuggestions(target) {
        const container = target.closest('.search-input-container');
        if (container) {
            const suggestions = container.querySelector('.search-suggestions');
            if (suggestions) {
                suggestions.style.display = 'none';
            }
        }
    }
    
    /**
     * Gestisce validazione form real-time
     */
    handleFormValidation(target) {
        // Rimuovi classi di validazione esistenti
        target.classList.remove('validation-error', 'validation-success');
        
        // Validazione specifica per tipo campo
        let isValid = true;
        
        if (target.type === 'email') {
            isValid = this.validateEmail(target.value);
        } else if (target.id === 'codiceFiscaleAzienda') {
            isValid = this.validateCodiceFiscale(target.value);
        } else if (target.required) {
            isValid = target.value.trim().length > 0;
        }
        
        // Applica classe appropriata
        target.classList.add(isValid ? 'validation-success' : 'validation-error');
    }
    
    /**
     * Gestisce cambio provincia
     */
    handleProvinciaChange(select) {
        const provinciaData = select.selectedOptions[0]?.dataset.provincia;
        if (!provinciaData) return;
        
        const provincia = JSON.parse(provinciaData);
        
        // Aggiorna stato
        this.stateManager.update('locationData.provincia', provincia.codice);
        
        // Carica città
        if (window.agibilitaSystem?.modules?.locationLoader) {
            window.agibilitaSystem.modules.locationLoader.loadCitta(provincia.codice);
        }
        
        // Reset città e CAP
        const cittaSelect = document.getElementById('cittaSelect');
        const capSelect = document.getElementById('capSelect');
        
        if (cittaSelect) {
            cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
            cittaSelect.disabled = false;
        }
        
        if (capSelect) {
            capSelect.innerHTML = '<option value="">Prima seleziona città...</option>';
            capSelect.disabled = true;
        }
    }
    
    /**
     * Gestisce cambio città
     */
    handleCittaChange(select) {
        const comuneData = select.selectedOptions[0]?.dataset.comune;
        if (!comuneData) return;
        
        const comune = JSON.parse(comuneData);
        
        // Aggiorna stato
        this.stateManager.update('locationData.citta', comune.codice_istat);
        this.stateManager.update('locationData.cittaNome', comune.denominazione_ita);
        this.stateManager.update('locationData.codiceBelfiore', comune.codice_belfiore);
        
        // Carica CAP
        if (window.agibilitaSystem?.modules?.locationLoader) {
            window.agibilitaSystem.modules.locationLoader.loadCAP(comune.codice_istat);
        }
        
        // Abilita CAP select
        const capSelect = document.getElementById('capSelect');
        if (capSelect) {
            capSelect.disabled = false;
        }
    }
    
    /**
     * Gestisce cambio filtri
     */
    handleFilterChange(target) {
        const filterType = target.dataset.filter;
        const filterValue = target.value;
        
        console.log(`🔍 Filtro applicato: ${filterType} = ${filterValue}`);
        
        // Qui saranno collegati i moduli di filtro appropriati
    }
    
    /**
     * Gestisce cambio date
     */
    handleDateChange(target) {
        if (target.id === 'dataInizio') {
            const dataInizio = target.value;
            this.stateManager.update('agibilitaData.dataInizio', dataInizio);
            
            // Auto-aggiorna data fine se non impostata o precedente
            const dataFineElement = document.getElementById('dataFine');
            if (dataFineElement && (!dataFineElement.value || dataFineElement.value <= dataInizio)) {
                const nextDay = new Date(dataInizio);
                nextDay.setDate(nextDay.getDate() + 1);
                dataFineElement.value = nextDay.toISOString().split('T')[0];
                this.stateManager.update('agibilitaData.dataFine', dataFineElement.value);
            }
            
        } else if (target.id === 'dataFine') {
            this.stateManager.update('agibilitaData.dataFine', target.value);
        }
        
        this.updateDateInfo();
    }
    
    /**
     * Aggiorna info sulla durata dell'evento
     */
    updateDateInfo() {
        const dataInizio = this.stateManager.get('agibilitaData.dataInizio');
        const dataFine = this.stateManager.get('agibilitaData.dataFine');
        
        const dateInfoElement = document.getElementById('dateInfo');
        if (!dateInfoElement || !dataInizio || !dataFine) return;
        
        const start = new Date(dataInizio);
        const end = new Date(dataFine);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        dateInfoElement.innerHTML = `
            <i class="fas fa-calendar-alt"></i>
            Durata evento: ${diffDays} giorno${diffDays > 1 ? 'i' : ''}
            (dal ${start.toLocaleDateString('it-IT')} al ${end.toLocaleDateString('it-IT')})
        `;
        dateInfoElement.style.display = 'block';
    }
    
    /**
     * Gestisce click sui tab
     */
    handleTabClick(tabName, tabElement) {
        // Rimuovi active da tutti i tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Rimuovi active da tutti i contenuti
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Attiva tab e contenuto corrente
        tabElement.classList.add('active');
        const content = document.getElementById(`${tabName}Content`);
        if (content) {
            content.classList.add('active');
        }
        
        // Carica contenuto se necessario
        if (window.agibilitaSystem?.modules?.requestTabs) {
            window.agibilitaSystem.modules.requestTabs.showContentTab(tabName);
        }
    }
    
    // ==================== AZIONI DI NAVIGAZIONE ====================
    
    startNewAgibilita() {
        console.log('🎭 Avvio nuova agibilità...');
        this.stateManager.reset(true);
        this.uiManager?.navigation?.showSection('step1');
        this.uiManager?.toast?.show('Nuova agibilità avviata', 'info');
    }
    
    showEditAgibilita() {
        console.log('✏️ Modifica agibilità...');
        this.uiManager?.toast?.show('Funzione in sviluppo', 'warning');
    }
    
    showBozzeRichieste() {
        console.log('📂 Mostra bozze e richieste...');
        this.uiManager?.navigation?.showSection('bozzeRichiesteSection');
    }
    
    goToHome() {
        this.uiManager?.navigation?.showSection('homeSection');
    }
    
    goToStep1() {
        this.uiManager?.navigation?.showSection('step1');
    }
    
    goToStep2() {
        if (this.stateManager.isStepComplete(1)) {
            this.uiManager?.navigation?.showSection('step2');
        } else {
            this.uiManager?.toast?.show('Completa la selezione artisti prima di procedere', 'warning');
        }
    }
    
    goToStep3() {
        if (this.stateManager.isStepComplete(2)) {
            this.uiManager?.navigation?.showSection('step3');
        } else {
            this.uiManager?.toast?.show('Completa i dati località prima di procedere', 'warning');
        }
    }
    
    // ==================== AZIONI MODAL ====================
    
    showAddArtistModal() {
        this.uiManager?.modal?.showModal('addArtistModal');
    }
    
    closeModal() {
        this.uiManager?.modal?.closeModal();
    }
    
    // ==================== AZIONI RICERCA ====================
    
    clearSearch() {
        const searchInput = document.getElementById('artistSearchInput');
        if (searchInput) {
            searchInput.value = '';
            this.hideSuggestions(searchInput);
        }
    }
    
    searchInvoiceData() {
        this.uiManager?.toast?.show('Ricerca dati fatturazione...', 'info');
        // Qui sarà collegato il modulo invoice-data
    }
    
    copyVenueAddress() {
        const locationData = this.stateManager.get('locationData');
        if (!locationData.indirizzoVenue) {
            this.uiManager?.toast?.show('Inserisci prima l\'indirizzo venue', 'warning');
            return;
        }
        
        // Copia indirizzo venue in fatturazione
        this.stateManager.update('invoiceData.indirizzoFatturazione', locationData.indirizzoVenue);
        this.stateManager.update('invoiceData.cittaFatturazione', locationData.cittaNome);
        this.stateManager.update('invoiceData.capFatturazione', locationData.cap);
        
        // Aggiorna UI
        const indirizzoFatt = document.getElementById('indirizzoFatturazione');
        const cittaFatt = document.getElementById('cittaFatturazione');
        const capFatt = document.getElementById('capFatturazione');
        
        if (indirizzoFatt) indirizzoFatt.value = locationData.indirizzoVenue;
        if (cittaFatt) cittaFatt.value = locationData.cittaNome;
        if (capFatt) capFatt.value = locationData.cap;
        
        this.uiManager?.toast?.show('Indirizzo copiato dalla venue', 'success');
    }
    
    clearInvoiceFields() {
        const invoiceFields = ['ragioneSociale', 'codiceFiscaleAzienda', 'partitaIva', 
                              'indirizzoFatturazione', 'cittaFatturazione', 'capFatturazione'];
        
        invoiceFields.forEach(field => {
            this.stateManager.update(`invoiceData.${field}`, '');
            const element = document.getElementById(field);
            if (element) element.value = '';
        });
        
        this.uiManager?.toast?.show('Campi fatturazione puliti', 'info');
    }
    
    // ==================== AZIONI SISTEMA ====================
    
    refreshBozze() {
        this.uiManager?.toast?.show('Aggiornamento bozze...', 'info');
        // Qui sarà collegato il modulo draft-manager
    }
    
    refreshRichieste() {
        this.uiManager?.toast?.show('Aggiornamento richieste...', 'info');
        // Qui sarà collegato il modulo request-manager
    }
    
    refreshArchivio() {
        this.uiManager?.toast?.show('Aggiornamento archivio...', 'info');
    }
    
    saveAsBozza() {
        this.uiManager?.toast?.show('Salvataggio bozza...', 'info');
        // Qui sarà collegato il modulo draft-manager
    }
    
    validateAndGenerate() {
        if (!this.stateManager.isStepComplete(3)) {
            this.uiManager?.toast?.show('Completa tutti i campi obbligatori', 'warning');
            return;
        }
        
        this.uiManager?.toast?.show('Validazione e generazione XML...', 'info');
        // Qui saranno collegati i moduli di validazione e XML
    }
    
    finalizeAgibilita() {
        this.uiManager?.toast?.show('Finalizzazione agibilità...', 'info');
        // Qui sarà gestito il salvataggio definitivo
    }
    
    // ==================== UTILITY ====================
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    validateCodiceFiscale(cf) {
        const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
        return cfRegex.test(cf.toUpperCase());
    }
    
    /**
     * Debug: mostra informazioni sui listeners attivi
     */
    debug() {
        console.group('🎧 Debug EventManager');
        console.log('Azioni registrate:', this.actionHandlers.size);
        console.log('Lista azioni:', Array.from(this.actionHandlers.keys()));
        console.groupEnd();
    }
}

// Esporta classe principale
export default EventManager;

console.log('✅ EventManager module loaded');