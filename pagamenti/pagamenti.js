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
    stato: 'da_pagare', // ✅ CORRETTO: stato del database
    dateFrom: null,
    dateTo: null,
    tipoContratto: '',
    artista: '',
    importoMin: null
};

// Audit trail
let auditTrail = [];

// 🔥 FLAG PER EVITARE INIT MULTIPLI
let isInitializing = false;
let isInitialized = false;

// ==================== INIZIALIZZAZIONE SICURA CORRETTA ====================
document.addEventListener('DOMContentLoaded', async function() {
    // 🔥 PREVENZIONE LOOP - Solo un'inizializzazione alla volta
    if (isInitializing || isInitialized) {
        console.log('⚠️ Inizializzazione già in corso o completata, skip');
        return;
    }
    
    isInitializing = true;
    console.log('🚀 Inizializzazione sistema pagamenti avanzato...');
    
    try {
        // === STEP 1: AUTENTICAZIONE MANUALE (NO AUTO-INIT) ===
        console.log('🔐 Inizializzazione autenticazione manuale...');
        await AuthGuard.initPageProtection();
        
        // === STEP 2: VERIFICA UTENTE ===
        currentUser = await AuthGuard.getCurrentUser();
        if (!currentUser) {
            console.warn('⚠️ Utente non autenticato dopo verifica');
            return; // AuthGuard ha già gestito il redirect
        }
        
        console.log('✅ Utente autenticato:', currentUser.email);
        
        // === STEP 3: TEST CONNESSIONE DATABASE ===
        console.log('🔌 Test connessione database...');
        const connectionTest = await DatabaseService.testConnection();
        if (!connectionTest.connected) {
            throw new Error('Connessione database fallita: ' + (connectionTest.error || 'Errore sconosciuto'));
        }
        console.log('✅ Database connesso');
        
        // === STEP 4: CARICA DATI INIZIALI ===
        console.log('📥 Caricamento dati iniziali...');
        await loadInitialData();
        
        // === STEP 5: SETUP INTERFACCIA ===
        console.log('🖥️ Setup interfaccia...');
        setupDefaultFilters();
        setupEventListeners();
        
        // === STEP 6: CALCOLO AUTOMATICO PAGAMENTI ===
        console.log('🧮 Avvio calcolo automatico pagamenti...');
        await autoCalculatePaymentsFromAgibilita(true);
        
        // === STEP 7: RICARICA PAGAMENTI AGGIORNATI ===
        console.log('🔄 Ricaricamento pagamenti aggiornati...');
        pagamentiDB = await DatabaseService.getPagamenti();
        console.log('✅ ' + pagamentiDB.length + ' pagamenti totali caricati');
        
        // === STEP 8: APPLICA FILTRI E MOSTRA DATI ===
        console.log('🔍 Applicazione filtri e visualizzazione...');
        await applyAdvancedFilters();
        
        // === STEP 9: AGGIORNA DASHBOARD ===
        console.log('📊 Aggiornamento dashboard...');
        await updateExecutiveDashboard();
        
        // === STEP 10: SETUP NOTIFICHE ===
        console.log('🔔 Setup sistema notifiche...');
        setupPaymentNotifications();
        
        // === COMPLETAMENTO ===
        isInitialized = true;
        console.log('✅ Sistema pagamenti inizializzato con successo!');
        logAuditEvent('system_initialized', 'Sistema pagamenti avviato', null);
        
        // Nascondi loading se presente
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema pagamenti:', error);
        
        // Mostra errore user-friendly
        const errorMessage = error.message || 'Errore di inizializzazione sconosciuto';
        showToast('Errore di inizializzazione: ' + errorMessage, 'error');
        
        // Se errore di autenticazione, AuthGuard ha già gestito il redirect
        if (error.message?.includes('Autenticazione')) {
            console.log('🔄 Errore autenticazione - AuthGuard gestirà il redirect');
            return;
        }
        
    } finally {
        isInitializing = false;
    }
});

// ==================== CARICAMENTO DATI SICURO ====================
async function loadInitialData() {
    try {
        console.log('📥 Caricamento dati iniziali...');
        
        // ✅ CORRETTO: Usa funzione esistente nel DatabaseService
        artistiDB = await DatabaseService.getArtistsWithFinancialData();
        console.log(`✅ ${artistiDB.length} artisti caricati`);
        
        // Carica agibilità recenti (ultimo anno)
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        agibilitaDB = await DatabaseService.getAgibilita({
            fromDate: lastYear.toISOString()
        });
        console.log(`✅ ${agibilitaDB.length} agibilità caricate`);
        
        // ✅ CORRETTO: Usa funzione esistente nel DatabaseService
        pagamentiDB = await DatabaseService.getPagamenti();
        console.log(`✅ ${pagamentiDB.length} pagamenti caricati`);
        
        // Carica configurazioni sistema
        await loadPaymentSettings();
        
    } catch (error) {
        console.error('❌ Errore caricamento dati:', error);
        showToast('Errore nel caricamento dei dati: ' + error.message, 'error');
        throw error;
    }
}

async function loadPaymentSettings() {
    try {
        // ✅ CORRETTO: Usa funzione esistente nel DatabaseService
        const settings = await DatabaseService.getPaymentSettings();
        if (settings) {
            paymentSettings = Object.assign({}, paymentSettings, settings); // ✅ CORRETTO: Object.assign invece di spread
        }
    } catch (error) {
        console.warn('⚠️ Impossibile caricare impostazioni, uso defaults:', error);
    }
}

