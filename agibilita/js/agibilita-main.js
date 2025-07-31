/**
 * agibilita-main.js - PERCORSI CORRETTI Sistema Agibilità RECORP
 * 
 * Sistema completo con percorsi allineati alla struttura reale
 * 
 * @author RECORP ALL-IN-ONE
 * @version 4.1 - PERCORSI CORRETTI
 * @date 2025-01-31
 */

// ==================== IMPORT MODULI BASE (PERCORSI CORRETTI) ====================
import { DatabaseService } from './config/supabase-config-agibilita.js';
import { AuthGuard } from './config/auth-guard-agibilita.js';
import { DebugSystem } from './utils/debug-system.js';
import { StateManager } from './modules/core/state-management.js';          // ✅ CORRETTO
import { SystemInitializer } from './modules/core/initialization.js';
import { EventManager } from './modules/core/event-handlers.js';            // ✅ CORRETTO
import { ToastSystem } from './modules/ui/toast-system.js';
import { NavigationManager } from './modules/ui/navigation.js';             // ✅ CORRETTO
import { ProgressBarManager } from './modules/ui/progress-bar.js';
import { ModalManager } from './modules/ui/modals.js';                      // ✅ CORRETTO

console.log('🚀 Inizializzazione Sistema Agibilità v4.1 - PERCORSI CORRETTI...');

/**
 * Sistema Agibilità - Coordinatore Principale DEFINITIVO
 * Con percorsi corretti per la struttura reale
 */
class AgibilitaSystem {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.startTime = Date.now();
        
        // Sistema Artists con stato completo
        this.artistsSystem = {
            initialized: false,
            mode: 'unknown', // 'real' | 'mock' | 'disabled'
            searchActive: false,
            selectedArtists: [],
            validationStatus: { isValid: false, errors: [] },
            lastSearchQuery: '',
            searchTimeout: null
        };
        
        // Configurazione sistema
        this.config = {
            debug: true,
            artistsEnabled: true,
            mockFallback: true,
            autoValidation: true,
            registrationPopup: true
        };
        
