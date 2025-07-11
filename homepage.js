// homepage.js - Sistema Gestione Homepage RECORP

// Import Supabase DatabaseService
import { DatabaseService, testConnection } from './supabase-config.js';

// ==================== VARIABILI GLOBALI ====================
let artistsDB = [];
let agibilitaDB = [];
let venuesDB = [];

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema RECORP...');
    
    // Test connessione Supabase
    const connected = await testConnection();
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
        artistsDB = await DatabaseService.getAllArtisti();
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
        const stats = await DatabaseService.getStats();
        
        // Aggiorna i display
        document.getElementById('totalArtists').textContent = stats.totalArtists;
        document.getElementById('monthlyAgibilita').textContent = stats.monthlyAgibilita;
        
        // Formatta compenso
        let compText = '€0';
        if (stats.totalCompensation >= 1000) {
            compText = '€' + (stats.totalCompensation / 1000).toFixed(1) + 'k';
        } else if (stats.totalCompensation > 0) {
            compText = '€' + stats.totalCompensation.toFixed(0);
        }
        document.getElementById('totalCompensation').textContent = compText;
        
        document.getElementById('completionRate').textContent = stats.completionRate + '%';
        
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        alert('Inserisci un nome o codice fiscale per la ricerca');
        return;
    }

    try {
        // Cerca in Supabase
        const results = await DatabaseService.searchArtisti(searchTerm);
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
                                <span>${new Date(a.data_inizio).toLocaleDateString('it-IT')} | ${a.locale.descrizione}</span>
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
                            <p class="artist-role">${artist.mansione}</p>
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const suggestionsDiv = document.getElementById('suggestions');
    
    if (searchTerm.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    try {
        const matches = await DatabaseService.searchArtisti(searchTerm);
        
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
                    <div class="suggestion-info">${artist.mansione} | CF: ${artist.codice_fiscale}</div>
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
                <td>${artist.mansione}</td>
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
                <td>${venue.citta_nome}</td>
                <td>${venue.indirizzo}</td>
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

function removeArtistFromDB(artistId) {
    alert('Funzione di rimozione in implementazione - Step successivo!');
}

function removeVenueFromDB(venueId) {
    alert('Funzione di rimozione in implementazione - Step successivo!');
}

function exportDatabase(type) {
    let data = {};
    let filename = '';
    
    switch(type) {
        case 'artisti':
            data = { artisti: artistsDB };
            filename = 'recorp_artisti_export.json';
            break;
        case 'locali':
            data = { locali: venuesDB };
            filename = 'recorp_locali_export.json';
            break;
        case 'all':
            data = { 
                artisti: artistsDB, 
                locali: venuesDB, 
                agibilita: agibilitaDB 
            };
            filename = 'recorp_database_completo.json';
            break;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function importDatabase(event) {
    alert('Funzione di import in implementazione - Step successivo!');
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
