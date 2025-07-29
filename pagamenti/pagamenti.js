authorizedPayments.forEach(payment => {
        if (!payment.artista_data?.iban) {
            errors.push(`${payment.artista_data?.nome} ${payment.artista_data?.cognome}: IBAN mancante`);
        }
        if (payment.artista_data?.has_partita_iva && !payment.fattura_ricevuta) {
            errors.push(`${payment.artista_data?.nome} ${payment.artista_data?.cognome}: Fattura non ricevuta`);
        }
    });
    
    if (errors.length > 0) {
        alert('Errori trovati:\n' + errors.join('\n'));
        return;
    }
    
    if (confirm(`🏦 GENERAZIONE CIV BANCARIO\n\nBanca: ${banca.toUpperCase()}\nPagamenti: ${authorizedPayments.length}\nTotale: €${authorizedPayments.reduce((sum, p) => sum + p.importo_netto, 0).toFixed(2)}\n\n⚠️ ATTENZIONE: I pagamenti passeranno in stato "IN ELABORAZIONE"\n\nProcedere?`)) {
        
        try {
            showToast('🔄 Generazione CIV in corso...', 'info');
            
            // FASE 1: Genera CSV bancario
            const csvContent = await generateBankingCSV(authorizedPayments, banca);
            
            // FASE 2: Aggiorna stati pagamenti a "in_elaborazione"
            await updatePaymentsToProcessing(authorizedPayments);
            
            // FASE 3: Crea prestazioni occasionali provvisorie
            await createProvisionalOccasionaliRecords(authorizedPayments);
            
            // FASE 4: Download del CSV
            downloadCSVFile(csvContent, `CIV_${banca}_${new Date().toISOString().slice(0, 10)}.csv`);
            
            // Aggiorna interfaccia
            selectedPayments.clear();
            await applyAdvancedFilters();
            await updateExecutiveDashboard();
            
            showToast(`✅ CIV generato con successo! ${authorizedPayments.length} pagamenti in elaborazione`, 'success');
            logAuditEvent('civ_generated', `CIV ${banca} generato per ${authorizedPayments.length} pagamenti`, null);
            
        } catch (error) {
            console.error('❌ Errore generazione CIV:', error);
            showToast('❌ Errore durante la generazione del CIV: ' + error.message, 'error');
        }
    }
}

async function generateBankingCSV(payments, bankType) {
    const bankFormats = {
        'illimity': generateIllimityCSV,
        'qonto': generateQontoCSV,
        'massive_transfer': generateMassiveTransferCSV,
        'generic': generateGenericCSV
    };
    
    const formatter = bankFormats[bankType] || bankFormats.generic;
    return formatter(payments);
}

// ✅ NUOVO: Implementa il formato del template massive_transfer_template.csv
function generateMassiveTransferCSV(payments) {
    // Header basato sul template fornito
    const header = 'CODICE_CLIENTE;TIPO_OPERAZIONE;DIVISA;IMPORTO;IBAN_BENEFICIARIO;NOME_BENEFICIARIO;INDIRIZZO_BENEFICIARIO;CAUSALE;RIFERIMENTO_INTERNO;DATA_ESECUZIONE;URGENTE\n';
    
    let csvContent = header;
    
    payments.forEach(payment => {
        const iban = payment.artista_data.iban.replace(/\s/g, '');
        const importo = payment.importo_netto.toFixed(2).replace('.', ','); // Formato italiano
        const nomeBeneficiario = `${payment.artista_data.nome} ${payment.artista_data.cognome}`.substring(0, 35);
        const causale = payment.causale_pagamento.substring(0, 140).replace(/;/g, ' ');
        const dataEsecuzione = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        
        csvContent += `RECORP001;BON;EUR;${importo};${iban};${nomeBeneficiario};;${causale};PAY${payment.id};${dataEsecuzione};N\n`;
    });
    
    return csvContent;
}

// ✅ BANCHE SPECIFICHE: Illimity Bank
function generateIllimityCSV(payments) {
    // Formato CSV specifico per Illimity Bank
    const header = 'Beneficiario;IBAN;Importo;Divisa;Causale;Data_Esecuzione;Riferimento;Codice_Cliente\n';
    
    let csvContent = header;
    
    payments.forEach(payment => {
        const iban = payment.artista_data.iban.replace(/\s/g, '');
        const importo = payment.importo_netto.toFixed(2).replace('.', ','); // Formato italiano
        const beneficiario = `${payment.artista_data.nome} ${payment.artista_data.cognome}`.substring(0, 50);
        const causale = payment.causale_pagamento.substring(0, 140).replace(/;/g, ' ');
        const dataEsecuzione = new Date().toISOString().slice(0, 10);
        
        csvContent += `"${beneficiario}";${iban};${importo};EUR;"${causale}";${dataEsecuzione};PAY${payment.id};RECORP001\n`;
    });
    
    return csvContent;
}

// ✅ BANCHE SPECIFICHE: Qonto
function generateQontoCSV(payments) {
    // Formato CSV specifico per Qonto
    const header = 'recipient_name;recipient_iban;amount;currency;label;execution_date;reference;client_reference\n';
    
    let csvContent = header;
    
    payments.forEach(payment => {
        const iban = payment.artista_data.iban.replace(/\s/g, '');
        const importo = payment.importo_netto.toFixed(2); // Formato standard per Qonto
        const recipientName = `${payment.artista_data.nome} ${payment.artista_data.cognome}`.substring(0, 35);
        const label = payment.causale_pagamento.substring(0, 100).replace(/;/g, ' ');
        const executionDate = new Date().toISOString().slice(0, 10);
        
        csvContent += `"${recipientName}";${iban};${importo};EUR;"${label}";${executionDate};TRN${payment.id};RECORP_${payment.id}\n`;
    });
    
    return csvContent;
}

