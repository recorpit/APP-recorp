// artist-search.js - Gestione ricerca artisti
console.log('📦 Caricamento ArtistSearch...');

export class ArtistSearch {
    constructor(artistsDB = []) {
        this.artistsDB = artistsDB;
        this.searchResults = [];
        
        console.log('🔍 ArtistSearch inizializzato');
        this.setupSearchListeners();
    }
    
    setupSearchListeners() {
        // Listener per input di ricerca
        document.addEventListener('input', (e) => {
            if (e.target.id === 'artistSearch') {
                this.handleSearchInput(e.target.value);
            }
        });
        
        // Listener per risultati ricerca
        document.addEventListener('click', (e) => {
            if (e.target.closest('.search-result[data-artist-id]')) {
                const artistId = e.target.closest('.search-result').getAttribute('data-artist-id');
                this.selectArtist(parseInt(artistId));
            }
        });
    }
    
    handleSearchInput(searchTerm) {
        console.log(`🔍 Ricerca: "${searchTerm}"`);
        
        if (searchTerm.length < 2) {
            this.clearSearchResults();
            return;
        }
        
        this.searchResults = this.performSearch(searchTerm);
        this.displayResults(this.searchResults);
    }
    
    performSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const searchWords = term.split(/\s+/).filter(word => word.length > 0);
        
        console.log(`🎯 Ricerca per: ${searchWords.join(', ')}`);
        
        return this.artistsDB.filter(artist => {
            const fullName = `${artist.nome} ${artist.cognome} ${artist.nome_arte || ''}`.toLowerCase();
            const cf = (artist.codice_fiscale || '').toLowerCase();
            const mansione = (artist.mansione || '').toLowerCase();
            
            // Ricerca singola parola
            if (searchWords.length === 1) {
                const word = searchWords[0];
                return fullName.includes(word) || 
                       cf.includes(word) || 
                       mansione.includes(word);
            }
            
            // Ricerca multipla - tutte le parole devono essere presenti
            return searchWords.every(word => 
                fullName.includes(word) || cf.includes(word)
            );
        });
    }
    
    displayResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) {
            console.warn('⚠️ Container searchResults non trovato');
            return;
        }
        
        console.log(`📊 Mostrando ${results.length} risultati`);
        
        if (results.length === 0) {
            this.showNoResults(resultsContainer);
            return;
        }
        
        const resultsHTML = results.map(artist => this.createResultHTML(artist)).join('');
        resultsContainer.innerHTML = resultsHTML;
    }
    
    createResultHTML(artist) {
        const identificativo = artist.codice_fiscale || artist.codice_fiscale_temp || 'NO-CF';
        const nazionalitaIcon = artist.nazionalita !== 'IT' ? ' 🌍' : '';
        
        return `
            <div class="search-result" 
                 data-artist-id="${artist.id}"
                 style="cursor: pointer; padding: 0.75rem; border: 1px solid #dee2e6; border-radius: 4px; margin: 0.25rem 0; transition: background-color 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong>${artist.nome} ${artist.cognome}${artist.nome_arte ? ' - ' + artist.nome_arte : ''}${nazionalitaIcon}</strong><br>
                        <small style="color: #666;">CF: ${identificativo} | ${artist.mansione || 'Non specificata'}</small>
                        <small style="display: block; color: #999; font-size: 0.7rem;">ID: ${artist.id}</small>
                    </div>
                    <button class="btn btn-sm btn-primary" style="margin-left: 1rem;">
                        ➕ Aggiungi
                    </button>
                </div>
            </div>
        `;
    }
    
    showNoResults(container) {
        container.innerHTML = `
            <div class="alert alert-warning" style="text-align: center; padding: 1rem; margin: 1rem 0; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                <strong>🔍 Nessun artista trovato</strong><br>
                <small>Prova con un altro termine di ricerca</small>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary btn-sm" onclick="this.showNewArtistForm()">
                        ➕ Registra Nuovo Artista
                    </button>
                </div>
            </div>
        `;
    }
    
    clearSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="alert alert-info" style="text-align: center; padding: 1rem; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px;">
                    💡 Inizia a digitare per cercare un artista nel database
                </div>
            `;
        }
    }
    
    selectArtist(artistId) {
        const artist = this.artistsDB.find(a => a.id === artistId);
        if (!artist) {
            console.error(`❌ Artista non trovato: ID ${artistId}`);
            return;
        }
        
        console.log(`✅ Artista selezionato: ${artist.nome} ${artist.cognome}`);
        
        // Trigger evento per notificare la selezione
        const event = new CustomEvent('artistSelected', {
            detail: { artist, artistId }
        });
        document.dispatchEvent(event);
        
        // Chiudi modal se presente
        this.closeModal();
    }
    
    closeModal() {
        const modal = document.getElementById('addArtistModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showNewArtistForm() {
        console.log('📝 Apertura form nuovo artista');
        // TODO: Implementare o reindirizzare alla pagina di registrazione
        if (confirm('Vuoi andare alla pagina di registrazione di un nuovo artista?')) {
            sessionStorage.setItem('returnToAgibilita', 'true');
            window.location.href = '../registrazione-artista.html';
        }
    }
    
    // === UTILITY METHODS ===
    
    updateDatabase(newArtistsDB) {
        this.artistsDB = newArtistsDB;
        console.log(`🔄 Database artisti aggiornato: ${this.artistsDB.length} artisti`);
    }
    
    getSearchStats() {
        return {
            totalArtists: this.artistsDB.length,
            lastSearchResults: this.searchResults.length,
            hasResults: this.searchResults.length > 0
        };
    }
    
    // Metodo per ricerca avanzata
    advancedSearch(filters) {
        console.log('🔍 Ricerca avanzata:', filters);
        
        return this.artistsDB.filter(artist => {
            let matches = true;
            
            if (filters.nome && !artist.nome.toLowerCase().includes(filters.nome.toLowerCase())) {
                matches = false;
            }
            
            if (filters.cognome && !artist.cognome.toLowerCase().includes(filters.cognome.toLowerCase())) {
                matches = false;
            }
            
            if (filters.mansione && artist.mansione !== filters.mansione) {
                matches = false;
            }
            
            if (filters.nazionalita && artist.nazionalita !== filters.nazionalita) {
                matches = false;
            }
            
            return matches;
        });
    }
}

// Export per compatibilità globale
export function setupGlobalSearchFunctions(artistSearch) {
    window.searchArtists = () => {
        const searchTerm = document.getElementById('artistSearch')?.value || '';
        artistSearch.handleSearchInput(searchTerm);
    };
    
    window.addArtistToList = (artistId) => {
        artistSearch.selectArtist(parseInt(artistId));
    };
}

export default ArtistSearch;