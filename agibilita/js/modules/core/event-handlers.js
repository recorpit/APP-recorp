/**
 * event-handlers.js - Event Handlers Sistema Agibilità con Artists Integrato
 * 
 * Gestione eventi con sistema Artists completamente funzionante
 * 
 * @author RECORP ALL-IN-ONE
 * @version 3.0 - Artists System Integrato
 */

// ==================== GESTIONE RICERCA ARTISTI ====================
let searchTimeout = null;
let lastSearchQuery = '';

// 🆕 Funzione ricerca artisti completamente funzionante
function handleArtistSearch(event) {
    const query = event.target.value.trim();
    console.log(`🔍 Ricerca: artist = "${query}"`);
    
    // Debouncing per evitare troppe chiamate
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(async () => {
        // Evita ricerche duplicate
        if (query === lastSearchQuery) return;
        lastSearchQuery = query;
        
        console.log(`🔍 Ricerca eseguita: artist = "${query}"`);
        
        try {
            if (query.length === 0) {
                // Reset ricerca
                clearArtistSearchResults();
                return;
            }
            
            if (query.length < 2) {
                // Query troppo corta
                showArtistSearchMessage('Inserisci almeno 2 caratteri');
                return;
            }
            
            console.log(`🎭 Ricerca artisti: "${query}"`);
            
            // 🆕 Usa il sistema Artists se disponibile
            if (window.AgibilitaSystem?.artists?.search) {
                await window.AgibilitaSystem.artists.search(query);
            } else {
                // Fallback per ricerca artisti diretta
                await performArtistSearchFallback(query);
            }
            
        } catch (error) {
            console.error('❌ Errore ricerca artisti:', error);
            
            if (window.AgibilitaSystem?.showToast) {
                window.AgibilitaSystem.showToast('Errore durante la ricerca artisti', 'error');
            }
            
            showArtistSearchMessage('Errore durante la ricerca. Riprova.');
        }
    }, 300); // Debounce 300ms
}

// 🆕 Ricerca artisti fallback (se sistema non disponibile)
async function performArtistSearchFallback(query) {
    const resultsContainer = document.getElementById('artistSearchResults');
    if (!resultsContainer) return;
    
    // Mostra loading
    resultsContainer.innerHTML = `
        <div class="search-loading">
            <div class="spinner"></div>
            <span>Ricerca in corso...</span>
        </div>
    `;
    
    try {
        // Mock data per test (sostituisci con chiamata database reale)
        const mockArtists = await getMockArtistsData(query);
        
        if (mockArtists.length === 0) {
            showArtistSearchMessage(`Nessun artista trovato per "${query}"`);
            return;
        }
        
        // Mostra risultati
        displayArtistSearchResults(mockArtists, query);
        
    } catch (error) {
        console.error('❌ Errore ricerca fallback:', error);
        showArtistSearchMessage('Errore durante la ricerca');
    }
}

// Mock data per test sistema Artists
async function getMockArtistsData(query) {
    const mockDB = [
        { id: 1, nome: 'Mario', cognome: 'Rossi', mansione: 'Cantante', codice_fiscale: 'RSSMRA80A01H501Z' },
        { id: 2, nome: 'Luigi', cognome: 'Verdi', mansione: 'Musicista', codice_fiscale: 'VRDLGU75B02H501Y' },
        { id: 3, nome: 'Anna', cognome: 'Bianchi', mansione: 'Ballerina', codice_fiscale: 'BNCNNA85C03H501X' },
        { id: 4, nome: 'Marco', cognome: 'Neri', mansione: 'Attore', codice_fiscale: 'NRIMRC90D04H501W' },
        { id: 5, nome: 'Sara', cognome: 'Rosa', mansione: 'Cantante', codice_fiscale: 'RSOSRA88E05H501V' },
        { id: 6, nome: 'Giuseppe', cognome: 'Blu', mansione: 'Musicista', codice_fiscale: 'BLUGPP70F06H501U' },
        { id: 7, nome: 'Maria', cognome: 'Verde', mansione: 'Ballerina', codice_fiscale: 'VRDMRA82G07H501T' },
        { id: 8, nome: 'Francesco', cognome: 'Giallo', mansione: 'Attore', codice_fiscale: 'GLLFNC78H08H501S' },
        { id: 9, nome: 'Zaira', cognome: 'Zamboni', mansione: 'Cantante', codice_fiscale: 'ZMBZRA90I09H501R' },
        { id: 10, nome: 'Zeno', cognome: 'Zanetti', mansione: 'Musicista', codice_fiscale: 'ZNTZNO85J10H501Q' }
    ];
    
    const queryLower = query.toLowerCase();
    
    return mockDB.filter(artist => {
        const searchText = `${artist.nome} ${artist.cognome} ${artist.mansione}`.toLowerCase();
        return searchText.includes(queryLower);
    });
}

