// agibilita.js - Sistema Gestione Agibilità RECORP con Database GI

// ==================== VARIABILI GLOBALI ====================
let selectedArtists = [];
let agibilitaData = {
    isModifica: false,
    codiceAgibilita: null
};

// Database
let artistsDB = [];
let agibilitaDB = [];
let venuesDB = [];
let invoiceDB = [];

// ==================== INIZIALIZZAZIONE DATABASE ====================
function initializeDatabase() {
    try {
        artistsDB = JSON.parse(localStorage.getItem('artistsDB')) || [];
        agibilitaDB = JSON.parse(localStorage.getItem('agibilitaDB')) || [];
        venuesDB = JSON.parse(localStorage.getItem('venuesDB')) || [];
        invoiceDB = JSON.parse(localStorage.getItem('invoiceDB')) || [];
    } catch (error) {
        console.error('Errore caricamento database:', error);
        artistsDB = [];
        agibilitaDB = [];
        venuesDB = [];
        invoiceDB = [];
    }
}

// ==================== INIZIALIZZAZIONE PAGINA ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeDatabase();
    initializeGIDatabase();
    initializeDateFields();
    checkSessionData();
    setupEventListeners();
});

function initializeGIDatabase() {
    if (typeof window.GIDatabase !== 'undefined') {
        window.GIDatabase.init().then(() => {
            console.log('✅ Database GI inizializzato');
            setupLocationDropdowns();
        }).catch(error => {
            console.error('❌ Errore inizializzazione Database GI:', error);
            setupLocationDropdowns();
        });
    } else {
        console.warn('⚠️ Database GI non disponibile');
        setTimeout(setupLocationDropdowns, 1000);
    }
}

function initializeDateFields() {
    const today = new Date().toISOString().split('T')[0];
    const dataInizio = document.getElementById('dataInizio');
    if (dataInizio) {
        dataInizio.value = today;
        dataInizio.min = today;
    }
    
    const dataFine = document.getElementById('dataFine');
    if (dataFine) {
        dataFine.min = today;
    }
}

function checkSessionData() {
    // Check se viene dalla ricerca artista
    const selectedArtistId = sessionStorage.getItem('selectedArtistId');
    if (selectedArtistId) {
        handleArtistFromSearch(selectedArtistId);
    }

    // Check se viene dalla registrazione
    const newArtistId = sessionStorage.getItem('newArtistId');
    if (newArtistId) {
        handleNewArtistRegistration(newArtistId);
    }

    // Check se viene dalla chat
    const quickAgibilita = sessionStorage.getItem('quickAgibilita');
    if (quickAgibilita) {
        handleQuickAgibilita(quickAgibilita);
    }
}

function setupEventListeners() {
    // Date validation
    const dataInizio = document.getElementById('dataInizio');
    const dataFine = document.getElementById('dataFine');
    if (dataInizio) dataInizio.addEventListener('change', validateDates);
    if (dataFine) dataFine.addEventListener('change', validateDates);

    // Venue search
    const descrizioneLocale = document.getElementById('descrizioneLocale');
    if (descrizioneLocale) {
        descrizioneLocale.addEventListener('input', searchVenue);
    }

    // Location dropdowns
    const provincia = document.getElementById('provincia');
    if (provincia) provincia.addEventListener('change', loadCitiesForProvince);
    
    const citta = document.getElementById('citta');
    if (citta) citta.addEventListener('change', loadCAPsForCity);

    // Modal close on outside click
    window.addEventListener('click', handleModalClick);
}

// ==================== GESTIONE SESSIONE ====================
function handleArtistFromSearch(artistId) {
    sessionStorage.removeItem('selectedArtistId');
    startNewAgibilita();
    
    setTimeout(() => {
        const artist = artistsDB.find(a => a.id === parseInt(artistId));
        if (artist) {
            addArtistToList(parseInt(artistId));
        }
    }, 100);
}

function handleNewArtistRegistration(newArtistId) {
    sessionStorage.removeItem('newArtistId');
    const newArtist = artistsDB.find(a => a.id == newArtistId);
    
    if (newArtist) {
        startNewAgibilita();
        setTimeout(() => {
            showAddArtistModal();
            addArtistToList(parseInt(newArtistId));
        }, 500);
    }
}

function handleQuickAgibilita(quickAgibilitaData) {
    sessionStorage.removeItem('quickAgibilita');
    const data = JSON.parse(quickAgibilitaData);
    
    startNewAgibilita();
    
    setTimeout(() => {
        // Aggiungi artisti
        data.artisti.forEach(artistData => {
            const artist = artistsDB.find(a => a.codiceFiscale === artistData.cf);
            if (artist) {
                const tipoRapporto = determineTipoRapporto(artist);
                selectedArtists.push({
                    ...artist,
                    ruolo: artistData.ruolo,
                    compenso: artistData.compenso,
                    tipoRapporto: tipoRapporto,
                    matricolaEnpals: artist.matricolaENPALS || generateMatricolaEnpals()
                });
            }
        });
        
        updateArtistsList();
        
        // Compila campi
        if (data.dataInizio) document.getElementById('dataInizio').value = data.dataInizio;
        if (data.dataFine) document.getElementById('dataFine').value = data.dataFine;
        
        if (data.locale) {
            document.getElementById('descrizioneLocale').value = data.locale.nome;
            document.getElementById('indirizzo').value = data.locale.indirizzo;
            document.getElementById('citta').value = data.locale.citta;
            document.getElementById('cap').value = data.locale.cap;
            document.getElementById('provincia').value = data.locale.provincia;
        }
        
        if (selectedArtists.length > 0) {
            setTimeout(() => goToStep2(), 500);
        }
    }, 200);
}

