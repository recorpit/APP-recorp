// artist-search.js - Sistema Ricerca Artisti Real-time
// Gestisce ricerca, autocomplete e suggestions per artisti agibilità

import { DatabaseService } from '../../config/supabase-config-agibilita.js';

console.log('🎭 Caricamento ArtistSearch...');

export class ArtistSearch {
    constructor(stateManager, toastSystem) {
        this.stateManager = stateManager;
        this.toastSystem = toastSystem;
        this.searchCache = new Map();
        this.searchTimeout = null;
        this.debounceDelay = 300;
        this.minSearchLength = 2;
        this.maxResults = 10;
        
        // Elements
        this.searchInput = null;
        this.resultsContainer = null;
        this.clearButton = null;
        this.noResultsElement = null;
        
        // State
        this.isSearching = false;
        this.currentResults = [];
        this.selectedIndex = -1;
        
        console.log('🎭 ArtistSearch creato');
    }
    
    /**
     * Inizializza il sistema di ricerca
     */
    initialize() {
        console.log('🎭 Inizializzazione ArtistSearch...');
        
        try {
            // Setup DOM elements
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup keyboard navigation
            this.setupKeyboardNavigation();
            
            // Reset initial state
            this.resetSearch();
            
            console.log('✅ ArtistSearch inizializzato');
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione ArtistSearch:', error);
            this.showToast('Errore inizializzazione ricerca artisti', 'error');
            return false;
        }
    }
    
    /**
     * Setup elementi DOM
     */
    setupElements() {
        // Input ricerca principale
        this.searchInput = document.getElementById('artistSearchInput');
        if (!this.searchInput) {
            throw new Error('Input ricerca artisti non trovato');
        }
        
        // Container risultati
        this.resultsContainer = document.getElementById('artistSearchResults');
        if (!this.resultsContainer) {
            // Crea container se non esiste
            this.createResultsContainer();
        }
        
        // Pulsante clear
        this.clearButton = document.getElementById('clearSearch');
        
        // Element no results
        this.noResultsElement = document.createElement('div');
        this.noResultsElement.className = 'search-no-results';
        this.noResultsElement.innerHTML = `
            <div class="no-results-content">
                <i class="fas fa-search"></i>
                <p>Nessun artista trovato</p>
                <small>Prova con un altro termine di ricerca</small>
            </div>
        `;
        
        console.log('✅ Elementi DOM configurati');
    }
    
