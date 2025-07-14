// homepage.js - Sistema Gestione Homepage RECORP

// Import Supabase DatabaseService
import { DatabaseService } from './supabase-config.js';

// ==================== VARIABILI GLOBALI ====================
let artistsDB = [];
let agibilitaDB = [];
let venuesDB = [];

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema RECORP...');
    
    // Test connessione Supabase
    const connected = await DatabaseService.testConnection();
    if (!connected) {
        alert('⚠️ Errore connessione database. Controlla la configurazione.');
        return;
    }

    // Carica dati da Supabase
    await loadDataFromSupabase();
    
    // Aggiorna statistiche
    updateStatistics();
    
    // Setup event listeners
    setupEventListeners();
});

// ==================== CARICAMENTO DATI ====================
async function loadDataFromSupabase() {
    try {
        console.log('📥 Caricamento dati da Supabase...');
        
        // Carica artisti
        artistsDB = await DatabaseService.getArtists();
        console.log(`✅ ${artistsDB.length} artisti caricati`);
        
        // Carica agibilità
        agibilitaDB = await DatabaseService.getAgibilita();
        console.log(`✅ ${agibilitaDB.length} agibilità caricate`);
        
        // Carica venues
        venuesDB = await DatabaseService.getVenues();
        console.log(`✅ ${venuesDB.length} venues caricati`);
        
    } catch (error) {
        console.error('❌ Errore caricamento dati:', error);
        alert('Errore nel caricamento dei dati: ' + error.message);
    }
}

// ==================== STATISTICHE ====================
async function updateStatistics() {
    try {
        const stats = await DatabaseService.getStatistiche();
        
        // Aggiorna i display
        document.getElementById('totalArtists').textContent = stats.artisti || 0;
        document.getElementById('monthlyAgibilita').textContent = stats.agibilita_mese || 0;
        
        // Calcola compenso totale dalle agibilità caricate
        let totalCompensation = 0;
        agibilitaDB.forEach(agibilita => {
            if (agibilita.artisti && Array.isArray(agibilita.artisti)) {
                agibilita.artisti.forEach(artista => {
                    totalCompensation += parseFloat(artista.compenso || 0);
                });
            }
        });
        
        // Formatta compenso
        let compText = '€0';
        if (totalCompensation >= 1000) {
            compText = '€' + (totalCompensation / 1000).toFixed(1) + 'k';
        } else if (totalCompensation > 0) {
            compText = '€' + totalCompensation.toFixed(0);
        }
        document.getElementById('totalCompensation').textContent = compText;
        
        // Calcola completion rate
        const completionRate = stats.agibilita_totali > 0 
            ? Math.round((stats.agibilita_totali - stats.bozze_sospese) / stats.agibilita_totali * 100)
            : 0;
        document.getElementById('completionRate').textContent = completionRate + '%';
        
    } catch (error) {
        console.error('❌ Errore aggiornamento statistiche:', error);
        // Fallback a valori di default
        document.getElementById('totalArtists').textContent = artistsDB.length;
        document.getElementById('monthlyAgibilita').textContent = '0';
        document.getElementById('totalCompensation').textContent = '€0';
        document.getElementById('completionRate').textContent = '0%';
    }
}

// ==================== FUNZIONI NAVIGAZIONE ====================
function startNewAgibilita() {
    console.log('Navigazione a nuova agibilità');
    window.location.href = './agibilita/index.html';
}

function showComingSoon() {
    alert('Funzionalità in arrivo! 🚀');
}

function openChatAI() {
    window.location.href = './chat-agibilita.html';
}

// ==================== RICERCA ARTISTI ====================
async function searchArtist() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    if (!searchTerm) {
        alert('Inserisci un nome o codice fiscale per la ricerca');
        return;
    }

    try {
        // Cerca in Supabase
        const results = await DatabaseService.searchArtistsForAgibilita(searchTerm);
        displaySearchResults(results, searchTerm);
    } catch (error) {
        console.error('❌ Errore ricerca:', error);
        alert('Errore durante la ricerca: ' + error.message);
    }
}

