/**
 * registrazione-artista.js - VERSIONE COMPLETA E CORRETTA
 * 
 * Script completo per la gestione della registrazione e modifica artisti 
 * nel sistema RECORP ALL-IN-ONE. Allineato con lo schema database Supabase.
 * 
 * @author RECORP ALL-IN-ONE
 * @version 5.1 - Completa e funzionante
 */

// Import Supabase DatabaseService
import { DatabaseService } from './supabase-config.js';

// Variabili globali
let currentMode = null; // 'new' o 'edit'
let currentArtistId = null; // ID dell'artista in modifica
let allArtists = []; // Cache degli artisti
let isSubmitting = false; // Prevenzione doppi submit

// Lista completa dei paesi esteri
const PAESI_ESTERI = [
    { codice: 'AF', nome: 'AFGHANISTAN' },
    { codice: 'AL', nome: 'ALBANIA' },
    { codice: 'DZ', nome: 'ALGERIA' },
    { codice: 'AD', nome: 'ANDORRA' },
    { codice: 'AO', nome: 'ANGOLA' },
    { codice: 'AR', nome: 'ARGENTINA' },
    { codice: 'AM', nome: 'ARMENIA' },
    { codice: 'AU', nome: 'AUSTRALIA' },
    { codice: 'AT', nome: 'AUSTRIA' },
    { codice: 'AZ', nome: 'AZERBAIGIAN' },
    { codice: 'BS', nome: 'BAHAMAS' },
    { codice: 'BH', nome: 'BAHRAIN' },
    { codice: 'BD', nome: 'BANGLADESH' },
    { codice: 'BB', nome: 'BARBADOS' },
    { codice: 'BE', nome: 'BELGIO' },
    { codice: 'BZ', nome: 'BELIZE' },
    { codice: 'BJ', nome: 'BENIN' },
    { codice: 'BT', nome: 'BHUTAN' },
    { codice: 'BY', nome: 'BIELORUSSIA' },
    { codice: 'BO', nome: 'BOLIVIA' },
    { codice: 'BA', nome: 'BOSNIA-ERZEGOVINA' },
    { codice: 'BW', nome: 'BOTSWANA' },
    { codice: 'BR', nome: 'BRASILE' },
    { codice: 'BN', nome: 'BRUNEI' },
    { codice: 'BG', nome: 'BULGARIA' },
    { codice: 'BF', nome: 'BURKINA FASO' },
    { codice: 'BI', nome: 'BURUNDI' },
    { codice: 'KH', nome: 'CAMBOGIA' },
    { codice: 'CM', nome: 'CAMERUN' },
    { codice: 'CA', nome: 'CANADA' },
    { codice: 'CV', nome: 'CAPO VERDE' },
    { codice: 'TD', nome: 'CIAD' },
    { codice: 'CL', nome: 'CILE' },
    { codice: 'CN', nome: 'CINA' },
    { codice: 'CY', nome: 'CIPRO' },
    { codice: 'CO', nome: 'COLOMBIA' },
    { codice: 'KM', nome: 'COMORE' },
    { codice: 'CG', nome: 'CONGO' },
    { codice: 'KP', nome: 'COREA DEL NORD' },
    { codice: 'KR', nome: 'COREA DEL SUD' },
    { codice: 'CR', nome: 'COSTA RICA' },
    { codice: 'CI', nome: 'COSTA D\'AVORIO' },
    { codice: 'HR', nome: 'CROAZIA' },
    { codice: 'CU', nome: 'CUBA' },
    { codice: 'DK', nome: 'DANIMARCA' },
    { codice: 'DM', nome: 'DOMINICA' },
    { codice: 'EC', nome: 'ECUADOR' },
    { codice: 'EG', nome: 'EGITTO' },
    { codice: 'SV', nome: 'EL SALVADOR' },
    { codice: 'AE', nome: 'EMIRATI ARABI UNITI' },
    { codice: 'ER', nome: 'ERITREA' },
    { codice: 'EE', nome: 'ESTONIA' },
    { codice: 'ET', nome: 'ETIOPIA' },
    { codice: 'FJ', nome: 'FIGI' },
    { codice: 'PH', nome: 'FILIPPINE' },
    { codice: 'FI', nome: 'FINLANDIA' },
    { codice: 'FR', nome: 'FRANCIA' },
    { codice: 'GA', nome: 'GABON' },
    { codice: 'GM', nome: 'GAMBIA' },
    { codice: 'GE', nome: 'GEORGIA' },
    { codice: 'DE', nome: 'GERMANIA' },
    { codice: 'GH', nome: 'GHANA' },
    { codice: 'JM', nome: 'GIAMAICA' },
    { codice: 'JP', nome: 'GIAPPONE' },
    { codice: 'JO', nome: 'GIORDANIA' },
    { codice: 'GR', nome: 'GRECIA' },
    { codice: 'GD', nome: 'GRENADA' },
    { codice: 'GT', nome: 'GUATEMALA' },
    { codice: 'GN', nome: 'GUINEA' },
    { codice: 'GQ', nome: 'GUINEA EQUATORIALE' },
    { codice: 'GW', nome: 'GUINEA-BISSAU' },
    { codice: 'GY', nome: 'GUYANA' },
    { codice: 'HT', nome: 'HAITI' },
    { codice: 'HN', nome: 'HONDURAS' },
    { codice: 'IN', nome: 'INDIA' },
    { codice: 'ID', nome: 'INDONESIA' },
    { codice: 'IR', nome: 'IRAN' },
    { codice: 'IQ', nome: 'IRAQ' },
    { codice: 'IE', nome: 'IRLANDA' },
    { codice: 'IS', nome: 'ISLANDA' },
    { codice: 'IL', nome: 'ISRAELE' },
    { codice: 'KZ', nome: 'KAZAKISTAN' },
    { codice: 'KE', nome: 'KENYA' },
    { codice: 'KI', nome: 'KIRIBATI' },
    { codice: 'KW', nome: 'KUWAIT' },
    { codice: 'KG', nome: 'KIRGHIZISTAN' },
    { codice: 'LA', nome: 'LAOS' },
    { codice: 'LS', nome: 'LESOTHO' },
    { codice: 'LV', nome: 'LETTONIA' },
    { codice: 'LB', nome: 'LIBANO' },
    { codice: 'LR', nome: 'LIBERIA' },
    { codice: 'LY', nome: 'LIBIA' },
    { codice: 'LI', nome: 'LIECHTENSTEIN' },
    { codice: 'LT', nome: 'LITUANIA' },
    { codice: 'LU', nome: 'LUSSEMBURGO' },
    { codice: 'MK', nome: 'MACEDONIA DEL NORD' },
    { codice: 'MG', nome: 'MADAGASCAR' },
    { codice: 'MW', nome: 'MALAWI' },
    { codice: 'MY', nome: 'MALAYSIA' },
    { codice: 'MV', nome: 'MALDIVE' },
    { codice: 'ML', nome: 'MALI' },
    { codice: 'MT', nome: 'MALTA' },
    { codice: 'MA', nome: 'MAROCCO' },
    { codice: 'MH', nome: 'MARSHALL' },
    { codice: 'MR', nome: 'MAURITANIA' },
    { codice: 'MU', nome: 'MAURITIUS' },
    { codice: 'MX', nome: 'MESSICO' },
    { codice: 'FM', nome: 'MICRONESIA' },
    { codice: 'MD', nome: 'MOLDAVIA' },
    { codice: 'MC', nome: 'MONACO' },
    { codice: 'MN', nome: 'MONGOLIA' },
    { codice: 'ME', nome: 'MONTENEGRO' },
    { codice: 'MZ', nome: 'MOZAMBICO' },
    { codice: 'MM', nome: 'MYANMAR' },
    { codice: 'NA', nome: 'NAMIBIA' },
    { codice: 'NR', nome: 'NAURU' },
    { codice: 'NP', nome: 'NEPAL' },
    { codice: 'NI', nome: 'NICARAGUA' },
    { codice: 'NE', nome: 'NIGER' },
    { codice: 'NG', nome: 'NIGERIA' },
    { codice: 'NO', nome: 'NORVEGIA' },
    { codice: 'NZ', nome: 'NUOVA ZELANDA' },
    { codice: 'OM', nome: 'OMAN' },
    { codice: 'NL', nome: 'PAESI BASSI' },
    { codice: 'PK', nome: 'PAKISTAN' },
    { codice: 'PW', nome: 'PALAU' },
    { codice: 'PA', nome: 'PANAMA' },
    { codice: 'PG', nome: 'PAPUA NUOVA GUINEA' },
    { codice: 'PY', nome: 'PARAGUAY' },
    { codice: 'PE', nome: 'PERÙ' },
    { codice: 'PL', nome: 'POLONIA' },
    { codice: 'PT', nome: 'PORTOGALLO' },
    { codice: 'QA', nome: 'QATAR' },
    { codice: 'GB', nome: 'REGNO UNITO' },
    { codice: 'CZ', nome: 'REPUBBLICA CECA' },
    { codice: 'CF', nome: 'REPUBBLICA CENTRAFRICANA' },
    { codice: 'CD', nome: 'REPUBBLICA DEMOCRATICA DEL CONGO' },
    { codice: 'DO', nome: 'REPUBBLICA DOMINICANA' },
    { codice: 'RO', nome: 'ROMANIA' },
    { codice: 'RW', nome: 'RUANDA' },
    { codice: 'RU', nome: 'RUSSIA' },
    { codice: 'KN', nome: 'SAINT KITTS E NEVIS' },
    { codice: 'LC', nome: 'SAINT LUCIA' },
    { codice: 'VC', nome: 'SAINT VINCENT E GRENADINE' },
    { codice: 'WS', nome: 'SAMOA' },
    { codice: 'SM', nome: 'SAN MARINO' },
    { codice: 'ST', nome: 'SAO TOMÉ E PRINCIPE' },
    { codice: 'SN', nome: 'SENEGAL' },
    { codice: 'RS', nome: 'SERBIA' },
    { codice: 'SC', nome: 'SEYCHELLES' },
    { codice: 'SL', nome: 'SIERRA LEONE' },
    { codice: 'SG', nome: 'SINGAPORE' },
    { codice: 'SY', nome: 'SIRIA' },
    { codice: 'SK', nome: 'SLOVACCHIA' },
    { codice: 'SI', nome: 'SLOVENIA' },
    { codice: 'SO', nome: 'SOMALIA' },
    { codice: 'ES', nome: 'SPAGNA' },
    { codice: 'LK', nome: 'SRI LANKA' },
    { codice: 'US', nome: 'STATI UNITI' },
    { codice: 'ZA', nome: 'SUDAFRICA' },
    { codice: 'SD', nome: 'SUDAN' },
    { codice: 'SS', nome: 'SUD SUDAN' },
    { codice: 'SR', nome: 'SURINAME' },
    { codice: 'SE', nome: 'SVEZIA' },
    { codice: 'CH', nome: 'SVIZZERA' },
    { codice: 'SZ', nome: 'SWAZILAND' },
    { codice: 'TJ', nome: 'TAGIKISTAN' },
    { codice: 'TW', nome: 'TAIWAN' },
    { codice: 'TZ', nome: 'TANZANIA' },
    { codice: 'TH', nome: 'THAILANDIA' },
    { codice: 'TL', nome: 'TIMOR EST' },
    { codice: 'TG', nome: 'TOGO' },
    { codice: 'TO', nome: 'TONGA' },
    { codice: 'TT', nome: 'TRINIDAD E TOBAGO' },
    { codice: 'TN', nome: 'TUNISIA' },
    { codice: 'TR', nome: 'TURCHIA' },
    { codice: 'TM', nome: 'TURKMENISTAN' },
    { codice: 'TV', nome: 'TUVALU' },
    { codice: 'UA', nome: 'UCRAINA' },
    { codice: 'UG', nome: 'UGANDA' },
    { codice: 'HU', nome: 'UNGHERIA' },
    { codice: 'UY', nome: 'URUGUAY' },
    { codice: 'UZ', nome: 'UZBEKISTAN' },
    { codice: 'VU', nome: 'VANUATU' },
    { codice: 'VA', nome: 'CITTÀ DEL VATICANO' },
    { codice: 'VE', nome: 'VENEZUELA' },
    { codice: 'VN', nome: 'VIETNAM' },
    { codice: 'YE', nome: 'YEMEN' },
    { codice: 'ZM', nome: 'ZAMBIA' },
    { codice: 'ZW', nome: 'ZIMBABWE' }
];