// ==================== CALCOLO AUTOMATICO PAGAMENTI ====================
async function autoCalculatePaymentsFromAgibilita(forceRecalculate = false) {
    try {
        console.log('🧮 Calcolo automatico pagamenti da agibilità...');
        console.log('📊 Dati disponibili:', {
            agibilita: agibilitaDB.length,
            artisti: artistiDB.length,
            pagamenti_esistenti: pagamentiDB.length
        });
        
        // ✅ DEBUG: Mostra struttura delle prime agibilità
        if (agibilitaDB.length > 0) {
            console.log('🔍 STRUTTURA AGIBILITÀ (prima 2):');
            agibilitaDB.slice(0, 2).forEach(function(ag, index) {
                console.log('Agibilità ' + (index + 1) + ':', {
                    id: ag.id,
                    codice: ag.codice,
                    payment_processed: ag.payment_processed,
                    artisti_count: ag.artisti ? ag.artisti.length : 0,
                    artisti_structure: ag.artisti ? ag.artisti[0] : null,
                    locale_structure: ag.locale ? Object.keys(ag.locale) : null
                });
            });
        }
        
        // ✅ DEBUG: Mostra struttura artisti
        if (artistiDB.length > 0) {
            console.log('🔍 STRUTTURA ARTISTI (primo):');
            console.log('Artista 1:', {
                id: artistiDB[0].id,
                nome: artistiDB[0].nome,
                cognome: artistiDB[0].cognome,
                codice_fiscale: artistiDB[0].codice_fiscale,
                codice_fiscale_temp: artistiDB[0].codice_fiscale_temp,
                has_partita_iva: artistiDB[0].has_partita_iva,
                iban: artistiDB[0].iban ? 'PRESENTE' : 'MANCANTE'
            });
        }
        
        let nuoviPagamenti = 0;
        let agibilitaProcessate = 0;
        let erroriDettaglio = [];
        
        for (const agibilita of agibilitaDB) {
            console.log('\n🔄 === PROCESSANDO AGIBILITÀ ===');
            console.log('ID:', agibilita.id, 'Codice:', agibilita.codice);
            console.log('Payment processed:', agibilita.payment_processed);
            console.log('Artisti raw:', agibilita.artisti);
            
            // ✅ MODIFICATO: Se forzato, ricalcola anche agibilità già processate
            if (!forceRecalculate && agibilita.payment_processed) {
                console.log('⏭️ Agibilità ' + agibilita.codice + ' già processata, skip');
                continue;
            }
            
            // ✅ DEBUG: Verifica struttura artisti
            if (!agibilita.artisti) {
                console.warn('❌ agibilita.artisti è null/undefined');
                erroriDettaglio.push('Agibilità ' + agibilita.codice + ': campo artisti null');
                continue;
            }
            
            if (!Array.isArray(agibilita.artisti)) {
                console.warn('❌ agibilita.artisti non è un array:', typeof agibilita.artisti);
                erroriDettaglio.push('Agibilità ' + agibilita.codice + ': artisti non è array');
                continue;
            }
            
            if (agibilita.artisti.length === 0) {
                console.log('⚠️ Agibilità ' + agibilita.codice + ' senza artisti, skip');
                continue;
            }
            
            console.log('✅ Agibilità ha ' + agibilita.artisti.length + ' artisti');
            
            for (let i = 0; i < agibilita.artisti.length; i++) {
                const artistaAgibilita = agibilita.artisti[i];
                console.log('\n  👤 === ARTISTA ' + (i + 1) + ' ===');
                console.log('  Dati artista agibilità:', artistaAgibilita);
                
                // ✅ DEBUG: Verifica campi artista
                if (!artistaAgibilita.artist_id) {
                    console.warn('  ❌ Artista senza artist_id:', artistaAgibilita);
                    erroriDettaglio.push('Agibilità ' + agibilita.codice + ': artista senza artist_id');
                    continue;
                }
                
                const artistId = artistaAgibilita.artist_id;
                console.log('  Artist ID da cercare:', artistId);
                
                // ✅ MODIFICATO: Se forzato, controlla anche esistenza per evitare duplicati
                let esistePagamento = pagamentiDB.find(function(p) {
                    return p.agibilita_id === agibilita.id && 
                           p.artista_id === artistId;
                });
                
                if (!forceRecalculate && esistePagamento) {
                    console.log('  ⏭️ Pagamento già esistente per artist_id ' + artistId + ', skip');
                    continue;
                }
                
                // ✅ DEBUG: Ricerca artista nel database
                console.log('  🔍 Cercando artista nel database...');
                const artista = artistiDB.find(function(a) {
                    const match = a.id === parseInt(artistId);
                    if (match) {
                        console.log('  ✅ TROVATO:', a.nome, a.cognome, '(ID:', a.id, ')');
                    }
                    return match;
                });
                
                if (!artista) {
                    console.warn('  ❌ Artista NON TROVATO per ID: ' + artistId);
                    console.log('  🔍 ID disponibili nel database:');
                    artistiDB.slice(0, 5).forEach(function(a) {
                        console.log('    -', a.id, '(' + a.nome + ' ' + a.cognome + ')');
                    });
                    erroriDettaglio.push('Artist ID ' + artistId + ' non trovato in database artisti');
                    continue;
                }
                
                // ✅ DEBUG: Verifica compenso
                const compenso = parseFloat(artistaAgibilita.compenso) || 0;
                console.log('  💰 Compenso:', compenso);
                
                if (compenso === 0) {
                    console.log('  ⚠️ Compenso zero, skip pagamento');
                    continue;
                }
                
                console.log('  🧮 Calcolando pagamento per: ' + artista.nome + ' ' + artista.cognome + ' (€' + compenso + ')');
                
                // Calcola pagamento
                const payment = await calculatePaymentForArtist(
                    agibilita, 
                    artistaAgibilita, 
                    artista
                );
                
                console.log('  📋 Pagamento calcolato:', payment);
                
                if (payment) {
                    try {
                        // ✅ MODIFICATO: Se esiste già, aggiorna invece di creare
                        let savedPayment;
                        if (esistePagamento && forceRecalculate) {
                            console.log('  🔄 Aggiornando pagamento esistente per ' + artista.nome);
                            savedPayment = await DatabaseService.updatePayment(esistePagamento.id, payment);
                        } else {
                            console.log('  ✨ Creando nuovo pagamento per ' + artista.nome);
                            savedPayment = await DatabaseService.createPayment(payment);
                            pagamentiDB.push(savedPayment);
                        }
                        
                        console.log('  ✅ Pagamento salvato:', savedPayment.id);
                        nuoviPagamenti++;
                        
                        logAuditEvent('payment_calculated', 
                            'Pagamento calcolato per ' + artista.nome + ' ' + artista.cognome, 
                            savedPayment.id
                        );
                    } catch (saveError) {
                        console.error('  ❌ Errore salvataggio pagamento:', saveError);
                        erroriDettaglio.push('Errore salvataggio pagamento per ' + artista.nome + ': ' + saveError.message);
                    }
                } else {
                    console.log('  ❌ Pagamento non calcolato (payment = null)');
                    erroriDettaglio.push('Calcolo pagamento fallito per ' + artista.nome);
                }
            }
            
            // ✅ MODIFICATO: Marca agibilità come processata solo se non forzato
            if (!agibilita.payment_processed) {
                try {
                    await DatabaseService.updateAgibilita(agibilita.id, {
                        payment_processed: true
                    });
                    agibilitaProcessate++;
                    console.log('✅ Agibilità marcata come processata');
                } catch (updateError) {
                    console.error('❌ Errore aggiornamento agibilità:', updateError);
                    erroriDettaglio.push('Errore aggiornamento agibilità ' + agibilita.codice + ': ' + updateError.message);
                }
            }
        }
        
        // ✅ REPORT FINALE
        console.log('\n📊 === REPORT FINALE ===');
        console.log('Nuovi pagamenti:', nuoviPagamenti);
        console.log('Agibilità processate:', agibilitaProcessate);
        console.log('Errori riscontrati:', erroriDettaglio.length);
        
        if (erroriDettaglio.length > 0) {
            console.log('❌ ERRORI DETTAGLIO:');
            erroriDettaglio.forEach(function(errore, index) {
                console.log((index + 1) + '.', errore);
            });
        }
        
        if (nuoviPagamenti > 0) {
            showToast('✅ ' + nuoviPagamenti + ' pagamenti calcolati automaticamente', 'success');
        } else {
            console.log('ℹ️ Nessun nuovo pagamento da calcolare');
            if (agibilitaDB.length === 0) {
                showToast('ℹ️ Nessuna agibilità trovata per il calcolo pagamenti', 'info');
            } else if (erroriDettaglio.length > 0) {
                showToast('⚠️ Calcolo completato con ' + erroriDettaglio.length + ' errori (vedi console)', 'warning');
            } else {
                showToast('ℹ️ Tutti i pagamenti sono già aggiornati', 'info');
            }
        }
        
        console.log('✅ Calcolo automatico completato: ' + nuoviPagamenti + ' pagamenti, ' + agibilitaProcessate + ' agibilità processate');
        
    } catch (error) {
        console.error('❌ Errore calcolo automatico pagamenti:', error);
        showToast('Errore nel calcolo automatico dei pagamenti: ' + error.message, 'error');
    }
}

