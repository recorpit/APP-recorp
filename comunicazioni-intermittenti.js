// comunicazioni-intermittenti.js - Sistema Comunicazioni Lavoro Intermittente
import { DatabaseService } from './supabase-config.js';

// ==================== VARIABILI GLOBALI ====================
let allArtists = [];
let selectedWorkers = [];
let searchTimeout = null;

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema comunicazioni intermittenti...');
    
    try {
        // Test connessione database
        const connected = await DatabaseService.testConnection();
        if (!connected) {
            alert('Errore connessione database');
            return;
        }
        
        // Carica artisti
        await loadArtists();
        
        // Inizializza interfaccia
        initializeInterface();
        
        console.log('✅ Sistema comunicazioni pronto!');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione:', error);
        alert('Errore durante l\'inizializzazione del sistema');
    }
});

// ==================== CARICAMENTO DATI ====================
async function loadArtists() {
    try {
        console.log('📥 Caricamento artisti...');
        allArtists = await DatabaseService.getAllArtisti();
        console.log(`✅ ${allArtists.length} artisti caricati`);
    } catch (error) {
        console.error('❌ Errore caricamento artisti:', error);
        throw error;
    }
}

// ==================== INIZIALIZZAZIONE INTERFACCIA ====================
function initializeInterface() {
    const searchInput = document.getElementById('workerSearch');
    
    // Event listener per ricerca
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
    
    // Nascondi risultati quando si clicca fuori
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-worker')) {
            hideSearchResults();
        }
    });
    
    // Imposta data di oggi come default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('globalStartDate').value = today;
    document.getElementById('globalEndDate').value = today;
}

