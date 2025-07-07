// agibilita.js - Sistema Gestione Agibilità RECORP con Database GI

// Variabili globali
let selectedArtists = [];
let agibilitaData = {
    isModifica: false,
    codiceAgibilita: null
};

// Carica database dal localStorage
let artistsDB = [];
let agibilitaDB = [];
let venuesDB = [];

try {
    artistsDB = JSON.parse(localStorage.getItem('artistsDB')) || [];
    agibilitaDB = JSON.parse(localStorage.getItem('agibilitaDB')) || [];
    venuesDB = JSON.parse(localStorage.getItem('venuesDB')) || [];
} catch (error) {
    console.error('Errore caricamento database:', error);
    artistsDB = [];
    agibilitaDB = [];
    venuesDB = [];
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza database GI per primi
    if (typeof window.GIDatabase !== 'undefined') {
        window.GIDatabase.init().then(() => {
            console.log('✅ Database GI inizializzato, setup autocomplete...');
            setupLocationAutocomplete();
        });
    } else {
        console.warn('⚠️ Database GI non disponibile, uso fallback');
        setupLocationAutocomplete();
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataInizio').min = today;
    document.getElementById('dataFine').min = today;

    // Check if coming from artist search
    const selectedArtistId = sessionStorage.getItem('selectedArtistId');
    if (selectedArtistId) {
        sessionStorage.removeItem('selectedArtistId');
        startNewAgibilita();

        setTimeout(() => {
            const artistId = parseInt(selectedArtistId);
            const artist = artistsDB.find(a => a.id === artistId);
            if (artist) {
                addArtistToList(artistId);
            }
        }, 100);
    }

    // Check if coming from registration
    const newArtistId = sessionStorage.getItem('newArtistId');
    if (newArtistId) {
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

    // Check if coming from chat
    const quickAgibilita = sessionStorage.getItem('quickAgibilita');
    if (quickAgibilita) {
        sessionStorage.removeItem('quickAgibilita');
        const data = JSON.parse(quickAgibilita);

        startNewAgibilita();

        setTimeout(() => {
            data.artisti.forEach(artistData => {
                const artist = artistsDB.find(a => a.codiceFiscale === artistData.cf);
                if (artist) {
                    selectedArtists.push({
                        ...artist,
                        ruolo: artistData.ruolo,
                        compenso: artistData.compenso
                    });
                }
            });
            updateArtistsList();

            if (data.dataInizio) {
                document.getElementById('dataInizio').value = data.dataInizio;
            }
            if (data.dataFine) {
                document.getElementById('dataFine').value = data.dataFine;
            }

            if (data.locale) {
                document.getElementById('descrizioneLocale').value = data.locale.nome;
                document.getElementById('indirizzo').value = data.locale.indirizzo;
                document.getElementById('citta').value = data.locale.citta;
                document.getElementById('cap').value = data.locale.cap;
                document.getElementById('provincia').value = data.locale.provincia;
            }

            if (selectedArtists.length > 0) {
                setTimeout(() => {
                    goToStep2();
                }, 500);
            }
        }, 200);
    }
});

// SETUP LOCALITÀ CON MENU A TENDINA

function setupLocationAutocomplete() {
    // Carica le province nel dropdown
    if (window.GIDatabase && window.GIDatabase.isLoaded()) {
        loadProvinces();
    } else {
        // Retry dopo un po' se il database non è ancora pronto
        setTimeout(() => {
            if (window.GIDatabase && window.GIDatabase.isLoaded()) {
                loadProvinces();
            } else {
                console.warn('Database GI non pronto, uso fallback');
                loadFallbackProvinces();
            }
        }, 1000);
    }
}

// Carica tutte le province disponibili
function loadProvinces() {
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        console.warn('Database GI non ancora caricato');
        return;
    }

    const provinciaSelect = document.getElementById('provincia');
    if (!provinciaSelect) return;

    // Prima prova con il file province dedicato
    const provinceData = window.GIDatabase.getData().province;
    
    if (provinceData && Array.isArray(provinceData)) {
        // Usa il file gi_province.json con i campi corretti
        const sortedProvinces = provinceData.sort((a, b) => {
            const siglaA = a.sigla_provincia || a.sigla || a.codice;
            const siglaB = b.sigla_provincia || b.sigla || b.codice;
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

        console.log(`✅ Caricate ${sortedProvinces.length} province dal file dedicato`);
    } else {
        // Fallback: estrai le province dai comuni
        const allComuni = window.GIDatabase.getData().comuni || [];
        const provinces = new Map();
        
        allComuni.forEach(comune => {
            const provincia = comune.sigla_provincia || comune.provincia || comune.siglaProvincia;
            if (provincia && provincia.length === 2 && !provinces.has(provincia)) {
                provinces.set(provincia, provincia);
            }
        });

        // Ordina le province alfabeticamente
        const sortedProvinces = Array.from(provinces.keys()).sort();

        // Popola il dropdown
        provinciaSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        sortedProvinces.forEach(provincia => {
            const option = document.createElement('option');
            option.value = provincia;
            option.textContent = `${provincia} - ${getProvinciaNameByCode(provincia)}`;
            provinciaSelect.appendChild(option);
        });

        console.log(`✅ Caricate ${sortedProvinces.length} province estratte dai comuni`);
    }
}

// Carica le città per la provincia selezionata
function loadCitiesForProvince() {
    const provinciaSelect = document.getElementById('provincia');
    const cittaSelect = document.getElementById('citta');
    const capSelect = document.getElementById('cap');
    
    const selectedProvincia = provinciaSelect.value;
    
    // Reset campi successivi
    cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
    cittaSelect.disabled = !selectedProvincia;
    
    capSelect.innerHTML = '<option value="">Prima seleziona città</option>';
    capSelect.disabled = true;

    if (!selectedProvincia) return;

    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        cittaSelect.innerHTML = '<option value="">Database non disponibile</option>';
        return;
    }

    // Ottieni tutti i comuni della provincia usando la funzione corretta
    const comuni = window.GIDatabase.getComuniByProvincia(selectedProvincia);
    
    if (comuni.length === 0) {
        cittaSelect.innerHTML = '<option value="">Nessuna città trovata</option>';
        return;
    }

    // Ordina i comuni alfabeticamente
    const sortedComuni = comuni.sort((a, b) => {
        const nomeA = a.denominazione_ita || a.denominazione || a.nome || '';
        const nomeB = b.denominazione_ita || b.denominazione || b.nome || '';
        return nomeA.localeCompare(nomeB);
    });

    // Popola il dropdown città
    sortedComuni.forEach(comune => {
        const option = document.createElement('option');
        const nomeComune = comune.denominazione_ita || comune.denominazione || comune.nome;
        const codiceIstat = comune.codice_istat || comune.codiceIstat || comune.codice;
        
        option.value = nomeComune;
        option.dataset.codice = codiceIstat;
        option.dataset.cap = comune.cap || '';
        option.textContent = nomeComune;
        cittaSelect.appendChild(option);
    });

    cittaSelect.disabled = false;
    console.log(`✅ Caricate ${sortedComuni.length} città per ${selectedProvincia}`);
}

// Carica i CAP per la città selezionata
function loadCAPsForCity() {
    const cittaSelect = document.getElementById('citta');
    const capSelect = document.getElementById('cap');
    
    const selectedCitta = cittaSelect.value;
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    
    // Reset CAP
    capSelect.innerHTML = '<option value="">Seleziona CAP...</option>';
    capSelect.disabled = !selectedCitta;

    if (!selectedCitta) return;

    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        capSelect.innerHTML = '<option value="">Database non disponibile</option>';
        return;
    }

    // Ottieni il codice comune dalla option selezionata
    const codiceComune = selectedOption.dataset.codice;
    if (!codiceComune) return;

    // Cerca tutti i CAP per questo comune
    const comuniCapData = window.GIDatabase?.getData()?.comuniCap || [];
    const capsForComune = comuniCapData.filter(
        cap => cap.codice_istat === codiceComune
    );

    if (capsForComune.length === 0) {
        // Prova con il CAP dall'option dataset
        const capFromDataset = selectedOption.dataset.cap;
        if (capFromDataset) {
            capSelect.innerHTML = `<option value="${capFromDataset}" selected>${capFromDataset}</option>`;
        } else {
            capSelect.innerHTML = '<option value="">Nessun CAP trovato</option>';
        }
        return;
    }

    if (capsForComune.length === 1) {
        // Un solo CAP, selezionalo automaticamente
        const cap = capsForComune[0].cap;
        capSelect.innerHTML = `<option value="${cap}" selected>${cap}</option>`;
        
        // Salva il codice ISTAT
        document.getElementById('citta').dataset.codiceIstat = codiceComune;
        
        // Valida automaticamente
        validateLocationDataGI();
    } else {
        // Più CAP, mostra tutti
        capsForComune.forEach(capData => {
            const option = document.createElement('option');
            option.value = capData.cap;
            option.textContent = capData.cap;
            capSelect.appendChild(option);
        });
    }

    capSelect.disabled = false;
    
    // Salva il codice ISTAT quando si seleziona la città
    document.getElementById('citta').dataset.codiceIstat = codiceComune;
    
    console.log(`✅ Caricati ${capsForComune.length} CAP per ${selectedCitta}`);
}

