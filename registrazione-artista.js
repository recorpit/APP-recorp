// Cerca comune per codice catastale/Belfiore
function findComuneByCodCatastaleReg(codice) {
    console.log('🔍 Ricerca comune con codice Belfiore:', codice);
    
    // Usa la nuova funzione del comuni-loader
    const comuneInfo = window.GIDatabase.getComuneByCodiceBelfiore(codice);
    
    if (comuneInfo) {
        console.log('✅ Comune trovato:', comuneInfo);
        return comuneInfo;
    }
    
    // Se non trovato, potrebbe essere uno stato estero
    // Codici degli stati esteri iniziano con Z
    if (codice.startsWith('Z')) {
        console.log('🌍 Codice stato estero rilevato');
        // Lista stati esteri più comuni
        const statiEsteri = {
            'Z100': 'ALBANIA',
            'Z101': 'ANDORRA', 
            'Z102': 'AUSTRIA',
            'Z103': 'BELGIO',
            'Z104': 'BULGARIA',
            'Z107': 'DANIMARCA',
            'Z110': 'FINLANDIA',
            'Z111': 'FRANCIA',
            'Z112': 'GERMANIA',
            'Z113': 'REGNO UNITO',
            'Z114': 'GRECIA',
            'Z115': 'IRLANDA',
            'Z116': 'ISLANDA',
            'Z118': 'LUSSEMBURGO',
            'Z119': 'MALTA',
            'Z120': 'MONACO',
            'Z121': 'NORVEGIA',
            'Z122': 'PAESI BASSI',
            'Z123': 'POLONIA',
            'Z124': 'PORTOGALLO',
            'Z125': 'ROMANIA',
            'Z126': 'SAN MARINO',
            'Z127': 'SPAGNA',
            'Z128': 'SVEZIA',
            'Z129': 'SVIZZERA',
            'Z130': 'UCRAINA',
            'Z131': 'UNGHERIA',
            'Z132': 'RUSSIA',
            'Z133': 'TURCHIA',
            'Z134': 'REP. CECA',
            'Z135': 'SLOVACCHIA',
            'Z138': 'CITTÀ DEL VATICANO',
            'Z139': 'SLOVENIA',
            'Z140': 'CROAZIA',
            'Z148': 'BOSNIA-ERZEGOVINA',
            'Z149': 'MACEDONIA',
            'Z153': 'ESTONIA',
            'Z154': 'LETTONIA',
            'Z155': 'LITUANIA',
            'Z201': 'ALGERIA',
            'Z210': 'EGITTO',
            'Z217': 'ETIOPIA',
            'Z226': 'LIBIA',
            'Z229': 'MAROCCO',
            'Z243': 'NIGERIA',
            'Z252': 'SUDAFRICA',
            'Z256': 'TUNISIA',
            'Z301': 'AFGHANISTAN',
            'Z302': 'ARABIA SAUDITA',
            'Z311': 'CINA',
            'Z312': 'CIPRO',
            'Z314': 'COREA DEL SUD',
            'Z315': 'EMIRATI ARABI UNITI',
            'Z316': 'FILIPPINE',
            'Z319': 'GIAPPONE',
            'Z323': 'INDIA',
            'Z324': 'INDONESIA',
            'Z325': 'IRAN',
            'Z326': 'IRAQ',
            'Z327': 'ISRAELE',
            'Z330': 'KUWAIT',
            'Z332': 'LIBANO',
            'Z336': 'MALAYSIA',
            'Z342': 'PAKISTAN',
            'Z345': 'SINGAPORE',
            'Z346': 'SIRIA',
            'Z348': 'TAIWAN',
            'Z349': 'THAILANDIA',
            'Z352': 'VIETNAM',
            'Z401': 'ARGENTINA',
            'Z403': 'BRASILE',
            'Z404': 'CANADA',
            'Z405': 'CILE',
            'Z406': 'COLOMBIA',
            'Z409': 'CUBA',
            'Z411': 'ECUADOR',
            'Z415': 'GUATEMALA',
            'Z422': 'MESSICO',
            'Z427': 'PARAGUAY',
            'Z428': 'PERÙ',
            'Z436': 'STATI UNITI',
            'Z440': 'URUGUAY',
            'Z441': 'VENEZUELA',
            'Z501': 'AUSTRALIA',
            'Z515': 'NUOVA ZELANDA'
        };
        
        if (statiEsteri[codice]) {
            return {
                nome: statiEsteri[codice],
                provincia: 'EE' // EE = Estero
            };
        }
    }
    
    console.log('❌ Comune non trovato per codice:', codice);
    return null;
}/**
 * registrazione-artista.js
 * 
 * Script per la gestione della registrazione artisti nel sistema RECORP ALL-IN-ONE.
 * 
 * Funzionalità principali:
 * - Caricamento dinamico di province, città e CAP italiani
 * - Validazione in tempo reale dei campi del form
 * - Estrazione automatica data di nascita dal codice fiscale
 * - Controllo età minima 18 anni
 * - Controllo duplicati tramite codice fiscale
 * - Verifica corrispondenza CF-data di nascita
 * - Salvataggio artisti nel localStorage
 * 
 * NOTA SUL CODICE FISCALE:
 * Il sistema estrae automaticamente dal codice fiscale:
 * - Data di nascita (anno dalle posizioni 7-8, mese dalla 9, giorno dalle 10-11)
 * - Sesso (giorno > 40 = Femmina, altrimenti Maschio)
 * 
 * La data estratta viene automaticamente inserita nel campo data di nascita.
 * Se l'utente modifica manualmente la data, viene verificata la corrispondenza
 * con il CF e mostrato un avviso in caso di discrepanza.
 * 
 * Dipendenze:
 * - comuni-loader.js (database località italiane)
 * 
 * @author RECORP ALL-IN-ONE
 * @version 1.2
 */

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
        
        // Focus sul codice fiscale all'avvio
        document.getElementById('codiceFiscale').focus();
        // Validazione IBAN
    document.getElementById('iban').addEventListener('input', function(e) {
        // Converte in maiuscolo e rimuove spazi
        e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
        
        // Validazione visiva
        if (e.target.value.length >= 15) { // IBAN minimo
            if (validateIBAN(e.target.value)) {
                e.target.classList.remove('invalid');
                e.target.classList.add('valid');
            } else {
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
            }
        } else {
            e.target.classList.remove('valid', 'invalid');
        }
    });
}, 1500);
});

