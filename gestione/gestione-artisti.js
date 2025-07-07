/**
 * gestione-artisti.js
 * 
 * Script per la gestione della lista artisti
 */

let artistsDB = [];
let filteredArtists = [];
let artistToDelete = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    loadArtists();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Ricerca in tempo reale
    document.getElementById('searchName').addEventListener('input', filterArtists);
    document.getElementById('filterMansione').addEventListener('change', filterArtists);
    document.getElementById('filterTipo').addEventListener('change', filterArtists);
}

// Carica artisti dal localStorage
function loadArtists() {
    try {
        const saved = localStorage.getItem('artistsDB');
        if (saved) {
            artistsDB = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Errore caricamento database artisti:', error);
        artistsDB = [];
    }
    
    filteredArtists = [...artistsDB];
    renderTable();
}

// Filtra artisti
function filterArtists() {
    const searchTerm = document.getElementById('searchName').value.toLowerCase();
    const filterMansione = document.getElementById('filterMansione').value;
    const filterTipo = document.getElementById('filterTipo').value;
    
    filteredArtists = artistsDB.filter(artist => {
        // Filtro per nome/cognome/CF
        const matchName = !searchTerm || 
            artist.nome.toLowerCase().includes(searchTerm) ||
            artist.cognome.toLowerCase().includes(searchTerm) ||
            artist.codiceFiscale.toLowerCase().includes(searchTerm) ||
            (artist.nomeArte && artist.nomeArte.toLowerCase().includes(searchTerm));
        
        // Filtro per mansione
        const matchMansione = !filterMansione || artist.mansione === filterMansione;
        
        // Filtro per tipo rapporto
        let matchTipo = true;
        if (filterTipo) {
            if (filterTipo === 'piva') {
                matchTipo = artist.hasPartitaIva === 'si';
            } else if (filterTipo === 'occasionale') {
                matchTipo = artist.hasPartitaIva === 'no' && artist.tipoRapporto === 'occasionale';
            } else if (filterTipo === 'chiamata') {
                matchTipo = artist.hasPartitaIva === 'no' && artist.tipoRapporto === 'chiamata';
            }
        }
        
        return matchName && matchMansione && matchTipo;
    });
    
    renderTable();
}

// Reset filtri
function resetFilters() {
    document.getElementById('searchName').value = '';
    document.getElementById('filterMansione').value = '';
    document.getElementById('filterTipo').value = '';
    filterArtists();
}

// Renderizza tabella
function renderTable() {
    const tbody = document.getElementById('artistsTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('artistsTable');
    
    if (filteredArtists.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    tbody.innerHTML = filteredArtists.map(artist => {
        // Determina il badge del tipo rapporto
        let tipoBadge = '';
        if (artist.hasPartitaIva === 'si') {
            tipoBadge = '<span class="badge badge-piva">P.IVA</span>';
        } else if (artist.tipoRapporto === 'occasionale') {
            tipoBadge = '<span class="badge badge-occasionale">Occasionale</span>';
        } else if (artist.tipoRapporto === 'chiamata') {
            tipoBadge = '<span class="badge badge-chiamata">Chiamata</span>';
        }
        
        return `
            <tr>
                <td>${artist.nome}</td>
                <td>${artist.cognome}</td>
                <td>${artist.codiceFiscale}</td>
                <td>${artist.mansione}</td>
                <td>${tipoBadge}</td>
                <td>${artist.telefono || '-'}</td>
                <td>${artist.email || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon-only btn-edit" 
                                onclick="editArtist('${artist.id}')" 
                                title="Modifica">
                            ✏️
                        </button>
                        <button class="btn-icon-only btn-delete" 
                                onclick="deleteArtist('${artist.id}')" 
                                title="Elimina">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Modifica artista
function editArtist(id) {
    window.location.href = `./modifica-artista.html?id=${id}`;
}

// Elimina artista
function deleteArtist(id) {
    const artist = artistsDB.find(a => a.id === id);
    if (!artist) return;
    
    artistToDelete = id;
    document.getElementById('deleteArtistName').textContent = 
        `${artist.nome} ${artist.cognome} - ${artist.codiceFiscale}`;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Chiudi modal eliminazione
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    artistToDelete = null;
}

// Conferma eliminazione
function confirmDelete() {
    if (!artistToDelete) return;
    
    // Rimuovi dall'array
    artistsDB = artistsDB.filter(a => a.id !== artistToDelete);
    
    // Salva nel localStorage
    try {
        localStorage.setItem('artistsDB', JSON.stringify(artistsDB));
        
        // Ricarica la tabella
        filteredArtists = [...artistsDB];
        renderTable();
        
        // Chiudi modal
        closeDeleteModal();
        
        // Mostra notifica (potresti aggiungere un toast notification)
        alert('Artista eliminato con successo');
    } catch (error) {
        console.error('Errore eliminazione artista:', error);
        alert('Errore durante l\'eliminazione');
    }
}

// Rendi le funzioni disponibili globalmente
window.editArtist = editArtist;
window.deleteArtist = deleteArtist;
window.resetFilters = resetFilters;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
