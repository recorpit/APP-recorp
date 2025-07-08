// agibilita.js - Sistema Gestione Agibilità RECORP - VERSIONE CORRETTA

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

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inizializzazione sistema agibilità...');
    
    // Carica database
    try {
        artistsDB = JSON.parse(localStorage.getItem('artistsDB')) || [];
        agibilitaDB = JSON.parse(localStorage.getItem('agibilitaDB')) || [];
        venuesDB = JSON.parse(localStorage.getItem('venuesDB')) || [];
        invoiceDB = JSON.parse(localStorage.getItem('invoiceDB')) || [];
        console.log('Database caricati:', {
            artisti: artistsDB.length,
            agibilita: agibilitaDB.length,
            venues: venuesDB.length
        });
    } catch (error) {
        console.error('Errore caricamento database:', error);
    }

    // Inizializza date
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

    // Inizializza località - IDENTICO A REGISTRAZIONE
    console.log('Database GI inizializzato per agibilità');
    
    // Aspetta che il database sia caricato - COME IN REGISTRAZIONE
    setTimeout(() => {
        loadProvinces();
        setupEventListeners();
        
        // Focus sul primo campo
        const descrizioneLocale = document.getElementById('descrizioneLocale');
        if (descrizioneLocale) descrizioneLocale.focus();
    }, 1500);
});

// ==================== FUNZIONI NAVIGAZIONE ====================
function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function startNewAgibilita() {
    console.log('Starting new agibilità');
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    selectedArtists = [];
    clearAllForms();
    showSection('step1');
}

function showEditAgibilita() {
    console.log('Showing edit agibilità');
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

    saveVenueIfNew();
    saveInvoiceData();
    updateSummaries();
    generateXMLPreview();
    showSection('step3');
}

