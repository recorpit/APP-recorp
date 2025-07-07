/**
 * modifica-artista.js
 * 
 * Script per la modifica dei dati di un artista esistente
 */

let artistId = null;
let originalArtist = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    // Ottieni l'ID dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    artistId = urlParams.get('id');
    
    if (!artistId) {
        showError('ID artista non valido');
        setTimeout(() => {
            window.location.href = './gestione-artisti.html';
        }, 2000);
        return;
    }
    
    // Mostra indicatore caricamento
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block';
    
    // Carica i dati dopo che il database è pronto
    setTimeout(() => {
        loadingIndicator.style.display = 'none';
        loadArtistData();
        loadProvinces();
        setupEventListeners();
    }, 1500);
});

// Carica i dati dell'artista
function loadArtistData() {
    try {
        const saved = localStorage.getItem('artistsDB');
        if (!saved) {
            showError('Database artisti non trovato');
            return;
        }
        
        const artistsDB = JSON.parse(saved);
        const artist = artistsDB.find(a => a.id === artistId);
        
        if (!artist) {
            showError('Artista non trovato');
            setTimeout(() => {
                window.location.href = './gestione-artisti.html';
            }, 2000);
            return;
        }
        
        originalArtist = artist;
        populateForm(artist);
        
    } catch (error) {
        console.error('Errore caricamento artista:', error);
        showError('Errore nel caricamento dei dati');
    }
}

// Popola il form con i dati dell'artista
function populateForm(artist) {
    // Dati anagrafici
    document.getElementById('codiceFiscale').value = artist.codiceFiscale;
    document.getElementById('codiceFiscale').disabled = true; // CF non modificabile
    document.getElementById('nome').value = artist.nome;
    document.getElementById('cognome').value = artist.cognome;
    document.getElementById('dataNascita').value = artist.dataNascita;
    document.getElementById('sesso').value = artist.sesso || '';
    document.getElementById('luogoNascita').value = artist.luogoNascita || '';
    document.getElementById('provinciaNascita').value = artist.provinciaNascita || '';
    document.getElementById('matricolaENPALS').value = artist.matricolaENPALS || '';
    document.getElementById('nazionalita').value = artist.nazionalita;
    document.getElementById('telefono').value = artist.telefono || '';
    document.getElementById('email').value = artist.email || '';
    document.getElementById('nomeArte').value = artist.nomeArte || '';
    
    // Indirizzo
    document.getElementById('indirizzo').value = artist.indirizzo;
    
    // Provincia, città e CAP verranno caricati dopo
    setTimeout(() => {
        if (artist.provincia) {
            document.getElementById('provincia').value = artist.provincia;
            document.getElementById('provincia').dispatchEvent(new Event('change'));
            
            // Aspetta che le città siano caricate
            setTimeout(() => {
                if (artist.codiceIstatCitta) {
                    document.getElementById('citta').value = artist.codiceIstatCitta;
                    document.getElementById('citta').dispatchEvent(new Event('change'));
                    
                    // Aspetta che i CAP siano caricati
                    setTimeout(() => {
                        if (artist.cap) {
                            document.getElementById('cap').value = artist.cap;
                        }
                    }, 500);
                }
            }, 500);
        }
    }, 500);
    
    // Dati professionali
    document.getElementById('mansione').value = artist.mansione;
    document.getElementById('hasPartitaIva').value = artist.hasPartitaIva;
    document.getElementById('hasPartitaIva').dispatchEvent(new Event('change'));
    
    if (artist.hasPartitaIva === 'si') {
        document.getElementById('partitaIva').value = artist.partitaIva;
    } else if (artist.hasPartitaIva === 'no') {
        document.getElementById('tipoRapporto').value = artist.tipoRapporto;
    }
    
    document.getElementById('iban').value = artist.iban;
    document.getElementById('note').value = artist.note || '';
}