// Display risultati ricerca artisti
function displayArtistSearchResults(artists, query) {
    const resultsContainer = document.getElementById('artistSearchResults');
    if (!resultsContainer) return;
    
    const resultsHTML = artists.map(artist => `
        <div class="artist-result-item" data-artist-id="${artist.id}" onclick="selectArtistFromSearch(${artist.id})">
            <div class="artist-info">
                <div class="artist-name">${highlightQuery(artist.nome + ' ' + artist.cognome, query)}</div>
                <div class="artist-details">
                    ${artist.mansione} | CF: ${artist.codice_fiscale}
                </div>
            </div>
            <div class="artist-actions">
                <button class="btn-select" onclick="event.stopPropagation(); selectArtistFromSearch(${artist.id})">
                    ➕ Seleziona
                </button>
            </div>
        </div>
    `).join('');
    
    resultsContainer.innerHTML = `
        <div class="search-results-header">
            <span>Trovati ${artists.length} artisti per "${query}"</span>
            <button onclick="clearArtistSearchResults()" class="btn-clear">✕</button>
        </div>
        <div class="search-results-list">
            ${resultsHTML}
        </div>
    `;
    
    resultsContainer.style.display = 'block';
}

// Evidenzia query nei risultati
function highlightQuery(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Seleziona artista dai risultati ricerca
async function selectArtistFromSearch(artistId) {
    console.log(`🎭 Selezione artista ID: ${artistId}`);
    
    try {
        // 🆕 Usa sistema Artists se disponibile
        if (window.AgibilitaSystem?.artists?.addToList) {
            // Trova artista nei risultati
            const artistData = await findArtistById(artistId);
            if (artistData) {
                window.AgibilitaSystem.artists.addToList(artistData);
                window.AgibilitaSystem.showToast(`${artistData.nome} ${artistData.cognome} aggiunto alla lista!`, 'success');
            }
        } else {
            // Fallback aggiunta artista
            await addArtistToListFallback(artistId);
        }
        
        // Pulisci ricerca dopo selezione
        clearArtistSearchResults();
        document.getElementById('artistSearchInput').value = '';
        
    } catch (error) {
        console.error('❌ Errore selezione artista:', error);
        
        if (window.AgibilitaSystem?.showToast) {
            window.AgibilitaSystem.showToast('Errore aggiunta artista', 'error');
        }
    }
}

// Trova artista per ID (helper)
async function findArtistById(artistId) {
    // Questo dovrebbe interrogare il database reale
    const mockArtists = await getMockArtistsData('');
    return mockArtists.find(a => a.id === artistId);
}

// Fallback aggiunta artista alla lista
async function addArtistToListFallback(artistId) {
    const artistData = await findArtistById(artistId);
    if (!artistData) return;
    
    const selectedContainer = document.getElementById('selectedArtistsContainer');
    if (!selectedContainer) return;
    
    // Controlla se già presente
    if (selectedContainer.querySelector(`[data-artist-id="${artistId}"]`)) {
        if (window.AgibilitaSystem?.showToast) {
            window.AgibilitaSystem.showToast('Artista già presente nella lista', 'warning');
        }
        return;
    }
    
    // Aggiungi alla lista
    const artistHTML = `
        <div class="selected-artist-item" data-artist-id="${artistId}">
            <div class="artist-info">
                <div class="artist-name">${artistData.nome} ${artistData.cognome}</div>
                <div class="artist-details">${artistData.mansione}</div>
            </div>
            <div class="artist-compenso">
                <input type="number" placeholder="Compenso €" min="0" step="0.01" 
                       onchange="updateArtistCompenso(${artistId}, this.value)">
            </div>
            <div class="artist-actions">
                <button onclick="removeArtistFromList(${artistId})" class="btn-remove">
                    🗑️ Rimuovi
                </button>
            </div>
        </div>
    `;
    
    selectedContainer.insertAdjacentHTML('beforeend', artistHTML);
    
    if (window.AgibilitaSystem?.showToast) {
        window.AgibilitaSystem.showToast(`${artistData.nome} ${artistData.cognome} aggiunto!`, 'success');
    }
}

// Rimuovi artista dalla lista
function removeArtistFromList(artistId) {
    console.log(`🗑️ Rimozione artista ID: ${artistId}`);
    
    if (window.AgibilitaSystem?.artists?.removeFromList) {
        window.AgibilitaSystem.artists.removeFromList(artistId);
    } else {
        // Fallback rimozione
        const artistElement = document.querySelector(`[data-artist-id="${artistId}"]`);
        if (artistElement) {
            artistElement.remove();
            
            if (window.AgibilitaSystem?.showToast) {
                window.AgibilitaSystem.showToast('Artista rimosso dalla lista', 'info');
            }
        }
    }
}

// Aggiorna compenso artista
function updateArtistCompenso(artistId, compenso) {
    console.log(`💰 Update compenso artista ${artistId}: €${compenso}`);
    
    // Validazione compenso
    const compensoNum = parseFloat(compenso);
    if (isNaN(compensoNum) || compensoNum < 0) {
        if (window.AgibilitaSystem?.showToast) {
            window.AgibilitaSystem.showToast('Compenso non valido', 'error');
        }
        return;
    }
    
    // Aggiorna nello stato se disponibile
    if (window.AgibilitaSystem?.instances?.state) {
        const artists = window.AgibilitaSystem.instances.state.get('selectedArtists') || [];
        const artistIndex = artists.findIndex(a => a.id === artistId);
        
        if (artistIndex !== -1) {
            artists[artistIndex].compenso = compensoNum;
            window.AgibilitaSystem.instances.state.set('selectedArtists', artists);
        }
    }
    
    console.log(`✅ Compenso aggiornato: €${compensoNum}`);
}

// Pulisci risultati ricerca
function clearArtistSearchResults() {
    const resultsContainer = document.getElementById('artistSearchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }
    lastSearchQuery = '';
}

// Mostra messaggio nei risultati ricerca
function showArtistSearchMessage(message) {
    const resultsContainer = document.getElementById('artistSearchResults');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="search-message">
            <span>${message}</span>
        </div>
    `;
    resultsContainer.style.display = 'block';
}

// ==================== GESTIONE MODAL ARTISTI ====================

// Apri modal registrazione artista
function openArtistRegistrationModal() {
    console.log('🆕 Apertura modal registrazione artista');
    
    if (window.AgibilitaSystem?.artists?.openRegistrationModal) {
        window.AgibilitaSystem.artists.openRegistrationModal();
    } else {
        // Fallback - apri modal semplice
        showSimpleArtistModal();
    }
}

// Modal semplice fallback
function showSimpleArtistModal() {
    const modalHTML = `
        <div id="simpleArtistModal" class="modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Registrazione Artista</h3>
                    <button onclick="closeSimpleArtistModal()" class="btn-close">✕</button>
                </div>
                <div class="modal-body">
                    <p>Modal registrazione artista in sviluppo...</p>
                    <p>Per la registrazione completa, usa la pagina dedicata:</p>
                    <a href="./registrazione-artista.html?source=agibilita" target="_blank" class="btn-primary">
                        Registrazione Completa
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeSimpleArtistModal() {
    const modal = document.getElementById('simpleArtistModal');
    if (modal) {
        modal.remove();
    }
}

// ==================== GESTIONE TAB SYSTEM ====================

// Gestione tab switching
function handleTabSwitch(tabName) {
    console.log(`🔄 Switch tab: ${tabName}`);
    
    if (window.AgibilitaSystem?.switchTab) {
        window.AgibilitaSystem.switchTab(tabName);
    } else {
        // Fallback tab switching
        switchTabFallback(tabName);
    }
}

function switchTabFallback(tabName) {
    // Nascondi tutti i tab
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Rimuovi active class
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
}

// ==================== GESTIONE NAVIGAZIONE STEP ====================

// Step successivo
function handleNextStep() {
    console.log('▶️ Step successivo');
    
    if (window.AgibilitaSystem?.nextStep) {
        window.AgibilitaSystem.nextStep();
    } else {
        console.log('⚠️ Sistema navigazione non disponibile');
        
        if (window.AgibilitaSystem?.showToast) {
            window.AgibilitaSystem.showToast('Sistema navigazione in sviluppo', 'warning');
        }
    }
}

// Step precedente
function handlePrevStep() {
    console.log('◀️ Step precedente');
    
    if (window.AgibilitaSystem?.prevStep) {
        window.AgibilitaSystem.prevStep();
    } else {
        console.log('⚠️ Sistema navigazione non disponibile');
        
        if (window.AgibilitaSystem?.showToast) {
            window.AgibilitaSystem.showToast('Sistema navigazione in sviluppo', 'warning');
        }
    }
}

// ==================== INIZIALIZZAZIONE EVENT LISTENERS ====================

// Setup event listeners quando DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 Setup event handlers agibilità...');
    
    // Event listener ricerca artisti
    const artistSearchInput = document.getElementById('artistSearchInput');
    if (artistSearchInput) {
        artistSearchInput.addEventListener('input', handleArtistSearch);
        console.log('✅ Event listener ricerca artisti configurato');
    }
    
    // Event listener pulsante nuovo artista
    const newArtistBtn = document.getElementById('newArtistBtn');
    if (newArtistBtn) {
        newArtistBtn.addEventListener('click', openArtistRegistrationModal);
        console.log('✅ Event listener nuovo artista configurato');
    }
    
    // Event listener tab buttons
    document.querySelectorAll('[data-tab]').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            handleTabSwitch(tabName);
        });
    });
    
    // Event listener navigation buttons
    const nextBtn = document.getElementById('nextStepBtn');
    const prevBtn = document.getElementById('prevStepBtn');
    
    if (nextBtn) {
        nextBtn.addEventListener('click', handleNextStep);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', handlePrevStep);
    }
    
    console.log('✅ Event handlers configurati');
});

