// agibilita.js - Sistema Gestione Agibilità RECORP con Comunicazioni Intermittenti

// Import Supabase DatabaseService
import { DatabaseService } from '../supabase-config.js';
import { NotificationService } from '../notification-service.js';

// ==================== VARIABILI GLOBALI ====================
let selectedArtists = [];
let agibilitaData = {
    isModifica: false,
    codiceAgibilita: null,
    numeroRiservato: null
};

// Database - ora caricati da Supabase
let artistsDB = [];
let agibilitaDB = [];
let venuesDB = [];
let invoiceDB = [];
let bozzeDB = [];

// Nuova variabile per tracciare conferme compensi
let compensiConfermati = new Set();

// Variabili per autosalvataggio e lock
let autosaveTimer = null;
let lockCheckTimer = null;
let currentLock = null;
let currentBozzaId = null;

// User session management
let userSession = {
    id: null,
    name: null,
    workstation: null
};

// ==================== ESPORTA FUNZIONI GLOBALI SUBITO ====================
function exportGlobalFunctions() {
    window.startNewAgibilita = startNewAgibilita;
    window.showEditAgibilita = showEditAgibilita;
    window.showBozzeAgibilita = showBozzeAgibilita;
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
    window.loadCitta = loadCitta;
    window.loadCAP = loadCAP;
    window.searchVenue = searchVenue;
    window.selectVenue = selectVenue;
    window.copyVenueAddress = copyVenueAddress;
    window.showTab = showTab;
    window.downloadAndSave = downloadAndSave;
    window.confirmAndProceed = confirmAndProceed;
    window.saveBozza = saveBozza;
    window.newAgibilita = newAgibilita;
    window.filterAgibilita = filterAgibilita;
    window.editAgibilita = editAgibilita;
    window.duplicateAgibilita = duplicateAgibilita;
    window.cancelAgibilita = cancelAgibilita;
    window.searchInvoiceData = searchInvoiceData;
    window.selectInvoiceFromSearch = selectInvoiceFromSearch;
    window.loadSelectedInvoiceData = loadSelectedInvoiceData;
    window.loadBozza = loadBozza;
    window.deleteBozza = deleteBozza;
    window.forceUnlock = forceUnlock;
    window.showCalendarView = showCalendarView;
    window.changeCalendarMonth = changeCalendarMonth;
    window.closeCalendarModal = closeCalendarModal;
    window.loadCitiesForProvince = function() {
        const provincia = document.getElementById('provincia').value;
        if (provincia) {
            loadCitta(provincia);
        }
    };
    window.loadCAPsForCity = function() {
        const citta = document.getElementById('citta').value;
        if (citta) {
            loadCAP(citta);
        }
    };
}

// Esporta le funzioni immediatamente
exportGlobalFunctions();

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema agibilità...');
    
    // Inizializza sessione utente
    await initializeUserSession();
    
    // Test connessione e carica dati
    await initializeAgibilitaSystem();
    
    // Inizializza date
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const dataInizio = document.getElementById('dataInizio');
    if (dataInizio) {
        dataInizio.value = today;
        dataInizio.min = today;
        
        // MODIFICA: Aggiungi event listener per autocompilare data fine
        dataInizio.addEventListener('change', function() {
            autocompletaDataFine();
        });
    }
    
    const dataFine = document.getElementById('dataFine');
    if (dataFine) {
        dataFine.min = today;
        // MODIFICA: Imposta automaticamente domani come data fine
        dataFine.value = tomorrowStr;
    }

    // Inizializza località
    console.log('📍 Inizializzazione database località...');
    
    // Aspetta che il database GI sia caricato
    setTimeout(() => {
        loadProvinces();
        setupEventListeners();
        updateDashboardStats();
        
        // Focus sul primo campo
        const descrizioneLocale = document.getElementById('descrizioneLocale');
        if (descrizioneLocale) descrizioneLocale.focus();
    }, 1500);
    
    // Inizializza shortcuts tastiera
    initializeKeyboardShortcuts();
});

// NUOVA FUNZIONE: Autocompila data fine con giorno successivo
function autocompletaDataFine() {
    const dataInizioInput = document.getElementById('dataInizio');
    const dataFineInput = document.getElementById('dataFine');
    
    if (dataInizioInput && dataFineInput && dataInizioInput.value) {
        const dataInizio = new Date(dataInizioInput.value);
        dataInizio.setDate(dataInizio.getDate() + 1);
        dataFineInput.value = dataInizio.toISOString().split('T')[0];
        
        // Trigger evento change per aggiornare le info
        dataFineInput.dispatchEvent(new Event('change'));
    }
}

// Inizializza sessione utente
async function initializeUserSession() {
    // Recupera o genera session ID
    let sessionId = localStorage.getItem('userSessionId');
    if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('userSessionId', sessionId);
    }
    
    // Recupera nome utente salvato
    let userName = localStorage.getItem('userName');
    const rememberMe = localStorage.getItem('rememberUser') === 'true';
    
    // Se non c'è nome salvato o remember me è false, chiedi
    if (!userName || !rememberMe) {
        const modal = createWelcomeModal();
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Aspetta input utente
        await new Promise(resolve => {
            window.saveUserName = function() {
                const nameInput = document.getElementById('userNameInput');
                const rememberCheckbox = document.getElementById('rememberMe');
                
                if (nameInput.value.trim()) {
                    userName = nameInput.value.trim();
                    localStorage.setItem('userName', userName);
                    localStorage.setItem('rememberUser', rememberCheckbox.checked);
                    modal.remove();
                    resolve();
                }
            };
        });
    }
    
    // Genera workstation ID
    const workstationId = btoa(
        navigator.userAgent + screen.width + screen.height
    ).substring(0, 8);
    
    userSession = {
        id: sessionId,
        name: userName,
        workstation: workstationId
    };
    
    console.log('👤 Sessione utente inizializzata:', userSession);
}