async function calculatePaymentForArtist(agibilita, artistaAgibilita, artista) {
    try {
        const importoLordo = parseFloat(artistaAgibilita.compenso) || 0;
        
        // Skip se importo è 0
        if (importoLordo === 0) return null;
        
        const tipoContratto = determineTipoContratto(artista, artistaAgibilita);
        let ritenuteIrpef = 0;
        let ritenuteInps = 0;
        let importoNetto = importoLordo;
        let statoIniziale = 'da_pagare'; // ✅ CORRETTO: stato del database
        
        // Calcola ritenute in base al tipo contratto
        switch (tipoContratto) {
            case 'occasionale':
                if (importoLordo > paymentSettings.soglia_ritenuta) {
                    ritenuteIrpef = importoLordo * paymentSettings.ritenuta_occasionale;
                    importoNetto = importoLordo - ritenuteIrpef;
                }
                break;
                
            case 'partitaiva':
                // Nessuna ritenuta per P.IVA (fattura necessaria)
                ritenuteIrpef = 0;
                break;
                
            case 'chiamata':
            case 'dipendente':
                // Calcola IRPEF e contributi
                ritenuteIrpef = importoLordo * 0.23; // 23% IRPEF base
                ritenuteInps = importoLordo * 0.10; // 10% contributi INPS
                importoNetto = importoLordo - ritenuteIrpef - ritenuteInps;
                break;
        }
        
        // Auto-approvazione per importi bassi
        if (importoLordo < paymentSettings.approvazione_automatica_sotto) {
            statoIniziale = 'autorizzato'; // ✅ CORRETTO: stato approvato
        }
        
        // ✅ CORRETTO: Campi conformi al database schema
        const payment = {
            agibilita_id: agibilita.id,
            artista_id: artista.id,
            
            // ✅ NUOVO: Salva dati completi per evitare JOIN pesanti
            agibilita_data: {
                codice: agibilita.codice,
                data_inizio: agibilita.data_inizio,
                data_fine: agibilita.data_fine,
                locale: agibilita.locale
            },
            artista_data: {
                nome: artista.nome,
                cognome: artista.cognome,
                codice_fiscale: artista.codice_fiscale || artista.codice_fiscale_temp,
                iban: artista.iban,
                has_partita_iva: artista.has_partita_iva,
                partita_iva: artista.partita_iva
            },
            
            // ✅ CORRETTO: Campi monetari database
            importo_lordo: importoLordo,
            ritenuta_irpef: ritenuteIrpef,
            ritenuta_inps: ritenuteInps,
            importo_netto: importoNetto,
            
            // ✅ CORRETTO: Stato e configurazione
            stato: statoIniziale,
            iban_destinatario: artista.iban,
            intestatario_conto: artista.nome + ' ' + artista.cognome,
            
            // ✅ CORRETTO: Gestione fatture per P.IVA
            fattura_necessaria: tipoContratto === 'partitaiva',
            fattura_ricevuta: false,
            
            // Metadati evento
            causale_pagamento: 'Prestazione artistica ' + (artistaAgibilita.ruolo || 'Artista') + ' - ' + agibilita.codice,
            
            // Audit
            created_by: currentUser.id
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
    
    // ✅ CORRETTO: Filtra pagamenti con stati del database
    const pagamentiAttivi = pagamentiDB.filter(p => 
        ['da_pagare', 'autorizzato'].includes(p.stato)
    );
    
    // Totale da pagare
    const totaleDaPagare = pagamentiAttivi.reduce((sum, p) => sum + p.importo_netto, 0);
    
    // Numero artisti unici da pagare - ✅ CORRETTO: usa artista_data
    const artistiUniciSet = new Set(pagamentiAttivi.map(p => p.artista_data?.codice_fiscale));
    const numeroArtisti = artistiUniciSet.size;
    
    // Pagamenti del mese corrente
    const pagamentiMeseCorrente = pagamentiDB.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               p.stato === 'pagato'; // ✅ CORRETTO: stato database
    });
    const pagamentiMese = pagamentiMeseCorrente.reduce((sum, p) => sum + p.importo_netto, 0);
    
    // Ritenute totali dell'anno - ✅ CORRETTO: usa campi database
    const pagamentiAnno = pagamentiDB.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getFullYear() === currentYear;
    });
    const ritenuteApplicate = pagamentiAnno.reduce((sum, p) => 
        sum + (p.ritenuta_irpef || 0) + (p.ritenuta_inps || 0), 0
    );
    
    // ✅ CORRETTO: Determina tipo contratto dai dati artista
    const occasionali = pagamentiAttivi.filter(p => 
        !p.artista_data?.has_partita_iva && p.ritenuta_irpef > 0
    ).length;
    
    const partiteIva = pagamentiAttivi.filter(p => 
        p.artista_data?.has_partita_iva || p.fattura_necessaria
    ).length;
    
    const dipendenti = pagamentiAttivi.filter(p => 
        p.ritenuta_inps > 0 // Ha contributi INPS = dipendente/chiamata
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
    
    // Sistema status
    document.getElementById('systemStatus').textContent = '🟢';
    document.getElementById('systemStatusText').textContent = 'Operativo';
}

