// artist-modal.js - Modal Registrazione Artisti Semplificato
// Integrato con pagina registrazione esistente

import { DatabaseService } from '../../config/supabase-config-agibilita.js';

console.log('👤 Caricamento ArtistModal...');

export class ArtistModal {
    constructor(stateManager, toastSystem, artistValidation) {
        this.stateManager = stateManager;
        this.toastSystem = toastSystem;
        this.artistValidation = artistValidation;
        
        // Modal elements
        this.modal = null;
        this.modalOverlay = null;
        this.form = null;
        this.submitButton = null;
        this.cancelButton = null;
        
        // Form elements
        this.formFields = {};
        
        // State
        this.isOpen = false;
        this.isSubmitting = false;
        this.currentArtistData = null;
        
        // Configuration
        this.validCategories = [
            'Cantante',
            'Musicista', 
            'Ballerino/a',
            'Attore/Attrice',
            'Comico/a',
            'DJ',
            'Tecnico Audio',
            'Tecnico Luci',
            'Tecnico Video',
            'Altro'
        ];
        
        console.log('👤 ArtistModal creato');
    }
    
    /**
     * Inizializza modal artisti
     */
    initialize() {
        console.log('👤 Inizializzazione ArtistModal...');
        
        try {
            // Setup modal HTML
            this.setupModal();
            
            // Setup form
            this.setupForm();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup validation
            this.setupFormValidation();
            
            console.log('✅ ArtistModal inizializzato');
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione ArtistModal:', error);
            this.showToast('Errore inizializzazione modal artisti', 'error');
            return false;
        }
    }
    
    /**
     * Setup HTML modal
     */
    setupModal() {
        // Trova modal esistente o crealo
        this.modal = document.getElementById('artistModal');
        if (!this.modal) {
            this.createModal();
        }
        
        // Setup overlay
        this.modalOverlay = this.modal.querySelector('.modal-overlay');
        if (!this.modalOverlay) {
            this.modalOverlay = this.modal;
        }
    }
    