// Crea modal di benvenuto
function createWelcomeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal welcome-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>👋 Benvenuto!</h2>
            </div>
            <div class="modal-body">
                <p>Per una migliore esperienza, inserisci il tuo nome:</p>
                <div class="form-group">
                    <input type="text" id="userNameInput" class="form-control" 
                           placeholder="Il tuo nome..." autofocus>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="rememberMe" checked style="margin-right: 8px;">
                        Ricorda su questo dispositivo
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveUserName()">Continua</button>
            </div>
        </div>
    `;
    return modal;
}

// Genera ID sessione univoco
function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// Inizializzazione sistema agibilità con Supabase
async function initializeAgibilitaSystem() {
    try {
        console.log('📥 Caricamento dati da Supabase...');
        
        // Carica artisti
        artistsDB = await DatabaseService.getAllArtisti();
        console.log(`✅ ${artistsDB.length} artisti caricati`);
        
        // Carica agibilità
        agibilitaDB = await DatabaseService.getAgibilita();
        console.log(`✅ ${agibilitaDB.length} agibilità caricate`);
        
        // Carica venues
        venuesDB = await DatabaseService.getVenues();
        console.log(`✅ ${venuesDB.length} venues caricati`);
        
        // Carica tutti i dati di fatturazione
        invoiceDB = await DatabaseService.getAllInvoiceData();
        console.log(`✅ ${invoiceDB.length} dati fatturazione caricati`);
        
        // Carica bozze
        bozzeDB = await DatabaseService.getBozze();
        console.log(`✅ ${bozzeDB.length} bozze caricate`);
        
        console.log('🎉 Sistema agibilità inizializzato con Supabase!');
        return true;
        
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema agibilità:', error);
        showToast('Errore nel caricamento dei dati: ' + error.message, 'error');
        return false;
    }
}

// ==================== SISTEMA NOTIFICHE TOAST ====================
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toast-container') || createToastContainer();
    container.appendChild(toast);
    
    // Animazione entrata
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Rimozione automatica
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return icons[type] || icons.info;
}

// ==================== FUNZIONI NAVIGAZIONE ====================
function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    
    // Rimuovi active da tutte le sezioni
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Aggiungi active alla sezione target
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Aggiorna progress bar
        updateProgressBar();
        
        // Scroll top
        window.scrollTo(0, 0);
    }
}

async function startNewAgibilita() {
    console.log('Starting new agibilità');
    
    try {
        // Prenota numero agibilità
        const numeroRiservato = await DatabaseService.reserveAgibilitaNumber();
        
        agibilitaData.isModifica = false;
        agibilitaData.codiceAgibilita = null;
        agibilitaData.numeroRiservato = numeroRiservato;
        
        selectedArtists = [];
        compensiConfermati.clear();
        clearAllForms();
        
        // Mostra il numero riservato
        showToast(`Numero agibilità riservato: ${numeroRiservato}`, 'success');
        
        // Inizia autosalvataggio
        startAutosave();
        
        showSection('step1');
        
    } catch (error) {
        console.error('Errore prenotazione numero:', error);
        showToast('Errore nella prenotazione del numero agibilità', 'error');
    }
}

function showEditAgibilita() {
    console.log('Showing edit agibilità');
    const editListSection = document.getElementById('editListSection');
    if (editListSection) {
        editListSection.style.display = 'block';
        showExistingAgibilita();
    }
}

// NUOVA FUNZIONE: Mostra bozze
function showBozzeAgibilita() {
    console.log('Showing bozze');
    const bozzeSection = document.getElementById('bozzeSection');
    if (bozzeSection) {
        bozzeSection.style.display = 'block';
        showExistingBozze();
    }
}

// ==================== GESTIONE BOZZE ====================
async function showExistingBozze() {
    const listDiv = document.getElementById('bozzeList');
    if (!listDiv) return;
    
    // Ricarica bozze dal database
    bozzeDB = await DatabaseService.getBozze();
    
    if (bozzeDB.length === 0) {
        listDiv.innerHTML = '<p class="no-data-message">Nessuna bozza trovata</p>';
        return;
    }
    
    const bozzeHTML = bozzeDB.map(bozza => {
        const isLocked = bozza.locked_by && bozza.locked_until > new Date().toISOString();
        const lockInfo = isLocked ? `🔒 In modifica da ${bozza.locked_by_name}` : '';
        const completamento = calculateCompletamento(bozza.data);
        
        return `
            <div class="bozza-item ${isLocked ? 'locked' : ''}">
                <div class="bozza-info">
                    <div class="bozza-header">
                        <span class="bozza-code">[BOZZA-${bozza.id}]</span>
                        <span class="bozza-date">Salvata: ${new Date(bozza.updated_at).toLocaleString('it-IT')}</span>
                    </div>
                    <div class="bozza-progress">
                        <div class="progress-bar-mini">
                            <div class="progress-fill" style="width: ${completamento}%"></div>
                        </div>
                        <span class="progress-text">${completamento}% completo</span>
                    </div>
                    ${bozza.data.locale ? `<div class="bozza-location">📍 ${bozza.data.locale.descrizione || 'Locale non specificato'}</div>` : ''}
                    ${bozza.data.artisti && bozza.data.artisti.length > 0 ? `<div class="bozza-artists">🎭 ${bozza.data.artisti.length} artisti</div>` : ''}
                    ${lockInfo ? `<div class="lock-info">${lockInfo}</div>` : ''}
                </div>
                <div class="bozza-actions">
                    ${isLocked ? 
                        `<button class="btn btn-secondary btn-sm" onclick="forceUnlock(${bozza.id})">🔓 Sblocca</button>` :
                        `<button class="btn btn-primary btn-sm" onclick="loadBozza(${bozza.id})">📝 Riprendi</button>`
                    }
                    <button class="btn btn-danger btn-sm" onclick="deleteBozza(${bozza.id})">🗑️ Elimina</button>
                </div>
            </div>
        `;
    }).join('');
    
    listDiv.innerHTML = bozzeHTML;
}

// Calcola percentuale completamento bozza
function calculateCompletamento(bozzaData) {
    let campiTotali = 0;
    let campiCompilati = 0;
    
    // Controlla artisti
    if (bozzaData.artisti && bozzaData.artisti.length > 0) {
        campiCompilati += 2;
    }
    campiTotali += 2;
    
    // Controlla date
    if (bozzaData.dataInizio) campiCompilati++;
    if (bozzaData.dataFine) campiCompilati++;
    campiTotali += 2;
    
    // Controlla locale
    if (bozzaData.locale) {
        if (bozzaData.locale.descrizione) campiCompilati++;
        if (bozzaData.locale.indirizzo) campiCompilati++;
        if (bozzaData.locale.citta) campiCompilati++;
        if (bozzaData.locale.cap) campiCompilati++;
        if (bozzaData.locale.provincia) campiCompilati++;
    }
    campiTotali += 5;
    
    // Controlla fatturazione
    if (bozzaData.fatturazione) {
        if (bozzaData.fatturazione.ragioneSociale) campiCompilati++;
        if (bozzaData.fatturazione.indirizzo) campiCompilati++;
        if (bozzaData.fatturazione.citta) campiCompilati++;
        if (bozzaData.fatturazione.cap) campiCompilati++;
        if (bozzaData.fatturazione.provincia) campiCompilati++;
    }
    campiTotali += 5;
    
    return Math.round((campiCompilati / campiTotali) * 100);
}

// Carica bozza
async function loadBozza(bozzaId) {
    try {
        // Verifica lock
        const lockResult = await DatabaseService.lockBozza(bozzaId, userSession);
        
        if (!lockResult.success) {
            showToast(`Bozza bloccata da ${lockResult.locked_by}`, 'warning');
            return;
        }
        
        // Carica dati bozza
        const bozza = bozzeDB.find(b => b.id === bozzaId);
        if (!bozza) {
            showToast('Bozza non trovata', 'error');
            return;
        }
        
        currentBozzaId = bozzaId;
        currentLock = lockResult.lock;
        
        // Ripristina dati
        restoreBozzaData(bozza.data);
        
        // Nascondi sezione bozze e mostra step1
        document.getElementById('bozzeSection').style.display = 'none';
        showSection('step1');
        
        // Inizia autosalvataggio e controllo lock
        startAutosave();
        startLockCheck();
        
        showToast('Bozza caricata con successo', 'success');
        
    } catch (error) {
        console.error('Errore caricamento bozza:', error);
        showToast('Errore nel caricamento della bozza', 'error');
    }
}

// Ripristina dati da bozza
function restoreBozzaData(data) {
    // Ripristina agibilità data
    if (data.agibilitaData) {
        agibilitaData = data.agibilitaData;
    }
    
    // Ripristina artisti
    if (data.artisti) {
        selectedArtists = data.artisti;
        updateArtistsList();
    }
    
    // Ripristina date
    if (data.dataInizio) document.getElementById('dataInizio').value = data.dataInizio;
    if (data.dataFine) document.getElementById('dataFine').value = data.dataFine;
    
    // Ripristina locale
    if (data.locale) {
        if (data.locale.descrizione) document.getElementById('descrizioneLocale').value = data.locale.descrizione;
        if (data.locale.indirizzo) document.getElementById('indirizzo').value = data.locale.indirizzo;
        if (data.locale.provincia) {
            document.getElementById('provincia').value = data.locale.provincia;
            loadCitta(data.locale.provincia);
            
            setTimeout(() => {
                if (data.locale.citta) {
                    document.getElementById('citta').value = data.locale.citta;
                    loadCAP(data.locale.citta);
                    
                    setTimeout(() => {
                        if (data.locale.cap) document.getElementById('cap').value = data.locale.cap;
                    }, 100);
                }
            }, 100);
        }
    }
    
    // Ripristina fatturazione
    if (data.fatturazione) {
        Object.keys(data.fatturazione).forEach(key => {
            const element = document.getElementById(key);
            if (element) element.value = data.fatturazione[key];
        });
    }
}

// Elimina bozza
async function deleteBozza(bozzaId) {
    if (!confirm('Sei sicuro di voler eliminare questa bozza?')) return;
    
    try {
        await DatabaseService.deleteBozza(bozzaId);
        showToast('Bozza eliminata', 'success');
        showExistingBozze();
    } catch (error) {
        console.error('Errore eliminazione bozza:', error);
        showToast('Errore nell\'eliminazione della bozza', 'error');
    }
}

// Forza sblocco
async function forceUnlock(bozzaId) {
    if (!confirm('Vuoi forzare lo sblocco di questa bozza?')) return;
    
    try {
        await DatabaseService.unlockBozza(bozzaId);
        showToast('Bozza sbloccata', 'success');
        showExistingBozze();
    } catch (error) {
        console.error('Errore sblocco bozza:', error);
        showToast('Errore nello sblocco della bozza', 'error');
    }
}

// ==================== AUTOSALVATAGGIO ====================
function startAutosave() {
    // Cancella timer esistente
    if (autosaveTimer) clearInterval(autosaveTimer);
    
    // Salva ogni minuto
    autosaveTimer = setInterval(async () => {
        if (currentBozzaId || agibilitaData.numeroRiservato) {
            await saveBozza(true); // true = autosave silenzioso
        }
    }, 60000); // 1 minuto
}

function stopAutosave() {
    if (autosaveTimer) {
        clearInterval(autosaveTimer);
        autosaveTimer = null;
    }
}

// Salva bozza
async function saveBozza(isAutosave = false) {
    try {
        const bozzaData = collectCurrentData();
        
        if (currentBozzaId) {
            // Aggiorna bozza esistente
            await DatabaseService.updateBozza(currentBozzaId, bozzaData);
        } else {
            // Crea nuova bozza
            const result = await DatabaseService.createBozza(bozzaData, userSession);
            currentBozzaId = result.id;
        }
        
        if (!isAutosave) {
            showToast('Bozza salvata con successo', 'success');
        } else {
            // Mostra indicatore discreto per autosave
            showAutosaveIndicator();
        }
        
    } catch (error) {
        console.error('Errore salvataggio bozza:', error);
        showToast('Errore nel salvataggio della bozza', 'error');
    }
}

// Mostra indicatore autosave
function showAutosaveIndicator() {
    const indicator = document.getElementById('autosave-indicator') || createAutosaveIndicator();
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2000);
}

function createAutosaveIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'autosave-indicator';
    indicator.className = 'autosave-indicator';
    indicator.innerHTML = '💾 Salvato automaticamente';
    document.body.appendChild(indicator);
    return indicator;
}

// Raccogli dati correnti
function collectCurrentData() {
    const cittaSelect = document.getElementById('citta');
    const selectedOption = cittaSelect ? cittaSelect.options[cittaSelect.selectedIndex] : null;
    const cittaNome = selectedOption ? selectedOption.textContent : '';
    
    return {
        agibilitaData: agibilitaData,
        artisti: selectedArtists,
        dataInizio: document.getElementById('dataInizio')?.value || '',
        dataFine: document.getElementById('dataFine')?.value || '',
        locale: {
            descrizione: document.getElementById('descrizioneLocale')?.value || '',
            indirizzo: document.getElementById('indirizzo')?.value || '',
            citta: document.getElementById('citta')?.value || '',
            cittaNome: cittaNome,
            cap: document.getElementById('cap')?.value || '',
            provincia: document.getElementById('provincia')?.value || ''
        },
        fatturazione: {
            ragioneSociale: document.getElementById('ragioneSociale')?.value || '',
            piva: document.getElementById('piva')?.value || '',
            codiceFiscale: document.getElementById('codiceFiscale')?.value || '',
            indirizzo: document.getElementById('indirizzoFatturazione')?.value || '',
            citta: document.getElementById('cittaFatturazione')?.value || '',
            cap: document.getElementById('capFatturazione')?.value || '',
            provincia: document.getElementById('provinciaFatturazione')?.value || '',
            codiceSDI: document.getElementById('codiceSDI')?.value || '',
            pec: document.getElementById('pecFatturazione')?.value || ''
        }
    };
}

// ==================== GESTIONE LOCK ====================
function startLockCheck() {
    // Cancella timer esistente
    if (lockCheckTimer) clearInterval(lockCheckTimer);
    
    // Controlla lock ogni 5 minuti
    lockCheckTimer = setInterval(async () => {
        if (currentLock && currentBozzaId) {
            try {
                await DatabaseService.renewLock(currentBozzaId, currentLock);
            } catch (error) {
                console.error('Errore rinnovo lock:', error);
                showToast('Attenzione: problema con il blocco della bozza', 'warning');
            }
        }
    }, 300000); // 5 minuti
}

function stopLockCheck() {
    if (lockCheckTimer) {
        clearInterval(lockCheckTimer);
        lockCheckTimer = null;
    }
}

// ==================== PROGRESS BAR ====================
function updateProgressBar() {
    const progressBar = document.getElementById('main-progress-bar') || createProgressBar();
    const steps = ['tipoSection', 'step1', 'step2', 'step3'];
    const currentStep = steps.findIndex(s => document.getElementById(s)?.classList.contains('active'));
    
    const progress = ((currentStep + 1) / steps.length) * 100;
    progressBar.querySelector('.progress-fill').style.width = `${progress}%`;
    progressBar.querySelector('.progress-text').textContent = `Step ${currentStep + 1} di ${steps.length}`;
}

function createProgressBar() {
    const bar = document.createElement('div');
    bar.id = 'main-progress-bar';
    bar.className = 'main-progress-bar';
    bar.innerHTML = `
        <div class="progress-track">
            <div class="progress-fill"></div>
        </div>
        <span class="progress-text">Step 1 di 4</span>
    `;
    document.querySelector('.main-container').prepend(bar);
    return bar;
}

// ==================== DASHBOARD STATS ====================
function updateDashboardStats() {
    // Conta bozze
    const bozzeCount = bozzeDB.filter(b => !b.locked_by).length;
    const agibilitaMonth = agibilitaDB.filter(a => {
        const date = new Date(a.created_at);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    
    // Aggiorna badge se esistono
    const bozzeBadge = document.getElementById('bozze-badge');
    if (bozzeBadge) bozzeBadge.textContent = bozzeCount;
    
    const monthBadge = document.getElementById('month-badge');
    if (monthBadge) monthBadge.textContent = agibilitaMonth;
}

// ==================== CALENDARIO ====================
let currentCalendarMonth = new Date();

function showCalendarView() {
    const modal = document.getElementById('calendar-modal') || createCalendarModal();
    modal.style.display = 'block';
    renderCalendar();
}

function createCalendarModal() {
    const modal = document.createElement('div');
    modal.id = 'calendar-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-content-wide">
            <div class="modal-header">
                <h2>📅 Calendario Agibilità</h2>
                <button class="close-modal" onclick="closeCalendarModal()">&times;</button>
            </div>
            <div class="calendar-controls">
                <button class="btn btn-sm" onclick="changeCalendarMonth(-1)">◀ Mese precedente</button>
                <h3 id="calendar-month-year"></h3>
                <button class="btn btn-sm" onclick="changeCalendarMonth(1)">Mese successivo ▶</button>
            </div>
            <div id="calendar-grid" class="calendar-grid"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function renderCalendar() {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    // Aggiorna titolo
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;
    
    // Genera griglia calendario
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let html = '<div class="calendar-header">';
    ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });
    html += '</div><div class="calendar-body">';
    
    // Giorni vuoti iniziali
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        
        // Trova agibilità per questa data
        const dayAgibilita = agibilitaDB.filter(a => {
            const start = new Date(a.data_inizio);
            const end = new Date(a.data_fine);
            return date >= start && date <= end;
        });
        
        const hasAgibilita = dayAgibilita.length > 0;
        const isToday = date.toDateString() === new Date().toDateString();
        
        html += `
            <div class="calendar-day ${hasAgibilita ? 'has-events' : ''} ${isToday ? 'today' : ''}">
                <div class="day-number">${day}</div>
                ${hasAgibilita ? `<div class="event-count">${dayAgibilita.length}</div>` : ''}
                ${hasAgibilita ? `
                    <div class="day-events">
                        ${dayAgibilita.slice(0, 2).map(a => `
                            <div class="mini-event" title="${a.locale.descrizione}">
                                ${a.locale.descrizione.substring(0, 15)}${a.locale.descrizione.length > 15 ? '...' : ''}
                            </div>
                        `).join('')}
                        ${dayAgibilita.length > 2 ? `<div class="more-events">+${dayAgibilita.length - 2} altri</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    document.getElementById('calendar-grid').innerHTML = html;
}