// Valida dati località (versione semplificata per dropdown)
function validateLocationDataGI() {
    const provincia = document.getElementById('provincia').value;
    const citta = document.getElementById('citta').value;
    const cap = document.getElementById('cap').value;
    
    if (!provincia || !citta || !cap) return;
    
    // Se arriviamo qui dai dropdown, i dati sono sempre validi
    setFieldValidation('provincia', true);
    setFieldValidation('citta', true);
    setFieldValidation('cap', true);
    
    showValidationMessage('✅ Dati località validati', 'success');
}

// Fallback: carica province manualmente se il database non funziona
function loadFallbackProvinces() {
    const provinciaSelect = document.getElementById('provincia');
    if (!provinciaSelect) return;

    // Province italiane principali
    const provinceItaliane = [
        { sigla: 'AG', nome: 'AGRIGENTO' },
        { sigla: 'AL', nome: 'ALESSANDRIA' },
        { sigla: 'AN', nome: 'ANCONA' },
        { sigla: 'AR', nome: 'AREZZO' },
        { sigla: 'AP', nome: 'ASCOLI PICENO' },
        { sigla: 'AT', nome: 'ASTI' },
        { sigla: 'AV', nome: 'AVELLINO' },
        { sigla: 'BA', nome: 'BARI' },
        { sigla: 'BT', nome: 'BARLETTA-ANDRIA-TRANI' },
        { sigla: 'BL', nome: 'BELLUNO' },
        { sigla: 'BN', nome: 'BENEVENTO' },
        { sigla: 'BG', nome: 'BERGAMO' },
        { sigla: 'BI', nome: 'BIELLA' },
        { sigla: 'BO', nome: 'BOLOGNA' },
        { sigla: 'BZ', nome: 'BOLZANO' },
        { sigla: 'BS', nome: 'BRESCIA' },
        { sigla: 'BR', nome: 'BRINDISI' },
        { sigla: 'CA', nome: 'CAGLIARI' },
        { sigla: 'CL', nome: 'CALTANISSETTA' },
        { sigla: 'CB', nome: 'CAMPOBASSO' },
        { sigla: 'CE', nome: 'CASERTA' },
        { sigla: 'CT', nome: 'CATANIA' },
        { sigla: 'CZ', nome: 'CATANZARO' },
        { sigla: 'CH', nome: 'CHIETI' },
        { sigla: 'CO', nome: 'COMO' },
        { sigla: 'CS', nome: 'COSENZA' },
        { sigla: 'CR', nome: 'CREMONA' },
        { sigla: 'KR', nome: 'CROTONE' },
        { sigla: 'CN', nome: 'CUNEO' },
        { sigla: 'EN', nome: 'ENNA' },
        { sigla: 'FM', nome: 'FERMO' },
        { sigla: 'FE', nome: 'FERRARA' },
        { sigla: 'FI', nome: 'FIRENZE' },
        { sigla: 'FG', nome: 'FOGGIA' },
        { sigla: 'FC', nome: 'FORLÌ-CESENA' },
        { sigla: 'FR', nome: 'FROSINONE' },
        { sigla: 'GE', nome: 'GENOVA' },
        { sigla: 'GO', nome: 'GORIZIA' },
        { sigla: 'GR', nome: 'GROSSETO' },
        { sigla: 'IM', nome: 'IMPERIA' },
        { sigla: 'IS', nome: 'ISERNIA' },
        { sigla: 'AQ', nome: 'L\'AQUILA' },
        { sigla: 'SP', nome: 'LA SPEZIA' },
        { sigla: 'LT', nome: 'LATINA' },
        { sigla: 'LE', nome: 'LECCE' },
        { sigla: 'LC', nome: 'LECCO' },
        { sigla: 'LI', nome: 'LIVORNO' },
        { sigla: 'LO', nome: 'LODI' },
        { sigla: 'LU', nome: 'LUCCA' },
        { sigla: 'MC', nome: 'MACERATA' },
        { sigla: 'MN', nome: 'MANTOVA' },
        { sigla: 'MS', nome: 'MASSA-CARRARA' },
        { sigla: 'MT', nome: 'MATERA' },
        { sigla: 'ME', nome: 'MESSINA' },
        { sigla: 'MI', nome: 'MILANO' },
        { sigla: 'MO', nome: 'MODENA' },
        { sigla: 'MB', nome: 'MONZA E DELLA BRIANZA' },
        { sigla: 'NA', nome: 'NAPOLI' },
        { sigla: 'NO', nome: 'NOVARA' },
        { sigla: 'NU', nome: 'NUORO' },
        { sigla: 'OR', nome: 'ORISTANO' },
        { sigla: 'PD', nome: 'PADOVA' },
        { sigla: 'PA', nome: 'PALERMO' },
        { sigla: 'PR', nome: 'PARMA' },
        { sigla: 'PV', nome: 'PAVIA' },
        { sigla: 'PG', nome: 'PERUGIA' },
        { sigla: 'PU', nome: 'PESARO E URBINO' },
        { sigla: 'PE', nome: 'PESCARA' },
        { sigla: 'PC', nome: 'PIACENZA' },
        { sigla: 'PI', nome: 'PISA' },
        { sigla: 'PT', nome: 'PISTOIA' },
        { sigla: 'PN', nome: 'PORDENONE' },
        { sigla: 'PZ', nome: 'POTENZA' },
        { sigla: 'PO', nome: 'PRATO' },
        { sigla: 'RG', nome: 'RAGUSA' },
        { sigla: 'RA', nome: 'RAVENNA' },
        { sigla: 'RC', nome: 'REGGIO CALABRIA' },
        { sigla: 'RE', nome: 'REGGIO EMILIA' },
        { sigla: 'RI', nome: 'RIETI' },
        { sigla: 'RN', nome: 'RIMINI' },
        { sigla: 'RM', nome: 'ROMA' },
        { sigla: 'RO', nome: 'ROVIGO' },
        { sigla: 'SA', nome: 'SALERNO' },
        { sigla: 'SS', nome: 'SASSARI' },
        { sigla: 'SV', nome: 'SAVONA' },
        { sigla: 'SI', nome: 'SIENA' },
        { sigla: 'SR', nome: 'SIRACUSA' },
        { sigla: 'SO', nome: 'SONDRIO' },
        { sigla: 'SU', nome: 'SUD SARDEGNA' },
        { sigla: 'TA', nome: 'TARANTO' },
        { sigla: 'TE', nome: 'TERAMO' },
        { sigla: 'TR', nome: 'TERNI' },
        { sigla: 'TO', nome: 'TORINO' },
        { sigla: 'TP', nome: 'TRAPANI' },
        { sigla: 'TN', nome: 'TRENTO' },
        { sigla: 'TV', nome: 'TREVISO' },
        { sigla: 'TS', nome: 'TRIESTE' },
        { sigla: 'UD', nome: 'UDINE' },
        { sigla: 'VA', nome: 'VARESE' },
        { sigla: 'VE', nome: 'VENEZIA' },
        { sigla: 'VB', nome: 'VERBANO-CUSIO-OSSOLA' },
        { sigla: 'VC', nome: 'VERCELLI' },
        { sigla: 'VR', nome: 'VERONA' },
        { sigla: 'VI', nome: 'VICENZA' },
        { sigla: 'VV', nome: 'VIBO VALENTIA' },
        { sigla: 'VT', nome: 'VITERBO' }
    ];

    provinciaSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
    provinceItaliane.forEach(provincia => {
        const option = document.createElement('option');
        option.value = provincia.sigla;
        option.textContent = `${provincia.sigla} - ${provincia.nome}`;
        provinciaSelect.appendChild(option);
    });

    console.log(`✅ Caricate ${provinceItaliane.length} province da fallback`);
}