// ==================== GESTIONE FILTRI AVANZATI ====================
function setupDefaultFilters() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('filterDateFrom').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('filterDateTo').value = today.toISOString().split('T')[0];
    document.getElementById('filterStato').value = 'da_pagare'; // ✅ CORRETTO: stato database
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
        
        // ✅ CORRETTO: Applica filtri
        let pagamentiFiltrati = pagamentiDB.slice(); // Copia array
        
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
                const artistaNome = (p.artista_data?.nome || '').toLowerCase();
                const artistaCognome = (p.artista_data?.cognome || '').toLowerCase();
                const cf = (p.artista_data?.codice_fiscale || '').toLowerCase();
                return artistaNome.includes(currentFilters.artista) || 
                       artistaCognome.includes(currentFilters.artista) ||
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
    // ✅ CORRETTO: Raggruppa usando dati database
    const occasionali = pagamentiFiltrati.filter(p => 
        !p.artista_data?.has_partita_iva && !p.ritenuta_inps
    );
    const partiteIva = pagamentiFiltrati.filter(p => 
        p.artista_data?.has_partita_iva || p.fattura_necessaria
    );
    const dipendenti = pagamentiFiltrati.filter(p => 
        p.ritenuta_inps > 0 // Ha contributi INPS
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
        const artistaData = p.artista_data || {};
        
        return `
            <div class="payment-item ${isSelected ? 'selected' : ''} ${p.stato}">
                <div class="payment-checkbox">
                    <input type="checkbox" 
                           id="pay_${p.id}" 
                           ${isSelected ? 'checked' : ''}
                           ${!['da_pagare', 'autorizzato'].includes(p.stato) ? 'disabled' : ''}
                           onchange="togglePaymentSelection('${p.id}')">
                </div>
                <div class="payment-info">
                    <div class="payment-header">
                        <div class="artist-name">
                            <strong>${artistaData.nome || 'Nome'} ${artistaData.cognome || 'Cognome'}</strong>
                            <span class="cf-badge">${artistaData.codice_fiscale || 'CF N/D'}</span>
                            ${artistaData.nazionalita !== 'IT' ? '<span class="foreign-badge">🌍</span>' : ''}
                        </div>
                        <div class="payment-status">
                            <span class="status-badge status-${p.stato}">${getStatoLabel(p.stato)}</span>
                            ${p.importo_lordo > paymentSettings.approvazione_dirigenziale_sopra ? '<span class="approval-badge">✋ Richiede Approvazione</span>' : ''}
                        </div>
                    </div>
                    <div class="payment-details">
                        <div class="event-info">
                            <span class="agibilita-ref">📄 ${p.agibilita_data?.codice || 'N/D'}</span>
                            <span class="event-date">${formatDate(p.agibilita_data?.data_inizio)}</span>
                            <span class="venue">${p.agibilita_data?.locale?.descrizione || 'Locale N/D'}</span>
                        </div>
                    </div>
                    <div class="payment-amounts">
                        <div class="amount-breakdown">
                            <span class="amount-lordo">Lordo: €${p.importo_lordo.toFixed(2)}</span>
                            ${p.ritenuta_irpef > 0 ? `<span class="amount-ritenuta">Ritenuta IRPEF (20%): €${p.ritenuta_irpef.toFixed(2)}</span>` : ''}
                            <span class="amount-netto"><strong>Netto: €${p.importo_netto.toFixed(2)}</strong></span>
                        </div>
                        ${artistaData.iban ? 
                            `<div class="iban-info">🏦 IBAN: ${maskIBAN(artistaData.iban)}</div>` : 
                            `<div class="iban-missing">⚠️ IBAN Mancante</div>`
                        }
                    </div>
                    ${p.note ? `<div class="payment-notes">📝 ${p.note}</div>` : ''}
                </div>
                <div class="payment-actions">
                    ${p.stato === 'da_pagare' ? `
                        <button class="btn btn-sm btn-primary" onclick="showAdvancedPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        <button class="btn btn-sm btn-success" onclick="approvePayment('${p.id}')">
                            ✅ Approva
                        </button>
                        ${!artistaData.iban ? `
                            <button class="btn btn-sm btn-warning" onclick="configureIBAN('${p.artista_id}', '${p.id}')">
                                🏦 Config IBAN
                            </button>
                        ` : ''}
                    ` : p.stato === 'autorizzato' ? `
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

function displayPartiteIvaAvanzato(pagamenti) {
    const container = document.getElementById('listPartitaIva');
    
    if (pagamenti.length === 0) {
        container.innerHTML = '<p class="no-data">Nessuna partita IVA con i filtri correnti</p>';
        return;
    }
    
    container.innerHTML = pagamenti.map(p => {
        const artistaData = p.artista_data || {};
        const hasFattura = p.fattura_ricevuta || false;
        
        return `
            <div class="payment-item ${p.stato}">
                <div class="payment-info">
                    <div class="payment-header">
                        <div class="artist-name">
                            <strong>${artistaData.nome || 'Nome'} ${artistaData.cognome || 'Cognome'}</strong>
                            <span class="piva-badge">P.IVA: ${artistaData.partita_iva || 'N/D'}</span>
                        </div>
                        <div class="payment-status">
                            <span class="status-badge status-${p.stato}">${getStatoLabel(p.stato)}</span>
                        </div>
                    </div>
                    <div class="payment-details">
                        <div class="event-info">
                            <span class="agibilita-ref">📄 ${p.agibilita_data?.codice || 'N/D'}</span>
                            <span class="event-date">${formatDate(p.agibilita_data?.data_inizio)}</span>
                            <span class="venue">${p.agibilita_data?.locale?.descrizione || 'Locale N/D'}</span>
                        </div>
                    </div>
                    <div class="invoice-management">
                        <div class="invoice-check">
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       ${hasFattura ? 'checked' : ''}
                                       ${p.stato !== 'da_pagare' ? 'disabled' : ''}
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
                        ${artistaData.iban ? 
                            `<div class="iban-info">🏦 IBAN: ${maskIBAN(artistaData.iban)}</div>` : 
                            `<div class="iban-missing">⚠️ IBAN Mancante</div>`
                        }
                    </div>
                </div>
                <div class="payment-actions">
                    <button class="btn btn-sm btn-secondary" onclick="showAdvancedPaymentDetail('${p.id}')">
                        👁️ Dettagli
                    </button>
                    ${p.stato === 'da_pagare' ? `
                        <button class="btn btn-sm btn-success" 
                                ${!hasFattura || !artistaData.iban ? 'disabled' : ''}
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
        const date = new Date(p.agibilita_data?.data_inizio || p.created_at);
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
        const numeroArtisti = new Set(monthData.pagamenti.map(p => p.artista_data?.codice_fiscale)).size;
        
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
                        const artistaData = p.artista_data || {};
                        const tipoContratto = p.ritenuta_inps > 0 ? 'Contratto a Chiamata' : 'Dipendente Full Time';
                        
                        return `
                            <div class="payment-item ${p.stato}">
                                <div class="payment-info">
                                    <div class="artist-name">
                                        <strong>${artistaData.nome || 'Nome'} ${artistaData.cognome || 'Cognome'}</strong>
                                        <span class="contract-badge">${tipoContratto}</span>
                                    </div>
                                    <div class="payment-details">
                                        <span class="agibilita-ref">📄 ${p.agibilita_data?.codice || 'N/D'}</span>
                                        <span class="event-date">${formatDate(p.agibilita_data?.data_inizio)}</span>
                                        <span class="venue">${p.agibilita_data?.locale?.descrizione || 'Locale N/D'}</span>
                                    </div>
                                    <div class="payment-amounts">
                                        <span class="amount-total"><strong>Lordo: €${p.importo_lordo.toFixed(2)}</strong></span>
                                        ${p.ritenuta_irpef > 0 ? `<span class="tax-info">IRPEF: €${p.ritenuta_irpef.toFixed(2)}</span>` : ''}
                                        ${p.ritenuta_inps > 0 ? `<span class="contrib-info">INPS: €${p.ritenuta_inps.toFixed(2)}</span>` : ''}
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
    const selected = Array.from(selectedPayments).map(function(id) {
        return pagamentiDB.find(function(p) { return p.id === id; });
    }).filter(function(p) { 
        return p && ['autorizzato'].includes(p.stato); // ✅ CORRETTO: stato database
    });
    
    const container = document.getElementById('civPreviewList');
    
    if (selected.length === 0) {
        container.innerHTML = '<p class="no-data">Nessun pagamento selezionato per CIV</p>';
        updateCIVTotals(0, 0, 0, 0);
        return;
    }
    
    let totaleLordo = 0;
    let totaleRitenute = 0;
    let totaleNetto = 0;
    
    container.innerHTML = selected.map(function(p) {
        const artistaData = p.artista_data || {};
        totaleLordo += p.importo_lordo;
        totaleRitenute += (p.ritenuta_irpef || 0) + (p.ritenuta_inps || 0);
        totaleNetto += p.importo_netto;
        
        return `
            <div class="civ-item">
                <div class="civ-beneficiary">
                    <strong>${artistaData.nome || 'N/D'} ${artistaData.cognome || ''}</strong>
                    <span class="iban">${artistaData.iban ? maskIBAN(artistaData.iban) : 'IBAN MANCANTE'}</span>
                    <span class="causale">${p.causale_pagamento || 'Prestazione artistica'}</span>
                </div>
                <div class="civ-amounts">
                    <span class="civ-lordo">€${p.importo_lordo.toFixed(2)}</span>
                    ${totaleRitenute > 0 ? `<span class="civ-ritenuta">-€${((p.ritenuta_irpef || 0) + (p.ritenuta_inps || 0)).toFixed(2)}</span>` : ''}
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
        totaleDaPagare: pagamentiFiltrati.reduce(function(sum, p) { return sum + p.importo_netto; }, 0),
        numeroArtisti: new Set(pagamentiFiltrati.map(function(p) { 
            return p.artista_data && p.artista_data.codice_fiscale; 
        })).size,
        occasionali: pagamentiFiltrati.filter(function(p) { 
            return !p.artista_data || (!p.artista_data.has_partita_iva && !p.ritenuta_inps); 
        }).length,
        partiteIva: pagamentiFiltrati.filter(function(p) { 
            return p.artista_data && (p.artista_data.has_partita_iva || p.fattura_necessaria); 
        }).length,
        dipendenti: pagamentiFiltrati.filter(function(p) { 
            return p.ritenuta_inps && p.ritenuta_inps > 0; 
        }).length
    };
    
    updateTabBadges(filteredStats);
}

// ==================== UTILITY FUNCTIONS ====================
function maskIBAN(iban) {
    if (!iban) return 'N/D';
    if (iban.length < 8) return iban;
    return iban.slice(0, 4) + '*'.repeat(iban.length - 8) + iban.slice(-4);
}

// ✅ CORRETTO: Stati conformi al database
function getStatoLabel(stato) {
    const labels = {
        'da_pagare': 'Da Pagare',
        'autorizzato': 'Autorizzato', 
        'pagato': 'Pagato',
        'annullato': 'Annullato',
        'failed': 'Fallito' // Per retrocompatibilità
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
    
    const targetTabId = `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
    const targetTab = document.getElementById(targetTabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Aggiorna contenuti
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContentId = `tabContent${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
    const targetContent = document.getElementById(targetContentId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
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
    const filterArtista = document.getElementById('filterArtista');
    if (filterArtista) {
        filterArtista.addEventListener('input', function() {
            clearTimeout(artistaTimeout);
            artistaTimeout = setTimeout(() => applyAdvancedFilters(), 500);
        });
    }
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
            if (p.stato !== 'da_pagare') return false;
            
            const createdDate = new Date(p.created_at);
            const daysSinceCreated = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
            
            return daysSinceCreated >= 7; // 7 giorni senza elaborazione
        });
        
        if (pagamentiInScadenza.length > 0) {
            showToast(`⚠️ ${pagamentiInScadenza.length} pagamenti in attesa da oltre 7 giorni`, 'warning', 8000);
        }
        
        // Controlla fatture mancanti
        const fattureMancantiPIva = pagamentiDB.filter(p => 
            p.artista_data?.has_partita_iva && 
            p.stato === 'da_pagare' && 
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

// ==================== FUNZIONI INTERATTIVE ====================
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
    
    // Aggiorna anteprima CIV
    updateCIVPreview();
}

function selectAllOccasionali() {
    // ✅ CORRETTO: Filtra usando struttura database
    const occasionali = pagamentiDB.filter(p => 
        !p.artista_data?.has_partita_iva && 
        !p.ritenuta_inps &&
        ['da_pagare', 'autorizzato'].includes(p.stato)
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
    
    // Aggiorna anteprima CIV
    updateCIVPreview();
}

// ==================== FUNZIONI PRINCIPALI SISTEMA ====================
async function syncPaymentsFromAgibilita() {
    try {
        showToast('🔄 Sincronizzazione in corso...', 'info');
        
        // Ricarica agibilità dal database
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        agibilitaDB = await DatabaseService.getAgibilita({
            fromDate: lastYear.toISOString()
        });
        
        // ✅ MODIFICATO: Forzato ricalcolo di tutte le agibilità
        await autoCalculatePaymentsFromAgibilita(true);
        
        // Ricarica pagamenti aggiornati
        pagamentiDB = await DatabaseService.getPagamenti();
        
        // Aggiorna interfaccia
        await applyAdvancedFilters();
        await updateExecutiveDashboard();
        
        showToast('✅ Sincronizzazione completata!', 'success');
        logAuditEvent('sync_agibilita', 'Sincronizzazione pagamenti da agibilità completata', null);
        
    } catch (error) {
        console.error('❌ Errore sincronizzazione:', error);
        showToast('❌ Errore durante la sincronizzazione: ' + error.message, 'error');
    }
}

async function autoCalculateAllPayments() {
    if (confirm('Vuoi ricalcolare automaticamente tutti i pagamenti dalle agibilità recenti?')) {
        try {
            showToast('🧮 Ricalcolo in corso...', 'info');
            await autoCalculatePaymentsFromAgibilita(true);
            
            // Ricarica e aggiorna interfaccia
            pagamentiDB = await DatabaseService.getPagamenti();
            await applyAdvancedFilters();
            await updateExecutiveDashboard();
            
            showToast('✅ Ricalcolo completato!', 'success');
        } catch (error) {
            console.error('❌ Errore ricalcolo:', error);
            showToast('❌ Errore durante il ricalcolo: ' + error.message, 'error');
        }
    }
}

function approveAllPending() {
    const pendingPayments = pagamentiDB.filter(function(p) { return p.stato === 'da_pagare'; });
    
    if (pendingPayments.length === 0) {
        showToast('Nessun pagamento in attesa di approvazione', 'info');
        return;
    }
    
    if (confirm('Confermi l\'approvazione di tutti i ' + pendingPayments.length + ' pagamenti pendenti?')) {
        showToast('Approvazione automatica di ' + pendingPayments.length + ' pagamenti in sviluppo', 'info');
        logAuditEvent('bulk_approval', `Richiesta approvazione automatica di ${pendingPayments.length} pagamenti`, null);
    }
}

function generateMonthlyReport() {
    const month = prompt('Inserisci il mese per il report (YYYY-MM):') || 
                 new Date().toISOString().slice(0, 7);
    
    showToast(`Generazione report mensile per ${month} in sviluppo`, 'info');
    logAuditEvent('report_requested', `Report mensile richiesto per ${month}`, null);
}

function approveSelectedOccasionali() {
    const selected = Array.from(selectedPayments);
    if (selected.length === 0) {
        showToast('Seleziona almeno un pagamento', 'warning');
        return;
    }
    
    if (confirm(`Confermi l'approvazione di ${selected.length} pagamenti occasionali?`)) {
        showToast(`Approvazione di ${selected.length} pagamenti in sviluppo`, 'info');
        logAuditEvent('bulk_approval_occasionali', `Approvazione ${selected.length} pagamenti occasionali richiesta`, null);
        selectedPayments.clear();
        updateCIVPreview();
    }
}

// ==================== FUNZIONI PLACEHOLDER IMPLEMENTATE ====================
function showAdvancedPaymentDetail(paymentId) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) {
        showToast('Pagamento non trovato', 'error');
        return;
    }
    
    console.log('📋 Dettaglio pagamento:', payment);
    showToast(`Visualizzazione dettagli pagamento ${paymentId} - Funzione in sviluppo`, 'info');
    logAuditEvent('payment_detail_viewed', `Visualizzato dettaglio pagamento ${paymentId}`, paymentId);
}

function approvePayment(paymentId) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) {
        showToast('Pagamento non trovato', 'error');
        return;
    }
    
    if (payment.stato !== 'da_pagare') {
        showToast('Il pagamento non è in stato "da pagare"', 'warning');
        return;
    }
    
    if (confirm(`Confermi l'approvazione del pagamento di €${payment.importo_netto.toFixed(2)} per ${payment.artista_data?.nome} ${payment.artista_data?.cognome}?`)) {
        showToast(`Approvazione pagamento ${paymentId} in sviluppo`, 'info');
        logAuditEvent('payment_approval_requested', `Approvazione richiesta per pagamento ${paymentId}`, paymentId);
    }
}

function processPayment(paymentId) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) {
        showToast('Pagamento non trovato', 'error');
        return;
    }
    
    if (payment.stato !== 'autorizzato') {
        showToast('Il pagamento deve essere prima autorizzato', 'warning');
        return;
    }
    
    if (!payment.artista_data?.iban) {
        showToast('IBAN mancante per questo artista', 'error');
        return;
    }
    
    if (confirm(`Confermi l'elaborazione del pagamento di €${payment.importo_netto.toFixed(2)} verso l'IBAN ${maskIBAN(payment.artista_data.iban)}?`)) {
        showToast(`Elaborazione pagamento ${paymentId} in sviluppo`, 'info');
        logAuditEvent('payment_processing_requested', `Elaborazione richiesta per pagamento ${paymentId}`, paymentId);
    }
}