// ==================== GESTIONE ARTISTI ====================
function showAddArtistModal() {
    console.log('Opening artist modal');
    const modal = document.getElementById('addArtistModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('artistSearch').value = '';
        document.getElementById('searchResults').innerHTML = '';
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
            <div class="search-result" onclick="addArtistToList('${artist.id}')" style="cursor: pointer;">
                <strong>${artist.nome} ${artist.cognome}${artist.nomeArte ? ' - ' + artist.nomeArte : ''}</strong><br>
                <small>CF: ${artist.codiceFiscale} | ${artist.mansione || 'Non specificata'}</small>
                <small style="display: block; color: #666;">ID: ${artist.id}</small>
            </div>
        `).join('');
    }
}

function addArtistToList(artistId) {
    console.log('Adding artist:', artistId);
    console.log('Available artists:', artistsDB.map(a => ({ id: a.id, nome: a.nome, cognome: a.cognome })));
    
    // Prova prima con ID come stringa, poi come numero
    let artist = artistsDB.find(a => a.id === artistId);
    if (!artist) {
        artist = artistsDB.find(a => a.id === parseInt(artistId));
    }
    if (!artist) {
        artist = artistsDB.find(a => a.id === artistId.toString());
    }
    
    if (!artist) {
        console.error('Artist not found. Searched ID:', artistId, 'Type:', typeof artistId);
        console.error('Available IDs:', artistsDB.map(a => ({ id: a.id, type: typeof a.id })));
        alert('Artista non trovato nel database');
        return;
    }

    const existingIndex = selectedArtists.findIndex(a => a.codiceFiscale === artist.codiceFiscale);
    if (existingIndex !== -1) {
        alert('Questo artista è già stato aggiunto!');
        return;
    }

    const tipoRapporto = determineTipoRapporto(artist);

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
        document.getElementById('summaryBox').style.display = 'none';
        document.getElementById('btnNext1').style.display = 'none';
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
                        <option value="DJ" ${artist.ruolo === 'DJ' ? 'selected' : ''}>DJ (032)</option>
                        <option value="Vocalist" ${artist.ruolo === 'Vocalist' ? 'selected' : ''}>Vocalist (031)</option>
                        <option value="Musicista" ${artist.ruolo === 'Musicista' ? 'selected' : ''}>Musicista (030)</option>
                        <option value="Cantante" ${artist.ruolo === 'Cantante' ? 'selected' : ''}>Cantante (033)</option>
                        <option value="Ballerino/a" ${artist.ruolo === 'Ballerino/a' ? 'selected' : ''}>Ballerino/a (092)</option>
                        <option value="Performer" ${artist.ruolo === 'Performer' ? 'selected' : ''}>Performer (090)</option>
                        <option value="Animatore" ${artist.ruolo === 'Animatore' ? 'selected' : ''}>Animatore (091)</option>
                        <option value="Tecnico Audio" ${artist.ruolo === 'Tecnico Audio' ? 'selected' : ''}>Tecnico Audio (117)</option>
                        <option value="Tecnico Luci" ${artist.ruolo === 'Tecnico Luci' ? 'selected' : ''}>Tecnico Luci (118)</option>
                        <option value="Fotografo" ${artist.ruolo === 'Fotografo' ? 'selected' : ''}>Fotografo (126)</option>
                        <option value="Videomaker" ${artist.ruolo === 'Videomaker' ? 'selected' : ''}>Videomaker (127)</option>
                        <option value="Truccatore" ${artist.ruolo === 'Truccatore' ? 'selected' : ''}>Truccatore (141)</option>
                        <option value="Costumista" ${artist.ruolo === 'Costumista' ? 'selected' : ''}>Costumista (142)</option>
                        <option value="Scenografo" ${artist.ruolo === 'Scenografo' ? 'selected' : ''}>Scenografo (150)</option>
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

        document.getElementById('summaryBox').style.display = 'block';
        updateTotalCompensation();
        checkCanProceed();
    }
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
    document.getElementById('totalArtists').textContent = selectedArtists.length;
    document.getElementById('totalCompensation').textContent = total.toFixed(2);
}

function checkCanProceed() {
    const canProceed = selectedArtists.length > 0 && 
        selectedArtists.every(a => a.ruolo && a.compenso > 0);
    
    document.getElementById('btnNext1').style.display = canProceed ? 'inline-block' : 'none';
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

// ==================== GESTIONE LOCALITÀ (IDENTICA A REGISTRAZIONE) ====================
function loadProvinces() {
    try {
        const provinceSelect = document.getElementById('provincia');
        if (!provinceSelect) return;
        
        provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        // Usa la funzione helper dal comuni-loader - IDENTICO A REGISTRAZIONE
        const province = window.GIDatabase.getProvince();
        
        if (province.length === 0) {
            console.error('❌ Nessuna provincia trovata nel database');
            provinceSelect.innerHTML = '<option value="">Errore: nessuna provincia disponibile</option>';
            showError('Impossibile caricare le province. Verificare i file di database.');
            return;
        }
        
        console.log(`✅ Caricate ${province.length} province dal database`);
        
        // Ordina le province per sigla - IDENTICO A REGISTRAZIONE
        province.sort((a, b) => {
            if (!a.sigla || !b.sigla) return 0;
            return a.sigla.localeCompare(b.sigla);
        });
        
        // Popola il select - IDENTICO A REGISTRAZIONE
        province.forEach(p => {
            const option = document.createElement('option');
            option.value = p.sigla;
            option.textContent = `${p.sigla} - ${p.nome}`;
            provinceSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Errore caricamento province:', error);
        const provinceSelect = document.getElementById('provincia');
        if (provinceSelect) {
            provinceSelect.innerHTML = '<option value="">Errore caricamento province</option>';
        }
        showError('Errore nel caricamento delle province.');
    }
}

function loadCitta(provincia) {
    const cittaSelect = document.getElementById('citta');
    if (!cittaSelect) return;
    
    cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
    
    try {
        // IDENTICO A REGISTRAZIONE
        const comuni = window.GIDatabase.getComuniByProvincia(provincia);
        console.log(`🔍 Debug per provincia ${provincia}:`, {
            totalComuni: window.GIDatabase?.getData()?.comuni?.length || 0,
            comuniTrovati: comuni.length,
            primoComune: comuni[0] || 'nessuno'
        });
        
        if (comuni.length === 0) {
            console.warn(`Nessun comune trovato per provincia ${provincia}`);
            cittaSelect.innerHTML = '<option value="">Nessuna città trovata</option>';
            return;
        }
        
        // Ordina i comuni alfabeticamente - IDENTICO A REGISTRAZIONE
        comuni.sort((a, b) => {
            const nomeA = a.denominazione_ita || a.denominazione || a.nome || '';
            const nomeB = b.denominazione_ita || b.denominazione || b.nome || '';
            return nomeA.localeCompare(nomeB);
        });
        
        // Popola il select - IDENTICO A REGISTRAZIONE
        comuni.forEach(comune => {
            const option = document.createElement('option');
            option.value = comune.codice_istat || comune.codiceIstat || comune.codice;
            option.textContent = comune.denominazione_ita || comune.denominazione || comune.nome;
            option.setAttribute('data-comune', JSON.stringify(comune));
            cittaSelect.appendChild(option);
        });
        
        console.log(`✅ Caricate ${comuni.length} città per ${provincia}`);
        
    } catch (error) {
        console.error('Errore caricamento città:', error);
        cittaSelect.innerHTML = '<option value="">Errore caricamento città</option>';
    }
}

function loadCAP(codiceIstat) {
    const capSelect = document.getElementById('cap');
    if (!capSelect) return;
    
    capSelect.innerHTML = '<option value="">Caricamento CAP...</option>';
    
    try {
        // IDENTICO A REGISTRAZIONE
        const capList = window.GIDatabase.getCapByComune(codiceIstat);
        
        console.log(`📮 CAP trovati per ${codiceIstat}:`, capList);
        
        if (capList.length === 0) {
            // Prova a recuperare il CAP dai dati del comune - IDENTICO A REGISTRAZIONE
            const selectedOption = document.querySelector(`#citta option[value="${codiceIstat}"]`);
            if (selectedOption) {
                const comuneData = JSON.parse(selectedOption.getAttribute('data-comune'));
                if (comuneData.cap) {
                    console.log('📮 Uso CAP di fallback dal comune:', comuneData.cap);
                    capList.push(comuneData.cap);
                }
            }
        }
        
        if (capList.length === 0) {
            capSelect.innerHTML = '<option value="">CAP non trovato</option>';
            return;
        }
        
        // Popola la select con i CAP trovati - IDENTICO A REGISTRAZIONE
        capSelect.innerHTML = '<option value="">Seleziona CAP...</option>';
        
        // Se c'è un solo CAP, selezionalo automaticamente
        if (capList.length === 1) {
            const option = document.createElement('option');
            option.value = capList[0];
            option.textContent = capList[0];
            option.selected = true;
            capSelect.appendChild(option);
        } else {
            // Altrimenti mostra tutti i CAP disponibili
            capList.forEach(cap => {
                const option = document.createElement('option');
                option.value = cap;
                option.textContent = cap;
                capSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Errore in loadCAP:', error);
        capSelect.innerHTML = '<option value="">Errore caricamento CAP</option>';
    }
}

// Funzioni helper - IDENTICHE A REGISTRAZIONE
function showError(message) {
    console.error('⚠️ Errore:', message);
    // Mostra alert o notifica errore
    alert(message);
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
            <div class="autocomplete-item" onclick="selectVenue('${venue.nome}', '${venue.indirizzo}', '${venue.cittaCodice}', '${venue.cap}', '${venue.provincia}')">
                <strong>${venue.nome}</strong><br>
                <small>${venue.cittaNome} - ${venue.provincia}</small>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

function selectVenue(nome, indirizzo, cittaCodice, cap, provincia) {
    document.getElementById('descrizioneLocale').value = nome;
    document.getElementById('indirizzo').value = indirizzo;
    
    // Seleziona provincia prima
    document.getElementById('provincia').value = provincia;
    
    // Carica città per quella provincia - USA NUOVA FUNZIONE
    loadCitta(provincia);
    
    // Aspetta che le città siano caricate, poi seleziona
    setTimeout(() => {
        document.getElementById('citta').value = cittaCodice;
        loadCAP(cittaCodice);
        
        // Aspetta che i CAP siano caricati, poi seleziona
        setTimeout(() => {
            document.getElementById('cap').value = cap;
        }, 100);
    }, 100);
    
    document.getElementById('venueDropdown').style.display = 'none';
    
    loadInvoiceDataForVenue(nome);
}

function saveVenueIfNew() {
    const venueName = document.getElementById('descrizioneLocale').value;
    const existingVenue = venuesDB.find(v => v.nome.toLowerCase() === venueName.toLowerCase());

    if (!existingVenue) {
        // Ottieni il nome della città dal testo dell'option selezionata
        const cittaSelect = document.getElementById('citta');
        const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
        const cittaNome = selectedOption ? selectedOption.textContent : '';
        
        const newVenue = {
            id: Date.now(),
            nome: venueName,
            indirizzo: document.getElementById('indirizzo').value,
            cittaCodice: document.getElementById('citta').value, // Codice ISTAT
            cittaNome: cittaNome, // Nome per display
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
    
    // Copia anche città dal nome dell'option selezionata
    const cittaSelect = document.getElementById('citta');
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    if (selectedOption) {
        document.getElementById('cittaFatturazione').value = selectedOption.textContent;
    }
    
    document.getElementById('capFatturazione').value = document.getElementById('cap').value;
    document.getElementById('provinciaFatturazione').value = document.getElementById('provincia').value;
}

// ==================== GESTIONE RIEPILOGO ====================
function updateSummaries() {
    // Artisti
    const summaryArtists = document.getElementById('summaryArtists');
    if (summaryArtists) {
        summaryArtists.innerHTML = selectedArtists.map(artist => 
            `<p><strong>${artist.nome} ${artist.cognome}</strong> - ${artist.ruolo} - €${artist.compenso.toFixed(2)} - ${getTipoRapportoLabel(artist.tipoRapporto)}</p>`
        ).join('');
    }

    // Date
    const summaryDates = document.getElementById('summaryDates');
    if (summaryDates) {
        const startDate = new Date(document.getElementById('dataInizio').value);
        const endDate = new Date(document.getElementById('dataFine').value);
        summaryDates.innerHTML = `
            <p>Dal: ${startDate.toLocaleDateString('it-IT')}</p>
            <p>Al: ${endDate.toLocaleDateString('it-IT')}</p>
        `;
    }

    // Luogo
    const summaryLocation = document.getElementById('summaryLocation');
    if (summaryLocation) {
        // Ottieni il nome della città dal testo dell'option
        const cittaSelect = document.getElementById('citta');
        const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
        const cittaNome = selectedOption ? selectedOption.textContent : '';
        
        summaryLocation.innerHTML = `
            <p><strong>${document.getElementById('descrizioneLocale').value}</strong></p>
            <p>${document.getElementById('indirizzo').value}</p>
            <p>${document.getElementById('cap').value} ${cittaNome} (${document.getElementById('provincia').value})</p>
        `;
    }

    // Fatturazione
    const summaryInvoice = document.getElementById('summaryInvoice');
    if (summaryInvoice) {
        const ragioneSociale = document.getElementById('ragioneSociale').value;
        const piva = document.getElementById('piva').value;
        summaryInvoice.innerHTML = `
            <p><strong>${ragioneSociale || 'Non specificata'}</strong></p>
            <p>P.IVA: ${piva || 'Non specificata'}</p>
        `;
    }
}

// ==================== GESTIONE TAB ====================
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.classList.add('active');
    }
}

// ==================== NUOVA FUNZIONE: Determina se un artista è legale rappresentante ====================
function isLegalRepresentative(artist) {
    // Lista dei legali rappresentanti
    const legalRepresentatives = [
        { nome: 'OSCAR', cognome: 'ZALTRON' },
        { nome: 'CRISTIANO', cognome: 'TOMASI' }
    ];
    
    return legalRepresentatives.some(rep => 
        artist.nome.toUpperCase() === rep.nome && 
        artist.cognome.toUpperCase() === rep.cognome
    );
}

// ==================== GENERAZIONE XML CORRETTA ====================
function generateXML() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;
    const tipo = agibilitaData.isModifica ? 'V' : 'N';
    
    const descrizioneLocale = document.getElementById('descrizioneLocale').value;
    const indirizzo = document.getElementById('indirizzo').value;
    const cap = document.getElementById('cap').value;
    const provincia = document.getElementById('provincia').value;
    
    // Ottieni codice Belfiore e nome città
    const codiceComune = getCodicebelfioreFromCity();
    const cittaSelect = document.getElementById('citta');
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    const cittaNome = selectedOption ? selectedOption.textContent : '';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ImportAgibilita>
    <ElencoAgibilita>
        <Agibilita>`;

    // CORREZIONE 1: Aggiungi IdentificativoAgibilita per modifiche
    if (agibilitaData.isModifica && agibilitaData.codiceAgibilita) {
        const agibilita = agibilitaDB.find(a => a.codice === agibilitaData.codiceAgibilita);
        if (agibilita && agibilita.identificativoINPS) {
            xml += `
            <IdentificativoAgibilita>${agibilita.identificativoINPS}</IdentificativoAgibilita>`;
        }
    }

    xml += `
            <Tipo>${tipo}</Tipo>
            <CodiceFiscaleAzienda>04433920248</CodiceFiscaleAzienda>
            <Matricola>9112806447</Matricola>
            <Descrizione>${descrizioneLocale}</Descrizione>
            <Indirizzo>Via Monte Pasubio 222/1</Indirizzo>
            <CodiceComune>M145</CodiceComune>
            <Provincia>VI</Provincia>
            <Cap>36010</Cap>
            <Occupazioni>
                <Occupazione>
                    <Tipo>O</Tipo>
                    <TipoRetribuzione>G</TipoRetribuzione>
                    <Luogo>${cittaNome}</Luogo>
                    <Descrizione>${descrizioneLocale}</Descrizione>
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
                    <Lavoratori>`;

    // CORREZIONE: tutti gli artisti nella STESSA occupazione con legale rappresentante corretto
    selectedArtists.forEach(artist => {
        const codiceQualifica = getQualificaCode(artist.ruolo);
        
        // CORREZIONE 2: Determina se è legale rappresentante
        const isLegaleRappresentante = isLegalRepresentative(artist);
        
        xml += `
                        <Lavoratore>
                            <CodiceFiscale>${artist.codiceFiscale}</CodiceFiscale>
                            <MatricolaEnpals>${artist.matricolaEnpals || generateMatricolaEnpals()}</MatricolaEnpals>
                            <Cognome>${artist.cognome.toUpperCase()}</Cognome>
                            <Nome>${artist.nome.toUpperCase()}</Nome>
                            <LegaleRappresentante>${isLegaleRappresentante ? 'SI' : 'NO'}</LegaleRappresentante>
                            <CodiceQualifica>${codiceQualifica}</CodiceQualifica>
                            <Retribuzione>${formatRetribuzione(artist.compenso)}</Retribuzione>
                        </Lavoratore>`;
    });

    xml += `
                    </Lavoratori>
                </Occupazione>
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
        preview = preview.replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span class="xml-tag">$1</span>');
        
        const previewDiv = document.getElementById('xmlPreview');
        if (previewDiv) {
            previewDiv.innerHTML = `<pre class="xml-code">${preview}</pre>`;
            
            const statusDiv = document.createElement('div');
            statusDiv.className = validation.isValid ? 'alert alert-success' : 'alert alert-error';
            statusDiv.innerHTML = validation.isValid 
                ? '✅ XML valido e pronto per l\'invio INPS'
                : `❌ Errori di validazione:<br>${validation.errors.map(error => `• ${error}`).join('<br>')}`;
            
            previewDiv.parentNode.appendChild(statusDiv);
        }
    } catch (error) {
        console.error('Errore generazione XML:', error);
    }
}

function getCodicebelfioreFromCity() {
    const cittaSelect = document.getElementById('citta');
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    
    if (selectedOption && selectedOption.getAttribute('data-comune')) {
        try {
            const comuneData = JSON.parse(selectedOption.getAttribute('data-comune'));
            // Cerca il codice Belfiore nei vari campi possibili
            return comuneData.codice_belfiore || 
                   comuneData.codiceBelfiore || 
                   comuneData.belfiore || 
                   comuneData.codice_catastale ||
                   'L736'; // Default Venezia
        } catch (error) {
            console.error('Errore parsing dati comune:', error);
            return 'L736';
        }
    }
    
    return 'L736'; // Default Venezia
}

function getQualificaCode(ruolo) {
    const qualificaMap = {
        'DJ': '032',
        'Vocalist': '031',
        'Musicista': '030',
        'Cantante': '033',
        'Ballerino/a': '092',
        'Performer': '090',
        'Animatore': '091',
        'Tecnico Audio': '117',
        'Tecnico Luci': '118',
        'Fotografo': '126',
        'Videomaker': '127',
        'Truccatore': '141',
        'Costumista': '142',
        'Scenografo': '150'
    };
    return qualificaMap[ruolo] || '032';
}

function formatRetribuzione(amount) {
    return parseFloat(amount).toFixed(2).replace('.', ',');
}

function generateMatricolaEnpals() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

function validateINPSXML(xmlString) {
    const errors = [];
    
    if (!xmlString.includes('<ImportAgibilita>')) {
        errors.push('Tag principale ImportAgibilita mancante');
    }
    
    if (!xmlString.includes('<ElencoAgibilita>')) {
        errors.push('Tag ElencoAgibilita mancante');
    }
    
    const requiredFields = ['CodiceFiscaleAzienda', 'Matricola', 'Descrizione', 'CodiceComune', 'Provincia', 'Cap'];
    
    requiredFields.forEach(field => {
        if (!xmlString.includes(`<${field}>`)) {
            errors.push(`Campo obbligatorio ${field} mancante`);
        }
    });
    
    // Verifica TipoRetribuzione sempre "G"
    if (!xmlString.includes('<TipoRetribuzione>G</TipoRetribuzione>')) {
        errors.push('TipoRetribuzione deve essere "G" (Giornaliera)');
    }
    
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

    document.getElementById('btnConfirm').style.display = 'none';
    document.getElementById('btnNewAgibilita').style.display = 'inline-block';

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
    // Ottieni il nome della città dal testo dell'option
    const cittaSelect = document.getElementById('citta');
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    const cittaNome = selectedOption ? selectedOption.textContent : '';
    
    const agibilita = {
        id: Date.now(),
        codice: `AG-${new Date().getFullYear()}-${String(agibilitaDB.length + 1).padStart(3, '0')}`,
        dataCreazione: new Date().toISOString(),
        dataInizio: document.getElementById('dataInizio').value,
        dataFine: document.getElementById('dataFine').value,
        locale: {
            descrizione: document.getElementById('descrizioneLocale').value,
            indirizzo: document.getElementById('indirizzo').value,
            cittaCodice: document.getElementById('citta').value, // Codice ISTAT
            cittaNome: cittaNome, // Nome per display
            cap: document.getElementById('cap').value,
            provincia: document.getElementById('provincia').value,
            codiceComune: getCodicebelfioreFromCity() // Codice Belfiore per INPS
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
        codiceOriginale: agibilitaData.codiceAgibilita,
        // AGGIUNTO: campo per salvare l'ID INPS per future modifiche
        identificativoINPS: null // Da aggiornare manualmente quando si riceve risposta INPS
    };

    agibilitaDB.push(agibilita);
    localStorage.setItem('agibilitaDB', JSON.stringify(agibilitaDB));

    // Aggiorna dati artisti
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

    document.getElementById('btnConfirm').style.display = 'inline-block';
    document.getElementById('btnNewAgibilita').style.display = 'none';

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

        // Usa cittaNome se disponibile, altrimenti fallback
        const cittaDisplay = agibilita.locale.cittaNome || agibilita.locale.citta || 'Città non specificata';

        return `
            <div class="agibilita-item">
                <div class="agibilita-info">
                    <div class="agibilita-code">[${agibilita.codice}]</div>
                    <div class="agibilita-dates">${agibilita.dataInizio} - ${agibilita.dataFine}</div>
                    <div class="agibilita-location">${agibilita.locale.descrizione} - ${cittaDisplay}</div>
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

    document.getElementById('dataInizio').value = agibilita.dataInizio;
    document.getElementById('dataFine').value = agibilita.dataFine;
    document.getElementById('descrizioneLocale').value = agibilita.locale.descrizione;
    document.getElementById('indirizzo').value = agibilita.locale.indirizzo;
    
    // Ripristina provincia, città e CAP - USA NUOVE FUNZIONI
    document.getElementById('provincia').value = agibilita.locale.provincia;
    loadCitta(agibilita.locale.provincia);
    
    setTimeout(() => {
        document.getElementById('citta').value = agibilita.locale.cittaCodice || agibilita.locale.citta;
        loadCAP(agibilita.locale.cittaCodice || agibilita.locale.citta);
        
        setTimeout(() => {
            document.getElementById('cap').value = agibilita.locale.cap;
        }, 100);
    }, 100);

    if (agibilita.fatturazione) {
        document.getElementById('ragioneSociale').value = agibilita.fatturazione.ragioneSociale || '';
        document.getElementById('piva').value = agibilita.fatturazione.piva || '';
        document.getElementById('codiceFiscale').value = agibilita.fatturazione.codiceFiscale || '';
        document.getElementById('codiceSDI').value = agibilita.fatturazione.codiceSDI || '';
    }

    updateArtistsList();
    document.getElementById('editListSection').style.display = 'none';
    showSection('step1');
}

function duplicateAgibilita(codice) {
    const agibilita = agibilitaDB.find(a => a.codice === codice);
    if (!agibilita) return;

    editAgibilita(codice);
    
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    
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

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataFine').value = '';

    const fields = ['descrizioneLocale', 'indirizzo', 'citta', 'cap', 'provincia', 'noteLocale'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });

    clearInvoiceFields();

    document.getElementById('editListSection').style.display = 'none';
    const dateInfo = document.getElementById('dateInfo');
    if (dateInfo) dateInfo.style.display = 'none';
    
    // Reset dropdowns
    document.getElementById('citta').disabled = true;
    document.getElementById('cap').disabled = true;
    document.getElementById('citta').innerHTML = '<option value="">Prima seleziona la provincia</option>';
    document.getElementById('cap').innerHTML = '<option value="">Prima seleziona la città</option>';
}

function setupEventListeners() {
    // Date validation
    const dataInizio = document.getElementById('dataInizio');
    if (dataInizio) dataInizio.addEventListener('change', validateDates);
    
    const dataFine = document.getElementById('dataFine');
    if (dataFine) dataFine.addEventListener('change', validateDates);

    // Venue search
    const descrizioneLocale = document.getElementById('descrizioneLocale');
    if (descrizioneLocale) {
        descrizioneLocale.addEventListener('input', searchVenue);
    }

    // Location dropdowns - IDENTICI A REGISTRAZIONE
    const provincia = document.getElementById('provincia');
    if (provincia) {
        provincia.addEventListener('change', function() {
            const selectedProvincia = this.value;
            const cittaSelect = document.getElementById('citta');
            const capSelect = document.getElementById('cap');
            
            if (selectedProvincia) {
                cittaSelect.disabled = false;
                loadCitta(selectedProvincia); // ← USA STESSA FUNZIONE REGISTRAZIONE
            } else {
                cittaSelect.disabled = true;
                cittaSelect.innerHTML = '<option value="">Prima seleziona la provincia</option>';
                capSelect.disabled = true;
                capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
            }
        });
    }
    
    const citta = document.getElementById('citta');
    if (citta) {
        citta.addEventListener('change', function() {
            const selectedCitta = this.value;
            const capSelect = document.getElementById('cap');
            
            if (selectedCitta) {
                capSelect.disabled = false;
                loadCAP(selectedCitta); // ← USA STESSA FUNZIONE REGISTRAZIONE
            } else {
                capSelect.disabled = true;
                capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
            }
        });
    }

    // Modal close on outside click
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('addArtistModal');
        if (event.target === modal) {
            closeModal();
        }
        
        if (!event.target.matches('#descrizioneLocale')) {
            const dropdown = document.getElementById('venueDropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    });
}

// ==================== ESPORTA FUNZIONI GLOBALI ====================
// Rendi le funzioni accessibili dall'HTML
window.startNewAgibilita = startNewAgibilita;
window.showEditAgibilita = showEditAgibilita;
window.showAddArtistModal = showAddArtistModal;
window.closeModal = closeModal;
window.searchArtists = searchArtists;
window.addArtistToList = addArtistToList;
window.updateArtistRole = updateArtistRole;
window.updateArtistCompensation = updateArtistCompensation;
window.removeArtist = removeArtist;
window.goToRegistration = goToRegistration;
window.goToStep2 = goToStep2;
window.goToStep3 = goToStep3;
window.showSection = showSection;
window.validateDates = validateDates;
window.loadCitta = loadCitta; // ← CORRETTO
window.loadCAP = loadCAP; // ← CORRETTO  
window.searchVenue = searchVenue;
window.selectVenue = selectVenue;
window.copyVenueAddress = copyVenueAddress;
window.showTab = showTab;
window.downloadAndSave = downloadAndSave;
window.confirmAndProceed = confirmAndProceed;
window.newAgibilita = newAgibilita;
window.saveDraft = saveDraft;
window.filterAgibilita = filterAgibilita;
window.editAgibilita = editAgibilita;
window.duplicateAgibilita = duplicateAgibilita;
window.cancelAgibilita = cancelAgibilita;
window.isLegalRepresentative = isLegalRepresentative; // ← AGGIUNTO per debug

console.log('agibilita.js CORRETTO caricato completamente');