// Paesi UE (Unione Europea)
const PAESI_UE = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// ==================== INIZIALIZZAZIONE SICURA ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inizializzazione sistema gestione artisti...');
    
    // IMPORTANTE: Nascondi immediatamente i messaggi
    hideAllMessages();
    
    // Inizializza il sistema
    initializeSystem();
});

// Funzione per nascondere tutti i messaggi all'avvio
function hideAllMessages() {
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    if (successMessage) {
        successMessage.style.display = 'none';
        successMessage.textContent = '';
    }
    
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }
    
    console.log('✅ Messaggi nascosti all\'avvio');
}

// Inizializzazione sistema completa
async function initializeSystem() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    try {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = '⌛ Inizializzazione sistema...';
        }
        
        // Aspetta dipendenze
        await waitForDependencies();
        
        // Inizializza il sistema di registrazione
        const systemReady = await initializeRegistrationSystem();
        
        if (!systemReady) {
            throw new Error('Sistema non pronto');
        }
        
        // Setup componenti
        setupEventListeners();
        setupModeButtons();
        loadProvinces();
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        console.log('✅ Sistema inizializzato correttamente');
        
    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione:', error);
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = '❌ Errore inizializzazione: ' + error.message;
            loadingIndicator.style.backgroundColor = '#fee2e2';
            loadingIndicator.style.color = '#991b1b';
        }
        
        showError('Errore durante l\'inizializzazione. Ricarica la pagina.');
    }
}