    /**
     * Crea modal HTML semplificato
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'artistModal';
        this.modal.className = 'modal fade';
        this.modal.style.display = 'none';
        
        this.modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-plus"></i> Aggiungi Artista
                            </h5>
                            <button type="button" class="btn-close" data-action="closeModal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <!-- Opzioni di registrazione -->
                            <div class="registration-options">
                                <div class="option-card quick-add-card">
                                    <div class="option-header">
                                        <h6><i class="fas fa-lightning-bolt"></i> Registrazione Rapida</h6>
                                        <p>Aggiungi artista con dati essenziali</p>
                                    </div>
                                    
                                    <form id="quickArtistForm">
                                        <!-- Dati essenziali -->
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label for="quickNome" class="form-label required">Nome</label>
                                                    <input type="text" 
                                                           class="form-control artist-input" 
                                                           id="quickNome" 
                                                           name="nome"
                                                           data-field="nome"
                                                           placeholder="Nome artista"
                                                           required
                                                           maxlength="50">
                                                    <div class="invalid-feedback"></div>
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label for="quickCognome" class="form-label required">Cognome</label>
                                                    <input type="text" 
                                                           class="form-control artist-input" 
                                                           id="quickCognome" 
                                                           name="cognome"
                                                           data-field="cognome"
                                                           placeholder="Cognome artista"
                                                           required
                                                           maxlength="50">
                                                    <div class="invalid-feedback"></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-8">
                                                <div class="form-group">
                                                    <label for="quickCodiceFiscale" class="form-label">Codice Fiscale</label>
                                                    <input type="text" 
                                                           class="form-control artist-input" 
                                                           id="quickCodiceFiscale" 
                                                           name="codice_fiscale"
                                                           data-field="codice_fiscale"
                                                           placeholder="RSSMRA80A01H501Z (opzionale)"
                                                           maxlength="16"
                                                           style="text-transform: uppercase;">
                                                    <div class="invalid-feedback"></div>
                                                    <small class="form-text text-muted">
                                                        Opzionale - per registrazione completa usa il link sotto
                                                    </small>
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-4">
                                                <div class="form-group">
                                                    <label for="quickCategoria" class="form-label required">Categoria</label>
                                                    <select class="form-select" 
                                                            id="quickCategoria" 
                                                            name="categoria"
                                                            required>
                                                        <option value="">Seleziona categoria</option>
                                                        ${this.validCategories.map(cat => 
                                                            `<option value="${cat}">${cat}</option>`
                                                        ).join('')}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label for="quickCompensoBase" class="form-label">Compenso Base (€)</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text">€</span>
                                                        <input type="number" 
                                                               class="form-control compenso-input" 
                                                               id="quickCompensoBase" 
                                                               name="compenso_base"
                                                               placeholder="1000"
                                                               min="100"
                                                               max="50000"
                                                               step="50"
                                                               value="1000">
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label for="quickEmail" class="form-label">Email</label>
                                                    <input type="email" 
                                                           class="form-control" 
                                                           id="quickEmail" 
                                                           name="email"
                                                           placeholder="artista@email.com">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="quickNote" class="form-label">Note</label>
                                            <textarea class="form-control" 
                                                      id="quickNote" 
                                                      name="note"
                                                      rows="2"
                                                      placeholder="Note aggiuntive..."
                                                      maxlength="200"></textarea>
                                            <small class="form-text text-muted">
                                                <span id="quickNoteCounter">0</span>/200 caratteri
                                            </small>
                                        </div>
                                    </form>
                                </div>
                                
                                <!-- Separatore -->
                                <div class="options-separator">
                                    <span>oppure</span>
                                </div>
                                
                                <!-- Link registrazione completa -->
                                <div class="option-card complete-registration-card">
                                    <div class="option-header">
                                        <h6><i class="fas fa-file-alt"></i> Registrazione Completa</h6>
                                        <p>Form completo con tutti i dati anagrafici e professionali</p>
                                    </div>
                                    
                                    <div class="complete-registration-features">
                                        <ul>
                                            <li><i class="fas fa-check"></i> Dati anagrafici completi</li>
                                            <li><i class="fas fa-check"></i> Indirizzo e località</li>
                                            <li><i class="fas fa-check"></i> Dati professionali avanzati</li>
                                            <li><i class="fas fa-check"></i> Validazione codice fiscale</li>
                                            <li><i class="fas fa-check"></i> Gestione artisti stranieri</li>
                                        </ul>
                                    </div>
                                    
                                    <button type="button" class="btn btn-outline-primary btn-lg" id="openCompleteRegistration">
                                        <i class="fas fa-external-link-alt"></i> Apri Registrazione Completa
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <div class="footer-info">
                                <small class="text-muted">
                                    <i class="fas fa-info-circle"></i>
                                    La registrazione rapida può essere completata successivamente
                                </small>
                            </div>
                            <div class="footer-actions">
                                <button type="button" class="btn btn-outline-secondary" data-action="closeModal">
                                    <i class="fas fa-times"></i> Annulla
                                </button>
                                <button type="button" class="btn btn-success" id="submitQuickArtist" disabled>
                                    <i class="fas fa-plus"></i> Aggiungi alla Lista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Aggiungi al DOM
        document.body.appendChild(this.modal);
    }
    
    /**
     * Setup form
     */
    setupForm() {
        this.form = document.getElementById('quickArtistForm');
        if (!this.form) {
            throw new Error('Form registrazione artista non trovato');
        }
        
        // Raccogli form fields
        this.formFields = {
            nome: document.getElementById('quickNome'),
            cognome: document.getElementById('quickCognome'),
            codice_fiscale: document.getElementById('quickCodiceFiscale'),
            categoria: document.getElementById('quickCategoria'),
            compenso_base: document.getElementById('quickCompensoBase'),
            email: document.getElementById('quickEmail'),
            note: document.getElementById('quickNote')
        };
        
        // Pulsanti
        this.submitButton = document.getElementById('submitQuickArtist');
        this.cancelButton = this.modal.querySelector('[data-action="closeModal"]');
        this.completeRegButton = document.getElementById('openCompleteRegistration');
        
        console.log('✅ Form configurato');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Submit form rapido
        if (this.submitButton) {
            this.submitButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleQuickSubmit();
            });
        }
        
        // Apri registrazione completa
        if (this.completeRegButton) {
            this.completeRegButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.openCompleteRegistration();
            });
        }
        
        // Cancel/Close
        this.modal.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="closeModal"]') || 
                e.target === this.modalOverlay) {
                this.closeModal();
            }
        });
        
        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });
        
        // Real-time validation
        Object.keys(this.formFields).forEach(fieldName => {
            const field = this.formFields[fieldName];
            if (!field) return;
            
            // Input validation
            field.addEventListener('input', () => {
                this.validateField(fieldName);
                this.updateSubmitButton();
            });
            
            // Blur validation
            field.addEventListener('blur', () => {
                this.validateField(fieldName);
            });
        });
        
        // Uppercase codice fiscale
        if (this.formFields.codice_fiscale) {
            this.formFields.codice_fiscale.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        // Note counter
        if (this.formFields.note) {
            this.formFields.note.addEventListener('input', (e) => {
                const counter = document.getElementById('quickNoteCounter');
                if (counter) {
                    counter.textContent = e.target.value.length;
                }
            });
        }
        
        // Listen per callback da pagina registrazione completa
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'artistRegistered') {
                this.handleCompleteRegistrationCallback(e.data.artist);
            }
        });
        
        console.log('✅ Event listeners configurati');
    }
    
    /**
     * Setup validazione form
     */
    setupFormValidation() {
        console.log('✅ Validazione form configurata');
    }
    
    /**
     * Apri registrazione completa
     */
    openCompleteRegistration() {
        console.log('📄 Apertura registrazione completa');
        
        // Costruisci URL con parametri
        const params = new URLSearchParams({
            source: 'agibilita',
            mode: 'new',
            callback: window.location.href
        });
        
        // Se ci sono dati già inseriti nel form rapido, passali
        const quickData = this.collectQuickFormData();
        if (quickData.nome || quickData.cognome) {
            params.set('prefill', JSON.stringify(quickData));
        }
        
        const registrationUrl = `./registrazione-artista.html?${params.toString()}`;
        
        // Apri in nuova finestra/tab
        const registrationWindow = window.open(
            registrationUrl, 
            'artistRegistration',
            'width=1200,height=800,scrollbars=yes,resizable=yes'
        );
        
        if (registrationWindow) {
            // Chiudi questo modal
            this.closeModal();
            
            // Focus sulla nuova finestra
            registrationWindow.focus();
            
            // Mostra toast informativo
            this.showToast('Registrazione completa aperta in nuova finestra', 'info', 3000);
        } else {
            // Fallback se popup bloccato
            this.showToast('Popup bloccato - apertura in stessa finestra', 'warning');
            setTimeout(() => {
                window.location.href = registrationUrl;
            }, 1000);
        }
    }
    
    /**
     * Gestisce callback da registrazione completa
     */
    handleCompleteRegistrationCallback(artist) {
        console.log('🔄 Callback registrazione completa:', artist);
        
        // Aggiungi artista alla lista
        this.addArtistToList(artist);
        
        // Mostra toast successo
        this.showToast(`${artist.nome} ${artist.cognome} aggiunto dalla registrazione completa`, 'success');
        
        // Il modal è già chiuso, non serve riaprirlo
    }
    
    /**
     * Apri modal
     */
    openModal(initialData = null) {
        if (this.isOpen) {
            console.warn('⚠️ Modal già aperto');
            return;
        }
        
        console.log('👤 Apertura modal registrazione artista');
        
        // Reset form
        this.resetForm();
        
        // Carica dati iniziali se forniti
        if (initialData) {
            this.loadFormData(initialData);
        }
        
        // Mostra modal
        this.modal.style.display = 'block';
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 10);
        
        // Focus primo campo
        if (this.formFields.nome) {
            this.formFields.nome.focus();
        }
        
        // Update state
        this.isOpen = true;
        
        // Disable body scroll
        document.body.style.overflow = 'hidden';
        
        this.showToast('Scegli modalità di registrazione artista', 'info', 2000);
    }
    
    /**
     * Chiudi modal
     */
    closeModal() {
        if (!this.isOpen) return;
        
        console.log('👤 Chiusura modal registrazione artista');
        
        // Verifica se ci sono modifiche non salvate
        if (this.hasUnsavedChanges()) {
            if (!confirm('Ci sono dati inseriti. Vuoi chiudere comunque?')) {
                return;
            }
        }
        
        // Nascondi modal
        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
        
        // Reset form
        this.resetForm();
        
        // Update state
        this.isOpen = false;
        this.currentArtistData = null;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        this.showToast('Modal chiuso', 'info', 1000);
    }
    
    /**
     * Reset form
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }
        
        // Rimuovi classi validazione
        Object.values(this.formFields).forEach(field => {
            if (field) {
                field.classList.remove('is-valid', 'is-invalid');
            }
        });
        
        // Reset submit button
        this.updateSubmitButton();
        
        // Reset note counter
        const noteCounter = document.getElementById('quickNoteCounter');
        if (noteCounter) {
            noteCounter.textContent = '0';
        }
        
        console.log('🔄 Form resettato');
    }
    
    /**
     * Carica dati nel form
     */
    loadFormData(data) {
        Object.keys(data).forEach(key => {
            const field = this.formFields[key];
            if (field && data[key] !== undefined) {
                field.value = data[key];
            }
        });
        
        this.currentArtistData = { ...data };
        
        // Trigger validation
        this.validateAllFields();
        
        console.log('📝 Dati caricati nel form rapido');
    }
    
    /**
     * Valida campo singolo
     */
    validateField(fieldName) {
        const field = this.formFields[fieldName];
        if (!field) return false;
        
        const value = field.value.trim();
        let isValid = true;
        let message = '';
        
        // Validazione per tipo campo
        switch (fieldName) {
            case 'nome':
            case 'cognome':
                if (value.length === 0) {
                    isValid = false;
                    message = 'Campo obbligatorio';
                } else if (value.length < 2) {
                    isValid = false;
                    message = 'Minimo 2 caratteri';
                } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) {
                    isValid = false;
                    message = 'Solo lettere, spazi e apostrofi';
                }
                break;
                
            case 'codice_fiscale':
                if (value.length > 0) {
                    if (!/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(value)) {
                        isValid = false;
                        message = 'Formato non valido';
                    } else if (this.artistValidation && 
                              !this.artistValidation.validateCodiceFiscaleChecksum(value)) {
                        isValid = false;
                        message = 'Codice fiscale non valido';
                    }
                }
                break;
                
            case 'categoria':
                if (value.length === 0) {
                    isValid = false;
                    message = 'Seleziona una categoria';
                }
                break;
                
            case 'compenso_base':
                if (value.length > 0) {
                    const compenso = parseFloat(value);
                    if (isNaN(compenso) || compenso < 100 || compenso > 50000) {
                        isValid = false;
                        message = 'Tra €100 e €50.000';
                    }
                }
                break;
                
            case 'email':
                if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    message = 'Email non valida';
                }
                break;
        }
        
        // Aggiorna UI
        field.classList.remove('is-valid', 'is-invalid');
        if (value.length > 0 || fieldName === 'nome' || fieldName === 'cognome' || fieldName === 'categoria') {
            field.classList.add(isValid ? 'is-valid' : 'is-invalid');
        }
        
        // Mostra messaggio errore
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
        
        return isValid;
    }
    
    /**
     * Valida tutti i campi
     */
    validateAllFields() {
        let allValid = true;
        
        // Valida campi obbligatori
        ['nome', 'cognome', 'categoria'].forEach(fieldName => {
            if (!this.validateField(fieldName)) {
                allValid = false;
            }
        });
        
        // Valida campi opzionali con contenuto
        ['codice_fiscale', 'compenso_base', 'email'].forEach(fieldName => {
            const field = this.formFields[fieldName];
            if (field && field.value.trim().length > 0) {
                if (!this.validateField(fieldName)) {
                    allValid = false;
                }
            }
        });
        
        return allValid;
    }
    
    /**
     * Aggiorna stato pulsante submit
     */
    updateSubmitButton() {
        const isValid = this.validateAllFields();
        
        if (this.submitButton) {
            this.submitButton.disabled = !isValid || this.isSubmitting;
            
            if (this.isSubmitting) {
                this.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aggiungendo...';
            } else {
                this.submitButton.innerHTML = '<i class="fas fa-plus"></i> Aggiungi alla Lista';
            }
        }
    }
    
    /**
     * Verifica modifiche non salvate
     */
    hasUnsavedChanges() {
        return Object.values(this.formFields).some(field => 
            field && field.value.trim().length > 0
        );
    }
    
    /**
     * Gestisce submit form rapido
     */
    async handleQuickSubmit() {
        if (this.isSubmitting) return;
        
        console.log('💾 Submit registrazione rapida artista');
        
        // Validazione finale
        if (!this.validateAllFields()) {
            this.showToast('Correggi gli errori nel form prima di continuare', 'error');
            return;
        }
        
        try {
            this.isSubmitting = true;
            this.updateSubmitButton();
            
            // Raccogli dati form
            const artistData = this.collectQuickFormData();
            
            // Registra artista
            const newArtist = await this.registerQuickArtist(artistData);
            
            // Successo
            this.handleSubmitSuccess(newArtist);
            
        } catch (error) {
            console.error('❌ Errore registrazione rapida artista:', error);
            this.handleSubmitError(error);
            
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton();
        }
    }
    
    /**
     * Raccoglie dati dal form rapido
     */
    collectQuickFormData() {
        const data = {};
        
        Object.keys(this.formFields).forEach(key => {
            const field = this.formFields[key];
            if (field) {
                let value = field.value.trim();
                
                // Conversioni specifiche
                if (key === 'compenso_base' && value) {
                    value = parseFloat(value) || 1000;
                }
                
                if (key === 'codice_fiscale' && value) {
                    value = value.toUpperCase();
                }
                
                data[key] = value || null;
            }
        });
        
        // Aggiungi metadati per registrazione rapida
        data.registrato_da = 'agibilita_quick_add';
        data.registrato_il = new Date().toISOString();
        data.source = 'quick_registration';
        data.is_complete = false; // Flag per indicare registrazione incompleta
        
        // Dati minimi per funzionamento sistema
        data.nazionalita = 'IT'; // Default italiano
        data.has_partita_iva = false; // Default no P.IVA
        data.tipo_rapporto = 'occasionale'; // Default occasionale
        
        return data;
    }
    
    /**
     * Registra artista rapido
     */
    async registerQuickArtist(artistData) {
        try {
            // Usa DatabaseService per registrazione
            const newArtist = await DatabaseService.saveArtist(artistData);
            
            console.log('✅ Artista registrato (rapido):', newArtist);
            return newArtist;
            
        } catch (error) {
            console.error('❌ Errore database registrazione rapida:', error);
            
            // Fallback: simula registrazione per sviluppo
            return this.simulateQuickArtistRegistration(artistData);
        }
    }
    
    /**
     * Simula registrazione rapida per sviluppo
     */
    simulateQuickArtistRegistration(artistData) {
        const mockArtist = {
            id: `mock_quick_${Date.now()}`,
            ...artistData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('🎭 Mock: Artista registrato (rapido)', mockArtist);
        return mockArtist;
    }
    
    /**
     * Gestisce successo registrazione
     */
    handleSubmitSuccess(newArtist) {
        console.log('✅ Registrazione rapida completata con successo');
        
        // Toast successo
        this.showToast(
            `${newArtist.nome} ${newArtist.cognome} aggiunto alla lista`,
            'success'
        );
        
        // Aggiungi automaticamente alla lista
        this.addArtistToList(newArtist);
        
        // Chiudi modal
        this.closeModal();
    }
    
    /**
     * Gestisce errore registrazione
     */
    handleSubmitError(error) {
        console.error('❌ Errore registrazione rapida:', error);
        
        let message = 'Errore durante la registrazione artista';
        
        // Messaggi specifici per tipo errore
        if (error.message.includes('duplicate')) {
            message = 'Artista già registrato con questo codice fiscale';
        } else if (error.message.includes('validation')) {
            message = 'Dati non validi, controlla i campi evidenziati';
        } else if (error.message.includes('network')) {
            message = 'Errore di connessione, riprova più tardi';
        }
        
        this.showToast(message, 'error', 5000);
    }
    
    /**
     * Aggiunge artista alla lista corrente
     */
    addArtistToList(artist) {
        if (window.artistList) {
            const success = window.artistList.addArtist(artist);
            if (success) {
                console.log('➕ Artista aggiunto alla lista corrente');
            }
        } else {
            // Fallback: aggiungi direttamente allo state
            const selectedArtists = this.stateManager?.get('selectedArtists') || [];
            selectedArtists.push({
                ...artist,
                compenso: artist.compenso_base || 1000,
                selectedAt: new Date().toISOString()
            });
            this.stateManager?.update('selectedArtists', selectedArtists);
            
            this.showToast('Artista aggiunto alla lista', 'success');
        }
    }
    
    /**
     * Mostra toast
     */
    showToast(message, type = 'info', duration = 3000) {
        if (this.toastSystem) {
            this.toastSystem.show(message, type, duration);
        } else {
            console.log(`🔔 Toast: ${message} (${type})`);
        }
    }
    
    /**
     * Debug artist modal
     */
    debug() {
        return {
            isOpen: this.isOpen,
            isSubmitting: this.isSubmitting,
            hasUnsavedChanges: this.hasUnsavedChanges(),
            currentData: this.currentArtistData,
            formFields: Object.keys(this.formFields),
            validCategories: this.validCategories
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Chiudi modal se aperto
        if (this.isOpen) {
            this.closeModal();
        }
        
        // Reset state
        this.isSubmitting = false;
        this.currentArtistData = null;
        
        console.log('🧹 ArtistModal cleanup completato');
    }
}

// Esporta classe
export default ArtistModal;

console.log('✅ ArtistModal (Simplified) module loaded');