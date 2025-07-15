// homepage.js - Sistema Gestione Homepage RECORP SICURO

// Import DatabaseService e AuthGuard
import { DatabaseService } from './supabase-config.js';
import { AuthGuard } from './auth-guard.js';

// ==================== VARIABILI GLOBALI ====================
let artistsDB = [];
let agibilitaDB = [];
let venuesDB = [];
let currentUser = null;

// ==================== INIZIALIZZAZIONE SICURA ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema RECORP SICURO...');
    
    try {
        // 🔒 VERIFICA AUTENTICAZIONE PRIMA DI TUTTO
        console.log('🔐 Verifica autenticazione...');
        const session = await AuthGuard.requireAuth();
        currentUser = session.user;
        console.log('✅ Utente autenticato:', currentUser.email);
        
        // Mostra info utente
        updateUserInfo();
        
        // Test connessione Supabase
        console.log('🔌 Test connessione database...');
        const connected = await DatabaseService.testConnection();
        if (!connected) {
            throw new Error('Connessione database fallita');
        }
        console.log('✅ Database connesso');

        // Carica dati da Supabase (ora sicuro)
        await loadDataFromSupabase();
        
        // Aggiorna statistiche
        await updateStatistics();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup user session management
        setupUserSessionManagement();
        
        console.log('🎉 Sistema RECORP Homepage inizializzato con SICUREZZA!');
        showToast('Dashboard caricata con successo', 'success');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione sicura:', error);
        // AuthGuard ha già gestito il redirect se non autenticato
        if (error.message !== 'Autenticazione richiesta') {
            showToast('Errore inizializzazione: ' + error.message, 'error');
        }
    }
});

// ==================== GESTIONE UTENTE SICURA ====================
function updateUserInfo() {
    if (!currentUser) return;
    
    // Aggiorna email utente
    const emailElement = document.getElementById('current-user-email');
    if (emailElement) {
        emailElement.textContent = currentUser.email;
    }
    
    // Calcola tempo di sessione
    const loginTime = new Date(currentUser.last_sign_in_at || currentUser.created_at);
    const now = new Date();
    const sessionMinutes = Math.floor((now - loginTime) / (1000 * 60));
    
    const sessionElement = document.getElementById('session-info');
    if (sessionElement) {
        sessionElement.textContent = `Sessione: ${sessionMinutes}m`;
    }
}

function setupUserSessionManagement() {
    // Auto-logout dopo 30 minuti di inattività
    let inactivityTimer;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            alert('Sessione scaduta per inattività. Sarai disconnesso per sicurezza.');
            AuthGuard.logout();
        }, 30 * 60 * 1000); // 30 minuti
    }

    // Reset timer su attività utente
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Avvia timer
    resetInactivityTimer();
    
    // Aggiorna info utente ogni minuto
    setInterval(updateUserInfo, 60000);
}

// ==================== CARICAMENTO DATI SICURO ====================
async function loadDataFromSupabase() {
    try {
        console.log('📥 Caricamento dati SICURI da Supabase...');
        
        // 🔒 Verifica che l'utente sia ancora autenticato
        const isAuth = await AuthGuard.isAuthenticated();
        if (!isAuth) {
            throw new Error('Sessione scaduta durante caricamento');
        }
        
        // Carica artisti
        console.log('👥 Caricamento artisti...');
        artistsDB = await DatabaseService.getArtists();
        console.log(`✅ ${artistsDB.length} artisti caricati`);
        
        // Carica agibilità
        console.log('🎭 Caricamento agibilità...');
        agibilitaDB = await DatabaseService.getAgibilita();
        console.log(`✅ ${agibilitaDB.length} agibilità caricate`);
        
        // Carica venues
        console.log('🏢 Caricamento venues...');
        venuesDB = await DatabaseService.getVenues();
        console.log(`✅ ${venuesDB.length} venues caricati`);
        
        // Aggiorna UI con dati caricati
        updateRecentActivity();
        
    } catch (error) {
        console.error('❌ Errore caricamento dati sicuro:', error);
        
        // Se errore di autenticazione, forza logout
        if (error.message.includes('auth') || error.message.includes('session')) {
            showToast('Sessione scaduta, redirect al login...', 'warning');
            setTimeout(() => AuthGuard.logout(), 2000);
        } else {
            showToast('Errore caricamento dati: ' + error.message, 'error');
        }
        throw error;
    }
}

