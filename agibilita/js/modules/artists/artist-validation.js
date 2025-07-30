// artist-validation.js - Sistema Validazione Artisti
// Gestisce validazione completa artisti, compensi e regole business

console.log('✅ Caricamento ArtistValidation...');

export class ArtistValidation {
    constructor(stateManager, toastSystem) {
        this.stateManager = stateManager;
        this.toastSystem = toastSystem;
        
        // Validation rules
        this.rules = {
            // Regole artisti
            minArtists: 1,
            maxArtists: 20,
            
            // Regole compensi
            minCompensoPerArtist: 100,
            maxCompensoPerArtist: 50000,
            maxTotalCompenso: 100000,
            
            // Regole codice fiscale
            codiceFiscalePattern: /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/,
            
            // Regole nome/cognome
            minNameLength: 2,
            maxNameLength: 50,
            namePattern: /^[a-zA-ZÀ-ÿ\s'-]+$/,
            
            // Regole categoria
            validCategories: [
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
            ]
        };
        
        // Validation state
        this.validationResults = new Map();
        this.isValidationActive = false;
        
        // Elements
        this.validationPanel = null;
        this.validationSummary = null;
        
        console.log('✅ ArtistValidation creato');
    }
    
    /**
     * Inizializza sistema validazione
     */
    initialize() {
        console.log('✅ Inizializzazione ArtistValidation...');
        
        try {
            // Setup validation panel
            this.setupValidationPanel();
            
            // Setup real-time validation
            this.setupRealTimeValidation();
            
            // Setup validation rules
            this.loadValidationRules();
            
            // Initial validation
            this.validateCurrentState();
            
            console.log('✅ ArtistValidation inizializzato');
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione ArtistValidation:', error);
            this.showToast('Errore inizializzazione validazione artisti', 'error');
            return false;
        }
    }
    
    /**
     * Setup pannello validazione
     */
    setupValidationPanel() {
        // Trova o crea pannello validazione
        this.validationPanel = document.getElementById('artistValidationPanel');
        if (!this.validationPanel) {
            this.createValidationPanel();
        }
        
        // Setup summary
        this.validationSummary = document.getElementById('validationSummary');
        if (!this.validationSummary) {
            this.createValidationSummary();
        }
    }
    
    /**
     * Crea pannello validazione
     */
    createValidationPanel() {
        this.validationPanel = document.createElement('div');
        this.validationPanel.id = 'artistValidationPanel';
        this.validationPanel.className = 'validation-panel';
        this.validationPanel.innerHTML = `
            <div class="validation-header">
                <h5><i class="fas fa-check-circle"></i> Validazione Artisti</h5>
                <button class="btn btn-sm btn-outline-secondary" onclick="this.toggleValidationDetails()">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="validation-content">
                <div id="validationSummary"></div>
                <div id="validationDetails" class="validation-details" style="display: none;"></div>
            </div>
        `;
        
        // Inserisci nel DOM (dopo la lista artisti)
        const artistsList = document.getElementById('selectedArtistsList');
        if (artistsList && artistsList.parentNode) {
            artistsList.parentNode.insertBefore(this.validationPanel, artistsList.nextSibling);
        }
    }
    
    /**
     * Crea summary validazione
     */
    createValidationSummary() {
        this.validationSummary = document.getElementById('validationSummary');
        if (!this.validationSummary && this.validationPanel) {
            this.validationSummary = this.validationPanel.querySelector('#validationSummary');
        }
    }
    
    /**
     * Setup validazione real-time
     */
    setupRealTimeValidation() {
        // Listen per cambiamenti state
        if (this.stateManager) {
            this.stateManager.addListener('selectedArtists', (artists) => {
                this.validateArtistsList(artists);
            });
        }
        
        // Validation su input eventi
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('compenso-input')) {
                this.validateCompensoInput(e.target);
            }
        });
        
        // Validation su blur eventi
        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('artist-input')) {
                this.validateArtistInput(e.target);
            }
        }, true);
        
        console.log('✅ Validazione real-time configurata');
    }
    
    /**
     * Carica regole validazione
     */
    loadValidationRules() {
        // Regole potrebbero venire da configurazione esterna
        // Per ora usa quelle statiche
        console.log('📋 Regole validazione caricate:', Object.keys(this.rules));
    }
    
    /**
     * Valida stato corrente
     */
    validateCurrentState() {
        const selectedArtists = this.stateManager?.get('selectedArtists') || [];
        return this.validateArtistsList(selectedArtists);
    }
    
    /**
     * Valida lista artisti completa
     */
    validateArtistsList(artists) {
        console.log(`✅ Validazione lista: ${artists.length} artisti`);
        
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            artistValidations: [],
            summary: {}
        };
        
        // 1. Validazione numero artisti
        this.validateArtistsCount(artists, validation);
        
        // 2. Validazione singoli artisti
        this.validateIndividualArtists(artists, validation);
        
        // 3. Validazione compensi
        this.validateCompensos(artists, validation);
        
        // 4. Validazione business rules
        this.validateBusinessRules(artists, validation);
        
        // 5. Genera summary
        this.generateValidationSummary(validation);
        
        // 6. Aggiorna UI
        this.updateValidationUI(validation);
        
        // 7. Store risultati
        this.validationResults.set('currentValidation', validation);
        
        return validation;
    }
    
    /**
     * Valida numero artisti
     */
    validateArtistsCount(artists, validation) {
        const count = artists.length;
        
        if (count < this.rules.minArtists) {
            validation.errors.push({
                type: 'count',
                code: 'MIN_ARTISTS',
                message: `Minimo ${this.rules.minArtists} artista richiesto`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        if (count > this.rules.maxArtists) {
            validation.errors.push({
                type: 'count',
                code: 'MAX_ARTISTS',
                message: `Massimo ${this.rules.maxArtists} artisti consentiti`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        // Warning per numero alto
        if (count > 10) {
            validation.warnings.push({
                type: 'count',
                code: 'HIGH_ARTISTS_COUNT',
                message: `Numero elevato di artisti (${count})`,
                severity: 'warning'
            });
        }
    }
    
    /**
     * Valida singoli artisti
     */
    validateIndividualArtists(artists, validation) {
        artists.forEach((artist, index) => {
            const artistValidation = this.validateSingleArtist(artist, index);
            validation.artistValidations.push(artistValidation);
            
            // Aggiungi errori/warning globali
            if (!artistValidation.isValid) {
                validation.isValid = false;
                validation.errors.push(...artistValidation.errors);
            }
            
            validation.warnings.push(...artistValidation.warnings);
        });
    }
    
    /**
     * Valida singolo artista
     */
    validateSingleArtist(artist, index) {
        const validation = {
            artistIndex: index,
            artistId: artist.id,
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // 1. Valida nome
        this.validateArtistName(artist, validation);
        
        // 2. Valida codice fiscale
        this.validateCodiceFiscale(artist, validation);
        
        // 3. Valida categoria
        this.validateCategory(artist, validation);
        
        // 4. Valida compenso
        this.validateArtistCompenso(artist, validation);
        
        // 5. Valida dati obbligatori
        this.validateRequiredFields(artist, validation);
        
        return validation;
    }
    
    /**
     * Valida nome artista
     */
    validateArtistName(artist, validation) {
        // Nome
        if (!artist.nome || artist.nome.trim().length < this.rules.minNameLength) {
            validation.errors.push({
                field: 'nome',
                code: 'INVALID_NAME',
                message: `Nome troppo corto (min ${this.rules.minNameLength} caratteri)`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        if (artist.nome && artist.nome.length > this.rules.maxNameLength) {
            validation.errors.push({
                field: 'nome',
                code: 'NAME_TOO_LONG',
                message: `Nome troppo lungo (max ${this.rules.maxNameLength} caratteri)`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        if (artist.nome && !this.rules.namePattern.test(artist.nome)) {
            validation.errors.push({
                field: 'nome',
                code: 'INVALID_NAME_CHARS',
                message: 'Nome contiene caratteri non validi',
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        // Cognome
        if (!artist.cognome || artist.cognome.trim().length < this.rules.minNameLength) {
            validation.errors.push({
                field: 'cognome',
                code: 'INVALID_SURNAME',
                message: `Cognome troppo corto (min ${this.rules.minNameLength} caratteri)`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        if (artist.cognome && artist.cognome.length > this.rules.maxNameLength) {
            validation.errors.push({
                field: 'cognome',
                code: 'SURNAME_TOO_LONG',
                message: `Cognome troppo lungo (max ${this.rules.maxNameLength} caratteri)`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        if (artist.cognome && !this.rules.namePattern.test(artist.cognome)) {
            validation.errors.push({
                field: 'cognome',
                code: 'INVALID_SURNAME_CHARS',
                message: 'Cognome contiene caratteri non validi',
                severity: 'error'
            });
            validation.isValid = false;
        }
    }
    
    /**
     * Valida codice fiscale
     */
    validateCodiceFiscale(artist, validation) {
        if (!artist.codice_fiscale) {
            validation.errors.push({
                field: 'codice_fiscale',
                code: 'MISSING_CF',
                message: 'Codice fiscale obbligatorio',
                severity: 'error'
            });
            validation.isValid = false;
            return;
        }
        
        const cf = artist.codice_fiscale.toUpperCase().trim();
        
        // Verifica pattern base
        if (!this.rules.codiceFiscalePattern.test(cf)) {
            validation.errors.push({
                field: 'codice_fiscale',
                code: 'INVALID_CF_FORMAT',
                message: 'Formato codice fiscale non valido',
                severity: 'error'
            });
            validation.isValid = false;
            return;
        }
        
        // Verifica check digit (algoritmo CF)
        if (!this.validateCodiceFiscaleChecksum(cf)) {
            validation.errors.push({
                field: 'codice_fiscale',
                code: 'INVALID_CF_CHECKSUM',
                message: 'Codice fiscale non valido (checksum errato)',
                severity: 'error'
            });
            validation.isValid = false;
        }
    }
    
    /**
     * Valida checksum codice fiscale
     */
    validateCodiceFiscaleChecksum(cf) {
        const oddChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const oddValues = [1,0,5,7,9,13,15,17,19,21,2,4,18,20,11,3,6,8,12,14,16,10,22,25,24,23];
        const evenValues = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];
        
        let sum = 0;
        
        for (let i = 0; i < 15; i++) {
            const char = cf[i];
            const isDigit = /\d/.test(char);
            const isOddPosition = (i + 1) % 2 === 1;
            
            if (isDigit) {
                const digit = parseInt(char);
                sum += isOddPosition ? oddValues[digit] : digit;
            } else {
                const charIndex = oddChars.indexOf(char);
                sum += isOddPosition ? oddValues[charIndex] : evenValues[charIndex];
            }
        }
        
        const expectedCheck = oddChars[sum % 26];
        return cf[15] === expectedCheck;
    }
    
    /**
     * Valida categoria artista
     */
    validateCategory(artist, validation) {
        if (!artist.categoria) {
            validation.warnings.push({
                field: 'categoria',
                code: 'MISSING_CATEGORY',
                message: 'Categoria non specificata',
                severity: 'warning'
            });
            return;
        }
        
        if (!this.rules.validCategories.includes(artist.categoria)) {
            validation.warnings.push({
                field: 'categoria',
                code: 'UNKNOWN_CATEGORY',
                message: `Categoria "${artist.categoria}" non standard`,
                severity: 'warning'
            });
        }
    }
    
    /**
     * Valida compenso artista
     */
    validateArtistCompenso(artist, validation) {
        const compenso = parseFloat(artist.compenso) || 0;
        
        if (compenso < this.rules.minCompensoPerArtist) {
            validation.errors.push({
                field: 'compenso',
                code: 'COMPENSO_TOO_LOW',
                message: `Compenso troppo basso (min €${this.rules.minCompensoPerArtist})`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        if (compenso > this.rules.maxCompensoPerArtist) {
            validation.errors.push({
                field: 'compenso',
                code: 'COMPENSO_TOO_HIGH',
                message: `Compenso troppo alto (max €${this.rules.maxCompensoPerArtist})`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        // Warning per compensi inusuali
        if (compenso > 5000) {
            validation.warnings.push({
                field: 'compenso',
                code: 'HIGH_COMPENSO',
                message: `Compenso elevato (€${compenso})`,
                severity: 'warning'
            });
        }
    }
    
    /**
     * Valida campi obbligatori
     */
    validateRequiredFields(artist, validation) {
        const requiredFields = ['nome', 'cognome', 'codice_fiscale'];
        
        requiredFields.forEach(field => {
            if (!artist[field] || artist[field].toString().trim() === '') {
                validation.errors.push({
                    field: field,
                    code: 'REQUIRED_FIELD',
                    message: `Campo ${field} obbligatorio`,
                    severity: 'error'
                });
                validation.isValid = false;
            }
        });
    }
    
    /**
     * Valida compensi totali
     */
    validateCompensos(artists, validation) {
        const totalCompenso = artists.reduce((sum, artist) => {
            return sum + (parseFloat(artist.compenso) || 0);
        }, 0);
        
        if (totalCompenso > this.rules.maxTotalCompenso) {
            validation.errors.push({
                type: 'total',
                code: 'TOTAL_TOO_HIGH',
                message: `Totale compensi troppo alto (€${totalCompenso.toLocaleString()})`,
                severity: 'error'
            });
            validation.isValid = false;
        }
        
        // Warning per totali elevati
        if (totalCompenso > 50000) {
            validation.warnings.push({
                type: 'total',
                code: 'HIGH_TOTAL',
                message: `Totale compensi elevato (€${totalCompenso.toLocaleString()})`,
                severity: 'warning'
            });
        }
        
        validation.summary.totalCompenso = totalCompenso;
    }
    
    /**
     * Valida regole business
     */
    validateBusinessRules(artists, validation) {
        // 1. Verifica duplicati codice fiscale
        this.checkDuplicateCodiceFiscale(artists, validation);
        
        // 2. Verifica limiti per categoria
        this.checkCategoryLimits(artists, validation);
        
        // 3. Verifica coerenza dati
        this.checkDataConsistency(artists, validation);
    }
    
    /**
     * Verifica duplicati codice fiscale
     */
    checkDuplicateCodiceFiscale(artists, validation) {
        const cfMap = new Map();
        
        artists.forEach((artist, index) => {
            const cf = artist.codice_fiscale?.toUpperCase().trim();
            if (!cf) return;
            
            if (cfMap.has(cf)) {
                const duplicateIndex = cfMap.get(cf);
                validation.errors.push({
                    type: 'duplicate',
                    code: 'DUPLICATE_CF',
                    message: `Codice fiscale duplicato: ${cf} (artisti ${duplicateIndex + 1} e ${index + 1})`,
                    severity: 'error'
                });
                validation.isValid = false;
            } else {
                cfMap.set(cf, index);
            }
        });
    }
    
    /**
     * Verifica limiti per categoria
     */
    checkCategoryLimits(artists, validation) {
        const categoryCount = new Map();
        
        artists.forEach(artist => {
            const category = artist.categoria || 'Non specificata';
            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        });
        
        // Warning per troppe persone della stessa categoria
        categoryCount.forEach((count, category) => {
            if (count > 5) {
                validation.warnings.push({
                    type: 'category',
                    code: 'HIGH_CATEGORY_COUNT',
                    message: `Molti artisti categoria "${category}" (${count})`,
                    severity: 'warning'
                });
            }
        });
        
        validation.summary.categoryDistribution = Object.fromEntries(categoryCount);
    }
    
    /**
     * Verifica coerenza dati
     */
    checkDataConsistency(artists, validation) {
        artists.forEach((artist, index) => {
            // Verifica coerenza compenso con categoria
            const expectedRange = this.getExpectedCompensoRange(artist.categoria);
            const actualCompenso = parseFloat(artist.compenso) || 0;
            
            if (expectedRange && (actualCompenso < expectedRange.min || actualCompenso > expectedRange.max)) {
                validation.warnings.push({
                    type: 'consistency',
                    code: 'COMPENSO_CATEGORY_MISMATCH',
                    message: `Compenso inusuale per categoria "${artist.categoria}" (€${actualCompenso})`,
                    severity: 'warning',
                    artistIndex: index
                });
            }
        });
    }
    
    /**
     * Ottiene range compenso atteso per categoria
     */
    getExpectedCompensoRange(categoria) {
        const ranges = {
            'Cantante': { min: 800, max: 5000 },
            'Musicista': { min: 500, max: 3000 },
            'Ballerino/a': { min: 400, max: 2500 },
            'Attore/Attrice': { min: 600, max: 4000 },
            'Comico/a': { min: 300, max: 2000 },
            'DJ': { min: 200, max: 1500 },
            'Tecnico Audio': { min: 150, max: 1000 },
            'Tecnico Luci': { min: 150, max: 1000 },
            'Tecnico Video': { min: 150, max: 1000 }
        };
        
        return ranges[categoria] || null;
    }
    
    /**
     * Genera summary validazione
     */
    generateValidationSummary(validation) {
        validation.summary = {
            ...validation.summary,
            totalArtists: validation.artistValidations.length,
            validArtists: validation.artistValidations.filter(a => a.isValid).length,
            invalidArtists: validation.artistValidations.filter(a => !a.isValid).length,
            totalErrors: validation.errors.length,
            totalWarnings: validation.warnings.length,
            isCompletelyValid: validation.isValid && validation.warnings.length === 0,
            canProceed: validation.isValid,
            validationDate: new Date().toISOString()
        };
    }
    
    /**
     * Aggiorna UI validazione
     */
    updateValidationUI(validation) {
        if (!this.validationSummary) return;
        
        const summary = validation.summary;
        const statusClass = validation.isValid ? 'valid' : 'invalid';
        const statusIcon = validation.isValid ? 'fa-check-circle' : 'fa-exclamation-circle';
        const statusText = validation.isValid ? 'Valido' : 'Non Valido';
        
        this.validationSummary.innerHTML = `
            <div class="validation-status ${statusClass}">
                <div class="status-header">
                    <i class="fas ${statusIcon}"></i>
                    <span class="status-text">${statusText}</span>
                    <span class="status-details">${summary.validArtists}/${summary.totalArtists} artisti validi</span>
                </div>
                
                ${summary.totalErrors > 0 ? `
                    <div class="validation-errors">
                        <i class="fas fa-times-circle text-danger"></i>
                        <span>${summary.totalErrors} errore${summary.totalErrors !== 1 ? 'i' : ''}</span>
                    </div>
                ` : ''}
                
                ${summary.totalWarnings > 0 ? `
                    <div class="validation-warnings">
                        <i class="fas fa-exclamation-triangle text-warning"></i>
                        <span>${summary.totalWarnings} avviso${summary.totalWarnings !== 1 ? 'i' : ''}</span>
                    </div>
                ` : ''}
                
                <div class="validation-totals">
                    <span class="total-compenso">Totale: €${summary.totalCompenso?.toLocaleString() || '0'}</span>
                </div>
            </div>
        `;
        
        // Aggiorna dettagli se visibili
        this.updateValidationDetails(validation);
        
        // Aggiorna pannello
        this.updateValidationPanel(validation);
    }
    
    /**
     * Aggiorna dettagli validazione
     */
    updateValidationDetails(validation) {
        const detailsContainer = document.getElementById('validationDetails');
        if (!detailsContainer) return;
        
        let detailsHTML = '';
        
        // Errori globali
        if (validation.errors.length > 0) {
            detailsHTML += `
                <div class="validation-section">
                    <h6 class="text-danger"><i class="fas fa-times-circle"></i> Errori</h6>
                    <ul class="validation-list">
                        ${validation.errors.map(error => `
                            <li class="validation-item error">
                                <strong>${error.code}:</strong> ${error.message}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Warnings globali
        if (validation.warnings.length > 0) {
            detailsHTML += `
                <div class="validation-section">
                    <h6 class="text-warning"><i class="fas fa-exclamation-triangle"></i> Avvisi</h6>
                    <ul class="validation-list">
                        ${validation.warnings.map(warning => `
                            <li class="validation-item warning">
                                <strong>${warning.code}:</strong> ${warning.message}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Validazione per artista
        const invalidArtists = validation.artistValidations.filter(a => !a.isValid || a.warnings.length > 0);
        if (invalidArtists.length > 0) {
            detailsHTML += `
                <div class="validation-section">
                    <h6><i class="fas fa-user"></i> Dettagli Artisti</h6>
                    ${invalidArtists.map(artistVal => {
                        const artists = this.stateManager?.get('selectedArtists') || [];
                        const artist = artists[artistVal.artistIndex];
                        return `
                            <div class="artist-validation">
                                <strong>${artist?.nome} ${artist?.cognome}</strong>
                                ${artistVal.errors.map(error => `
                                    <div class="validation-item error">
                                        ${error.field}: ${error.message}
                                    </div>
                                `).join('')}
                                ${artistVal.warnings.map(warning => `
                                    <div class="validation-item warning">
                                        ${warning.field}: ${warning.message}
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        detailsContainer.innerHTML = detailsHTML;
    }
    
    /**
     * Aggiorna pannello validazione
     */
    updateValidationPanel(validation) {
        if (!this.validationPanel) return;
        
        // Aggiorna classe pannello
        this.validationPanel.classList.remove('valid', 'invalid', 'warning');
        
        if (validation.isValid) {
            if (validation.warnings.length === 0) {
                this.validationPanel.classList.add('valid');
            } else {
                this.validationPanel.classList.add('warning');
            }
        } else {
            this.validationPanel.classList.add('invalid');
        }
    }
    
    /**
     * Valida input compenso specifico
     */
    validateCompensoInput(input) {
        const value = parseFloat(input.value) || 0;
        const isValid = value >= this.rules.minCompensoPerArtist && 
                       value <= this.rules.maxCompensoPerArtist;
        
        // Aggiorna classe input
        input.classList.remove('is-valid', 'is-invalid');
        input.classList.add(isValid ? 'is-valid' : 'is-invalid');
        
        // Mostra feedback
        if (!isValid) {
            this.showToast(
                `Compenso deve essere tra €${this.rules.minCompensoPerArtist} e €${this.rules.maxCompensoPerArtist}`,
                'error',
                2000
            );
        }
        
        return isValid;
    }
    
    /**
     * Valida input artista generico
     */
    validateArtistInput(input) {
        const field = input.dataset.field;
        const value = input.value.trim();
        
        let isValid = true;
        let message = '';
        
        switch (field) {
            case 'nome':
            case 'cognome':
                isValid = value.length >= this.rules.minNameLength && 
                         value.length <= this.rules.maxNameLength &&
                         this.rules.namePattern.test(value);
                if (!isValid) {
                    message = `${field} deve essere tra ${this.rules.minNameLength} e ${this.rules.maxNameLength} caratteri e contenere solo lettere`;
                }
                break;
                
            case 'codice_fiscale':
                isValid = this.rules.codiceFiscalePattern.test(value.toUpperCase()) &&
                         this.validateCodiceFiscaleChecksum(value.toUpperCase());
                if (!isValid) {
                    message = 'Codice fiscale non valido';
                }
                break;
        }
        
        // Aggiorna classe input
        input.classList.remove('is-valid', 'is-invalid');
        if (value.length > 0) {
            input.classList.add(isValid ? 'is-valid' : 'is-invalid');
        }
        
        // Mostra feedback se errore
        if (!isValid && value.length > 0) {
            this.showToast(message, 'error', 2000);
        }
        
        return isValid;
    }
    
    /**
     * Toggle dettagli validazione
     */
    toggleValidationDetails() {
        const details = document.getElementById('validationDetails');
        const toggleBtn = this.validationPanel?.querySelector('.validation-header button i');
        
        if (details) {
            const isVisible = details.style.display !== 'none';
            details.style.display = isVisible ? 'none' : 'block';
            
            if (toggleBtn) {
                toggleBtn.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            }
        }
    }
    
    /**
     * Ottieni risultato validazione corrente
     */
    getCurrentValidation() {
        return this.validationResults.get('currentValidation') || null;
    }
    
    /**
     * Verifica se può procedere al step successivo
     */
    canProceedToNextStep() {
        const validation = this.getCurrentValidation();
        return validation?.isValid || false;
    }
    
    /**
     * Ottieni errori bloccanti
     */
    getBlockingErrors() {
        const validation = this.getCurrentValidation();
        return validation?.errors || [];
    }
    
    /**
     * Ottieni tutti gli avvisi
     */
    getWarnings() {
        const validation = this.getCurrentValidation();
        return validation?.warnings || [];
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
     * Debug validation
     */
    debug() {
        const validation = this.getCurrentValidation();
        return {
            rules: this.rules,
            currentValidation: validation?.summary || null,
            validationResults: this.validationResults.size,
            isValidationActive: this.isValidationActive
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.validationResults.clear();
        this.isValidationActive = false;
        
        console.log('🧹 ArtistValidation cleanup completato');
    }
}

// Aggiungi alla window per toggle details
window.toggleValidationDetails = function() {
    if (window.artistValidation) {
        window.artistValidation.toggleValidationDetails();
    }
};

// Esporta classe
export default ArtistValidation;

console.log('✅ ArtistValidation module loaded');