// Funzioni per menu a tendina cascata
function loadProvinces() {
    try {
        const provinceSelect = document.getElementById('provincia');
        provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        // Usa la funzione helper dal comuni-loader
        const province = window.GIDatabase.getProvince();
        
        if (province.length === 0) {
            console.error('❌ Nessuna provincia trovata nel database');
            provinceSelect.innerHTML = '<option value="">Errore: nessuna provincia disponibile</option>';
            showError('Impossibile caricare le province. Verificare i file di database.');
            return;
        }
        
        console.log(`✅ Caricate ${province.length} province dal database`);
        
        // Ordina le province per sigla
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
        const provinceSelect = document.getElementById('provincia');
        provinceSelect.innerHTML = '<option value="">Errore caricamento province</option>';
        showError('Errore nel caricamento delle province.');
    }
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
    
    // Auto-format telefono
    document.getElementById('telefono').addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^\d+]/g, '');
        // Limita a +39 seguito da 10 cifre
        if (value.startsWith('+39')) {
            value = value.substring(0, 13); // +39 + 10 cifre
        } else {
            value = value.substring(0, 10); // Solo 10 cifre
        }
        e.target.value = value;
    });
    
    // Auto-uppercase per codice fiscale
    document.getElementById('codiceFiscale').addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
        
        // Validazione real-time
        if (e.target.value.length === 16) {
            if (validateCodiceFiscale(e.target.value)) {
                e.target.classList.remove('invalid');
                e.target.classList.add('valid');
                
                // Estrai e compila automaticamente i dati dal CF
                const extractedData = extractDataFromCF(e.target.value);
                if (extractedData) {
                    // Compila data di nascita
                    if (extractedData.dataNascita) {
                        const dataNascitaField = document.getElementById('dataNascita');
                        dataNascitaField.value = extractedData.dataNascita;
                        dataNascitaField.dispatchEvent(new Event('change'));
                        
                        // Rimuovi eventuali alert di mancata corrispondenza
                        const existingAlert = dataNascitaField.parentElement.querySelector('.cf-mismatch-alert');
                        if (existingAlert) existingAlert.remove();
                    }
                    
                    // Compila sesso
                    if (extractedData.sesso) {
                        document.getElementById('sesso').value = extractedData.sesso;
                    }
                    
                    // Compila luogo di nascita se trovato
                    if (extractedData.luogoNascita) {
                        document.getElementById('luogoNascita').value = extractedData.luogoNascita;
                    }
                    
                    // Compila provincia di nascita se trovata
                    if (extractedData.provinciaNascita) {
                        document.getElementById('provinciaNascita').value = extractedData.provinciaNascita;
                    }
                    
                    // Mostra info estratte
                    showExtractedInfo(extractedData);
                }
            } else {
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
                // Rimuovi span delle info se presente
                const existingInfo = e.target.parentElement.querySelector('.cf-info-display');
                if (existingInfo) existingInfo.remove();
            }
        } else {
            e.target.classList.remove('valid', 'invalid');
            // Rimuovi span delle info se presente
            const existingInfo = e.target.parentElement.querySelector('.cf-info-display');
            if (existingInfo) existingInfo.remove();
        }
    });
    
    // Auto-uppercase per matricola ENPALS
    document.getElementById('matricolaENPALS').addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
    });
    
    // Event listener per mostrare/nascondere campo partita IVA e tipo rapporto
    document.getElementById('hasPartitaIva').addEventListener('change', function(e) {
        const partitaIvaGroup = document.getElementById('partitaIvaGroup');
        const partitaIvaField = document.getElementById('partitaIva');
        const tipoRapportoGroup = document.getElementById('tipoRapportoGroup');
        const tipoRapportoField = document.getElementById('tipoRapporto');
        
        if (e.target.value === 'si') {
            // Ha partita IVA: mostra campo P.IVA, nascondi tipo rapporto
            partitaIvaGroup.style.display = 'block';
            partitaIvaField.required = true;
            tipoRapportoGroup.style.display = 'none';
            tipoRapportoField.required = false;
            tipoRapportoField.value = ''; // Reset il valore
        } else if (e.target.value === 'no') {
            // Non ha partita IVA: nascondi P.IVA, mostra tipo rapporto
            partitaIvaGroup.style.display = 'none';
            partitaIvaField.required = false;
            partitaIvaField.value = '';
            tipoRapportoGroup.style.display = 'block';
            tipoRapportoField.required = true;
            tipoRapportoField.value = 'occasionale'; // Default a prestazione occasionale
        } else {
            // Nessuna selezione: nascondi entrambi
            partitaIvaGroup.style.display = 'none';
            partitaIvaField.required = false;
            partitaIvaField.value = '';
            tipoRapportoGroup.style.display = 'none';
            tipoRapportoField.required = false;
            tipoRapportoField.value = '';
        }
    });
    
    // Validazione partita IVA
    document.getElementById('partitaIva').addEventListener('input', function(e) {
        // Accetta solo numeri
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        
        // Validazione visiva
        if (e.target.value.length === 11) {
            if (validatePartitaIva(e.target.value)) {
                e.target.classList.remove('invalid');
                e.target.classList.add('valid');
            } else {
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
            }
        } else {
            e.target.classList.remove('valid', 'invalid');
        }
    });
    
    // Validazione real-time email
    document.getElementById('email').addEventListener('blur', function(e) {
        if (e.target.value) {
            if (validateEmail(e.target.value)) {
                e.target.classList.remove('invalid');
                e.target.classList.add('valid');
            } else {
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
            }
        } else {
            e.target.classList.remove('valid', 'invalid');
        }
    });
    
    // Event listener per mostrare/nascondere campo partita IVA
    document.getElementById('hasPartitaIva').addEventListener('change', function(e) {
        const partitaIvaGroup = document.getElementById('partitaIvaGroup');
        const partitaIvaField = document.getElementById('partitaIva');
        
        if (e.target.value === 'si') {
            partitaIvaGroup.style.display = 'block';
            partitaIvaField.required = true;
        } else {
            partitaIvaGroup.style.display = 'none';
            partitaIvaField.required = false;
            partitaIvaField.value = '';
        }
    });
    
    // Validazione partita IVA
    document.getElementById('partitaIva').addEventListener('input', function(e) {
        // Accetta solo numeri
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        
        // Validazione visiva
        if (e.target.value.length === 11) {
            if (validatePartitaIva(e.target.value)) {
                e.target.classList.remove('invalid');
                e.target.classList.add('valid');
            } else {
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
            }
        } else {
            e.target.classList.remove('valid', 'invalid');
        }
    });
    
    // Auto-uppercase per provincia nascita
    document.getElementById('provinciaNascita').addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase().substring(0, 2);
    });
    
    // Validazione IBAN
    document.getElementById('iban').addEventListener('input', function(e) {
        // Converte in maiuscolo e rimuove spazi
        e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
        
        // Validazione visiva
        if (e.target.value.length >= 15) { // IBAN minimo
            if (validateIBAN(e.target.value)) {
                e.target.classList.remove('invalid');
                e.target.classList.add('valid');
            } else {
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
            }
        } else {
            e.target.classList.remove('valid', 'invalid');
        }
    });
    
    // Mostra età quando viene selezionata la data di nascita
    document.getElementById('dataNascita').addEventListener('change', function(e) {
        if (e.target.value) {
            const age = calculateAge(e.target.value);
            const ageText = age >= 18 ? `(${age} anni) ✓` : `(${age} anni) ❌ Minimo 18 anni`;
            
            // Rimuovi eventuale span esistente
            const existingSpan = e.target.parentElement.querySelector('.age-display');
            if (existingSpan) existingSpan.remove();
            
            // Aggiungi nuovo span con l'età
            const ageSpan = document.createElement('span');
            ageSpan.className = 'age-display';
            ageSpan.style.marginLeft = '10px';
            ageSpan.style.color = age >= 18 ? 'var(--success)' : 'var(--danger)';
            ageSpan.textContent = ageText;
            e.target.parentElement.appendChild(ageSpan);
            
            // Verifica corrispondenza con codice fiscale
            const cf = document.getElementById('codiceFiscale').value;
            if (cf.length === 16) {
                if (!validateCFWithDate(cf, e.target.value)) {
                    // Rimuovi eventuale alert esistente
                    const existingAlert = e.target.parentElement.querySelector('.cf-mismatch-alert');
                    if (existingAlert) existingAlert.remove();
                    
                    // Aggiungi alert di mancata corrispondenza
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'cf-mismatch-alert alert alert-warning';
                    alertDiv.style.marginTop = '0.5rem';
                    alertDiv.style.padding = '0.5rem';
                    alertDiv.style.fontSize = '0.875rem';
                    alertDiv.textContent = '⚠️ La data non corrisponde al codice fiscale';
                    e.target.parentElement.appendChild(alertDiv);
                    
                    e.target.classList.add('invalid');
                } else {
                    // Rimuovi alert se presente
                    const existingAlert = e.target.parentElement.querySelector('.cf-mismatch-alert');
                    if (existingAlert) existingAlert.remove();
                    e.target.classList.remove('invalid');
                }
            }
        }
    });
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
    capSelect.innerHTML = '<option value="">Caricamento CAP...</option>';
    
    try {
        // Usa la funzione helper dal comuni-loader
        const capList = window.GIDatabase.getCapByComune(codiceIstat);
        
        console.log(`📮 CAP trovati per ${codiceIstat}:`, capList);
        
        if (capList.length === 0) {
            // Prova a recuperare il CAP dai dati del comune
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
        
        // Popola la select con i CAP trovati
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

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Raccogli i dati del form
    const formData = new FormData(e.target);
    const dataNascita = formData.get('dataNascita');
    
    const artistData = {
        nome: formData.get('nome').toUpperCase(),
        cognome: formData.get('cognome').toUpperCase(),
        nomeArte: formData.get('nomeArte'),
        codiceFiscale: formData.get('codiceFiscale').toUpperCase(),
        matricolaENPALS: formData.get('matricolaENPALS')?.toUpperCase() || '',
        dataNascita: dataNascita,
        sesso: formData.get('sesso') || '',
        luogoNascita: formData.get('luogoNascita') || '',
        provinciaNascita: formData.get('provinciaNascita')?.toUpperCase() || '',
        eta: calculateAge(dataNascita),
        nazionalita: formData.get('nazionalita'),
        telefono: formData.get('telefono'),
        email: formData.get('email'),
        indirizzo: formData.get('indirizzo'),
        provincia: formData.get('provincia'),
        citta: document.querySelector('#citta option:checked')?.textContent || '',
        cap: formData.get('cap'),
        codiceIstatCitta: formData.get('citta'), // Salva anche il codice ISTAT
        hasPartitaIva: formData.get('hasPartitaIva'),
        partitaIva: formData.get('hasPartitaIva') === 'si' ? formData.get('partitaIva') : '',
        tipoRapporto: formData.get('hasPartitaIva') === 'no' ? formData.get('tipoRapporto') : '',
        iban: formData.get('iban').toUpperCase().replace(/\s/g, ''),
        mansione: formData.get('mansione'),
        note: formData.get('note'),
        dataRegistrazione: new Date().toISOString()
    };
    
    // Validazione base
    if (!validateCodiceFiscale(artistData.codiceFiscale)) {
        showError('Codice fiscale non valido');
        return;
    }
    
    if (!validateEmail(artistData.email)) {
        showError('Email non valida');
        return;
    }
    
    if (!validatePhone(artistData.telefono)) {
        showError('Numero di telefono non valido (inserire 10 cifre)');
        return;
    }
    
    // Verifica età minima (18 anni)
    if (artistData.eta < 18) {
        showError('L\'artista deve avere almeno 18 anni');
        return;
    }
    
    // Verifica che la data di nascita non sia nel futuro
    if (new Date(dataNascita) > new Date()) {
        showError('La data di nascita non può essere nel futuro');
        return;
    }
    
    // Verifica corrispondenza tra codice fiscale e data di nascita
    if (!validateCFWithDate(artistData.codiceFiscale, artistData.dataNascita)) {
        showError('La data di nascita non corrisponde al codice fiscale');
        return;
    }
    
    // Verifica IBAN
    if (!validateIBAN(artistData.iban)) {
        showError('IBAN non valido');
        return;
    }
    
    // Verifica partita IVA se presente
    if (artistData.hasPartitaIva === 'si' && !validatePartitaIva(artistData.partitaIva)) {
        showError('Partita IVA non valida');
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

// Estrae il sesso dal codice fiscale
function extractGenderFromCF(cf) {
    if (!cf || cf.length < 11) return null;
    
    const dayCode = parseInt(cf.substring(9, 11));
    return dayCode > 40 ? 'F' : 'M';
}

// Estrae tutti i dati possibili dal codice fiscale
function extractDataFromCF(cf) {
    if (!cf || cf.length !== 16) return null;
    
    const data = {};
    
    // Estrai data di nascita
    data.dataNascita = extractDateFromCF(cf);
    
    // Estrai sesso
    data.sesso = extractGenderFromCF(cf);
    
    // Estrai codice catastale del comune
    const codiceCatastale = cf.substring(11, 15);
    
    // Cerca il comune di nascita (richiede un database dei codici catastali)
    const comuneInfo = findComuneByCodCatastaleReg(codiceCatastale);
    if (comuneInfo) {
        data.luogoNascita = comuneInfo.nome;
        data.provinciaNascita = comuneInfo.provincia;
    }
    
    return data;
}

// Cerca comune per codice catastale
function findComuneByCodCatastalerEG(codice) {
    console.log('🔍 Ricerca comune con codice catastale:', codice);
    
    // Verifica se abbiamo i dati dei comuni
    const comuni = window.GIDatabase?.getData()?.comuni || [];
    console.log('📊 Totale comuni nel database:', comuni.length);
    
    // Debug: mostra i campi disponibili nel primo comune
    if (comuni.length > 0) {
        console.log('🔍 Campi disponibili nel primo comune:', Object.keys(comuni[0]));
    }
    
    // Cerca il comune con il codice catastale corrispondente
    const comune = comuni.find(c => {
        return c.codice_catastale === codice || 
               c.codiceCatastale === codice ||
               c.codice_belfiore === codice ||
               c.codiceBelfiore === codice ||
               c.belfiore === codice ||
               c.cod_catastale === codice;
    });
    
    if (comune) {
        console.log('✅ Comune trovato:', comune);
        return {
            nome: comune.denominazione_ita || comune.denominazione || comune.nome,
            provincia: comune.sigla_provincia || comune.provincia || comune.siglaProvincia
        };
    }
    
    // Se non trovato nei comuni italiani, potrebbe essere uno stato estero
    // Codici degli stati esteri iniziano con Z
    if (codice.startsWith('Z')) {
        console.log('🌍 Codice stato estero rilevato');
        // Lista stati esteri più comuni
        const statiEsteri = {
            'Z100': 'ALBANIA',
            'Z101': 'ANDORRA',
            'Z102': 'AUSTRIA',
            'Z103': 'BELGIO',
            'Z104': 'BULGARIA',
            'Z107': 'DANIMARCA',
            'Z110': 'FINLANDIA',
            'Z111': 'FRANCIA',
            'Z112': 'GERMANIA',
            'Z113': 'REGNO UNITO',
            'Z114': 'GRECIA',
            'Z115': 'IRLANDA',
            'Z116': 'ISLANDA',
            'Z118': 'LUSSEMBURGO',
            'Z119': 'MALTA',
            'Z120': 'MONACO',
            'Z121': 'NORVEGIA',
            'Z122': 'PAESI BASSI',
            'Z123': 'POLONIA',
            'Z124': 'PORTOGALLO',
            'Z125': 'ROMANIA',
            'Z126': 'SAN MARINO',
            'Z127': 'SPAGNA',
            'Z128': 'SVEZIA',
            'Z129': 'SVIZZERA',
            'Z130': 'UCRAINA',
            'Z131': 'UNGHERIA',
            'Z132': 'RUSSIA',
            'Z133': 'TURCHIA',
            'Z134': 'REP. CECA',
            'Z135': 'SLOVACCHIA',
            'Z138': 'CITTÀ DEL VATICANO',
            'Z139': 'SLOVENIA',
            'Z140': 'CROAZIA',
            'Z148': 'BOSNIA-ERZEGOVINA',
            'Z149': 'MACEDONIA',
            'Z153': 'ESTONIA',
            'Z154': 'LETTONIA',
            'Z155': 'LITUANIA',
            'Z156': 'SERBIA',
            'Z157': 'MONTENEGRO',
            'Z158': 'KOSOVO',
            'Z201': 'ALGERIA',
            'Z202': 'ANGOLA',
            'Z210': 'EGITTO',
            'Z217': 'ETIOPIA',
            'Z226': 'LIBIA',
            'Z229': 'MAROCCO',
            'Z243': 'NIGERIA',
            'Z248': 'SEYCHELLES',
            'Z251': 'SOMALIA',
            'Z252': 'SUDAFRICA',
            'Z256': 'TUNISIA',
            'Z301': 'AFGHANISTAN',
            'Z302': 'ARABIA SAUDITA',
            'Z304': 'BAHREIN',
            'Z305': 'BANGLADESH',
            'Z306': 'BHUTAN',
            'Z309': 'BRUNEI',
            'Z310': 'CAMBOGIA',
            'Z311': 'CINA',
            'Z312': 'CIPRO',
            'Z313': 'COREA DEL NORD',
            'Z314': 'COREA DEL SUD',
            'Z315': 'EMIRATI ARABI UNITI',
            'Z316': 'FILIPPINE',
            'Z318': 'GEORGIA',
            'Z319': 'GIAPPONE',
            'Z320': 'GIORDANIA',
            'Z322': 'HONG KONG',
            'Z323': 'INDIA',
            'Z324': 'INDONESIA',
            'Z325': 'IRAN',
            'Z326': 'IRAQ',
            'Z327': 'ISRAELE',
            'Z330': 'KUWAIT',
            'Z331': 'LAOS',
            'Z332': 'LIBANO',
            'Z335': 'MALDIVE',
            'Z336': 'MALAYSIA',
            'Z338': 'MONGOLIA',
            'Z339': 'MYANMAR',
            'Z340': 'NEPAL',
            'Z341': 'OMAN',
            'Z342': 'PAKISTAN',
            'Z343': 'PALESTINA',
            'Z344': 'QATAR',
            'Z345': 'SINGAPORE',
            'Z346': 'SIRIA',
            'Z347': 'SRI LANKA',
            'Z348': 'TAIWAN',
            'Z349': 'THAILANDIA',
            'Z351': 'UZBEKISTAN',
            'Z352': 'VIETNAM',
            'Z353': 'YEMEN',
            'Z401': 'ARGENTINA',
            'Z402': 'BOLIVIA',
            'Z403': 'BRASILE',
            'Z404': 'CANADA',
            'Z405': 'CILE',
            'Z406': 'COLOMBIA',
            'Z409': 'CUBA',
            'Z410': 'DOMINICA',
            'Z411': 'ECUADOR',
            'Z413': 'GIAMAICA',
            'Z415': 'GUATEMALA',
            'Z419': 'HAITI',
            'Z421': 'HONDURAS',
            'Z422': 'MESSICO',
            'Z426': 'PANAMA',
            'Z427': 'PARAGUAY',
            'Z428': 'PERÙ',
            'Z430': 'PORTO RICO',
            'Z431': 'REP. DOMINICANA',
            'Z434': 'SALVADOR',
            'Z436': 'STATI UNITI',
            'Z440': 'URUGUAY',
            'Z441': 'VENEZUELA',
            'Z501': 'AUSTRALIA',
            'Z515': 'NUOVA ZELANDA'
        };
        
        if (statiEsteri[codice]) {
            return {
                nome: statiEsteri[codice],
                provincia: 'EE' // EE = Estero
            };
        }
    }
    
    console.log('❌ Comune non trovato per codice:', codice);
    return null;
}

// Mostra le informazioni estratte dal CF
function showExtractedInfo(data) {
    // Rimuovi eventuale span esistente
    const cfField = document.getElementById('codiceFiscale');
    const existingInfo = cfField.parentElement.querySelector('.cf-info-display');
    if (existingInfo) existingInfo.remove();
    
    // Crea testo informativo
    let infoText = 'Dati estratti: ';
    const infoParts = [];
    
    if (data.sesso) {
        infoParts.push(data.sesso === 'M' ? 'Maschio' : 'Femmina');
    }
    
    if (data.dataNascita) {
        const date = new Date(data.dataNascita);
        const dateStr = date.toLocaleDateString('it-IT');
        infoParts.push(`nato il ${dateStr}`);
    }
    
    if (data.luogoNascita) {
        let luogoText = data.luogoNascita;
        if (data.provinciaNascita) {
            luogoText += ` (${data.provinciaNascita})`;
        }
        infoParts.push(`a ${luogoText}`);
    }
    
    if (infoParts.length > 0) {
        infoText += infoParts.join(', ');
        
        // Aggiungi span con le info
        const infoSpan = document.createElement('span');
        infoSpan.className = 'cf-info-display';
        infoSpan.style.display = 'block';
        infoSpan.style.marginTop = '5px';
        infoSpan.style.color = 'var(--text-muted)';
        infoSpan.style.fontSize = '0.875rem';
        infoSpan.textContent = infoText;
        cfField.parentElement.appendChild(infoSpan);
    }
}

// Estrae la data di nascita dal codice fiscale
function extractDateFromCF(cf) {
    if (!cf || cf.length < 11) return null;
    
    // Posizioni nel CF: anno (6-7), mese (8), giorno (9-10)
    const yearCode = cf.substring(6, 8);
    const monthCode = cf.substring(8, 9);
    const dayCode = cf.substring(9, 11);
    
    // Mappa dei mesi
    const monthMap = {
        'A': '01', 'B': '02', 'C': '03', 'D': '04',
        'E': '05', 'H': '06', 'L': '07', 'M': '08',
        'P': '09', 'R': '10', 'S': '11', 'T': '12'
    };
    
    const month = monthMap[monthCode];
    if (!month) return null;
    
    // Estrai giorno (per le donne è aumentato di 40)
    let day = parseInt(dayCode);
    const isFemale = day > 40;
    if (isFemale) day -= 40;
    
    // Determina l'anno completo
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const lastCentury = currentCentury - 100;
    
    let year = parseInt(yearCode);
    // Se l'anno + secolo corrente è nel futuro, usa il secolo precedente
    if (currentCentury + year > currentYear) {
        year = lastCentury + year;
    } else {
        year = currentCentury + year;
    }
    
    // Formatta la data
    const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
    
    // Verifica che sia una data valida
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    return dateStr;
}

// Verifica che la data di nascita corrisponda al codice fiscale
function validateCFWithDate(cf, birthDate) {
    const extractedDate = extractDateFromCF(cf);
    if (!extractedDate) return false;
    
    return extractedDate === birthDate;
}

function validateEmail(email) {
    if (!email) return true; // Email è opzionale
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function validatePhone(phone) {
    if (!phone) return true; // Telefono è opzionale
    // Rimuovi spazi e caratteri non numerici (eccetto il +)
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    // Verifica formato italiano (opzionale +39, poi 10 cifre)
    const pattern = /^(\+39)?[0-9]{10}$/;
    return pattern.test(cleanPhone);
}

// Validazione IBAN
function validateIBAN(iban) {
    // Rimuovi spazi e converti in maiuscolo
    iban = iban.replace(/\s/g, '').toUpperCase();
    
    // Verifica lunghezza per paese (IT = 27 caratteri)
    const ibanLengths = {
        'AD': 24, 'AE': 23, 'AT': 20, 'AZ': 28, 'BA': 20, 'BE': 16,
        'BG': 22, 'BH': 22, 'BR': 29, 'CH': 21, 'CR': 21, 'CY': 28,
        'CZ': 24, 'DE': 22, 'DK': 18, 'DO': 28, 'EE': 20, 'ES': 24,
        'FI': 18, 'FO': 18, 'FR': 27, 'GB': 22, 'GI': 23, 'GL': 18,
        'GR': 27, 'GT': 28, 'HR': 21, 'HU': 28, 'IE': 22, 'IL': 23,
        'IS': 26, 'IT': 27, 'JO': 30, 'KW': 30, 'KZ': 20, 'LB': 28,
        'LI': 21, 'LT': 20, 'LU': 20, 'LV': 21, 'MC': 27, 'MD': 24,
        'ME': 22, 'MK': 19, 'MR': 27, 'MT': 31, 'MU': 30, 'NL': 18,
        'NO': 15, 'PK': 24, 'PL': 28, 'PS': 29, 'PT': 25, 'QA': 29,
        'RO': 24, 'RS': 22, 'SA': 24, 'SE': 24, 'SI': 19, 'SK': 24,
        'SM': 27, 'TN': 24, 'TR': 26
    };
    
    // Verifica formato base
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
        return false;
    }
    
    // Estrai codice paese
    const countryCode = iban.substring(0, 2);
    
    // Verifica lunghezza per paese
    if (ibanLengths[countryCode] && iban.length !== ibanLengths[countryCode]) {
        return false;
    }
    
    // Algoritmo di validazione IBAN
    // Sposta i primi 4 caratteri alla fine
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    
    // Converti lettere in numeri (A=10, B=11, ..., Z=35)
    let numericIBAN = '';
    for (let i = 0; i < rearranged.length; i++) {
        const char = rearranged.charAt(i);
        if (isNaN(char)) {
            numericIBAN += (char.charCodeAt(0) - 55).toString();
        } else {
            numericIBAN += char;
        }
    }
    
    // Calcola modulo 97
    let remainder = numericIBAN.substring(0, 2);
    for (let i = 2; i < numericIBAN.length; i++) {
        remainder = (parseInt(remainder) % 97) + numericIBAN.charAt(i);
    }
    
    return parseInt(remainder) % 97 === 1;
}

// Validazione Partita IVA
function validatePartitaIva(piva) {
    if (!piva || piva.length !== 11) return false;
    
    // Verifica che sia composta solo da numeri
    if (!/^\d{11}$/.test(piva)) return false;
    
    // Algoritmo di validazione partita IVA italiana
    let sum = 0;
    for (let i = 0; i < 11; i++) {
        const digit = parseInt(piva.charAt(i));
        if (i % 2 === 0) {
            sum += digit;
        } else {
            const doubled = digit * 2;
            sum += doubled > 9 ? doubled - 9 : doubled;
        }
    }
    
    return sum % 10 === 0;
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
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
        
        // Reset form
        resetForm();
        
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

// Funzione per annullare la registrazione
function cancelRegistration() {
    if (confirm('Sei sicuro di voler annullare la registrazione? I dati inseriti verranno persi.')) {
        window.location.href = './index.html';
    }
}

// Rendi la funzione disponibile globalmente
window.cancelRegistration = cancelRegistration;

// Funzione per resettare il form
function resetForm() {
    document.getElementById('registrationForm').reset();
    document.getElementById('citta').disabled = true;
    document.getElementById('cap').disabled = true;
    document.getElementById('citta').innerHTML = '<option value="">Prima seleziona la provincia</option>';
    document.getElementById('cap').innerHTML = '<option value="">Prima seleziona la città</option>';
    
    // Rimuovi eventuali span di età, sesso e alert
    const ageDisplay = document.querySelector('.age-display');
    if (ageDisplay) ageDisplay.remove();
    
    const genderDisplay = document.querySelector('.gender-display');
    if (genderDisplay) genderDisplay.remove();
    
    const cfAlert = document.querySelector('.cf-mismatch-alert');
    if (cfAlert) cfAlert.remove();
    
    // Rimuovi classi di validazione
    document.querySelectorAll('.form-control').forEach(input => {
        input.classList.remove('valid', 'invalid');
    });
}
