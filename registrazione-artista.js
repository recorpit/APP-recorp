/**
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
                
                // Estrai e compila automaticamente la data di nascita
                const extractedDate = extractDateFromCF(e.target.value);
                if (extractedDate) {
                    const dataNascitaField = document.getElementById('dataNascita');
                    dataNascitaField.value = extractedDate;
                    dataNascitaField.dispatchEvent(new Event('change'));
                    
                    // Rimuovi eventuali alert di mancata corrispondenza
                    const existingAlert = dataNascitaField.parentElement.querySelector('.cf-mismatch-alert');
                    if (existingAlert) existingAlert.remove();
                    
                    // Mostra anche il sesso estratto dal CF
                    const gender = extractGenderFromCF(e.target.value);
                    const genderText = gender === 'M' ? '(Maschio)' : '(Femmina)';
                    
                    // Rimuovi eventuale span esistente
                    const existingGender = e.target.parentElement.querySelector('.gender-display');
                    if (existingGender) existingGender.remove();
                    
                    // Aggiungi span con il sesso
                    const genderSpan = document.createElement('span');
                    genderSpan.className = 'gender-display';
                    genderSpan.style.marginLeft = '10px';
                    genderSpan.style.color = 'var(--text-muted)';
                    genderSpan.style.fontSize = '0.875rem';
                    genderSpan.textContent = genderText;
                    e.target.parentElement.appendChild(genderSpan);
                }
            } else {
                e.target.classList.remove('valid');
                e.target.classList.add('invalid');
                // Rimuovi span del sesso se presente
                const existingGender = e.target.parentElement.querySelector('.gender-display');
                if (existingGender) existingGender.remove();
            }
        } else {
            e.target.classList.remove('valid', 'invalid');
            // Rimuovi span del sesso se presente
            const existingGender = e.target.parentElement.querySelector('.gender-display');
            if (existingGender) existingGender.remove();
        }
    });
    
    // Auto-uppercase per matricola ENPALS
    document.getElementById('matricolaENPALS').addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
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
        eta: calculateAge(dataNascita),
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