function displaySearchResults(results, searchTerm) {
    const modal = document.getElementById('searchModal');
    const resultsContainer = document.getElementById('searchResults');
    
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="result-card">
                <p>Nessun artista trovato per "${searchTerm}"</p>
                <button class="btn btn-primary" style="margin-top: 1rem" onclick="addNewArtist()">
                    + Aggiungi Nuovo Artista
                </button>
            </div>
        `;
    } else {
        results.forEach(artist => {
            // Adatta i nomi dei campi dal database
            const displayName = `${artist.nome} ${artist.cognome}${artist.nome_arte ? ' - ' + artist.nome_arte : ''}`;
            
            // Find agibilità for this artist
            const artistAgibilita = agibilitaDB.filter(a => 
                a.artisti && a.artisti.some(art => art.cf === artist.codice_fiscale)
            );
            
            const agibilitaHtml = artistAgibilita.length > 0 
                ? `
                    <div class="agibilita-list">
                        <h4>Agibilità Recenti:</h4>
                        ${artistAgibilita.slice(-3).map(a => `
                            <div class="agibilita-item">
                                <span>${a.data_inizio ? new Date(a.data_inizio).toLocaleDateString('it-IT') : 'Data N/D'} | ${a.locale?.descrizione || 'Locale N/D'}</span>
                                <span>€${a.artisti.find(art => art.cf === artist.codice_fiscale)?.compenso || 0}</span>
                            </div>
                        `).join('')}
                    </div>
                `
                : '<p class="no-agibilita-msg">Nessuna agibilità registrata</p>';

            resultsContainer.innerHTML += `
                <div class="result-card">
                    <div class="result-header">
                        <div class="result-info">
                            <h3>${displayName}</h3>
                            <p>CF: ${artist.codice_fiscale} | Tel: ${artist.telefono || 'N/D'}</p>
                            <p class="artist-role">${artist.mansione || 'Mansione N/D'}</p>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" onclick="createAgibilitaForArtist('${artist.id}')">
                                Nuova Agibilità
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="createComunicazione('${artist.id}')">
                                Comunicazione
                            </button>
                        </div>
                    </div>
                    ${agibilitaHtml}
                </div>
            `;
        });
    }

    modal.style.display = 'block';
}

// ==================== SUGGERIMENTI RICERCA ====================
async function showSuggestions() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const suggestionsDiv = document.getElementById('suggestions');
    
    if (searchTerm.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    try {
        const matches = await DatabaseService.searchArtistsForAgibilita(searchTerm);
        
        if (matches.length === 0) {
            suggestionsDiv.innerHTML = '<div class="no-suggestions">Nessun artista trovato</div>';
            suggestionsDiv.style.display = 'block';
            return;
        }
        
        suggestionsDiv.innerHTML = matches.slice(0, 5).map(artist => {
            const displayName = `${artist.nome} ${artist.cognome}${artist.nome_arte ? ' - ' + artist.nome_arte : ''}`;
            const highlightedName = highlightMatch(displayName, searchTerm);
            
            return `
                <div class="suggestion-item" onclick="selectArtist('${artist.id}')">
                    <div>${highlightedName}</div>
                    <div class="suggestion-info">${artist.mansione || 'N/D'} | CF: ${artist.codice_fiscale}</div>
                </div>
            `;
        }).join('');
        
        suggestionsDiv.style.display = 'block';
    } catch (error) {
        console.error('❌ Errore suggestions:', error);
        suggestionsDiv.style.display = 'none';
    }
}

function highlightMatch(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<strong class="highlight-match">$1</strong>');
}

function hideSuggestions() {
    document.getElementById('suggestions').style.display = 'none';
}

function selectArtist(artistId) {
    const artist = artistsDB.find(a => a.id == artistId);
    if (artist) {
        const results = [artist];
        displaySearchResults(results, artist.nome);
        hideSuggestions();
        document.getElementById('searchInput').value = '';
    }
}

// ==================== FUNZIONI AZIONI ====================
function closeModal() {
    document.getElementById('searchModal').style.display = 'none';
    document.getElementById('searchInput').value = '';
}

function addNewArtist() {
    window.location.href = './registrazione-artista.html';
}

function createAgibilitaForArtist(artistId) {
    // Store artist ID for agibilità page
    sessionStorage.setItem('selectedArtistId', artistId);
    window.location.href = './agibilita/index.html';
}

function createComunicazione(artistId) {
    alert('Funzione comunicazione a chiamata in sviluppo');
}

// ==================== DATABASE MANAGER ====================
async function toggleDatabaseManager() {
    document.getElementById('databaseManagerModal').style.display = 'block';
    await loadDBArtists();
    await loadDBVenues();
}

function closeDatabaseManager() {
    document.getElementById('databaseManagerModal').style.display = 'none';
}

function showDBTab(tabName) {
    // Update tabs
    document.querySelectorAll('#databaseManagerModal .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update content
    document.querySelectorAll('#databaseManagerModal .tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById('dbTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).style.display = 'block';
}

async function loadDBArtists() {
    const tbody = document.getElementById('dbArtistsList');
    const noMsg = document.getElementById('noArtistsMsg');
    
    if (artistsDB.length === 0) {
        tbody.innerHTML = '';
        noMsg.style.display = 'block';
    } else {
        noMsg.style.display = 'none';
        tbody.innerHTML = artistsDB.map(artist => `
            <tr>
                <td>${artist.nome} ${artist.cognome}${artist.nome_arte ? ' - ' + artist.nome_arte : ''}</td>
                <td>${artist.codice_fiscale}</td>
                <td>${artist.mansione || 'N/D'}</td>
                <td class="text-center">
                    <button class="btn btn-danger btn-sm" onclick="removeArtistFromDB('${artist.id}')">
                        🗑️ Rimuovi
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

async function loadDBVenues() {
    const tbody = document.getElementById('dbVenuesList');
    const noMsg = document.getElementById('noVenuesMsg');
    
    if (venuesDB.length === 0) {
        tbody.innerHTML = '';
        noMsg.style.display = 'block';
    } else {
        noMsg.style.display = 'none';
        tbody.innerHTML = venuesDB.map(venue => `
            <tr>
                <td>${venue.nome}</td>
                <td>${venue.citta_nome || 'N/D'}</td>
                <td>${venue.indirizzo || 'N/D'}</td>
                <td class="text-center">
                    <button class="btn btn-danger btn-sm" onclick="removeVenueFromDB('${venue.id}')">
                        🗑️ Rimuovi
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

function filterDBArtists() {
    const searchTerm = document.getElementById('dbSearchArtist').value.toLowerCase();
    const rows = document.querySelectorAll('#dbArtistsList tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function filterDBVenues() {
    const searchTerm = document.getElementById('dbSearchVenue').value.toLowerCase();
    const rows = document.querySelectorAll('#dbVenuesList tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

async function removeArtistFromDB(artistId) {
    if (!confirm('Sei sicuro di voler rimuovere questo artista?')) {
        return;
    }
    
    try {
        await DatabaseService.deleteArtist(artistId);
        alert('Artista rimosso con successo!');
        // Ricarica i dati
        await loadDataFromSupabase();
        await loadDBArtists();
        updateStatistics();
    } catch (error) {
        console.error('❌ Errore rimozione artista:', error);
        alert('Errore durante la rimozione: ' + error.message);
    }
}

async function removeVenueFromDB(venueId) {
    if (!confirm('Sei sicuro di voler rimuovere questo locale?')) {
        return;
    }
    
    try {
        await DatabaseService.deleteVenue(venueId);
        alert('Locale rimosso con successo!');
        // Ricarica i dati
        await loadDataFromSupabase();
        await loadDBVenues();
    } catch (error) {
        console.error('❌ Errore rimozione locale:', error);
        alert('Errore durante la rimozione: ' + error.message);
    }
}

function exportDatabase(type) {
    let data = {};
    let filename = '';
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch(type) {
        case 'artisti':
            data = { artisti: artistsDB };
            filename = `recorp_artisti_export_${timestamp}.json`;
            break;
        case 'locali':
            data = { locali: venuesDB };
            filename = `recorp_locali_export_${timestamp}.json`;
            break;
        case 'all':
            data = { 
                artisti: artistsDB, 
                locali: venuesDB, 
                agibilita: agibilitaDB,
                export_date: new Date().toISOString(),
                version: '1.0'
            };
            filename = `recorp_database_completo_${timestamp}.json`;
            break;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    alert(`Export completato: ${filename}`);
}

async function importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        let importedCount = 0;
        
        // Import artisti
        if (data.artisti && Array.isArray(data.artisti)) {
            for (const artist of data.artisti) {
                try {
                    await DatabaseService.saveArtist(artist);
                    importedCount++;
                } catch (e) {
                    console.error('Errore import artista:', e);
                }
            }
        }
        
        // Import locali
        if (data.locali && Array.isArray(data.locali)) {
            for (const venue of data.locali) {
                try {
                    await DatabaseService.saveVenue(venue);
                    importedCount++;
                } catch (e) {
                    console.error('Errore import locale:', e);
                }
            }
        }
        
        alert(`Import completato! ${importedCount} record importati.`);
        
        // Ricarica i dati
        await loadDataFromSupabase();
        await loadDBArtists();
        await loadDBVenues();
        updateStatistics();
        
    } catch (error) {
        console.error('❌ Errore import:', error);
        alert('Errore durante l\'import: ' + error.message);
    }
    
    // Reset input
    event.target.value = '';
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
    // Gestione Enter nella ricerca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchArtist();
            }
        });
    }

    // Chiudi modal cliccando fuori
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('searchModal');
        const dbModal = document.getElementById('databaseManagerModal');
        
        if (event.target == modal) {
            closeModal();
        }
        
        if (event.target == dbModal) {
            closeDatabaseManager();
        }
    });
}

// ==================== ESPORTA FUNZIONI GLOBALI ====================
// Rendi tutte le funzioni disponibili globalmente per i click handler inline
window.startNewAgibilita = startNewAgibilita;
window.showComingSoon = showComingSoon;
window.openChatAI = openChatAI;
window.searchArtist = searchArtist;
window.showSuggestions = showSuggestions;
window.hideSuggestions = hideSuggestions;
window.selectArtist = selectArtist;
window.closeModal = closeModal;
window.addNewArtist = addNewArtist;
window.createAgibilitaForArtist = createAgibilitaForArtist;
window.createComunicazione = createComunicazione;
window.toggleDatabaseManager = toggleDatabaseManager;
window.closeDatabaseManager = closeDatabaseManager;
window.showDBTab = showDBTab;
window.filterDBArtists = filterDBArtists;
window.filterDBVenues = filterDBVenues;
window.removeArtistFromDB = removeArtistFromDB;
window.removeVenueFromDB = removeVenueFromDB;
window.exportDatabase = exportDatabase;
window.importDatabase = importDatabase;

console.log('🎉 Sistema RECORP Homepage inizializzato con successo!');
