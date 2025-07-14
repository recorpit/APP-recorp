// pagamenti.js - Sistema Gestione Pagamenti RECORP

// Import Supabase DatabaseService
import { DatabaseService } from './supabase-config.js';

// ==================== VARIABILI GLOBALI ====================
let pagamentiDB = [];
let artistiDB = [];
let selectedPayments = new Set();
let currentFilters = {
    stato: 'da_pagare',
    dateFrom: null,
    dateTo: null,
    locale: ''
};

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema pagamenti...');
    
    // Test connessione e carica dati
    const connected = await DatabaseService.testConnection();
    if (!connected) {
        showToast('⚠️ Errore connessione database', 'error');
        return;
    }
    
    // Carica dati iniziali
    await loadInitialData();
    
    // Setup filtri default
    setupDefaultFilters();
    
    // Applica filtri e mostra dati
    await applyFilters();
    
    // Setup event listeners
    setupEventListeners();
});

// ==================== CARICAMENTO DATI ====================
async function loadInitialData() {
    try {
        // Carica artisti per reference
        artistiDB = await DatabaseService.getArtists();
        console.log(`✅ ${artistiDB.length} artisti caricati`);
        
    } catch (error) {
        console.error('❌ Errore caricamento dati:', error);
        showToast('Errore nel caricamento dei dati', 'error');
    }
}

async function loadPagamenti(filters = {}) {
    try {
        pagamentiDB = await DatabaseService.getPagamenti(filters);
        console.log(`✅ ${pagamentiDB.length} pagamenti caricati`);
        
        // Aggiorna statistiche
        updateStatistics();
        
        // Aggiorna badge
        updateBadges();
        
        // Mostra pagamenti per tipo
        displayPaymentsByType();
        
    } catch (error) {
        console.error('❌ Errore caricamento pagamenti:', error);
        showToast('Errore nel caricamento dei pagamenti', 'error');
    }
}

// ==================== GESTIONE FILTRI ====================
function setupDefaultFilters() {
    // Imposta date default (ultimo mese)
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('filterDateFrom').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('filterDateTo').value = today.toISOString().split('T')[0];
    document.getElementById('filterStato').value = 'da_pagare';
}

async function applyFilters() {
    // Raccogli filtri
    currentFilters = {
        stato: document.getElementById('filterStato').value,
        dateFrom: document.getElementById('filterDateFrom').value,
        dateTo: document.getElementById('filterDateTo').value,
        locale: document.getElementById('filterLocale').value
    };
    
    // Carica pagamenti con filtri
    await loadPagamenti(currentFilters);
}

function resetFilters() {
    setupDefaultFilters();
    document.getElementById('filterLocale').value = '';
    applyFilters();
}

// ==================== AGGIORNAMENTO UI ====================
function updateStatistics() {
    // Filtra solo da pagare
    const daPagare = pagamentiDB.filter(p => p.stato === 'da_pagare');
    
    // Calcola totali
    const totaleLordo = daPagare.reduce((sum, p) => sum + (p.importo_lordo || 0), 0);
    const totaleRitenute = daPagare.reduce((sum, p) => sum + (p.ritenuta || 0), 0);
    
    // Pagamenti del mese corrente
    const currentMonth = new Date().getMonth();
    const pagamentiMese = pagamentiDB.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === currentMonth && p.stato === 'pagato';
    }).length;
    
    // Aggiorna UI
    document.getElementById('totaleDaPagare').textContent = `€${totaleLordo.toFixed(2)}`;
    document.getElementById('numeroArtisti').textContent = daPagare.length;
    document.getElementById('pagamentiMese').textContent = pagamentiMese;
    document.getElementById('ritenuteApplicate').textContent = `€${totaleRitenute.toFixed(2)}`;
}

function updateBadges() {
    const occasionali = pagamentiDB.filter(p => 
        p.stato === 'da_pagare' && p.artisti?.tipo_rapporto === 'occasionale'
    ).length;
    
    const partiteIva = pagamentiDB.filter(p => 
        p.stato === 'da_pagare' && p.artisti?.tipo_rapporto === 'partitaiva'
    ).length;
    
    const dipendenti = pagamentiDB.filter(p => 
        p.stato === 'da_pagare' && 
        (p.artisti?.tipo_rapporto === 'chiamata' || p.artisti?.tipo_rapporto === 'fulltime')
    ).length;
    
    document.getElementById('badgeOccasionale').textContent = occasionali;
    document.getElementById('badgePartitaIva').textContent = partiteIva;
    document.getElementById('badgeDipendenti').textContent = dipendenti;
}