// Attesa dipendenze
async function waitForDependencies() {
    console.log('⏳ Attesa caricamento dipendenze...');
    
    // Aspetta che GIDatabase sia caricato
    let attempts = 0;
    const maxAttempts = 20;
    
    while (!window.GIDatabase?.isLoaded() && attempts < maxAttempts) {
        console.log(`Attesa GIDatabase... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    if (!window.GIDatabase?.isLoaded()) {
        console.warn('⚠️ GIDatabase non disponibile');
    } else {
        console.log('✅ GIDatabase caricato');
    }
}

// Inizializzazione con Supabase
async function initializeRegistrationSystem() {
    try {
        console.log('🔗 Test connessione database...');
        
        // Test connessione con timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout connessione database')), 10000)
        );
        
        let dataPromise;
        
        // Verifica che DatabaseService esista
        if (typeof DatabaseService !== 'undefined' && DatabaseService.getAllArtisti) {
            dataPromise = DatabaseService.getAllArtisti();
        } else {
            console.warn('⚠️ DatabaseService non disponibile, continuo senza cache');
            allArtists = [];
            return true;
        }
        
        allArtists = await Promise.race([dataPromise, timeoutPromise]);
        
        console.log('✅ Database pronto. Artisti caricati:', allArtists.length);
        return true;
        
    } catch (error) {
        console.error('❌ Errore connessione database:', error);
        
        if (error.message.includes('Timeout')) {
            console.warn('⚠️ Timeout database - continuo senza cache');
            allArtists = [];
            return true;
        }
        
        return false;
    }
}

// ==================== SETUP PULSANTI MODALITÀ ====================

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

// ==================== CARICAMENTO PROVINCE ====================

function loadProvinces() {
    try {
        const provinceSelect = document.getElementById('provincia');
        if (!provinceSelect) {
            console.warn('⚠️ Elemento provincia non trovato');
            return;
        }
        
        // Se già caricate, skip
        if (provinceSelect.options.length > 1) {
            console.log('✅ Province già caricate, skip');
            return;
        }
        
        provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        // Verifica disponibilità GIDatabase
        if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
            console.warn('❌ Database GI non disponibile per province');
            provinceSelect.innerHTML = '<option value="">Database non disponibile</option>';
            return;
        }
        
        // Carica province
        const province = window.GIDatabase.getProvince();
        
        if (!province || province.length === 0) {
            console.error('❌ Nessuna provincia trovata');
            provinceSelect.innerHTML = '<option value="">Nessuna provincia disponibile</option>';
            return;
        }
        
        console.log(`✅ Caricate ${province.length} province`);
        
        // Ordina per sigla
        province.sort((a, b) => {
            if (!a.sigla || !b.sigla) return 0;
            return a.sigla.localeCompare(b.sigla);
        });
        
        // Popola select
        province.forEach(p => {
            const option = document.createElement('option');
            option.value = p.sigla;
            option.textContent = `${p.sigla} - ${p.nome}`;
            provinceSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('❌ Errore caricamento province:', error);
        const provinceSelect = document.getElementById('provincia');
        if (provinceSelect) {
            provinceSelect.innerHTML = '<option value="">Errore caricamento province</option>';
        }
    }
}

// ==================== CARICAMENTO CITTÀ ====================

function loadCitta(provincia) {
    const cittaSelect = document.getElementById('citta');
    if (!cittaSelect) return;
    
    cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
    
    try {
        if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
            cittaSelect.innerHTML = '<option value="">Database non disponibile</option>';
            return;
        }
        
        const comuni = window.GIDatabase.getComuniByProvincia(provincia);
        
        if (!comuni || comuni.length === 0) {
            console.warn(`Nessun comune trovato per provincia ${provincia}`);
            cittaSelect.innerHTML = '<option value="">Nessuna città trovata</option>';
            return;
        }
        
        // Ordina alfabeticamente
        comuni.sort((a, b) => {
            const nomeA = a.denominazione_ita || a.denominazione || a.nome || '';
            const nomeB = b.denominazione_ita || b.denominazione || b.nome || '';
            return nomeA.localeCompare(nomeB);
        });
        
        // Popola select
        comuni.forEach(comune => {
            const option = document.createElement('option');
            option.value = comune.codice_istat || comune.codiceIstat || comune.codice;
            option.textContent = comune.denominazione_ita || comune.denominazione || comune.nome;
            option.setAttribute('data-comune', JSON.stringify(comune));
            cittaSelect.appendChild(option);
        });
        
        console.log(`✅ Caricate ${comuni.length} città per ${provincia}`);
        
    } catch (error) {
        console.error('❌ Errore caricamento città:', error);
        cittaSelect.innerHTML = '<option value="">Errore caricamento città</option>';
    }
}

// ==================== CARICAMENTO CAP ====================

function loadCAP(codiceIstat) {
    const capSelect = document.getElementById('cap');
    if (!capSelect) return;
    
    capSelect.innerHTML = '<option value="">Caricamento CAP...</option>';
    
    try {
        if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
            capSelect.innerHTML = '<option value="">Database non disponibile</option>';
            return;
        }
        
        const capList = window.GIDatabase.getCapByComune(codiceIstat);
        
        if (!capList || capList.length === 0) {
            // Fallback: prova a recuperare CAP dal comune
            const selectedOption = document.querySelector(`#citta option[value="${codiceIstat}"]`);
            if (selectedOption) {
                try {
                    const comuneData = JSON.parse(selectedOption.getAttribute('data-comune'));
                    if (comuneData.cap) {
                        capList.push(comuneData.cap);
                    }
                } catch (e) {
                    console.warn('Errore parsing dati comune:', e);
                }
            }
        }
        
        if (!capList || capList.length === 0) {
            capSelect.innerHTML = '<option value="">CAP non trovato</option>';
            return;
        }
        
        // Popola select
        capSelect.innerHTML = '<option value="">Seleziona CAP...</option>';
        
        if (capList.length === 1) {
            // Un solo CAP: seleziona automaticamente
            const option = document.createElement('option');
            option.value = capList[0];
            option.textContent = capList[0];
            option.selected = true;
            capSelect.appendChild(option);
        } else {
            // Più CAP: mostra tutti
            capList.forEach(cap => {
                const option = document.createElement('option');
                option.value = cap;
                option.textContent = cap;
                capSelect.appendChild(option);
            });
        }
        
        console.log(`✅ Caricati ${capList.length} CAP per ${codiceIstat}`);
        
    } catch (error) {
        console.error('❌ Errore caricamento CAP:', error);
        capSelect.innerHTML = '<option value="">Errore caricamento CAP</option>';
    }
}