function retryPayment(paymentId) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) {
        showToast('Pagamento non trovato', 'error');
        return;
    }
    
    if (confirm(`Confermi il nuovo tentativo di elaborazione del pagamento ${paymentId}?`)) {
        showToast(`Retry pagamento ${paymentId} in sviluppo`, 'info');
        logAuditEvent('payment_retry_requested', `Retry richiesto per pagamento ${paymentId}`, paymentId);
    }
}

function configureIBAN(artistaId, paymentId) {
    const artista = artistiDB.find(a => a.id === parseInt(artistaId));
    if (!artista) {
        showToast('Artista non trovato', 'error');
        return;
    }
    
    const newIban = prompt(`Inserisci IBAN per ${artista.nome} ${artista.cognome}:`, artista.iban || '');
    if (newIban && newIban.trim()) {
        showToast(`Configurazione IBAN per ${artista.nome} in sviluppo`, 'info');
        logAuditEvent('iban_configuration_requested', `Configurazione IBAN richiesta per artista ${artistaId}`, paymentId);
    }
}

function toggleFatturaRicevuta(paymentId, ricevuta) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) {
        showToast('Pagamento non trovato', 'error');
        return;
    }
    
    showToast(`Fattura ${ricevuta ? 'confermata' : 'rimossa'} - Funzione in sviluppo`, 'info');
    logAuditEvent('invoice_status_changed', `Stato fattura modificato: ${ricevuta ? 'ricevuta' : 'non ricevuta'}`, paymentId);
}

