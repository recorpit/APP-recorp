// artist-list.js - Gestione Lista Artisti Selezionati
// Gestisce lista artisti, compensi, validazione e calcoli totali

console.log('📝 Caricamento ArtistList...');

export class ArtistList {
    constructor(stateManager, toastSystem) {
        this.stateManager = stateManager;
        this.toastSystem = toastSystem;
        
        // Elements
        this.listContainer = null;
        this.emptyStateElement = null;
        this.totalElement = null;
        this.countElement = null;
        this.nextStepButton = null;
        
        // State
        this.selectedArtists = [];
        this.totalCompenso = 0;
        this.isValidForNext = false;
        
        // Configuration
        this.minCompenso = 100;
        this.maxCompenso = 50000;
        this.maxArtists = 20;
        
        console.log('📝 ArtistList creato');
    }
    
    /**
     * Inizializza il gestore lista artisti
     */
    initialize() {
        console.log('📝 Inizializzazione ArtistList...');
        
        try {
            // Setup DOM elements
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial state
            this.loadInitialState();
            
            // Setup validation
            this.setupValidation();
            
            console.log('✅ ArtistList inizializzato');
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione ArtistList:', error);
            this.showToast('Errore inizializzazione lista artisti', 'error');
            return false;
        }
    }
    
    /**
     * Setup elementi DOM
     */
    setupElements() {
        // Container lista principale
        this.listContainer = document.getElementById('selectedArtistsList');
        if (!this.listContainer) {
            throw new Error('Container lista artisti non trovato');
        }
        
        // Empty state
        this.emptyStateElement = document.getElementById('emptyArtistsState');
        if (!this.emptyStateElement) {
            this.createEmptyState();
        }
        
        // Elementi totali e conteggio
        this.totalElement = document.getElementById('totalCompenso');
        this.countElement = document.getElementById('selectedCount');
        
        // Pulsante step successivo
        this.nextStepButton = document.getElementById('goToStep2');
        
        console.log('✅ Elementi DOM configurati');
    }
    