function changeCalendarMonth(delta) {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + delta);
    renderCalendar();
}

function closeCalendarModal() {
    const modal = document.getElementById('calendar-modal');
    if (modal) modal.style.display = 'none';
}

// ==================== KEYBOARD SHORTCUTS ====================
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+S per salvare bozza
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveBozza();
        }
        
        // Escape per chiudere modali
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

// ==================== VALIDAZIONE COMPENSI (MODIFICATA) ====================
async function validateCompensations() {
    let hasIssues = false;
    let needsConfirmation = [];
    
    for (let i = 0; i < selectedArtists.length; i++) {
        const artist = selectedArtists[i];
        const artistKey = `${artist.codice_fiscale}-${i}`;
        
        // Se già confermato, salta
        if (compensiConfermati.has(artistKey)) {
            continue;
        }
        
        if (!artist.ruolo) {
            showToast(`Completa il ruolo per ${artist.nome} ${artist.cognome}`, 'warning');
            return false;
        }
        
        // Compenso a 0
        if (artist.compenso === 0) {
            needsConfirmation.push({
                artist: artist,
                index: i,
                type: 'gratuito',
                message: `${artist.nome} ${artist.cognome} ha un compenso a titolo gratuito (€0). Sei sicuro di voler procedere?`
            });
        }
        // Compenso tra 0 e 50
        else if (artist.compenso > 0 && artist.compenso < 50) {
            needsConfirmation.push({
                artist: artist,
                index: i,
                type: 'minimo',
                message: `${artist.nome} ${artist.cognome} ha un compenso di €${artist.compenso.toFixed(2)}. Il compenso minimo consigliato è di €50. Vuoi continuare?`
            });
        }
    }
    
    // Gestisci conferme
    for (const confirmation of needsConfirmation) {
        const confirmed = confirm(confirmation.message);
        if (!confirmed) {
            // Evidenzia il campo del compenso che necessita attenzione
            const compensoInput = document.querySelector(`#artistList .artist-item:nth-child(${confirmation.index + 1}) .compensation-input`);
            if (compensoInput) {
                compensoInput.focus();
                compensoInput.classList.add('field-warning');
                setTimeout(() => {
                    compensoInput.classList.remove('field-warning');
                }, 3000);
            }
            return false;
        } else {
            // Memorizza la conferma
            compensiConfermati.add(`${confirmation.artist.codice_fiscale}-${confirmation.index}`);
        }
    }
    
    return true;
}