// ==================== UTILITY FUNCTIONS ====================

// Reset completo sistema artisti
function resetArtistsSystem() {
    console.log('🧹 Reset sistema artisti');
    
    if (window.AgibilitaSystem?.artists?.resetAll) {
        window.AgibilitaSystem.artists.resetAll();
    } else {
        // Fallback reset
        clearArtistSearchResults();
        document.getElementById('artistSearchInput').value = '';
        document.getElementById('selectedArtistsContainer').innerHTML = '';
    }
    
    if (window.AgibilitaSystem?.showToast) {
        window.AgibilitaSystem.showToast('Sistema artisti azzerato', 'info');
    }
}

// Debug info sistema artisti
function debugArtistsSystem() {
    console.log('🔧 Debug Sistema Artists:');
    console.log('- AgibilitaSystem disponibile:', !!window.AgibilitaSystem);
    console.log('- Artists API disponibile:', !!window.AgibilitaSystem?.artists);
    console.log('- Artisti selezionati:', window.AgibilitaSystem?.artists?.getSelectedArtists?.());
    
    if (window.AgibilitaSystem?.instances) {
        console.log('- Istanze moduli:', Object.keys(window.AgibilitaSystem.instances));
    }
}

// Esporta funzioni per uso globale
window.ArtistEventHandlers = {
    handleArtistSearch,
    selectArtistFromSearch,
    removeArtistFromList,
    updateArtistCompenso,
    openArtistRegistrationModal,
    resetArtistsSystem,
    debugArtistsSystem
};

console.log('📄 event-handlers.js v3.0 con Artists System caricato');
console.log('🔧 Funzioni disponibili in window.ArtistEventHandlers');