// ==================== NAVIGAZIONE ====================
function showSection(sectionId) {
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function startNewAgibilita() {
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    selectedArtists = [];
    clearAllForms();
    showSection('step1');
}

function showEditAgibilita() {
    const editListSection = document.getElementById('editListSection');
    if (editListSection) {
        editListSection.style.display = 'block';
        showExistingAgibilita();
    }
}

function goToStep2() {
    if (selectedArtists.length === 0) {
        alert('Seleziona almeno un artista');
        return;
    }
    
    const allValid = selectedArtists.every(a => a.ruolo && a.compenso > 0);
    if (!allValid) {
        alert('Completa ruolo e compenso per tutti gli artisti');
        return;
    }
    
    showSection('step2');
}

function goToStep3() {
    const requiredFields = ['dataInizio', 'dataFine', 'descrizioneLocale', 'indirizzo', 
                          'citta', 'cap', 'provincia', 'ragioneSociale'];
    
    const missingFields = requiredFields.filter(field => {
        const element = document.getElementById(field);
        return !element || !element.value;
    });

    if (missingFields.length > 0) {
        alert('Compila tutti i campi obbligatori');
        return;
    }

    // Salva venue se nuovo
    saveVenueIfNew();
    
    // Salva dati fatturazione
    saveInvoiceData();
    
    // Aggiorna riepiloghi
    updateSummaries();
    generateXMLPreview();
    
    showSection('step3');
}

// ==================== GESTIONE ARTISTI ====================
function showAddArtistModal() {
    const modal = document.getElementById('addArtistModal');
    if (modal) {
        modal.style.display = 'block';
        const searchInput = document.getElementById('artistSearch');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    }
}

function closeModal() {
    const modal = document.getElementById('addArtistModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function searchArtists() {
    const searchTerm = document.getElementById('artistSearch').value.toLowerCase();
    
    if (!searchTerm) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    const results = artistsDB.filter(artist => 
        artist.nome.toLowerCase().includes(searchTerm) || 
        artist.cognome.toLowerCase().includes(searchTerm) ||
        artist.codiceFiscale.toLowerCase().includes(searchTerm) ||
        (artist.nomeArte && artist.nomeArte.toLowerCase().includes(searchTerm))
    );

    const resultsDiv = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <p class="no-results">Nessun artista trovato</p>
            <div class="text-center mt-4">
                <button class="btn btn-primary" onclick="goToRegistration()">
                    ➕ Registra Nuovo Artista
                </button>
            </div>
        `;
    } else {
        resultsDiv.innerHTML = results.map(artist => `
            <div class="search-result" onclick="addArtistToList(${artist.id})">
                <strong>${artist.nome} ${artist.cognome}${artist.nomeArte ? ' - ' + artist.nomeArte : ''}</strong><br>
                <small>CF: ${artist.codiceFiscale} | ${artist.mansione || 'Non specificata'}</small>
            </div>
        `).join('');
    }
}

function addArtistToList(artistId) {
    const artist = artistsDB.find(a => a.id === artistId);
    if (!artist) return;

    // Controlla se già presente
    const existingIndex = selectedArtists.findIndex(a => a.codiceFiscale === artist.codiceFiscale);
    if (existingIndex !== -1) {
        alert('Questo artista è già stato aggiunto!');
        return;
    }

    // Determina tipo rapporto
    const tipoRapporto = determineTipoRapporto(artist);

    // Aggiungi artista
    selectedArtists.push({
        ...artist,
        ruolo: artist.mansione || '',
        compenso: 0,
        matricolaEnpals: artist.matricolaENPALS || generateMatricolaEnpals(),
        tipoRapporto: tipoRapporto
    });

    updateArtistsList();
    closeModal();
}

function determineTipoRapporto(artist) {
    if (artist.hasPartitaIva === 'si') {
        return 'partitaiva';
    } else if (artist.tipoRapporto) {
        return artist.tipoRapporto;
    } else {
        return 'occasionale';
    }
}

function updateArtistsList() {
    const listDiv = document.getElementById('artistList');
    if (!listDiv) return;

    if (selectedArtists.length === 0) {
        listDiv.innerHTML = '<p class="no-artists-message">Nessun artista selezionato</p>';
        hideElement('summaryBox');
        hideElement('btnNext1');
    } else {
        listDiv.innerHTML = selectedArtists.map((artist, index) => `
            <div class="artist-item">
                <div class="artist-info">
                    <strong>${artist.nome} ${artist.cognome}${artist.nomeArte ? ' - ' + artist.nomeArte : ''}</strong><br>
                    <small>CF: ${artist.codiceFiscale}</small>
                    ${artist.matricolaEnpals ? `<br><small>Matricola ENPALS: ${artist.matricolaEnpals}</small>` : ''}
                    <br><span class="tipo-rapporto-badge tipo-${artist.tipoRapporto}">${getTipoRapportoLabel(artist.tipoRapporto)}</span>
                </div>
                <div class="artist-role-compensation">
                    <select class="form-control" required onchange="updateArtistRole(${index}, this.value)">
                        <option value="">Seleziona ruolo...</option>
                        ${getRuoliOptions(artist.ruolo)}
                    </select>
                    <input type="number" class="form-control compensation-input" 
                           placeholder="Compenso €" 
                           value="${artist.compenso || ''}" 
                           min="0" 
                           step="0.01"
                           onchange="updateArtistCompensation(${index}, this.value)">
                    <button class="btn btn-danger btn-sm" onclick="removeArtist(${index})">Rimuovi</button>
                </div>
            </div>
        `).join('');

        showElement('summaryBox');
        updateTotalCompensation();
        checkCanProceed();
    }
}

function getRuoliOptions(selectedRuolo) {
    const ruoli = [
        { value: 'DJ', label: 'DJ (032)' },
        { value: 'Vocalist', label: 'Vocalist (031)' },
        { value: 'Ballerino/a', label: 'Ballerino/a (092)' },
        { value: 'Tecnico', label: 'Tecnico (117)' },
        { value: 'Fotografo', label: 'Fotografo (126)' },
        { value: 'Truccatore', label: 'Truccatore (141)' }
    ];
    
    return ruoli.map(ruolo => 
        `<option value="${ruolo.value}" ${selectedRuolo === ruolo.value ? 'selected' : ''}>${ruolo.label}</option>`
    ).join('');
}

function getTipoRapportoLabel(tipo) {
    const labels = {
        'partitaiva': 'P.IVA',
        'occasionale': 'Prestazione Occasionale',
        'chiamata': 'Contratto a Chiamata',
        'fulltime': 'Full Time'
    };
    return labels[tipo] || tipo;
}

function updateArtistRole(index, role) {
    if (selectedArtists[index]) {
        selectedArtists[index].ruolo = role;
        checkCanProceed();
    }
}

function updateArtistCompensation(index, value) {
    if (selectedArtists[index]) {
        selectedArtists[index].compenso = parseFloat(value) || 0;
        updateTotalCompensation();
        checkCanProceed();
    }
}

function removeArtist(index) {
    selectedArtists.splice(index, 1);
    updateArtistsList();
}

function updateTotalCompensation() {
    const total = selectedArtists.reduce((sum, artist) => sum + (artist.compenso || 0), 0);
    
    const totalArtistsEl = document.getElementById('totalArtists');
    if (totalArtistsEl) totalArtistsEl.textContent = selectedArtists.length;
    
    const totalCompensationEl = document.getElementById('totalCompensation');
    if (totalCompensationEl) totalCompensationEl.textContent = total.toFixed(2);
}

function checkCanProceed() {
    const canProceed = selectedArtists.length > 0 && 
        selectedArtists.every(a => a.ruolo && a.compenso > 0);
    
    const btnNext = document.getElementById('btnNext1');
    if (btnNext) {
        btnNext.style.display = canProceed ? 'inline-block' : 'none';
    }
}

function goToRegistration() {
    sessionStorage.setItem('returnToAgibilita', 'true');
    window.location.href = '../registrazione-artista.html';
}

// ==================== GESTIONE DATE ====================
function validateDates() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;

    if (!startDate || !endDate) return;

    if (endDate < startDate) {
        alert('La data di fine non può essere precedente alla data di inizio');
        document.getElementById('dataFine').value = startDate;
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const dateInfo = document.getElementById('dateInfo');
    if (dateInfo) {
        dateInfo.style.display = 'block';
        dateInfo.textContent = `Durata: ${diffDays} giorn${diffDays > 1 ? 'i' : 'o'}`;
    }
}

// ==================== GESTIONE LOCALITÀ ====================
function setupLocationDropdowns() {
    if (window.GIDatabase && window.GIDatabase.isLoaded()) {
        loadProvinces();
    } else {
        setTimeout(() => {
            if (window.GIDatabase && window.GIDatabase.isLoaded()) {
                loadProvinces();
            } else {
                console.warn('Database GI non pronto');
                loadFallbackProvinces();
            }
        }, 1000);
    }
}

function loadProvinces() {
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        console.warn('Database GI non ancora caricato');
        return;
    }

    const provinciaSelect = document.getElementById('provincia');
    if (!provinciaSelect) return;

    const provinceData = window.GIDatabase.getData().province;
    
    if (provinceData && Array.isArray(provinceData)) {
        const sortedProvinces = provinceData.sort((a, b) => {
            const siglaA = a.sigla_provincia || a.sigla || '';
            const siglaB = b.sigla_provincia || b.sigla || '';
            return siglaA.localeCompare(siglaB);
        });

        provinciaSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        sortedProvinces.forEach(provincia => {
            const sigla = provincia.sigla_provincia || provincia.sigla || provincia.codice;
            const nome = provincia.denominazione_provincia || provincia.denominazione || provincia.nome;
            
            if (sigla) {
                const option = document.createElement('option');
                option.value = sigla;
                option.textContent = `${sigla} - ${nome}`;
                provinciaSelect.appendChild(option);
            }
        });

        console.log(`✅ Caricate ${sortedProvinces.length} province`);
    } else {
        loadProvincesFromComuni();
    }
}

function loadProvincesFromComuni() {
    const allComuni = window.GIDatabase.getData().comuni || [];
    const provinces = new Map();
    
    allComuni.forEach(comune => {
        const provincia = comune.sigla_provincia || comune.provincia;
        if (provincia && provincia.length === 2 && !provinces.has(provincia)) {
            provinces.set(provincia, provincia);
        }
    });

    const sortedProvinces = Array.from(provinces.keys()).sort();
    const provinciaSelect = document.getElementById('provincia');
    
    provinciaSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
    
    sortedProvinces.forEach(provincia => {
        const option = document.createElement('option');
        option.value = provincia;
        option.textContent = provincia;
        provinciaSelect.appendChild(option);
    });
}

function loadCitiesForProvince() {
    const provinciaSelect = document.getElementById('provincia');
    const cittaSelect = document.getElementById('citta');
    const capSelect = document.getElementById('cap');
    
    const selectedProvincia = provinciaSelect.value;
    
    // Reset campi
    cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
    cittaSelect.disabled = !selectedProvincia;
    
    capSelect.innerHTML = '<option value="">Prima seleziona città</option>';
    capSelect.disabled = true;

    if (!selectedProvincia) return;

    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        cittaSelect.innerHTML = '<option value="">Database non disponibile</option>';
        return;
    }

    const comuni = window.GIDatabase.getComuniByProvincia(selectedProvincia);
    
    if (comuni.length === 0) {
        cittaSelect.innerHTML = '<option value="">Nessuna città trovata</option>';
        return;
    }

    const sortedComuni = comuni.sort((a, b) => {
        const nomeA = a.denominazione_ita || a.denominazione || '';
        const nomeB = b.denominazione_ita || b.denominazione || '';
        return nomeA.localeCompare(nomeB);
    });

    sortedComuni.forEach(comune => {
        const option = document.createElement('option');
        const nomeComune = comune.denominazione_ita || comune.denominazione || comune.nome;
        const codiceIstat = comune.codice_istat || comune.codiceIstat;
        
        option.value = nomeComune;
        option.dataset.codice = codiceIstat;
        option.textContent = nomeComune;
        cittaSelect.appendChild(option);
    });

    cittaSelect.disabled = false;
}

function loadCAPsForCity() {
    const cittaSelect = document.getElementById('citta');
    const capSelect = document.getElementById('cap');
    
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    if (!selectedOption) return;
    
    capSelect.innerHTML = '<option value="">Seleziona CAP...</option>';
    capSelect.disabled = false;

    const codiceComune = selectedOption.dataset.codice;
    if (!codiceComune) return;

    if (window.GIDatabase && window.GIDatabase.isLoaded()) {
        const caps = window.GIDatabase.getCapByComune(codiceComune);
        
        if (caps && caps.length > 0) {
            if (caps.length === 1) {
                capSelect.innerHTML = `<option value="${caps[0]}" selected>${caps[0]}</option>`;
            } else {
                caps.forEach(cap => {
                    const option = document.createElement('option');
                    option.value = cap;
                    option.textContent = cap;
                    capSelect.appendChild(option);
                });
            }
        } else {
            capSelect.innerHTML = '<option value="">Nessun CAP trovato</option>';
        }
    }
}

function loadFallbackProvinces() {
    // Implementazione fallback se necessaria
    console.warn('Usando province di fallback');
}

// ==================== GESTIONE VENUE ====================
function searchVenue() {
    const searchTerm = document.getElementById('descrizioneLocale').value.toLowerCase();
    const dropdown = document.getElementById('venueDropdown');

    if (searchTerm.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    const matches = venuesDB.filter(venue => 
        venue.nome.toLowerCase().includes(searchTerm) ||
        venue.citta.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(venue => `
            <div class="autocomplete-item" onclick="selectVenue(${venue.id})">
                <strong>${venue.nome}</strong><br>
                <small>${venue.citta} - ${venue.provincia}</small>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

function selectVenue(venueId) {
    const venue = venuesDB.find(v => v.id === venueId);
    if (!venue) return;
    
    document.getElementById('descrizioneLocale').value = venue.nome;
    document.getElementById('indirizzo').value = venue.indirizzo;
    document.getElementById('citta').value = venue.citta;
    document.getElementById('cap').value = venue.cap;
    document.getElementById('provincia').value = venue.provincia;
    document.getElementById('venueDropdown').style.display = 'none';
    
    // Carica dati fatturazione associati
    loadInvoiceDataForVenue(venue.nome);
}

function saveVenueIfNew() {
    const venueName = document.getElementById('descrizioneLocale').value;
    const existingVenue = venuesDB.find(v => v.nome.toLowerCase() === venueName.toLowerCase());

    if (!existingVenue) {
        const newVenue = {
            id: Date.now(),
            nome: venueName,
            indirizzo: document.getElementById('indirizzo').value,
            citta: document.getElementById('citta').value,
            cap: document.getElementById('cap').value,
            provincia: document.getElementById('provincia').value
        };
        
        venuesDB.push(newVenue);
        localStorage.setItem('venuesDB', JSON.stringify(venuesDB));
    }
}

// ==================== GESTIONE FATTURAZIONE ====================
function loadInvoiceDataForVenue(venueName) {
    const invoiceData = invoiceDB.find(inv => inv.venueName === venueName);
    
    if (invoiceData) {
        document.getElementById('ragioneSociale').value = invoiceData.ragioneSociale || '';
        document.getElementById('piva').value = invoiceData.piva || '';
        document.getElementById('codiceFiscale').value = invoiceData.codiceFiscale || '';
        document.getElementById('indirizzoFatturazione').value = invoiceData.indirizzo || '';
        document.getElementById('cittaFatturazione').value = invoiceData.citta || '';
        document.getElementById('capFatturazione').value = invoiceData.cap || '';
        document.getElementById('provinciaFatturazione').value = invoiceData.provincia || '';
        document.getElementById('codiceSDI').value = invoiceData.codiceSDI || '';
        document.getElementById('pecFatturazione').value = invoiceData.pec || '';
    } else {
        clearInvoiceFields();
    }
}

function clearInvoiceFields() {
    const fields = ['ragioneSociale', 'piva', 'codiceFiscale', 'indirizzoFatturazione', 
                   'cittaFatturazione', 'capFatturazione', 'provinciaFatturazione', 
                   'codiceSDI', 'pecFatturazione'];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

function saveInvoiceData() {
    const venueName = document.getElementById('descrizioneLocale').value;
    
    const invoiceData = {
        venueName: venueName,
        ragioneSociale: document.getElementById('ragioneSociale').value,
        piva: document.getElementById('piva').value,
        codiceFiscale: document.getElementById('codiceFiscale').value,
        indirizzo: document.getElementById('indirizzoFatturazione').value,
        citta: document.getElementById('cittaFatturazione').value,
        cap: document.getElementById('capFatturazione').value,
        provincia: document.getElementById('provinciaFatturazione').value,
        codiceSDI: document.getElementById('codiceSDI').value,
        pec: document.getElementById('pecFatturazione').value,
        lastUpdated: new Date().toISOString()
    };

    const existingIndex = invoiceDB.findIndex(inv => inv.venueName === venueName);
    
    if (existingIndex !== -1) {
        invoiceDB[existingIndex] = invoiceData;
    } else {
        invoiceDB.push(invoiceData);
    }
    
    localStorage.setItem('invoiceDB', JSON.stringify(invoiceDB));
}

function copyVenueAddress() {
    document.getElementById('indirizzoFatturazione').value = document.getElementById('indirizzo').value;
    document.getElementById('cittaFatturazione').value = document.getElementById('citta').value;
    document.getElementById('capFatturazione').value = document.getElementById('cap').value;
    document.getElementById('provinciaFatturazione').value = document.getElementById('provincia').value;
}

// ==================== GESTIONE RIEPILOGO ====================
function updateSummaries() {
    updateArtistsSummary();
    updateDatesSummary();
    updateLocationSummary();
    updateInvoiceSummary();
}

function updateArtistsSummary() {
    const summaryDiv = document.getElementById('summaryArtists');
    if (!summaryDiv) return;
    
    const artistsHtml = selectedArtists.map(artist => 
        `<p><strong>${artist.nome} ${artist.cognome}</strong> - ${artist.ruolo} - €${artist.compenso.toFixed(2)} - ${getTipoRapportoLabel(artist.tipoRapporto)}</p>`
    ).join('');
    
    summaryDiv.innerHTML = artistsHtml;
}

function updateDatesSummary() {
    const summaryDiv = document.getElementById('summaryDates');
    if (!summaryDiv) return;
    
    const startDate = new Date(document.getElementById('dataInizio').value);
    const endDate = new Date(document.getElementById('dataFine').value);
    
    summaryDiv.innerHTML = `
        <p>Dal: ${startDate.toLocaleDateString('it-IT')}</p>
        <p>Al: ${endDate.toLocaleDateString('it-IT')}</p>
    `;
}

function updateLocationSummary() {
    const summaryDiv = document.getElementById('summaryLocation');
    if (!summaryDiv) return;
    
    summaryDiv.innerHTML = `
        <p><strong>${document.getElementById('descrizioneLocale').value}</strong></p>
        <p>${document.getElementById('indirizzo').value}</p>
        <p>${document.getElementById('cap').value} ${document.getElementById('citta').value} (${document.getElementById('provincia').value})</p>
    `;
}

function updateInvoiceSummary() {
    const summaryDiv = document.getElementById('summaryInvoice');
    if (!summaryDiv) return;
    
    const ragioneSociale = document.getElementById('ragioneSociale').value;
    const piva = document.getElementById('piva').value;
    const codiceSDI = document.getElementById('codiceSDI').value;
    
    summaryDiv.innerHTML = `
        <p><strong>${ragioneSociale || 'Non specificata'}</strong></p>
        <p>P.IVA: ${piva || 'Non specificata'}</p>
        ${codiceSDI ? `<p>Codice SDI: ${codiceSDI}</p>` : ''}
    `;
}

// ==================== GESTIONE TAB ====================
function showTab(tabName) {
    // Rimuovi active da tutti i tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Aggiungi active al tab cliccato
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Nascondi tutti i contenuti
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Mostra il contenuto selezionato
    const tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.classList.add('active');
    }
}

// ==================== GENERAZIONE XML ====================
function generateXML() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;
    const tipo = agibilitaData.isModifica ? 'V' : 'N';
    
    const descrizioneLocale = document.getElementById('descrizioneLocale').value;
    const indirizzo = document.getElementById('indirizzo').value;
    const citta = document.getElementById('citta').value;
    const cap = document.getElementById('cap').value;
    const provincia = document.getElementById('provincia').value;
    
    const codiceComune = getCodiceIstatFromCity();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ImportAgibilita>
    <ElencoAgibilita>
        <Agibilita>
            <Tipo>${tipo}</Tipo>
            <CodiceFiscaleAzienda>04433920248</CodiceFiscaleAzienda>
            <Matricola>9112806447</Matricola>
            <Descrizione>${descrizioneLocale}</Descrizione>
            <Indirizzo>Via Monte Pasubio 222/1</Indirizzo>
            <CodiceComune>M145</CodiceComune>
            <Provincia>VI</Provincia>
            <Cap>36010</Cap>
            <Occupazioni>`;

    selectedArtists.forEach((artist, index) => {
        const codiceQualifica = getQualificaCode(artist.ruolo);
        
        xml += `
                <Occupazione>
                    <Tipo>O</Tipo>
                    <TipoRetribuzione>G</TipoRetribuzione>
                    <Luogo>${citta}</Luogo>
                    <Descrizione>Evento specifico per ${artist.nome}</Descrizione>
                    <Indirizzo>${indirizzo}</Indirizzo>
                    <CodiceComune>${codiceComune}</CodiceComune>
                    <Provincia>${provincia}</Provincia>
                    <Cap>${cap}</Cap>
                    <Periodi>
                        <Periodo>
                            <DataDal>${startDate}</DataDal>
                            <DataAl>${endDate}</DataAl>
                        </Periodo>
                    </Periodi>
                    <Lavoratori>
                        <Lavoratore>
                            <CodiceFiscale>${artist.codiceFiscale}</CodiceFiscale>
                            <MatricolaEnpals>${artist.matricolaEnpals || generateMatricolaEnpals()}</MatricolaEnpals>
                            <Cognome>${artist.cognome.toUpperCase()}</Cognome>
                            <Nome>${artist.nome.toUpperCase()}</Nome>
                            <LegaleRappresentante>NO</LegaleRappresentante>
                            <CodiceQualifica>${codiceQualifica}</CodiceQualifica>
                            <Retribuzione>${formatRetribuzione(artist.compenso)}</Retribuzione>
                        </Lavoratore>
                    </Lavoratori>
                </Occupazione>`;
    });

    xml += `
            </Occupazioni>
        </Agibilita>
    </ElencoAgibilita>
</ImportAgibilita>`;

    return xml;
}

function generateXMLPreview() {
    try {
        const xml = generateXML();
        const validation = validateINPSXML(xml);
        
        let preview = xml.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Colorazione sintassi
        preview = preview.replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span class="xml-tag">$1</span>');
        preview = preview.replace(/(&lt;!\[CDATA\[.*?\]\]&gt;)/g, '<span class="xml-cdata">$1</span>');
        
        const previewDiv = document.getElementById('xmlPreview');
        if (previewDiv) {
            previewDiv.innerHTML = `<pre class="xml-code">${preview}</pre>`;
            
            // Aggiungi status validazione
            const statusDiv = document.createElement('div');
            statusDiv.className = validation.isValid ? 'alert alert-success' : 'alert alert-error';
            statusDiv.innerHTML = validation.isValid 
                ? '✅ XML valido e pronto per l\'invio INPS'
                : `❌ Errori di validazione:<br>${validation.errors.map(error => `• ${error}`).join('<br>')}`;
            
            previewDiv.parentNode.appendChild(statusDiv);
        }
    } catch (error) {
        const previewDiv = document.getElementById('xmlPreview');
        if (previewDiv) {
            previewDiv.innerHTML = `<span class="error-message">Errore nella generazione XML: ${error.message}</span>`;
        }
    }
}

function getCodiceIstatFromCity() {
    const cittaSelect = document.getElementById('citta');
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    
    if (selectedOption && selectedOption.dataset.codice) {
        return selectedOption.dataset.codice;
    }
    
    return 'L736'; // Default Venezia
}

function getQualificaCode(ruolo) {
    const qualificaMap = {
        'DJ': '032',
        'Vocalist': '031',
        'Ballerino/a': '092',
        'Tecnico': '117',
        'Fotografo': '126',
        'Truccatore': '141'
    };
    return qualificaMap[ruolo] || '032';
}

function formatRetribuzione(amount) {
    return parseFloat(amount).toFixed(2).replace('.', ',');
}

function generateMatricolaEnpals() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

// ==================== VALIDAZIONE XML ====================
function validateINPSXML(xmlString) {
    const errors = [];
    
    // Validazioni base
    if (!xmlString.includes('<ImportAgibilita>')) {
        errors.push('Tag principale ImportAgibilita mancante');
    }
    
    if (!xmlString.includes('<ElencoAgibilita>')) {
        errors.push('Tag ElencoAgibilita mancante');
    }
    
    if (!xmlString.includes('<Occupazioni>')) {
        errors.push('Sezione Occupazioni mancante');
    }
    
    // Campi obbligatori
    const requiredFields = [
        'CodiceFiscaleAzienda',
        'Matricola', 
        'Descrizione',
        'CodiceComune',
        'Provincia',
        'Cap'
    ];
    
    requiredFields.forEach(field => {
        if (!xmlString.includes(`<${field}>`)) {
            errors.push(`Campo obbligatorio ${field} mancante`);
        }
    });
    
    // Validazione date
    const datePattern = /\d{4}-\d{2}-\d{2}/;
    if (!datePattern.test(xmlString)) {
        errors.push('Formato date non valido (deve essere YYYY-MM-DD)');
    }
    
    // Validazione codici fiscali
    selectedArtists.forEach(artist => {
        if (!validaCodiceFiscale(artist.codiceFiscale)) {
            errors.push(`Codice fiscale non valido per ${artist.nome} ${artist.cognome}`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function validaCodiceFiscale(cf) {
    const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return regex.test(cf.toUpperCase());
}

// ==================== DOWNLOAD E SALVATAGGIO ====================
function downloadXML(xmlContent) {
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ImportAgibilita_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadAndSave() {
    const xmlContent = generateXML();
    const validation = validateINPSXML(xmlContent);
    
    if (!validation.isValid) {
        alert('Errori di validazione:\n' + validation.errors.join('\n'));
        return;
    }

    downloadXML(xmlContent);
    saveAgibilitaToDatabase(xmlContent);

    // Aggiorna UI
    hideElement('btnConfirm');
    showElement('btnNewAgibilita');

    // Mostra messaggio successo
    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success';
    successMsg.textContent = 'XML scaricato e agibilità salvata con successo!';
    
    const tabInvio = document.getElementById('tabInvio');
    if (tabInvio) {
        tabInvio.insertBefore(successMsg, tabInvio.firstChild);
        setTimeout(() => successMsg.remove(), 5000);
    }
}

function saveAgibilitaToDatabase(xmlContent) {
    const agibilita = {
        id: Date.now(),
        codice: `AG-${new Date().getFullYear()}-${String(agibilitaDB.length + 1).padStart(3, '0')}`,
        dataCreazione: new Date().toISOString(),
        dataInizio: document.getElementById('dataInizio').value,
        dataFine: document.getElementById('dataFine').value,
        locale: {
            descrizione: document.getElementById('descrizioneLocale').value,
            indirizzo: document.getElementById('indirizzo').value,
            citta: document.getElementById('citta').value,
            cap: document.getElementById('cap').value,
            provincia: document.getElementById('provincia').value
        },
        fatturazione: {
            ragioneSociale: document.getElementById('ragioneSociale').value,
            piva: document.getElementById('piva').value,
            codiceFiscale: document.getElementById('codiceFiscale').value,
            codiceSDI: document.getElementById('codiceSDI').value
        },
        artisti: selectedArtists.map(a => ({
            cf: a.codiceFiscale,
            nome: a.nome,
            cognome: a.cognome,
            nomeArte: a.nomeArte,
            ruolo: a.ruolo,
            compenso: a.compenso,
            matricolaEnpals: a.matricolaEnpals,
            tipoRapporto: a.tipoRapporto
        })),
        xml: xmlContent,
        isModifica: agibilitaData.isModifica,
        codiceOriginale: agibilitaData.codiceAgibilita
    };

    agibilitaDB.push(agibilita);
    localStorage.setItem('agibilitaDB', JSON.stringify(agibilitaDB));

    // Aggiorna anche i dati degli artisti
    updateArtistsData(agibilita);
}

function updateArtistsData(agibilita) {
    selectedArtists.forEach(artist => {
        const artistIndex = artistsDB.findIndex(a => a.codiceFiscale === artist.codiceFiscale);
        if (artistIndex !== -1) {
            if (!artistsDB[artistIndex].agibilita) {
                artistsDB[artistIndex].agibilita = [];
            }
            
            artistsDB[artistIndex].agibilita.push({
                data: `${agibilita.dataInizio} - ${agibilita.dataFine}`,
                locale: agibilita.locale.descrizione,
                compenso: `€${artist.compenso.toFixed(2)}`,
                note: artist.ruolo
            });
            
            if (!artistsDB[artistIndex].matricolaENPALS && artist.matricolaEnpals) {
                artistsDB[artistIndex].matricolaENPALS = artist.matricolaEnpals;
            }
        }
    });
    
    localStorage.setItem('artistsDB', JSON.stringify(artistsDB));
}

function confirmAndProceed() {
    downloadAndSave();
}

function newAgibilita() {
    clearAllForms();
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    selectedArtists = [];

    showElement('btnConfirm');
    hideElement('btnNewAgibilita');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;

    showSection('tipoSection');
}

function saveDraft() {
    alert('Funzionalità bozza in sviluppo');
}

// ==================== GESTIONE AGIBILITÀ ESISTENTI ====================
function showExistingAgibilita() {
    const listDiv = document.getElementById('agibilitaList');
    if (!listDiv) return;

    if (agibilitaDB.length === 0) {
        listDiv.innerHTML = '<p class="no-data-message">Nessuna agibilità trovata</p>';
        return;
    }

    const agibilitaHTML = agibilitaDB.map(agibilita => {
        const totalCompensation = agibilita.artisti.reduce((sum, a) => sum + (a.compenso || 0), 0);
        const artistsList = agibilita.artisti.map(a => 
            `${a.nome} ${a.cognome} (${a.ruolo})`
        ).join(', ');

        return `
            <div class="agibilita-item">
                <div class="agibilita-info">
                    <div class="agibilita-code">[${agibilita.codice}]</div>
                    <div class="agibilita-dates">${agibilita.dataInizio} - ${agibilita.dataFine}</div>
                    <div class="agibilita-location">${agibilita.locale.descrizione} - ${agibilita.locale.citta}</div>
                    <div class="agibilita-artists">Artisti: ${artistsList} - Totale: €${totalCompensation.toFixed(2)}</div>
                </div>
                <div class="agibilita-actions">
                    <button class="btn btn-primary btn-sm" onclick="editAgibilita('${agibilita.codice}')">📝 Modifica</button>
                    <button class="btn btn-success btn-sm" onclick="duplicateAgibilita('${agibilita.codice}')">📋 Duplica</button>
                    <button class="btn btn-danger btn-sm" onclick="cancelAgibilita('${agibilita.codice}')">❌ Annulla</button>
                </div>
            </div>
        `;
    }).join('');

    listDiv.innerHTML = agibilitaHTML;
}

function filterAgibilita() {
    const searchTerm = document.getElementById('searchAgibilita').value.toLowerCase();
    const items = document.querySelectorAll('.agibilita-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function editAgibilita(codice) {
    const agibilita = agibilitaDB.find(a => a.codice === codice);
    if (!agibilita) return;

    agibilitaData.isModifica = true;
    agibilitaData.codiceAgibilita = codice;

    // Carica artisti
    selectedArtists = [];
    agibilita.artisti.forEach(artData => {
        const artist = artistsDB.find(a => a.codiceFiscale === artData.cf);
        if (artist) {
            selectedArtists.push({
                ...artist,
                ruolo: artData.ruolo,
                compenso: artData.compenso,
                tipoRapporto: artData.tipoRapporto || determineTipoRapporto(artist),
                matricolaEnpals: artData.matricolaEnpals
            });
        }
    });

    // Carica dati form
    document.getElementById('dataInizio').value = agibilita.dataInizio;
    document.getElementById('dataFine').value = agibilita.dataFine;
    document.getElementById('descrizioneLocale').value = agibilita.locale.descrizione;
    document.getElementById('indirizzo').value = agibilita.locale.indirizzo;
    document.getElementById('citta').value = agibilita.locale.citta;
    document.getElementById('cap').value = agibilita.locale.cap;
    document.getElementById('provincia').value = agibilita.locale.provincia;

    // Carica dati fatturazione se presenti
    if (agibilita.fatturazione) {
        document.getElementById('ragioneSociale').value = agibilita.fatturazione.ragioneSociale || '';
        document.getElementById('piva').value = agibilita.fatturazione.piva || '';
        document.getElementById('codiceFiscale').value = agibilita.fatturazione.codiceFiscale || '';
        document.getElementById('codiceSDI').value = agibilita.fatturazione.codiceSDI || '';
    }

    updateArtistsList();
    hideElement('editListSection');
    showSection('step1');
}

function duplicateAgibilita(codice) {
    const agibilita = agibilitaDB.find(a => a.codice === codice);
    if (!agibilita) return;

    // Carica come nuova agibilità
    editAgibilita(codice);
    
    // Reset per nuova agibilità
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    
    // Reset date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataFine').value = '';
}

function cancelAgibilita(codice) {
    if (!confirm(`Sei sicuro di voler annullare l'agibilità ${codice}?`)) return;
    
    const index = agibilitaDB.findIndex(a => a.codice === codice);
    if (index !== -1) {
        agibilitaDB.splice(index, 1);
        localStorage.setItem('agibilitaDB', JSON.stringify(agibilitaDB));
        
        showExistingAgibilita();
        
        // Mostra messaggio successo
        const msg = document.createElement('div');
        msg.className = 'alert alert-success';
        msg.textContent = `Agibilità ${codice} annullata con successo`;
        
        const listDiv = document.getElementById('agibilitaList');
        if (listDiv) {
            listDiv.insertBefore(msg, listDiv.firstChild);
            setTimeout(() => msg.remove(), 3000);
        }
    }
}

// ==================== FUNZIONI UTILITÀ ====================
function clearAllForms() {
    selectedArtists = [];
    updateArtistsList();

    // Reset date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataFine').value = '';

    // Reset locale
    const localeFields = ['descrizioneLocale', 'indirizzo', 'citta', 'cap', 'provincia', 'noteLocale'];
    localeFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });

    // Reset fatturazione
    clearInvoiceFields();

    // Reset UI
    hideElement('editListSection');
    hideElement('dateInfo');
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'block';
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'none';
}

function handleModalClick(event) {
    const modal = document.getElementById('addArtistModal');
    if (event.target === modal) {
        closeModal();
    }
    
    // Chiudi dropdown venue se click fuori
    if (!event.target.matches('#descrizioneLocale')) {
        const dropdown = document.getElementById('venueDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
}
