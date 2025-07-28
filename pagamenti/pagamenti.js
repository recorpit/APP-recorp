// pagamenti.js - Sistema Gestione Pagamenti RECORP Avanzato

// Import services - PERCORSI CORRETTI (file nel root)
import { DatabaseService } from '../supabase-config.js';
import { AuthGuard } from '../auth-guard.js';

// ==================== VARIABILI GLOBALI ====================
let pagamentiDB = [];
let artistiDB = [];
let agibilitaDB = [];
let selectedPayments = new Set();
let currentUser = null;
let paymentSettings = {
    ritenuta_occasionale: 0.20, // 20%
    soglia_ritenuta: 25.82,
    soglia_annua_occasionale: 5000,
    approvazione_automatica_sotto: 100,
    approvazione_dirigenziale_sopra: 500
};

// Filtri correnti
let currentFilters = {
    stato: 'pending',
    dateFrom: null,
    dateTo: null,
    tipoContratto: '',
    artista: '',
    importoMin: null
};

// Audit trail
let auditTrail = [];

// ==================== INIZIALIZZAZIONE SICURA ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema pagamenti avanzato...');
    
    try {
        // === VERIFICA AUTENTICAZIONE ===
        currentUser = await AuthGuard.getCurrentUser();
        if (!currentUser) {
            console.warn('⚠️ Utente non autenticato - AuthGuard gestirà il redirect');
            return;
        }
        
        console.log('✅ Utente autenticato:', currentUser.email);
        
        // === TEST CONNESSIONE DATABASE ===
        const connected = await DatabaseService.testConnection();
        if (!connected) {
            throw new Error('Connessione database fallita');
        }
        
        // === CARICA DATI INIZIALI ===
        await loadInitialData();
        
        // === SETUP INTERFACCIA ===
        setupDefaultFilters();
        setupEventListeners();
        
        // === CALCOLA PAGAMENTI AUTOMATICAMENTE ===
        await autoCalculatePaymentsFromAgibilita();
        
        // === APPLICA FILTRI E MOSTRA DATI ===
        await applyAdvancedFilters();
        
        // === AGGIORNA DASHBOARD ===
        await updateExecutiveDashboard();
        
        // === SETUP SISTEMA NOTIFICHE ===
        setupPaymentNotifications();
        
        console.log('✅ Sistema pagamenti inizializzato con successo!');
        logAuditEvent('system_initialized', 'Sistema pagamenti avviato', null);
        
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema pagamenti:', error);
        showToast('Errore di inizializzazione: ' + error.message, 'error');
    }
});

// ==================== CARICAMENTO DATI SICURO ====================
async function loadInitialData() {
    try {
        console.log('📥 Caricamento dati iniziali...');
        
        // Carica artisti con dati finanziari
        artistiDB = await DatabaseService.getArtistsWithFinancialData();
        console.log(`✅ ${artistiDB.length} artisti caricati`);
        
        // Carica agibilità recenti (ultimo anno)
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        agibilitaDB = await DatabaseService.getAgibilita({
            fromDate: lastYear.toISOString()
        });
        console.log(`✅ ${agibilitaDB.length} agibilità caricate`);
        
        // Carica pagamenti esistenti
        pagamentiDB = await DatabaseService.getPagamenti();
        console.log(`✅ ${pagamentiDB.length} pagamenti caricati`);
        
        // Carica configurazioni sistema
        await loadPaymentSettings();
        
    } catch (error) {
        console.error('❌ Errore caricamento dati:', error);
        showToast('Errore nel caricamento dei dati', 'error');
        throw error;
    }
}

async function loadPaymentSettings() {
    try {
        const settings = await DatabaseService.getPaymentSettings();
        if (settings) {
            paymentSettings = { ...paymentSettings, ...settings };
        }
    } catch (error) {
        console.warn('⚠️ Impossibile caricare impostazioni, uso defaults:', error);
    }
}

// ==================== CALCOLO AUTOMATICO PAGAMENTI ====================
async function autoCalculatePaymentsFromAgibilita() {
    try {
        console.log('🧮 Calcolo automatico pagamenti da agibilità...');
        
        let nuoviPagamenti = 0;
        
        for (const agibilita of agibilitaDB) {
            // Skip se agibilità già processata
            if (agibilita.payment_processed) continue;
            
            // Skip se non ha artisti
            if (!agibilita.artisti || agibilita.artisti.length === 0) continue;
            
            for (const artistaAgibilita of agibilita.artisti) {
                // Cerca se pagamento già esiste
                const esistePagamento = pagamentiDB.find(p => 
                    p.agibilita_id === agibilita.id && 
                    p.artista_cf === artistaAgibilita.cf
                );
                
                if (esistePagamento) continue;
                
                // Trova dati completi artista
                const artista = artistiDB.find(a => 
                    a.codice_fiscale === artistaAgibilita.cf ||
                    a.codice_fiscale_temp === artistaAgibilita.cf
                );
                
                if (!artista) {
                    console.warn(`⚠️ Artista non trovato per CF: ${artistaAgibilita.cf}`);
                    continue;
                }
                
                // Calcola pagamento
                const payment = await calculatePaymentForArtist(
                    agibilita, 
                    artistaAgibilita, 
                    artista
                );
                
                if (payment) {
                    // Salva pagamento
                    const savedPayment = await DatabaseService.createPayment(payment);
                    pagamentiDB.push(savedPayment);
                    nuoviPagamenti++;
                    
                    logAuditEvent('payment_calculated', 
                        `Pagamento calcolato per ${artista.nome} ${artista.cognome}`, 
                        savedPayment.id
                    );
                }
            }
            
            // Marca agibilità come processata
            await DatabaseService.updateAgibilita(agibilita.id, {
                payment_processed: true
            });
        }
        
        if (nuoviPagamenti > 0) {
            showToast(`✅ ${nuoviPagamenti} nuovi pagamenti calcolati automaticamente`, 'success');
        }
        
        console.log(`✅ Calcolo automatico completato: ${nuoviPagamenti} nuovi pagamenti`);
        
    } catch (error) {
        console.error('❌ Errore calcolo automatico pagamenti:', error);
        showToast('Errore nel calcolo automatico dei pagamenti', 'error');
    }
}