function generateGenericCSV(payments) {
    // Formato generico compatibile con la maggior parte delle banche
    const header = 'ID_Pagamento;Data;IBAN_Beneficiario;Nome_Beneficiario;Importo;Divisa;Causale;Codice_Fiscale;Tipo_Contratto;Riferimento_Agibilita\n';
    
    let csvContent = header;
    
    payments.forEach(payment => {
        const iban = payment.artista_data.iban.replace(/\s/g, '');
        const importo = payment.importo_netto.toFixed(2);
        const nome = `${payment.artista_data.nome} ${payment.artista_data.cognome}`;
        const causale = payment.causale_pagamento.replace(/;/g, ' ').replace(/"/g, '""');
        const tipoContratto = determineTipoContratto({has_partita_iva: payment.artista_data.has_partita_iva}, {});
        
        csvContent += `${payment.id};${new Date().toISOString().slice(0, 10)};${iban};"${nome}";${importo};EUR;"${causale}";${payment.artista_data.codice_fiscale};${tipoContratto};${payment.agibilita_data?.codice || ''}\n`;
    });
    
    return csvContent;
}

// ==================== INTEGRAZIONE COMPLETA SCHEMA DATABASE ====================

// ✅ AGGIORNA: Usa tutti i campi del schema database correttamente
async function updatePaymentsToProcessing(payments) {
    console.log('📝 Aggiornamento stati pagamenti a IN ELABORAZIONE...');
    
    for (const payment of payments) {
        try {
            // ✅ INTEGRAZIONE: Usa tutti i campi del schema database
            const updateData = {
                stato: 'in_elaborazione',
                data_elaborazione: new Date().toISOString(),
                civ_generated: true,
                civ_file_name: `CIV_${new Date().toISOString().slice(0, 10)}_${payment.id}.csv`,
                workflow_stage: 'banking_processing',
                
                // Campi audit
                updated_by: currentUser.id,
                updated_at: new Date().toISOString(),
                
                // Metadati elaborazione
                processing_bank: document.getElementById('selectBanca')?.value || 'generic',
                processing_batch_id: `BATCH_${Date.now()}`,
                
                // Flag per tracking
                necessita_conferma_movimento: true,
                movimento_atteso: true
            };
            
            await DatabaseService.updatePayment(payment.id, updateData);
            
            // Aggiorna anche l'array locale con tutti i campi
            const localPayment = pagamentiDB.find(p => p.id === payment.id);
            if (localPayment) {
                Object.assign(localPayment, updateData);
            }
            
            console.log(`✅ Pagamento ${payment.id} aggiornato a IN ELABORAZIONE con metadati completi`);
            
            // ✅ AUDIT: Log dettagliato per ogni pagamento
            logAuditEvent('payment_processing_started', 
                `Pagamento ${payment.id} (${payment.artista_data?.nome}) avviato in elaborazione bancaria`, 
                payment.id
            );
            
        } catch (error) {
            console.error(`❌ Errore aggiornamento pagamento ${payment.id}:`, error);
            throw new Error(`Errore aggiornamento pagamento ${payment.id}: ${error.message}`);
        }
    }
    
    console.log(`✅ ${payments.length} pagamenti aggiornati a IN ELABORAZIONE con schema database completo`);
}

// ✅ AGGIORNA: Crea prestazioni occasionali con schema database completo
async function createProvisionalOccasionaliRecords(payments) {
    console.log('📄 Creazione prestazioni occasionali provvisorie con schema database...');
    
    // Filtra solo i pagamenti occasionali (non P.IVA, non dipendenti)
    const occasionaliPayments = payments.filter(p => 
        !p.artista_data?.has_partita_iva && 
        !p.ritenuta_inps && 
        p.ritenuta_irpef > 0
    );
    
    if (occasionaliPayments.length === 0) {
        console.log('ℹ️ Nessuna prestazione occasionale da creare');
        return;
    }
    
    for (const payment of occasionaliPayments) {
        try {
            // ✅ INTEGRAZIONE: Usa tutti i campi del schema prestazioni_occasionali
            const prestazioneOccasionale = {
                // Dati artista (conformi a schema)
                artista_id: payment.artista_id,
                nome_artista: payment.artista_data.nome,
                cognome_artista: payment.artista_data.cognome,
                codice_fiscale: payment.artista_data.codice_fiscale,
                indirizzo_artista: payment.artista_data.indirizzo || '',
                citta_artista: payment.artista_data.citta || '',
                cap_artista: payment.artista_data.cap || '',
                telefono_artista: payment.artista_data.telefono || '',
                email_artista: payment.artista_data.email || '',
                
                // Dati prestazione
                agibilita_id: payment.agibilita_id,
                agibilita_codice: payment.agibilita_data?.codice,
                data_prestazione: payment.agibilita_data?.data_inizio,
                luogo_prestazione: payment.agibilita_data?.locale?.descrizione || '',
                descrizione_prestazione: payment.causale_pagamento,
                
                // Dati economici (conformi a schema)
                compenso_lordo: payment.importo_lordo,
                ritenuta_irpef: payment.ritenuta_irpef,
                ritenuta_inps: payment.ritenuta_inps || 0,
                rimborso_spese: payment.rimborso_spese || 0,
                compenso_netto: payment.importo_netto,
                
                // Dati bancari
                iban_beneficiario: payment.artista_data.iban,
                intestatario_conto: `${payment.artista_data.nome} ${payment.artista_data.cognome}`,
                
                // Stato e workflow
                stato: 'provvisoria', // ⚠️ IMPORTANTE: stato provvisorio
                pagamento_id: payment.id, // Link al pagamento
                tipo_documento: 'prestazione_occasionale_provvisoria',
                numero_documento: `PROV_${payment.id}_${Date.now()}`,
                
                // Metadati per conferma
                necessita_conferma: true,
                confermata: false,
                movimento_bancario_id: null, // Sarà popolato durante la conferma
                movimento_bancario_data: null,
                movimento_bancario_importo: null,
                
                // Campi audit (conformi a schema)
                created_at: new Date().toISOString(),
                created_by: currentUser.id,
                updated_at: new Date().toISOString(),
                updated_by: currentUser.id,
                
                // Metadati aggiuntivi
                workflow_stage: 'provisional_created',
                batch_id: `BATCH_${Date.now()}`,
                anno_fiscale: new Date().getFullYear(),
                
                // Note operative
                note: `Prestazione occasionale provvisoria generata automaticamente da pagamento ${payment.id}`,
                flag_exported: false,
                flag_printed: false
            };
            
            // ✅ INTEGRAZIONE: Usa funzione DatabaseService appropriata
            const savedRecord = await DatabaseService.createPrestazioneOccasionale(prestazioneOccasionale);
            
            console.log(`✅ Prestazione occasionale provvisoria creata: ${savedRecord.id} per artista ${payment.artista_data.nome}`);
            
            logAuditEvent('provisional_prestazione_created', 
                `Prestazione occasionale provvisoria ${savedRecord.id} creata per ${payment.artista_data.nome} ${payment.artista_data.cognome}`, 
                payment.id
            );
            
        } catch (error) {
            console.error(`❌ Errore creazione prestazione occasionale per pagamento ${payment.id}:`, error);
            throw new Error(`Errore creazione prestazione occasionale: ${error.message}`);
        }
    }
    
    console.log(`✅ Create ${occasionaliPayments.length} prestazioni occasionali provvisorie con schema database completo`);
}

function downloadCSVFile(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`📁 File CSV scaricato: ${filename}`);
        logAuditEvent('csv_downloaded', `File CSV bancario scaricato: ${filename}`, null);
    } else {
        showToast('❌ Download non supportato in questo browser', 'error');
    }
}

// ==================== INTERFACCIA CONFERMA MOVIMENTI BANCARI ====================