        console.log('🎭 AgibilitaSystem DEFINITIVO creato con percorsi corretti');
    }
    
    /**
     * ==================== INIZIALIZZAZIONE PRINCIPALE ====================
     */
    async initialize() {
        try {
            console.log('🔧 Avvio inizializzazione sistema...');
            this.showProgress('Inizializzazione in corso...', 10);
            
            // Phase 1: Autenticazione (CRITICA)
            await this.initializeAuthentication();
            this.showProgress('Autenticazione completata', 25);
            
            // Phase 2: Core Systems (ESSENZIALI)
            await this.initializeCoreModules();
            this.showProgress('Moduli core caricati', 50);
            
            // Phase 3: UI Systems (INTERFACCIA)
            await this.initializeUIModules();
            this.showProgress('Interfaccia pronta', 75);
            
            // Phase 4: Artists System (BUSINESS LOGIC)
            await this.initializeArtistsSystem();
            this.showProgress('Sistema Artists configurato', 90);
            
            // Phase 5: Finalizzazione (INTEGRAZIONE)
            await this.finalizeInitialization();
            this.showProgress('Sistema completamente operativo', 100);
            
            // Sistema inizializzato
            this.initialized = true;
            const initTime = Date.now() - this.startTime;
            
            console.log(`✅ Sistema Agibilità inizializzato in ${initTime}ms`);
            
            // UI finale
            setTimeout(() => {
                this.hideLoadingOverlay();
                this.showWelcomeMessage();
            }, 500);
            
            return true;
            
        } catch (error) {
            console.error('❌ Errore critico inizializzazione:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }
    
    /**
     * ==================== AUTENTICAZIONE ====================
     */
    async initializeAuthentication() {
        console.log('🛡️ Inizializzazione autenticazione...');
        
        try {
            const session = await AuthGuard.initAgibilitaPageProtection();
            console.log('✅ Autenticazione verificata');
            return session;
        } catch (error) {
            console.error('❌ Errore autenticazione:', error);
            throw error;
        }
    }
    
    /**
     * ==================== MODULI CORE ====================
     */
    async initializeCoreModules() {
        console.log('🏗️ Inizializzazione moduli core...');
        
        // Debug System
        if (!window.DebugSystem) {
            window.DebugSystem = DebugSystem;
            if (DebugSystem.initialize) {
                DebugSystem.initialize();
            }
        }
        console.log('✅ DebugSystem ready');
        
        // State Manager
        const stateManager = new StateManager();
        this.modules.set('stateManager', stateManager);
        window.stateManager = stateManager;
        console.log('✅ StateManager ready');
        
        // System Initializer
        const systemInitializer = new SystemInitializer(stateManager);
        if (systemInitializer.initialize) {
            await systemInitializer.initialize();
        }
        this.modules.set('systemInitializer', systemInitializer);
        console.log('✅ SystemInitializer ready');
        
        // Event Manager
        const eventManager = new EventManager(stateManager);
        if (eventManager.initialize) {
            await eventManager.initialize();
        }
        this.modules.set('eventManager', eventManager);
        window.eventManager = eventManager;
        console.log('✅ EventManager ready');
    }
    
    /**
     * ==================== MODULI UI ====================
     */
    async initializeUIModules() {
        console.log('🎨 Inizializzazione moduli UI...');
        
        const stateManager = this.modules.get('stateManager');
        
        // Toast System
        const toastSystem = new ToastSystem();
        if (toastSystem.initialize) {
            await toastSystem.initialize();
        }
        this.modules.set('toastSystem', toastSystem);
        window.toastSystem = toastSystem;
        console.log('✅ ToastSystem ready');
        
        // Navigation Manager
        const navigationManager = new NavigationManager(stateManager);
        if (navigationManager.initialize) {
            await navigationManager.initialize();
        }
        this.modules.set('navigationManager', navigationManager);
        window.navigationManager = navigationManager;
        console.log('✅ NavigationManager ready');
        
        // Progress Bar Manager
        const progressBarManager = new ProgressBarManager(stateManager);
        if (progressBarManager.initialize) {
            await progressBarManager.initialize();
        }
        this.modules.set('progressBarManager', progressBarManager);
        window.progressBarManager = progressBarManager;
        console.log('✅ ProgressBarManager ready');
        
        // Modal Manager
        const modalManager = new ModalManager();
        if (modalManager.initialize) {
            await modalManager.initialize();
        }
        this.modules.set('modalManager', modalManager);
        window.modalManager = modalManager;
        console.log('✅ ModalManager ready');
    }
    
    /**
     * ==================== SISTEMA ARTISTS (PERCORSI CORRETTI) ====================
     */
    async initializeArtistsSystem() {
        console.log('🎭 Inizializzazione Sistema Artists...');
        
        if (!this.config.artistsEnabled) {
            console.log('⚠️ Sistema Artists disabilitato nella configurazione');
            this.artistsSystem.mode = 'disabled';
            return;
        }
        
        try {
            // Tentativo caricamento moduli Artists reali
            console.log('📦 Tentativo caricamento moduli Artists...');
            const artistModules = await this.loadArtistModulesDynamically();
            
            if (artistModules.success) {
                // 🚀 SISTEMA REALE
                await this.initializeRealArtistsSystem(artistModules.modules);
                this.artistsSystem.mode = 'real';
                console.log('✅ Sistema Artists REALE inizializzato');
                
                // Notifica successo
                setTimeout(() => {
                    this.showToast('🎭 Sistema Artists operativo!', 'success');
                }, 1200);
                
            } else {
                throw new Error(`Moduli Artists non disponibili: ${artistModules.error}`);
            }
            
        } catch (error) {
            console.warn('⚠️ Fallback al sistema Artists MOCK:', error.message);
            
            if (this.config.mockFallback) {
                // 🎭 SISTEMA MOCK
                this.initializeMockArtistsSystem();
                this.artistsSystem.mode = 'mock';
                console.log('✅ Sistema Artists MOCK inizializzato');
                
                // Notifica modalità demo
                setTimeout(() => {
                    this.showToast('🎭 Sistema Artists in modalità DEMO', 'warning');
                }, 1200);
            } else {
                this.artistsSystem.mode = 'disabled';
                console.log('⚠️ Sistema Artists disabilitato (no fallback)');
            }
        }
        
        // Sempre marca come inizializzato
        this.artistsSystem.initialized = true;
    }
    
    /**
     * ==================== CARICAMENTO DINAMICO MODULI (PERCORSI CORRETTI) ====================
     */
    async loadArtistModulesDynamically() {
        console.log('📦 Caricamento dinamico moduli Artists...');
        
        try {
            // Import dinamico parallelo con percorsi corretti
            const [
                ArtistSearchModule,
                ArtistListModule, 
                ArtistValidationModule
            ] = await Promise.all([
                import('./modules/artists/artist-search.js').catch(err => {
                    console.warn('❌ Impossibile caricare artist-search.js:', err.message);
                    return null;
                }),
                import('./modules/artists/artist-list.js').catch(err => {
                    console.warn('❌ Impossibile caricare artist-list.js:', err.message);
                    return null;
                }),
                import('./modules/artists/artist-validation.js').catch(err => {
                    console.warn('❌ Impossibile caricare artist-validation.js:', err.message);
                    return null;
                })
            ]);
            
            // Verifica che tutti i moduli siano caricati
            if (!ArtistSearchModule || !ArtistListModule || !ArtistValidationModule) {
                const missing = [];
                if (!ArtistSearchModule) missing.push('artist-search.js');
                if (!ArtistListModule) missing.push('artist-list.js');
                if (!ArtistValidationModule) missing.push('artist-validation.js');
                
                throw new Error(`Moduli mancanti: ${missing.join(', ')}`);
            }
            
            // Estrai le classi dai moduli
            const modules = {
                ArtistSearch: ArtistSearchModule.ArtistSearch || ArtistSearchModule.default,
                ArtistList: ArtistListModule.ArtistList || ArtistListModule.default,
                ArtistValidation: ArtistValidationModule.ArtistValidation || ArtistValidationModule.default
            };
            
            // Verifica che le classi esistano
            if (!modules.ArtistSearch || !modules.ArtistList || !modules.ArtistValidation) {
                throw new Error('Classi non trovate nei moduli importati');
            }
            
            console.log('✅ Moduli Artists caricati con successo');
            return { success: true, modules };
            
        } catch (error) {
            console.log('❌ Caricamento moduli Artists fallito:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * ==================== SISTEMA ARTISTS REALE ====================
     */
    async initializeRealArtistsSystem(artistModules) {
        console.log('🎭 Configurazione sistema Artists REALE...');
        
        const stateManager = this.modules.get('stateManager');
        const toastSystem = this.modules.get('toastSystem');
        
        try {
            // Artist Search
            console.log('🔍 Inizializzazione ArtistSearch...');
            const artistSearch = new artistModules.ArtistSearch({
                container: 'artistSearchContainer',
                input: 'artistSearchInput', 
                results: 'artistSearchResults',
                database: DatabaseService,
                toast: toastSystem,
                debug: this.config.debug
            });
            
            if (artistSearch.initialize) {
                await artistSearch.initialize();
            }
            this.modules.set('artistSearch', artistSearch);
            console.log('✅ ArtistSearch configurato');
            
            // Artist List
            console.log('📋 Inizializzazione ArtistList...');
            const artistList = new artistModules.ArtistList({
                container: 'selectedArtistsContainer',
                template: 'artistItemTemplate',
                state: stateManager,
                toast: toastSystem,
                debug: this.config.debug
            });
            
            if (artistList.initialize) {
                await artistList.initialize();
            }
            this.modules.set('artistList', artistList);
            console.log('✅ ArtistList configurato');
            
            // Artist Validation
            console.log('✅ Inizializzazione ArtistValidation...');
            const artistValidation = new artistModules.ArtistValidation({
                container: 'validationPanelContainer',
                state: stateManager,
                navigation: this.modules.get('navigationManager'),
                toast: toastSystem,
                debug: this.config.debug
            });
            
            if (artistValidation.initialize) {
                await artistValidation.initialize();
            }
            this.modules.set('artistValidation', artistValidation);
            console.log('✅ ArtistValidation configurato');
            
            // Setup integrazione e event handlers
            this.setupRealArtistsIntegration();
            this.setupRealArtistsEventHandlers();
            
            // API globali reali
            this.exportRealArtistsAPI();
            
            console.log('✅ Sistema Artists REALE completamente configurato');
            
        } catch (error) {
            console.error('❌ Errore configurazione sistema Artists REALE:', error);
            throw error;
        }
    }
    
    /**
     * ==================== SISTEMA ARTISTS MOCK ====================
     */
    initializeMockArtistsSystem() {
        console.log('🎭 Configurazione sistema Artists MOCK...');
        
        // Dati mock per demo
        this.mockData = {
            artists: [
                { id: 1, nome: 'Mario', cognome: 'Rossi', mansione: 'Cantante', codice_fiscale: 'RSSMRA80A01H501Z' },
                { id: 2, nome: 'Luigi', cognome: 'Verdi', mansione: 'Musicista', codice_fiscale: 'VRDLGU75B02H501Y' },
                { id: 3, nome: 'Anna', cognome: 'Bianchi', mansione: 'Ballerina', codice_fiscale: 'BNCNNA85C03H501X' },
                { id: 4, nome: 'Marco', cognome: 'Neri', mansione: 'Attore', codice_fiscale: 'NRIMRC90D04H501W' },
                { id: 5, nome: 'Sara', cognome: 'Rosa', mansione: 'Cantante', codice_fiscale: 'RSOSRA88E05H501V' },
                { id: 6, nome: 'Giuseppe', cognome: 'Blu', mansione: 'Musicista', codice_fiscale: 'BLUGPP70F06H501U' },
                { id: 7, nome: 'Maria', cognome: 'Verde', mansione: 'Ballerina', codice_fiscale: 'VRDMRA82G07H501T' },
                { id: 8, nome: 'Francesco', cognome: 'Giallo', mansione: 'Attore', codice_fiscale: 'GLLFNC78H08H501S' },
                { id: 9, nome: 'Zaira', cognome: 'Zamboni', mansione: 'Cantante', codice_fiscale: 'ZMBZRA90I09H501R' },
                { id: 10, nome: 'Zeno', cognome: 'Zanetti', mansione: 'Musicista', codice_fiscale: 'ZNTZNO85J10H501Q' }
            ]
        };
        
        // Setup event handlers mock
        this.setupMockArtistsEventHandlers();
        
        // API globali mock
        this.exportMockArtistsAPI();
        
        console.log('✅ Sistema Artists MOCK configurato');
    }
    
    /**
     * ==================== INTEGRAZIONE ARTISTS REALE ====================
     */
    setupRealArtistsIntegration() {
        console.log('🔗 Setup integrazione Artists REALE...');
        
        const stateManager = this.modules.get('stateManager');
        const artistSearch = this.modules.get('artistSearch');
        const artistList = this.modules.get('artistList');
        const artistValidation = this.modules.get('artistValidation');
        
        if (!artistSearch || !artistList || !artistValidation) {
            console.warn('⚠️ Moduli Artists non disponibili per integrazione');
            return;
        }
        
        // Search → List Integration
        if (typeof artistSearch.setOnArtistSelected === 'function') {
            artistSearch.setOnArtistSelected(async (artist) => {
                console.log('🎭 Artista selezionato dalla ricerca:', artist);
                
                const result = await artistList.addArtist(artist);
                if (result.success) {
                    artistSearch.reset();
                    this.showToast(`${artist.nome} ${artist.cognome} aggiunto!`, 'success');
                    
                    // Auto-validation
                    if (this.config.autoValidation) {
                        setTimeout(() => this.triggerArtistsValidation(), 500);
                    }
                }
            });
        }
        
        // List → Validation Integration  
        if (typeof artistList.setOnListChanged === 'function') {
            artistList.setOnListChanged((artists) => {
                console.log('📋 Lista artisti modificata:', artists.length, 'artisti');
                
                // Update global state
                stateManager.set('selectedArtists', artists);
                stateManager.set('artistsCount', artists.length);
                this.artistsSystem.selectedArtists = artists;
                
                // Auto-validation
                if (this.config.autoValidation) {
                    this.triggerArtistsValidation();
                }
            });
        }
        
        // Validation → Navigation Integration
        if (typeof artistValidation.setOnValidationChanged === 'function') {
            artistValidation.setOnValidationChanged((validation) => {
                console.log('✅ Validazione artisti aggiornata:', validation);
                
                this.artistsSystem.validationStatus = validation;
                
                // Update navigation
                const navigationManager = this.modules.get('navigationManager');
                if (navigationManager) {
                    if (validation.isValid) {
                        if (typeof navigationManager.enableNextStep === 'function') {
                            navigationManager.enableNextStep();
                        }
                    } else {
                        if (typeof navigationManager.disableNextStep === 'function') {
                            navigationManager.disableNextStep();
                        }
                    }
                }
                
                // Update global state
                stateManager.set('artistsStepValid', validation.isValid);
                stateManager.set('artistsValidationErrors', validation.errors);
            });
        }
        
        console.log('✅ Integrazione Artists REALE configurata');
    }
    
    /**
     * ==================== EVENT HANDLERS ARTISTS REALE ====================
     */
    setupRealArtistsEventHandlers() {
        console.log('🎧 Setup event handlers Artists REALE...');
        
        // Search input handler
        const searchInput = document.getElementById('artistSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                // Debouncing
                if (this.artistsSystem.searchTimeout) {
                    clearTimeout(this.artistsSystem.searchTimeout);
                }
                
                this.artistsSystem.searchTimeout = setTimeout(() => {
                    this.handleRealArtistSearch(query);
                }, 300);
            });
            
            console.log('✅ Event handler ricerca Artists REALE configurato');
        }
        
        // Common handlers
        this.setupCommonArtistsEventHandlers();
    }
    
    /**
     * ==================== EVENT HANDLERS ARTISTS MOCK ====================  
     */
    setupMockArtistsEventHandlers() {
        console.log('🎧 Setup event handlers Artists MOCK...');
        
        // Search input handler
        const searchInput = document.getElementById('artistSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                // Debouncing
                if (this.artistsSystem.searchTimeout) {
                    clearTimeout(this.artistsSystem.searchTimeout);
                }
                
                this.artistsSystem.searchTimeout = setTimeout(() => {
                    this.handleMockArtistSearch(query);
                }, 300);
            });
            
            console.log('✅ Event handler ricerca Artists MOCK configurato');
        }
        
        // Common handlers
        this.setupCommonArtistsEventHandlers();
    }
    
    /**
     * ==================== EVENT HANDLERS COMUNI ====================
     */
    setupCommonArtistsEventHandlers() {
        // New artist button
        const newArtistBtn = document.getElementById('newArtistBtn');
        if (newArtistBtn) {
            newArtistBtn.addEventListener('click', () => {
                this.openArtistRegistrationModal();
            });
            console.log('✅ Event handler nuovo artista configurato');
        }
        
        // Reset button
        const resetBtn = document.getElementById('resetArtistsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetArtistsSystem();
            });
            console.log('✅ Event handler reset artisti configurato');
        }
    }
    
    /**
     * ==================== GESTIONE RICERCA REALE ====================
     */
    async handleRealArtistSearch(query) {
        console.log('🔍 Ricerca artisti REALE:', query);
        
        this.artistsSystem.lastSearchQuery = query;
        
        const artistSearch = this.modules.get('artistSearch');
        if (!artistSearch) {
            console.warn('⚠️ ArtistSearch non disponibile');
            return;
        }
        
        try {
            this.artistsSystem.searchActive = true;
            await artistSearch.search(query);
            
        } catch (error) {
            console.error('❌ Errore ricerca artisti REALE:', error);
            this.showToast('Errore durante la ricerca artisti', 'error');
        } finally {
            this.artistsSystem.searchActive = false;
        }
    }
    
    /**
     * ==================== GESTIONE RICERCA MOCK ====================
     */
    handleMockArtistSearch(query) {
        console.log('🔍 Ricerca artisti MOCK:', query);
        
        this.artistsSystem.lastSearchQuery = query;
        
        if (query.length < 2) {
            this.clearMockSearchResults();
            return;
        }
        
        // Filter mock data
        const results = this.mockData.artists.filter(artist => {
            const searchText = `${artist.nome} ${artist.cognome} ${artist.mansione}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
        
        this.displayMockSearchResults(results, query);
        
        // Feedback toast
        this.showToast(`Ricerca DEMO: "${query}" - ${results.length} risultati`, 'info', 2000);
    }
    
    /**
     * ==================== DISPLAY RISULTATI MOCK ====================
     */
    displayMockSearchResults(artists, query) {
        const resultsContainer = document.getElementById('artistSearchResults');
        if (!resultsContainer) return;
        
        if (artists.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-message mock-message">
                    <span>🎭 Nessun risultato DEMO per "${query}"</span>
                </div>`;
        } else {
            const resultsHTML = artists.map(artist => `
                <div class="artist-result-item mock-item" data-artist-id="${artist.id}">
                    <div class="mock-badge">DEMO</div>
                    <div class="artist-info">
                        <div class="artist-name">${this.highlightQuery(artist.nome + ' ' + artist.cognome, query)}</div>
                        <div class="artist-details">${artist.mansione} | CF: ${artist.codice_fiscale}</div>
                    </div>
                    <div class="artist-actions">
                        <button class="btn-select mock-btn" onclick="window.agibilitaSystem.selectMockArtist(${artist.id})">
                            ➕ Seleziona DEMO
                        </button>
                    </div>
                </div>
            `).join('');
            
            resultsContainer.innerHTML = `
                <div class="search-results-header mock-header">
                    <span>🎭 DEMO: ${artists.length} risultati per "${query}"</span>
                    <button onclick="window.agibilitaSystem.clearMockSearchResults()" class="btn-clear">✕</button>
                </div>
                <div class="search-results-list">${resultsHTML}</div>
            `;
        }
        
        resultsContainer.style.display = 'block';
    }
    
    /**
     * ==================== UTILITY FUNCTIONS ====================
     */
    highlightQuery(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    clearMockSearchResults() {
        const resultsContainer = document.getElementById('artistSearchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
        }
    }
    
    selectMockArtist(artistId) {
        console.log('🎭 Selezione artista MOCK:', artistId);
        
        const artist = this.mockData.artists.find(a => a.id === artistId);
        if (!artist) return;
        
        // Add to selected list
        this.artistsSystem.selectedArtists.push({
            ...artist,
            compenso: 0,
            selected_at: new Date().toISOString()
        });
        
        this.updateMockArtistsList();
        this.clearMockSearchResults();
        
        // Clear search input
        const searchInput = document.getElementById('artistSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.showToast(`DEMO: ${artist.nome} ${artist.cognome} aggiunto`, 'success');
        
        // Auto-validation
        if (this.config.autoValidation) {
            this.triggerArtistsValidation();
        }
    }
    
    updateMockArtistsList() {
        const container = document.getElementById('selectedArtistsContainer');
        if (!container) return;
        
        if (this.artistsSystem.selectedArtists.length === 0) {
            container.innerHTML = '<div class="no-artists-message">🎭 Nessun artista selezionato (modalità DEMO)</div>';
            return;
        }
        
        const artistsHTML = this.artistsSystem.selectedArtists.map(artist => `
            <div class="selected-artist-item mock-item" data-artist-id="${artist.id}">
                <div class="mock-badge-corner">DEMO</div>
                <div class="artist-info">
                    <div class="artist-name">${artist.nome} ${artist.cognome}</div>
                    <div class="artist-details">${artist.mansione}</div>
                </div>
                <div class="artist-compenso">
                    <input type="number" placeholder="Compenso €" min="0" step="0.01" 
                           value="${artist.compenso}" 
                           onchange="window.agibilitaSystem.updateMockArtistCompenso(${artist.id}, this.value)">
                </div>
                <div class="artist-actions">
                    <button onclick="window.agibilitaSystem.removeMockArtist(${artist.id})" class="btn-remove">
                        🗑️ Rimuovi
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = artistsHTML;
        
        // Update global state
        const stateManager = this.modules.get('stateManager');
        if (stateManager) {
            stateManager.set('selectedArtists', this.artistsSystem.selectedArtists);
            stateManager.set('artistsCount', this.artistsSystem.selectedArtists.length);
        }
    }
    
    updateMockArtistCompenso(artistId, compenso) {
        const artist = this.artistsSystem.selectedArtists.find(a => a.id === artistId);
        if (artist) {
            artist.compenso = parseFloat(compenso) || 0;
            console.log(`💰 DEMO: Compenso artista ${artistId} → €${artist.compenso}`);
        }
    }
    
    removeMockArtist(artistId) {
        this.artistsSystem.selectedArtists = this.artistsSystem.selectedArtists.filter(a => a.id !== artistId);
        this.updateMockArtistsList();
        
        this.showToast('DEMO: Artista rimosso', 'info');
        
        // Auto-validation
        if (this.config.autoValidation) {
            this.triggerArtistsValidation();
        }
    }
    
    /**
     * ==================== MODAL REGISTRAZIONE ARTISTA ====================
     */
    openArtistRegistrationModal() {
        console.log('🆕 Apertura modal registrazione artista');
        
        if (!this.config.registrationPopup) {
            // Direct navigation
            window.location.href = '../registrazione-artista.html?source=agibilita';
            return;
        }
        
        const params = new URLSearchParams({
            source: 'agibilita',
            mode: 'new',
            callback: window.location.href
        });
        
        const popup = window.open(
            `../registrazione-artista.html?${params}`,
            'artistRegistration',
            'width=800,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (popup) {
            // Setup message listener
            const messageHandler = (e) => {
                if (e.data && e.data.type === 'artistRegistered') {
                    console.log('🎭 Artista registrato:', e.data.artist);
                    
                    // Ask to add to list
                    const shouldAdd = e.data.addToList || confirm(
                        `Aggiungere ${e.data.artist.nome} ${e.data.artist.cognome} alla lista agibilità?`
                    );
                    
                    if (shouldAdd) {
                        if (this.artistsSystem.mode === 'real') {
                            // Real system
                            const artistList = this.modules.get('artistList');
                            if (artistList) {
                                artistList.addArtist(e.data.artist);
                            }
                        } else if (this.artistsSystem.mode === 'mock') {
                            // Mock system
                            this.artistsSystem.selectedArtists.push({
                                ...e.data.artist,
                                compenso: 0,
                                selected_at: new Date().toISOString()
                            });
                            this.updateMockArtistsList();
                        }
                    }
                    
                    // Refresh search data
                    const artistSearch = this.modules.get('artistSearch');
                    if (artistSearch && typeof artistSearch.refreshData === 'function') {
                        artistSearch.refreshData();
                    }
                    
                    window.removeEventListener('message', messageHandler);
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            const mode = this.artistsSystem.mode.toUpperCase();
            this.showToast(`Modal registrazione aperto (${mode})`, 'info');
        } else {
            // Popup blocked - fallback
            window.location.href = `../registrazione-artista.html?${params}`;
        }
    }
    
    /**
     * ==================== VALIDAZIONE ARTISTI ====================
     */
    async triggerArtistsValidation() {
        if (this.artistsSystem.mode === 'real') {
            // Real validation
            const artistValidation = this.modules.get('artistValidation');
            if (artistValidation) {
                try {
                    const validation = await artistValidation.validateStep();
                    console.log('✅ Validazione artisti REALE:', validation);
                } catch (error) {
                    console.error('❌ Errore validazione artisti:', error);
                }
            }
        } else if (this.artistsSystem.mode === 'mock') {
            // Mock validation
            const isValid = this.artistsSystem.selectedArtists.length > 0;
            const errors = isValid ? [] : ['Seleziona almeno un artista (modalità DEMO)'];
            
            this.artistsSystem.validationStatus = { isValid, errors };
            
            // Update navigation
            const navigationManager = this.modules.get('navigationManager');
            if (navigationManager) {
                if (isValid) {
                    if (typeof navigationManager.enableNextStep === 'function') {
                        navigationManager.enableNextStep();
                    }
                } else {
                    if (typeof navigationManager.disableNextStep === 'function') {
                        navigationManager.disableNextStep();
                    }
                }
            }
            
            // Update global state
            const stateManager = this.modules.get('stateManager');
            if (stateManager) {
                stateManager.set('artistsStepValid', isValid);
                stateManager.set('artistsValidationErrors', errors);
            }
            
            console.log('✅ Validazione artisti MOCK:', { isValid, errors });
        }
    }
    
    /**
     * ==================== RESET SISTEMA ARTISTI ====================
     */
    async resetArtistsSystem() {
        console.log('🧹 Reset sistema artisti...');
        
        if (!confirm('Confermi di voler azzerare tutto il sistema artisti?')) {
            return;
        }
        
        try {
            if (this.artistsSystem.mode === 'real') {
                // Reset real system
                const artistSearch = this.modules.get('artistSearch');
                const artistList = this.modules.get('artistList');
                
                if (artistSearch && typeof artistSearch.reset === 'function') {
                    await artistSearch.reset();
                }
                if (artistList && typeof artistList.reset === 'function') {
                    await artistList.reset();
                }
                
            } else if (this.artistsSystem.mode === 'mock') {
                // Reset mock system
                this.artistsSystem.selectedArtists = [];
                this.updateMockArtistsList();
                this.clearMockSearchResults();
            }
            
            // Reset common state
            this.artistsSystem.validationStatus = { isValid: false, errors: [] };
            this.artistsSystem.lastSearchQuery = '';
            
            const stateManager = this.modules.get('stateManager');
            if (stateManager) {
                stateManager.remove('selectedArtists');
                stateManager.set('artistsStepValid', false);
                stateManager.set('artistsValidationErrors', []);
            }
            
            // Clear search input
            const searchInput = document.getElementById('artistSearchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            
            const mode = this.artistsSystem.mode.toUpperCase();
            this.showToast(`Sistema artisti azzerato (${mode})`, 'info');
            
            console.log('✅ Reset sistema artisti completato');
            
        } catch (error) {
            console.error('❌ Errore reset sistema artisti:', error);
            this.showToast('Errore durante il reset', 'error');
        }
    }
    
    /**
     * ==================== API EXPORT REALE ====================
     */
    exportRealArtistsAPI() {
        window.artistsAPI = {
            search: (query) => {
                const artistSearch = this.modules.get('artistSearch');
                return artistSearch ? artistSearch.search(query) : Promise.resolve([]);
            },
            addArtist: (artist) => {
                const artistList = this.modules.get('artistList');
                return artistList ? artistList.addArtist(artist) : { success: false, error: 'Sistema non disponibile' };
            },
            removeArtist: (artistId) => {
                const artistList = this.modules.get('artistList');
                return artistList ? artistList.removeArtist(artistId) : { success: false, error: 'Sistema non disponibile' };
            },
            getSelectedArtists: () => {
                const artistList = this.modules.get('artistList');
                return artistList ? artistList.getArtists() : [];
            },
            validateStep: () => {
                const artistValidation = this.modules.get('artistValidation');
                return artistValidation ? artistValidation.validateStep() : { isValid: false, errors: ['Sistema non disponibile'] };
            },
            resetAll: () => this.resetArtistsSystem(),
            getMode: () => this.artistsSystem.mode,
            isRealSystem: () => true
        };
        
        console.log('✅ API Artists REALE esportate');
    }
    
    /**
     * ==================== API EXPORT MOCK ====================
     */
    exportMockArtistsAPI() {
        window.artistsAPI = {
            search: (query) => {
                this.handleMockArtistSearch(query);
                return Promise.resolve(this.mockData.artists.filter(a => 
                    `${a.nome} ${a.cognome} ${a.mansione}`.toLowerCase().includes(query.toLowerCase())
                ));
            },
            addArtist: (artist) => {
                this.artistsSystem.selectedArtists.push({
                    ...artist,
                    compenso: 0,
                    selected_at: new Date().toISOString()
                });
                this.updateMockArtistsList();
                return { success: true, message: 'Artista aggiunto (modalità DEMO)' };
            },
            removeArtist: (artistId) => {
                this.removeMockArtist(artistId);
                return { success: true, message: 'Artista rimosso (modalità DEMO)' };
            },
            getSelectedArtists: () => this.artistsSystem.selectedArtists,
            validateStep: () => {
                const isValid = this.artistsSystem.selectedArtists.length > 0;
                return {
                    isValid,
                    errors: isValid ? [] : ['Seleziona almeno un artista (modalità DEMO)']
                };
            },
            resetAll: () => this.resetArtistsSystem(),
            getMode: () => this.artistsSystem.mode,
            isRealSystem: () => false
        };
        
        console.log('✅ API Artists MOCK esportate');
    }
    
    /**
     * ==================== FINALIZZAZIONE ====================
     */
    async finalizeInitialization() {
        console.log('🎯 Finalizzazione sistema...');
        
        // Auto-update navigation
        const navigationManager = this.modules.get('navigationManager');
        if (navigationManager && typeof navigationManager.setupAutoUpdate === 'function') {
            navigationManager.setupAutoUpdate();
        }
        
        // Module integrations
        this.setupModuleIntegrations();
        
        // Global references
        window.agibilitaSystem = this;
        
        console.log('✅ Finalizzazione completata');
    }
    
    /**
     * ==================== INTEGRAZIONI MODULI ====================
     */
    setupModuleIntegrations() {
        const stateManager = this.modules.get('stateManager');
        const toastSystem = this.modules.get('toastSystem');
        const progressBarManager = this.modules.get('progressBarManager');
        
        // StateManager → ToastSystem
        if (stateManager && toastSystem) {
            if (typeof stateManager.addListener === 'function') {
                stateManager.addListener('error', (error) => {
                    toastSystem.show(error.message || 'Errore sistema', 'error');
                });
                
                stateManager.addListener('success', (message) => {
                    toastSystem.show(message, 'success');
                });
            }
        }
        
        // StateManager → ProgressBar
        if (stateManager && progressBarManager) {
            if (typeof stateManager.addListener === 'function') {
                stateManager.addListener('currentStep', (step) => {
                    if (typeof progressBarManager.updateProgress === 'function') {
                        progressBarManager.updateProgress(step);
                    }
                });
            }
        }
        
        console.log('🔗 Integrazioni moduli configurate');
    }
    
    /**
     * ==================== UI UTILITIES ====================
     */
    showProgress(message, percentage) {
        const progressElement = document.getElementById('initProgress');
        if (progressElement) {
            progressElement.textContent = `${message}... ${percentage}%`;
        }
        console.log(`📊 ${percentage}% - ${message}`);
    }
    
    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.transition = 'opacity 0.5s ease';
            loadingOverlay.style.opacity = '0';
            
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }
    }
    
    showWelcomeMessage() {
        const mode = this.artistsSystem.mode;
        let message = '🎭 Sistema Agibilità pronto!';
        let type = 'success';
        
        if (mode === 'mock') {
            message += ' (Modalità DEMO)';
            type = 'info';
        } else if (mode === 'disabled') {
            message = '🎭 Sistema Agibilità pronto (Artists disabilitato)';
            type = 'warning';
        }
        
        this.showToast(message, type, 4000);
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const toastSystem = this.modules.get('toastSystem');
        if (toastSystem) {
            toastSystem.show(message, type, duration);
        } else {
            console.log(`🔔 Toast [${type}]: ${message}`);
        }
    }
    
    /**
     * ==================== ERROR HANDLING ====================
     */
    handleInitializationError(error) {
        console.error('💥 Errore critico inizializzazione:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'system-error';
        errorDiv.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0, 0, 0, 0.9); color: white; 
            display: flex; align-items: center; justify-content: center; 
            z-index: 10000; font-family: system-ui, sans-serif;
        `;
        
        errorDiv.innerHTML = `
            <div style="text-align: center; max-width: 500px; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin-bottom: 16px;">Errore Sistema Agibilità</h2>
                <p style="margin-bottom: 24px; opacity: 0.8; line-height: 1.5;">
                    Si è verificato un errore durante l'inizializzazione del sistema.
                </p>
                <div style="background: rgba(255, 255, 255, 0.1); padding: 16px; border-radius: 8px; margin-bottom: 24px; font-family: monospace; font-size: 14px; text-align: left;">
                    ${error.message || 'Errore sconosciuto'}
                </div>
                <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔄 Ricarica Pagina
                </button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    /**
     * ==================== DEBUG E STATUS ====================
     */
    getModule(name) {
        return this.modules.get(name);
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    getArtistsStatus() {
        return {
            initialized: this.artistsSystem.initialized,
            mode: this.artistsSystem.mode,
            searchActive: this.artistsSystem.searchActive,
            selectedCount: this.artistsSystem.selectedArtists.length,
            isValid: this.artistsSystem.validationStatus.isValid,
            errors: this.artistsSystem.validationStatus.errors,
            lastSearchQuery: this.artistsSystem.lastSearchQuery,
            modules: {
                search: !!this.modules.get('artistSearch'),
                list: !!this.modules.get('artistList'),
                validation: !!this.modules.get('artistValidation')
            }
        };
    }
    
    debug() {
        const moduleStatus = {};
        for (const [name, module] of this.modules) {
            moduleStatus[name] = {
                loaded: !!module,
                hasDebug: typeof module.debug === 'function'
            };
        }
        
        return {
            initialized: this.initialized,
            startTime: this.startTime,
            initTime: this.initialized ? Date.now() - this.startTime : null,
            config: this.config,
            modules: moduleStatus,
            artists: this.getArtistsStatus(),
            globalReferences: {
                DebugSystem: !!window.DebugSystem,
                stateManager: !!window.stateManager,
                toastSystem: !!window.toastSystem,
                navigationManager: !!window.navigationManager,
                progressBarManager: !!window.progressBarManager,
                modalManager: !!window.modalManager,
                agibilitaSystem: !!window.agibilitaSystem,
                artistsAPI: !!window.artistsAPI
            },
            authentication: {
                AuthGuard: !!window.AuthGuard,
                DatabaseService: DatabaseService ? (typeof DatabaseService.isReady === 'function' ? DatabaseService.isReady() : true) : false
            }
        };
    }
    
    /**
     * ==================== CLEANUP ====================
     */
    cleanup() {
        console.log('🧹 Cleanup sistema...');
        
        // Cleanup modules
        for (const [name, module] of this.modules) {
            if (module.cleanup && typeof module.cleanup === 'function') {
                try {
                    module.cleanup();
                    console.log(`✅ Cleanup ${name}`);
                } catch (error) {
                    console.warn(`⚠️ Errore cleanup ${name}:`, error);
                }
            }
        }
        
        // Cleanup timeouts
        if (this.artistsSystem.searchTimeout) {
            clearTimeout(this.artistsSystem.searchTimeout);
        }
        
        // Cleanup global references
        delete window.DebugSystem;
        delete window.stateManager;
        delete window.eventManager;
        delete window.toastSystem;
        delete window.navigationManager;
        delete window.progressBarManager;
        delete window.modalManager;
        delete window.agibilitaSystem;
        delete window.artistsAPI;
        
        // Reset state
        this.modules.clear();
        this.initialized = false;
        this.artistsSystem.initialized = false;
        
        console.log('✅ Cleanup completato');
    }
    
    async reload() {
        console.log('🔄 Ricarica sistema...');
        this.cleanup();
        await this.initialize();
        console.log('✅ Sistema ricaricato');
    }
}

// ==================== INIZIALIZZAZIONE AUTOMATICA ====================

// Create system instance
const agibilitaSystem = new AgibilitaSystem();

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        agibilitaSystem.initialize().catch(error => {
            console.error('❌ Fallimento inizializzazione:', error);
        });
    });
} else {
    // DOM already ready
    agibilitaSystem.initialize().catch(error => {
        console.error('❌ Fallimento inizializzazione:', error);
    });
}

// Safety timeout
setTimeout(() => {
    if (!agibilitaSystem.isInitialized()) {
        console.error('⏰ Timeout inizializzazione sistema');
        agibilitaSystem.handleInitializationError(
            new Error('Sistema non inizializzato entro 15 secondi')
        );
    }
}, 15000);

// ==================== GLOBAL EXPORTS FOR COMPATIBILITY ====================

// Navigation functions
window.showSection = (sectionId) => {
    if (window.navigationManager) {
        return window.navigationManager.showSection(sectionId);
    }
    console.warn('⚠️ NavigationManager non disponibile');
    return false;
};

window.goToStep = (stepNumber) => {
    if (window.navigationManager) {
        return window.navigationManager.showSection('step' + stepNumber);
    }
    console.warn('⚠️ NavigationManager non disponibile');
    return false;
};

window.goHome = () => {
    if (window.navigationManager) {
        return window.navigationManager.showSection('homeSection');
    }
    console.warn('⚠️ NavigationManager non disponibile');
    return false;
};

// Artists functions
window.searchArtists = (query) => {
    if (window.artistsAPI) {
        return window.artistsAPI.search(query);
    }
    console.warn('⚠️ Sistema Artists non disponibile');
    return Promise.resolve([]);
};

window.openArtistModal = () => {
    if (window.agibilitaSystem) {
        return window.agibilitaSystem.openArtistRegistrationModal();
    }
    console.warn('⚠️ Sistema agibilità non disponibile');
};

window.resetArtists = () => {
    if (window.agibilitaSystem) {
        return window.agibilitaSystem.resetArtistsSystem();
    }
    console.warn('⚠️ Sistema agibilità non disponibile');
};

// Debug functions
window.debugAgibilita = () => {
    if (window.agibilitaSystem) {
        return window.agibilitaSystem.debug();
    }
    console.warn('⚠️ Sistema agibilità non disponibile');
    return null;
};

window.debugArtists = () => {
    if (window.agibilitaSystem) {
        return window.agibilitaSystem.getArtistsStatus();
    }
    console.warn('⚠️ Sistema agibilità non disponibile');
    return null;
};

window.reloadAgibilita = () => {
    if (window.agibilitaSystem) {
        return window.agibilitaSystem.reload();
    } else {
        window.location.reload();
    }
};

// Module exports
export { agibilitaSystem };
export default agibilitaSystem;

console.log('🎭 Sistema Agibilità v4.1 con PERCORSI CORRETTI configurato e pronto');
