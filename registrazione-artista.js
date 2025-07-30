/**
 * registrazione-artista.js - VERSIONE INTEGRATA CON SISTEMA AGIBILITÀ
 * 
 * Script per la gestione della registrazione e modifica artisti nel sistema RECORP ALL-IN-ONE.
 * Integrato con sistema agibilità per callback e prefill automatici.
 * 
 * @author RECORP ALL-IN-ONE
 * @version 5.1 - Integrazione Agibilità Corretta - Errori Sintassi Risolti
 */

// Import Supabase DatabaseService
import { DatabaseService } from './supabase-config.js';

// 🆕 VARIABILI GLOBALI INTEGRAZIONE AGIBILITÀ
let isFromAgibilita = false;           // True se aperto da sistema agibilità
let agibilitaCallbackUrl = null;      // URL di callback per ritorno
let agibilitaPrefillData = null;      // Dati precompilati da agibilità
let lastRegisteredArtist = null;      // Ultimo artista registrato per callback

// Variabili globali esistenti
let currentMode = null;
let currentArtistId = null;
let allArtists = [];

// Lista completa dei paesi esteri (mantenuta uguale)
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

// Paesi UE (mantenuti uguali)
const PAESI_UE = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// 🆕 INIZIALIZZAZIONE CON GESTIONE PARAMETRI AGIBILITÀ
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema gestione artisti con integrazione agibilità...');
    
    // 1. Analizza parametri URL per integrazione agibilità
    parseUrlParameters();
    
    // 2. Setup UI per integrazione agibilità
    setupAgibilitaIntegration();
    
    // Mostra indicatore caricamento
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
        debugDatabaseStatus();
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
    
    // Ora che tutto è caricato, inizializza i componenti
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    loadProvinces();
    setupEventListeners();
    setupAgibilitaEventListeners(); // 🆕 Event listeners agibilità
    setupNazionalitaHandling(); // Importante per nazionalità
    
    // Event listeners esistenti
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
    
    // 🆕 Se aperto da agibilità, vai direttamente alla modalità new
    if (isFromAgibilita) {
        console.log('🎭 Apertura da agibilità - modalità automatica');
        selectMode('new');
    }
});

// 🆕 FUNZIONI GESTIONE INTEGRAZIONE AGIBILITÀ

function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Controlla se proviene da agibilità
    isFromAgibilita = urlParams.get('source') === 'agibilita';
    
    // Ottieni URL di callback
    agibilitaCallbackUrl = urlParams.get('callback');
    
    // Ottieni dati di prefill
    const prefillParam = urlParams.get('prefill');
    if (prefillParam) {
        try {
            agibilitaPrefillData = JSON.parse(prefillParam);
            console.log('📝 Dati prefill da agibilità:', agibilitaPrefillData);
        } catch (error) {
            console.warn('⚠️ Errore parsing dati prefill:', error);
            agibilitaPrefillData = null;
        }
    }
    
    // Forza modalità se specificata
    const forcedMode = urlParams.get('mode');
    if (forcedMode) {
        currentMode = forcedMode;
    }
    
    console.log('🔗 Parametri agibilità:', {
        isFromAgibilita: isFromAgibilita,
        agibilitaCallbackUrl: agibilitaCallbackUrl,
        hasPrefillData: !!agibilitaPrefillData,
        forcedMode: forcedMode
    });
}

function setupAgibilitaIntegration() {
    if (!isFromAgibilita) return;
    
    // Mostra indicatore sorgente
    const sourceIndicator = document.getElementById('sourceIndicator');
    if (sourceIndicator) {
        sourceIndicator.style.display = 'flex';
    }
    
    // Mostra breadcrumb
    const breadcrumb = document.getElementById('agibilitaBreadcrumb');
    if (breadcrumb) {
        breadcrumb.style.display = 'block';
    }
    
    // Aggiorna titoli
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    if (pageTitle) {
        pageTitle.textContent = 'Registrazione Completa Artista';
    }
    
    if (pageSubtitle) {
        pageSubtitle.textContent = 'Form completo per registrazione artista nel sistema agibilità';
    }
    
    // Mostra pulsante ritorno se c'è callback
    if (agibilitaCallbackUrl) {
        const backBtn = document.getElementById('backToAgibilitaFormBtn');
        if (backBtn) {
            backBtn.style.display = 'inline-block';
        }
    }
    
    console.log('🎭 UI agibilità configurata');
}

function setupAgibilitaEventListeners() {
    // Pulsante ritorno ad agibilità (senza salvare)
    const backToAgibilitaFormBtn = document.getElementById('backToAgibilitaFormBtn');
    if (backToAgibilitaFormBtn) {
        backToAgibilitaFormBtn.addEventListener('click', returnToAgibilita);
    }
    
    // Pulsante aggiungi ad agibilità (dal success)
    const addToAgibilitaBtn = document.getElementById('addToAgibilitaBtn');
    if (addToAgibilitaBtn) {
        addToAgibilitaBtn.addEventListener('click', addToAgibilitaAndReturn);
    }
    
    // Pulsante torna ad agibilità (dal success)
    const backToAgibilitaBtn = document.getElementById('backToAgibilitaBtn');
    if (backToAgibilitaBtn) {
        backToAgibilitaBtn.addEventListener('click', returnToAgibilita);
    }
    
    // Pulsante cancella prefill
    const clearPrefillBtn = document.getElementById('clearPrefillBtn');
    if (clearPrefillBtn) {
        clearPrefillBtn.addEventListener('click', clearPrefillData);
    }
    
    console.log('✅ Event listeners agibilità configurati');
}