// Setup event listeners (riutilizza la maggior parte dal file di registrazione)
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
    document.getElementById('modifyForm').addEventListener('submit', handleFormSubmit);
    
    // Auto-format telefono
    document.getElementById('telefono').addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^\d+]/g, '');
        if (value.startsWith('+39')) {
            value = value.substring(0, 13);
        } else {
            value = value.substring(0, 10);
        }
        e.target.value = value;
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
            partitaIvaGroup.style.display = 'block';
            partitaIvaField.required = true;
            tipoRapportoGroup.style.display = 'none';
            tipoRapportoField.required = false;
            tipoRapportoField.value = '';
        } else if (e.target.value === 'no') {
            partitaIvaGroup.style.display = 'none';
            partitaIvaField.required = false;
            partitaIvaField.value = '';
            tipoRapportoGroup.style.display = 'block';
            tipoRapportoField.required = true;
            if (!tipoRapportoField.value) {
                tipoRapportoField.value = 'occasionale';
            }
        } else {
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
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        
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
        e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
        
        if (e.target.value.length >= 15) {
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
    
    // Validazione email
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
            
            const existingSpan = e.target.parentElement.querySelector('.age-display');
            if (existingSpan) existingSpan.remove();
            
            const ageSpan = document.createElement('span');
            ageSpan.className = 'age-display';
            ageSpan.style.marginLeft = '10px';
            ageSpan.style.color = age >= 18 ? 'var(--success)' : 'var(--danger)';
            ageSpan.textContent = ageText;
            e.target.parentElement.appendChild(ageSpan);
        }
    });
}

// Gestisci invio form
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Raccogli i dati del form
    const formData = new FormData(e.target);
    const dataNascita = formData.get('dataNascita');
    
    const updatedArtist = {
        ...originalArtist, // Mantieni i dati originali non modificabili
        nome: formData.get('nome').toUpperCase(),
        cognome: formData.get('cognome').toUpperCase(),
        nomeArte: formData.get('nomeArte'),
        dataNascita: dataNascita,
        sesso: formData.get('sesso') || '',
        luogoNascita: formData.get('luogoNascita') || '',
        provinciaNascita: formData.get('provinciaNascita')?.toUpperCase() || '',
        eta: calculateAge(dataNascita),
        matricolaENPALS: formData.get('matricolaENPALS')?.toUpperCase() || '',
        nazionalita: formData.get('nazionalita'),
        telefono: formData.get('telefono'),
        email: formData.get('email'),
        indirizzo: formData.get('indirizzo'),
        provincia: formData.get('provincia'),
        citta: document.querySelector('#citta option:checked')?.textContent || '',
        cap: formData.get('cap'),
        codiceIstatCitta: formData.get('citta'),
        hasPartitaIva: formData.get('hasPartitaIva'),
        partitaIva: formData.get('hasPartitaIva') === 'si' ? formData.get('partitaIva') : '',
        tipoRapporto: formData.get('hasPartitaIva') === 'no' ? formData.get('tipoRapporto') : '',
        iban: formData.get('iban').toUpperCase().replace(/\s/g, ''),
        mansione: formData.get('mansione'),
        note: formData.get('note'),
        dataUltimaModifica: new Date().toISOString()
    };
    
    // Validazioni
    if (!validateEmail(updatedArtist.email)) {
        showError('Email non valida');
        return;
    }
    
    if (!validatePhone(updatedArtist.telefono)) {
        showError('Numero di telefono non valido (inserire 10 cifre)');
        return;
    }
    
    // Verifica età minima (18 anni)
    if (updatedArtist.eta < 18) {
        showError('L\'artista deve avere almeno 18 anni');
        return;
    }
    
    // Verifica IBAN
    if (!validateIBAN(updatedArtist.iban)) {
        showError('IBAN non valido');
        return;
    }
    
    // Verifica partita IVA se presente
    if (updatedArtist.hasPartitaIva === 'si' && !validatePartitaIva(updatedArtist.partitaIva)) {
        showError('Partita IVA non valida');
        return;
    }
    
    // Salva nel database locale
    updateArtist(updatedArtist);
}

// Aggiorna artista nel database
function updateArtist(updatedArtist) {
    try {
        const saved = localStorage.getItem('artistsDB');
        let artistsDB = saved ? JSON.parse(saved) : [];
        
        // Trova l'indice dell'artista da aggiornare
        const index = artistsDB.findIndex(a => a.id === artistId);
        
        if (index === -1) {
            showError('Artista non trovato nel database');
            return;
        }
        
        // Aggiorna l'artista
        artistsDB[index] = updatedArtist;
        
        // Salva nel localStorage
        localStorage.setItem('artistsDB', JSON.stringify(artistsDB));
        console.log('✅ Artista aggiornato:', updatedArtist);
        
        // Mostra messaggio di successo
        showSuccess('Artista aggiornato con successo! Reindirizzamento...');
        
        // Reindirizza dopo 2 secondi
        setTimeout(() => {
            window.location.href = './gestione-artisti.html';
        }, 2000);
        
    } catch (error) {
        console.error('Errore aggiornamento artista:', error);
        showError('Errore durante l\'aggiornamento');
    }
}