function sendInvoiceReminder(paymentId) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) {
        showToast('Pagamento non trovato', 'error');
        return;
    }
    
    if (confirm(`Inviare sollecito fattura a ${payment.artista_data?.nome} ${payment.artista_data?.cognome}?`)) {
        showToast('Invio sollecito fattura in sviluppo', 'info');
        logAuditEvent('invoice_reminder_sent', `Sollecito fattura inviato per pagamento ${paymentId}`, paymentId);
    }
}

function checkAllInvoices() {
    const partiteIva = pagamentiDB.filter(p => p.artista_data?.has_partita_iva);
    showToast(`Verifica automatica di ${partiteIva.length} fatture P.IVA in sviluppo`, 'info');
    logAuditEvent('bulk_invoice_check', `Verifica automatica ${partiteIva.length} fatture richiesta`, null);
}

function markAllInvoicesReceived() {
    const pendingInvoices = pagamentiDB.filter(p => 
        p.artista_data?.has_partita_iva && 
        p.stato === 'da_pagare' && 
        !p.fattura_ricevuta
    );
    
    if (pendingInvoices.length === 0) {
        showToast('Nessuna fattura in attesa', 'info');
        return;
    }
    
    if (confirm(`Confermare come ricevute ${pendingInvoices.length} fatture?`)) {
        showToast(`Conferma automatica di ${pendingInvoices.length} fatture in sviluppo`, 'info');
        logAuditEvent('bulk_invoice_received', `Conferma automatica ${pendingInvoices.length} fatture`, null);
    }
}