// Autocomplete CAP quando si digita la città
function autoFillFromCityGI() {
    const citta = document.getElementById('citta').value;
    const provincia = document.getElementById('provincia').value;
    
    if (!citta || citta.length < 3) return;
    
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) return;
    
    // Cerca il comune esatto
    const comuni = window.GIDatabase.getComuniByProvincia(provincia);
    const comune = comuni.find(c => {
        const nomeComune = c.denominazione_ita || c.denominazione || c.nome || '';
        return nomeComune.toUpperCase() === citta.toUpperCase();
    });
    
    if (comune && comune.cap) {
        document.getElementById('cap').value = comune.cap;
        document.getElementById('citta').dataset.codiceIstat = comune.codice_istat || comune.codiceIstat || comune.codice;
        validateLocationDataGI();
    }
}

// Ottieni codice ISTAT
function getCodiceIstatFromCityGI() {
    const cittaSelect = document.getElementById('citta');
    
    // Prova prima dal dataset
    const codiceIstat = cittaSelect.dataset.codiceIstat;
    if (codiceIstat) {
        return codiceIstat;
    }
    
    // Fallback: ottieni dalla option selezionata
    const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.codice) {
        return selectedOption.dataset.codice;
    }
    
    // Ultimo tentativo: cerca nel database
    if (window.GIDatabase && window.GIDatabase.isLoaded()) {
        const citta = cittaSelect.value;
        const provincia = document.getElementById('provincia').value;
        
        const comuni = window.GIDatabase.getComuniByProvincia(provincia);
        const comune = comuni.find(c => {
            const nomeComune = c.denominazione_ita || c.denominazione || c.nome || '';
            return nomeComune.toUpperCase() === citta.toUpperCase();
        });
        
        if (comune) {
            return comune.codice_istat || comune.codiceIstat || comune.codice;
        }
    }
    
    return 'L736'; // Default: Venezia
}