// ==================== SETUP EVENT LISTENERS ====================

function setupEventListeners() {
    console.log('🔧 Setup event listeners...');
    
    // Form submit
    const form = document.getElementById('registrationForm');
    if (form) {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Cambio provincia
    const provincia = document.getElementById('provincia');
    if (provincia) {
        provincia.addEventListener('change', function() {
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
    }
    
    // Cambio città
    const citta = document.getElementById('citta');
    if (citta) {
        citta.addEventListener('change', function() {
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
    }
    
    // Gestione partita IVA
    const hasPartitaIva = document.getElementById('hasPartitaIva');
    if (hasPartitaIva) {
        hasPartitaIva.addEventListener('change', function(e) {
            if (e.target.value === 'si') {
                showPartitaIvaFields();
            } else if (e.target.value === 'no') {
                showTipoRapportoFields();
            } else {
                hideAllPartitaIvaFields();
            }
        });
    }
    
    // Gestione tipo rapporto
    const tipoRapporto = document.getElementById('tipoRapporto');
    if (tipoRapporto) {
        tipoRapporto.addEventListener('change', function(e) {
            if (e.target.value === 'chiamata') {
                showCodiceComunicazioneField();
            } else {
                hideCodiceComunicazioneField();
            }
        });
    }
    
    // Gestione nazionalità
    setupNazionalitaHandling();
    
    // Validazione codice fiscale
    setupCodiceFiscaleValidation();
    
    // Altri field validations
    setupFieldValidations();
    
    console.log('✅ Event listeners configurati');
}

function setupCodiceFiscaleValidation() {
    const codiceFiscale = document.getElementById('codiceFiscale');
    if (codiceFiscale) {
        codiceFiscale.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
            
            if (e.target.value.length === 16) {
                if (validateCodiceFiscale(e.target.value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                    
                    // Estrai dati dal CF
                    const extractedData = extractDataFromCF(e.target.value);
                    if (extractedData) {
                        populateDataFromCF(extractedData);
                    }
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
            }
        });
    }
}

function setupNazionalitaHandling() {
    const nazionalitaSelect = document.getElementById('nazionalita');
    if (nazionalitaSelect) {
        nazionalitaSelect.addEventListener('change', function(e) {
            const selectedValue = e.target.value;
            
            updateCodiceFiscaleRequirement();
            updateAddressPlaceholder();
            
            if (selectedValue === 'IT') {
                showItalianAddressFields();
                hideCountryResidenceField();
                hideForeignNotice();
            } else if (selectedValue === 'EU' || selectedValue === 'EX') {
                showForeignAddressFields();
                showCountryResidenceField();
                loadPaesiEsteri(selectedValue);
                showForeignNotice();
            }
        });
    }
}

function setupFieldValidations() {
    // Validazione IBAN
    const iban = document.getElementById('iban');
    if (iban) {
        iban.addEventListener('input', function(e) {
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
    }
    
    // Validazione Partita IVA
    const partitaIva = document.getElementById('partitaIva');
    if (partitaIva) {
        partitaIva.addEventListener('input', function(e) {
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
    }
    
    // Data di nascita con calcolo età
    const dataNascita = document.getElementById('dataNascita');
    if (dataNascita) {
        dataNascita.addEventListener('change', function(e) {
            if (e.target.value) {
                const age = calculateAge(e.target.value);
                showAge(age, e.target);
            }
        });
    }
}

// ==================== GESTIONE CAMPI CONDIZIONALI ====================

function showPartitaIvaFields() {
    document.getElementById('partitaIvaGroup').style.display = 'block';
    document.getElementById('partitaIva').required = true;
    
    hideTypeRapportoFields();
}

function showTipoRapportoFields() {
    hidePartitaIvaFields();
    
    document.getElementById('tipoRapportoGroup').style.display = 'block';
    document.getElementById('tipoRapporto').required = true;
    
    const tipoRapporto = document.getElementById('tipoRapporto').value;
    if (tipoRapporto === 'chiamata') {
        showCodiceComunicazioneField();
    } else {
        hideCodiceComunicazioneField();
    }
}

function hidePartitaIvaFields() {
    document.getElementById('partitaIvaGroup').style.display = 'none';
    document.getElementById('partitaIva').required = false;
    document.getElementById('partitaIva').value = '';
}

function hideTypeRapportoFields() {
    document.getElementById('tipoRapportoGroup').style.display = 'none';
    document.getElementById('tipoRapporto').required = false;
    hideCodiceComunicazioneField();
}

function hideAllPartitaIvaFields() {
    hidePartitaIvaFields();
    hideTypeRapportoFields();
}

function showCodiceComunicazioneField() {
    document.getElementById('codiceComunicazioneGroup').style.display = 'block';
    document.getElementById('codiceComunicazione').required = true;
}

function hideCodiceComunicazioneField() {
    document.getElementById('codiceComunicazioneGroup').style.display = 'none';
    document.getElementById('codiceComunicazione').required = false;
    document.getElementById('codiceComunicazione').value = '';
}

function showItalianAddressFields() {
    const provinciaGroup = document.getElementById('provincia').parentElement;
    const cittaGroup = document.getElementById('citta').parentElement;
    const capGroup = document.getElementById('cap').parentElement;
    
    provinciaGroup.style.display = 'block';
    cittaGroup.style.display = 'block';
    capGroup.style.display = 'block';
    
    document.getElementById('provincia').required = true;
    document.getElementById('citta').required = true;
    document.getElementById('cap').required = true;
}

function showForeignAddressFields() {
    const provinciaGroup = document.getElementById('provincia').parentElement;
    const cittaGroup = document.getElementById('citta').parentElement;
    const capGroup = document.getElementById('cap').parentElement;
    
    provinciaGroup.style.display = 'none';
    cittaGroup.style.display = 'none';
    capGroup.style.display = 'none';
    
    document.getElementById('provincia').required = false;
    document.getElementById('citta').required = false;
    document.getElementById('cap').required = false;
    
    // Svuota valori
    document.getElementById('provincia').value = '';
    document.getElementById('citta').value = '';
    document.getElementById('cap').value = '';
}

function showCountryResidenceField() {
    const paeseResidenzaGroup = document.getElementById('paeseResidenzaGroup');
    if (paeseResidenzaGroup) {
        paeseResidenzaGroup.style.display = 'block';
    }
}

function hideCountryResidenceField() {
    const paeseResidenzaGroup = document.getElementById('paeseResidenzaGroup');
    if (paeseResidenzaGroup) {
        paeseResidenzaGroup.style.display = 'none';
    }
}

function showForeignNotice() {
    const foreignNotice = document.getElementById('foreignAddressNotice');
    if (foreignNotice) {
        foreignNotice.style.display = 'block';
    }
}

function hideForeignNotice() {
    const foreignNotice = document.getElementById('foreignAddressNotice');
    if (foreignNotice) {
        foreignNotice.style.display = 'none';
    }
}

// ==================== PAESI ESTERI ====================

function loadPaesiEsteri(tipo) {
    const paeseSelect = document.getElementById('paeseResidenza');
    if (!paeseSelect) return;
    
    paeseSelect.innerHTML = '<option value="">Seleziona paese...</option>';
    
    let paesiDaMostrare = [];
    
    if (tipo === 'EU') {
        paesiDaMostrare = PAESI_ESTERI.filter(paese => 
            PAESI_UE.includes(paese.codice) && paese.codice !== 'IT'
        );
    } else if (tipo === 'EX') {
        paesiDaMostrare = PAESI_ESTERI.filter(paese => 
            !PAESI_UE.includes(paese.codice)
        );
    }
    
    paesiDaMostrare.sort((a, b) => a.nome.localeCompare(b.nome));
    
    paesiDaMostrare.forEach(paese => {
        const option = document.createElement('option');
        option.value = paese.codice;
        option.textContent = paese.nome;
        paeseSelect.appendChild(option);
    });
}

// ==================== GESTIONE CODICE FISCALE ====================

function updateCodiceFiscaleRequirement() {
    const nazionalita = document.getElementById('nazionalita').value;
    const cfField = document.getElementById('codiceFiscale');
    const cfLabel = cfField.parentElement.querySelector('.form-label');
    const cfHelpText = cfField.parentElement.querySelector('.form-text');
    const cfNotice = document.getElementById('cfAlternativeNotice');
    
    if (nazionalita === 'IT') {
        cfField.required = true;
        cfLabel.innerHTML = 'Codice Fiscale <span class="required">*</span>';
        cfHelpText.textContent = 'Il codice fiscale deve essere inserito per primo - la data di nascita verrà compilata automaticamente';
        if (cfNotice) cfNotice.style.display = 'none';
    } else {
        cfField.required = false;
        cfLabel.innerHTML = 'Codice Fiscale <span class="optional">(opzionale)</span>';
        cfHelpText.textContent = 'Opzionale per artisti stranieri - se presente, la data di nascita verrà compilata automaticamente';
        if (cfNotice) cfNotice.style.display = 'block';
    }
}

function updateAddressPlaceholder() {
    const nazionalita = document.getElementById('nazionalita').value;
    const indirizzoField = document.getElementById('indirizzo');
    const indirizzoLabel = indirizzoField.parentElement.querySelector('.form-label');
    
    if (nazionalita === 'IT') {
        indirizzoField.placeholder = 'Via Roma, 123';
        indirizzoLabel.innerHTML = 'Indirizzo <span class="required">*</span>';
    } else {
        indirizzoField.placeholder = 'Via/Street Example 123, 12345 Città/City';
        indirizzoLabel.innerHTML = 'Indirizzo Completo (via, numero, CAP, città) <span class="required">*</span>';
    }
}

function populateDataFromCF(extractedData) {
    if (extractedData.dataNascita) {
        const dataNascitaField = document.getElementById('dataNascita');
        if (dataNascitaField) {
            dataNascitaField.value = extractedData.dataNascita;
            dataNascitaField.dispatchEvent(new Event('change'));
        }
    }
    
    if (extractedData.sesso) {
        const sessoField = document.getElementById('sesso');
        if (sessoField) sessoField.value = extractedData.sesso;
    }
    
    if (extractedData.luogoNascita) {
        const luogoField = document.getElementById('luogoNascita');
        if (luogoField) luogoField.value = extractedData.luogoNascita;
    }
    
    if (extractedData.provinciaNascita) {
        const provField = document.getElementById('provinciaNascita');
        if (provField) provField.value = extractedData.provinciaNascita;
    }
}

// ==================== VALIDAZIONI ====================

function validateCodiceFiscale(cf) {
    if (!cf || cf.length !== 16) return false;
    const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return pattern.test(cf);
}

function validateIBAN(iban) {
    iban = iban.replace(/\s/g, '').toUpperCase();
    
    const ibanLengths = {
        'IT': 27, 'FR': 27, 'DE': 22, 'ES': 24, 'GB': 22,
        // Altri paesi...
    };
    
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false;
    
    const countryCode = iban.substring(0, 2);
    if (ibanLengths[countryCode] && iban.length !== ibanLengths[countryCode]) {
        return false;
    }
    
    // Algoritmo di validazione IBAN
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

function validatePartitaIva(piva) {
    if (!piva || piva.length !== 11 || !/^\d{11}$/.test(piva)) return false;
    
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

function showAge(age, element) {
    const existingSpan = element.parentElement.querySelector('.age-display');
    if (existingSpan) existingSpan.remove();
    
    const ageText = age >= 18 ? `(${age} anni) ✓` : `(${age} anni) ❌ Minimo 18 anni`;
    const ageSpan = document.createElement('span');
    ageSpan.className = 'age-display';
    ageSpan.style.marginLeft = '10px';
    ageSpan.style.color = age >= 18 ? 'var(--success, green)' : 'var(--danger, red)';
    ageSpan.textContent = ageText;
    element.parentElement.appendChild(ageSpan);
}

function extractDataFromCF(cf) {
    if (!cf || cf.length !== 16) return null;
    
    const data = {};
    
    // Estrai data
    data.dataNascita = extractDateFromCF(cf);
    
    // Estrai sesso
    const dayCode = parseInt(cf.substring(9, 11));
    data.sesso = dayCode > 40 ? 'F' : 'M';
    
    // Estrai comune (se disponibile)
    const codiceCatastale = cf.substring(11, 15);
    const comuneInfo = findComuneByCodCatastale(codiceCatastale);
    if (comuneInfo) {
        data.luogoNascita = comuneInfo.nome;
        data.provinciaNascita = comuneInfo.provincia;
    }
    
    return data;
}

function extractDateFromCF(cf) {
    if (!cf || cf.length < 11) return null;
    
    const yearCode = cf.substring(6, 8);
    const monthCode = cf.substring(8, 9);
    const dayCode = cf.substring(9, 11);
    
    const monthMap = {
        'A': '01', 'B': '02', 'C': '03', 'D': '04',
        'E': '05', 'H': '06', 'L': '07', 'M': '08',
        'P': '09', 'R': '10', 'S': '11', 'T': '12'
    };
    
    const month = monthMap[monthCode];
    if (!month) return null;
    
    let day = parseInt(dayCode);
    if (day > 40) day -= 40; // Femmine hanno +40
    
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const lastCentury = currentCentury - 100;
    
    let year = parseInt(yearCode);
    if (currentCentury + year > currentYear) {
        year = lastCentury + year;
    } else {
        year = currentCentury + year;
    }
    
    const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
    const date = new Date(dateStr);
    
    return isNaN(date.getTime()) ? null : dateStr;
}

function findComuneByCodCatastale(codice) {
    if (!window.GIDatabase || !window.GIDatabase.isLoaded()) return null;
    
    try {
        return window.GIDatabase.getComuneByCodiceBelfiore(codice);
    } catch (error) {
        console.warn('Errore ricerca comune:', error);
        return null;
    }
}

// ==================== FORM SUBMIT ====================

async function handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting) {
        console.warn('⚠️ Submit già in corso');
        return false;
    }
    
    if (!currentMode) {
        console.warn('⚠️ Submit senza modalità valida');
        return false;
    }
    
    console.log('📝 Inizio processo salvataggio...');
    isSubmitting = true;
    
    try {
        const formData = new FormData(e.target);
        const errors = validateFormData(formData);
        
        if (errors.length > 0) {
            showError('Errori di validazione:\n• ' + errors.join('\n• '));
            return;
        }
        
        const artistData = buildArtistData(formData);
        
        if (currentMode === 'edit' && currentArtistId) {
            await updateArtist(currentArtistId, artistData);
        } else {
            await saveArtist(artistData);
        }
        
    } catch (error) {
        console.error('❌ Errore nel form submit:', error);
        showError('Errore durante il salvataggio: ' + error.message);
    } finally {
        isSubmitting = false;
    }
}

function validateFormData(formData) {
    const errors = [];
    const nazionalita = formData.get('nazionalita');
    const codiceFiscale = formData.get('codiceFiscale')?.toUpperCase();
    
    // Validazioni base
    if (!formData.get('nome')?.trim()) errors.push('Il nome è obbligatorio');
    if (!formData.get('cognome')?.trim()) errors.push('Il cognome è obbligatorio');
    if (!formData.get('indirizzo')?.trim()) errors.push('L\'indirizzo è obbligatorio');
    if (!formData.get('mansione')) errors.push('La mansione è obbligatoria');
    
    // Validazione CF
    if (nazionalita === 'IT' && !codiceFiscale) {
        errors.push('Il codice fiscale è obbligatorio per gli artisti italiani');
    }
    
    if (codiceFiscale && !validateCodiceFiscale(codiceFiscale)) {
        errors.push('Formato codice fiscale non valido');
    }
    
    // Validazione data nascita
    const dataNascita = formData.get('dataNascita');
    if (!dataNascita) {
        errors.push('La data di nascita è obbligatoria');
    } else {
        const age = calculateAge(dataNascita);
        if (age < 18) errors.push('L\'artista deve avere almeno 18 anni');
        if (new Date(dataNascita) > new Date()) errors.push('La data di nascita non può essere nel futuro');
    }
    
    // Validazione IBAN
    const iban = formData.get('iban');
    if (!iban || !validateIBAN(iban)) {
        errors.push('IBAN valido obbligatorio');
    }
    
    // Validazione partita IVA
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
    
    // Validazione paese per stranieri
    if (nazionalita !== 'IT') {
        const paeseResidenza = formData.get('paeseResidenza');
        if (!paeseResidenza) {
            errors.push('Seleziona il paese di residenza per artisti stranieri');
        }
    }
    
    return errors;
}

function buildArtistData(formData) {
    const nazionalita = formData.get('nazionalita');
    const codiceFiscale = formData.get('codiceFiscale')?.toUpperCase() || '';
    
    const artistData = {
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
        indirizzo: formData.get('indirizzo'),
        mansione: formData.get('mansione'),
        has_partita_iva: formData.get('hasPartitaIva') === 'si',
        partita_iva: formData.get('hasPartitaIva') === 'si' ? formData.get('partitaIva') : null,
        tipo_rapporto: formData.get('hasPartitaIva') === 'no' ? formData.get('tipoRapporto') : null,
        codice_comunicazione: formData.get('codiceComunicazione') || null,
        iban: formData.get('iban')?.toUpperCase().replace(/\s/g, ''),
        note: formData.get('note') || null,
        provincia: null,
        citta: null,
        citta_nome: null,
        codice_istat_citta: null,
        cap: null,
        paese_residenza: null
    };
    
    // Gestione indirizzo
    if (nazionalita === 'IT') {
        artistData.provincia = formData.get('provincia');
        artistData.cap = formData.get('cap');
        artistData.codice_istat_citta = formData.get('citta');
        artistData.paese_residenza = 'IT';
        
        const cittaOption = document.querySelector('#citta option:checked');
        if (cittaOption) {
            artistData.citta = cittaOption.textContent;
            artistData.citta_nome = cittaOption.textContent;
        }
    } else {
        const paeseResidenza = formData.get('paeseResidenza');
        const paiseName = document.querySelector('#paeseResidenza option:checked')?.textContent || '';
        
        artistData.provincia = 'EE';
        artistData.citta = paiseName;
        artistData.citta_nome = paiseName;
        artistData.cap = '00000';
        artistData.codice_istat_citta = null;
        artistData.paese_residenza = paeseResidenza;
    }
    
    return artistData;
}

// ==================== SALVATAGGIO ====================

async function saveArtist(artistData) {
    const loadingIndicator = showLoadingIndicator('Salvataggio in corso...');
    
    try {
        console.log('💾 Salvataggio artista:', artistData.nome, artistData.cognome);
        
        // Verifica duplicati per nuove registrazioni
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
        
        const savedArtist = await saveWithRetry(() => DatabaseService.saveArtist(artistData));
        console.log('✅ Artista salvato:', savedArtist);
        
        allArtists.push(savedArtist);
        
        showSuccess('Artista registrato con successo! Reindirizzamento...');
        resetForm();
        
        setTimeout(() => window.location.href = './index.html', 2000);
        
    } catch (error) {
        console.error('❌ Errore salvataggio:', error);
        handleDatabaseError(error);
    } finally {
        hideLoadingIndicator(loadingIndicator);
    }
}

async function updateArtist(artistId, artistData) {
    const loadingIndicator = showLoadingIndicator('Aggiornamento in corso...');
    
    try {
        console.log('✏️ Aggiornamento artista:', artistData.nome, artistData.cognome);
        
        if (!artistData.codice_fiscale && artistData.nazionalita !== 'IT' && !artistData.codice_fiscale_temp) {
            artistData.codice_fiscale_temp = generateTempId(artistData);
            
            if (!artistData.note?.includes('ID temporaneo')) {
                artistData.note = addSystemNote(artistData.note, `CF rimosso - ID temporaneo: ${artistData.codice_fiscale_temp}`);
            }
        }
        
        const updatedArtist = await saveWithRetry(() => DatabaseService.updateArtist(artistId, artistData));
        console.log('✅ Artista aggiornato:', updatedArtist);
        
        // Aggiorna cache
        const index = allArtists.findIndex(a => a.id === artistId);
        if (index !== -1) {
            allArtists[index] = updatedArtist;
        }
        
        showSuccess('Artista modificato con successo! Reindirizzamento...');
        resetForm();
        
        setTimeout(() => window.location.href = './index.html', 2000);
        
    } catch (error) {
        console.error('❌ Errore aggiornamento:', error);
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

// ==================== GESTIONE SELEZIONE ARTISTI ====================

function displayArtistsForSelection() {
    const container = document.getElementById('artistsListContainer');
    const searchInput = document.getElementById('searchArtistInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterArtistsForSelection);
    }
    
    renderArtistsList(allArtists);
}

function filterArtistsForSelection() {
    const query = document.getElementById('searchArtistInput').value.toLowerCase();
    
    if (query.length < 2) {
        renderArtistsList(allArtists);
        return;
    }
    
    const filtered = allArtists.filter(artist => {
        const searchText = `${artist.nome} ${artist.cognome} ${artist.codice_fiscale || ''} ${artist.codice_fiscale_temp || ''} ${artist.nome_arte || ''}`.toLowerCase();
        return searchText.includes(query);
    });
    
    renderArtistsList(filtered);
}

function renderArtistsList(artists) {
    const container = document.getElementById('artistsListContainer');
    
    if (!artists || artists.length === 0) {
        container.innerHTML = '<div class="no-artists"><h3>Nessun artista trovato</h3><p>Prova a modificare i termini di ricerca</p></div>';
        return;
    }
    
    container.innerHTML = artists.map(artist => {
        const displayName = artist.nome_arte || `${artist.nome} ${artist.cognome}`;
        const identificativo = artist.codice_fiscale || artist.codice_fiscale_temp || 'NO-CF';
        return `
            <div class="artist-item" data-artist-id="${artist.id}">
                <div class="artist-name">${displayName}</div>
                <div class="artist-details">
                    ID: ${identificativo} | 
                    ${artist.mansione} | 
                    ${artist.citta}, ${artist.provincia}
                    ${artist.tipo_rapporto === 'chiamata' ? ' | ⚡ Contratto a Chiamata' : ''}
                    ${artist.nazionalita !== 'IT' ? ' | 🌍 ' + artist.nazionalita : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Event listeners per gli artisti
    container.querySelectorAll('.artist-item').forEach(item => {
        item.addEventListener('click', function() {
            const artistId = parseInt(this.getAttribute('data-artist-id'));
            selectArtistForEdit(artistId);
        });
    });
}

function selectArtistForEdit(artistId) {
    const artist = allArtists.find(a => a.id === artistId);
    if (!artist) {
        showError('Artista non trovato');
        return;
    }
    
    currentArtistId = artistId;
    
    // Passa alla modalità modifica
    const artistSelection = document.getElementById('artistSelection');
    const registrationForm = document.getElementById('registrationForm');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    artistSelection.style.display = 'none';
    registrationForm.style.display = 'block';
    
    const displayName = artist.nome_arte || `${artist.nome} ${artist.cognome}`;
    pageTitle.textContent = `Modifica: ${displayName}`;
    pageSubtitle.textContent = 'Modifica i dati dell\'artista';
    
    document.getElementById('submitText').textContent = 'Salva Modifiche';
    
    // Popola il form
    populateFormWithArtist(artist);
}

// ==================== POPULATE FORM PER MODIFICA ====================

async function populateFormWithArtist(artist) {
    try {
        console.log('📝 Popolamento form con dati artista:', artist);
        
        // Dati anagrafici
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
        
        updateCodiceFiscaleRequirement();
        
        // Indirizzo
        document.getElementById('indirizzo').value = artist.indirizzo || '';
        
        // Aspetta caricamento province
        await ensureProvincesLoaded();
        await populateAddressFields(artist);
        
    } catch (error) {
        console.error('❌ Errore popolamento form:', error);
        showError('Errore nel caricamento dei dati dell\'artista: ' + error.message);
    }
}

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

async function populateAddressFields(artist) {
    console.log('📍 Popolamento campi indirizzo:', {
        nazionalita: artist.nazionalita,
        provincia: artist.provincia,
        citta: artist.citta,
        paese_residenza: artist.paese_residenza
    });
    
    if (artist.nazionalita === 'IT' || !artist.nazionalita || artist.provincia !== 'EE') {
        // Artista italiano
        showItalianAddressFields();
        
        if (artist.provincia && artist.provincia !== 'EE') {
            const provinciaSelect = document.getElementById('provincia');
            
            const optionExists = Array.from(provinciaSelect.options).some(opt => opt.value === artist.provincia);
            
            if (optionExists) {
                provinciaSelect.value = artist.provincia;
                loadCitta(artist.provincia);
                
                setTimeout(() => {
                    const cittaSelect = document.getElementById('citta');
                    
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
        showCountryResidenceField();
        
        if (artist.nazionalita) {
            loadPaesiEsteri(artist.nazionalita);
            
            setTimeout(() => {
                if (artist.paese_residenza) {
                    document.getElementById('paeseResidenza').value = artist.paese_residenza;
                }
            }, 500);
        }
        
        showForeignNotice();
    }
    
    // Completa dati professionali
    continueProfessionalDataPopulation(artist);
}

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
    
    console.log('✅ Form popolato:', artist.nome, artist.cognome);
}

// ==================== LOADING INDICATORS ====================

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
            <div style="margin-bottom: 20px; font-size: 48px;">⏳</div>
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

// ==================== MESSAGGI DI SISTEMA ====================

function showError(message) {
    console.log('❌ Mostra errore:', message);
    
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 8000);
    } else {
        console.error('Elemento errorMessage non trovato');
        alert('❌ ' + message);
    }
}

function showSuccess(message) {
    console.log('✅ Mostra successo:', message);
    
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 4000);
    } else {
        console.error('Elemento successMessage non trovato');
        alert('✅ ' + message);
    }
}

// ==================== RESET E PULIZIA ====================

function resetForm() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.reset();
        
        // Reset stato select città e CAP
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
        
        // Nascondi tutti i campi condizionali
        hideAllPartitaIvaFields();
        hideCountryResidenceField();
        hideForeignNotice();
        
        const cfNotice = document.getElementById('cfAlternativeNotice');
        if (cfNotice) {
            cfNotice.style.display = 'none';
        }
        
        // Mostra campi italiani di default
        showItalianAddressFields();
        updateCodiceFiscaleRequirement();
        updateAddressPlaceholder();
        
        // Rimuovi span di età e validazione
        document.querySelectorAll('.age-display, .cf-info-display, .cf-mismatch-alert').forEach(el => el.remove());
        
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

// ==================== CSS INJECTION PER MESSAGGI ====================

// Aggiungi CSS per assicurare che i messaggi siano nascosti di default
const style = document.createElement('style');
style.textContent = `
    #successMessage,
    #errorMessage {
        display: none !important;
    }
    
    .artist-item {
        cursor: pointer;
        padding: 15px;
        border: 1px solid #ddd;
        margin-bottom: 10px;
        border-radius: 8px;
        transition: background-color 0.2s;
    }
    
    .artist-item:hover {
        background-color: #f5f5f5;
    }
    
    .artist-name {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 5px;
    }
    
    .artist-details {
        color: #666;
        font-size: 14px;
    }
    
    .no-artists {
        text-align: center;
        padding: 40px;
        color: #666;
    }
    
    .loading-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0.7) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 9999 !important;
        color: white !important;
        font-size: 18px !important;
    }
`;
document.head.appendChild(style);

// ==================== EXPORT E DEBUG ====================

// Esporta funzioni per debug
window.debugSystem = {
    currentMode,
    currentArtistId,
    allArtists,
    loadProvinces,
    validateCodiceFiscale,
    validateIBAN,
    resetForm
};

console.log('📝 Sistema gestione artisti v5.1 - Completo e funzionante!');
console.log('🔧 Disponibili funzioni debug in window.debugSystem');