// ==================== NAVIGAZIONE STEP (MODIFICATA) ====================
async function goToStep2() {
    if (selectedArtists.length === 0) {
        showToast('Seleziona almeno un artista', 'warning');
        return;
    }
    
    // Usa la nuova funzione di validazione
    const isValid = await validateCompensations();
    if (!isValid) {
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
        showToast('Compila tutti i campi obbligatori', 'warning');
        // Evidenzia campi mancanti
        missingFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.classList.add('field-error');
                setTimeout(() => element.classList.remove('field-error'), 3000);
            }
        });
        return;
    }

    saveVenueIfNew();
    saveInvoiceData();
    updateSummaries();
    showSection('step3');
}

// ==================== GESTIONE ARTISTI (MODIFICATA) ====================
function showAddArtistModal() {
    console.log('Opening artist modal');
    const modal = document.getElementById('addArtistModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('artistSearch').value = '';
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('artistSearch').focus();
    }
}

function closeModal() {
    const modal = document.getElementById('addArtistModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function searchArtists() {
    const searchTerm = document.getElementById('artistSearch').value.toLowerCase();
    
    if (!searchTerm) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    try {
        // Cerca in Supabase
        const results = await DatabaseService.searchArtisti(searchTerm);
        displayArtistResults(results);
    } catch (error) {
        console.error('❌ Errore ricerca artisti:', error);
        document.getElementById('searchResults').innerHTML = '<p class="no-results">Errore nella ricerca</p>';
    }
}

function displayArtistResults(results) {
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
        resultsDiv.innerHTML = results.map(artist => {
            const identificativo = artist.codice_fiscale || artist.codice_fiscale_temp || 'NO-CF';
            const nazionalitaIcon = artist.nazionalita !== 'IT' ? ' 🌍' : '';
            
            return `
            <div class="search-result" onclick="addArtistToList('${artist.id}')" style="cursor: pointer;">
                <strong>${artist.nome} ${artist.cognome}${artist.nome_arte ? ' - ' + artist.nome_arte : ''}${nazionalitaIcon}</strong><br>
                <small>ID: ${identificativo} | ${artist.mansione || 'Non specificata'}</small>
                <small style="display: block; color: #666;">DB ID: ${artist.id}</small>
            </div>
            `;
        }).join('');
    }
}

function addArtistToList(artistId) {
    console.log('Adding artist:', artistId);
    
    // Cerca l'artista per ID
    const artist = artistsDB.find(a => a.id == artistId);
    
    if (!artist) {
        console.error('Artist not found. Searched ID:', artistId);
        showToast('Artista non trovato nel database', 'error');
        return;
    }

    // Usa CF o CF temporaneo come identificativo
    const identificativo = artist.codice_fiscale || artist.codice_fiscale_temp;
    
    const existingIndex = selectedArtists.findIndex(a => 
        (a.codice_fiscale && a.codice_fiscale === artist.codice_fiscale) ||
        (a.codice_fiscale_temp && a.codice_fiscale_temp === artist.codice_fiscale_temp)
    );
    
    if (existingIndex !== -1) {
        showToast('Questo artista è già stato aggiunto!', 'warning');
        return;
    }

    const tipoRapporto = determineTipoRapporto(artist);

    selectedArtists.push({
        ...artist,
        ruolo: artist.mansione || '', // MODIFICA: Precompila la mansione dal database
        compenso: 0,
        matricolaEnpals: artist.matricola_enpals || generateMatricolaEnpals(),
        tipoRapporto: tipoRapporto
    });

    updateArtistsList();
    closeModal();
    showToast(`${artist.nome} ${artist.cognome} aggiunto`, 'success');
}

// ==================== GESTIONE DATE (MODIFICATA) ====================
function validateDates() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;

    if (!startDate) return;

    // Se non c'è data fine, impostala al giorno successivo
    if (!endDate) {
        const start = new Date(startDate);
        start.setDate(start.getDate() + 1);
        document.getElementById('dataFine').value = start.toISOString().split('T')[0];
    }

    if (endDate && endDate < startDate) {
        showToast('La data di fine non può essere precedente alla data di inizio', 'warning');
        document.getElementById('dataFine').value = startDate;
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const dateInfo = document.getElementById('dateInfo');
    if (dateInfo) {
        dateInfo.style.display = 'block';
        dateInfo.textContent = `Durata: ${diffDays} giorn${diffDays > 1 ? 'i' : 'o'}`;
    }
}