// Mostra autocomplete città con database GI
function showCityAutocompleteGI(searchTerm) {
    if (searchTerm.length < 2) {
        hideCityAutocomplete();
        return;
    }
    
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        showLoadingInAutocomplete();
        return;
    }
    
    const results = window.GIDatabase.searchComuni(searchTerm);
    
    if (results.length === 0) {
        showNoResultsInAutocomplete();
        return;
    }
    
    let dropdown = document.getElementById('cityAutocompleteDropdown');
    if (!dropdown) {
        dropdown = createAutocompleteDropdown('cityAutocompleteDropdown', 'citta');
    }
    
    dropdown.innerHTML = results.map(comune => {
        const highlighted = highlightSearchTerm(comune.nome, searchTerm);
        return `
            <div class="autocomplete-item" onclick="selectCityGI('${comune.nome}', '${comune.cap || ''}', '${comune.provincia}', '${comune.codice}')">
                <strong>${highlighted}</strong>
                <span class="province-badge">${comune.provincia}</span><br>
                <small>CAP: ${comune.cap || 'N/D'} - ${getProvinciaNameByCode(comune.provincia)}</small>
            </div>
        `;
    }).join('');
    
    dropdown.style.display = 'block';
}

// Auto-riempimento da CAP con database GI
function autoFillFromCAPGI(cap) {
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        showCAPError('Database non caricato');
        return;
    }
    
    const results = window.GIDatabase.searchByCAP(cap);
    
    if (results.length === 0) {
        showCAPError('CAP non trovato');
        return;
    }
    
    if (results.length === 1) {
        const result = results[0];
        const comune = window.GIDatabase.getComuneByCodice(result.comune);
        
        if (comune) {
            document.getElementById('citta').value = comune.nome;
            document.getElementById('provincia').value = comune.provincia;
            document.getElementById('citta').dataset.codiceIstat = comune.codice;
            
            validateLocationDataGI();
        }
    } else {
        showCAPMultipleResultsGI(results);
    }
}