async function calculatePaymentForArtist(agibilita, artistaAgibilita, artista) {
    try {
        const importoLordo = parseFloat(artistaAgibilita.compenso) || 0;
        
        // Skip se importo è 0
        if (importoLordo === 0) return null;
        
        const tipoContratto = determineTipoContratto(artista, artistaAgibilita);
        let ritenuta = 0;
        let importoNetto = importoLordo;
        let statoIniziale = 'pending';
        
        // Calcola ritenute in base al tipo contratto
        switch (tipoContratto) {
            case 'occasionale':
                if (importoLordo > paymentSettings.soglia_ritenuta) {
                    ritenuta = importoLordo * paymentSettings.ritenuta_occasionale;
                    importoNetto = importoLordo - ritenuta;
                }
                break;
                
            case 'partitaiva':
                // Nessuna ritenuta per P.IVA
                ritenuta = 0;
                break;
                
            case 'chiamata':
            case 'dipendente':
                // Elaborazione via cedolino
                statoIniziale = 'payroll_pending';
                break;
        }
        
        // Auto-approvazione per importi bassi
        if (importoLordo < paymentSettings.approvazione_automatica_sotto) {
            statoIniziale = 'approved';
        }
        
        const payment = {
            agibilita_id: agibilita.id,
            artista_id: artista.id,
            artista_cf: artista.codice_fiscale || artista.codice_fiscale_temp,
            tipo_contratto: tipoContratto,
            importo_lordo: importoLordo,
            ritenuta: ritenuta,
            importo_netto: importoNetto,
            stato: statoIniziale,
            ruolo: artistaAgibilita.ruolo,
            data_evento: agibilita.data_inizio,
            locale_nome: agibilita.locale?.descrizione,
            causale: `Prestazione artistica ${artistaAgibilita.ruolo} - ${agibilita.codice}`,
            created_by: currentUser.id,
            metadata: {
                agibilita_codice: agibilita.codice,
                artista_nome: `${artista.nome} ${artista.cognome}`,
                calcolo_automatico: true,
                ritenuta_percentuale: tipoContratto === 'occasionale' ? paymentSettings.ritenuta_occasionale : 0
            }
        };
        
        return payment;
        
    } catch (error) {
        console.error('❌ Errore calcolo pagamento artista:', error);
        return null;
    }
}

function determineTipoContratto(artista, artistaAgibilita) {
    // Priorità a tipo_rapporto dell'agibilità
    if (artistaAgibilita.tipo_rapporto) {
        switch (artistaAgibilita.tipo_rapporto) {
            case 'partitaiva':
            case 'partita_iva':
                return 'partitaiva';
            case 'chiamata':
                return 'chiamata';
            case 'fulltime':
            case 'dipendente':
                return 'dipendente';
            default:
                return 'occasionale';
        }
    }
    
    // Fallback su dati artista
    if (artista.has_partita_iva || artista.partita_iva) {
        return 'partitaiva';
    }
    
    // Default occasionale
    return 'occasionale';
}