// ==================== RICERCA ARTISTI ====================
function performSearch(query) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
    
    const filtered = allArtists.filter(artist => {
        const searchText = `${artist.nome} ${artist.cognome} ${artist.codice_fiscale} ${artist.nome_arte || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase()) && 
               !selectedWorkers.find(w => w.id === artist.id);
    });
    
    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">Nessun artista trovato</div>';
    } else {
        resultsContainer.innerHTML = filtered.slice(0, 10).map(artist => {
            const displayName = artist.nome_arte || `${artist.nome} ${artist.cognome}`;
            return `
                <div class="search-result-item" onclick="selectWorker(${artist.id})">
                    <div class="worker-name">${displayName}</div>
                    <div class="worker-details">
                        CF: ${artist.codice_fiscale} | ${artist.mansione} | ${artist.citta}, ${artist.provincia}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    showSearchResults();
}

function showSearchResults() {
    document.getElementById('searchResults').style.display = 'block';
}

function hideSearchResults() {
    document.getElementById('searchResults').style.display = 'none';
}

// ==================== GESTIONE LAVORATORI SELEZIONATI ====================
function selectWorker(artistId) {
    const artist = allArtists.find(a => a.id === artistId);
    if (!artist || selectedWorkers.find(w => w.id === artistId)) {
        return;
    }
    
    const worker = {
        id: artist.id,
        nome: artist.nome,
        cognome: artist.cognome,
        nome_arte: artist.nome_arte,
        codice_fiscale: artist.codice_fiscale,
        codice_comunicazione: artist.codice_comunicazione,
        startDate: '',
        endDate: ''
    };
    
    selectedWorkers.push(worker);
    
    // Pulisci ricerca
    document.getElementById('workerSearch').value = '';
    hideSearchResults();
    
    // Aggiorna interfaccia
    renderSelectedWorkers();
    updateSummary();
    updateButtons();
    
    console.log('✅ Lavoratore aggiunto:', artist.nome, artist.cognome);
}

function removeWorker(workerId) {
    selectedWorkers = selectedWorkers.filter(w => w.id !== workerId);
    renderSelectedWorkers();
    updateSummary();
    updateButtons();
}

function renderSelectedWorkers() {
    const container = document.getElementById('selectedWorkersList');
    
    if (selectedWorkers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Nessun lavoratore selezionato</h3>
                <p>Cerca e seleziona gli artisti dalla barra di ricerca sopra</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = selectedWorkers.map(worker => {
        const displayName = worker.nome_arte || `${worker.nome} ${worker.cognome}`;
        
        return `
            <div class="selected-worker-item">
                <div class="worker-header">
                    <div class="worker-info">
                        <div class="worker-display-name">${displayName}</div>
                        <div class="worker-cf">CF: ${worker.codice_fiscale}</div>
                        ${worker.codice_comunicazione ? `<div class="worker-cf">Cod. Comunicazione: ${worker.codice_comunicazione}</div>` : ''}
                    </div>
                    <button class="remove-worker" onclick="removeWorker(${worker.id})">
                        🗑️
                    </button>
                </div>
                
                <div class="date-inputs">
                    <div class="date-group">
                        <label class="date-label">Data Inizio</label>
                        <input type="date" 
                               class="date-input" 
                               value="${worker.startDate}"
                               onchange="updateWorkerDate(${worker.id}, 'startDate', this.value)">
                        <div class="validation-error" id="startError_${worker.id}"></div>
                    </div>
                    <div class="date-group">
                        <label class="date-label">Data Fine</label>
                        <input type="date" 
                               class="date-input" 
                               value="${worker.endDate}"
                               onchange="updateWorkerDate(${worker.id}, 'endDate', this.value)">
                        <div class="validation-error" id="endError_${worker.id}"></div>
                    </div>
                    <div class="date-group">
                        <button class="auto-fill-btn" onclick="copyGlobalDatesToWorker(${worker.id})">
                            📅 Copia Globali
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateWorkerDate(workerId, field, value) {
    const worker = selectedWorkers.find(w => w.id === workerId);
    if (worker) {
        worker[field] = value;
        
        // Validazione
        validateWorkerDates(worker);
        updateSummary();
        updateButtons();
    }
}

function validateWorkerDates(worker) {
    const startError = document.getElementById(`startError_${worker.id}`);
    const endError = document.getElementById(`endError_${worker.id}`);
    
    // Reset errori
    if (startError) startError.textContent = '';
    if (endError) endError.textContent = '';
    
    if (worker.startDate && worker.endDate) {
        const startDate = new Date(worker.startDate);
        const endDate = new Date(worker.endDate);
        
        if (endDate < startDate) {
            if (endError) endError.textContent = 'La data di fine deve essere successiva alla data di inizio';
            return false;
        }
    }
    
    return true;
}

// ==================== GESTIONE DATE GLOBALI ====================
function applyGlobalDates() {
    const globalStart = document.getElementById('globalStartDate').value;
    const globalEnd = document.getElementById('globalEndDate').value;
    
    if (!globalStart || !globalEnd) {
        alert('Inserisci entrambe le date globali');
        return;
    }
    
    // Valida date globali
    if (new Date(globalEnd) < new Date(globalStart)) {
        alert('La data di fine deve essere successiva alla data di inizio');
        return;
    }
    
    // Applica a tutti i lavoratori
    selectedWorkers.forEach(worker => {
        worker.startDate = globalStart;
        worker.endDate = globalEnd;
    });
    
    renderSelectedWorkers();
    updateSummary();
    updateButtons();
    
    alert(`Date applicate a ${selectedWorkers.length} lavoratori`);
}

function copyGlobalDatesToWorker(workerId) {
    const globalStart = document.getElementById('globalStartDate').value;
    const globalEnd = document.getElementById('globalEndDate').value;
    
    if (!globalStart || !globalEnd) {
        alert('Prima imposta le date globali');
        return;
    }
    
    const worker = selectedWorkers.find(w => w.id === workerId);
    if (worker) {
        worker.startDate = globalStart;
        worker.endDate = globalEnd;
        
        renderSelectedWorkers();
        updateSummary();
        updateButtons();
    }
}

// ==================== RIEPILOGO ====================
function updateSummary() {
    const summaryContent = document.getElementById('summaryContent');
    
    if (selectedWorkers.length === 0) {
        summaryContent.innerHTML = `
            <div class="empty-state">
                <p>Seleziona almeno un lavoratore per vedere il riepilogo</p>
            </div>
        `;
        return;
    }
    
    const workersWithDates = selectedWorkers.filter(w => w.startDate && w.endDate);
    
    summaryContent.innerHTML = `
        <div class="summary-title">
            📋 Comunicazione per ${selectedWorkers.length} lavoratori 
            (${workersWithDates.length} con date complete)
        </div>
        <ul class="summary-list">
            ${selectedWorkers.map(worker => {
                const displayName = worker.nome_arte || `${worker.nome} ${worker.cognome}`;
                const hasValidDates = worker.startDate && worker.endDate && validateWorkerDates(worker);
                const statusIcon = hasValidDates ? '✅' : '⚠️';
                const dateText = hasValidDates ? 
                    `${formatDate(worker.startDate)} → ${formatDate(worker.endDate)}` : 
                    'Date mancanti o non valide';
                
                return `
                    <li class="summary-item">
                        <div>
                            <div class="summary-worker">${statusIcon} ${displayName}</div>
                            <div class="summary-dates">CF: ${worker.codice_fiscale}</div>
                            ${worker.codice_comunicazione ? `<div class="summary-dates">Cod: ${worker.codice_comunicazione}</div>` : ''}
                        </div>
                        <div class="summary-dates">${dateText}</div>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

// ==================== GESTIONE PULSANTI ====================
function updateButtons() {
    const previewBtn = document.getElementById('previewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const hasValidWorkers = selectedWorkers.length > 0 && 
                           selectedWorkers.every(w => w.startDate && w.endDate && validateWorkerDates(w));
    
    previewBtn.disabled = !hasValidWorkers;
    downloadBtn.disabled = !hasValidWorkers;
}

// ==================== GENERAZIONE XML ====================
function generateXMLPreview() {
    if (!validateAllData()) {
        return;
    }
    
    const xmlContent = generateXMLContent();
    const preview = formatXMLForDisplay(xmlContent);
    
    document.getElementById('xmlPreview').innerHTML = preview;
    document.getElementById('xmlPreviewContainer').style.display = 'block';
    
    alert('Anteprima XML generata con successo!');
}

function generateXMLContent() {
    const cfDatore = '04433920248'; // CF RECORP
    const email = 'amministrazione@recorp.it';
    const barcode = 'ML-15-01';
    const annullamento = '0';
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<moduloIntermittenti xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/">
<Campi>
<CFdatorelavoro>${cfDatore}</CFdatorelavoro>
<BCbarcodeModello01>${barcode}</BCbarcodeModello01>
<BCbarcodeModello01>${barcode}</BCbarcodeModello01>
<EMmail>${email}</EMmail>
<ANannullamento>${annullamento}</ANannullamento>`;

    // Aggiungi i lavoratori (max 10)
    for (let i = 1; i <= 10; i++) {
        const worker = selectedWorkers[i - 1];
        
        if (worker) {
            const startDate = formatDateForXML(worker.startDate);
            const endDate = formatDateForXML(worker.endDate);
            const codiceComunicazione = worker.codice_comunicazione || generateDefaultCode();
            
            xml += `
<CFlavoratore${i}>${worker.codice_fiscale}</CFlavoratore${i}>
<CCcodcomunicazione${i}>${codiceComunicazione}</CCcodcomunicazione${i}>
<DTdatainizio${i}>${startDate}</DTdatainizio${i}>
<DTdatafine${i}>${endDate}</DTdatafine${i}>`;
        } else {
            xml += `
<CFlavoratore${i}/>
<CCcodcomunicazione${i}/>
<DTdatainizio${i}/>
<DTdatafine${i}/>`;
        }
    }
    
    xml += `
</Campi>
</moduloIntermittenti>`;

    return xml;
}

function generateDefaultCode() {
    // Genera un codice comunicazione di default se non presente
    const timestamp = Date.now().toString();
    return '2100024' + timestamp.slice(-9);
}

function formatDateForXML(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatXMLForDisplay(xml) {
    return xml
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span class="xml-keyword">$1</span>')
        .replace(/(&lt;[^&gt;]*&gt;)([^&lt;]+)(&lt;)/g, '$1<span class="xml-value">$2</span>$3');
}

function validateAllData() {
    if (selectedWorkers.length === 0) {
        alert('Seleziona almeno un lavoratore');
        return false;
    }
    
    if (selectedWorkers.length > 10) {
        alert('Massimo 10 lavoratori per comunicazione');
        return false;
    }
    
    for (let worker of selectedWorkers) {
        if (!worker.startDate || !worker.endDate) {
            alert(`Date mancanti per ${worker.nome} ${worker.cognome}`);
            return false;
        }
        
        if (!validateWorkerDates(worker)) {
            alert(`Date non valide per ${worker.nome} ${worker.cognome}`);
            return false;
        }
    }
    
    return true;
}

function downloadXML() {
    if (!validateAllData()) {
        return;
    }
    
    const xmlContent = generateXMLContent();
    const filename = `comunicazione_intermittenti_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.xml`;
    
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    document.getElementById('successMessage').style.display = 'block';
    
    console.log('📄 XML scaricato:', {
        filename,
        lavoratori: selectedWorkers.length,
        periodo: selectedWorkers.length > 0 ? `${selectedWorkers[0].startDate} → ${selectedWorkers[0].endDate}` : 'N/A'
    });
}

// ==================== EXPORT FUNZIONI GLOBALI ====================
window.selectWorker = selectWorker;
window.removeWorker = removeWorker;
window.updateWorkerDate = updateWorkerDate;
window.applyGlobalDates = applyGlobalDates;
window.copyGlobalDatesToWorker = copyGlobalDatesToWorker;
window.generateXMLPreview = generateXMLPreview;
window.downloadXML = downloadXML;