// Funzioni di utilità (importate dal file di registrazione)
function loadProvinces() {
    try {
        const provinceSelect = document.getElementById('provincia');
        provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        const province = window.GIDatabase.getProvince();
        
        if (province.length === 0) {
            console.error('❌ Nessuna provincia trovata nel database');
            return;
        }
        
        province.sort((a, b) => {
            if (!a.sigla || !b.sigla) return 0;
            return a.sigla.localeCompare(b.sigla);
        });
        
        province.forEach(p => {
            const option = document.createElement('option');
            option.value = p.sigla;
            option.textContent = `${p.sigla} - ${p.nome}`;
            provinceSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Errore caricamento province:', error);
    }
}

function loadCitta(provincia) {
    const cittaSelect = document.getElementById('citta');
    cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
    
    try {
        const comuni = window.GIDatabase.getComuniByProvincia(provincia);
        
        if (comuni.length === 0) {
            cittaSelect.innerHTML = '<option value="">Nessuna città trovata</option>';
            return;
        }
        
        comuni.sort((a, b) => {
            const nomeA = a.denominazione_ita || a.denominazione || a.nome || '';
            const nomeB = b.denominazione_ita || b.denominazione || b.nome || '';
            return nomeA.localeCompare(nomeB);
        });
        
        comuni.forEach(comune => {
            const option = document.createElement('option');
            option.value = comune.codice_istat || comune.codiceIstat || comune.codice;
            option.textContent = comune.denominazione_ita || comune.denominazione || comune.nome;
            option.setAttribute('data-comune', JSON.stringify(comune));
            cittaSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Errore caricamento città:', error);
        cittaSelect.innerHTML = '<option value="">Errore caricamento città</option>';
    }
}

function loadCAP(codiceIstat) {
    const capSelect = document.getElementById('cap');
    capSelect.innerHTML = '<option value="">Caricamento CAP...</option>';
    
    try {
        const capList = window.GIDatabase.getCapByComune(codiceIstat);
        
        if (capList.length === 0) {
            const selectedOption = document.querySelector(`#citta option[value="${codiceIstat}"]`);
            if (selectedOption) {
                const comuneData = JSON.parse(selectedOption.getAttribute('data-comune'));
                if (comuneData.cap) {
                    capList.push(comuneData.cap);
                }
            }
        }
        
        if (capList.length === 0) {
            capSelect.innerHTML = '<option value="">CAP non trovato</option>';
            return;
        }
        
        capSelect.innerHTML = '<option value="">Seleziona CAP...</option>';
        
        if (capList.length === 1) {
            const option = document.createElement('option');
            option.value = capList[0];
            option.textContent = capList[0];
            option.selected = true;
            capSelect.appendChild(option);
        } else {
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

// Funzioni di validazione
function validateEmail(email) {
    if (!email) return true;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function validatePhone(phone) {
    if (!phone) return true;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const pattern = /^(\+39)?[0-9]{10}$/;
    return pattern.test(cleanPhone);
}

function validatePartitaIva(piva) {
    if (!piva || piva.length !== 11) return false;
    if (!/^\d{11}$/.test(piva)) return false;
    
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

function validateIBAN(iban) {
    iban = iban.replace(/\s/g, '').toUpperCase();
    
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
        return false;
    }
    
    const ibanLengths = {
        'IT': 27, 'DE': 22, 'FR': 27, 'ES': 24, 'GB': 22
        // Aggiungi altri paesi se necessario
    };
    
    const countryCode = iban.substring(0, 2);
    if (ibanLengths[countryCode] && iban.length !== ibanLengths[countryCode]) {
        return false;
    }
    
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    let numericIBAN = '';
    
    for (let i = 0; i < rearranged.length; i++) {
        const char = rearranged.charAt(i);
        if (isNaN(char)) {
            numericIBAN += (char.charCodeAt(0) - 55).toString();
        } else {
            numericIBAN += char;
        }
    }
    
    let remainder = numericIBAN.substring(0, 2);
    for (let i = 2; i < numericIBAN.length; i++) {
        remainder = (parseInt(remainder) % 97) + numericIBAN.charAt(i);
    }
    
    return parseInt(remainder) % 97 === 1;
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

// Funzioni UI
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

function cancelModify() {
    if (confirm('Sei sicuro di voler annullare? Le modifiche non salvate verranno perse.')) {
        window.location.href = './gestione-artisti.html';
    }
}

// Rendi la funzione disponibile globalmente
window.cancelModify = cancelModify;
