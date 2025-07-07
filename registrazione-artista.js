// Inizializzazione sistema registrazione artista
document.addEventListener('DOMContentLoaded', function() {
    console.log('Database GI inizializzato per registrazione');
    
    // Mostra indicatore caricamento
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block';
    
    // Aspetta che il database sia caricato
    setTimeout(() => {
        loadingIndicator.style.display = 'none';
        loadProvinces();
        setupEventListeners();
    }, 1500);
});

// Funzioni per menu a tendina cascata
function loadProvinces() {
    try {
        const provinceSelect = document.getElementById('provincia');
        provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        // Prima prova con il file dedicato
        const provinceData = window.GIDatabase?.getData()?.province || [];
        let province = [];
        
        if (provinceData.length > 0) {
            // Usa la struttura corretta del file gi_province.json
            province = provinceData
                .map(p => ({
                    sigla: p.sigla_provincia || p.sigla || p.codice,
                    nome: p.denominazione_provincia || p.denominazione || p.nome
                }))
                .filter(p => p.sigla && p.nome && p.sigla.length === 2);
                
            if (province.length > 20) {
                console.log(`✅ Caricate ${province.length} province dal file dedicato`);
            }
        }
        
        // Se non ci sono province dal file dedicato, estrai dai comuni
        if (province.length < 20) {
            const allComuni = window.GIDatabase?.getData()?.comuni || [];
            const provinceMap = new Map();
            
            allComuni.forEach(comune => {
                const sigla = comune.sigla_provincia || comune.provincia || comune.siglaProvincia;
                if (sigla && sigla.length === 2 && !provinceMap.has(sigla)) {
                    provinceMap.set(sigla, sigla);
                }
            });
            
            if (provinceMap.size > 20) {
                province = Array.from(provinceMap.keys()).map(sigla => ({
                    sigla: sigla,
                    nome: getNomeProvinciaFromSigla(sigla)
                }));
                console.log(`⚠️ Caricate ${province.length} province estratte dai comuni`);
            }
        }
        
        // Fallback completo se ancora non ci sono abbastanza province
        if (province.length < 100) {
            province = getProvinceFallback();
            console.log(`🆘 Caricate ${province.length} province da fallback completo`);
        }
        
        // Ordina le province
        province.sort((a, b) => {
            if (!a.sigla || !b.sigla) return 0;
            return a.sigla.localeCompare(b.sigla);
        });
        
        // Popola il select
        province.forEach(p => {
            const option = document.createElement('option');
            option.value = p.sigla;
            option.textContent = `${p.sigla} - ${p.nome}`;
            provinceSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Errore caricamento province:', error);
        // Carica fallback in caso di errore
        loadProvinceFallback();
    }
}

function loadProvinceFallback() {
    const provinceSelect = document.getElementById('provincia');
    const province = getProvinceFallback();
    
    province.forEach(p => {
        const option = document.createElement('option');
        option.value = p.sigla;
        option.textContent = `${p.sigla} - ${p.nome}`;
        provinceSelect.appendChild(option);
    });
}

function getNomeProvinciaFromSigla(sigla) {
    const nomiProvince = {
        'AG': 'AGRIGENTO', 'AL': 'ALESSANDRIA', 'AN': 'ANCONA', 'AO': 'AOSTA',
        'AR': 'AREZZO', 'AP': 'ASCOLI PICENO', 'AT': 'ASTI', 'AV': 'AVELLINO',
        'BA': 'BARI', 'BT': 'BARLETTA-ANDRIA-TRANI', 'BL': 'BELLUNO', 'BN': 'BENEVENTO',
        'BG': 'BERGAMO', 'BI': 'BIELLA', 'BO': 'BOLOGNA', 'BZ': 'BOLZANO',
        'BS': 'BRESCIA', 'BR': 'BRINDISI', 'CA': 'CAGLIARI', 'CL': 'CALTANISSETTA',
        'CB': 'CAMPOBASSO', 'CI': 'CARBONIA-IGLESIAS', 'CE': 'CASERTA', 'CT': 'CATANIA',
        'CZ': 'CATANZARO', 'CH': 'CHIETI', 'CO': 'COMO', 'CS': 'COSENZA',
        'CR': 'CREMONA', 'KR': 'CROTONE', 'CN': 'CUNEO', 'EN': 'ENNA',
        'FM': 'FERMO', 'FE': 'FERRARA', 'FI': 'FIRENZE', 'FG': 'FOGGIA',
        'FC': 'FORLI-CESENA', 'FR': 'FROSINONE', 'GE': 'GENOVA', 'GO': 'GORIZIA',
        'GR': 'GROSSETO', 'IM': 'IMPERIA', 'IS': 'ISERNIA', 'SP': 'LA SPEZIA',
        'AQ': 'L\'AQUILA', 'LT': 'LATINA', 'LE': 'LECCE', 'LC': 'LECCO',
        'LI': 'LIVORNO', 'LO': 'LODI', 'LU': 'LUCCA', 'MC': 'MACERATA',
        'MN': 'MANTOVA', 'MS': 'MASSA-CARRARA', 'MT': 'MATERA', 'ME': 'MESSINA',
        'MI': 'MILANO', 'MO': 'MODENA', 'MB': 'MONZA E BRIANZA', 'NA': 'NAPOLI',
        'NO': 'NOVARA', 'NU': 'NUORO', 'OT': 'OLBIA-TEMPIO', 'OR': 'ORISTANO',
        'PD': 'PADOVA', 'PA': 'PALERMO', 'PR': 'PARMA', 'PV': 'PAVIA',
        'PG': 'PERUGIA', 'PU': 'PESARO E URBINO', 'PE': 'PESCARA', 'PC': 'PIACENZA',
        'PI': 'PISA', 'PT': 'PISTOIA', 'PN': 'PORDENONE', 'PZ': 'POTENZA',
        'PO': 'PRATO', 'RG': 'RAGUSA', 'RA': 'RAVENNA', 'RC': 'REGGIO CALABRIA',
        'RE': 'REGGIO EMILIA', 'RI': 'RIETI', 'RN': 'RIMINI', 'RM': 'ROMA',
        'RO': 'ROVIGO', 'SA': 'SALERNO', 'VS': 'MEDIO CAMPIDANO', 'SS': 'SASSARI',
        'SV': 'SAVONA', 'SI': 'SIENA', 'SR': 'SIRACUSA', 'SO': 'SONDRIO',
        'TA': 'TARANTO', 'TE': 'TERAMO', 'TR': 'TERNI', 'TO': 'TORINO',
        'OG': 'OGLIASTRA', 'TP': 'TRAPANI', 'TN': 'TRENTO', 'TV': 'TREVISO',
        'TS': 'TRIESTE', 'UD': 'UDINE', 'VA': 'VARESE', 'VE': 'VENEZIA',
        'VB': 'VERBANO-CUSIO-OSSOLA', 'VC': 'VERCELLI', 'VR': 'VERONA',
        'VV': 'VIBO VALENTIA', 'VI': 'VICENZA', 'VT': 'VITERBO', 'SU': 'SUD SARDEGNA'
    };
    return nomiProvince[sigla] || sigla;
}

function getProvinceFallback() {
    return [
        { sigla: 'AG', nome: 'AGRIGENTO' }, { sigla: 'AL', nome: 'ALESSANDRIA' },
        { sigla: 'AN', nome: 'ANCONA' }, { sigla: 'AO', nome: 'AOSTA' },
        { sigla: 'AR', nome: 'AREZZO' }, { sigla: 'AP', nome: 'ASCOLI PICENO' },
        { sigla: 'AT', nome: 'ASTI' }, { sigla: 'AV', nome: 'AVELLINO' },
        { sigla: 'BA', nome: 'BARI' }, { sigla: 'BT', nome: 'BARLETTA-ANDRIA-TRANI' },
        { sigla: 'BL', nome: 'BELLUNO' }, { sigla: 'BN', nome: 'BENEVENTO' },
        { sigla: 'BG', nome: 'BERGAMO' }, { sigla: 'BI', nome: 'BIELLA' },
        { sigla: 'BO', nome: 'BOLOGNA' }, { sigla: 'BZ', nome: 'BOLZANO' },
        { sigla: 'BS', nome: 'BRESCIA' }, { sigla: 'BR', nome: 'BRINDISI' },
        { sigla: 'CA', nome: 'CAGLIARI' }, { sigla: 'CL', nome: 'CALTANISSETTA' },
        { sigla: 'CB', nome: 'CAMPOBASSO' }, { sigla: 'CI', nome: 'CARBONIA-IGLESIAS' },
        { sigla: 'CE', nome: 'CASERTA' }, { sigla: 'CT', nome: 'CATANIA' },
        { sigla: 'CZ', nome: 'CATANZARO' }, { sigla: 'CH', nome: 'CHIETI' },
        { sigla: 'CO', nome: 'COMO' }, { sigla: 'CS', nome: 'COSENZA' },
        { sigla: 'CR', nome: 'CREMONA' }, { sigla: 'KR', nome: 'CROTONE' },
        { sigla: 'CN', nome: 'CUNEO' }, { sigla: 'EN', nome: 'ENNA' },
        { sigla: 'FM', nome: 'FERMO' }, { sigla: 'FE', nome: 'FERRARA' },
        { sigla: 'FI', nome: 'FIRENZE' }, { sigla: 'FG', nome: 'FOGGIA' },
        { sigla: 'FC', nome: 'FORLI-CESENA' }, { sigla: 'FR', nome: 'FROSINONE' },
        { sigla: 'GE', nome: 'GENOVA' }, { sigla: 'GO', nome: 'GORIZIA' },
        { sigla: 'GR', nome: 'GROSSETO' }, { sigla: 'IM', nome: 'IMPERIA' },
        { sigla: 'IS', nome: 'ISERNIA' }, { sigla: 'SP', nome: 'LA SPEZIA' },
        { sigla: 'AQ', nome: 'L\'AQUILA' }, { sigla: 'LT', nome: 'LATINA' },
        { sigla: 'LE', nome: 'LECCE' }, { sigla: 'LC', nome: 'LECCO' },
        { sigla: 'LI', nome: 'LIVORNO' }, { sigla: 'LO', nome: 'LODI' },
        { sigla: 'LU', nome: 'LUCCA' }, { sigla: 'MC', nome: 'MACERATA' },
        { sigla: 'MN', nome: 'MANTOVA' }, { sigla: 'MS', nome: 'MASSA-CARRARA' },
        { sigla: 'MT', nome: 'MATERA' }, { sigla: 'ME', nome: 'MESSINA' },
        { sigla: 'MI', nome: 'MILANO' }, { sigla: 'MO', nome: 'MODENA' },
        { sigla: 'MB', nome: 'MONZA E BRIANZA' }, { sigla: 'NA', nome: 'NAPOLI' },
        { sigla: 'NO', nome: 'NOVARA' }, { sigla: 'NU', nome: 'NUORO' },
        { sigla: 'OT', nome: 'OLBIA-TEMPIO' }, { sigla: 'OR', nome: 'ORISTANO' },
        { sigla: 'PD', nome: 'PADOVA' }, { sigla: 'PA', nome: 'PALERMO' },
        { sigla: 'PR', nome: 'PARMA' }, { sigla: 'PV', nome: 'PAVIA' },
        { sigla: 'PG', nome: 'PERUGIA' }, { sigla: 'PU', nome: 'PESARO E URBINO' },
        { sigla: 'PE', nome: 'PESCARA' }, { sigla: 'PC', nome: 'PIACENZA' },
        { sigla: 'PI', nome: 'PISA' }, { sigla: 'PT', nome: 'PISTOIA' },
        { sigla: 'PN', nome: 'PORDENONE' }, { sigla: 'PZ', nome: 'POTENZA' },
        { sigla: 'PO', nome: 'PRATO' }, { sigla: 'RG', nome: 'RAGUSA' },
        { sigla: 'RA', nome: 'RAVENNA' }, { sigla: 'RC', nome: 'REGGIO CALABRIA' },
        { sigla: 'RE', nome: 'REGGIO EMILIA' }, { sigla: 'RI', nome: 'RIETI' },
        { sigla: 'RN', nome: 'RIMINI' }, { sigla: 'RM', nome: 'ROMA' },
        { sigla: 'RO', nome: 'ROVIGO' }, { sigla: 'SA', nome: 'SALERNO' },
        { sigla: 'VS', nome: 'MEDIO CAMPIDANO' }, { sigla: 'SS', nome: 'SASSARI' },
        { sigla: 'SV', nome: 'SAVONA' }, { sigla: 'SI', nome: 'SIENA' },
        { sigla: 'SR', nome: 'SIRACUSA' }, { sigla: 'SO', nome: 'SONDRIO' },
        { sigla: 'TA', nome: 'TARANTO' }, { sigla: 'TE', nome: 'TERAMO' },
        { sigla: 'TR', nome: 'TERNI' }, { sigla: 'TO', nome: 'TORINO' },
        { sigla: 'OG', nome: 'OGLIASTRA' }, { sigla: 'TP', nome: 'TRAPANI' },
        { sigla: 'TN', nome: 'TRENTO' }, { sigla: 'TV', nome: 'TREVISO' },
        { sigla: 'TS', nome: 'TRIESTE' }, { sigla: 'UD', nome: 'UDINE' },
        { sigla: 'VA', nome: 'VARESE' }, { sigla: 'VE', nome: 'VENEZIA' },
        { sigla: 'VB', nome: 'VERBANO-CUSIO-OSSOLA' }, { sigla: 'VC', nome: 'VERCELLI' },
        { sigla: 'VR', nome: 'VERONA' }, { sigla: 'VV', nome: 'VIBO VALENTIA' },
        { sigla: 'VI', nome: 'VICENZA' }, { sigla: 'VT', nome: 'VITERBO' },
        { sigla: 'SU', nome: 'SUD SARDEGNA' }
    ];
}

function setupEventListeners() {
    // Event listener per cambio provincia
    document.getElementById('provincia').addEventListener('change', function() {
        const selectedProvincia = this.value;
        const cittaSelect = document.getElementById('citta');
        const capSelect = document.getElementById('cap');
        
        if (selectedProvincia) {
            cittaSelect.disabled = false;
            loadCitta(selectedProvincia);
        } else {
            cittaSelect.disabled = true;
            cittaSelect.innerHTML = '<option value="">Prima seleziona la provincia</option>';
            capSelect.disabled = true;
            capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
        }
    });
    
    // Event listener per cambio città
    document.getElementById('citta').addEventListener('change', function() {
        const selectedCitta = this.value;
        const capSelect = document.getElementById('cap');
        
        if (selectedCitta) {
            capSelect.disabled = false;
            loadCAP(selectedCitta);
        } else {
            capSelect.disabled = true;
            capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
        }
    });
    
    // Event listener per il form
    document.getElementById('registrationForm').addEventListener('submit', handleFormSubmit);
}

function loadCitta(provincia) {
    const cittaSelect = document.getElementById('citta');
    cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
    
    try {
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
        
        // Ordina i comuni alfabeticamente
        comuni.sort((a, b) => {
            const nomeA = a.denominazione_ita || a.denominazione || a.nome || '';
            const nomeB = b.denominazione_ita || b.denominazione || b.nome || '';
            return nomeA.localeCompare(nomeB);
        });
        
        // Popola il select
        comuni.forEach(comune => {
            const option = document.createElement('option');
            option.value = comune.codice_istat || comune.codiceIstat;
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
    capSelect.innerHTML = '<option value="">Caricamento CAP...</option>';
    
    try {
        const selectedOption = document.querySelector(`#citta option[value="${codiceIstat}"]`);
        if (!selectedOption) {
            console.warn('Opzione città non trovata');
            return;
        }
        
        const comuneData = JSON.parse(selectedOption.getAttribute('data-comune'));
        const comuniCapData = window.GIDatabase?.getData()?.comuniCap || [];
        
        // Cerca i CAP per questo comune usando codice_istat
        const capList = comuniCapData
            .filter(item => item.codice_istat === codiceIstat)
            .map(item => item.cap)
            .filter((cap, index, self) => cap && self.indexOf(cap) === index)
            .sort();
        
        console.log(`🔍 CAP trovati per codice ${codiceIstat}:`, capList);
        
        if (capList.length === 0) {
            // Fallback: prova con il CAP del comune se disponibile
            if (comuneData.cap) {
                capList.push(comuneData.cap);
            } else {
                capSelect.innerHTML = '<option value="">CAP non trovato</option>';
                return;
            }
        }
        
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
        console.error('Errore caricamento CAP:', error);
        capSelect.innerHTML = '<option value="">Errore caricamento CAP</option>';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Raccogli i dati del form
    const formData = new FormData(e.target);
    const artistData = {
        nome: formData.get('nome').toUpperCase(),
        cognome: formData.get('cognome').toUpperCase(),
        nomeArte: formData.get('nomeArte'),
        codiceFiscale: formData.get('codiceFiscale').toUpperCase(),
        matricolaENPALS: formData.get('matricolaENPALS')?.toUpperCase() || '',
        dataNascita: formData.get('dataNascita'),
        nazionalita: formData.get('nazionalita'),
        telefono: formData.get('telefono'),
        email: formData.get('email'),
        indirizzo: formData.get('indirizzo'),
        provincia: formData.get('provincia'),
        citta: document.querySelector('#citta option:checked')?.textContent || '',
        cap: formData.get('cap'),
        codiceIstatCitta: formData.get('citta'), // Salva anche il codice ISTAT
        mansione: formData.get('mansione'),
        compensoGiornaliero: parseFloat(formData.get('compensoGiornaliero')) || 0,
        note: formData.get('note'),
        dataRegistrazione: new Date().toISOString()
    };
    
    // Validazione base
    if (!validateCodiceFiscale(artistData.codiceFiscale)) {
        showError('Codice fiscale non valido');
        return;
    }
    
    // Salva nel database locale
    saveArtist(artistData);
}

function validateCodiceFiscale(cf) {
    cf = cf.toUpperCase();
    if (cf.length !== 16) return false;
    
    const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return pattern.test(cf);
}

function saveArtist(artistData) {
    // Carica database esistente
    let artistsDB = [];
    try {
        const saved = localStorage.getItem('artistsDB');
        if (saved) {
            artistsDB = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Errore caricamento database artisti:', error);
    }
    
    // Controlla se esiste già un artista con questo codice fiscale
    const existingArtist = artistsDB.find(a => a.codiceFiscale === artistData.codiceFiscale);
    if (existingArtist) {
        showError('Esiste già un artista con questo codice fiscale nel database');
        return;
    }
    
    // Aggiungi nuovo artista
    artistData.id = Date.now().toString();
    artistsDB.push(artistData);
    
    // Salva database aggiornato
    try {
        localStorage.setItem('artistsDB', JSON.stringify(artistsDB));
        console.log('✅ Artista salvato:', artistData);
        
        // Mostra messaggio di successo
        showSuccess('Artista registrato con successo! Reindirizzamento...');
        
        // Reindirizza alla dashboard dopo 2 secondi
        setTimeout(() => {
            window.location.href = './index.html';
        }, 2000);
    } catch (error) {
        console.error('Errore salvataggio artista:', error);
        showError('Errore durante il salvataggio');
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}