// ==================== DASHBOARD EXECUTIVO ====================
async function updateExecutiveDashboard() {
    try {
        console.log('📊 Aggiornamento dashboard executivo...');
        
        // Calcola statistiche
        const stats = calculateExecutiveStats();
        
        // Aggiorna contatori principali
        document.getElementById('totaleDaPagare').textContent = `€${stats.totaleDaPagare.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
        document.getElementById('numeroArtisti').textContent = stats.numeroArtisti;
        document.getElementById('pagamentiMese').textContent = `€${stats.pagamentiMese.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
        document.getElementById('ritenuteApplicate').textContent = `€${stats.ritenuteApplicate.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
        
        // Aggiorna badge
        updateTabBadges(stats);
        
        // Aggiorna trend
        updateTrendTexts(stats);
        
        // Aggiorna attività recenti
        updateRecentActivity();
        
        // Aggiorna status sistema
        updateSystemStatus();
        
        console.log('✅ Dashboard executivo aggiornato');
        
    } catch (error) {
        console.error('❌ Errore aggiornamento dashboard:', error);
    }
}

function calculateExecutiveStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filtra pagamenti in stato attivo
    const pagamentiAttivi = pagamentiDB.filter(p => 
        ['pending', 'approved', 'processing'].includes(p.stato)
    );
    
    // Totale da pagare
    const totaleDaPagare = pagamentiAttivi.reduce((sum, p) => sum + p.importo_netto, 0);
    
    // Numero artisti unici da pagare
    const artistiUniciSet = new Set(pagamentiAttivi.map(p => p.artista_cf));
    const numeroArtisti = artistiUniciSet.size;
    
    // Pagamenti del mese corrente
    const pagamentiMeseCorrente = pagamentiDB.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               p.stato === 'paid';
    });
    const pagamentiMese = pagamentiMeseCorrente.reduce((sum, p) => sum + p.importo_netto, 0);
    
    // Ritenute totali dell'anno
    const pagamentiAnno = pagamentiDB.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getFullYear() === currentYear;
    });
    const ritenuteApplicate = pagamentiAnno.reduce((sum, p) => sum + (p.ritenuta || 0), 0);
    
    // Conta per tipologia
    const occasionali = pagamentiAttivi.filter(p => p.tipo_contratto === 'occasionale').length;
    const partiteIva = pagamentiAttivi.filter(p => p.tipo_contratto === 'partitaiva').length;
    const dipendenti = pagamentiAttivi.filter(p => 
        ['chiamata', 'dipendente'].includes(p.tipo_contratto)
    ).length;
    
    return {
        totaleDaPagare,
        numeroArtisti,
        pagamentiMese,
        ritenuteApplicate,
        occasionali,
        partiteIva,
        dipendenti
    };
}

function updateTabBadges(stats) {
    document.getElementById('badgeOccasionale').textContent = stats.occasionali;
    document.getElementById('badgePartitaIva').textContent = stats.partiteIva;
    document.getElementById('badgeDipendenti').textContent = stats.dipendenti;
}

function updateTrendTexts(stats) {
    // Questi sarebbero calcolati con dati storici reali
    document.getElementById('trendDaPagare').textContent = 'In attesa di approvazione';
    document.getElementById('trendArtisti').textContent = `${stats.numeroArtisti} in coda`;
    document.getElementById('trendMese').textContent = 'Mese corrente';
    document.getElementById('trendRitenute').textContent = 'Anno fiscale 2025';
}

function updateRecentActivity() {
    const recentContainer = document.getElementById('recentActivityList');
    
    // Prende le ultime 5 attività
    const recentActivities = auditTrail.slice(-5).reverse();
    
    if (recentActivities.length === 0) {
        recentContainer.innerHTML = '<p class="no-data">Nessuna attività recente</p>';
        return;
    }
    
    recentContainer.innerHTML = recentActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-content">
                <div class="activity-title">${activity.action}</div>
                <div class="activity-subtitle">${activity.description}</div>
            </div>
            <div class="activity-date">${formatDateTime(activity.timestamp)}</div>
        </div>
    `).join('');
}

function updateSystemStatus() {
    // Database status
    document.getElementById('dbStatus').textContent = '🟢';
    document.getElementById('dbStatusText').textContent = 'Connesso';
    
    // API Banche status (simulato)
    document.getElementById('bankApiStatus').textContent = '🟡';
    document.getElementById('bankApiStatusText').textContent = 'Test Mode';
    
    // Sistema tasse status
    document.getElementById('taxApiStatus').textContent = '🟢';
    document.getElementById('taxApiStatusText').textContent = 'Operativo';
}

// ==================== GESTIONE FILTRI AVANZATI ====================
function setupDefaultFilters() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('filterDateFrom').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('filterDateTo').value = today.toISOString().split('T')[0];
    document.getElementById('filterStato').value = 'pending';
}