    /**
     * Crea container risultati se non esiste
     */
    createResultsContainer() {
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.id = 'artistSearchResults';
        this.resultsContainer.className = 'search-results-container';
        this.resultsContainer.style.display = 'none';
        
        // Inserisci dopo l'input di ricerca
        this.searchInput.parentNode.insertBefore(
            this.resultsContainer, 
            this.searchInput.nextSibling
        );
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Input ricerca con debouncing
        this.searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            this.handleSearchInput(searchTerm);
        });
        
        // Focus/blur per mostrare/nascondere risultati
        this.searchInput.addEventListener('focus', () => {
            if (this.currentResults.length > 0) {
                this.showResults();
            }
        });
        
        this.searchInput.addEventListener('blur', (e) => {
            // Delay per permettere click sui risultati
            setTimeout(() => {
                if (!this.resultsContainer.contains(document.activeElement)) {
                    this.hideResults();
                }
            }, 150);
        });
        
        // Clear button
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Click sui risultati
        this.resultsContainer.addEventListener('click', (e) => {
            const artistItem = e.target.closest('.search-result-item');
            if (artistItem) {
                const artistId = artistItem.dataset.artistId;
                this.selectArtist(artistId);
            }
        });
        
        // Click fuori per chiudere
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && 
                !this.resultsContainer.contains(e.target)) {
                this.hideResults();
            }
        });
        
        console.log('✅ Event listeners configurati');
    }
    
    /**
     * Setup navigazione keyboard
     */
    setupKeyboardNavigation() {
        this.searchInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateResults(1);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateResults(-1);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    this.selectCurrentResult();
                    break;
                    
                case 'Escape':
                    this.hideResults();
                    this.searchInput.blur();
                    break;
            }
        });
    }
    
    /**
     * Gestisce input ricerca con debouncing
     */
    handleSearchInput(searchTerm) {
        // Cancella timeout precedente
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Update UI immediate
        this.updateClearButton(searchTerm.length > 0);
        
        // Se termine troppo corto, nascondi risultati
        if (searchTerm.length < this.minSearchLength) {
            this.hideResults();
            return;
        }
        
        // Nuovo timeout con debouncing
        this.searchTimeout = setTimeout(() => {
            this.performSearch(searchTerm);
        }, this.debounceDelay);
    }
    
    /**
     * Esegue la ricerca
     */
    async performSearch(searchTerm) {
        if (this.isSearching) return;
        
        console.log(`🔍 Ricerca artisti: "${searchTerm}"`);
        
        try {
            this.isSearching = true;
            this.showLoadingState();
            
            // Check cache prima
            const cacheKey = searchTerm.toLowerCase();
            if (this.searchCache.has(cacheKey)) {
                console.log('💾 Risultati da cache');
                const cachedResults = this.searchCache.get(cacheKey);
                this.displayResults(cachedResults, searchTerm);
                return;
            }
            
            // Ricerca dal database
            const results = await this.searchArtistsFromDatabase(searchTerm);
            
            // Cache risultati
            this.searchCache.set(cacheKey, results);
            
            // Mostra risultati
            this.displayResults(results, searchTerm);
            
        } catch (error) {
            console.error('❌ Errore ricerca artisti:', error);
            this.showErrorState();
            this.showToast('Errore durante la ricerca artisti', 'error');
            
        } finally {
            this.isSearching = false;
        }
    }
    
    /**
     * Ricerca artisti dal database
     */
    async searchArtistsFromDatabase(searchTerm) {
        try {
            // Usa DatabaseService per ricerca
            const results = await DatabaseService.searchArtistsForAgibilita(searchTerm, {
                limit: this.maxResults,
                fields: ['id', 'nome', 'cognome', 'codice_fiscale', 'categoria', 'compenso_base']
            });
            
            console.log(`📊 Trovati ${results.length} artisti`);
            return results;
            
        } catch (error) {
            console.error('❌ Errore database ricerca artisti:', error);
            
            // Fallback con dati mock per sviluppo
            return this.getMockArtists(searchTerm);
        }
    }
    
    /**
     * Dati mock per sviluppo
     */
    getMockArtists(searchTerm) {
        const mockArtists = [
            {
                id: '1',
                nome: 'Mario',
                cognome: 'Rossi',
                codice_fiscale: 'RSSMRA80A01H501Z',
                categoria: 'Cantante',
                compenso_base: 1500
            },
            {
                id: '2', 
                nome: 'Luigi',
                cognome: 'Bianchi',
                codice_fiscale: 'BNCLGU75B02F205Y',
                categoria: 'Musicista',
                compenso_base: 1200
            },
            {
                id: '3',
                nome: 'Anna',
                cognome: 'Verdi',
                codice_fiscale: 'VRDNNA85C03L736X',
                categoria: 'Ballerina',
                compenso_base: 1000
            },
            {
                id: '4',
                nome: 'Paolo',
                cognome: 'Neri',
                codice_fiscale: 'NREPLA90D04M082W',
                categoria: 'Attore',
                compenso_base: 1800
            }
        ];
        
        // Filtra in base al termine di ricerca
        const filtered = mockArtists.filter(artist => {
            const fullName = `${artist.nome} ${artist.cognome}`.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            return fullName.includes(searchLower) || 
                   artist.codice_fiscale.toLowerCase().includes(searchLower) ||
                   artist.categoria.toLowerCase().includes(searchLower);
        });
        
        console.log(`🎭 Mock: ${filtered.length} artisti filtrati`);
        return filtered;
    }
    
    /**
     * Mostra stato loading
     */
    showLoadingState() {
        this.resultsContainer.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <span>Ricerca in corso...</span>
            </div>
        `;
        this.showResults();
    }
    
    /**
     * Mostra stato errore
     */
    showErrorState() {
        this.resultsContainer.innerHTML = `
            <div class="search-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Errore durante la ricerca</span>
                <button class="btn-retry" onclick="this.retrySearch()">Riprova</button>
            </div>
        `;
        this.showResults();
    }
    
    /**
     * Mostra risultati ricerca
     */
    displayResults(results, searchTerm) {
        this.currentResults = results;
        this.selectedIndex = -1;
        
        if (results.length === 0) {
            this.displayNoResults(searchTerm);
            return;
        }
        
        // Genera HTML risultati
        const resultsHTML = results.map((artist, index) => {
            return this.generateArtistResultHTML(artist, index);
        }).join('');
        
        this.resultsContainer.innerHTML = `
            <div class="search-results">
                <div class="results-header">
                    <span class="results-count">${results.length} artist${results.length !== 1 ? 'i' : ''} troват${results.length !== 1 ? 'i' : 'o'}</span>
                </div>
                <div class="results-list">
                    ${resultsHTML}
                </div>
            </div>
        `;
        
        this.showResults();
        
        console.log(`✅ ${results.length} risultati mostrati`);
    }
    
    /**
     * Genera HTML per singolo artista
     */
    generateArtistResultHTML(artist, index) {
        const isSelected = this.isArtistSelected(artist.id);
        const selectedClass = isSelected ? 'already-selected' : '';
        
        return `
            <div class="search-result-item ${selectedClass}" 
                 data-artist-id="${artist.id}" 
                 data-index="${index}">
                <div class="artist-info">
                    <div class="artist-name">
                        <strong>${artist.nome} ${artist.cognome}</strong>
                        ${isSelected ? '<span class="selected-badge">✓ Selezionato</span>' : ''}
                    </div>
                    <div class="artist-details">
                        <span class="artist-cf">${artist.codice_fiscale}</span>
                        <span class="artist-category">${artist.categoria}</span>
                    </div>
                    <div class="artist-compenso">
                        Compenso base: <strong>€${artist.compenso_base?.toLocaleString() || 'N/A'}</strong>
                    </div>
                </div>
                <div class="artist-actions">
                    ${isSelected ? 
                        '<i class="fas fa-check-circle text-success"></i>' : 
                        '<i class="fas fa-plus-circle text-primary"></i>'
                    }
                </div>
            </div>
        `;
    }
    
    /**
     * Mostra messaggio nessun risultato
     */
    displayNoResults(searchTerm) {
        this.resultsContainer.innerHTML = `
            <div class="search-no-results">
                <div class="no-results-content">
                    <i class="fas fa-search"></i>
                    <p>Nessun artista trovato per "${searchTerm}"</p>
                    <div class="no-results-actions">
                        <button class="btn btn-outline-primary btn-sm" data-action="showAddArtistModal">
                            <i class="fas fa-user-plus"></i> Registra Nuovo Artista
                        </button>
                    </div>
                </div>
            </div>
        `;
        this.showResults();
    }
    
    /**
     * Verifica se artista è già selezionato
     */
    isArtistSelected(artistId) {
        const selectedArtists = this.stateManager?.get('selectedArtists') || [];
        return selectedArtists.some(artist => artist.id === artistId);
    }
    
    /**
     * Naviga risultati con frecce
     */
    navigateResults(direction) {
        if (this.currentResults.length === 0) return;
        
        // Update selected index
        const newIndex = this.selectedIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.currentResults.length) {
            this.selectedIndex = newIndex;
        } else if (direction > 0 && newIndex >= this.currentResults.length) {
            this.selectedIndex = 0; // Wrap to first
        } else if (direction < 0 && newIndex < 0) {
            this.selectedIndex = this.currentResults.length - 1; // Wrap to last
        }
        
        // Update visual selection
        this.updateVisualSelection();
    }
    
    /**
     * Aggiorna selezione visuale
     */
    updateVisualSelection() {
        const items = this.resultsContainer.querySelectorAll('.search-result-item');
        
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('keyboard-selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('keyboard-selected');
            }
        });
    }
    
    /**
     * Seleziona risultato corrente
     */
    selectCurrentResult() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.currentResults.length) {
            const selectedArtist = this.currentResults[this.selectedIndex];
            this.selectArtist(selectedArtist.id);
        }
    }
    
    /**
     * Seleziona artista
     */
    selectArtist(artistId) {
        const artist = this.currentResults.find(a => a.id === artistId);
        if (!artist) {
            console.warn(`⚠️ Artista ${artistId} non trovato nei risultati`);
            return;
        }
        
        console.log(`🎭 Selezione artista: ${artist.nome} ${artist.cognome}`);
        
        // Verifica se già selezionato
        if (this.isArtistSelected(artistId)) {
            this.showToast(`${artist.nome} ${artist.cognome} è già selezionato`, 'warning');
            return;
        }
        
        // Aggiungi alla lista tramite ArtistList
        if (window.artistList) {
            window.artistList.addArtist(artist);
        } else {
            // Fallback: aggiungi direttamente allo state
            const selectedArtists = this.stateManager?.get('selectedArtists') || [];
            selectedArtists.push({
                ...artist,
                compenso: artist.compenso_base || 0,
                selectedAt: new Date().toISOString()
            });
            this.stateManager?.update('selectedArtists', selectedArtists);
        }
        
        // Update UI
        this.hideResults();
        this.clearSearch();
        
        // Toast success
        this.showToast(`${artist.nome} ${artist.cognome} aggiunto alla lista`, 'success');
    }
    
    /**
     * Mostra risultati
     */
    showResults() {
        this.resultsContainer.style.display = 'block';
        this.resultsContainer.classList.add('show');
    }
    
    /**
     * Nascondi risultati
     */
    hideResults() {
        this.resultsContainer.style.display = 'none';
        this.resultsContainer.classList.remove('show');
        this.selectedIndex = -1;
    }
    
    /**
     * Pulisce ricerca
     */
    clearSearch() {
        this.searchInput.value = '';
        this.hideResults();
        this.updateClearButton(false);
        this.currentResults = [];
        this.selectedIndex = -1;
        
        console.log('🧹 Ricerca pulita');
    }
    
    /**
     * Aggiorna pulsante clear
     */
    updateClearButton(show) {
        if (this.clearButton) {
            this.clearButton.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * Reset ricerca
     */
    resetSearch() {
        this.clearSearch();
        this.searchCache.clear();
        this.isSearching = false;
        
        console.log('🔄 Ricerca resettata');
    }
    
    /**
     * Riprova ricerca
     */
    retrySearch() {
        const searchTerm = this.searchInput.value.trim();
        if (searchTerm.length >= this.minSearchLength) {
            this.performSearch(searchTerm);
        }
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
     * Debug artist search
     */
    debug() {
        return {
            cacheSize: this.searchCache.size,
            currentResults: this.currentResults.length,
            selectedIndex: this.selectedIndex,
            isSearching: this.isSearching,
            debounceDelay: this.debounceDelay,
            minSearchLength: this.minSearchLength,
            maxResults: this.maxResults
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Clear timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Clear cache
        this.searchCache.clear();
        
        // Reset state
        this.currentResults = [];
        this.selectedIndex = -1;
        this.isSearching = false;
        
        console.log('🧹 ArtistSearch cleanup completato');
    }
}

// Esporta classe
export default ArtistSearch;

console.log('✅ ArtistSearch module loaded');