// ==================== DISPLAY PAGAMENTI ====================
function displayPaymentsByType() {
    // Prestazioni occasionali
    const occasionali = pagamentiDB.filter(p => 
        p.artisti?.tipo_rapporto === 'occasionale'
    );
    displayOccasionali(occasionali);
    
    // Partite IVA
    const partiteIva = pagamentiDB.filter(p => 
        p.artisti?.tipo_rapporto === 'partitaiva'
    );
    displayPartiteIva(partiteIva);
    
    // Dipendenti/Chiamata
    const dipendenti = pagamentiDB.filter(p => 
        p.artisti?.tipo_rapporto === 'chiamata' || p.artisti?.tipo_rapporto === 'fulltime'
    );
    displayDipendenti(dipendenti);
    
    // Aggiorna riepilogo CIV
    updateRiepilogoCIV();
}

function displayOccasionali(pagamenti) {
    const container = document.getElementById('listOccasionale');
    
    if (pagamenti.length === 0) {
        container.innerHTML = '<p class="no-data">Nessuna prestazione occasionale da pagare</p>';
        return;
    }
    
    container.innerHTML = pagamenti.map(p => {
        const isSelected = selectedPayments.has(p.id);
        const artista = p.artisti;
        const agibilita = p.agibilita;
        
        return `
            <div class="payment-item ${isSelected ? 'selected' : ''} ${p.stato}">
                <div class="payment-checkbox">
                    <input type="checkbox" 
                           id="pay_${p.id}" 
                           ${isSelected ? 'checked' : ''}
                           ${p.stato !== 'da_pagare' ? 'disabled' : ''}
                           onchange="togglePaymentSelection('${p.id}')">
                </div>
                <div class="payment-info">
                    <div class="artist-name">
                        <strong>${artista.nome} ${artista.cognome}</strong>
                        <span class="cf-badge">${artista.codice_fiscale}</span>
                    </div>
                    <div class="payment-details">
                        <span class="agibilita-ref">📄 ${agibilita.codice} - ${formatDate(agibilita.data_inizio)}</span>
                        <span class="locale">${agibilita.locale?.descrizione || 'N/D'}</span>
                    </div>
                    <div class="payment-amounts">
                        <span class="amount-lordo">Lordo: €${p.importo_lordo.toFixed(2)}</span>
                        <span class="amount-ritenuta">Ritenuta (20%): €${p.ritenuta.toFixed(2)}</span>
                        <span class="amount-netto"><strong>Netto: €${p.importo_netto.toFixed(2)}</strong></span>
                    </div>
                </div>
                <div class="payment-actions">
                    ${p.stato === 'da_pagare' ? `
                        <button class="btn btn-sm btn-primary" onclick="showPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        <button class="btn btn-sm btn-success" onclick="processPayment('${p.id}')">
                            💳 Paga
                        </button>
                    ` : `
                        <span class="status-badge status-${p.stato}">${getStatoLabel(p.stato)}</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function displayPartiteIva(pagamenti) {
    const container = document.getElementById('listPartitaIva');
    
    if (pagamenti.length === 0) {
        container.innerHTML = '<p class="no-data">Nessuna partita IVA da pagare</p>';
        return;
    }
    
    container.innerHTML = pagamenti.map(p => {
        const artista = p.artisti;
        const agibilita = p.agibilita;
        const hasFattura = p.fattura_ricevuta || false;
        
        return `
            <div class="payment-item ${p.stato}">
                <div class="payment-info">
                    <div class="artist-name">
                        <strong>${artista.nome} ${artista.cognome}</strong>
                        <span class="piva-badge">P.IVA: ${artista.partita_iva || 'N/D'}</span>
                    </div>
                    <div class="payment-details">
                        <span class="agibilita-ref">📄 ${agibilita.codice} - ${formatDate(agibilita.data_inizio)}</span>
                        <span class="locale">${agibilita.locale?.descrizione || 'N/D'}</span>
                    </div>
                    <div class="invoice-check">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   ${hasFattura ? 'checked' : ''}
                                   ${p.stato !== 'da_pagare' ? 'disabled' : ''}
                                   onchange="toggleFatturaRicevuta('${p.id}', this.checked)">
                            <span>Fattura ricevuta</span>
                        </label>
                        ${hasFattura ? `
                            <span class="invoice-date">Ricevuta il: ${formatDate(p.data_fattura)}</span>
                        ` : ''}
                    </div>
                    <div class="payment-amounts">
                        <span class="amount-total"><strong>Importo: €${p.importo_lordo.toFixed(2)}</strong></span>
                    </div>
                </div>
                <div class="payment-actions">
                    ${p.stato === 'da_pagare' ? `
                        <button class="btn btn-sm btn-primary" onclick="showPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        <button class="btn btn-sm btn-success" 
                                ${!hasFattura ? 'disabled' : ''}
                                onclick="processPayment('${p.id}')">
                            💳 Paga
                        </button>
                    ` : `
                        <span class="status-badge status-${p.stato}">${getStatoLabel(p.stato)}</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function displayDipendenti(pagamenti) {
    const container = document.getElementById('listDipendenti');
    
    if (pagamenti.length === 0) {
        container.innerHTML = '<p class="no-data">Nessun dipendente o contratto a chiamata</p>';
        return;
    }
    
    // Raggruppa per mese
    const pagamentiPerMese = {};
    pagamenti.forEach(p => {
        const month = new Date(p.created_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' });
        if (!pagamentiPerMese[month]) {
            pagamentiPerMese[month] = [];
        }
        pagamentiPerMese[month].push(p);
    });
    
    container.innerHTML = Object.entries(pagamentiPerMese).map(([mese, pagamentiMese]) => {
        const totale = pagamentiMese.reduce((sum, p) => sum + p.importo_lordo, 0);
        
        return `
            <div class="month-group">
                <h4 class="month-header">${mese} - Totale: €${totale.toFixed(2)}</h4>
                ${pagamentiMese.map(p => {
                    const artista = p.artisti;
                    const agibilita = p.agibilita;
                    const tipoContratto = artista.tipo_rapporto === 'chiamata' ? 'Chiamata' : 'Full Time';
                    
                    return `
                        <div class="payment-item ${p.stato}">
                            <div class="payment-info">
                                <div class="artist-name">
                                    <strong>${artista.nome} ${artista.cognome}</strong>
                                    <span class="contract-badge">${tipoContratto}</span>
                                </div>
                                <div class="payment-details">
                                    <span class="agibilita-ref">📄 ${agibilita.codice} - ${formatDate(agibilita.data_inizio)}</span>
                                    <span class="locale">${agibilita.locale?.descrizione || 'N/D'}</span>
                                </div>
                                <div class="payment-amounts">
                                    <span class="amount-total"><strong>Importo: €${p.importo_lordo.toFixed(2)}</strong></span>
                                </div>
                            </div>
                            <div class="payment-status">
                                <span class="status-badge status-cedolino">Da elaborare in cedolino</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');
}

// ==================== GESTIONE SELEZIONI ====================
function togglePaymentSelection(paymentId) {
    if (selectedPayments.has(paymentId)) {
        selectedPayments.delete(paymentId);
    } else {
        selectedPayments.add(paymentId);
    }
    
    // Aggiorna UI
    const item = document.querySelector(`.payment-item input[id="pay_${paymentId}"]`);
    if (item) {
        item.closest('.payment-item').classList.toggle('selected');
    }
    
    updateRiepilogoCIV();
}

function selectAllOccasionali() {
    const occasionali = pagamentiDB.filter(p => 
        p.artisti?.tipo_rapporto === 'occasionale' && p.stato === 'da_pagare'
    );
    
    occasionali.forEach(p => {
        selectedPayments.add(p.id);
        const checkbox = document.getElementById(`pay_${p.id}`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.payment-item').classList.add('selected');
        }
    });
    
    updateRiepilogoCIV();
    showToast(`Selezionati ${occasionali.length} pagamenti`, 'success');
}

// ==================== GESTIONE PAGAMENTI ====================
async function processPayment(paymentId) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) return;
    
    // Verifica IBAN
    if (!payment.artisti?.iban) {
        showIbanModal(payment);
        return;
    }
    
    // Mostra dettaglio per conferma
    showPaymentDetail(paymentId);
}

async function paySelectedOccasionali() {
    const selected = Array.from(selectedPayments);
    if (selected.length === 0) {
        showToast('Seleziona almeno un pagamento', 'warning');
        return;
    }
    
    // Verifica IBAN per tutti
    const missingIban = selected.filter(id => {
        const payment = pagamentiDB.find(p => p.id === id);
        return !payment.artisti?.iban;
    });
    
    if (missingIban.length > 0) {
        showToast(`${missingIban.length} artisti senza IBAN. Completa i dati mancanti`, 'warning');
        return;
    }
    
    // Procedi con pagamento multiplo
    if (confirm(`Confermi il pagamento di ${selected.length} artisti?`)) {
        for (const paymentId of selected) {
            await markAsPaid(paymentId);
        }
        showToast(`${selected.length} pagamenti elaborati`, 'success');
        selectedPayments.clear();
        await applyFilters();
    }
}

async function markAsPaid(paymentId) {
    try {
        await DatabaseService.updatePagamento(paymentId, {
            stato: 'pagato',
            data_pagamento: new Date().toISOString(),
            riferimento_civ: generateCivReference()
        });
    } catch (error) {
        console.error('Errore aggiornamento pagamento:', error);
        showToast('Errore nell\'aggiornamento del pagamento', 'error');
    }
}

// ==================== FATTURE P.IVA ====================
async function toggleFatturaRicevuta(paymentId, ricevuta) {
    try {
        await DatabaseService.updatePagamento(paymentId, {
            fattura_ricevuta: ricevuta,
            data_fattura: ricevuta ? new Date().toISOString() : null
        });
        
        showToast(ricevuta ? 'Fattura registrata' : 'Fattura rimossa', 'success');
        
        // Ricarica la lista
        await applyFilters();
    } catch (error) {
        console.error('Errore aggiornamento fattura:', error);
        showToast('Errore nell\'aggiornamento', 'error');
    }
}

async function markAllInvoicesReceived() {
    const partiteIva = pagamentiDB.filter(p => 
        p.artisti?.tipo_rapporto === 'partitaiva' && 
        p.stato === 'da_pagare' &&
        !p.fattura_ricevuta
    );
    
    if (partiteIva.length === 0) {
        showToast('Nessuna fattura da confermare', 'info');
        return;
    }
    
    if (confirm(`Confermi la ricezione di ${partiteIva.length} fatture?`)) {
        for (const payment of partiteIva) {
            await toggleFatturaRicevuta(payment.id, true);
        }
    }
}

// ==================== RIEPILOGO CIV ====================
function updateRiepilogoCIV() {
    const container = document.getElementById('riepilogoCIV');
    const selected = Array.from(selectedPayments).map(id => 
        pagamentiDB.find(p => p.id === id)
    ).filter(p => p && p.stato === 'da_pagare');
    
    if (selected.length === 0) {
        container.innerHTML = '<p class="no-data">Nessun pagamento selezionato</p>';
        updateTotals(0, 0, 0);
        return;
    }
    
    let totaleLordo = 0;
    let totaleRitenute = 0;
    let totaleNetto = 0;
    
    container.innerHTML = selected.map(p => {
        totaleLordo += p.importo_lordo;
        totaleRitenute += p.ritenuta || 0;
        totaleNetto += p.importo_netto;
        
        return `
            <div class="civ-item">
                <div class="civ-beneficiary">
                    <strong>${p.artisti.nome} ${p.artisti.cognome}</strong>
                    <span class="iban">${p.artisti.iban || 'IBAN MANCANTE'}</span>
                </div>
                <div class="civ-amount">
                    €${p.importo_netto.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
    
    updateTotals(totaleLordo, totaleRitenute, totaleNetto);
}

function updateTotals(lordo, ritenute, netto) {
    document.getElementById('totaleLordo').textContent = `€${lordo.toFixed(2).replace('.', ',')}`;
    document.getElementById('totaleRitenute').textContent = `€${ritenute.toFixed(2).replace('.', ',')}`;
    document.getElementById('totaleNetto').textContent = `€${netto.toFixed(2).replace('.', ',')}`;
}

// ==================== GENERAZIONE CIV ====================
async function generateCIV() {
    const banca = document.getElementById('selectBanca').value;
    if (!banca) {
        showToast('Seleziona una banca', 'warning');
        return;
    }
    
    const selected = Array.from(selectedPayments).map(id => 
        pagamentiDB.find(p => p.id === id)
    ).filter(p => p && p.stato === 'da_pagare');
    
    if (selected.length === 0) {
        showToast('Nessun pagamento selezionato', 'warning');
        return;
    }
    
    // Genera file CIV in base alla banca
    const civContent = generateCIVContent(selected, banca);
    downloadCIV(civContent, banca);
    
    // Aggiorna stato pagamenti
    if (confirm('Vuoi segnare questi pagamenti come "in elaborazione"?')) {
        for (const payment of selected) {
            await DatabaseService.updatePagamento(payment.id, {
                stato: 'in_elaborazione',
                riferimento_civ: generateCivReference()
            });
        }
        selectedPayments.clear();
        await applyFilters();
    }
}

function generateCIVContent(payments, banca) {
    const dataValuta = new Date();
    dataValuta.setDate(dataValuta.getDate() + 2); // Valuta a 2 giorni
    
    let content = '';
    
    switch(banca) {
        case 'unicredit':
            content = generateUnicreditCIV(payments, dataValuta);
            break;
        case 'intesa':
            content = generateIntesaCIV(payments, dataValuta);
            break;
        default:
            content = generateGenericCIV(payments, dataValuta);
    }
    
    return content;
}

function generateUnicreditCIV(payments, dataValuta) {
    // Header CBI standard
    let civ = ` IB0000100000000              ${formatDateCBI(new Date())}RECORP SRL                    ${padLeft('1', 5)}              001    E      \r\n`;
    
    // Record 14 - Testa bonifico
    civ += ` 140000200000000              ${formatDateCBI(dataValuta)}50000    1234567890123                                                                        \r\n`;
    
    // Record 20 - Beneficiari
    payments.forEach((payment, index) => {
        const progressivo = padLeft((index + 1).toString(), 7);
        const importo = padLeft(Math.round(payment.importo_netto * 100).toString(), 13);
        const iban = payment.artisti.iban || '';
        const beneficiario = (payment.artisti.nome + ' ' + payment.artisti.cognome).toUpperCase().substring(0, 30);
        
        civ += ` 20${progressivo}00000000              ${importo}${padRight(iban, 27)}${padRight(beneficiario, 30)}                              \r\n`;
    });
    
    // Record 51 - Totali
    const totale = payments.reduce((sum, p) => sum + p.importo_netto, 0);
    const totaleStr = padLeft(Math.round(totale * 100).toString(), 15);
    const numeroDisp = padLeft(payments.length.toString(), 7);
    
    civ += ` 510000300000000              ${numeroDisp}${totaleStr}                                                                      \r\n`;
    
    // Record EF - Fine flusso
    civ += ` EF0000400000000              00000001                                                                                              \r\n`;
    
    return civ;
}

function generateIntesaCIV(payments, dataValuta) {
    // Formato Intesa Sanpaolo
    let civ = `0PC00001RECORP SRL                    ${formatDateDDMMYY(new Date())}${formatDateDDMMYY(dataValuta)}\r\n`;
    
    payments.forEach((payment, index) => {
        const importo = payment.importo_netto.toFixed(2).replace('.', ',');
        const iban = payment.artisti.iban || '';
        const beneficiario = (payment.artisti.nome + ' ' + payment.artisti.cognome).toUpperCase();
        const causale = `PAGAMENTO PRESTAZIONE ARTISTICA ${payment.agibilita.codice}`;
        
        civ += `1BO${padLeft((index + 1).toString(), 5)}${padRight(iban, 27)}${padLeft(importo, 15)}EUR${padRight(beneficiario, 35)}${padRight(causale, 140)}\r\n`;
    });
    
    return civ;
}

function generateGenericCIV(payments, dataValuta) {
    // Formato generico CSV
    let csv = 'Data Valuta;IBAN Beneficiario;Importo;Divisa;Beneficiario;Causale\r\n';
    
    payments.forEach(payment => {
        const importo = payment.importo_netto.toFixed(2).replace('.', ',');
        const iban = payment.artisti.iban || '';
        const beneficiario = payment.artisti.nome + ' ' + payment.artisti.cognome;
        const causale = `Pagamento prestazione artistica - Agibilità ${payment.agibilita.codice} del ${formatDate(payment.agibilita.data_inizio)}`;
        
        csv += `${formatDateDDMMYYYY(dataValuta)};${iban};${importo};EUR;${beneficiario};${causale}\r\n`;
    });
    
    return csv;
}

function downloadCIV(content, banca) {
    const blob = new Blob([content], { type: 'text/plain;charset=windows-1252' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `CIV_${banca}_${timestamp}.txt`;
    
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('File CIV generato e scaricato', 'success');
}

// ==================== EXPORT DIPENDENTI ====================
async function exportForPayroll() {
    const dipendenti = pagamentiDB.filter(p => 
        (p.artisti?.tipo_rapporto === 'chiamata' || p.artisti?.tipo_rapporto === 'fulltime') &&
        p.stato === 'da_pagare'
    );
    
    if (dipendenti.length === 0) {
        showToast('Nessun dipendente da esportare', 'info');
        return;
    }
    
    // Genera CSV per elaborazione paghe
    let csv = 'Codice Fiscale;Nome;Cognome;Tipo Contratto;Importo;Agibilità;Data Evento;Locale\r\n';
    
    dipendenti.forEach(p => {
        const tipo = p.artisti.tipo_rapporto === 'chiamata' ? 'Chiamata' : 'Full Time';
        csv += `${p.artisti.codice_fiscale};${p.artisti.nome};${p.artisti.cognome};${tipo};${p.importo_lordo.toFixed(2)};${p.agibilita.codice};${formatDate(p.agibilita.data_inizio)};${p.agibilita.locale?.descrizione || ''}\r\n`;
    });
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dipendenti_paghe_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`Esportati ${dipendenti.length} dipendenti per elaborazione paghe`, 'success');
}

// ==================== MODALI ====================
function showPaymentDetail(paymentId) {
    const payment = pagamentiDB.find(p => p.id === paymentId);
    if (!payment) return;
    
    const modal = document.getElementById('paymentDetailModal');
    const body = document.getElementById('paymentDetailBody');
    
    body.innerHTML = `
        <div class="payment-detail">
            <h3>Artista</h3>
            <p><strong>${payment.artisti.nome} ${payment.artisti.cognome}</strong></p>
            <p>CF: ${payment.artisti.codice_fiscale}</p>
            <p>Email: ${payment.artisti.email || 'N/D'}</p>
            <p>Telefono: ${payment.artisti.telefono || 'N/D'}</p>
            <p>IBAN: ${payment.artisti.iban || 'MANCANTE'}</p>
            
            <h3>Agibilità</h3>
            <p>Codice: ${payment.agibilita.codice}</p>
            <p>Data: ${formatDate(payment.agibilita.data_inizio)}</p>
            <p>Locale: ${payment.agibilita.locale?.descrizione || 'N/D'}</p>
            
            <h3>Importi</h3>
            <p>Lordo: €${payment.importo_lordo.toFixed(2)}</p>
            ${payment.ritenuta > 0 ? `<p>Ritenuta: €${payment.ritenuta.toFixed(2)}</p>` : ''}
            <p><strong>Netto da pagare: €${payment.importo_netto.toFixed(2)}</strong></p>
            
            ${payment.note ? `<h3>Note</h3><p>${payment.note}</p>` : ''}
        </div>
    `;
    
    // Aggiorna pulsante conferma
    const btnConfirm = document.getElementById('btnConfirmPayment');
    btnConfirm.onclick = () => confirmPayment(paymentId);
    btnConfirm.style.display = payment.stato === 'da_pagare' ? 'inline-block' : 'none';
    
    modal.style.display = 'block';
}

function closePaymentDetail() {
    document.getElementById('paymentDetailModal').style.display = 'none';
}

async function confirmPayment(paymentId) {
    if (!paymentId) {
        const modal = document.getElementById('paymentDetailModal');
        const body = document.getElementById('paymentDetailBody');
        // Estrai ID dal contenuto se non passato
        paymentId = body.getAttribute('data-payment-id');
    }
    
    if (confirm('Confermi il pagamento?')) {
        await markAsPaid(paymentId);
        closePaymentDetail();
        await applyFilters();
    }
}

function showIbanModal(payment) {
    const modal = document.getElementById('ibanModal');
    const message = document.getElementById('ibanModalMessage');
    
    message.textContent = `IBAN mancante per ${payment.artisti.nome} ${payment.artisti.cognome}. Inserisci l'IBAN per procedere con il pagamento.`;
    
    modal.style.display = 'block';
    modal.setAttribute('data-payment-id', payment.id);
    modal.setAttribute('data-artist-id', payment.artista_id);
}

function closeIbanModal() {
    document.getElementById('ibanModal').style.display = 'none';
    document.getElementById('tempIban').value = '';
}

async function saveTemporaryIban() {
    const modal = document.getElementById('ibanModal');
    const iban = document.getElementById('tempIban').value.trim();
    const paymentId = modal.getAttribute('data-payment-id');
    const artistId = modal.getAttribute('data-artist-id');
    
    if (!validateIBAN(iban)) {
        showToast('IBAN non valido', 'error');
        return;
    }
    
    try {
        // Aggiorna IBAN artista
        await DatabaseService.updateArtist(artistId, { iban: iban });
        
        // Ricarica dati
        await loadInitialData();
        await applyFilters();
        
        closeIbanModal();
        showToast('IBAN salvato con successo', 'success');
        
        // Procedi con il pagamento
        processPayment(paymentId);
        
    } catch (error) {
        console.error('Errore salvataggio IBAN:', error);
        showToast('Errore nel salvataggio IBAN', 'error');
    }
}

// ==================== UTILITY ====================
function showTab(tabName) {
    // Aggiorna tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.tab').classList.add('active');
    
    // Aggiorna contenuti
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    document.getElementById(tabId).classList.add('active');
}

function formatDate(dateString) {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

function formatDateDDMMYY(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return dd + mm + yy;
}

function formatDateDDMMYYYY(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatDateCBI(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return dd + mm + yy;
}

function padLeft(str, length) {
    return str.padStart(length, '0');
}

function padRight(str, length) {
    return str.padEnd(length, ' ');
}

function generateCivReference() {
    const timestamp = Date.now().toString();
    return 'CIV' + timestamp.slice(-10);
}

function getStatoLabel(stato) {
    const labels = {
        'da_pagare': 'Da pagare',
        'in_elaborazione': 'In elaborazione',
        'pagato': 'Pagato',
        'annullato': 'Annullato'
    };
    return labels[stato] || stato;
}

function validateIBAN(iban) {
    // Validazione base IBAN italiano
    const regex = /^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/;
    return regex.test(iban.toUpperCase().replace(/\s/g, ''));
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info', duration = 3000) {
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

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Chiusura modali con click esterno
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Filtro locale con debounce
    let localeTimeout;
    document.getElementById('filterLocale').addEventListener('input', function() {
        clearTimeout(localeTimeout);
        localeTimeout = setTimeout(() => applyFilters(), 500);
    });
}

// ==================== EXPORT FUNZIONI GLOBALI ====================
window.showPaymentTab = showTab;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.selectAllOccasionali = selectAllOccasionali;
window.paySelectedOccasionali = paySelectedOccasionali;
window.togglePaymentSelection = togglePaymentSelection;
window.showPaymentDetail = showPaymentDetail;
window.closePaymentDetail = closePaymentDetail;
window.confirmPayment = confirmPayment;
window.processPayment = processPayment;
window.toggleFatturaRicevuta = toggleFatturaRicevuta;
window.markAllInvoicesReceived = markAllInvoicesReceived;
window.exportForPayroll = exportForPayroll;
window.generateCIV = generateCIV;
window.closeIbanModal = closeIbanModal;
window.saveTemporaryIban = saveTemporaryIban;

console.log('💰 Sistema pagamenti inizializzato con successo!');
