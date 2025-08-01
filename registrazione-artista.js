/**
 * registrazione-artista.js - VERSIONE CORRETTA PER SCHEMA SUPABASE
 * 
 * Script per la gestione della registrazione e modifica artisti nel sistema RECORP ALL-IN-ONE.
 * Allineato con lo schema database Supabase fornito.
 * 
 * @author RECORP ALL-IN-ONE
 * @version 5.0 - Allineato con schema Supabase
 */

// Import Supabase DatabaseService
import { DatabaseService } from './supabase-config.js';

// Variabili globali
let currentMode = null; // 'new' o 'edit'
let currentArtistId = null; // ID dell'artista in modifica
let allArtists = []; // Cache degli artisti

// Lista completa dei paesi esteri (uguale a prima)
const PAESI_ESTERI = [
    { codice: 'AF', nome: 'AFGHANISTAN' },
    { codice: 'AL', nome: 'ALBANIA' },
    // ... resto della lista paesi
];

// Paesi UE (Unione Europea)
const PAESI_UE = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// Inizializzazione sistema registrazione artista
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema gestione artisti...');
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = '⌛ Inizializzazione sistema e database...';
    }
    
    // Aspetta che il database GI sia caricato
    let attempts = 0;
    const maxAttempts = 20;
    
    while (!window.GIDatabase?.isLoaded() && attempts < maxAttempts) {
        console.log(`⏳ Attesa caricamento database GI... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    if (window.GIDatabase?.isLoaded()) {
        console.log('✅ Database GI caricato con successo');
    } else {
        console.error('❌ Timeout caricamento database GI');
    }
    
    // Inizializza sistema con Supabase
    const systemReady = await initializeRegistrationSystem();
    
    if (!systemReady) {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = '❌ Errore connessione database';
            loadingIndicator.style.backgroundColor = '#fee2e2';
            loadingIndicator.style.color = '#991b1b';
        }
        return;
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    loadProvinces();
    setupEventListeners();
    
    // Setup event listeners per i pulsanti
    setupModeButtons();
});

// Setup dei pulsanti di modalità
function setupModeButtons() {
    const newModeCard = document.getElementById('newModeCard');
    const editModeCard = document.getElementById('editModeCard');
    const backToModeBtn = document.getElementById('backToModeBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (newModeCard) {
        newModeCard.addEventListener('click', () => selectMode('new'));
    }
    
    if (editModeCard) {
        editModeCard.addEventListener('click', () => selectMode('edit'));
    }
    
    if (backToModeBtn) {
        backToModeBtn.addEventListener('click', goBackToModeSelection);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelRegistration);
    }
}

// Inizializzazione con Supabase
async function initializeRegistrationSystem() {
    try {
        console.log('🔗 Test connessione database...');
        
        // Test connessione e carica artisti con timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout connessione database')), 10000)
        );
        
        const dataPromise = DatabaseService.getAllArtisti();
        allArtists = await Promise.race([dataPromise, timeoutPromise]);
        
        console.log('✅ Sistema gestione artisti pronto! Database contiene:', allArtists.length, 'artisti');
        return true;
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema:', error);
        showError(`Errore di connessione al database: ${error.message}`);
        return false;
    }
}

// ==================== GESTIONE MODALITÀ ====================

function selectMode(mode) {
    currentMode = mode;
    
    const modeSelection = document.getElementById('modeSelection');
    const artistSelection = document.getElementById('artistSelection');
    const registrationForm = document.getElementById('registrationForm');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    if (mode === 'new') {
        modeSelection.style.display = 'none';
        artistSelection.style.display = 'none';
        registrationForm.style.display = 'block';
        
        pageTitle.textContent = 'Registrazione Nuovo Artista';
        pageSubtitle.textContent = 'Inserisci i dati dell\'artista per aggiungerlo al database';
        
        document.getElementById('submitText').textContent = 'Registra Artista';
        
        resetForm();
        currentArtistId = null;
        
        setTimeout(() => {
            const cfField = document.getElementById('codiceFiscale');
            if (cfField) cfField.focus();
        }, 100);
        
    } else if (mode === 'edit') {
        modeSelection.style.display = 'none';
        artistSelection.style.display = 'block';
        registrationForm.style.display = 'none';
        
        pageTitle.textContent = 'Modifica Artista Esistente';
        pageSubtitle.textContent = 'Seleziona l\'artista da modificare';
        
        displayArtistsForSelection();
    }
}

function goBackToModeSelection() {
    currentMode = null;
    currentArtistId = null;
    
    const modeSelection = document.getElementById('modeSelection');
    const artistSelection = document.getElementById('artistSelection');
    const registrationForm = document.getElementById('registrationForm');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    modeSelection.style.display = 'block';
    artistSelection.style.display = 'none';
    registrationForm.style.display = 'none';
    
    pageTitle.textContent = 'Gestione Artisti';
    pageSubtitle.textContent = 'Scegli un\'azione da eseguire';
    
    resetForm();
}

// ==================== COSTRUZIONE DATI ARTISTA - ALLINEATA AL DATABASE ====================

function buildArtistData(formData) {
    const nazionalita = formData.get('nazionalita');
    const codiceFiscale = formData.get('codiceFiscale')?.toUpperCase() || '';
    
    // MAPPATURA CORRETTA SECONDO LO SCHEMA SUPABASE
    const artistData = {
        // Dati anagrafici - NOMI CAMPO CORRETTI
        nome: formData.get('nome')?.toUpperCase() || '',
        cognome: formData.get('cognome')?.toUpperCase() || '',
        nome_arte: formData.get('nomeArte') || null,
        codice_fiscale: codiceFiscale || null,
        matricola_enpals: formData.get('matricolaENPALS')?.toUpperCase() || null,
        data_nascita: formData.get('dataNascita'),
        sesso: formData.get('sesso') || null,
        luogo_nascita: formData.get('luogoNascita') || null,
        provincia_nascita: formData.get('provinciaNascita')?.toUpperCase() || null,
        nazionalita: nazionalita,
        telefono: formData.get('telefono') || null,
        email: formData.get('email') || null,
        
        // Indirizzo - NOMI CAMPO CORRETTI
        indirizzo: formData.get('indirizzo'),
        
        // Dati professionali - NOMI CAMPO CORRETTI
        mansione: formData.get('mansione'),
        has_partita_iva: formData.get('hasPartitaIva') === 'si',
        partita_iva: formData.get('hasPartitaIva') === 'si' ? formData.get('partitaIva') : null,
        tipo_rapporto: formData.get('hasPartitaIva') === 'no' ? formData.get('tipoRapporto') : null,
        codice_comunicazione: formData.get('codiceComunicazione') || null,
        iban: formData.get('iban')?.toUpperCase().replace(/\s/g, ''),
        note: formData.get('note') || null,
        
        // Campi per gestione indirizzo in base alla nazionalità
        provincia: null,
        citta: null,           // Campo citta nel DB
        citta_nome: null,      // Campo citta_nome nel DB  
        codice_istat_citta: null,
        cap: null,
        paese_residenza: null
    };
    
    // Gestione indirizzo basata sulla nazionalità
    if (nazionalita === 'IT') {
        // Artista italiano
        artistData.provincia = formData.get('provincia');
        artistData.cap = formData.get('cap');
        artistData.codice_istat_citta = formData.get('citta');
        artistData.paese_residenza = 'IT';
        
        // Ottieni il nome della città dal select option
        const cittaOption = document.querySelector('#citta option:checked');
        if (cittaOption) {
            artistData.citta = cittaOption.textContent;
            artistData.citta_nome = cittaOption.textContent; // Ridondante ma secondo lo schema
        }
        
    } else {
        // Artista straniero
        const paeseResidenza = formData.get('paeseResidenza');
        const paiseName = document.querySelector('#paeseResidenza option:checked')?.textContent || '';
        
        artistData.provincia = 'EE'; // EE = Estero
        artistData.citta = paiseName;
        artistData.citta_nome = paiseName;
        artistData.cap = '00000';
        artistData.codice_istat_citta = null;
        artistData.paese_residenza = paeseResidenza;
    }
    
    return artistData;
}

// ==================== POPULATE FORM - ALLINEATA AL DATABASE ====================

async function populateFormWithArtist(artist) {
    try {
        console.log('📝 Popolamento form con dati artista:', artist);
        
        // Dati anagrafici - MAPPATURA CORRETTA
        document.getElementById('codiceFiscale').value = artist.codice_fiscale || '';
        document.getElementById('nome').value = artist.nome || '';
        document.getElementById('cognome').value = artist.cognome || '';
        document.getElementById('nomeArte').value = artist.nome_arte || '';
        document.getElementById('dataNascita').value = artist.data_nascita || '';
        document.getElementById('sesso').value = artist.sesso || '';
        document.getElementById('luogoNascita').value = artist.luogo_nascita || '';
        document.getElementById('provinciaNascita').value = artist.provincia_nascita || '';
        document.getElementById('matricolaENPALS').value = artist.matricola_enpals || '';
        document.getElementById('nazionalita').value = artist.nazionalita || 'IT';
        document.getElementById('telefono').value = artist.telefono || '';
        document.getElementById('email').value = artist.email || '';
        
        // Aggiorna requisito CF
        updateCodiceFiscaleRequirement();
        
        // Indirizzo
        document.getElementById('indirizzo').value = artist.indirizzo || '';
        
        // Aspetta che le province siano caricate
        await ensureProvincesLoaded();
        await populateAddressFields(artist);
        
    } catch (error) {
        console.error('❌ Errore popolamento form:', error);
        showError('Errore nel caricamento dei dati dell\'artista: ' + error.message);
    }
}

// Funzione per assicurare il caricamento delle province
async function ensureProvincesLoaded() {
    const provinciaSelect = document.getElementById('provincia');
    
    if (provinciaSelect.options.length > 1) {
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        const checkLoaded = () => {
            if (provinciaSelect.options.length > 1) {
                resolve();
            } else {
                setTimeout(checkLoaded, 100);
            }
        };
        
        loadProvinces();
        setTimeout(() => reject(new Error('Timeout caricamento province')), 5000);
        checkLoaded();
    });
}

// Popolamento campi indirizzo
async function populateAddressFields(artist) {
    console.log('📍 Popolamento campi indirizzo per:', {
        nazionalita: artist.nazionalita,
        provincia: artist.provincia,
        citta: artist.citta,
        paese_residenza: artist.paese_residenza
    });
    
    if (artist.nazionalita === 'IT' || !artist.nazionalita || artist.provincia !== 'EE') {
        // Artista italiano
        showItalianAddressFields();
        
        if (artist.provincia && artist.provincia !== 'EE') {
            console.log('🏛️ Seleziono provincia:', artist.provincia);
            const provinciaSelect = document.getElementById('provincia');
            
            const optionExists = Array.from(provinciaSelect.options).some(opt => opt.value === artist.provincia);
            
            if (optionExists) {
                provinciaSelect.value = artist.provincia;
                loadCitta(artist.provincia);
                
                setTimeout(() => {
                    const cittaSelect = document.getElementById('citta');
                    
                    // Prova con codice ISTAT prima, poi con nome città
                    if (artist.codice_istat_citta) {
                        cittaSelect.value = artist.codice_istat_citta;
                    } else if (artist.citta) {
                        const cittaOption = Array.from(cittaSelect.options).find(opt => 
                            opt.textContent === artist.citta || 
                            opt.textContent.toLowerCase() === artist.citta.toLowerCase()
                        );
                        if (cittaOption) {
                            cittaSelect.value = cittaOption.value;
                        }
                    }
                    
                    if (cittaSelect.value) {
                        loadCAP(cittaSelect.value);
                        
                        setTimeout(() => {
                            if (artist.cap && artist.cap !== '00000') {
                                const capSelect = document.getElementById('cap');
                                if (capSelect.options.length === 2) {
                                    capSelect.selectedIndex = 1;
                                } else {
                                    capSelect.value = artist.cap;
                                }
                            }
                        }, 500);
                    }
                }, 1000);
            }
        }
    } else {
        // Artista straniero
        showForeignAddressFields();
        
        const paeseResidenzaGroup = document.getElementById('paeseResidenzaGroup');
        if (paeseResidenzaGroup) {
            paeseResidenzaGroup.style.display = 'block';
            loadPaesiEsteri(artist.nazionalita);
            
            setTimeout(() => {
                if (artist.paese_residenza) {
                    document.getElementById('paeseResidenza').value = artist.paese_residenza;
                }
            }, 500);
        }
    }
    
    // Completa popolamento dati professionali
    continueProfessionalDataPopulation(artist);
}

// Continua popolamento dati professionali
function continueProfessionalDataPopulation(artist) {
    document.getElementById('mansione').value = artist.mansione || '';
    document.getElementById('hasPartitaIva').value = artist.has_partita_iva ? 'si' : 'no';
    
    if (artist.has_partita_iva) {
        document.getElementById('partitaIva').value = artist.partita_iva || '';
        showPartitaIvaFields();
    } else {
        document.getElementById('tipoRapporto').value = artist.tipo_rapporto || 'occasionale';
        
        if (artist.codice_comunicazione) {
            document.getElementById('codiceComunicazione').value = artist.codice_comunicazione;
        }
        
        showTipoRapportoFields();
        
        if (artist.tipo_rapporto === 'chiamata') {
            showCodiceComunicazioneField();
        }
    }
    
    document.getElementById('iban').value = artist.iban || '';
    document.getElementById('note').value = artist.note || '';
    
    console.log('✅ Form popolato con dati artista:', artist.nome, artist.cognome);
}

// ==================== SALVATAGGIO - ALLINEATO AL DATABASE ====================

async function saveArtist(artistData) {
    const loadingIndicator = showLoadingIndicator('Salvataggio in corso...');
    
    try {
        console.log('💾 Tentativo salvataggio artista:', artistData.nome, artistData.cognome);
        
        // Controlla duplicati solo per nuove registrazioni
        if (currentMode === 'new' && artistData.codice_fiscale) {
            const existing = await DatabaseService.searchArtisti(artistData.codice_fiscale);
            if (existing && existing.length > 0) {
                const existingArtist = existing.find(a => a.codice_fiscale === artistData.codice_fiscale);
                if (existingArtist) {
                    throw new Error('Esiste già un artista con questo codice fiscale nel database');
                }
            }
        }
        
        // Genera ID temporaneo per stranieri senza CF
        if (!artistData.codice_fiscale && artistData.nazionalita !== 'IT') {
            artistData.codice_fiscale_temp = generateTempId(artistData);
            artistData.note = addSystemNote(artistData.note, `ID temporaneo: ${artistData.codice_fiscale_temp}`);
        }
        
        // Salva con retry logic
        const savedArtist = await saveWithRetry(() => DatabaseService.saveArtist(artistData));
        console.log('✅ Artista salvato con successo:', savedArtist);
        
        allArtists.push(savedArtist);
        
        showSuccess('Artista registrato con successo! Reindirizzamento...');
        resetForm();
        
        setTimeout(() => window.location.href = './index.html', 2000);
        
    } catch (error) {
        console.error('❌ Errore salvataggio artista:', error);
        handleDatabaseError(error);
    } finally {
        hideLoadingIndicator(loadingIndicator);
    }
}

// Aggiornamento artista esistente
async function updateArtist(artistId, artistData) {
    const loadingIndicator = showLoadingIndicator('Aggiornamento in corso...');
    
    try {
        console.log('✏️ Tentativo aggiornamento artista:', artistData.nome, artistData.cognome);
        
        // Genera ID temporaneo se necessario
        if (!artistData.codice_fiscale && artistData.nazionalita !== 'IT' && !artistData.codice_fiscale_temp) {
            artistData.codice_fiscale_temp = generateTempId(artistData);
            
            if (!artistData.note?.includes('ID temporaneo')) {
                artistData.note = addSystemNote(artistData.note, `CF rimosso - ID temporaneo: ${artistData.codice_fiscale_temp}`);
            }
        }
        
        // Aggiorna con retry logic
        const updatedArtist = await saveWithRetry(() => DatabaseService.updateArtist(artistId, artistData));
        console.log('✅ Artista aggiornato con successo:', updatedArtist);
        
        // Aggiorna cache
        const index = allArtists.findIndex(a => a.id === artistId);
        if (index !== -1) {
            allArtists[index] = updatedArtist;
        }
        
        showSuccess('Artista modificato con successo! Reindirizzamento...');
        resetForm();
        
        setTimeout(() => window.location.href = './index.html', 2000);
        
    } catch (error) {
        console.error('❌ Errore aggiornamento artista:', error);
        handleDatabaseError(error);
    } finally {
        hideLoadingIndicator(loadingIndicator);
    }
}

// ==================== FUNZIONI HELPER ====================

function generateTempId(artistData) {
    const timestamp = Date.now();
    const prefix = (artistData.nome?.substring(0, 3) || 'XXX').toUpperCase() + 
                  (artistData.cognome?.substring(0, 3) || 'XXX').toUpperCase();
    return `TEMP_${prefix}_${timestamp}`;
}

function addSystemNote(existingNote, newNote) {
    const systemNote = `[Sistema] ${newNote}`;
    return existingNote ? `${existingNote}\n${systemNote}` : systemNote;
}

async function saveWithRetry(saveFunction, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await saveFunction();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            console.warn(`Tentativo ${attempt} fallito, riprovo in ${attempt * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
    }
}

function handleDatabaseError(error) {
    let userMessage = 'Errore durante il salvataggio. ';
    
    switch (error.code) {
        case '23505':
            userMessage += 'Dati duplicati rilevati (codice fiscale già esistente).';
            break;
        case '23503':
            userMessage += 'Riferimento a dati non validi.';
            break;
        case '23514':
            userMessage += 'Dati non conformi ai vincoli del database.';
            break;
        default:
            if (error.message?.includes('duplicate key')) {
                userMessage += 'Codice fiscale già presente nel database.';
            } else if (error.message?.includes('violates')) {
                userMessage += 'Violazione vincoli database.';
            } else {
                userMessage += error.message || 'Errore sconosciuto.';
            }
    }
    
    showError(userMessage);
}

// Indicatori di caricamento
function showLoadingIndicator(message) {
    const indicator = document.createElement('div');
    indicator.className = 'loading-overlay';
    indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        color: white;
        font-size: 18px;
    `;
    indicator.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 20px;">⏳</div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(indicator);
    return indicator;
}

function hideLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

// ==================== VALIDAZIONE FORM MIGLIORATA ====================

function validateFormData(formData) {
    const errors = [];
    const nazionalita = formData.get('nazionalita');
    const codiceFiscale = formData.get('codiceFiscale')?.toUpperCase();
    
    // Validazione CF migliorata per schema DB
    if (nazionalita === 'IT' && !codiceFiscale) {
        errors.push('Il codice fiscale è obbligatorio per gli artisti italiani');
    }
    
    if (codiceFiscale && !validateCodiceFiscale(codiceFiscale)) {
        errors.push('Formato codice fiscale non valido');
    }
    
    // Validazione età
    const dataNascita = formData.get('dataNascita');
    if (dataNascita) {
        const age = calculateAge(dataNascita);
        if (age < 18) {
            errors.push('L\'artista deve avere almeno 18 anni');
        }
        if (new Date(dataNascita) > new Date()) {
            errors.push('La data di nascita non può essere nel futuro');
        }
    } else {
        errors.push('La data di nascita è obbligatoria');
    }
    
    // Validazione campi obbligatori secondo schema DB
    if (!formData.get('nome')?.trim()) {
        errors.push('Il nome è obbligatorio');
    }
    
    if (!formData.get('cognome')?.trim()) {
        errors.push('Il cognome è obbligatorio');
    }
    
    if (!formData.get('indirizzo')?.trim()) {
        errors.push('L\'indirizzo è obbligatorio');
    }
    
    if (!formData.get('mansione')) {
        errors.push('La mansione è obbligatoria');
    }
    
    // Validazione IBAN obbligatorio secondo schema
    const iban = formData.get('iban');
    if (!iban || !validateIBAN(iban)) {
        errors.push('IBAN valido obbligatorio');
    }
    
    // Validazione campi condizionali
    const hasPartitaIva = formData.get('hasPartitaIva');
    if (hasPartitaIva === 'si') {
        const piva = formData.get('partitaIva');
        if (!piva || !validatePartitaIva(piva)) {
            errors.push('Partita IVA non valida');
        }
    } else if (hasPartitaIva === 'no') {
        const tipoRapporto = formData.get('tipoRapporto');
        if (tipoRapporto === 'chiamata') {
            const codComm = formData.get('codiceComunicazione');
            if (!codComm) {
                errors.push('Codice comunicazione INPS obbligatorio per contratti a chiamata');
            }
        }
    } else {
        errors.push('Specificare se l\'artista ha partita IVA');
    }
    
    // Validazione indirizzo per stranieri
    if (nazionalita !== 'IT') {
        const paeseResidenza = formData.get('paeseResidenza');
        if (!paeseResidenza) {
            errors.push('Seleziona il paese di residenza per artisti stranieri');
        }
    }
    
    return errors;
}

// Form submit handler migliorato
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const errors = validateFormData(formData);
    
    if (errors.length > 0) {
        showError('Errori di validazione:\n• ' + errors.join('\n• '));
        return;
    }
    
    // Costruisci dati artista
    const artistData = buildArtistData(formData);
    
    // Salva o aggiorna
    if (currentMode === 'edit' && currentArtistId) {
        await updateArtist(currentArtistId, artistData);
    } else {
        await saveArtist(artistData);
    }
}

// ==================== RESTO DELLE FUNZIONI RIMANE UGUALE ====================

// [Qui vanno inserite tutte le altre funzioni che non ho modificato:
// setupEventListeners, loadProvinces, loadCitta, loadCAP, 
// tutte le funzioni di validazione, showSuccess, showError, ecc.]

// Setup event listeners del form
function setupEventListeners() {
    // Event listener per il form principale
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Resto degli event listeners rimane uguale...
    // [Inserire qui tutti gli altri event listeners esistenti]
}

// Funzioni di utilità
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function resetForm() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.reset();
        
        // Reset stato campi
        const cittaSelect = document.getElementById('citta');
        const capSelect = document.getElementById('cap');
        
        if (cittaSelect) {
            cittaSelect.disabled = true;
            cittaSelect.innerHTML = '<option value="">Prima seleziona la provincia</option>';
        }
        
        if (capSelect) {
            capSelect.disabled = true;
            capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
        }
        
        // Nascondi campi condizionali
        document.getElementById('partitaIvaGroup').style.display = 'none';
        document.getElementById('tipoRapportoGroup').style.display = 'none';
        document.getElementById('codiceComunicazioneGroup').style.display = 'none';
        
        const paeseResidenzaGroup = document.getElementById('paeseResidenzaGroup');
        if (paeseResidenzaGroup) {
            paeseResidenzaGroup.style.display = 'none';
        }
        
        const foreignNotice = document.getElementById('foreignAddressNotice');
        if (foreignNotice) {
            foreignNotice.style.display = 'none';
        }
        
        showItalianAddressFields();
        updateCodiceFiscaleRequirement();
        
        // Rimuovi classi di validazione
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('valid', 'invalid');
        });
    }
}

function cancelRegistration() {
    if (confirm('Sei sicuro di voler annullare? I dati inseriti verranno persi.')) {
        goBackToModeSelection();
    }
}

// [Inserire qui tutte le altre funzioni esistenti che non ho modificato]

console.log('📝 Sistema gestione artisti v5.0 - Allineato con schema Supabase!');