async function applyAdvancedFilters() {
    try {
        // Raccogli filtri
        currentFilters = {
            stato: document.getElementById('filterStato').value,
            dateFrom: document.getElementById('filterDateFrom').value,
            dateTo: document.getElementById('filterDateTo').value,
            tipoContratto: document.getElementById('filterTipoContratto').value,
            artista: document.getElementById('filterArtista').value.toLowerCase(),
            importoMin: parseFloat(document.getElementById('filterImportoMin').value) || null
        };
        
        // Applica filtri
        let pagamentiFiltrati = [...pagamentiDB];
        
        if (currentFilters.stato) {
            pagamentiFiltrati = pagamentiFiltrati.filter(p => p.stato === currentFilters.stato);
        }
        
        if (currentFilters.dateFrom) {
            const fromDate = new Date(currentFilters.dateFrom);
            pagamentiFiltrati = pagamentiFiltrati.filter(p => 
                new Date(p.created_at) >= fromDate
            );
        }
        
        if (currentFilters.dateTo) {
            const toDate = new Date(currentFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            pagamentiFiltrati = pagamentiFiltrati.filter(p => 
                new Date(p.created_at) <= toDate
            );
        }
        
        if (currentFilters.tipoContratto) {
            pagamentiFiltrati = pagamentiFiltrati.filter(p => 
                p.tipo_contratto === currentFilters.tipoContratto
            );
        }
        
        if (currentFilters.artista) {
            pagamentiFiltrati = pagamentiFiltrati.filter(p => {
                const artistaNome = (p.metadata?.artista_nome || '').toLowerCase();
                const cf = (p.artista_cf || '').toLowerCase();
                return artistaNome.includes(currentFilters.artista) || 
                       cf.includes(currentFilters.artista);
            });
        }
        
        if (currentFilters.importoMin) {
            pagamentiFiltrati = pagamentiFiltrati.filter(p => 
                p.importo_netto >= currentFilters.importoMin
            );
        }
        
        // Aggiorna visualizzazione
        displayFilteredPayments(pagamentiFiltrati);
        
        // Aggiorna statistiche con dati filtrati
        updateDashboardWithFilteredData(pagamentiFiltrati);
        
        console.log(`🔍 Filtri applicati: ${pagamentiFiltrati.length} pagamenti`);
        
    } catch (error) {
        console.error('❌ Errore applicazione filtri:', error);
        showToast('Errore nell\'applicazione dei filtri', 'error');
    }
}

function resetAdvancedFilters() {
    setupDefaultFilters();
    document.getElementById('filterTipoContratto').value = '';
    document.getElementById('filterArtista').value = '';
    document.getElementById('filterImportoMin').value = '';
    applyAdvancedFilters();
}

// ==================== DISPLAY PAGAMENTI PER TIPOLOGIA ====================
function displayFilteredPayments(pagamentiFiltrati) {
    // Raggruppa per tipologia
    const occasionali = pagamentiFiltrati.filter(p => p.tipo_contratto === 'occasionale');
    const partiteIva = pagamentiFiltrati.filter(p => p.tipo_contratto === 'partitaiva');
    const dipendenti = pagamentiFiltrati.filter(p => 
        ['chiamata', 'dipendente'].includes(p.tipo_contratto)
    );
    
    // Aggiorna ciascuna tab
    displayOccasionaliAvanzato(occasionali);
    displayPartiteIvaAvanzato(partiteIva);
    displayDipendentiAvanzato(dipendenti);
    
    // Aggiorna anteprima CIV
    updateCIVPreview();
}

function displayOccasionaliAvanzato(pagamenti) {
    const container = document.getElementById('listOccasionale');
    
    if (pagamenti.length === 0) {
        container.innerHTML = '<p class="no-data">Nessuna prestazione occasionale con i filtri correnti</p>';
        return;
    }
    
    container.innerHTML = pagamenti.map(p => {
        const isSelected = selectedPayments.has(p.id);
        const artista = getArtistaData(p.artista_cf);
        
        return `
            <div class="payment-item ${isSelected ? 'selected' : ''} ${p.stato}">
                <div class="payment-checkbox">
                    <input type="checkbox" 
                           id="pay_${p.id}" 
                           ${isSelected ? 'checked' : ''}
                           ${!['pending', 'approved'].includes(p.stato) ? 'disabled' : ''}
                           onchange="togglePaymentSelection('${p.id}')">
                </div>
                <div class="payment-info">
                    <div class="payment-header">
                        <div class="artist-name">
                            <strong>${p.metadata?.artista_nome || 'Nome non disponibile'}</strong>
                            <span class="cf-badge">${p.artista_cf}</span>
                            ${artista?.nazionalita !== 'IT' ? '<span class="foreign-badge">🌍</span>' : ''}
                        </div>
                        <div class="payment-status">
                            <span class="status-badge status-${p.stato}">${getStatoLabel(p.stato)}</span>
                            ${p.requires_approval ? '<span class="approval-badge">✋ Richiede Approvazione</span>' : ''}
                        </div>
                    </div>
                    <div class="payment-details">
                        <div class="event-info">
                            <span class="agibilita-ref">📄 ${p.metadata?.agibilita_codice || 'N/D'}</span>
                            <span class="event-date">${formatDate(p.data_evento)}</span>
                            <span class="venue">${p.locale_nome || 'Locale N/D'}</span>
                        </div>
                        <div class="role-info">
                            <span class="role-badge">${p.ruolo || 'Ruolo N/D'}</span>
                        </div>
                    </div>
                    <div class="payment-amounts">
                        <div class="amount-breakdown">
                            <span class="amount-lordo">Lordo: €${p.importo_lordo.toFixed(2)}</span>
                            ${p.ritenuta > 0 ? `<span class="amount-ritenuta">Ritenuta (20%): €${p.ritenuta.toFixed(2)}</span>` : ''}
                            <span class="amount-netto"><strong>Netto: €${p.importo_netto.toFixed(2)}</strong></span>
                        </div>
                        ${artista?.iban ? 
                            `<div class="iban-info">🏦 IBAN: ${maskIBAN(artista.iban)}</div>` : 
                            `<div class="iban-missing">⚠️ IBAN Mancante</div>`
                        }
                    </div>
                    ${p.note ? `<div class="payment-notes">📝 ${p.note}</div>` : ''}
                </div>
                <div class="payment-actions">
                    ${p.stato === 'pending' ? `
                        <button class="btn btn-sm btn-primary" onclick="showAdvancedPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        <button class="btn btn-sm btn-success" onclick="approvePayment('${p.id}')">
                            ✅ Approva
                        </button>
                        ${!artista?.iban ? `
                            <button class="btn btn-sm btn-warning" onclick="configureIBAN('${p.artista_id}', '${p.id}')">
                                🏦 Config IBAN
                            </button>
                        ` : ''}
                    ` : p.stato === 'approved' ? `
                        <button class="btn btn-sm btn-primary" onclick="processPayment('${p.id}')">
                            💳 Elabora
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="showAdvancedPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-secondary" onclick="showAdvancedPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        ${p.stato === 'failed' ? `
                            <button class="btn btn-sm btn-warning" onclick="retryPayment('${p.id}')">
                                🔄 Riprova
                            </button>
                        ` : ''}
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== UTILITY FUNCTIONS ====================
function getArtistaData(cf) {
    return artistiDB.find(a => 
        a.codice_fiscale === cf || 
        a.codice_fiscale_temp === cf
    );
}

function maskIBAN(iban) {
    if (!iban) return 'N/D';
    if (iban.length < 8) return iban;
    return iban.slice(0, 4) + '*'.repeat(iban.length - 8) + iban.slice(-4);
}

function getStatoLabel(stato) {
    const labels = {
        'pending': 'In Attesa',
        'approved': 'Approvato', 
        'processing': 'In Elaborazione',
        'paid': 'Pagato',
        'failed': 'Fallito',
        'cancelled': 'Annullato',
        'rejected': 'Rifiutato',
        'payroll_pending': 'Gestione Paghe'
    };
    return labels[stato] || stato;
}

function formatDate(dateString) {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT');
}

// ==================== LOGGING E AUDIT ====================
function logAuditEvent(eventType, description, paymentId = null) {
    const auditEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        event_type: eventType,
        description: description,
        payment_id: paymentId,
        user_id: currentUser?.id,
        user_email: currentUser?.email,
        ip_address: 'localhost',
        user_agent: navigator.userAgent
    };
    
    auditTrail.push(auditEntry);
    
    // Mantieni solo gli ultimi 1000 eventi in memoria
    if (auditTrail.length > 1000) {
        auditTrail = auditTrail.slice(-1000);
    }
    
    console.log('📋 Audit Event:', auditEntry);
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
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

// ==================== TAB MANAGEMENT ====================
function showPaymentTab(tabName) {
    // Aggiorna tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
    
    // Aggiorna contenuti
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tabContent${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Chiusura modali con click esterno
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Filtro artista con debounce
    let artistaTimeout;
    document.getElementById('filterArtista').addEventListener('input', function() {
        clearTimeout(artistaTimeout);
        artistaTimeout = setTimeout(() => applyAdvancedFilters(), 500);
    });
}

// ==================== FUNZIONI PLACEHOLDER ====================
// Queste funzioni dovranno essere implementate completamente
function togglePaymentSelection(paymentId) {
    if (selectedPayments.has(paymentId)) {
        selectedPayments.delete(paymentId);
    } else {
        selectedPayments.add(paymentId);
    }
    
    const checkbox = document.getElementById(`pay_${paymentId}`);
    const item = checkbox?.closest('.payment-item');
    if (item) {
        item.classList.toggle('selected', selectedPayments.has(paymentId));
    }
    
    logAuditEvent('payment_selected', `Pagamento ${selectedPayments.has(paymentId) ? 'selezionato' : 'deselezionato'}`, paymentId);
}

function showAdvancedPaymentDetail(paymentId) {
    showToast('Dettaglio pagamento in sviluppo', 'info');
}

function approvePayment(paymentId) {
    showToast('Approvazione pagamento in sviluppo', 'info');
}

function processPayment(paymentId) {
    showToast('Elaborazione pagamento in sviluppo', 'info');
}

function retryPayment(paymentId) {
    showToast('Retry pagamento in sviluppo', 'info');
}

function configureIBAN(artistaId, paymentId) {
    showToast('Configurazione IBAN in sviluppo', 'info');
}

function selectAllOccasionali() {
    const occasionali = pagamentiDB.filter(p => 
        p.tipo_contratto === 'occasionale' && 
        ['pending', 'approved'].includes(p.stato)
    );
    
    occasionali.forEach(p => {
        selectedPayments.add(p.id);
        const checkbox = document.getElementById(`pay_${p.id}`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.payment-item')?.classList.add('selected');
        }
    });
    
    showToast(`✅ Selezionati ${occasionali.length} pagamenti occasionali`, 'success');
    logAuditEvent('bulk_selection', `${occasionali.length} pagamenti occasionali selezionati`, null);
}

function approveSelectedOccasionali() {
    const selected = Array.from(selectedPayments);
    if (selected.length === 0) {
        showToast('Seleziona almeno un pagamento', 'warning');
        return;
    }
    
    if (confirm(`Confermi l'approvazione di ${selected.length} pagamenti occasionali?`)) {
        showToast(`Approvazione di ${selected.length} pagamenti in sviluppo`, 'info');
        selectedPayments.clear();
    }
}

function displayPartiteIvaAvanzato(pagamenti) {
    const container = document.getElementById('listPartitaIva');
    
    if (pagamenti.length === 0) {
        container.innerHTML = '<p class="no-data">Nessuna partita IVA con i filtri correnti</p>';
        return;
    }
    
    container.innerHTML = pagamenti.map(p => {
        const artista = getArtistaData(p.artista_cf);
        const hasFattura = p.fattura_ricevuta || false;
        
        return `
            <div class="payment-item ${p.stato}">
                <div class="payment-info">
                    <div class="payment-header">
                        <div class="artist-name">
                            <strong>${p.metadata?.artista_nome || 'Nome non disponibile'}</strong>
                            <span class="piva-badge">P.IVA: ${artista?.partita_iva || 'N/D'}</span>
                        </div>
                        <div class="payment-status">
                            <span class="status-badge status-${p.stato}">${getStatoLabel(p.stato)}</span>
                        </div>
                    </div>
                    <div class="payment-details">
                        <div class="event-info">
                            <span class="agibilita-ref">📄 ${p.metadata?.agibilita_codice || 'N/D'}</span>
                            <span class="event-date">${formatDate(p.data_evento)}</span>
                            <span class="venue">${p.locale_nome || 'Locale N/D'}</span>
                        </div>
                    </div>
                    <div class="invoice-management">
                        <div class="invoice-check">
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       ${hasFattura ? 'checked' : ''}
                                       ${p.stato !== 'pending' ? 'disabled' : ''}
                                       onchange="toggleFatturaRicevuta('${p.id}', this.checked)">
                                <span>📧 Fattura ricevuta</span>
                            </label>
                            ${hasFattura ? `
                                <div class="invoice-details">
                                    <span class="invoice-date">Ricevuta: ${formatDate(p.data_fattura)}</span>
                                    ${p.numero_fattura ? `<span class="invoice-number">N. ${p.numero_fattura}</span>` : ''}
                                </div>
                            ` : `
                                <div class="invoice-missing">
                                    <span class="missing-text">⏳ In attesa di fattura</span>
                                    <button class="btn btn-xs btn-secondary" onclick="sendInvoiceReminder('${p.id}')">
                                        📧 Sollecita
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                    <div class="payment-amounts">
                        <span class="amount-total"><strong>Importo: €${p.importo_lordo.toFixed(2)}</strong></span>
                        ${artista?.iban ? 
                            `<div class="iban-info">🏦 IBAN: ${maskIBAN(artista.iban)}</div>` : 
                            `<div class="iban-missing">⚠️ IBAN Mancante</div>`
                        }
                    </div>
                </div>
                <div class="payment-actions">
                    <button class="btn btn-sm btn-secondary" onclick="showAdvancedPaymentDetail('${p.id}')">
                        👁️ Dettagli
                    </button>
                    ${p.stato === 'pending' ? `
                        <button class="btn btn-sm btn-success" 
                                ${!hasFattura || !artista?.iban ? 'disabled' : ''}
                                onclick="approvePayment('${p.id}')">
                            ✅ Approva
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function displayDipendentiAvanzato(pagamenti) {
    const container = document.getElementById('listDipendenti');
    
    if (pagamenti.length === 0) {
        container.innerHTML = '<p class="no-data">Nessun dipendente/chiamata con i filtri correnti</p>';
        return;
    }
    
    // Raggruppa per mese
    const pagamentiPerMese = {};
    pagamenti.forEach(p => {
        const date = new Date(p.data_evento);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('it-IT', { year: 'numeric', month: 'long' });
        
        if (!pagamentiPerMese[monthKey]) {
            pagamentiPerMese[monthKey] = {
                label: monthLabel,
                pagamenti: []
            };
        }
        pagamentiPerMese[monthKey].pagamenti.push(p);
    });
    
    container.innerHTML = Object.entries(pagamentiPerMese).map(([monthKey, monthData]) => {
        const totaleMese = monthData.pagamenti.reduce((sum, p) => sum + p.importo_lordo, 0);
        const numeroArtisti = new Set(monthData.pagamenti.map(p => p.artista_cf)).size;
        
        return `
            <div class="month-group">
                <div class="month-header">
                    <h4>${monthData.label}</h4>
                    <div class="month-summary">
                        <span>${numeroArtisti} artisti</span>
                        <span>Totale: €${totaleMese.toFixed(2)}</span>
                        <button class="btn btn-xs btn-primary" onclick="exportMonthPayroll('${monthKey}')">
                            📤 Export Cedolini
                        </button>
                    </div>
                </div>
                <div class="month-payments">
                    ${monthData.pagamenti.map(p => {
                        const artista = getArtistaData(p.artista_cf);
                        const tipoContratto = p.tipo_contratto === 'chiamata' ? 'Contratto a Chiamata' : 'Dipendente Full Time';
                        
                        return `
                            <div class="payment-item ${p.stato}">
                                <div class="payment-info">
                                    <div class="artist-name">
                                        <strong>${p.metadata?.artista_nome || 'Nome non disponibile'}</strong>
                                        <span class="contract-badge">${tipoContratto}</span>
                                    </div>
                                    <div class="payment-details">
                                        <span class="agibilita-ref">📄 ${p.metadata?.agibilita_codice || 'N/D'}</span>
                                        <span class="event-date">${formatDate(p.data_evento)}</span>
                                        <span class="venue">${p.locale_nome || 'Locale N/D'}</span>
                                        <span class="role-badge">${p.ruolo || 'Ruolo N/D'}</span>
                                    </div>
                                    <div class="payment-amounts">
                                        <span class="amount-total"><strong>Lordo: €${p.importo_lordo.toFixed(2)}</strong></span>
                                        <span class="payroll-note">📋 Da elaborare in cedolino</span>
                                    </div>
                                </div>
                                <div class="payment-status">
                                    <span class="status-badge status-payroll">Gestione Paghe</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function updateCIVPreview() {
    const selected = Array.from(selectedPayments).map(id => 
        pagamentiDB.find(p => p.id === id)
    ).filter(p => p && ['approved', 'processing'].includes(p.stato));
    
    const container = document.getElementById('civPreviewList');
    
    if (selected.length === 0) {
        container.innerHTML = '<p class="no-data">Nessun pagamento selezionato per CIV</p>';
        updateCIVTotals(0, 0, 0, 0);
        return;
    }
    
    let totaleLordo = 0;
    let totaleRitenute = 0;
    let totaleNetto = 0;
    
    container.innerHTML = selected.map(p => {
        const artista = getArtistaData(p.artista_cf);
        totaleLordo += p.importo_lordo;
        totaleRitenute += p.ritenuta || 0;
        totaleNetto += p.importo_netto;
        
        return `
            <div class="civ-item">
                <div class="civ-beneficiary">
                    <strong>${p.metadata?.artista_nome || 'N/D'}</strong>
                    <span class="iban">${artista?.iban ? maskIBAN(artista.iban) : 'IBAN MANCANTE'}</span>
                    <span class="causale">${p.causale || 'Prestazione artistica'}</span>
                </div>
                <div class="civ-amounts">
                    <span class="civ-lordo">€${p.importo_lordo.toFixed(2)}</span>
                    ${p.ritenuta > 0 ? `<span class="civ-ritenuta">-€${p.ritenuta.toFixed(2)}</span>` : ''}
                    <span class="civ-netto"><strong>€${p.importo_netto.toFixed(2)}</strong></span>
                </div>
            </div>
        `;
    }).join('');
    
    updateCIVTotals(selected.length, totaleLordo, totaleRitenute, totaleNetto);
}

function updateCIVTotals(numeroBeneficiari, lordo, ritenute, netto) {
    document.getElementById('civNumBeneficiari').textContent = numeroBeneficiari;
    document.getElementById('civTotaleLordo').textContent = `€${lordo.toFixed(2).replace('.', ',')}`;
    document.getElementById('civTotaleRitenute').textContent = `€${ritenute.toFixed(2).replace('.', ',')}`;
    document.getElementById('civTotaleNetto').textContent = `€${netto.toFixed(2).replace('.', ',')}`;
}

function updateDashboardWithFilteredData(pagamentiFiltrati) {
    // Aggiorna statistiche dashboard con dati filtrati
    const filteredStats = {
        totaleDaPagare: pagamentiFiltrati.reduce((sum, p) => sum + p.importo_netto, 0),
        numeroArtisti: new Set(pagamentiFiltrati.map(p => p.artista_cf)).size,
        occasionali: pagamentiFiltrati.filter(p => p.tipo_contratto === 'occasionale').length,
        partiteIva: pagamentiFiltrati.filter(p => p.tipo_contratto === 'partitaiva').length,
        dipendenti: pagamentiFiltrati.filter(p => ['chiamata', 'dipendente'].includes(p.tipo_contratto)).length
    };
    
    updateTabBadges(filteredStats);
}

function setupPaymentNotifications() {
    // Controlla notifiche ogni 5 minuti
    setInterval(checkPaymentNotifications, 5 * 60 * 1000);
    checkPaymentNotifications();
}

function checkPaymentNotifications() {
    try {
        const today = new Date();
        
        // Controlla pagamenti in scadenza
        const pagamentiInScadenza = pagamentiDB.filter(p => {
            if (p.stato !== 'pending') return false;
            
            const createdDate = new Date(p.created_at);
            const daysSinceCreated = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
            
            return daysSinceCreated >= 7; // 7 giorni senza elaborazione
        });
        
        if (pagamentiInScadenza.length > 0) {
            showToast(`⚠️ ${pagamentiInScadenza.length} pagamenti in attesa da oltre 7 giorni`, 'warning', 8000);
        }
        
        // Controlla fatture mancanti
        const fattureMancantiPIva = pagamentiDB.filter(p => 
            p.tipo_contratto === 'partitaiva' && 
            p.stato === 'pending' && 
            !p.fattura_ricevuta
        );
        
        if (fattureMancantiPIva.length > 0) {
            const daysSinceOldest = Math.floor((today - new Date(Math.min(...fattureMancantiPIva.map(p => new Date(p.created_at))))) / (1000 * 60 * 60 * 24));
            
            if (daysSinceOldest >= 3) {
                showToast(`📧 ${fattureMancantiPIva.length} fatture P.IVA mancanti da oltre 3 giorni`, 'warning', 8000);
            }
        }
        
    } catch (error) {
        console.error('❌ Errore controllo notifiche:', error);
    }
}

// ==================== FUNZIONI PLACEHOLDER COMPLETE ====================
async function syncPaymentsFromAgibilita() {
    showToast('Sincronizzazione da agibilità in sviluppo', 'info');
}

function showPaymentSettings() {
    showToast('Impostazioni sistema in sviluppo', 'info');
}

function toggleFatturaRicevuta(paymentId, ricevuta) {
    showToast(`Fattura ${ricevuta ? 'confermata' : 'rimossa'} - Funzione in sviluppo`, 'info');
}

function sendInvoiceReminder(paymentId) {
    showToast('Invio sollecito fattura in sviluppo', 'info');
}

function checkAllInvoices() {
    showToast('Verifica automatica fatture in sviluppo', 'info');
}

function markAllInvoicesReceived() {
    showToast('Conferma automatica fatture in sviluppo', 'info');
}

function generateInvoiceReminders() {
    showToast('Generazione solleciti automatici in sviluppo', 'info');
}

function generatePayrollExport() {
    showToast('Export buste paga in sviluppo', 'info');
}

function calculateContributions() {
    showToast('Calcolo contributi in sviluppo', 'info');
}

function exportMonthPayroll(monthKey) {
    showToast(`Export cedolini per ${monthKey} in sviluppo`, 'info');
}

function generateAdvancedCIV() {
    const banca = document.getElementById('selectBanca').value;
    if (!banca) {
        showToast('Seleziona una banca', 'warning');
        return;
    }
    
    const selected = Array.from(selectedPayments);
    if (selected.length === 0) {
        showToast('Nessun pagamento selezionato', 'warning');
        return;
    }
    
    showToast(`Generazione CIV ${banca} per ${selected.length} pagamenti in sviluppo`, 'info');
}

function calculateRetentions() {
    showToast('Ricalcolo ritenute in sviluppo', 'info');
}

function exportAuditLog() {
    showToast('Export audit log in sviluppo', 'info');
}

function clearOldLogs() {
    showToast('Pulizia log vecchi in sviluppo', 'info');
}

function autoCalculateAllPayments() {
    if (confirm('Vuoi ricalcolare automaticamente tutti i pagamenti dalle agibilità recenti?')) {
        showToast('Calcolo automatico di tutti i pagamenti in sviluppo', 'info');
    }
}

function approveAllPending() {
    const pendingPayments = pagamentiDB.filter(p => p.stato === 'pending');
    
    if (pendingPayments.length === 0) {
        showToast('Nessun pagamento in attesa di approvazione', 'info');
        return;
    }
    
    if (confirm(`Confermi l'approvazione di tutti i ${pendingPayments.length} pagamenti pendenti?`)) {
        showToast(`Approvazione automatica di ${pendingPayments.length} pagamenti in sviluppo`, 'info');
    }
}

function generateMonthlyReport() {
    const month = prompt('Inserisci il mese per il report (YYYY-MM):') || 
                 new Date().toISOString().slice(0, 7);
    
    showToast(`Generazione report mensile per ${month} in sviluppo`, 'info');
}

function saveFilterPreset() {
    showToast('Salvataggio preset filtri in sviluppo', 'info');
}

function closeAdvancedPaymentModal() {
    document.getElementById('advancedPaymentModal').style.display = 'none';
}

function closeIbanConfigModal() {
    document.getElementById('ibanConfigModal').style.display = 'none';
}

function saveIbanConfiguration() {
    showToast('Salvataggio configurazione IBAN in sviluppo', 'info');
}

function showSettingsTab(tabName) {
    showToast(`Tab impostazioni ${tabName} in sviluppo`, 'info');
}

function savePaymentSettings() {
    showToast('Salvataggio impostazioni in sviluppo', 'info');
}

function closePaymentSettingsModal() {
    document.getElementById('paymentSettingsModal').style.display = 'none';
}

// ==================== ESPORTAZIONE FUNZIONI GLOBALI ====================
window.showPaymentTab = showPaymentTab;
window.applyAdvancedFilters = applyAdvancedFilters;
window.resetAdvancedFilters = resetAdvancedFilters;
window.selectAllOccasionali = selectAllOccasionali;
window.approveSelectedOccasionali = approveSelectedOccasionali;
window.togglePaymentSelection = togglePaymentSelection;
window.showAdvancedPaymentDetail = showAdvancedPaymentDetail;
window.closeAdvancedPaymentModal = closeAdvancedPaymentModal;
window.approvePayment = approvePayment;
window.processPayment = processPayment;
window.retryPayment = retryPayment;
window.toggleFatturaRicevuta = toggleFatturaRicevuta;
window.sendInvoiceReminder = sendInvoiceReminder;
window.checkAllInvoices = checkAllInvoices;
window.markAllInvoicesReceived = markAllInvoicesReceived;
window.generateInvoiceReminders = generateInvoiceReminders;
window.configureIBAN = configureIBAN;
window.saveIbanConfiguration = saveIbanConfiguration;
window.closeIbanConfigModal = closeIbanConfigModal;
window.generatePayrollExport = generatePayrollExport;
window.calculateContributions = calculateContributions;
window.exportMonthPayroll = exportMonthPayroll;
window.generateAdvancedCIV = generateAdvancedCIV;
window.calculateRetentions = calculateRetentions;
window.syncPaymentsFromAgibilita = syncPaymentsFromAgibilita;
window.showPaymentSettings = showPaymentSettings;
window.showSettingsTab = showSettingsTab;
window.savePaymentSettings = savePaymentSettings;
window.closePaymentSettingsModal = closePaymentSettingsModal;
window.autoCalculateAllPayments = autoCalculateAllPayments;
window.approveAllPending = approveAllPending;
window.generateMonthlyReport = generateMonthlyReport;
window.exportAuditLog = exportAuditLog;
window.clearOldLogs = clearOldLogs;
window.saveFilterPreset = saveFilterPreset;
window.showProcessPayments = () => showPaymentTab('occasionali');
window.showPendingApprovals = () => showPaymentTab('occasionali');
window.showPaymentHistory = () => showPaymentTab('audit');

console.log('💰 Sistema Pagamenti RECORP base inizializzato con successo! 🚀');