// Mostra risultati multipli per CAP
function showCAPMultipleResultsGI(results) {
    let dropdown = document.getElementById('capMultipleDropdown');
    if (!dropdown) {
        dropdown = createAutocompleteDropdown('capMultipleDropdown', 'cap');
    }
    
    dropdown.innerHTML = `
        <div class="autocomplete-header">
            Più comuni con questo CAP:
        </div>
        ${results.map(result => {
            const comune = window.GIDatabase.getComuneByCodice(result.comune);
            if (!comune) return '';
            
            return `
                <div class="autocomplete-item" onclick="selectCityGI('${comune.nome}', '${result.cap}', '${comune.provincia}', '${comune.codice}')">
                    <strong>${comune.nome}</strong>
                    <span class="province-badge">${comune.provincia}</span><br>
                    <small>${getProvinciaNameByCode(comune.provincia)}</small>
                </div>
            `;
        }).join('')}
    `;
    
    dropdown.style.display = 'block';
    
    setTimeout(() => {
        if (dropdown) dropdown.style.display = 'none';
    }, 15000);
}

// Seleziona città dall'autocomplete
function selectCityGI(nome, cap, provincia, codiceIstat) {
    document.getElementById('citta').value = nome;
    document.getElementById('cap').value = cap;
    document.getElementById('provincia').value = provincia;
    
    document.getElementById('citta').dataset.codiceIstat = codiceIstat;
    
    hideCityAutocomplete();
    hideMultipleDropdowns();
    
    validateLocationDataGI();
}

// Valida dati località
function validateLocationDataGI() {
    const citta = document.getElementById('citta').value;
    const cap = document.getElementById('cap').value;
    const provincia = document.getElementById('provincia').value;
    
    if (!citta || !cap || !provincia) return;
    
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        return;
    }
    
    const isValid = window.GIDatabase.validateCAP(cap, provincia);
    
    if (isValid) {
        setFieldValidation('citta', true);
        setFieldValidation('cap', true);
        setFieldValidation('provincia', true);
        
        showValidationMessage('✅ Dati località validati', 'success');
    } else {
        setFieldValidation('cap', false);
        showValidationMessage('⚠️ CAP e provincia potrebbero non essere coerenti', 'warning');
    }
}

function validateProvinciaAndCAPGI() {
    validateLocationDataGI();
}

// Ottieni nome provincia da codice
function getProvinciaNameByCode(codice) {
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
        return codice;
    }
    
    const provincia = window.GIDatabase.getProvinciaByCode(codice);
    return provincia ? provincia.nome : codice;
}

// FUNZIONI UTILITÀ UI

function createAutocompleteDropdown(id, parentInputId) {
    const dropdown = document.createElement('div');
    dropdown.id = id;
    dropdown.className = 'autocomplete-dropdown';
    
    const parentInput = document.getElementById(parentInputId);
    parentInput.parentNode.style.position = 'relative';
    parentInput.parentNode.appendChild(dropdown);
    
    return dropdown;
}

function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showLoadingInAutocomplete() {
    let dropdown = document.getElementById('cityAutocompleteDropdown');
    if (!dropdown) {
        dropdown = createAutocompleteDropdown('cityAutocompleteDropdown', 'citta');
    }
    
    dropdown.innerHTML = '<div class="autocomplete-loading">Caricamento database...</div>';
    dropdown.style.display = 'block';
}

function showNoResultsInAutocomplete() {
    let dropdown = document.getElementById('cityAutocompleteDropdown');
    if (!dropdown) {
        dropdown = createAutocompleteDropdown('cityAutocompleteDropdown', 'citta');
    }
    
    dropdown.innerHTML = '<div class="autocomplete-no-results">Nessun comune trovato</div>';
    dropdown.style.display = 'block';
}

function hideCityAutocomplete() {
    const dropdown = document.getElementById('cityAutocompleteDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function hideMultipleDropdowns() {
    const dropdowns = ['capMultipleDropdown'];
    dropdowns.forEach(id => {
        const dropdown = document.getElementById(id);
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    });
}

function setFieldValidation(fieldId, isValid) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.classList.remove('valid', 'invalid');
    field.classList.add(isValid ? 'valid' : 'invalid');
}