function applyPrefillData() {
    if (!agibilitaPrefillData) return;
    
    console.log('📝 Applicazione dati prefill...');
    
    // Mostra alert prefill
    const prefillInfo = document.getElementById('prefillInfo');
    if (prefillInfo) {
        prefillInfo.style.display = 'block';
    }
    
    // Applica i dati ai campi
    Object.keys(agibilitaPrefillData).forEach(key => {
        const field = document.getElementById(key) || 
                     document.querySelector(`[name="${key}"]`);
        
        if (field && agibilitaPrefillData[key]) {
            field.value = agibilitaPrefillData[key];
            
            // Trigger eventi per validazione
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    
    console.log('✅ Dati prefill applicati');
}

function clearPrefillData() {
    agibilitaPrefillData = null;
    
    const prefillInfo = document.getElementById('prefillInfo');
    if (prefillInfo) {
        prefillInfo.style.display = 'none';
    }
    
    // Reset form
    resetForm();
    
    showSuccess('Dati precompilati cancellati');
    console.log('🧹 Dati prefill cancellati');
}

function returnToAgibilita() {
    console.log('🔙 Ritorno al sistema agibilità');
    
    if (window.opener && !window.opener.closed) {
        // Se aperto in popup, chiudi la finestra
        try {
            window.opener.focus();
            window.close();
        } catch (error) {
            console.warn('⚠️ Impossibile chiudere popup:', error);
            fallbackReturnToAgibilita();
        }
    } else {
        // Fallback: redirect diretto
        fallbackReturnToAgibilita();
    }
}

function fallbackReturnToAgibilita() {
    if (agibilitaCallbackUrl) {
        window.location.href = agibilitaCallbackUrl;
    } else {
        // Default: vai alla pagina agibilità
        window.location.href = './agibilita.html';
    }
}

function addToAgibilitaAndReturn() {
    if (!lastRegisteredArtist) {
        showError('Nessun artista registrato da aggiungere');
        return;
    }
    
    console.log('➕ Aggiunta artista ad agibilità e ritorno');
    
    // Invia messaggio al parent con l'artista
    if (window.opener && !window.opener.closed) {
        try {
            window.opener.postMessage({
                type: 'artistRegistered',
                artist: lastRegisteredArtist,
                addToList: true
            }, '*');
            
            showSuccess('Artista aggiunto ad agibilità!');
            
            setTimeout(() => {
                window.opener.focus();
                window.close();
            }, 1500);
            
        } catch (error) {
            console.error('❌ Errore invio messaggio:', error);
            fallbackReturnToAgibilita();
        }
    } else {
        fallbackReturnToAgibilita();
    }
}

function notifyArtistRegistrationToAgibilita(artist) {
    if (!isFromAgibilita) return;
    
    console.log('📤 Notifica registrazione artista ad agibilità');
    lastRegisteredArtist = artist;
    
    // Aggiorna UI success per agibilità
    const successActions = document.getElementById('successActions');
    const successText = document.getElementById('successText');
    
    if (successActions) {
        successActions.style.display = 'block';
    }
    
    if (successText) {
        successText.textContent = `${artist.nome} ${artist.cognome} registrato con successo!`;
    }
    
    // Invia messaggio automatico se è un popup
    if (window.opener && !window.opener.closed) {
        try {
            window.opener.postMessage({
                type: 'artistRegistered',
                artist: artist,
                addToList: false // Non aggiungere automaticamente
            }, '*');
        } catch (error) {
            console.warn('⚠️ Errore notifica automatica:', error);
        }
    }
}

// ==================== FUNZIONI ESISTENTI (MANTENUTE UGUALI) ====================

function debugDatabaseStatus() {
    console.log('🔍 Debug Database Status:');
    console.log('- window.GIDatabase exists:', !!window.GIDatabase);
    console.log('- isLoaded:', window.GIDatabase?.isLoaded());
    console.log('- comuniValidita loaded:', !!window.GIDatabase?.data?.comuniValidita);
    console.log('- comuni loaded:', !!window.GIDatabase?.data?.comuni);
    
    if (window.GIDatabase) {
        window.GIDatabase.showStatus();
    }
}

async function initializeRegistrationSystem() {
    try {
        console.log('🔗 Test connessione database...');
        
        allArtists = await DatabaseService.getAllArtisti();
        console.log('✅ Sistema gestione artisti pronto! Database contiene:', allArtists.length, 'artisti');
        
        return true;
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema:', error);
        showError('Errore di connessione al database. Controlla la configurazione.');
        return false;
    }
}

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
        
        if (isFromAgibilita) {
            pageTitle.textContent = 'Registrazione Completa Artista';
            pageSubtitle.textContent = 'Form completo per registrazione artista nel sistema agibilità';
        } else {
            pageTitle.textContent = 'Registrazione Nuovo Artista';
            pageSubtitle.textContent = 'Inserisci i dati dell\'artista per aggiungerlo al database';
        }
        
        document.getElementById('submitText').textContent = 'Registra Artista';
        
        resetForm();
        currentArtistId = null;
        
        if (agibilitaPrefillData) {
            setTimeout(() => {
                applyPrefillData();
            }, 500);
        }
        
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
    
    if (isFromAgibilita) {
        returnToAgibilita();
        return;
    }
    
    modeSelection.style.display = 'block';
    artistSelection.style.display = 'none';
    registrationForm.style.display = 'none';
    
    pageTitle.textContent = 'Gestione Artisti';
    pageSubtitle.textContent = 'Scegli un\'azione da eseguire';
    
    resetForm();
}

function displayArtistsForSelection() {
    const container = document.getElementById('artistsListContainer');
    const searchInput = document.getElementById('searchArtistInput');
    
    searchInput.addEventListener('input', filterArtistsForSelection);
    
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
    
    if (artists.length === 0) {
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
    
    populateFormWithArtist(artist);
}

function populateFormWithArtist(artist) {
    try {
        console.log('📝 Popolamento form con dati artista:', artist);
        
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
        
        document.getElementById('indirizzo').value = artist.indirizzo || '';
        
        if (!document.getElementById('provincia').options.length || document.getElementById('provincia').options.length <= 1) {
            console.log('⏳ Province non ancora caricate, ricarico...');
            loadProvinces();
            setTimeout(() => populateAddressFields(artist), 500);
        } else {
            populateAddressFields(artist);
        }
    } catch (error) {
        console.error('❌ Errore popolamento form:', error);
        showError('Errore nel caricamento dei dati dell\'artista');
    }
}

function populateAddressFields(artist) {
    console.log('📍 Popolamento campi indirizzo per:', artist.nazionalita, artist.provincia, artist.citta);
    
    if (artist.nazionalita === 'IT' || !artist.nazionalita || artist.provincia !== 'EE') {
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
                    
                    if (artist.codice_istat_citta) {
                        console.log('🏛️ Seleziono città per codice ISTAT:', artist.codice_istat_citta);
                        cittaSelect.value = artist.codice_istat_citta;
                    } else if (artist.citta) {
                        console.log('🏛️ Cerco città per nome:', artist.citta);
                        const cittaOption = Array.from(cittaSelect.options).find(opt => 
                            opt.textContent === artist.citta || opt.textContent.toLowerCase() === artist.citta.toLowerCase()
                        );
                        if (cittaOption) {
                            cittaSelect.value = cittaOption.value;
                        }
                    }
                    
                    if (cittaSelect.value) {
                        loadCAP(cittaSelect.value);
                        
                        setTimeout(() => {
                            if (artist.cap && artist.cap !== '00000') {
                                console.log('📮 Seleziono CAP:', artist.cap);
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
            } else {
                console.warn('⚠️ Provincia non trovata nel select:', artist.provincia);
            }
        }
    } else {
        console.log('🌍 Artista straniero, nascondo campi italiani');
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
    
    console.log('✅ Form popolato con dati artista:', artist.nome, artist.cognome);
}

function showPartitaIvaFields() {
    document.getElementById('partitaIvaGroup').style.display = 'block';
    document.getElementById('partitaIva').required = true;
    
    document.getElementById('tipoRapportoGroup').style.display = 'none';
    document.getElementById('tipoRapporto').required = false;
    
    document.getElementById('codiceComunicazioneGroup').style.display = 'none';
    document.getElementById('codiceComunicazione').required = false;
}

function showTipoRapportoFields() {
    document.getElementById('partitaIvaGroup').style.display = 'none';
    document.getElementById('partitaIva').required = false;
    document.getElementById('partitaIva').value = '';
    
    document.getElementById('tipoRapportoGroup').style.display = 'block';
    document.getElementById('tipoRapporto').required = true;
    
    const tipoRapporto = document.getElementById('tipoRapporto').value;
    if (tipoRapporto === 'chiamata') {
        showCodiceComunicazioneField();
    } else {
        hideCodiceComunicazioneField();
    }
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

function setupNazionalitaHandling() {
    const nazionalitaSelect = document.getElementById('nazionalita');
    const paeseResidenzaGroup = document.getElementById('paeseResidenzaGroup');
    const foreignNotice = document.getElementById('foreignAddressNotice');
    
    if (nazionalitaSelect) {
        nazionalitaSelect.addEventListener('change', function(e) {
            const selectedValue = e.target.value;
            
            updateCodiceFiscaleRequirement();
            updateAddressPlaceholder();
            
            if (selectedValue === 'IT') {
                showItalianAddressFields();
                if (paeseResidenzaGroup) {
                    paeseResidenzaGroup.style.display = 'none';
                }
                if (foreignNotice) {
                    foreignNotice.style.display = 'none';
                }
            } else if (selectedValue === 'EU' || selectedValue === 'EX') {
                showForeignAddressFields();
                if (paeseResidenzaGroup) {
                    paeseResidenzaGroup.style.display = 'block';
                    loadPaesiEsteri(selectedValue);
                }
                if (foreignNotice) {
                    foreignNotice.style.display = 'block';
                }
            }
        });
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
    
    if (document.getElementById('provincia').value === '') {
        document.getElementById('citta').innerHTML = '<option value="">Prima seleziona la provincia</option>';
        document.getElementById('citta').disabled = true;
        document.getElementById('cap').innerHTML = '<option value="">Prima seleziona la città</option>';
        document.getElementById('cap').disabled = true;
    }
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
    
    document.getElementById('provincia').value = '';
    document.getElementById('citta').value = '';
    document.getElementById('cap').value = '';
}

function findComuneByCodCatastaleReg(codice) {
    console.log('🔍 Ricerca comune con codice Belfiore:', codice);
    
    const comuneInfo = window.GIDatabase.getComuneByCodiceBelfiore(codice);
    
    if (comuneInfo) {
        console.log('✅ Comune trovato:', comuneInfo);
        return comuneInfo;
    }
    
    if (codice.startsWith('Z')) {
        console.log('🌍 Codice stato estero rilevato');
        const statiEsteri = {
            'Z100': 'ALBANIA',
            'Z102': 'AUSTRIA',
            'Z103': 'BELGIO',
            'Z111': 'FRANCIA',
            'Z112': 'GERMANIA',
            'Z113': 'REGNO UNITO',
            'Z114': 'GRECIA',
            'Z127': 'SPAGNA',
            'Z129': 'SVIZZERA',
            'Z436': 'STATI UNITI'
        };
        
        if (statiEsteri[codice]) {
            return {
                nome: statiEsteri[codice],
                provincia: 'EE'
            };
        }
    }
    
    console.log('❌ Comune non trovato per codice:', codice);
    return null;
}

function loadProvinces() {
    try {
        const provinceSelect = document.getElementById('provincia');
        if (!provinceSelect) return;
        
        if (provinceSelect.options.length > 1) {
            console.log('✅ Province già caricate, skip');
            return;
        }
        
        provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
            console.error('❌ Database GI non disponibile');
            setTimeout(() => loadProvinces(), 1000);
            return;
        }
        
        const province = window.GIDatabase.getProvince();
        
        if (province.length === 0) {
            console.error('❌ Nessuna provincia trovata nel database');
            provinceSelect.innerHTML = '<option value="">Errore: nessuna provincia disponibile</option>';
            showError('Impossibile caricare le province. Verificare i file di database.');
            return;
        }
        
        console.log(`✅ Caricate ${province.length} province dal database`);
        
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
        
        console.log('✅ Select province popolato con successo');
        
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
    try {
        const cittaSelect = document.getElementById('citta');
        const capSelect = document.getElementById('cap');
        
        cittaSelect.innerHTML = '<option value="">Caricamento città...</option>';
        cittaSelect.disabled = true;
        capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
        capSelect.disabled = true;
        
        if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
            console.error('❌ Database GI non disponibile per loadCitta');
            cittaSelect.innerHTML = '<option value="">Errore: database non disponibile</option>';
            return;
        }
        
        const comuniProvincia = window.GIDatabase.getComuniByProvincia(provincia);
        
        if (comuniProvincia.length === 0) {
            console.warn(`⚠️ Nessun comune trovato per provincia: ${provincia}`);
            cittaSelect.innerHTML = '<option value="">Nessun comune trovato</option>';
            return;
        }
        
        console.log(`✅ Trovati ${comuniProvincia.length} comuni per provincia ${provincia}`);
        
        // Ordina per nome comune
        comuniProvincia.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Popola select
        cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
        
        comuniProvincia.forEach(comune => {
            const option = document.createElement('option');
            option.value = comune.codiceCatastale;
            option.textContent = comune.nome;
            cittaSelect.appendChild(option);
        });
        
        cittaSelect.disabled = false;
        console.log(`✅ Select città popolato per provincia ${provincia}`);
        
    } catch (error) {
        console.error('Errore caricamento città:', error);
        const cittaSelect = document.getElementById('citta');
        if (cittaSelect) {
            cittaSelect.innerHTML = '<option value="">Errore caricamento città</option>';
            cittaSelect.disabled = false;
        }
        showError('Errore nel caricamento delle città.');
    }
}

function loadCAP(codiceCatastale) {
    try {
        const capSelect = document.getElementById('cap');
        
        capSelect.innerHTML = '<option value="">Caricamento CAP...</option>';
        capSelect.disabled = true;
        
        if (!window.GIDatabase || !window.GIDatabase.isLoaded()) {
            console.error('❌ Database GI non disponibile per loadCAP');
            capSelect.innerHTML = '<option value="">Errore: database non disponibile</option>';
            return;
        }
        
        const capList = window.GIDatabase.getCAPByCodiceCatastale(codiceCatastale);
        
        if (!capList || capList.length === 0) {
            console.warn(`⚠️ Nessun CAP trovato per codice catastale: ${codiceCatastale}`);
            capSelect.innerHTML = '<option value="">Nessun CAP trovato</option>';
            return;
        }
        
        console.log(`✅ Trovati ${capList.length} CAP per comune ${codiceCatastale}`);
        
        // Popola select CAP
        capSelect.innerHTML = '<option value="">Seleziona CAP...</option>';
        
        // Ordina CAP
        const sortedCAP = [...capList].sort();
        
        sortedCAP.forEach(cap => {
            const option = document.createElement('option');
            option.value = cap;
            option.textContent = cap;
            capSelect.appendChild(option);
        });
        
        capSelect.disabled = false;
        console.log(`✅ Select CAP popolato per comune ${codiceCatastale}`);
        
    } catch (error) {
        console.error('Errore caricamento CAP:', error);
        const capSelect = document.getElementById('cap');
        if (capSelect) {
            capSelect.innerHTML = '<option value="">Errore caricamento CAP</option>';
            capSelect.disabled = false;
        }
        showError('Errore nel caricamento dei CAP.');
    }
}

function setupEventListeners() {
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
    
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    const telefono = document.getElementById('telefono');
    if (telefono) {
        telefono.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d+]/g, '');
            if (value.startsWith('+39')) {
                value = value.substring(0, 13);
            } else {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });
    }
    
    const codiceFiscale = document.getElementById('codiceFiscale');
    if (codiceFiscale) {
        codiceFiscale.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
            
            if (e.target.value.length === 16) {
                if (validateCodiceFiscale(e.target.value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                    
                    const extractedData = extractDataFromCF(e.target.value);
                    if (extractedData) {
                        if (extractedData.dataNascita) {
                            const dataNascitaField = document.getElementById('dataNascita');
                            if (dataNascitaField) {
                                dataNascitaField.value = extractedData.dataNascita;
                                dataNascitaField.dispatchEvent(new Event('change'));
                                
                                const existingAlert = dataNascitaField.parentElement.querySelector('.cf-mismatch-alert');
                                if (existingAlert) existingAlert.remove();
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
                        
                        showExtractedInfo(extractedData);
                    }
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                    const existingInfo = e.target.parentElement.querySelector('.cf-info-display');
                    if (existingInfo) existingInfo.remove();
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
                const existingInfo = e.target.parentElement.querySelector('.cf-info-display');
                if (existingInfo) existingInfo.remove();
            }
        });
    }
    
    const matricola = document.getElementById('matricolaENPALS');
    if (matricola) {
        matricola.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    const hasPartitaIva = document.getElementById('hasPartitaIva');
    if (hasPartitaIva) {
        hasPartitaIva.addEventListener('change', function(e) {
            if (e.target.value === 'si') {
                showPartitaIvaFields();
            } else if (e.target.value === 'no') {
                showTipoRapportoFields();
            } else {
                document.getElementById('partitaIvaGroup').style.display = 'none';
                document.getElementById('partitaIva').required = false;
                document.getElementById('partitaIva').value = '';
                
                document.getElementById('tipoRapportoGroup').style.display = 'none';
                document.getElementById('tipoRapporto').required = false;
                document.getElementById('tipoRapporto').value = '';
                
                document.getElementById('codiceComunicazioneGroup').style.display = 'none';
                document.getElementById('codiceComunicazione').required = false;
                document.getElementById('codiceComunicazione').value = '';
            }
        });
    }
    
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
    
    const email = document.getElementById('email');
    if (email) {
        email.addEventListener('blur', function(e) {
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
    }
    
    const provinciaNascita = document.getElementById('provinciaNascita');
    if (provinciaNascita) {
        provinciaNascita.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase().substring(0, 2);
        });
    }
    
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
    
    const dataNascita = document.getElementById('dataNascita');
    if (dataNascita) {
        dataNascita.addEventListener('change', function(e) {
            if (e.target.value) {
                const age = calculateAge(e.target.value);
                const ageText = age >= 18 ? `(${age} anni) ✓` : `(${age} anni) ❌ Minimo 18 anni`;
                
                let existingSpan = e.target.parentElement.querySelector('.age-indicator');
                if (!existingSpan) {
                    existingSpan = document.createElement('span');
                    existingSpan.className = 'age-indicator';
                    e.target.parentElement.appendChild(existingSpan);
                }
                
                existingSpan.textContent = ageText;
                existingSpan.style.color = age >= 18 ? '#059669' : '#dc2626';
                existingSpan.style.fontSize = '0.875rem';
                existingSpan.style.marginLeft = '8px';
                
                // Verifica concordanza con codice fiscale
                const cfField = document.getElementById('codiceFiscale');
                if (cfField && cfField.value.length === 16) {
                    const cfData = extractDataFromCF(cfField.value);
                    if (cfData && cfData.dataNascita !== e.target.value) {
                        showCFMismatchAlert(e.target, cfData.dataNascita);
                    } else {
                        const existingAlert = e.target.parentElement.querySelector('.cf-mismatch-alert');
                        if (existingAlert) existingAlert.remove();
                    }
                }
            }
        });
    }
}

// FUNZIONI VALIDAZIONE
function validateCodiceFiscale(cf) {
    if (cf.length !== 16) return false;
    
    const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    if (!pattern.test(cf)) return false;
    
    // Calcolo check digit
    const odd = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
    const even = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    let sum = 0;
    for (let i = 0; i < 15; i++) {
        const char = cf[i];
        const isOddPosition = i % 2 === 0;
        
        if (/[0-9]/.test(char)) {
            const digit = parseInt(char);
            sum += isOddPosition ? odd[digit] : even[digit];
        } else {
            const letterIndex = letters.indexOf(char);
            sum += isOddPosition ? odd[letterIndex + 10] : even[letterIndex + 10];
        }
    }
    
    const checkChar = letters[sum % 26];
    return checkChar === cf[15];
}

function extractDataFromCF(cf) {
    if (!validateCodiceFiscale(cf)) return null;
    
    try {
        // Estrai anno
        const yearDigits = cf.substring(6, 8);
        const currentYear = new Date().getFullYear();
        const currentYearLastTwo = currentYear % 100;
        
        let year;
        if (parseInt(yearDigits) <= currentYearLastTwo) {
            year = 2000 + parseInt(yearDigits);
        } else {
            year = 1900 + parseInt(yearDigits);
        }
        
        // Estrai mese
        const monthChar = cf[8];
        const months = { A: 1, B: 2, C: 3, D: 4, E: 5, H: 6, L: 7, M: 8, P: 9, R: 10, S: 11, T: 12 };
        const month = months[monthChar];
        
        // Estrai giorno e sesso
        const dayValue = parseInt(cf.substring(9, 11));
        let day, sesso;
        
        if (dayValue > 40) {
            day = dayValue - 40;
            sesso = 'F';
        } else {
            day = dayValue;
            sesso = 'M';
        }
        
        // Formatta data
        const dataNascita = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Estrai comune di nascita
        const codiceBelfiore = cf.substring(11, 15);
        const comuneInfo = findComuneByCodCatastaleReg(codiceBelfiore);
        
        return {
            dataNascita: dataNascita,
            sesso: sesso,
            luogoNascita: comuneInfo ? comuneInfo.nome : '',
            provinciaNascita: comuneInfo ? comuneInfo.provincia : '',
            codiceBelfiore: codiceBelfiore
        };
        
    } catch (error) {
        console.error('Errore estrazione dati CF:', error);
        return null;
    }
}

function showExtractedInfo(data) {
    const cfField = document.getElementById('codiceFiscale');
    const container = cfField.parentElement;
    
    // Rimuovi info esistente
    const existingInfo = container.querySelector('.cf-info-display');
    if (existingInfo) existingInfo.remove();
    
    // Crea nuovo display
    const infoDiv = document.createElement('div');
    infoDiv.className = 'cf-info-display';
    infoDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 12px; margin-top: 8px; font-size: 0.875rem;">
            <div style="font-weight: 600; color: #0369a1; margin-bottom: 4px;">✅ Dati estratti dal Codice Fiscale:</div>
            <div style="color: #0369a1;">
                📅 <strong>Data:</strong> ${data.dataNascita} | 
                👤 <strong>Sesso:</strong> ${data.sesso === 'M' ? 'Maschio' : 'Femmina'}
                ${data.luogoNascita ? ` | 🏛️ <strong>Luogo:</strong> ${data.luogoNascita} (${data.provinciaNascita})` : ''}
            </div>
        </div>
    `;
    
    container.appendChild(infoDiv);
}

function showCFMismatchAlert(dateField, cfDate) {
    const container = dateField.parentElement;
    
    // Rimuovi alert esistente
    const existingAlert = container.querySelector('.cf-mismatch-alert');
    if (existingAlert) existingAlert.remove();
    
    // Crea nuovo alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'cf-mismatch-alert';
    alertDiv.innerHTML = `
        <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px; padding: 12px; margin-top: 8px; font-size: 0.875rem;">
            <div style="font-weight: 600; color: #dc2626; margin-bottom: 4px;">⚠️ Attenzione: Date non concordanti</div>
            <div style="color: #dc2626;">
                La data inserita non corrisponde a quella del Codice Fiscale (${cfDate}). 
                Verifica i dati inseriti.
            </div>
        </div>
    `;
    
    container.appendChild(alertDiv);
}

function validatePartitaIva(piva) {
    if (piva.length !== 11) return false;
    if (!/^\d{11}$/.test(piva)) return false;
    
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let digit = parseInt(piva[i]);
        if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(piva[10]);
}

function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function validateIBAN(iban) {
    if (iban.length < 15 || iban.length > 34) return false;
    
    // Sposta le prime 4 caratteri alla fine
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    
    // Converti lettere in numeri
    let converted = '';
    for (let char of rearranged) {
        if (/[A-Z]/.test(char)) {
            converted += (char.charCodeAt(0) - 65 + 10).toString();
        } else {
            converted += char;
        }
    }
    
    // Calcola mod 97
    let remainder = '';
    for (let i = 0; i < converted.length; i++) {
        remainder += converted[i];
        if (remainder.length >= 9) {
            remainder = (parseInt(remainder) % 97).toString();
        }
    }
    
    return parseInt(remainder) % 97 === 1;
}

function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// GESTIONE FORM SUBMIT
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const originalText = submitText.textContent;
    
    try {
        submitBtn.disabled = true;
        submitText.textContent = currentMode === 'new' ? 'Registrazione...' : 'Salvataggio...';
        
        // Raccogli dati form
        const formData = collectFormData();
        
        // Validazione client-side
        const validation = validateFormData(formData);
        if (!validation.isValid) {
            showError(`Errori nel form: ${validation.errors.join(', ')}`);
            return;
        }
        
        // Salva nel database
        let result;
        if (currentMode === 'new') {
            // 🆕 Aggiungi metadati per tracciare origine
            if (isFromAgibilita) {
                formData.source = 'agibilita';
                formData.created_from = 'agibilita_system';
            }
            
            result = await DatabaseService.createArtista(formData);
        } else {
            result = await DatabaseService.updateArtista(currentArtistId, formData);
        }
        
        if (result) {
            const successMessage = currentMode === 'new' ? 
                `Artista ${formData.nome} ${formData.cognome} registrato con successo!` :
                `Dati di ${formData.nome} ${formData.cognome} aggiornati con successo!`;
            
            showSuccess(successMessage);
            
            // 🆕 Notifica registrazione ad agibilità se necessario
            if (currentMode === 'new' && isFromAgibilita) {
                notifyArtistRegistrationToAgibilita(result);
            }
            
            // Aggiorna lista artisti
            allArtists = await DatabaseService.getAllArtisti();
            
            // Reset form dopo successo
            if (currentMode === 'new') {
                setTimeout(() => {
                    if (!isFromAgibilita) {
                        resetForm();
                        goBackToModeSelection();
                    }
                }, 2000);
            } else {
                setTimeout(() => {
                    goBackToModeSelection();
                }, 2000);
            }
            
        } else {
            throw new Error('Errore durante il salvataggio');
        }
        
    } catch (error) {
        console.error('Errore submit form:', error);
        showError(`Errore durante il ${currentMode === 'new' ? 'salvataggio' : 'aggiornamento'}: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitText.textContent = originalText;
    }
}

function collectFormData() {
    const nazionalita = document.getElementById('nazionalita').value;
    
    const data = {
        codice_fiscale: document.getElementById('codiceFiscale').value || null,
        nome: document.getElementById('nome').value,
        cognome: document.getElementById('cognome').value,
        nome_arte: document.getElementById('nomeArte').value || null,
        data_nascita: document.getElementById('dataNascita').value,
        sesso: document.getElementById('sesso').value,
        luogo_nascita: document.getElementById('luogoNascita').value,
        provincia_nascita: document.getElementById('provinciaNascita').value || null,
        matricola_enpals: document.getElementById('matricolaENPALS').value || null,
        nazionalita: nazionalita,
        telefono: document.getElementById('telefono').value || null,
        email: document.getElementById('email').value || null,
        indirizzo: document.getElementById('indirizzo').value,
        mansione: document.getElementById('mansione').value,
        has_partita_iva: document.getElementById('hasPartitaIva').value === 'si',
        iban: document.getElementById('iban').value || null,
        note: document.getElementById('note').value || null
    };
    
    // Campi specifici per italiani vs stranieri
    if (nazionalita === 'IT') {
        data.provincia = document.getElementById('provincia').value;
        data.codice_istat_citta = document.getElementById('citta').value;
        data.cap = document.getElementById('cap').value;
        
        // Ottieni nome città dal codice
        if (data.codice_istat_citta && window.GIDatabase) {
            const comuneInfo = window.GIDatabase.getComuneByCodiceCatastale(data.codice_istat_citta);
            data.citta = comuneInfo ? comuneInfo.nome : '';
        }
    } else {
        data.provincia = 'EE'; // Estero
        data.citta = 'ESTERO';
        data.cap = '00000';
        data.codice_istat_citta = null;
        data.paese_residenza = document.getElementById('paeseResidenza').value || null;
    }
    
    // Campi specifici per partita IVA vs rapporto di lavoro
    if (data.has_partita_iva) {
        data.partita_iva = document.getElementById('partitaIva').value;
        data.tipo_rapporto = null;
        data.codice_comunicazione = null;
    } else {
        data.partita_iva = null;
        data.tipo_rapporto = document.getElementById('tipoRapporto').value;
        
        if (data.tipo_rapporto === 'chiamata') {
            data.codice_comunicazione = document.getElementById('codiceComunicazione').value;
        } else {
            data.codice_comunicazione = null;
        }
    }
    
    // Genera codice fiscale temporaneo se straniero senza CF
    if (!data.codice_fiscale && nazionalita !== 'IT') {
        data.codice_fiscale_temp = generateTempCF(data.nome, data.cognome, data.data_nascita);
    }
    
    return data;
}

function validateFormData(data) {
    const errors = [];
    
    // Validazioni obbligatorie
    if (!data.nome) errors.push('Nome obbligatorio');
    if (!data.cognome) errors.push('Cognome obbligatorio');
    if (!data.data_nascita) errors.push('Data di nascita obbligatoria');
    if (!data.sesso) errors.push('Sesso obbligatorio');
    if (!data.luogo_nascita) errors.push('Luogo di nascita obbligatorio');
    if (!data.nazionalita) errors.push('Nazionalità obbligatoria');
    if (!data.indirizzo) errors.push('Indirizzo obbligatorio');
    if (!data.mansione) errors.push('Mansione obbligatoria');
    
    // Validazioni specifiche per nazionalità italiana
    if (data.nazionalita === 'IT') {
        if (!data.codice_fiscale) errors.push('Codice fiscale obbligatorio per cittadini italiani');
        if (!data.provincia) errors.push('Provincia obbligatoria');
        if (!data.codice_istat_citta) errors.push('Città obbligatoria');
        if (!data.cap) errors.push('CAP obbligatorio');
    }
    
    // Validazioni specifiche per partita IVA
    if (data.has_partita_iva) {
        if (!data.partita_iva) errors.push('Partita IVA obbligatoria se selezionata');
    } else {
        if (!data.tipo_rapporto) errors.push('Tipo rapporto obbligatorio se non si ha partita IVA');
        if (data.tipo_rapporto === 'chiamata' && !data.codice_comunicazione) {
            errors.push('Codice comunicazione obbligatorio per contratti a chiamata');
        }
    }
    
    // Validazione età
    if (data.data_nascita) {
        const age = calculateAge(data.data_nascita);
        if (age < 18) errors.push('L\'artista deve essere maggiorenne');
    }
    
    // Validazione codice fiscale se presente
    if (data.codice_fiscale && !validateCodiceFiscale(data.codice_fiscale)) {
        errors.push('Codice fiscale non valido');
    }
    
    // Validazione partita IVA se presente
    if (data.partita_iva && !validatePartitaIva(data.partita_iva)) {
        errors.push('Partita IVA non valida');
    }
    
    // Validazione email se presente
    if (data.email && !validateEmail(data.email)) {
        errors.push('Email non valida');
    }
    
    // Validazione IBAN se presente
    if (data.iban && !validateIBAN(data.iban)) {
        errors.push('IBAN non valido');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function generateTempCF(nome, cognome, dataNascita) {
    const normalizeString = (str) => str.replace(/[^A-Z]/g, '').substring(0, 3).padEnd(3, 'X');
    
    const nomeCode = normalizeString(nome.toUpperCase());
    const cognomeCode = normalizeString(cognome.toUpperCase());
    const birthDate = new Date(dataNascita);
    
    const year = birthDate.getFullYear().toString().slice(-2);
    const month = String(birthDate.getMonth() + 1).padStart(2, '0');
    const day = String(birthDate.getDate()).padStart(2, '0');
    
    return `${cognomeCode}${nomeCode}${year}${month}${day}000T`;
}

// UTILITY FUNCTIONS
function resetForm() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.reset();
        
        // Reset campi specifici
        document.getElementById('nazionalita').value = 'IT';
        document.getElementById('hasPartitaIva').value = '';
        document.getElementById('tipoRapporto').value = '';
        
        // Reset state visual
        document.querySelectorAll('.valid, .invalid').forEach(el => {
            el.classList.remove('valid', 'invalid');
        });
        
        // Nascondi gruppi condizionali
        document.getElementById('partitaIvaGroup').style.display = 'none';
        document.getElementById('tipoRapportoGroup').style.display = 'none';
        document.getElementById('codiceComunicazioneGroup').style.display = 'none';
        document.getElementById('paeseResidenzaGroup').style.display = 'none';
        
        // Reset required
        document.getElementById('partitaIva').required = false;
        document.getElementById('tipoRapporto').required = false;
        document.getElementById('codiceComunicazione').required = false;
        
        // Reset select cascata
        document.getElementById('citta').innerHTML = '<option value="">Prima seleziona la provincia</option>';
        document.getElementById('citta').disabled = true;
        document.getElementById('cap').innerHTML = '<option value="">Prima seleziona la città</option>';
        document.getElementById('cap').disabled = true;
        
        // Rimuovi elementi dinamici
        document.querySelectorAll('.cf-info-display, .cf-mismatch-alert, .age-indicator').forEach(el => el.remove());
        
        // Mostra campi italiani di default
        showItalianAddressFields();
        updateCodiceFiscaleRequirement();
        updateAddressPlaceholder();
    }
}

function cancelRegistration() {
    if (confirm('Sei sicuro di voler annullare? Tutti i dati inseriti verranno persi.')) {
        if (isFromAgibilita) {
            returnToAgibilita();
        } else {
            goBackToModeSelection();
        }
    }
}

function showSuccess(message) {
    // Implementa il tuo sistema di notifiche
    console.log('✅ SUCCESS:', message);
    alert(message); // Placeholder - sostituisci con il tuo sistema di toast
}

function showError(message) {
    // Implementa il tuo sistema di notifiche  
    console.error('❌ ERROR:', message);
    alert('ERRORE: ' + message); // Placeholder - sostituisci con il tuo sistema di toast
}

// Debug e Export (per sviluppo)
if (typeof window !== 'undefined') {
    window.RegistrationArtistDebug = {
        currentMode: () => currentMode,
        currentArtistId: () => currentArtistId,
        allArtists: () => allArtists,
        isFromAgibilita: () => isFromAgibilita,
        agibilitaPrefillData: () => agibilitaPrefillData,
        lastRegisteredArtist: () => lastRegisteredArtist,
        testValidateCF: validateCodiceFiscale,
        testExtractCF: extractDataFromCF,
        testValidatePartitaIva: validatePartitaIva,
        testValidateEmail: validateEmail,
        testValidateIBAN: validateIBAN
    };
    
    console.log('🔧 Sistema Registrazione Artisti con Integrazione Agibilità caricato');
    console.log('🛠️ Debug disponibile in window.RegistrationArtistDebug');
}

console.log('📄 registrazione-artista.js v5.1 - Integrazione Agibilità - Caricato con successo');