// ==================== GESTIONE TAB (MODIFICATA - SENZA ANTEPRIMA) ====================
function showTab(tabName) {
    // Se è anteprima, salta direttamente a invio
    if (tabName === 'anteprima') {
        showTab('invio');
        return;
    }
    
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

// ==================== DOWNLOAD E SALVATAGGIO (MODIFICATO) ====================
async function downloadAndSave() {
    const xmlContent = generateXML();
    const validation = validateINPSXML(xmlContent);
    
    if (!validation.isValid) {
        showToast('Errori di validazione:\n' + validation.errors.join('\n'), 'error');
        return;
    }

    // Scarica XML agibilità
    downloadXML(xmlContent);
    
    // Salva agibilità nel database
    await saveAgibilitaToDatabase(xmlContent);
    
    // NUOVO: Invia notifiche agli artisti
    await sendArtistNotifications();
    
    // Genera e scarica XML intermittenti se ci sono artisti a chiamata
    const artistiAChiamata = getArtistiAChiamata();
    if (artistiAChiamata.length > 0) {
        const xmlIntermittenti = generateXMLIntermittenti(artistiAChiamata);
        if (xmlIntermittenti) {
            setTimeout(() => {
                if (confirm(`Sono stati trovati ${artistiAChiamata.length} artisti con contratto a chiamata.\n\nVuoi scaricare anche il file XML per le comunicazioni intermittenti?`)) {
                    downloadXMLIntermittenti(xmlIntermittenti, artistiAChiamata.length);
                    showIntermittentiSummary(artistiAChiamata);
                }
            }, 500);
        }
    }

    // Rimuovi bozza se esiste
    if (currentBozzaId) {
        await DatabaseService.deleteBozza(currentBozzaId);
    }

    // Pulisci lock e timers
    stopAutosave();
    stopLockCheck();
    currentBozzaId = null;
    currentLock = null;

    document.getElementById('btnConfirm').style.display = 'none';
    document.getElementById('btnNewAgibilita').style.display = 'inline-block';

    showToast('✅ Agibilità creata con successo!', 'success', 5000);
}

// NUOVA FUNZIONE: Invia notifiche agli artisti
async function sendArtistNotifications() {
    const dataInizio = document.getElementById('dataInizio').value;
    const descrizioneLocale = document.getElementById('descrizioneLocale').value;
    
    for (const artist of selectedArtists) {
        if (artist.email || artist.telefono) {
            const message = `Ciao ${artist.nome}, è stata aperta un'agibilità per il ${new Date(dataInizio).toLocaleDateString('it-IT')} presso ${descrizioneLocale}. Ti confermiamo la tua partecipazione come ${artist.ruolo}.`;
            
            try {
                if (artist.email) {
                    await NotificationService.sendEmail(artist.email, 'Nuova Agibilità', message);
                }
                if (artist.telefono) {
                    await NotificationService.sendSMS(artist.telefono, message);
                }
            } catch (error) {
                console.error('Errore invio notifica:', error);
            }
        }
    }
}

function confirmAndProceed() {
    downloadAndSave();
}

// ==================== ALTRE FUNZIONI NECESSARIE ====================
// (Il resto del codice rimane sostanzialmente lo stesso, con piccole ottimizzazioni)

function determineTipoRapporto(artist) {
    if (artist.has_partita_iva) {
        return 'partitaiva';
    } else if (artist.tipo_rapporto) {
        if (artist.tipo_rapporto === 'Contratto a chiamata' || artist.tipo_rapporto === 'chiamata') {
            return 'chiamata';
        }
        return artist.tipo_rapporto;
    } else {
        return 'occasionale';
    }
}

function getArtistiAChiamata() {
    return selectedArtists.filter(artist => 
        artist.tipoRapporto === 'chiamata' || 
        artist.tipo_rapporto === 'Contratto a chiamata' ||
        artist.tipo_rapporto === 'chiamata'
    );
}

function generateXMLIntermittenti(artistiAChiamata) {
    if (artistiAChiamata.length === 0) return null;
    
    const dataInizio = document.getElementById('dataInizio').value;
    const dataFine = document.getElementById('dataFine').value;
    
    // Formatta date in DD/MM/YYYY
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };
    
    const dataInizioFormatted = formatDate(dataInizio);
    const dataFineFormatted = formatDate(dataFine);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<moduloIntermittenti xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/">
<Campi>
<CFdatorelavoro>04433920248</CFdatorelavoro>
<EMmail>amministrazione@recorp.it</EMmail>`;

    // Aggiungi fino a 10 lavoratori a chiamata
    artistiAChiamata.slice(0, 10).forEach((artist, index) => {
        const num = index + 1;
        const codComunicazione = artist.codice_comunicazione || generateCodiceComunicazione();
        
        xml += `
<CFlavoratore${num}>${artist.codice_fiscale}</CFlavoratore${num}>
<CCcodcomunicazione${num}>${codComunicazione}</CCcodcomunicazione${num}>
<DTdatainizio${num}>${dataInizioFormatted}</DTdatainizio${num}>
<DTdatafine${num}>${dataFineFormatted}</DTdatafine${num}>`;
    });
    
    xml += `
</Campi>
</moduloIntermittenti>`;
    
    return xml;
}

function generateCodiceComunicazione() {
    const timestamp = Date.now();
    return `2100024${timestamp.toString().slice(-9)}`;
}

function downloadXMLIntermittenti(xmlContent, artistiCount) {
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const today = new Date().toISOString().slice(0,10).replace(/-/g, '_');
    a.download = `comunicazione_intermittenti_${today}.xml`;
    
    a.click();
    URL.revokeObjectURL(url);
}

function showIntermittentiSummary(artistiAChiamata) {
    const summaryHtml = `
        <div class="alert alert-info" style="margin-top: 1rem;">
            <h4>📞 Comunicazioni Intermittenti Generate</h4>
            <p>I seguenti artisti sono stati inclusi nel file XML per le comunicazioni intermittenti:</p>
            <ul>
                ${artistiAChiamata.map(artist => `
                    <li>
                        <strong>${artist.nome} ${artist.cognome}</strong> 
                        - CF: ${artist.codice_fiscale}
                        ${artist.codice_comunicazione ? ` - Cod. INPS: ${artist.codice_comunicazione}` : ' - Cod. INPS: Generato automaticamente'}
                    </li>
                `).join('')}
            </ul>
            <p class="mb-0"><small>Il file XML è stato scaricato automaticamente nella cartella download.</small></p>
        </div>
    `;
    
    const tabInvio = document.getElementById('tabInvio');
    if (tabInvio) {
        const div = document.createElement('div');
        div.innerHTML = summaryHtml;
        tabInvio.appendChild(div);
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
        listDiv.innerHTML = selectedArtists.map((artist, index) => {
            const isAChiamata = artist.tipoRapporto === 'chiamata' || artist.tipo_rapporto === 'Contratto a chiamata' || artist.tipo_rapporto === 'chiamata';
            const identificativo = artist.codice_fiscale || artist.codice_fiscale_temp || 'NO-ID';
            const nazionalitaLabel = artist.nazionalita !== 'IT' ? ` 🌍 ${artist.nazionalita}` : '';
            
            // MODIFICA: Mappa le mansioni dal database ai ruoli del dropdown
            const mansioneToRuoloMap = {
                'DJ': 'DJ',
                'Vocalist': 'Vocalist',
                'Musicista': 'Musicista',
                'Cantante': 'Cantante',
                'Ballerino': 'Ballerino/a',
                'Ballerina': 'Ballerino/a',
                'Performer': 'Performer',
                'Animatore': 'Animatore',
                'Tecnico Audio': 'Tecnico Audio',
                'Tecnico Luci': 'Tecnico Luci',
                'Fotografo': 'Fotografo',
                'Videomaker': 'Videomaker',
                'Truccatore': 'Truccatore',
                'Costumista': 'Costumista',
                'Scenografo': 'Scenografo'
            };
            
            const ruoloSelezionato = mansioneToRuoloMap[artist.ruolo] || artist.ruolo;
            
            return `
            <div class="artist-item ${isAChiamata ? 'artist-chiamata' : ''}">
                <div class="artist-info">
                    <strong>${artist.nome} ${artist.cognome}${artist.nome_arte ? ' - ' + artist.nome_arte : ''}${nazionalitaLabel}</strong><br>
                    <small>ID: ${identificativo}</small>
                    ${artist.matricolaEnpals ? `<br><small>Matricola ENPALS: ${artist.matricolaEnpals}</small>` : ''}
                    <br><span class="tipo-rapporto-badge tipo-${artist.tipoRapporto}">${getTipoRapportoLabel(artist.tipoRapporto)}</span>
                    ${isAChiamata && artist.codice_comunicazione ? `<br><small class="codice-inps">📞 Cod. INPS: ${artist.codice_comunicazione}</small>` : ''}
                </div>
                <div class="artist-role-compensation">
                    <select class="form-control" required onchange="updateArtistRole(${index}, this.value)">
                        <option value="">Seleziona ruolo...</option>
                        <option value="DJ" ${ruoloSelezionato === 'DJ' ? 'selected' : ''}>DJ (032)</option>
                        <option value="Vocalist" ${ruoloSelezionato === 'Vocalist' ? 'selected' : ''}>Vocalist (031)</option>
                        <option value="Musicista" ${ruoloSelezionato === 'Musicista' ? 'selected' : ''}>Musicista (030)</option>
                        <option value="Cantante" ${ruoloSelezionato === 'Cantante' ? 'selected' : ''}>Cantante (033)</option>
                        <option value="Ballerino/a" ${ruoloSelezionato === 'Ballerino/a' ? 'selected' : ''}>Ballerino/a (092)</option>
                        <option value="Performer" ${ruoloSelezionato === 'Performer' ? 'selected' : ''}>Performer (090)</option>
                        <option value="Animatore" ${ruoloSelezionato === 'Animatore' ? 'selected' : ''}>Animatore (091)</option>
                        <option value="Tecnico Audio" ${ruoloSelezionato === 'Tecnico Audio' ? 'selected' : ''}>Tecnico Audio (117)</option>
                        <option value="Tecnico Luci" ${ruoloSelezionato === 'Tecnico Luci' ? 'selected' : ''}>Tecnico Luci (118)</option>
                        <option value="Fotografo" ${ruoloSelezionato === 'Fotografo' ? 'selected' : ''}>Fotografo (126)</option>
                        <option value="Videomaker" ${ruoloSelezionato === 'Videomaker' ? 'selected' : ''}>Videomaker (127)</option>
                        <option value="Truccatore" ${ruoloSelezionato === 'Truccatore' ? 'selected' : ''}>Truccatore (141)</option>
                        <option value="Costumista" ${ruoloSelezionato === 'Costumista' ? 'selected' : ''}>Costumista (142)</option>
                        <option value="Scenografo" ${ruoloSelezionato === 'Scenografo' ? 'selected' : ''}>Scenografo (150)</option>
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
        `}).join('');

        // Mostra conteggio artisti a chiamata
        const artistiAChiamata = getArtistiAChiamata();
        if (artistiAChiamata.length > 0) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'alert alert-info mt-3';
            infoDiv.innerHTML = `📞 ${artistiAChiamata.length} artisti con contratto a chiamata - Verrà generato anche XML comunicazioni intermittenti`;
            listDiv.appendChild(infoDiv);
        }

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
       const artist = selectedArtists[index];
       const oldValue = artist.compenso;
       artist.compenso = parseFloat(value) || 0;
       
       // Se il valore è cambiato, rimuovi la conferma precedente
       if (oldValue !== artist.compenso) {
           const artistKey = `${artist.codice_fiscale}-${index}`;
           compensiConfermati.delete(artistKey);
       }
       
       updateTotalCompensation();
       checkCanProceed();
   }
}

function removeArtist(index) {
   selectedArtists.splice(index, 1);
   // Ricostruisci le conferme compensi
   const newConferme = new Set();
   compensiConfermati.forEach(key => {
       const [cf, oldIndex] = key.split('-');
       const newIndex = selectedArtists.findIndex(a => a.codice_fiscale === cf);
       if (newIndex !== -1 && newIndex < parseInt(oldIndex)) {
           newConferme.add(`${cf}-${newIndex}`);
       }
   });
   compensiConfermati = newConferme;
   
   updateArtistsList();
}

function updateTotalCompensation() {
   const total = selectedArtists.reduce((sum, artist) => sum + (artist.compenso || 0), 0);
   document.getElementById('totalArtists').textContent = selectedArtists.length;
   document.getElementById('totalCompensation').textContent = total.toFixed(2);
}

function checkCanProceed() {
   const canProceed = selectedArtists.length > 0 && 
       selectedArtists.every(a => a.ruolo);
   
   document.getElementById('btnNext1').style.display = canProceed ? 'inline-block' : 'none';
}

function goToRegistration() {
   sessionStorage.setItem('returnToAgibilita', 'true');
   window.location.href = '../registrazione-artista.html';
}

// ==================== GESTIONE LOCALITÀ ====================
function loadProvinces() {
   try {
       const provinceSelect = document.getElementById('provincia');
       if (!provinceSelect) return;
       
       provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
       
       const province = window.GIDatabase.getProvince();
       
       if (province.length === 0) {
           console.error('❌ Nessuna provincia trovata nel database');
           provinceSelect.innerHTML = '<option value="">Errore: nessuna provincia disponibile</option>';
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
       
   } catch (error) {
       console.error('Errore caricamento province:', error);
       const provinceSelect = document.getElementById('provincia');
       if (provinceSelect) {
           provinceSelect.innerHTML = '<option value="">Errore caricamento province</option>';
       }
   }
}

function loadCitta(provincia) {
   const cittaSelect = document.getElementById('citta');
   if (!cittaSelect) return;
   
   cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
   
   try {
       const comuni = window.GIDatabase.getComuniByProvincia(provincia);
       
       if (comuni.length === 0) {
           console.warn(`Nessun comune trovato per provincia ${provincia}`);
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
       const capList = window.GIDatabase.getCapByComune(codiceIstat);
       
       console.log(`📮 CAP trovati per ${codiceIstat}:`, capList);
       
       if (capList.length === 0) {
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
       venue.citta_nome.toLowerCase().includes(searchTerm)
   );

   if (matches.length > 0) {
       dropdown.innerHTML = matches.map(venue => `
           <div class="autocomplete-item" onclick="selectVenue('${venue.nome}', '${venue.indirizzo}', '${venue.citta_codice}', '${venue.cap}', '${venue.provincia}')">
               <strong>${venue.nome}</strong><br>
               <small>${venue.citta_nome} - ${venue.provincia}</small>
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
   
   document.getElementById('provincia').value = provincia;
   loadCitta(provincia);
   
   setTimeout(() => {
       document.getElementById('citta').value = cittaCodice;
       loadCAP(cittaCodice);
       
       setTimeout(() => {
           document.getElementById('cap').value = cap;
       }, 100);
   }, 100);
   
   document.getElementById('venueDropdown').style.display = 'none';
   loadInvoiceDataForVenue(nome);
}