function showBankMovementInterface() {
    // Crea e mostra interfaccia per upload e conferma movimenti
    const paymentsInProcessing = pagamentiDB.filter(p => p.stato === 'in_elaborazione');
    
    if (paymentsInProcessing.length === 0) {
        showToast('ℹ️ Nessun pagamento in elaborazione da confermare', 'info');
        return;
    }
    
    // Crea modal dinamico
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>🏦 Conferma Movimenti Bancari</h3>
                <span class="close" onclick="closeBankMovementModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="bank-confirmation-section">
                    <div class="section-header">
                        <h4>📋 Pagamenti in Elaborazione</h4>
                        <span class="count-badge">${paymentsInProcessing.length} pagamenti</span>
                    </div>
                    
                    <div class="payments-summary">
                        ${paymentsInProcessing.map(p => `
                            <div class="payment-summary-item">
                                <div class="payment-info">
                                    <strong>${p.artista_data?.nome} ${p.artista_data?.cognome}</strong>
                                    <span class="payment-amount">€${p.importo_netto.toFixed(2)}</span>
                                    <span class="payment-iban">${maskIBAN(p.artista_data?.iban)}</span>
                                </div>
                                <div class="payment-status">
                                    <span class="status-badge status-in_elaborazione">In Elaborazione</span>
                                    <small>Dal ${formatDate(p.data_elaborazione)}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bank-upload-section">
                    <div class="section-header">
                        <h4>📤 Upload Movimenti Bancari</h4>
                    </div>
                    
                    <div class="upload-area">
                        <div class="upload-dropzone" id="bankFileDropzone">
                            <div class="upload-icon">📁</div>
                            <div class="upload-text">
                                <strong>Trascina qui il file movimenti bancari</strong><br>
                                <small>Formati supportati: CSV, Excel (.xlsx, .xls)</small>
                            </div>
                            <input type="file" id="bankFileInput" accept=".csv,.xlsx,.xls" style="display: none;">
                            <button class="btn btn-primary" onclick="document.getElementById('bankFileInput').click()">
                                Seleziona File
                            </button>
                        </div>
                    </div>
                    
                    <div class="upload-instructions">
                        <h5>📋 Formato File Atteso:</h5>
                        <ul>
                            <li><strong>Data:</strong> Formato YYYY-MM-DD o DD/MM/YYYY</li>
                            <li><strong>Importo:</strong> Formato numerico (es. 1234.56)</li>
                            <li><strong>IBAN Beneficiario:</strong> IBAN completo</li>
                            <li><strong>Causale:</strong> Descrizione movimento</li>
                            <li><strong>Riferimento:</strong> ID transazione (opzionale)</li>
                        </ul>
                    </div>
                </div>
                
                <div class="matching-results" id="matchingResults" style="display: none;">
                    <div class="section-header">
                        <h4>🔗 Risultati Abbinamento</h4>
                    </div>
                    <div id="matchingContent"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeBankMovementModal()">Annulla</button>
                <button class="btn btn-success" id="confirmMatchesBtn" onclick="confirmAllMatches()" disabled>
                    ✅ Conferma Abbinamenti
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup event listeners per upload
    setupBankFileUpload();
    
    logAuditEvent('bank_confirmation_opened', `Interfaccia conferma aperta per ${paymentsInProcessing.length} pagamenti`, null);
}

function setupBankFileUpload() {
    const fileInput = document.getElementById('bankFileInput');
    const dropzone = document.getElementById('bankFileDropzone');
    
    if (!fileInput || !dropzone) return;
    
    // File input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            processBankFile(e.target.files[0]);
        }
    });
    
    // Drag & drop
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            processBankFile(e.dataTransfer.files[0]);
        }
    });
}

async function processBankFile(file) {
    try {
        showToast('📤 Elaborazione file in corso...', 'info');
        
        // Leggi file
        const fileContent = await readFileContent(file);
        
        // Parse contenuto
        const movements = await parseBankMovementFile(fileContent, file.name);
        
        if (movements.length === 0) {
            showToast('❌ Nessun movimento trovato nel file', 'error');
            return;
        }
        
        console.log(`📊 ${movements.length} movimenti bancari elaborati`);
        
        // Matching con pagamenti
        const matches = await matchMovementsWithPayments(movements);
        
        // Mostra risultati
        displayMatchingResults(matches);
        
        showToast(`🔗 ${matches.confirmed.length} abbinamenti trovati su ${movements.length} movimenti`, 'success');
        
    } catch (error) {
        console.error('❌ Errore elaborazione file:', error);
        showToast('❌ Errore elaborazione file: ' + error.message, 'error');
    }
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        
        reader.onerror = function() {
            reject(new Error('Errore lettura file'));
        };
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

async function parseBankMovementFile(fileContent, fileName) {
    if (fileName.endsWith('.csv')) {
        return parseCSVMovements(fileContent);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return parseExcelMovements(fileContent);
    } else {
        throw new Error('Formato file non supportato');
    }
}

function parseCSVMovements(csvContent) {
    const lines = csvContent.split('\n');
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Mapping colonne comuni
    const columnMapping = {
        data: ['data', 'date', 'data_valuta', 'data_operazione'],
        importo: ['importo', 'amount', 'valore', 'dare', 'avere'],
        beneficiario: ['beneficiario', 'beneficiary', 'destinatario', 'nome'],
        iban: ['iban', 'iban_beneficiario', 'conto_beneficiario'],
        causale: ['causale', 'description', 'descrizione', 'motivo'],
        riferimento: ['riferimento', 'reference', 'id_transazione', 'trn']
    };
    
    const movements = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        const movement = {
            data: findColumnValue(values, header, columnMapping.data),
            importo: parseFloat(findColumnValue(values, header, columnMapping.importo)) || 0,
            beneficiario: findColumnValue(values, header, columnMapping.beneficiario),
            iban_beneficiario: findColumnValue(values, header, columnMapping.iban),
            causale: findColumnValue(values, header, columnMapping.causale),
            riferimento: findColumnValue(values, header, columnMapping.riferimento)
        };
        
        // Normalizza data
        if (movement.data) {
            movement.data = normalizeDate(movement.data);
        }
        
        // Solo movimenti in uscita con importo positivo
        if (movement.importo > 0 && movement.iban_beneficiario) {
            movements.push(movement);
        }
    }
    
    return movements;
}

function parseExcelMovements(arrayBuffer) {
    // Per Excel dovremmo usare una libreria come SheetJS
    // Per ora simula il parsing
    showToast('📊 Elaborazione file Excel in sviluppo - usa formato CSV', 'warning');
    return [];
}

function findColumnValue(values, header, possibleNames) {
    for (const name of possibleNames) {
        const index = header.findIndex(h => h.includes(name));
        if (index !== -1 && values[index]) {
            return values[index];
        }
    }
    return '';
}

function normalizeDate(dateString) {
    // Normalizza vari formati data a YYYY-MM-DD
    const formats = [
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            if (format === formats[0]) {
                return dateString; // Già nel formato corretto
            } else {
                // Converti DD/MM/YYYY o DD-MM-YYYY in YYYY-MM-DD
                return `${match[3]}-${match[2]}-${match[1]}`;
            }
        }
    }
    
    return dateString; // Restituisce originale se non riconosce il formato
}

async function matchMovementsWithPayments(movements) {
    const paymentsInProcessing = pagamentiDB.filter(p => p.stato === 'in_elaborazione');
    const matches = { confirmed: [], unmatched: [] };
    
    console.log(`🔗 Abbinamento ${movements.length} movimenti con ${paymentsInProcessing.length} pagamenti`);
    
    for (const movement of movements) {
        let bestMatch = null;
        let matchScore = 0;
        
        for (const payment of paymentsInProcessing) {
            let score = 0;
            
            // Match importo (peso: 40%)
            const importoDiff = Math.abs(movement.importo - payment.importo_netto);
            if (importoDiff < 0.01) score += 40;
            else if (importoDiff < 1) score += 20;
            
            // Match IBAN (peso: 30%)
            const movementIban = movement.iban_beneficiario?.replace(/\s/g, '').toUpperCase();
            const paymentIban = payment.artista_data?.iban?.replace(/\s/g, '').toUpperCase();
            if (movementIban && paymentIban && movementIban === paymentIban) {
                score += 30;
            }
            
            // Match riferimento/ID (peso: 20%)
            const hasReferenceMatch = movement.causale?.includes(`PAY${payment.id}`) || 
                                    movement.causale?.includes(`TRN${payment.id}`) ||
                                    movement.riferimento?.includes(payment.id.toString());
            if (hasReferenceMatch) score += 20;
            
            // Match nome beneficiario (peso: 10%)
            const nomeCompleto = `${payment.artista_data?.nome} ${payment.artista_data?.cognome}`.toLowerCase();
            if (movement.beneficiario?.toLowerCase().includes(nomeCompleto) ||
                nomeCompleto.includes(movement.beneficiario?.toLowerCase())) {
                score += 10;
            }
            
            if (score > matchScore && score >= 60) { // Soglia minima 60%
                matchScore = score;
                bestMatch = payment;
            }
        }
        
        if (bestMatch) {
            matches.confirmed.push({
                movement: movement,
                payment: bestMatch,
                score: matchScore,
                confidence: matchScore >= 80 ? 'high' : 'medium'
            });
        } else {
            matches.unmatched.push(movement);
        }
    }
    
    return matches;
}

function displayMatchingResults(matches) {
    const resultsDiv = document.getElementById('matchingResults');
    const contentDiv = document.getElementById('matchingContent');
    const confirmBtn = document.getElementById('confirmMatchesBtn');
    
    if (!resultsDiv || !contentDiv) return;
    
    resultsDiv.style.display = 'block';
    
    let html = `
        <div class="matching-summary">
            <div class="summary-card success">
                <h4>${matches.confirmed.length}</h4>
                <p>Abbinamenti Trovati</p>
            </div>
            <div class="summary-card warning">
                <h4>${matches.unmatched.length}</h4>
                <p>Movimenti Non Abbinati</p>
            </div>
        </div>
        
        <div class="matching-details">
    `;
    
    if (matches.confirmed.length > 0) {
        html += `
            <div class="confirmed-matches">
                <h5>✅ Abbinamenti Confermati</h5>
                ${matches.confirmed.map(match => `
                    <div class="match-item ${match.confidence}">
                        <div class="match-movement">
                            <strong>Movimento:</strong> €${match.movement.importo.toFixed(2)} - ${match.movement.beneficiario}<br>
                            <small>IBAN: ${maskIBAN(match.movement.iban_beneficiario)} | Data: ${match.movement.data}</small>
                        </div>
                        <div class="match-arrow">↔️</div>
                        <div class="match-payment">
                            <strong>Pagamento:</strong> ${match.payment.artista_data?.nome} ${match.payment.artista_data?.cognome}<br>
                            <small>€${match.payment.importo_netto.toFixed(2)} | ID: ${match.payment.id}</small>
                        </div>
                        <div class="match-confidence">
                            <span class="confidence-badge ${match.confidence}">${match.score}% ${match.confidence}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        confirmBtn.disabled = false;
    }
    
    if (matches.unmatched.length > 0) {
        html += `
            <div class="unmatched-movements">
                <h5>⚠️ Movimenti Non Abbinati</h5>
                ${matches.unmatched.map(movement => `
                    <div class="unmatched-item">
                        <strong>${movement.beneficiario}</strong> - €${movement.importo.toFixed(2)}<br>
                        <small>IBAN: ${maskIBAN(movement.iban_beneficiario)} | ${movement.data}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    html += '</div>';
    contentDiv.innerHTML = html;
    
    // Salva matches per conferma
    window.currentMatches = matches;
}

async function confirmAllMatches() {
    if (!window.currentMatches?.confirmed?.length) {
        showToast('❌ Nessun abbinamento da confermare', 'error');
        return;
    }
    
    const matches = window.currentMatches.confirmed;
    
    if (!confirm(`🔄 CONFERMA PAGAMENTI\n\nVerranno confermati ${matches.length} pagamenti.\nI pagamenti passeranno allo stato "PAGATO".\n\nProcedere?`)) {
        return;
    }
    
    try {
        showToast('🔄 Conferma pagamenti in corso...', 'info');
        
        let confirmed = 0;
        const errors = [];
        
        for (const match of matches) {
            try {
                // Conferma pagamento
                await confirmSinglePayment(match.payment, match.movement);
                confirmed++;
                
            } catch (error) {
                console.error(`❌ Errore conferma pagamento ${match.payment.id}:`, error);
                errors.push(`${match.payment.artista_data?.nome}: ${error.message}`);
            }
        }
        
        // Aggiorna interfaccia
        await applyAdvancedFilters();
        await updateExecutiveDashboard();
        
        // Chiudi modal
        closeBankMovementModal();
        
        if (confirmed > 0) {
            showToast(`✅ ${confirmed} pagamenti confermati con successo!`, 'success');
        }
        
        if (errors.length > 0) {
            console.error('❌ Errori durante la conferma:', errors);
            showToast(`⚠️ ${errors.length} errori durante la conferma (vedi console)`, 'warning');
        }
        
        logAuditEvent('bulk_payment_confirmation', `${confirmed} pagamenti confermati da movimenti bancari`, null);
        
    } catch (error) {
        console.error('❌ Errore conferma generale:', error);
        showToast('❌ Errore durante la conferma: ' + error.message, 'error');
    }
}

async function confirmSinglePayment(payment, movement) {
    // FASE 1: Aggiorna stato pagamento con tutti i campi database
    await DatabaseService.updatePayment(payment.id, {
        stato: 'pagato',
        data_pagamento: movement.data,
        movimento_bancario_data: movement.data,
        movimento_bancario_importo: movement.importo,
        movimento_bancario_riferimento: movement.riferimento || movement.causale,
        movimento_bancario_iban: movement.iban_beneficiario,
        conferma_automatica: true,
        confermato_da: currentUser.id,
        data_conferma: new Date().toISOString(),
        updated_by: currentUser.id
    });
    
    // FASE 2: Conferma prestazione occasionale (se esiste)
    await confirmOccasionaleRecord(payment.id, movement);
    
    // FASE 3: Aggiorna array locale
    const localPayment = pagamentiDB.find(p => p.id === payment.id);
    if (localPayment) {
        localPayment.stato = 'pagato';
        localPayment.data_pagamento = movement.data;
        localPayment.movimento_bancario_data = movement.data;
        localPayment.movimento_bancario_importo = movement.importo;
    }
    
    console.log(`✅ Pagamento ${payment.id} confermato per ${payment.artista_data?.nome}`);
}

async function confirmOccasionaleRecord(paymentId, movement) {
    try {
        // Trova la prestazione occasionale provvisoria collegata
        const provisionalRecords = await DatabaseService.getPrestazioniOccasionali({
            filters: { 
                pagamento_id: paymentId, 
                stato: 'provvisoria' 
            }
        });
        
        if (provisionalRecords && provisionalRecords.length > 0) {
            const provisionalRecord = provisionalRecords[0];
            
            // Aggiorna a definitiva con tutti i dati movimento
            await DatabaseService.updatePrestazioneOccasionale(provisionalRecord.id, {
                stato: 'definitiva',
                movimento_bancario_id: movement.id || `MVT_${Date.now()}`,
                movimento_bancario_data: movement.data,
                movimento_bancario_importo: movement.importo,
                movimento_bancario_riferimento: movement.riferimento,
                data_conferma: new Date().toISOString(),
                confermato_da: currentUser.id,
                necessita_conferma: false,
                updated_by: currentUser.id
            });
            
            console.log(`✅ Prestazione occasionale ${provisionalRecord.id} confermata come definitiva`);
            
            logAuditEvent('prestazione_confirmed', 
                `Prestazione occasionale confermata definitiva per pagamento ${paymentId}`, 
                paymentId
            );
        } else {
            console.log(`ℹ️ Nessuna prestazione occasionale provvisoria trovata per pagamento ${paymentId}`);
        }
        
    } catch (error) {
        console.error(`❌ Errore conferma prestazione occasionale per pagamento ${paymentId}:`, error);
        // Non bloccare il workflow principale per errori su prestazioni occasionali
        logAuditEvent('prestazione_confirm_error', 
            `Errore conferma prestazione occasionale: ${error.message}`, 
            paymentId
        );
    }
}

function closeBankMovementModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    
    // Cleanup
    delete window.currentMatches;
}

// ==================== GESTIONE DIPENDENTI E RIMBORSI ====================

function showMonthlyEmployeeReport() {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM
    
    // Crea modal per selezione mese e generazione report
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content extra-large">
            <div class="modal-header">
                <h3>📋 Riepilogo Mensile Dipendenti</h3>
                <span class="close" onclick="closeEmployeeReportModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="report-controls">
                    <div class="month-selector">
                        <label for="reportMonth">Seleziona Mese:</label>
                        <input type="month" id="reportMonth" value="${currentMonth}" onchange="loadMonthlyEmployeeData()">
                        <button class="btn btn-primary" onclick="loadMonthlyEmployeeData()">
                            📊 Carica Dati
                        </button>
                    </div>
                </div>
                
                <div id="monthlyEmployeeData" class="monthly-data-container">
                    <div class="loading-placeholder">
                        <p>Seleziona un mese e clicca "Carica Dati"</p>
                    </div>
                </div>
                
                <div class="report-actions" id="reportActions" style="display: none;">
                    <button class="btn btn-success" onclick="generateEmployeePDF()">
                        📄 Genera PDF per Consulente
                    </button>
                    <button class="btn btn-secondary" onclick="exportEmployeeExcel()">
                        📊 Export Excel
                    </button>
                    <button class="btn btn-warning" onclick="saveMonthlyModifications()">
                        💾 Salva Modifiche
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Carica automaticamente il mese corrente
    setTimeout(() => loadMonthlyEmployeeData(), 100);
}

async function loadMonthlyEmployeeData() {
    const selectedMonth = document.getElementById('reportMonth').value;
    if (!selectedMonth) return;
    
    try {
        showToast('📊 Caricamento dati dipendenti...', 'info');
        
        // Filtra pagamenti dipendenti del mese selezionato
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Ultimo giorno del mese
        
        const employeePayments = pagamentiDB.filter(p => {
            const paymentDate = new Date(p.agibilita_data?.data_inizio || p.created_at);
            return p.ritenuta_inps > 0 && // Solo dipendenti (hanno contributi INPS)
                   paymentDate >= startDate && 
                   paymentDate <= endDate;
        });
        
        console.log(`📋 Trovati ${employeePayments.length} pagamenti dipendenti per ${selectedMonth}`);
        
        // Raggruppa per dipendente
        const employeeGroups = groupPaymentsByEmployee(employeePayments);
        
        // Mostra interfaccia di editing
        displayEmployeeEditInterface(employeeGroups, selectedMonth);
        
        showToast(`✅ Caricati ${Object.keys(employeeGroups).length} dipendenti per ${selectedMonth}`, 'success');
        
    } catch (error) {
        console.error('❌ Errore caricamento dati dipendenti:', error);
        showToast('❌ Errore caricamento dati: ' + error.message, 'error');
    }
}

function groupPaymentsByEmployee(payments) {
    const groups = {};
    
    payments.forEach(payment => {
        const employeeKey = payment.artista_data?.codice_fiscale || payment.artista_id;
        
        if (!groups[employeeKey]) {
            groups[employeeKey] = {
                employee: payment.artista_data,
                payments: [],
                totals: {
                    lordo: 0,
                    irpef: 0,
                    inps: 0,
                    netto: 0,
                    rimborsoSpese: 0,
                    rimborsoPercentuale: 10 // Default 10% per dipendenti
                },
                settings: {
                    rimborsoPercentuale: 10, // Modificabile dall'utente
                    note: ''
                }
            };
        }
        
        groups[employeeKey].payments.push(payment);
        groups[employeeKey].totals.lordo += payment.importo_lordo;
        groups[employeeKey].totals.irpef += payment.ritenuta_irpef || 0;
        groups[employeeKey].totals.inps += payment.ritenuta_inps || 0;
        groups[employeeKey].totals.netto += payment.importo_netto;
    });
    
    // Calcola rimborsi spese per ogni dipendente
    Object.keys(groups).forEach(employeeKey => {
        const group = groups[employeeKey];
        const rimborsoPercentuale = group.settings.rimborsoPercentuale / 100;
        group.totals.rimborsoSpese = group.totals.lordo * rimborsoPercentuale;
    });
    
    return groups;
}

function displayEmployeeEditInterface(employeeGroups, selectedMonth) {
    const container = document.getElementById('monthlyEmployeeData');
    const actionsDiv = document.getElementById('reportActions');
    
    if (Object.keys(employeeGroups).length === 0) {
        container.innerHTML = '<div class="no-data">Nessun dipendente trovato per il mese selezionato</div>';
        actionsDiv.style.display = 'none';
        return;
    }
    
    let html = `
        <div class="monthly-summary">
            <h4>📅 Riepilogo ${getMonthName(selectedMonth)}</h4>
            <div class="summary-stats">
                <div class="stat-item">
                    <label>Dipendenti:</label>
                    <span>${Object.keys(employeeGroups).length}</span>
                </div>
                <div class="stat-item">
                    <label>Totale Lordo:</label>
                    <span id="totalLordo">€${Object.values(employeeGroups).reduce((sum, g) => sum + g.totals.lordo, 0).toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <label>Totale Rimborsi:</label>
                    <span id="totalRimborsi">€${Object.values(employeeGroups).reduce((sum, g) => sum + g.totals.rimborsoSpese, 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        <div class="employee-list">
    `;
    
    Object.entries(employeeGroups).forEach(([employeeKey, group]) => {
        html += `
            <div class="employee-card" data-employee="${employeeKey}">
                <div class="employee-header">
                    <div class="employee-info">
                        <h5>${group.employee?.nome || 'Nome'} ${group.employee?.cognome || 'Cognome'}</h5>
                        <span class="employee-cf">${group.employee?.codice_fiscale || 'CF N/D'}</span>
                        <span class="employee-performances">${group.payments.length} prestazioni</span>
                    </div>
                    <div class="employee-toggle">
                        <button class="btn btn-xs btn-outline" onclick="toggleEmployeeDetails('${employeeKey}')">
                            👁️ Dettagli
                        </button>
                    </div>
                </div>
                
                <div class="employee-summary">
                    <div class="summary-row">
                        <div class="summary-item">
                            <label>Lordo Totale:</label>
                            <span>€${group.totals.lordo.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <label>IRPEF:</label>
                            <span>€${group.totals.irpef.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <label>INPS:</label>
                            <span>€${group.totals.inps.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <label>Netto:</label>
                            <span>€${group.totals.netto.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="rimborso-section">
                        <div class="rimborso-input">
                            <label>Rimborso Spese (%):</label>
                            <input type="number" 
                                   value="${group.settings.rimborsoPercentuale}" 
                                   min="0" 
                                   max="50" 
                                   step="0.1"
                                   onchange="updateEmployeeReimburse('${employeeKey}', this.value)"
                                   class="rimborso-percentage">
                            <span class="rimborso-amount">= €<span id="rimborso_${employeeKey}">${group.totals.rimborsoSpese.toFixed(2)}</span></span>
                        </div>
                        
                        <div class="employee-notes">
                            <label>Note:</label>
                            <textarea placeholder="Note aggiuntive per il consulente..." 
                                      onchange="updateEmployeeNotes('${employeeKey}', this.value)"
                                      class="employee-note-text">${group.settings.note}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="employee-details" id="details_${employeeKey}" style="display: none;">
                    <h6>📋 Dettaglio Prestazioni:</h6>
                    <div class="prestazioni-list">
                        ${group.payments.map(p => `
                            <div class="prestazione-item">
                                <div class="prestazione-info">
                                    <span class="prestazione-date">${formatDate(p.agibilita_data?.data_inizio)}</span>
                                    <span class="prestazione-event">${p.agibilita_data?.codice || 'N/D'}</span>
                                    <span class="prestazione-venue">${p.agibilita_data?.locale?.descrizione || 'Locale N/D'}</span>
                                </div>
                                <div class="prestazione-amounts">
                                    <span class="prestazione-lordo">€${p.importo_lordo.toFixed(2)}</span>
                                    <span class="prestazione-netto">Netto: €${p.importo_netto.toFixed(2)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    actionsDiv.style.display = 'block';
    
    // Salva dati per successiva elaborazione
    window.currentEmployeeData = employeeGroups;
    window.currentReportMonth = selectedMonth;
}

function updateEmployeeReimburse(employeeKey, percentage) {
    if (!window.currentEmployeeData?.[employeeKey]) return;
    
    const group = window.currentEmployeeData[employeeKey];
    group.settings.rimborsoPercentuale = parseFloat(percentage) || 0;
    group.totals.rimborsoSpese = group.totals.lordo * (group.settings.rimborsoPercentuale / 100);
    
    // Aggiorna visualizzazione
    document.getElementById(`rimborso_${employeeKey}`).textContent = group.totals.rimborsoSpese.toFixed(2);
    
    // Aggiorna totali generali
    updateGeneralTotals();
    
    console.log(`💰 Rimborso aggiornato per ${group.employee?.nome}: ${percentage}% = €${group.totals.rimborsoSpese.toFixed(2)}`);
}

function updateEmployeeNotes(employeeKey, notes) {
    if (!window.currentEmployeeData?.[employeeKey]) return;
    
    window.currentEmployeeData[employeeKey].settings.note = notes;
    console.log(`📝 Note aggiornate per ${window.currentEmployeeData[employeeKey].employee?.nome}`);
}

function updateGeneralTotals() {
    if (!window.currentEmployeeData) return;
    
    const totalRimborsi = Object.values(window.currentEmployeeData)
        .reduce((sum, group) => sum + group.totals.rimborsoSpese, 0);
    
    document.getElementById('totalRimborsi').textContent = `€${totalRimborsi.toFixed(2)}`;
}

function toggleEmployeeDetails(employeeKey) {
    const detailsDiv = document.getElementById(`details_${employeeKey}`);
    if (detailsDiv) {
        detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
    }
}

async function generateEmployeePDF() {
    if (!window.currentEmployeeData || !window.currentReportMonth) {
        showToast('❌ Nessun dato da esportare', 'error');
        return;
    }
    
    try {
        showToast('📄 Generazione PDF in corso...', 'info');
        
        // Prepara dati per PDF
        const reportData = {
            month: window.currentReportMonth,
            monthName: getMonthName(window.currentReportMonth),
            employees: window.currentEmployeeData,
            generatedBy: currentUser.email,
            generatedAt: new Date().toISOString(),
            companyInfo: {
                name: 'OKL SRL - RECORP',
                address: 'Via Monte Pasubio 222/1 - 36010 Zanè (VI)',
                piva: 'P.IVA: 04433920248'
            }
        };
        
        // Genera HTML per PDF
        const htmlContent = generateEmployeePDFContent(reportData);
        
        // Simula generazione PDF (in produzione useresti jsPDF o html2pdf)
        downloadHTMLasPDF(htmlContent, `Riepilogo_Dipendenti_${window.currentReportMonth}.pdf`);
        
        showToast('✅ PDF generato con successo!', 'success');
        
        logAuditEvent('employee_pdf_generated', 
            `PDF riepilogo dipendenti generato per ${window.currentReportMonth}`, 
            null
        );
        
    } catch (error) {
        console.error('❌ Errore generazione PDF:', error);
        showToast('❌ Errore generazione PDF: ' + error.message, 'error');
    }
}

function generateEmployeePDFContent(reportData) {
    const totalLordo = Object.values(reportData.employees).reduce((sum, g) => sum + g.totals.lordo, 0);
    const totalIrpef = Object.values(reportData.employees).reduce((sum, g) => sum + g.totals.irpef, 0);
    const totalInps = Object.values(reportData.employees).reduce((sum, g) => sum + g.totals.inps, 0);
    const totalNetto = Object.values(reportData.employees).reduce((sum, g) => sum + g.totals.netto, 0);
    const totalRimborsi = Object.values(reportData.employees).reduce((sum, g) => sum + g.totals.rimborsoSpese, 0);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Riepilogo Dipendenti ${reportData.monthName}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #003366; padding-bottom: 20px; margin-bottom: 30px; }
                .company-info { text-align: center; color: #666; margin-bottom: 20px; }
                .report-title { color: #003366; font-size: 24px; margin-bottom: 10px; }
                .report-period { color: #666; font-size: 18px; }
                .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background: #f8f9fa; }
                .summary-table th, .summary-table td { border: 1px solid #ddd; padding: 12px; text-align: center; }
                .summary-table th { background: #003366; color: white; }
                .employee-section { margin-bottom: 30px; page-break-inside: avoid; }
                .employee-header { background: #e9ecef; padding: 15px; border-left: 4px solid #003366; }
                .employee-name { font-size: 18px; font-weight: bold; color: #003366; }
                .employee-details { margin: 10px 0; }
                .performance-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                .performance-table th, .performance-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .performance-table th { background: #f8f9fa; }
                .totals-row { background: #e3f2fd; font-weight: bold; }
                .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
                .rimborso-section { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
                @media print { body { margin: 0; } .page-break { page-break-before: always; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">
                    <strong>${reportData.companyInfo.name}</strong><br>
                    ${reportData.companyInfo.address}<br>
                    ${reportData.companyInfo.piva}
                </div>
                <h1 class="report-title">RIEPILOGO MENSILE DIPENDENTI</h1>
                <div class="report-period">${reportData.monthName}</div>
            </div>
            
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Dipendenti</th>
                        <th>Totale Lordo</th>
                        <th>Totale IRPEF</th>
                        <th>Totale INPS</th>
                        <th>Totale Netto</th>
                        <th>Totale Rimborsi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="totals-row">
                        <td>${Object.keys(reportData.employees).length}</td>
                        <td>€${totalLordo.toFixed(2)}</td>
                        <td>€${totalIrpef.toFixed(2)}</td>
                        <td>€${totalInps.toFixed(2)}</td>
                        <td>€${totalNetto.toFixed(2)}</td>
                        <td>€${totalRimborsi.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            
            ${Object.entries(reportData.employees).map(([key, group]) => `
                <div class="employee-section">
                    <div class="employee-header">
                        <div class="employee-name">${group.employee?.nome || 'Nome'} ${group.employee?.cognome || 'Cognome'}</div>
                        <div class="employee-details">
                            <strong>Codice Fiscale:</strong> ${group.employee?.codice_fiscale || 'N/D'}<br>
                            <strong>Prestazioni:</strong> ${group.payments.length}
                        </div>
                    </div>
                    
                    <table class="performance-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Evento</th>
                                <th>Locale</th>
                                <th>Lordo</th>
                                <th>IRPEF</th>
                                <th>INPS</th>
                                <th>Netto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.payments.map(p => `
                                <tr>
                                    <td>${formatDate(p.agibilita_data?.data_inizio)}</td>
                                    <td>${p.agibilita_data?.codice || 'N/D'}</td>
                                    <td>${p.agibilita_data?.locale?.descrizione || 'Locale N/D'}</td>
                                    <td>€${p.importo_lordo.toFixed(2)// pagamenti.js - Sistema Gestione Pagamenti RECORP Coordinato Completo

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

// Configurazione rimborsi prestazioni occasionali
const RIMBORSI_OCCASIONALI = [
    { min: 99, max: 149, importo: 40 },
    { min: 150, max: 199, importo: 60 },
    { min: 200, max: 249, importo: 80 },
    { min: 250, max: 399, importo: 120 },
    { min: 400, max: Infinity, percentuale: 0.38 } // 38% del lordo
];

// ==================== INIZIALIZZAZIONE COORDINATA FINALE ====================
document.addEventListener('DOMContentLoaded', async function() {
    // 🔥 PREVENZIONE LOOP - Solo un'inizializzazione alla volta
    if (isInitializing || isInitialized) {
        console.log('⚠️ Inizializzazione già in corso o completata, skip');
        return;
    }
    
    isInitializing = true;
    console.log('🚀 Inizializzazione sistema pagamenti coordinato...');
    
    try {
        // === STEP 1: AUTENTICAZIONE MANUALE (NO AUTO-INIT) ===
        console.log('🔐 Inizializzazione autenticazione manuale...');
        await AuthGuard.initPageProtection();
        
        // === STEP 2: VERIFICA UTENTE ===
        currentUser = await AuthGuard.getCurrentUser();
        if (!currentUser) {
            console.warn('⚠️ Utente non autenticato dopo verifica');
            return;
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
        
        // === STEP 11: INIZIALIZZA SISTEMA COORDINATO ===
        console.log('⚡ Inizializzazione sistema coordinato avanzato...');
        await initializeCoordinatedSystem();
        
        // === COMPLETAMENTO ===
        isInitialized = true;
        console.log('✅ Sistema pagamenti coordinato inizializzato con successo!');
        logAuditEvent('coordinated_system_initialized', 'Sistema pagamenti coordinato avviato completamente', null);
        
        // Nascondi loading se presente
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // ✅ NOTIFICA: Sistema pronto
        showToast('🚀 Sistema Pagamenti RECORP caricato con successo!', 'success', 5000);
        
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema pagamenti coordinato:', error);
        
        // Mostra errore user-friendly
        const errorMessage = error.message || 'Errore di inizializzazione sconosciuto';
        showToast('Errore di inizializzazione: ' + errorMessage, 'error', 10000);
        
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

// Calcola rimborso automatico per prestazione occasionale
function calculateRimborsoOccasionale(compensoLordo) {
    for (const scaglione of RIMBORSI_OCCASIONALI) {
        if (compensoLordo >= scaglione.min && compensoLordo <= scaglione.max) {
            if (scaglione.percentuale) {
                return compensoLordo * scaglione.percentuale;
            } else {
                return scaglione.importo;
            }
        }
    }
    return 0; // Sotto i 99€ nessun rimborso
}

async function calculatePaymentForArtist(agibilita, artistaAgibilita, artista) {
    try {
        const importoLordo = parseFloat(artistaAgibilita.compenso) || 0;
        
        if (importoLordo === 0) return null;
        
        const tipoContratto = determineTipoContratto(artista, artistaAgibilita);
        let ritenuteIrpef = 0;
        let ritenuteInps = 0;
        let rimborsoSpese = 0;
        let importoNetto = importoLordo;
        let statoIniziale = 'da_pagare';
        
        // Calcola ritenute e rimborsi in base al tipo contratto
        switch (tipoContratto) {
            case 'occasionale':
                if (importoLordo > paymentSettings.soglia_ritenuta) {
                    ritenuteIrpef = importoLordo * paymentSettings.ritenuta_occasionale;
                }
                // ✅ NUOVO: Calcola rimborso automatico per occasionali
                rimborsoSpese = calculateRimborsoOccasionale(importoLordo);
                importoNetto = importoLordo - ritenuteIrpef + rimborsoSpese;
                break;
                
            case 'partitaiva':
                ritenuteIrpef = 0;
                // P.IVA gestisce i propri rimborsi nella fattura
                rimborsoSpese = 0;
                importoNetto = importoLordo;
                break;
                
            case 'chiamata':
            case 'dipendente':
                ritenuteIrpef = importoLordo * 0.23;
                ritenuteInps = importoLordo * 0.10;
                // ✅ NUOVO: Rimborso spese dipendenti calcolato separatamente nel riepilogo mensile
                rimborsoSpese = 0; // Sarà gestito nel riepilogo mensile
                importoNetto = importoLordo - ritenuteIrpef - ritenuteInps;
                break;
        }
        
        if (importoLordo < paymentSettings.approvazione_automatica_sotto) {
            statoIniziale = 'autorizzato';
        }
        
        const payment = {
            agibilita_id: agibilita.id,
            artista_id: artista.id,
            
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
            
            importo_lordo: importoLordo,
            ritenuta_irpef: ritenuteIrpef,
            ritenuta_inps: ritenuteInps,
            rimborso_spese: rimborsoSpese, // ✅ NUOVO CAMPO
            importo_netto: importoNetto,
            
            stato: statoIniziale,
            iban_destinatario: artista.iban,
            intestatario_conto: artista.nome + ' ' + artista.cognome,
            
            fattura_necessaria: tipoContratto === 'partitaiva',
            fattura_ricevuta: false,
            
            causale_pagamento: 'Prestazione artistica ' + (artistaAgibilita.ruolo || 'Artista') + ' - ' + agibilita.codice,
            
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

// ==================== AGGIORNAMENTO COORDINATO DASHBOARD ====================

async function updateExecutiveDashboard() {
    try {
        console.log('📊 Aggiornamento dashboard executivo coordinato...');
        
        // ✅ PREVENZIONE LOOP: Verifica che pagamentiDB sia disponibile
        if (!pagamentiDB || !Array.isArray(pagamentiDB)) {
            console.warn('⚠️ pagamentiDB non ancora inizializzato, skip aggiornamento dashboard');
            return;
        }
        
        const stats = calculateExecutiveStats();
        
        // ✅ SICUREZZA: Verifica elementi DOM esistano
        const totaleDaPagareEl = document.getElementById('totaleDaPagare');
        const numeroArtistiEl = document.getElementById('numeroArtisti');
        const pagamentiMeseEl = document.getElementById('pagamentiMese');
        const ritenuteApplicateEl = document.getElementById('ritenuteApplicate');
        
        if (!totaleDaPagareEl || !numeroArtistiEl || !pagamentiMeseEl || !ritenuteApplicateEl) {
            console.warn('⚠️ Elementi dashboard non trovati, DOM non ancora pronto');
            return;
        }
        
        // Aggiorna contatori principali
        totaleDaPagareEl.textContent = `€${stats.totaleDaPagare.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
        numeroArtistiEl.textContent = stats.numeroArtisti;
        pagamentiMeseEl.textContent = `€${stats.pagamentiMese.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
        ritenuteApplicateEl.textContent = `€${stats.ritenuteApplicate.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
        
        // ✅ NUOVO: Gestione card pagamenti in elaborazione
        const processingCard = document.getElementById('processingCard');
        if (stats.inElaborazione > 0) {
            if (processingCard) {
                processingCard.style.display = 'block';
                const totaleInElaborazioneEl = document.getElementById('totaleInElaborazione');
                const trendElaborazioneEl = document.getElementById('trendElaborazione');
                if (totaleInElaborazioneEl) {
                    totaleInElaborazioneEl.textContent = `€${stats.totaleInElaborazione.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
                }
                if (trendElaborazioneEl) {
                    trendElaborazioneEl.textContent = `${stats.inElaborazione} pagamenti in attesa conferma`;
                }
            } else {
                // Crea card dinamicamente se non esiste
                createProcessingCard(stats);
            }
        } else if (processingCard) {
            processingCard.style.display = 'none';
        }
        
        // Aggiorna badge
        updateTabBadges(stats);
        
        // Aggiorna trend con info elaborazione
        updateTrendTexts(stats);
        
        updateRecentActivity();
        updateSystemStatus();
        
        console.log('✅ Dashboard executivo aggiornato con stats:', stats);
        
    } catch (error) {
        console.error('❌ Errore aggiornamento dashboard:', error);
        // Non rilanciare l'errore per evitare loop
    }
}

function createProcessingCard(stats) {
    const dashboardCards = document.querySelector('.dashboard-cards');
    if (!dashboardCards) return;
    
    const processingCard = document.createElement('div');
    processingCard.id = 'processingCard';
    processingCard.className = 'dashboard-card processing';
    processingCard.innerHTML = `
        <div class="card-content">
            <div class="card-info">
                <div class="card-value" id="totaleInElaborazione">€${stats.totaleInElaborazione.toLocaleString('it-IT', {minimumFractionDigits: 2})}</div>
                <div class="card-label">In Elaborazione</div>
                <div class="card-trend" id="trendElaborazione">${stats.inElaborazione} pagamenti in attesa conferma</div>
            </div>
            <div class="card-icon">🏦</div>
        </div>
        <div class="card-actions">
            <button class="btn btn-xs btn-primary" onclick="showBankMovementInterface()">
                🏦 Conferma Movimenti
            </button>
        </div>
    `;
    
    dashboardCards.appendChild(processingCard);
}

function calculateExecutiveStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // ✅ AGGIORNATO: Include nuovo stato in_elaborazione
    const pagamentiAttivi = pagamentiDB.filter(p => 
        ['da_pagare', 'autorizzato', 'in_elaborazione'].includes(p.stato)
    );
    
    // Totale da pagare (escludi quelli in elaborazione che sono già "partiti")
    const totaleDaPagare = pagamentiDB.filter(p => 
        ['da_pagare', 'autorizzato'].includes(p.stato)
    ).reduce((sum, p) => sum + p.importo_netto, 0);
    
    // Numero artisti unici da pagare/elaborare
    const artistiUniciSet = new Set(pagamentiAttivi.map(p => p.artista_data?.codice_fiscale));
    const numeroArtisti = artistiUniciSet.size;
    
    // Pagamenti del mese corrente (solo quelli effettivamente pagati)
    const pagamentiMeseCorrente = pagamentiDB.filter(p => {
        const paymentDate = new Date(p.data_pagamento || p.created_at);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               p.stato === 'pagato';
    });
    const pagamentiMese = pagamentiMeseCorrente.reduce((sum, p) => sum + p.importo_netto, 0);
    
    // Ritenute totali dell'anno
    const pagamentiAnno = pagamentiDB.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getFullYear() === currentYear;
    });
    const ritenuteApplicate = pagamentiAnno.reduce((sum, p) => 
        sum + (p.ritenuta_irpef || 0) + (p.ritenuta_inps || 0), 0
    );
    
    // Conta per tipologia (inclusi quelli in elaborazione)
    const occasionali = pagamentiAttivi.filter(p => 
        !p.artista_data?.has_partita_iva && p.ritenuta_irpef > 0
    ).length;
    
    const partiteIva = pagamentiAttivi.filter(p => 
        p.artista_data?.has_partita_iva || p.fattura_necessaria
    ).length;
    
    const dipendenti = pagamentiAttivi.filter(p => 
        p.ritenuta_inps > 0
    ).length;
    
    // ✅ NUOVO: Statistiche specifiche per stato elaborazione
    const inElaborazione = pagamentiDB.filter(p => p.stato === 'in_elaborazione').length;
    const totaleInElaborazione = pagamentiDB.filter(p => p.stato === 'in_elaborazione')
        .reduce((sum, p) => sum + p.importo_netto, 0);
    
    return {
        totaleDaPagare,
        numeroArtisti,
        pagamentiMese,
        ritenuteApplicate,
        occasionali,
        partiteIva,
        dipendenti,
        inElaborazione,
        totaleInElaborazione
    };
}

function updateTabBadges(stats) {
    document.getElementById('badgeOccasionale').textContent = stats.occasionali;
    document.getElementById('badgePartitaIva').textContent = stats.partiteIva;
    document.getElementById('badgeDipendenti').textContent = stats.dipendenti;
}

function updateTrendTexts(stats) {
    document.getElementById('trendDaPagare').textContent = 
        stats.inElaborazione > 0 ? 
        `${stats.inElaborazione} in elaborazione bancaria` : 
        'In attesa di approvazione';
    
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
                            ${p.stato === 'in_elaborazione' ? `<span class="processing-badge">🏦 Dal ${formatDate(p.data_elaborazione)}</span>` : ''}
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
                            ${p.rimborso_spese > 0 ? `<span class="amount-rimborso">💰 Rimborso Spese: €${p.rimborso_spese.toFixed(2)}</span>` : ''}
                            <span class="amount-netto"><strong>Totale Netto: €${p.importo_netto.toFixed(2)}</strong></span>
                        </div>
                        ${artistaData.iban ? 
                            `<div class="iban-info">🏦 IBAN: ${maskIBAN(artistaData.iban)}</div>` : 
                            `<div class="iban-missing">⚠️ IBAN Mancante</div>`
                        }
                        ${p.stato === 'pagato' && p.data_pagamento ? 
                            `<div class="payment-confirmed">✅ Pagato il ${formatDate(p.data_pagamento)}</div>` : ''
                        }
                        ${p.rimborso_spese > 0 ? `
                            <div class="rimborso-details">
                                <small>📋 Rimborso calcolato automaticamente secondo scaglioni aziendali</small>
                            </div>
                        ` : ''}
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
                        ${p.rimborso_spese > 0 ? `
                            <button class="btn btn-sm btn-info" onclick="showRimborsoDetails('${p.id}')">
                                💰 Rimborso
                            </button>
                        ` : ''}
                    ` : p.stato === 'autorizzato' ? `
                        <button class="btn btn-sm btn-primary" onclick="showAdvancedPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        <div class="note-elaborazione">
                            <small>✅ Pronto per elaborazione CIV</small>
                        </div>
                    ` : p.stato === 'in_elaborazione' ? `
                        <button class="btn btn-sm btn-secondary" onclick="showAdvancedPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        <div class="note-elaborazione">
                            <small>🏦 In elaborazione bancaria</small>
                        </div>
                    ` : p.stato === 'pagato' ? `
                        <button class="btn btn-sm btn-secondary" onclick="showAdvancedPaymentDetail('${p.id}')">
                            👁️ Dettagli
                        </button>
                        <div class="note-pagato">
                            <small>✅ Pagamento completato</small>
                        </div>
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
        container.innerHTML = `
            <div class="no-data">
                <p>Nessun dipendente/chiamata con i filtri correnti</p>
                <button class="btn btn-primary" onclick="showMonthlyEmployeeReport()">
                    📋 Genera Riepilogo Mensile
                </button>
            </div>
        `;
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
    
    container.innerHTML = `
        <div class="dipendenti-header">
            <h4>👔 Gestione Dipendenti e Contratti a Chiamata</h4>
            <div class="dipendenti-actions">
                <button class="btn btn-primary" onclick="showMonthlyEmployeeReport()">
                    📋 Riepilogo Mensile Completo
                </button>
                <button class="btn btn-secondary" onclick="exportAllEmployeeData()">
                    📊 Export Dati Completi
                </button>
            </div>
        </div>
        
        ${Object.entries(pagamentiPerMese).map(([monthKey, monthData]) => {
            const totaleMese = monthData.pagamenti.reduce((sum, p) => sum + p.importo_lordo, 0);
            const numeroArtisti = new Set(monthData.pagamenti.map(p => p.artista_data?.codice_fiscale)).size;
            
            return `
                <div class="month-group">
                    <div class="month-header">
                        <h5>${monthData.label}</h5>
                        <div class="month-summary">
                            <span>${numeroArtisti} artisti</span>
                            <span>Totale: €${totaleMese.toFixed(2)}</span>
                            <button class="btn btn-xs btn-primary" onclick="generateMonthReport('${monthKey}')">
                                📄 PDF Mese
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
                                            <span class="payroll-note">📋 Da elaborare in cedolino con rimborso spese variabile</span>
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
        }).join('')}
    `;
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

// ==================== FUNZIONI CORE WORKFLOW BANCARIO ====================

async function generateAdvancedCIV() {
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
    
    const authorizedPayments = selected.map(id => {
        return pagamentiDB.find(p => p.id === id);
    }).filter(p => p && p.stato === 'autorizzato');
    
    if (authorizedPayments.length === 0) {
        showToast('Nessun pagamento autorizzato tra quelli selezionati', 'warning');
        return;
    }
    
    // Verifica prerequisiti per ogni pagamento
    const errors = [];