function showValidationMessage(message, type) {
    const existing = document.querySelectorAll('.validation-message');
    existing.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} validation-message`;
    messageDiv.textContent = message;
    
    const provinciaInput = document.getElementById('provincia');
    provinciaInput.parentNode.appendChild(messageDiv);
    
    setTimeout(() => messageDiv.remove(), 3000);
}

function showCAPError(message) {
    const capInput = document.getElementById('cap');
    setFieldValidation('cap', false);
    
    showValidationMessage(`❌ ${message}`, 'error');
}

function resetLocationValidation() {
    ['citta', 'cap', 'provincia'].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.classList.remove('valid', 'invalid');
            field.style.borderColor = '';
        }
    });
    
    const messages = document.querySelectorAll('.validation-message');
    messages.forEach(msg => msg.remove());
}

// NAVIGAZIONE SEZIONI

function showSection(sectionId) {
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

function startNewAgibilita() {
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    selectedArtists = [];
    clearAllForms();
    showSection('step1');
}

function showEditAgibilita() {
    document.getElementById('editListSection').style.display = 'block';
    showExistingAgibilita();
}

function clearAllForms() {
    selectedArtists = [];
    updateArtistsList();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataFine').value = '';

    document.getElementById('descrizioneLocale').value = '';
    document.getElementById('indirizzo').value = '';
    document.getElementById('citta').value = '';
    document.getElementById('cap').value = '';
    document.getElementById('provincia').value = '';
    document.getElementById('noteLocale').value = '';

    document.getElementById('editListSection').style.display = 'none';
    resetLocationValidation();
}

// GESTIONE ARTISTI

function showAddArtistModal() {
    document.getElementById('addArtistModal').style.display = 'block';
    document.getElementById('artistSearch').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function closeModal() {
    document.getElementById('addArtistModal').style.display = 'none';
}

function searchArtists() {
    const searchTerm = document.getElementById('artistSearch').value.toLowerCase();
    const results = artistsDB.filter(artist => 
        artist.nome.toLowerCase().includes(searchTerm) || 
        artist.cognome.toLowerCase().includes(searchTerm) ||
        artist.codiceFiscale.toLowerCase().includes(searchTerm) ||
        (artist.nomeArte && artist.nomeArte.toLowerCase().includes(searchTerm))
    );

    const resultsDiv = document.getElementById('searchResults');
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <p>Nessun artista trovato</p>
            <div style="text-align: center; margin-top: 1rem;">
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

function goToRegistration() {
    sessionStorage.setItem('returnToAgibilita', 'true');
    window.location.href = '../registrazione-artista.html';
}

function addArtistToList(artistId) {
    const artist = artistsDB.find(a => a.id === artistId);
    if (!artist) return;

    const existingIndex = selectedArtists.findIndex(a => a.codiceFiscale === artist.codiceFiscale);
    if (existingIndex !== -1) {
        alert('Questo artista è già stato aggiunto!');
        return;
    }

    selectedArtists.push({
        ...artist,
        ruolo: artist.mansione || '',
        compenso: 0,
        matricolaEnpals: artist.matricolaENPALS || generateMatricolaEnpals()
    });

    updateArtistsList();
    closeModal();
}

function updateArtistsList() {
    const listDiv = document.getElementById('artistList');

    if (selectedArtists.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #6b7280;">Nessun artista selezionato</p>';
        document.getElementById('summaryBox').style.display = 'none';
        document.getElementById('btnNext1').style.display = 'none';
    } else {
        listDiv.innerHTML = selectedArtists.map((artist, index) => `
            <div class="artist-item">
                <div class="artist-info">
                    <strong>${artist.nome} ${artist.cognome}${artist.nomeArte ? ' - ' + artist.nomeArte : ''}</strong><br>
                    <small>CF: ${artist.codiceFiscale}</small>
                    ${artist.matricolaEnpals ? `<br><small>Matricola ENPALS: ${artist.matricolaEnpals}</small>` : ''}
                </div>
                <div class="artist-role-compensation">
                    <select class="form-control" required onchange="updateArtistRole(${index}, this.value)">
                        <option value="">Seleziona ruolo...</option>
                        <option value="DJ" ${artist.ruolo === 'DJ' ? 'selected' : ''}>DJ (032)</option>
                        <option value="Vocalist" ${artist.ruolo === 'Vocalist' ? 'selected' : ''}>Vocalist (031)</option>
                        <option value="Ballerino/a" ${artist.ruolo === 'Ballerino/a' ? 'selected' : ''}>Ballerino/a (092)</option>
                        <option value="Tecnico" ${artist.ruolo === 'Tecnico' ? 'selected' : ''}>Tecnico (117)</option>
                        <option value="Fotografo" ${artist.ruolo === 'Fotografo' ? 'selected' : ''}>Fotografo (126)</option>
                        <option value="Truccatore" ${artist.ruolo === 'Truccatore' ? 'selected' : ''}>Truccatore (141)</option>
                    </select>
                    <input type="number" class="form-control" placeholder="Compenso €" 
                           value="${artist.compenso || ''}" min="0" step="0.01"
                           onchange="updateArtistCompensation(${index}, this.value)"
                           style="width: 150px;">
                    <button class="btn-remove" onclick="removeArtist(${index})">Rimuovi</button>
                </div>
            </div>
        `).join('');

        document.getElementById('summaryBox').style.display = 'block';
        updateTotalCompensation();
        checkCanProceed();
    }
}

function updateArtistRole(index, role) {
    selectedArtists[index].ruolo = role;
    checkCanProceed();
}

function updateArtistCompensation(index, value) {
    selectedArtists[index].compenso = parseFloat(value) || 0;
    updateTotalCompensation();
    checkCanProceed();
}

function updateTotalCompensation() {
    const total = selectedArtists.reduce((sum, artist) => sum + (artist.compenso || 0), 0);
    document.getElementById('totalArtists').textContent = selectedArtists.length;
    document.getElementById('totalCompensation').textContent = total.toFixed(2);
}

function removeArtist(index) {
    selectedArtists.splice(index, 1);
    updateArtistsList();
}

function checkCanProceed() {
    const canProceed = selectedArtists.length > 0 && 
        selectedArtists.every(a => a.ruolo && a.compenso > 0);
    document.getElementById('btnNext1').style.display = canProceed ? 'inline-block' : 'none';
}

function goToStep2() {
    if (selectedArtists.length === 0) {
        alert('Seleziona almeno un artista');
        return;
    }
    showSection('step2');
}

// GESTIONE DATE E VALIDAZIONE

function validateDates() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;

    if (startDate && endDate) {
        if (endDate < startDate) {
            alert('La data di fine non può essere precedente alla data di inizio');
            document.getElementById('dataFine').value = startDate;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        document.getElementById('dateInfo').style.display = 'block';
        document.getElementById('dateInfo').textContent = `Durata: ${diffDays} giorn${diffDays > 1 ? 'i' : 'o'}`;
    }
}

// GESTIONE VENUE

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
            <div class="autocomplete-item" onclick="selectVenue('${venue.nome}', '${venue.indirizzo}', '${venue.citta}', '${venue.cap}', '${venue.provincia}')">
                <strong>${venue.nome}</strong><br>
                <small>${venue.citta} - ${venue.provincia}</small>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

function selectVenue(nome, indirizzo, citta, cap, provincia) {
    document.getElementById('descrizioneLocale').value = nome;
    document.getElementById('indirizzo').value = indirizzo;
    document.getElementById('citta').value = citta;
    document.getElementById('cap').value = cap;
    document.getElementById('provincia').value = provincia;
    document.getElementById('venueDropdown').style.display = 'none';
    
    // Valida i dati dopo la selezione
    validateLocationDataGI();
}

function goToStep3() {
    const requiredFields = ['dataInizio', 'dataFine', 'descrizioneLocale', 'indirizzo', 'citta', 'cap', 'provincia'];
    const missingFields = requiredFields.filter(field => !document.getElementById(field).value);

    if (missingFields.length > 0) {
        alert('Compila tutti i campi obbligatori');
        return;
    }

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

    updateSummaries();
    generateXMLPreview();
    showSection('step3');
}

// GESTIONE RIEPILOGO E TAB

function updateSummaries() {
    const artistsHtml = selectedArtists.map(artist => 
        `<p><strong>${artist.nome} ${artist.cognome}</strong> - ${artist.ruolo} - €${artist.compenso.toFixed(2)}</p>`
    ).join('');
    document.getElementById('summaryArtists').innerHTML = artistsHtml;

    const startDate = new Date(document.getElementById('dataInizio').value);
    const endDate = new Date(document.getElementById('dataFine').value);
    const datesHtml = `
        <p>Dal: ${startDate.toLocaleDateString('it-IT')}</p>
        <p>Al: ${endDate.toLocaleDateString('it-IT')}</p>
    `;
    document.getElementById('summaryDates').innerHTML = datesHtml;

    const locationHtml = `
        <p><strong>${document.getElementById('descrizioneLocale').value}</strong></p>
        <p>${document.getElementById('indirizzo').value}</p>
        <p>${document.getElementById('cap').value} ${document.getElementById('citta').value} (${document.getElementById('provincia').value})</p>
    `;
    document.getElementById('summaryLocation').innerHTML = locationHtml;
}

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
}

// GENERAZIONE XML CON DATABASE GI

function generateXML() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;
    const tipo = agibilitaData.isModifica ? 'V' : 'N';
    
    const descrizioneLocale = document.getElementById('descrizioneLocale').value;
    const indirizzo = document.getElementById('indirizzo').value;
    const citta = document.getElementById('citta').value;
    const cap = document.getElementById('cap').value;
    const provincia = document.getElementById('provincia').value;
    
    const codiceComune = getCodiceIstatFromCityGI();

    const qualificaMap = {
        'DJ': '032',
        'Vocalist': '031',
        'Ballerino/a': '092',
        'Tecnico': '117',
        'Fotografo': '126',
        'Truccatore': '141'
    };

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
        const codiceQualifica = qualificaMap[artist.ruolo] || '032';
        
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

function generateMatricolaEnpals() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

function formatRetribuzione(amount) {
    return parseFloat(amount).toFixed(2).replace('.', ',');
}

function generateXMLPreview() {
    try {
        const xml = generateXML();
        const validation = validateINPSXML(xml);
        
        let preview = xml.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        preview = preview.replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span style="color: #e06c75;">$1</span>');
        preview = preview.replace(/(&lt;!\[CDATA\[.*?\]\]&gt;)/g, '<span style="color: #98c379;">$1</span>');
        
        document.getElementById('xmlPreview').innerHTML = `<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4;">${preview}</pre>`;
        
        const statusDiv = document.createElement('div');
        statusDiv.style.marginTop = '1rem';
        statusDiv.style.padding = '0.5rem';
        statusDiv.style.borderRadius = '4px';
        
        if (validation.isValid) {
            statusDiv.className = 'alert alert-success';
            statusDiv.innerHTML = '✅ XML valido e pronto per l\'invio INPS';
        } else {
            statusDiv.className = 'alert alert-error';
            statusDiv.innerHTML = `❌ Errori di validazione:<br>${validation.errors.map(error => `• ${error}`).join('<br>')}`;
        }
        
        document.getElementById('xmlPreview').parentNode.appendChild(statusDiv);
        
    } catch (error) {
        document.getElementById('xmlPreview').innerHTML = 
            `<span style="color: #e06c75;">Errore nella generazione XML: ${error.message}</span>`;
    }
}