async function saveVenueIfNew() {
   const venueName = document.getElementById('descrizioneLocale').value;
   const existingVenue = venuesDB.find(v => v.nome.toLowerCase() === venueName.toLowerCase());

   if (!existingVenue) {
       const cittaSelect = document.getElementById('citta');
       const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
       const cittaNome = selectedOption ? selectedOption.textContent : '';
       
       const newVenue = {
           nome: venueName,
           indirizzo: document.getElementById('indirizzo').value,
           citta_codice: document.getElementById('citta').value,
           citta_nome: cittaNome,
           cap: document.getElementById('cap').value,
           provincia: document.getElementById('provincia').value
       };
       
       try {
           const savedVenue = await DatabaseService.saveVenue(newVenue);
           venuesDB.push(savedVenue);
           console.log('✅ Nuovo venue salvato:', savedVenue);
       } catch (error) {
           console.error('❌ Errore salvataggio venue:', error);
       }
   }
}

// ==================== GESTIONE FATTURAZIONE ====================
function showInvoiceDataSelector(invoiceDataList) {
   const existingSelector = document.getElementById('invoiceSelector');
   if (existingSelector) {
       existingSelector.remove();
   }
   
   // Ordina per data più recente e seleziona il primo
   invoiceDataList.sort((a, b) => {
       const dateA = new Date(a.last_updated || '1970-01-01');
       const dateB = new Date(b.last_updated || '1970-01-01');
       return dateB - dateA;
   });
   
   const selectorHtml = `
       <div id="invoiceSelector" class="invoice-selector">
           <label class="form-label">
               <strong>📋 Dati fatturazione salvati per questo locale</strong>
               <small class="text-muted d-block">Selezionato automaticamente l'ultimo utilizzato</small>
           </label>
           <select class="form-control" id="savedInvoiceSelect" onchange="loadSelectedInvoiceData()">
               ${invoiceDataList.map((invoice, index) => {
                   const isDefault = index === 0;
                   const dateStr = invoice.last_updated ? 
                       new Date(invoice.last_updated).toLocaleDateString('it-IT') : 
                       'Data non disponibile';
                   return `
                       <option value="${index}" ${isDefault ? 'selected' : ''}>
                           ${isDefault ? '⭐ ' : ''}${invoice.ragione_sociale} 
                           ${invoice.piva ? `- P.IVA: ${invoice.piva}` : ''} 
                           ${invoice.codice_fiscale ? `- CF: ${invoice.codice_fiscale}` : ''}
                           - Aggiornato: ${dateStr}
                       </option>
                   `;
               }).join('')}
               <option value="new">➕ Inserisci nuovi dati fatturazione</option>
           </select>
       </div>
   `;
   
   const ragioneSocialeGroup = document.getElementById('ragioneSociale').parentElement;
   ragioneSocialeGroup.insertAdjacentHTML('beforebegin', selectorHtml);
}

function showGlobalInvoiceSearch() {
   const existingSearch = document.getElementById('globalInvoiceSearch');
   if (existingSearch) {
       existingSearch.remove();
   }
   
   const searchHtml = `
       <div id="globalInvoiceSearch">
           <label class="form-label">
               <strong>🔍 Cerca dati fatturazione nel database</strong>
           </label>
           <input type="text" 
                  class="form-control" 
                  id="invoiceSearchInput" 
                  placeholder="Cerca per ragione sociale, P.IVA o codice fiscale..."
                  oninput="searchInvoiceData()">
           <div id="invoiceSearchResults" style="display: none;"></div>
       </div>
   `;
   
   const insertPoint = document.getElementById('invoiceSelector') || document.getElementById('ragioneSociale').parentElement;
   insertPoint.insertAdjacentHTML('beforebegin', searchHtml);
}

function searchInvoiceData() {
   const searchTerm = document.getElementById('invoiceSearchInput').value.toLowerCase();
   const resultsDiv = document.getElementById('invoiceSearchResults');
   
   if (searchTerm.length < 2) {
       resultsDiv.style.display = 'none';
       return;
   }
   
   const matches = invoiceDB.filter(invoice => 
       (invoice.ragione_sociale && invoice.ragione_sociale.toLowerCase().includes(searchTerm)) ||
       (invoice.piva && invoice.piva.includes(searchTerm)) ||
       (invoice.codice_fiscale && invoice.codice_fiscale.toLowerCase().includes(searchTerm))
   );
   
   if (matches.length > 0) {
       const uniqueInvoices = [];
       const seen = new Set();
       
       matches.forEach(invoice => {
           const key = `${invoice.ragione_sociale}-${invoice.piva}-${invoice.codice_fiscale}`;
           if (!seen.has(key)) {
               seen.add(key);
               uniqueInvoices.push(invoice);
           }
       });
       
       resultsDiv.innerHTML = uniqueInvoices.slice(0, 5).map(invoice => `
           <div class="search-result-item" onclick="selectInvoiceFromSearch(${invoiceDB.indexOf(invoice)})">
               <strong>${invoice.ragione_sociale}</strong><br>
               <small>
                   ${invoice.piva ? `P.IVA: ${invoice.piva}` : ''} 
                   ${invoice.codice_fiscale ? `CF: ${invoice.codice_fiscale}` : ''}
                   ${invoice.venue_name ? `<br>Locale: ${invoice.venue_name}` : ''}
               </small>
           </div>
       `).join('');
       resultsDiv.style.display = 'block';
   } else {
       resultsDiv.innerHTML = '<div class="no-results">Nessun risultato trovato</div>';
       resultsDiv.style.display = 'block';
   }
}

function selectInvoiceFromSearch(index) {
   const invoice = invoiceDB[index];
   if (invoice) {
       fillInvoiceFields(invoice);
       document.getElementById('invoiceSearchResults').style.display = 'none';
       document.getElementById('invoiceSearchInput').value = '';
       showInvoiceLoadedMessage(invoice.venue_name);
   }
}

function showInvoiceLoadedMessage(venueName) {
   const existingMsg = document.querySelector('.invoice-loaded-message');
   if (existingMsg) existingMsg.remove();
   
   const msg = document.createElement('div');
   msg.className = 'invoice-loaded-message';
   msg.innerHTML = `✅ Dati fatturazione caricati${venueName ? ` (da: ${venueName})` : ''}`;
   
   const ragioneSocialeGroup = document.getElementById('ragioneSociale').parentElement;
   ragioneSocialeGroup.insertBefore(msg, ragioneSocialeGroup.firstChild);
   
   setTimeout(() => msg.remove(), 3000);
}

async function loadInvoiceDataForVenue(venueName) {
   try {
       showGlobalInvoiceSearch();
       
       const venueInvoices = invoiceDB.filter(invoice => 
           invoice.venue_name && invoice.venue_name.toLowerCase() === venueName.toLowerCase()
       );
       
       if (venueInvoices.length > 1) {
           showInvoiceDataSelector(venueInvoices);
           // Ordina e seleziona il più recente
           venueInvoices.sort((a, b) => {
               const dateA = new Date(a.last_updated || '1970-01-01');
               const dateB = new Date(b.last_updated || '1970-01-01');
               return dateB - dateA;
           });
           fillInvoiceFields(venueInvoices[0]);
           showToast('💡 Caricati automaticamente i dati fatturazione più recenti', 'info');
       } else if (venueInvoices.length === 1) {
           fillInvoiceFields(venueInvoices[0]);
           showInvoiceLoadedMessage();
       } else {
           clearInvoiceFields();
           showToast('💡 Nessun dato fatturazione salvato per questo locale', 'info');
       }
   } catch (error) {
       console.error('❌ Errore caricamento dati fatturazione:', error);
       clearInvoiceFields();
   }
}