    /**
     * Crea empty state se non esiste
     */
    createEmptyState() {
        this.emptyStateElement = document.createElement('div');
        this.emptyStateElement.id = 'emptyArtistsState';
        this.emptyStateElement.className = 'empty-state';
        this.emptyStateElement.innerHTML = `
            <div class="empty-content">
                <div class="empty-icon">🎭</div>
                <h3>Nessun artista selezionato</h3>
                <p>Cerca e seleziona gli artisti per questa agibilità</p>
                <div class="empty-actions">
                    <button class="btn btn-outline-primary" data-action="showAddArtistModal">
                        <i class="fas fa-user-plus"></i> Registra Nuovo Artista
                    </button>
                </div>
            </div>
        `;
        
        // Inserisci nel container
        this.listContainer.appendChild(this.emptyStateElement);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // State listener per artisti selezionati
        if (this.stateManager) {
            this.stateManager.addListener('selectedArtists', (artists) => {
                this.handleArtistsUpdate(artists);
            });
        }
        
        // Event delegation per azioni nella lista
        this.listContainer.addEventListener('click', (e) => {
            this.handleListAction(e);
        });
        
        // Event delegation per input compensi
        this.listContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('compenso-input')) {
                this.handleCompensoChange(e);
            }
        });
        
        // Validation per input compensi
        this.listContainer.addEventListener('blur', (e) => {
            if (e.target.classList.contains('compenso-input')) {
                this.validateCompensoInput(e.target);
            }
        }, true);
        
        console.log('✅ Event listeners configurati');
    }
    
    /**
     * Carica stato iniziale
     */
    loadInitialState() {
        // Carica artisti dallo state manager
        const savedArtists = this.stateManager?.get('selectedArtists') || [];
        this.selectedArtists = savedArtists;
        
        // Renderizza lista
        this.renderList();
        
        // Calcola totali
        this.calculateTotals();
        
        // Valida per step successivo
        this.validateForNextStep();
        
        console.log(`📊 Stato iniziale: ${this.selectedArtists.length} artisti`);
    }
    
    /**
     * Setup validazione
     */
    setupValidation() {
        // Validazione real-time
        this.setupRealTimeValidation();
        
        // Validation rules
        this.setupValidationRules();
        
        console.log('✅ Validazione configurata');
    }
    
    /**
     * Setup validazione real-time
     */
    setupRealTimeValidation() {
        // Listener per cambio compensi
        this.listContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('compenso-input')) {
                // Debounce validation
                clearTimeout(this.validationTimeout);
                this.validationTimeout = setTimeout(() => {
                    this.validateAndUpdate();
                }, 500);
            }
        });
    }
    
    /**
     * Setup regole validazione
     */
    setupValidationRules() {
        this.validationRules = {
            minArtists: 1,
            maxArtists: this.maxArtists,
            minCompensoPerArtist: this.minCompenso,
            maxCompensoPerArtist: this.maxCompenso,
            maxTotalCompenso: 100000
        };
    }
    
    /**
     * Gestisce aggiornamento lista artisti
     */
    handleArtistsUpdate(artists) {
        this.selectedArtists = artists || [];
        this.renderList();
        this.calculateTotals();
        this.validateForNextStep();
        
        console.log(`📊 Lista aggiornata: ${this.selectedArtists.length} artisti`);
    }
    
    /**
     * Gestisce azioni nella lista
     */
    handleListAction(e) {
        const actionElement = e.target.closest('[data-action]');
        if (!actionElement) return;
        
        const action = actionElement.dataset.action;
        const artistId = actionElement.closest('.artist-item')?.dataset.artistId;
        
        switch (action) {
            case 'removeArtist':
                this.removeArtist(artistId);
                break;
                
            case 'duplicateArtist':
                this.duplicateArtist(artistId);
                break;
                
            case 'resetCompenso':
                this.resetCompenso(artistId);
                break;
                
            case 'moveUp':
                this.moveArtist(artistId, -1);
                break;
                
            case 'moveDown':
                this.moveArtist(artistId, 1);
                break;
                
            default:
                console.warn(`⚠️ Azione lista non gestita: ${action}`);
        }
    }
    
    /**
     * Gestisce cambio compenso
     */
    handleCompensoChange(e) {
        const input = e.target;
        const artistId = input.closest('.artist-item')?.dataset.artistId;
        const newCompenso = parseFloat(input.value) || 0;
        
        if (artistId) {
            this.updateArtistCompenso(artistId, newCompenso);
        }
    }
    
    /**
     * Aggiunge artista alla lista
     */
    addArtist(artist) {
        // Verifica se già presente
        if (this.selectedArtists.some(a => a.id === artist.id)) {
            this.showToast(`${artist.nome} ${artist.cognome} è già nella lista`, 'warning');
            return false;
        }
        
        // Verifica limite massimo
        if (this.selectedArtists.length >= this.maxArtists) {
            this.showToast(`Limite massimo di ${this.maxArtists} artisti raggiunto`, 'error');
            return false;
        }
        
        // Prepara artista per la lista
        const artistForList = {
            ...artist,
            compenso: artist.compenso_base || this.minCompenso,
            selectedAt: new Date().toISOString(),
            listIndex: this.selectedArtists.length
        };
        
        // Aggiungi alla lista
        this.selectedArtists.push(artistForList);
        
        // Aggiorna state manager
        this.updateStateManager();
        
        // Log e feedback
        console.log(`➕ Artista aggiunto: ${artist.nome} ${artist.cognome}`);
        this.showToast(`${artist.nome} ${artist.cognome} aggiunto alla lista`, 'success');
        
        return true;
    }
    
    /**
     * Rimuove artista dalla lista
     */
    removeArtist(artistId) {
        const artistIndex = this.selectedArtists.findIndex(a => a.id === artistId);
        if (artistIndex === -1) {
            console.warn(`⚠️ Artista ${artistId} non trovato nella lista`);
            return false;
        }
        
        const artist = this.selectedArtists[artistIndex];
        
        // Rimuovi dalla lista
        this.selectedArtists.splice(artistIndex, 1);
        
        // Aggiorna indici
        this.updateListIndices();
        
        // Aggiorna state manager
        this.updateStateManager();
        
        // Log e feedback
        console.log(`➖ Artista rimosso: ${artist.nome} ${artist.cognome}`);
        this.showToast(`${artist.nome} ${artist.cognome} rimosso dalla lista`, 'info');
        
        return true;
    }
    
    /**
     * Aggiorna compenso artista
     */
    updateArtistCompenso(artistId, newCompenso) {
        const artist = this.selectedArtists.find(a => a.id === artistId);
        if (!artist) {
            console.warn(`⚠️ Artista ${artistId} non trovato`);
            return false;
        }
        
        // Valida compenso
        const validatedCompenso = this.validateCompenso(newCompenso);
        
        // Aggiorna compenso
        artist.compenso = validatedCompenso;
        artist.updatedAt = new Date().toISOString();
        
        // Aggiorna state manager
        this.updateStateManager();
        
        console.log(`💰 Compenso aggiornato: ${artist.nome} ${artist.cognome} = €${validatedCompenso}`);
        
        return true;
    }
    
    /**
     * Duplica artista (per compensi diversi)
     */
    duplicateArtist(artistId) {
        const originalArtist = this.selectedArtists.find(a => a.id === artistId);
        if (!originalArtist) {
            console.warn(`⚠️ Artista ${artistId} non trovato`);
            return false;
        }
        
        // Verifica limite
        if (this.selectedArtists.length >= this.maxArtists) {
            this.showToast(`Limite massimo di ${this.maxArtists} artisti raggiunto`, 'error');
            return false;
        }
        
        // Crea duplicato con ID univoco
        const duplicatedArtist = {
            ...originalArtist,
            id: `${originalArtist.id}_dup_${Date.now()}`,
            selectedAt: new Date().toISOString(),
            listIndex: this.selectedArtists.length,
            isDuplicate: true,
            originalId: originalArtist.id
        };
        
        // Aggiungi alla lista
        this.selectedArtists.push(duplicatedArtist);
        
        // Aggiorna state manager
        this.updateStateManager();
        
        this.showToast(`${originalArtist.nome} ${originalArtist.cognome} duplicato`, 'success');
        
        return true;
    }
    
    /**
     * Reset compenso al valore base
     */
    resetCompenso(artistId) {
        const artist = this.selectedArtists.find(a => a.id === artistId);
        if (!artist) return false;
        
        const baseCompenso = artist.compenso_base || this.minCompenso;
        return this.updateArtistCompenso(artistId, baseCompenso);
    }
    
    /**
     * Sposta artista nella lista
     */
    moveArtist(artistId, direction) {
        const currentIndex = this.selectedArtists.findIndex(a => a.id === artistId);
        if (currentIndex === -1) return false;
        
        const newIndex = currentIndex + direction;
        
        // Verifica bounds
        if (newIndex < 0 || newIndex >= this.selectedArtists.length) return false;
        
        // Swap artisti
        [this.selectedArtists[currentIndex], this.selectedArtists[newIndex]] = 
        [this.selectedArtists[newIndex], this.selectedArtists[currentIndex]];
        
        // Aggiorna indici
        this.updateListIndices();
        
        // Aggiorna state manager
        this.updateStateManager();
        
        return true;
    }
    
    /**
     * Aggiorna indici lista
     */
    updateListIndices() {
        this.selectedArtists.forEach((artist, index) => {
            artist.listIndex = index;
        });
    }
    
    /**
     * Renderizza lista completa
     */
    renderList() {
        // Pulisci container (tranne empty state)
        const items = this.listContainer.querySelectorAll('.artist-item');
        items.forEach(item => item.remove());
        
        if (this.selectedArtists.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        
        // Renderizza ogni artista
        this.selectedArtists.forEach((artist, index) => {
            const artistElement = this.createArtistElement(artist, index);
            this.listContainer.appendChild(artistElement);
        });
        
        console.log(`🎨 Lista renderizzata: ${this.selectedArtists.length} artisti`);
    }
    
    /**
     * Crea elemento artista
     */
    createArtistElement(artist, index) {
        const element = document.createElement('div');
        element.className = 'artist-item';
        element.dataset.artistId = artist.id;
        element.dataset.index = index;
        
        const isDuplicate = artist.isDuplicate;
        const isFirst = index === 0;
        const isLast = index === this.selectedArtists.length - 1;
        
        element.innerHTML = `
            <div class="artist-card">
                <div class="artist-header">
                    <div class="artist-info">
                        <h4 class="artist-name">
                            ${artist.nome} ${artist.cognome}
                            ${isDuplicate ? '<span class="duplicate-badge">DUPLICATO</span>' : ''}
                        </h4>
                        <div class="artist-details">
                            <span class="artist-cf">${artist.codice_fiscale}</span>
                            <span class="artist-category">${artist.categoria}</span>
                        </div>
                    </div>
                    <div class="artist-actions">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary" 
                                    data-action="moveUp" 
                                    ${isFirst ? 'disabled' : ''}
                                    title="Sposta su">
                                <i class="fas fa-chevron-up"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" 
                                    data-action="moveDown" 
                                    ${isLast ? 'disabled' : ''}
                                    title="Sposta giù">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" 
                                data-action="duplicateArtist" 
                                title="Duplica artista">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                data-action="removeArtist" 
                                title="Rimuovi artista">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="artist-compenso">
                    <label class="form-label">Compenso (€)</label>
                    <div class="input-group">
                        <span class="input-group-text">€</span>
                        <input type="number" 
                               class="form-control compenso-input" 
                               value="${artist.compenso}" 
                               min="${this.minCompenso}" 
                               max="${this.maxCompenso}" 
                               step="50"
                               required>
                        <button class="btn btn-outline-secondary" 
                                data-action="resetCompenso" 
                                title="Reset al valore base (€${artist.compenso_base || this.minCompenso})">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                    <div class="compenso-feedback">
                        <small class="text-muted">
                            Base: €${artist.compenso_base?.toLocaleString() || 'N/A'} | 
                            Min: €${this.minCompenso.toLocaleString()} | 
                            Max: €${this.maxCompenso.toLocaleString()}
                        </small>
                    </div>
                </div>
                
                <div class="artist-stats">
                    <small class="text-muted">
                        Aggiunto: ${new Date(artist.selectedAt).toLocaleString()} |
                        Posizione: ${index + 1}/${this.selectedArtists.length}
                    </small>
                </div>
            </div>
        `;
        
        return element;
    }
    
    /**
     * Mostra empty state
     */
    showEmptyState() {
        if (this.emptyStateElement) {
            this.emptyStateElement.style.display = 'block';
        }
    }
    
    /**
     * Nascondi empty state
     */
    hideEmptyState() {
        if (this.emptyStateElement) {
            this.emptyStateElement.style.display = 'none';
        }
    }
    
    /**
     * Calcola totali
     */
    calculateTotals() {
        this.totalCompenso = this.selectedArtists.reduce((total, artist) => {
            return total + (artist.compenso || 0);
        }, 0);
        
        // Aggiorna UI
        this.updateTotalsUI();
        
        console.log(`💰 Totale compensi: €${this.totalCompenso.toLocaleString()}`);
    }
    
    /**
     * Aggiorna UI totali
     */
    updateTotalsUI() {
        // Aggiorna conteggio
        if (this.countElement) {
            this.countElement.textContent = this.selectedArtists.length;
        }
        
        // Aggiorna totale
        if (this.totalElement) {
            this.totalElement.textContent = `€${this.totalCompenso.toLocaleString()}`;
        }
        
        // Aggiorna altri elementi correlati
        this.updateRelatedElements();
    }
    
    /**
     * Aggiorna elementi correlati
     */
    updateRelatedElements() {
        // Badge conteggio in altre parti dell'UI
        const countBadges = document.querySelectorAll('.selected-artists-count');
        countBadges.forEach(badge => {
            badge.textContent = this.selectedArtists.length;
            badge.style.display = this.selectedArtists.length > 0 ? 'inline' : 'none';
        });
        
        // Total badges
        const totalBadges = document.querySelectorAll('.total-compenso');
        totalBadges.forEach(badge => {
            badge.textContent = `€${this.totalCompenso.toLocaleString()}`;
        });
    }
    
    /**
     * Valida compenso
     */
    validateCompenso(compenso) {
        const numCompenso = parseFloat(compenso) || 0;
        
        if (numCompenso < this.minCompenso) {
            return this.minCompenso;
        }
        
        if (numCompenso > this.maxCompenso) {
            return this.maxCompenso;
        }
        
        return numCompenso;
    }
    
    /**
     * Valida input compenso
     */
    validateCompensoInput(input) {
        const value = parseFloat(input.value) || 0;
        const isValid = value >= this.minCompenso && value <= this.maxCompenso;
        
        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            
            // Mostra messaggio errore
            this.showToast(
                `Compenso deve essere tra €${this.minCompenso} e €${this.maxCompenso}`,
                'error'
            );
        }
        
        return isValid;
    }
    
    /**
     * Valida per step successivo
     */
    validateForNextStep() {
        const isValid = this.validateList();
        this.isValidForNext = isValid;
        
        // Aggiorna pulsante
        if (this.nextStepButton) {
            this.nextStepButton.disabled = !isValid;
            
            if (isValid) {
                this.nextStepButton.classList.remove('btn-outline-primary');
                this.nextStepButton.classList.add('btn-primary');
            } else {
                this.nextStepButton.classList.remove('btn-primary');
                this.nextStepButton.classList.add('btn-outline-primary');
            }
        }
        
        return isValid;
    }
    
    /**
     * Valida lista completa
     */
    validateList() {
        const errors = [];
        
        // Verifica numero artisti
        if (this.selectedArtists.length === 0) {
            errors.push('Seleziona almeno un artista');
        }
        
        if (this.selectedArtists.length > this.maxArtists) {
            errors.push(`Massimo ${this.maxArtists} artisti consentiti`);
        }
        
        // Verifica compensi
        const invalidCompensi = this.selectedArtists.filter(artist => {
            const compenso = artist.compenso || 0;
            return compenso < this.minCompenso || compenso > this.maxCompenso;
        });
        
        if (invalidCompensi.length > 0) {
            errors.push(`${invalidCompensi.length} compensi non validi`);
        }
        
        // Verifica totale massimo
        if (this.totalCompenso > this.validationRules.maxTotalCompenso) {
            errors.push(`Totale compensi superiore a €${this.validationRules.maxTotalCompenso.toLocaleString()}`);
        }
        
        // Log errori se presenti
        if (errors.length > 0) {
            console.warn('⚠️ Validazione lista:', errors);
        }
        
        return errors.length === 0;
    }
    
    /**
     * Valida e aggiorna
     */
    validateAndUpdate() {
        this.calculateTotals();
        this.validateForNextStep();
    }
    
    /**
     * Aggiorna state manager
     */
    updateStateManager() {
        if (this.stateManager) {
            this.stateManager.update('selectedArtists', [...this.selectedArtists]);
        }
        
        // Trigger calcoli e validazione
        this.validateAndUpdate();
    }
    
    /**
     * Esporta dati per step successivo
     */
    exportForNextStep() {
        return {
            artists: [...this.selectedArtists],
            totalCompenso: this.totalCompenso,
            count: this.selectedArtists.length,
            isValid: this.isValidForNext,
            exportedAt: new Date().toISOString()
        };
    }
    
    /**
     * Mostra toast
     */
    showToast(message, type = 'info', duration = 3000) {
        if (this.toastSystem) {
            this.toastSystem.show(message, type, duration);
        } else {
            console.log(`🔔 Toast: ${message} (${type})`);
        }
    }
    
    /**
     * Debug artist list
     */
    debug() {
        return {
            selectedArtists: this.selectedArtists.length,
            totalCompenso: this.totalCompenso,
            isValidForNext: this.isValidForNext,
            validationRules: this.validationRules,
            maxArtists: this.maxArtists,
            minCompenso: this.minCompenso,
            maxCompenso: this.maxCompenso
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Clear validation timeout
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }
        
        // Reset state
        this.selectedArtists = [];
        this.totalCompenso = 0;
        this.isValidForNext = false;
        
        console.log('🧹 ArtistList cleanup completato');
    }
}

// Esporta classe
export default ArtistList;

console.log('✅ ArtistList module loaded');