// VALIDAZIONE XML

function validateINPSXML(xmlString) {
    const errors = [];
    
    if (!xmlString.includes('<ImportAgibilita>')) {
        errors.push('Tag principale ImportAgibilita mancante');
    }
    
    if (!xmlString.includes('<ElencoAgibilita>')) {
        errors.push('Tag ElencoAgibilita mancante');
    }
    
    if (!xmlString.includes('<Occupazioni>')) {
        errors.push('Sezione Occupazioni mancante');
    }
    
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
    
    const datePattern = /\d{4}-\d{2}-\d{2}/;
    if (!datePattern.test(xmlString)) {
        errors.push('Formato date non valido (deve essere YYYY-MM-DD)');
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

// DOWNLOAD E SALVATAGGIO

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
    document.getElementById('tabInvio').insertBefore(successMsg, document.getElementById('tabInvio').firstChild);
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
        artisti: selectedArtists.map(a => ({
            cf: a.codiceFiscale,
            nome: a.nome,
            cognome: a.cognome,
            nomeArte: a.nomeArte,
            ruolo: a.ruolo,
            compenso: a.compenso,
            matricolaEnpals: a.matricolaEnpals
        })),
        xml: xmlContent,
        isModifica: agibilitaData.isModifica,
        codiceOriginale: agibilitaData.codiceAgibilita
    };

    agibilitaDB.push(agibilita);
    localStorage.setItem('agibilitaDB', JSON.stringify(agibilitaDB));

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

// GESTIONE AGIBILITÀ ESISTENTI

function showExistingAgibilita() {
    const listDiv = document.getElementById('agibilitaList');
    listDiv.innerHTML = '';

    if (agibilitaDB.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #6b7280;">Nessuna agibilità trovata</p>';
        return;
    }

    agibilitaDB.forEach(agibilita => {
        const totalCompensation = agibilita.artisti.reduce((sum, a) => sum + (a.compenso || 0), 0);
        const artistsList = agibilita.artisti.map(a => 
            `${a.nome} ${a.cognome} (${a.ruolo})`
        ).join(', ');

        const item = document.createElement('div');
        item.className = 'agibilita-item';
        item.innerHTML = `
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
        `;
        listDiv.appendChild(item);
    });
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
                compenso: artData.compenso
            });
        }
    });

    document.getElementById('dataInizio').value = agibilita.dataInizio;
    document.getElementById('dataFine').value = agibilita.dataFine;
    document.getElementById('descrizioneLocale').value = agibilita.locale.descrizione;
    document.getElementById('indirizzo').value = agibilita.locale.indirizzo;
    document.getElementById('citta').value = agibilita.locale.citta;
    document.getElementById('cap').value = agibilita.locale.cap;
    document.getElementById('provincia').value = agibilita.locale.provincia;

    updateArtistsList();
    document.getElementById('editListSection').style.display = 'none';
    showSection('step1');
}