function loadSelectedInvoiceData() {
   const select = document.getElementById('savedInvoiceSelect');
   const selectedValue = select.value;
   
   if (selectedValue === 'new') {
       clearInvoiceFields();
   } else if (selectedValue !== '') {
       const venueName = document.getElementById('descrizioneLocale').value;
       const venueInvoices = invoiceDB.filter(invoice => 
           invoice.venue_name && invoice.venue_name.toLowerCase() === venueName.toLowerCase()
       );
       // Ordina per data più recente
       venueInvoices.sort((a, b) => {
           const dateA = new Date(a.last_updated || '1970-01-01');
           const dateB = new Date(b.last_updated || '1970-01-01');
           return dateB - dateA;
       });
       const selectedInvoice = venueInvoices[parseInt(selectedValue)];
       if (selectedInvoice) {
           fillInvoiceFields(selectedInvoice);
       }
   }
}

function fillInvoiceFields(invoiceData) {
   document.getElementById('ragioneSociale').value = invoiceData.ragione_sociale || '';
   document.getElementById('piva').value = invoiceData.piva || '';
   document.getElementById('codiceFiscale').value = invoiceData.codice_fiscale || '';
   document.getElementById('indirizzoFatturazione').value = invoiceData.indirizzo || '';
   document.getElementById('cittaFatturazione').value = invoiceData.citta || '';
   document.getElementById('capFatturazione').value = invoiceData.cap || '';
   document.getElementById('provinciaFatturazione').value = invoiceData.provincia || '';
   document.getElementById('codiceSDI').value = invoiceData.codice_sdi || '';
   document.getElementById('pecFatturazione').value = invoiceData.pec || '';
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

async function saveInvoiceData() {
   const venueName = document.getElementById('descrizioneLocale').value;
   
   const invoiceData = {
       venue_name: venueName,
       ragione_sociale: document.getElementById('ragioneSociale').value,
       piva: document.getElementById('piva').value,
       codice_fiscale: document.getElementById('codiceFiscale').value,
       indirizzo: document.getElementById('indirizzoFatturazione').value,
       citta: document.getElementById('cittaFatturazione').value,
       cap: document.getElementById('capFatturazione').value,
       provincia: document.getElementById('provinciaFatturazione').value,
       codice_sdi: document.getElementById('codiceSDI').value,
       pec: document.getElementById('pecFatturazione').value,
       last_updated: new Date().toISOString()
   };

   try {
       await DatabaseService.saveInvoiceData(invoiceData);
       // Aggiungi sempre il nuovo record a invoiceDB
       invoiceDB.push(invoiceData);
       console.log('✅ Dati fatturazione salvati');
   } catch (error) {
       console.error('❌ Errore salvataggio dati fatturazione:', error);
       // Non bloccare il flusso
       showToast('Attenzione: impossibile salvare i dati di fatturazione', 'warning');
   }
}

function copyVenueAddress() {
   document.getElementById('indirizzoFatturazione').value = document.getElementById('indirizzo').value;
   
   const cittaSelect = document.getElementById('citta');
   const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
   if (selectedOption) {
       document.getElementById('cittaFatturazione').value = selectedOption.textContent;
   }
   
   document.getElementById('capFatturazione').value = document.getElementById('cap').value;
   document.getElementById('provinciaFatturazione').value = document.getElementById('provincia').value;
   
   showToast('Indirizzo copiato', 'success');
}

// ==================== GESTIONE RIEPILOGO ====================
function updateSummaries() {
   // Artisti
   const summaryArtists = document.getElementById('summaryArtists');
   if (summaryArtists) {
       summaryArtists.innerHTML = selectedArtists.map(artist => {
           const compensoText = artist.compenso === 0 ? 'Titolo gratuito' : `€${artist.compenso.toFixed(2)}`;
           return `<p><strong>${artist.nome} ${artist.cognome}</strong> - ${artist.ruolo} - ${compensoText} - ${getTipoRapportoLabel(artist.tipoRapporto)}</p>`;
       }).join('');
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

// ==================== GENERAZIONE XML ====================
function isLegalRepresentative(artist) {
   const legalRepresentatives = [
       { nome: 'OSCAR', cognome: 'ZALTRON' },
       { nome: 'CRISTIANO', cognome: 'TOMASI' }
   ];
   
   return legalRepresentatives.some(rep => 
       artist.nome.toUpperCase() === rep.nome && 
       artist.cognome.toUpperCase() === rep.cognome
   );
}

function generateXML() {
   const startDate = document.getElementById('dataInizio').value;
   const endDate = document.getElementById('dataFine').value;
   const tipo = agibilitaData.isModifica ? 'V' : 'N';
   
   const descrizioneLocale = document.getElementById('descrizioneLocale').value;
   const indirizzo = document.getElementById('indirizzo').value;
   const cap = document.getElementById('cap').value;
   const provincia = document.getElementById('provincia').value;
   
   const codiceComune = getCodicebelfioreFromCity();
   const cittaSelect = document.getElementById('citta');
   const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
   const cittaNome = selectedOption ? selectedOption.textContent : '';

   let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ImportAgibilita>
   <ElencoAgibilita>
       <Agibilita>`;

   if (agibilitaData.isModifica && agibilitaData.codiceAgibilita) {
       const agibilita = agibilitaDB.find(a => a.codice === agibilitaData.codiceAgibilita);
       if (agibilita && agibilita.identificativo_inps) {
           xml += `
           <IdentificativoAgibilita>${agibilita.identificativo_inps}</IdentificativoAgibilita>`;
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

   selectedArtists.forEach(artist => {
       const codiceQualifica = getQualificaCode(artist.ruolo);
       const isLegaleRappresentante = isLegalRepresentative(artist);
       
       const codiceFiscale = artist.codice_fiscale || '';
       if (!codiceFiscale && artist.nazionalita !== 'IT') {
           console.warn(`⚠️ Artista straniero senza CF: ${artist.nome} ${artist.cognome} - ID temp: ${artist.codice_fiscale_temp}`);
       }
       
       xml += `
                       <Lavoratore>
                           <CodiceFiscale>${codiceFiscale}</CodiceFiscale>
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

function getCodicebelfioreFromCity() {
   const cittaSelect = document.getElementById('citta');
   const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
   
   if (selectedOption && selectedOption.getAttribute('data-comune')) {
       try {
           const comuneData = JSON.parse(selectedOption.getAttribute('data-comune'));
           return comuneData.codice_belfiore || 
                  comuneData.codiceBelfiore || 
                  comuneData.belfiore || 
                  comuneData.codice_catastale ||
                  'L736';
       } catch (error) {
           console.error('Errore parsing dati comune:', error);
           return 'L736';
       }
   }
   
   return 'L736';
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
   
   if (!xmlString.includes('<TipoRetribuzione>G</TipoRetribuzione>')) {
       errors.push('TipoRetribuzione deve essere "G" (Giornaliera)');
   }
   
   selectedArtists.forEach(artist => {
       if (artist.nazionalita === 'IT' && !artist.codice_fiscale) {
           errors.push(`Codice fiscale mancante per l'artista italiano ${artist.nome} ${artist.cognome}`);
       } else if (artist.codice_fiscale && !validaCodiceFiscale(artist.codice_fiscale)) {
           errors.push(`Codice fiscale non valido per ${artist.nome} ${artist.cognome}`);
       } else if (!artist.codice_fiscale && artist.nazionalita !== 'IT') {
           console.warn(`Artista straniero senza CF: ${artist.nome} ${artist.cognome}`);
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

function downloadXML(xmlContent) {
   const blob = new Blob([xmlContent], { type: 'text/xml' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `ImportAgibilita_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.xml`;
   a.click();
   URL.revokeObjectURL(url);
}

async function saveAgibilitaToDatabase(xmlContent) {
   try {
       const cittaSelect = document.getElementById('citta');
       const selectedOption = cittaSelect.options[cittaSelect.selectedIndex];
       const cittaNome = selectedOption ? selectedOption.textContent : '';
       
       const agibilita = {
           codice: agibilitaData.numeroRiservato || `AG-${new Date().getFullYear()}-${String(agibilitaDB.length + 1).padStart(3, '0')}`,
           data_inizio: document.getElementById('dataInizio').value,
           data_fine: document.getElementById('dataFine').value,
           locale: {
               descrizione: document.getElementById('descrizioneLocale').value,
               indirizzo: document.getElementById('indirizzo').value,
               citta_codice: document.getElementById('citta').value,
               citta_nome: cittaNome,
               cap: document.getElementById('cap').value,
               provincia: document.getElementById('provincia').value,
               codice_comune: getCodicebelfioreFromCity()
           },
           fatturazione: {
               ragione_sociale: document.getElementById('ragioneSociale').value,
               piva: document.getElementById('piva').value,
               codice_fiscale: document.getElementById('codiceFiscale').value,
               codice_sdi: document.getElementById('codiceSDI').value
           },
           artisti: selectedArtists.map(a => ({
               cf: a.codice_fiscale || a.codice_fiscale_temp,
               nome: a.nome,
               cognome: a.cognome,
               nome_arte: a.nome_arte,
               ruolo: a.ruolo,
               compenso: a.compenso,
               matricola_enpals: a.matricolaEnpals,
               tipo_rapporto: a.tipoRapporto,
               codice_comunicazione: a.codice_comunicazione || null,
               nazionalita: a.nazionalita || 'IT'
           })),
           xml_content: xmlContent,
           is_modifica: agibilitaData.isModifica,
           codice_originale: agibilitaData.codiceAgibilita,
           identificativo_inps: null,
           version: 1
       };

       const savedAgibilita = await DatabaseService.saveAgibilita(agibilita);
       agibilitaDB.push(savedAgibilita);
       
       console.log('✅ Agibilità salvata su Supabase:', savedAgibilita);
       
   } catch (error) {
       console.error('❌ Errore salvataggio agibilità:', error);
       showToast('Errore durante il salvataggio: ' + error.message, 'error');
   }
}

function newAgibilita() {
   clearAllForms();
   agibilitaData.isModifica = false;
   agibilitaData.codiceAgibilita = null;
   agibilitaData.numeroRiservato = null;
   selectedArtists = [];
   compensiConfermati.clear();
   
   stopAutosave();
   stopLockCheck();
   currentBozzaId = null;
   currentLock = null;

   document.getElementById('btnConfirm').style.display = 'inline-block';
   document.getElementById('btnNewAgibilita').style.display = 'none';

   const today = new Date().toISOString().split('T')[0];
   const tomorrow = new Date();
   tomorrow.setDate(tomorrow.getDate() + 1);
   const tomorrowStr = tomorrow.toISOString().split('T')[0];
   
   document.getElementById('dataInizio').value = today;
   document.getElementById('dataFine').value = tomorrowStr;

   showSection('tipoSection');
   updateDashboardStats();
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

       const cittaDisplay = agibilita.locale.citta_nome || agibilita.locale.citta || 'Città non specificata';

       return `
           <div class="agibilita-item">
               <div class="agibilita-info">
                   <div class="agibilita-code">[${agibilita.codice}]</div>
                   <div class="agibilita-dates">${agibilita.data_inizio} - ${agibilita.data_fine}</div>
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
   agibilitaData.numeroRiservato = codice;

   selectedArtists = [];
   compensiConfermati.clear();
   
   agibilita.artisti.forEach(artData => {
       const artist = artistsDB.find(a => 
           (a.codice_fiscale && a.codice_fiscale === artData.cf) ||
           (a.codice_fiscale_temp && a.codice_fiscale_temp === artData.cf)
       );
       
       if (artist) {
           selectedArtists.push({
               ...artist,
               ruolo: artData.ruolo,
               compenso: artData.compenso,
               tipoRapporto: artData.tipo_rapporto || determineTipoRapporto(artist),
               matricolaEnpals: artData.matricola_enpals
           });
           
           if (artData.compenso === 0 || (artData.compenso > 0 && artData.compenso < 50)) {
               const artistKey = `${artist.codice_fiscale}-${selectedArtists.length - 1}`;
               compensiConfermati.add(artistKey);
           }
       }
   });

   document.getElementById('dataInizio').value = agibilita.data_inizio;
   document.getElementById('dataFine').value = agibilita.data_fine;
   document.getElementById('descrizioneLocale').value = agibilita.locale.descrizione;
   document.getElementById('indirizzo').value = agibilita.locale.indirizzo;
   
   document.getElementById('provincia').value = agibilita.locale.provincia;
   loadCitta(agibilita.locale.provincia);
   
   setTimeout(() => {
       document.getElementById('citta').value = agibilita.locale.citta_codice || agibilita.locale.citta;
       loadCAP(agibilita.locale.citta_codice || agibilita.locale.citta);
       
       setTimeout(() => {
           document.getElementById('cap').value = agibilita.locale.cap;
       }, 100);
   }, 100);

   if (agibilita.fatturazione) {
       document.getElementById('ragioneSociale').value = agibilita.fatturazione.ragione_sociale || '';
       document.getElementById('piva').value = agibilita.fatturazione.piva || '';
       document.getElementById('codiceFiscale').value = agibilita.fatturazione.codice_fiscale || '';
       document.getElementById('codiceSDI').value = agibilita.fatturazione.codice_sdi || '';
   }

   updateArtistsList();
   document.getElementById('editListSection').style.display = 'none';
   showSection('step1');
   startAutosave();
}

function duplicateAgibilita(codice) {
   const agibilita = agibilitaDB.find(a => a.codice === codice);
   if (!agibilita) return;

   editAgibilita(codice);
   
   agibilitaData.isModifica = false;
   agibilitaData.codiceAgibilita = null;
   agibilitaData.numeroRiservato = null;
   
   const today = new Date().toISOString().split('T')[0];
   const tomorrow = new Date();
   tomorrow.setDate(tomorrow.getDate() + 1);
   const tomorrowStr = tomorrow.toISOString().split('T')[0];
   
   document.getElementById('dataInizio').value = today;
   document.getElementById('dataFine').value = tomorrowStr;
   
   showToast('Agibilità duplicata - Inserisci le nuove date', 'info');
}

function cancelAgibilita(codice) {
   if (!confirm(`Sei sicuro di voler annullare l'agibilità ${codice}?`)) return;
   
   const index = agibilitaDB.findIndex(a => a.codice === codice);
   if (index !== -1) {
       agibilitaDB.splice(index, 1);
       showExistingAgibilita();
       showToast(`Agibilità ${codice} annullata`, 'success');
   }
}

// ==================== FUNZIONI UTILITÀ ====================
function clearAllForms() {
   selectedArtists = [];
   updateArtistsList();

   const today = new Date().toISOString().split('T')[0];
   const tomorrow = new Date();
   tomorrow.setDate(tomorrow.getDate() + 1);
   const tomorrowStr = tomorrow.toISOString().split('T')[0];
   
   document.getElementById('dataInizio').value = today;
   document.getElementById('dataFine').value = tomorrowStr;

   const fields = ['descrizioneLocale', 'indirizzo', 'citta', 'cap', 'provincia', 'noteLocale'];
   fields.forEach(fieldId => {
       const field = document.getElementById(fieldId);
       if (field) field.value = '';
   });

   clearInvoiceFields();
   
   const invoiceSelector = document.getElementById('invoiceSelector');
   if (invoiceSelector) invoiceSelector.remove();
   
   const globalSearch = document.getElementById('globalInvoiceSearch');
   if (globalSearch) globalSearch.remove();

   document.getElementById('editListSection').style.display = 'none';
   document.getElementById('bozzeSection').style.display = 'none';
   
   const dateInfo = document.getElementById('dateInfo');
   if (dateInfo) dateInfo.style.display = 'none';
   
   document.getElementById('citta').disabled = true;
   document.getElementById('cap').disabled = true;
   document.getElementById('citta').innerHTML = '<option value="">Prima seleziona la provincia</option>';
   document.getElementById('cap').innerHTML = '<option value="">Prima seleziona la città</option>';
}

function setupEventListeners() {
   const dataInizio = document.getElementById('dataInizio');
   if (dataInizio) {
       dataInizio.addEventListener('change', validateDates);
       // MODIFICA: Aggiungi anche qui l'event listener per autocompletare data fine
       dataInizio.addEventListener('change', autocompletaDataFine);
   }
   
   const dataFine = document.getElementById('dataFine');
   if (dataFine) dataFine.addEventListener('change', validateDates);

   const descrizioneLocale = document.getElementById('descrizioneLocale');
   if (descrizioneLocale) {
       descrizioneLocale.addEventListener('input', searchVenue);
   }

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

   window.addEventListener('click', function(event) {
       const modal = document.getElementById('addArtistModal');
       if (event.target === modal) {
           closeModal();
       }
       
       if (!event.target.matches('#descrizioneLocale')) {
           const dropdown = document.getElementById('venueDropdown');
           if (dropdown) dropdown.style.display = 'none';
       }
       
       if (!event.target.matches('#invoiceSearchInput') && !event.target.matches('.search-result-item')) {
           const results = document.getElementById('invoiceSearchResults');
           if (results) results.style.display = 'none';
       }
   });
}

console.log('🎭 Sistema agibilità v3.0 - Con bozze, notifiche e UX migliorata!');