// ==================== STATISTICHE SICURE CON GESTIONE ERRORI ====================
async function updateStatistics() {
    try {
        console.log('📊 Caricamento statistiche sicure...');
        
        // Verifica autenticazione
        const isAuth = await AuthGuard.isAuthenticated();
        if (!isAuth) {
            throw new Error('Non autenticato per statistiche');
        }
        
        // 🔧 CHIAMATA SICURA ALLE STATISTICHE
        const stats = await getStatisticsSafely();
        console.log('📈 Statistiche ricevute:', stats);
        
        // Aggiorna i display esistenti
        updateStatElement('totalArtists', stats.artisti || 0);
        updateStatElement('monthlyAgibilita', stats.agibilita_mese || 0);
        updateStatElement('artists-count', stats.artisti || 0);
        updateStatElement('agibilita-count', stats.agibilita_totali || 0);
        updateStatElement('month-agibilita', stats.agibilita_mese || 0);
        updateStatElement('pending-drafts', stats.bozze_sospese || 0);
        
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
        updateStatElement('totalCompensation', compText);
        
        // Prestazioni totali/mese
        updateStatElement('completionRate', stats.artisti_totali_mese || 0);
        
        // Aggiorna trends
        updateStatElement('artists-trend', `${stats.artisti_unici_mese || 0} questo mese`);
        updateStatElement('agibilita-trend', `Media: ${stats.media_artisti_agibilita || 0} artisti`);
        updateStatElement('month-trend', `${stats.artisti_totali_mese || 0} artisti coinvolti`);
        
        // Aggiorna le label delle statistiche
        updateStatLabels(stats);
        
    } catch (error) {
        console.error('❌ Errore aggiornamento statistiche sicure:', error);
        
        // Fallback a valori di default
        updateStatElement('totalArtists', artistsDB.length);
        updateStatElement('monthlyAgibilita', '0');
        updateStatElement('totalCompensation', '€0');
        updateStatElement('completionRate', '0');
        
        showToast('Alcune statistiche potrebbero non essere aggiornate', 'warning');
    }
}

// 🔧 FUNZIONE SICURA PER STATISTICHE CON GESTIONE ERRORI
async function getStatisticsSafely() {
    try {
        // Prima prova il metodo completo
        return await DatabaseService.getStatistiche();
    } catch (error) {
        console.warn('⚠️ Errore statistiche complete, calcolo manuale:', error);
        
        // Se fallisce, calcola manualmente dai dati già caricati
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Calcola agibilità del mese
        const agibilitaMese = agibilitaDB.filter(ag => {
            if (!ag.created_at) return false;
            const createdDate = new Date(ag.created_at);
            return createdDate >= firstDayOfMonth;
        }).length;
        
        // Calcola artisti del mese
        let artistiTotaliMese = 0;
        const artistiUniciSet = new Set();
        
        agibilitaDB.forEach(agibilita => {
            if (!agibilita.created_at) return;
            const createdDate = new Date(agibilita.created_at);
            if (createdDate >= firstDayOfMonth && agibilita.artisti && Array.isArray(agibilita.artisti)) {
                agibilita.artisti.forEach(artista => {
                    artistiTotaliMese++;
                    if (artista.cf) {
                        artistiUniciSet.add(artista.cf);
                    }
                });
            }
        });
        
        const artistiUniciMese = artistiUniciSet.size;
        const mediaArtistiAgibilita = agibilitaMese > 0 ? (artistiTotaliMese / agibilitaMese).toFixed(1) : 0;
        
        // Conta bozze (se la tabella esiste)
        let bozzeSospese = 0;
        try {
            const bozze = await DatabaseService.getBozze();
            bozzeSospese = bozze.length;
        } catch (e) {
            console.warn('Tabella bozze non disponibile:', e);
        }
        
        return {
            artisti: artistsDB.length,
            agibilita_totali: agibilitaDB.length,
            agibilita_mese: agibilitaMese,
            artisti_unici_mese: artistiUniciMese,
            artisti_totali_mese: artistiTotaliMese,
            media_artisti_agibilita: mediaArtistiAgibilita,
            bozze_sospese: bozzeSospese,
            comunicazioni_anno: 0 // Non calcolabile senza tabella comunicazioni funzionante
        };
    }
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateStatLabels(stats) {
    // Trova e aggiorna la label per mostrare "Prestazioni Totali/Mese"
    const completionRateCard = document.querySelector('#completionRate')?.closest('.stat-card');
    if (completionRateCard) {
        const label = completionRateCard.querySelector('.stat-label');
        if (label) {
            label.textContent = 'Prestazioni Totali/Mese';
        }
        
        // Aggiungi info sugli artisti unici se diverso dal totale
        if (stats.artisti_unici_mese > 0 && stats.artisti_unici_mese !== stats.artisti_totali_mese) {
            const existingInfo = completionRateCard.querySelector('.stat-info');
            if (!existingInfo) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'stat-info';
                infoDiv.style.fontSize = '0.8rem';
                infoDiv.style.color = '#666';
                infoDiv.style.marginTop = '5px';
                infoDiv.textContent = `(${stats.artisti_unici_mese} artisti unici)`;
                completionRateCard.appendChild(infoDiv);
            } else {
                existingInfo.textContent = `(${stats.artisti_unici_mese} artisti unici)`;
            }
        }
    }
    
    // Aggiungi media artisti per agibilità
    if (stats.media_artisti_agibilita > 0) {
        const agibilitaCard = document.querySelector('#monthlyAgibilita')?.closest('.stat-card');
        if (agibilitaCard) {
            const existingAvg = agibilitaCard.querySelector('.stat-avg');
            if (!existingAvg) {
                const avgIndicator = document.createElement('div');
                avgIndicator.className = 'stat-avg';
                avgIndicator.style.fontSize = '0.8rem';
                avgIndicator.style.color = '#666';
                avgIndicator.style.marginTop = '5px';
                avgIndicator.textContent = `Media: ${stats.media_artisti_agibilita} artisti/agibilità`;
                agibilitaCard.appendChild(avgIndicator);
            } else {
                existingAvg.textContent = `Media: ${stats.media_artisti_agibilita} artisti/agibilità`;
            }
        }
    }
}