function duplicateAgibilita(codice) {
    const agibilita = agibilitaDB.find(a => a.codice === codice);
    if (!agibilita) return;

    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;

    selectedArtists = [];
    agibilita.artisti.forEach(artData => {
        const artist = artistsDB.find(a => a.codiceFiscale === artData.cf);
        if (artist) {
            selectedArtists.push({
                ...artist,
                ruolo: artData.ruolo,
                compenso: artData.compenso
            });
        }
    });

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataFine').value = '';

    document.getElementById('descrizioneLocale').value = agibilita.locale.descrizione;
    document.getElementById('indirizzo').value = agibilita.locale.indirizzo;
    document.getElementById('citta').value = agibilita.locale.citta;
    document.getElementById('cap').value = agibilita.locale.cap;
    document.getElementById('provincia').value = agibilita.locale.provincia;

    updateArtistsList();
    document.getElementById('editListSection').style.display = 'none';
    showSection('step1');
}

function cancelAgibilita(codice) {
    if (confirm(`Sei sicuro di voler annullare l'agibilità ${codice}?`)) {
        const index = agibilitaDB.findIndex(a => a.codice === codice);
        if (index !== -1) {
            agibilitaDB.splice(index, 1);
            localStorage.setItem('agibilitaDB', JSON.stringify(agibilitaDB));

            showExistingAgibilita();

            const listDiv = document.getElementById('agibilitaList');
            const msg = document.createElement('div');
            msg.className = 'alert alert-success';
            msg.style.marginBottom = '1rem';
            msg.textContent = `Agibilità ${codice} annullata con successo`;
            listDiv.insertBefore(msg, listDiv.firstChild);

            setTimeout(() => msg.remove(), 3000);
        }
    }
}

// EVENT LISTENERS GLOBALI

window.onclick = function(event) {
    const modal = document.getElementById('addArtistModal');

    if (event.target == modal) {
        closeModal();
    }

    if (!event.target.matches('#descrizioneLocale')) {
        document.getElementById('venueDropdown').style.display = 'none';
    }
}