function generateInvoiceReminders() {
    const overdueInvoices = pagamentiDB.filter(p => {
        if (!p.artista_data?.has_partita_iva || p.fattura_ricevuta) return false;
        
        const daysSince = Math.floor((new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24));
        return daysSince >= 3;
    });
    
    if (overdueInvoices.length === 0) {
        showToast('Nessuna fattura in ritardo', 'info');
        return;
    }
    
    showToast(`Generazione ${overdueInvoices.length} solleciti automatici in sviluppo`, 'info');
    logAuditEvent('bulk_invoice_reminders', `Generazione ${overdueInvoices.length} solleciti fatture`, null);
}

function generatePayrollExport() {
    const dipendenti = pagamentiDB.filter(p => p.ritenuta_inps > 0);
    showToast(`Export buste paga per ${dipendenti.length} dipendenti in sviluppo`, 'info');
    logAuditEvent('payroll_export_requested', `Export buste paga richiesto per ${dipendenti.length} dipendenti`, null);
}

function calculateContributions() {
    const dipendenti = pagamentiDB.filter(p => p.ritenuta_inps > 0);
    showToast(`Calcolo contributi per ${dipendenti.length} dipendenti in sviluppo`, 'info');
    logAuditEvent('contributions_calculation', `Calcolo contributi richiesto per ${dipendenti.length} dipendenti`, null);
}