// ==================== ATTIVITÀ RECENTE ====================
function updateRecentActivity() {
    try {
        // Aggiorna agibilità recenti
        const agibilitaContainer = document.getElementById('recent-agibilita');
        if (agibilitaContainer && agibilitaDB.length > 0) {
            const recentAgibilita = agibilitaDB.slice(0, 5);
            agibilitaContainer.innerHTML = recentAgibilita.map(ag => `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-title">${ag.codice || 'N/A'}</div>
                        <div class="activity-subtitle">${formatDate(ag.data_inizio)} - ${formatDate(ag.data_fine)}</div>
                    </div>
                    <div class="activity-status ${ag.stato_invio || 'draft'}">${getStatusText(ag.stato_invio)}</div>
                </div>
            `).join('');
        } else if (agibilitaContainer) {
            agibilitaContainer.innerHTML = '<div class="no-data">Nessuna agibilità trovata</div>';
        }

        // Aggiorna artisti recenti
        const artistiContainer = document.getElementById('recent-artists');
        if (artistiContainer && artistsDB.length > 0) {
            const recentArtisti = artistsDB.slice(0, 5);
            artistiContainer.innerHTML = recentArtisti.map(artista => `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-title">${artista.nome} ${artista.cognome}</div>
                        <div class="activity-subtitle">${artista.mansione || 'N/A'}</div>
                    </div>
                    <div class="activity-date">${formatDate(artista.created_at)}</div>
                </div>
            `).join('');
        } else if (artistiContainer) {
            artistiContainer.innerHTML = '<div class="no-data">Nessun artista trovato</div>';
        }
    } catch (error) {
        console.error('❌ Errore aggiornamento attività recente:', error);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
}

function getStatusText(status) {
    const statusMap = {
        'inviato': 'Inviato',
        'draft': 'Bozza',
        'pending': 'In attesa',
        'completed': 'Completato'
    };
    return statusMap[status] || 'N/A';
}

// ==================== FUNZIONI NAVIGAZIONE ====================
function startNewAgibilita() {
    console.log('Navigazione a nuova agibilità');
    window.location.href = './agibilita/index.html';
}

function showComingSoon() {
    showToast('Funzionalità in arrivo! 🚀', 'info');
}

function openChatAI() {
    window.location.href = './chat-agibilita.html';
}

// ==================== RICERCA ARTISTI SICURA ====================
async function searchArtist() {
    const searchTerm = document.getElementById('searchInput')?.value.trim();
    
    if (!searchTerm) {
        showToast('Inserisci un nome o codice fiscale per la ricerca', 'warning');
        return;
    }

    try {
        // 🔒 Verifica autenticazione prima della ricerca
        const isAuth = await AuthGuard.isAuthenticated();
        if (!isAuth) {
            showToast('Sessione scaduta, effettuare nuovamente il login', 'error');
            AuthGuard.logout();
            return;
        }

        // Cerca in Supabase
        const results = await DatabaseService.searchArtistsForAgibilita(searchTerm);
        displaySearchResults(results, searchTerm);
    } catch (error) {
        console.error('❌ Errore ricerca sicura:', error);
        showToast('Errore durante la ricerca: ' + error.message, 'error');
    }
}

function displaySearchResults(results, searchTerm) {
    const modal = document.getElementById('searchModal');
    const resultsContainer = document.getElementById('searchResults');
    
    if (!modal || !resultsContainer) return;
    
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

// ==================== SUGGERIMENTI RICERCA SICURI ====================
async function showSuggestions() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    
    if (!searchInput || !suggestionsDiv) return;
    
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    try {
        // 🔒 Verifica autenticazione
        const isAuth = await AuthGuard.isAuthenticated();
        if (!isAuth) return;

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
        console.error('❌ Errore suggestions sicure:', error);
        suggestionsDiv.style.display = 'none';
    }
}

function highlightMatch(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<strong class="highlight-match">$1</strong>');
}

function hideSuggestions() {
    const suggestionsDiv = document.getElementById('suggestions');
    if (suggestionsDiv) {
        suggestionsDiv.style.display = 'none';
    }
}

function selectArtist(artistId) {
    const artist = artistsDB.find(a => a.id == artistId);
    if (artist) {
        const results = [artist];
        displaySearchResults(results, artist.nome);
        hideSuggestions();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    }
}

// ==================== FUNZIONI AZIONI ====================
function closeModal() {
    const modal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    
    if (modal) modal.style.display = 'none';
    if (searchInput) searchInput.value = '';
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
    showToast('Funzione comunicazione a chiamata in sviluppo', 'info');
}

// ==================== DATABASE MANAGER SICURO ====================
async function toggleDatabaseManager() {
    // 🔒 Verifica permessi admin per database manager
    if (!currentUser) {
        showToast('Accesso negato: utente non autenticato', 'error');
        return;
    }
    
    const modal = document.getElementById('databaseManagerModal');
    if (modal) {
        modal.style.display = 'block';
        await loadDBArtists();
        await loadDBVenues();
    }
}

function closeDatabaseManager() {
    const modal = document.getElementById('databaseManagerModal');
    if (modal) {
        modal.style.display = 'none';
    }
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
    
    const tabContent = document.getElementById('dbTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (tabContent) {
        tabContent.style.display = 'block';
    }
}

async function loadDBArtists() {
    const tbody = document.getElementById('dbArtistsList');
    const noMsg = document.getElementById('noArtistsMsg');
    
    if (!tbody) return;
    
    if (artistsDB.length === 0) {
        tbody.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
    } else {
        if (noMsg) noMsg.style.display = 'none';
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
    
    if (!tbody) return;
    
    if (venuesDB.length === 0) {
        tbody.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
    } else {
        if (noMsg) noMsg.style.display = 'none';
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
    const searchInput = document.getElementById('dbSearchArtist');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll('#dbArtistsList tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function filterDBVenues() {
    const searchInput = document.getElementById('dbSearchVenue');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
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
        // 🔒 Verifica autenticazione prima dell'eliminazione
        const isAuth = await AuthGuard.isAuthenticated();
        if (!isAuth) {
            showToast('Sessione scaduta', 'error');
            AuthGuard.logout();
            return;
        }

        await DatabaseService.deleteArtist(artistId);
        showToast('Artista rimosso con successo!', 'success');
        
        // Ricarica i dati
        await loadDataFromSupabase();
        await loadDBArtists();
        await updateStatistics();
    } catch (error) {
        console.error('❌ Errore rimozione artista:', error);
        showToast('Errore durante la rimozione: ' + error.message, 'error');
    }
}

async function removeVenueFromDB(venueId) {
    if (!confirm('Sei sicuro di voler rimuovere questo locale?')) {
        return;
    }
    
    try {
        // 🔒 Verifica autenticazione
        const isAuth = await AuthGuard.isAuthenticated();
        if (!isAuth) {
            showToast('Sessione scaduta', 'error');
            AuthGuard.logout();
            return;
        }

        await DatabaseService.deleteVenue(venueId);
        showToast('Locale rimosso con successo!', 'success');
        
        // Ricarica i dati
        await loadDataFromSupabase();
        await loadDBVenues();
    } catch (error) {
        console.error('❌ Errore rimozione locale:', error);
        showToast('Errore durante la rimozione: ' + error.message, 'error');
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
                version: '1.0',
                exported_by: currentUser?.email || 'unknown'
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
    
    showToast(`Export completato: ${filename}`, 'success');
}

async function importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // 🔒 Verifica autenticazione per import
        const isAuth = await AuthGuard.isAuthenticated();
        if (!isAuth) {
            showToast('Sessione scaduta', 'error');
            AuthGuard.logout();
            return;
        }

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
        
        showToast(`Import completato! ${importedCount} record importati.`, 'success');
        
        // Ricarica i dati
        await loadDataFromSupabase();
        await loadDBArtists();
        await loadDBVenues();
        await updateStatistics();
        
    } catch (error) {
        console.error('❌ Errore import:', error);
        showToast('Errore durante l\'import: ' + error.message, 'error');
    }
    
    // Reset input
    event.target.value = '';
}

// ==================== UTILITIES ====================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#2563eb'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 5000);
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

// Funzione logout globale per la barra utente
window.handleLogout = async function() {
    if (confirm('Sei sicuro di voler uscire dal sistema RECORP?')) {
        await AuthGuard.logout();
    }
}

// Funzione per modal comunicazioni
window.showComunicazioniModal = function() {
    showToast('Funzionalità comunicazioni in sviluppo', 'info');
}

console.log('🔒 Sistema RECORP Homepage SICURO caricato!');