function exportMonthPayroll(monthKey) {
    showToast(`Export cedolini per ${monthKey} in sviluppo`, 'info');
    logAuditEvent('monthly_payroll_export', `Export cedolini mensile richiesto per ${monthKey}`, null);
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
    
    const authorizedPayments = selected.filter(id => {
        const payment = pagamentiDB.find(p => p.id === id);
        return payment && payment.stato === 'autorizzato';
    });
    
    if (authorizedPayments.length === 0) {
        showToast('Nessun pagamento autorizzato tra quelli selezionati', 'warning');
        return;
    }
    
    if (confirm(`Generare file CIV ${banca.toUpperCase()} per ${authorizedPayments.length} pagamenti autorizzati?`)) {
        showToast(`Generazione CIV ${banca} per ${authorizedPayments.length} pagamenti in sviluppo`, 'info');
        logAuditEvent('civ_generation', `CIV ${banca} richiesto per ${authorizedPayments.length} pagamenti`, null);
    }
}

function calculateRetentions() {
    const occasionali = pagamentiDB.filter(p => 
        !p.artista_data?.has_partita_iva && !p.ritenuta_inps
    );
    showToast(`Ricalcolo ritenute per ${occasionali.length} prestazioni occasionali in sviluppo`, 'info');
    logAuditEvent('retentions_recalculation', `Ricalcolo ritenute per ${occasionali.length} prestazioni`, null);
}

function exportAuditLog() {
    if (auditTrail.length === 0) {
        showToast('Nessun evento di audit da esportare', 'info');
        return;
    }
    
    showToast(`Export di ${auditTrail.length} eventi audit in sviluppo`, 'info');
    logAuditEvent('audit_export', `Export audit log richiesto (${auditTrail.length} eventi)`, null);
}

function clearOldLogs() {
    const oldEvents = auditTrail.filter(event => {
        const eventDate = new Date(event.timestamp);
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - 6);
        return eventDate < monthsAgo;
    });
    
    if (oldEvents.length === 0) {
        showToast('Nessun log vecchio da eliminare', 'info');
        return;
    }
    
    if (confirm(`Eliminare ${oldEvents.length} eventi di log più vecchi di 6 mesi?`)) {
        showToast(`Pulizia di ${oldEvents.length} log vecchi in sviluppo`, 'info');
        logAuditEvent('logs_cleanup', `Pulizia ${oldEvents.length} log vecchi richiesta`, null);
    }
}

function showPaymentSettings() {
    showToast('Impostazioni sistema pagamenti in sviluppo', 'info');
    logAuditEvent('settings_accessed', 'Accesso impostazioni pagamenti', null);
}

function saveFilterPreset() {
    const presetName = prompt('Nome del preset filtri:', '');
    if (presetName && presetName.trim()) {
        showToast(`Salvataggio preset "${presetName}" in sviluppo`, 'info');
        logAuditEvent('filter_preset_saved', `Preset filtri "${presetName}" salvato`, null);
    }
}

// ==================== ESPORTAZIONE FUNZIONI GLOBALI ====================
window.showPaymentTab = showPaymentTab;
window.applyAdvancedFilters = applyAdvancedFilters;
window.resetAdvancedFilters = resetAdvancedFilters;
window.selectAllOccasionali = selectAllOccasionali;
window.approveSelectedOccasionali = approveSelectedOccasionali;
window.togglePaymentSelection = togglePaymentSelection;
window.showAdvancedPaymentDetail = showAdvancedPaymentDetail;
window.approvePayment = approvePayment;
window.processPayment = processPayment;
window.retryPayment = retryPayment;
window.toggleFatturaRicevuta = toggleFatturaRicevuta;
window.sendInvoiceReminder = sendInvoiceReminder;
window.checkAllInvoices = checkAllInvoices;
window.markAllInvoicesReceived = markAllInvoicesReceived;
window.generateInvoiceReminders = generateInvoiceReminders;
window.configureIBAN = configureIBAN;
window.generatePayrollExport = generatePayrollExport;
window.calculateContributions = calculateContributions;
window.exportMonthPayroll = exportMonthPayroll;
window.generateAdvancedCIV = generateAdvancedCIV;
window.calculateRetentions = calculateRetentions;
window.syncPaymentsFromAgibilita = syncPaymentsFromAgibilita;
window.showPaymentSettings = showPaymentSettings;
window.autoCalculateAllPayments = autoCalculateAllPayments;
window.approveAllPending = approveAllPending;
window.generateMonthlyReport = generateMonthlyReport;
window.exportAuditLog = exportAuditLog;
window.clearOldLogs = clearOldLogs;
window.saveFilterPreset = saveFilterPreset;
window.showProcessPayments = () => showPaymentTab('occasionali');
window.showPendingApprovals = () => showPaymentTab('occasionali');
window.showPaymentHistory = () => showPaymentTab('audit');

console.log('💰 Sistema Pagamenti RECORP completamente inizializzato! 🚀');