// initialization.js - Inizializzazione Sistema Agibilità
console.log('🏗️ Caricamento SystemInitializer...');

import { DatabaseService } from '../../../supabase-config.js';
import { AuthGuard } from '../../../auth-guard.js';

export class SystemInitializer {
    
    /**
     * Inizializza il sistema agibilità
     * @param {StateManager} stateManager - Gestore dello stato
     * @returns {Promise<boolean>} True se inizializzato con successo
     */
    static async init(stateManager) {
        console.log('🚀 Inizializzazione sistema agibilità...');
        
        try {
            // 1. Setup user session
            await this.setupUserSession(stateManager);
            
            // 2. Inizializza date default
            this.setupDefaultDates(stateManager);
            
            // 3. Carica dati di base
            await this.loadBaseData(stateManager);
            
            // 4. Setup province e località
            await this.setupLocations(stateManager);
            
            // 5. Aggiorna statistiche dashboard
            await this.updateDashboardStats(stateManager);
            
            // 6. Setup listeners di sistema
            this.setupSystemListeners(stateManager);
            
            // 7. Inizializza UI
            this.initializeUI();
            
            // Marca come inizializzato
            stateManager.update('isInitialized', true);
            
            console.log('✅ Sistema agibilità inizializzato con successo');
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione sistema:', error);
            this.showInitializationError(error);
            return false;
        }
    }
    
    /**
     * Setup sessione utente da AuthGuard
     */
    static async setupUserSession(stateManager) {
        console.log('👤 Setup sessione utente...');
        
        try {
            const userSession = AuthGuard.getCurrentUser();
            
            if (!userSession) {
                throw new Error('Sessione utente non trovata');
            }
            
            stateManager.update('userSession', {
                email: userSession.email || 'unknown@example.com',
                userId: userSession.id || 'unknown',
                sessionStart: new Date().toISOString(),
                permissions: userSession.permissions || []
            });
            
            // Aggiorna UI con email utente
            const emailElement = document.getElementById('current-user-email');
            if (emailElement) {
                emailElement.textContent = userSession.email || 'Utente';
            }
            
            console.log('✅ Sessione utente configurata:', userSession.email);
            
        } catch (error) {
            console.warn('⚠️ Errore setup sessione utente:', error.message);
            
            // Fallback per development/testing
            stateManager.update('userSession', {
                email: 'dev@recorp.it',
                userId: 'dev_user',
                sessionStart: new Date().toISOString(),
                permissions: ['read', 'write']
            });
            
            const emailElement = document.getElementById('current-user-email');
            if (emailElement) {
                emailElement.textContent = 'dev@recorp.it';
            }
        }
    }
    
    /**
     * Inizializza le date di default (oggi e domani)
     */
    static setupDefaultDates(stateManager) {
        console.log('📅 Setup date default...');
        
        const oggi = new Date();
        const domani = new Date(oggi);
        domani.setDate(oggi.getDate() + 1);
        
        const dataInizio = oggi.toISOString().split('T')[0];
        const dataFine = domani.toISOString().split('T')[0];
        
        stateManager.update('agibilitaData.dataInizio', dataInizio);
        stateManager.update('agibilitaData.dataFine', dataFine);
        
        // Aggiorna i campi nel DOM
        const dataInizioElement = document.getElementById('dataInizio');
        const dataFineElement = document.getElementById('dataFine');
        
        if (dataInizioElement) dataInizioElement.value = dataInizio;
        if (dataFineElement) dataFineElement.value = dataFine;
        
        console.log('✅ Date default impostate:', { dataInizio, dataFine });
    }
    
    /**
     * Carica i dati di base del database
     */
    static async loadBaseData(stateManager) {
        console.log('💾 Caricamento dati di base...');
        
        try {
            // Carica artisti (cache)
            const artists = await this.loadArtists();
            stateManager.update('cache.artists', artists);
            console.log(`✅ Caricati ${artists.length} artisti`);
            
            // Carica venues (cache)
            const venues = await this.loadVenues();
            stateManager.update('cache.venues', venues);
            console.log(`✅ Caricate ${venues.length} venues`);
            
            // Carica dati fatturazione (cache)
            const invoiceData = await this.loadInvoiceData();
            stateManager.update('cache.invoiceData', invoiceData);
            console.log(`✅ Caricati ${invoiceData.length} dati fatturazione`);
            
            // Aggiorna timestamp cache
            stateManager.update('cache.lastUpdated', new Date().toISOString());
            
        } catch (error) {
            console.warn('⚠️ Errore caricamento dati di base:', error.message);
            // Continua anche se il caricamento fallisce
        }
    }
    
    /**
     * Carica artisti dal database
     */
    static async loadArtists() {
        try {
            const { data, error } = await DatabaseService.supabase
                .from('artisti')
                .select('*')
                .order('cognome', { ascending: true });
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Errore caricamento artisti:', error);
            return [];
        }
    }
    
    /**
     * Carica venues dal database
     */
    static async loadVenues() {
        try {
            const { data, error } = await DatabaseService.supabase
                .from('venues')
                .select('*')
                .order('nome', { ascending: true });
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Errore caricamento venues:', error);
            return [];
        }
    }
    
    /**
     * Carica dati fatturazione dal database
     */
    static async loadInvoiceData() {
        try {
            const { data, error } = await DatabaseService.supabase
                .from('invoice_data')
                .select('*')
                .order('last_updated', { ascending: false });
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Errore caricamento dati fatturazione:', error);
            return [];
        }
    }
    
    /**
     * Setup del sistema località (province, comuni, CAP)
     */
    static async setupLocations(stateManager) {
        console.log('📍 Setup sistema località...');
        
        try {
            // Attendi che il database geografico sia caricato
            await this.waitForGIDatabase();
            
            // Carica le province
            const provinces = await this.loadProvinces();
            stateManager.update('cache.provinces', provinces);
            
            // Popola il dropdown province
            this.populateProvinceDropdown(provinces);
            
            console.log(`✅ Caricate ${provinces.length} province`);
            
        } catch (error) {
            console.warn('⚠️ Errore setup località:', error.message);
        }
    }
    
    /**
     * Attende che il database geografico sia disponibile
     */
    static async waitForGIDatabase(maxWait = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkGIDatabase = () => {
                if (window.GIDatabase) {
                    resolve(window.GIDatabase);
                } else if (Date.now() - startTime > maxWait) {
                    reject(new Error('Timeout caricamento database geografico'));
                } else {
                    setTimeout(checkGIDatabase, 100);
                }
            };
            
            checkGIDatabase();
        });
    }
    
    /**
     * Carica le province dal database geografico
     */
    static async loadProvinces() {
        try {
            if (!window.GIDatabase) {
                throw new Error('Database geografico non disponibile');
            }
            
            const provinces = window.GIDatabase.getProvince();
            return provinces.sort((a, b) => a.sigla_automobilistica.localeCompare(b.sigla_automobilistica));
            
        } catch (error) {
            console.error('❌ Errore caricamento province:', error);
            return [];
        }
    }
    
    /**
     * Popola il dropdown delle province
     */
    static populateProvinceDropdown(provinces) {
        const provinciaSelect = document.getElementById('provinciaSelect');
        if (!provinciaSelect) return;
        
        // Pulisci dropdown
        provinciaSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        // Aggiungi province
        provinces.forEach(provincia => {
            const option = document.createElement('option');
            option.value = provincia.codice;
            option.textContent = `${provincia.sigla_automobilistica} - ${provincia.denominazione_ita}`;
            option.dataset.provincia = JSON.stringify(provincia);
            provinciaSelect.appendChild(option);
        });
    }
    
    /**
     * Aggiorna le statistiche del dashboard
     */
    static async updateDashboardStats(stateManager) {
        console.log('📊 Aggiornamento statistiche dashboard...');
        
        try {
            // Conta bozze non locked
            const bozzeCount = await this.countBozze();
            stateManager.update('stats.bozzeCount', bozzeCount);
            
            // Conta richieste attive
            const richiesteCount = await this.countRichieste();
            stateManager.update('stats.richiesteCount', richiesteCount);
            
            // Conta agibilità del mese corrente
            const agibilitaMese = await this.countAgibilitaMese();
            stateManager.update('stats.agibilitaMese', agibilitaMese);
            
            // Aggiorna timestamp
            stateManager.update('stats.lastStatsUpdate', new Date().toISOString());
            
            // Aggiorna l'UI
            this.updateStatsUI(stateManager.get('stats'));
            
            console.log('✅ Statistiche aggiornate:', { bozzeCount, richiesteCount, agibilitaMese });
            
        } catch (error) {
            console.warn('⚠️ Errore aggiornamento statistiche:', error.message);
            
            // Fallback con valori di default
            stateManager.update('stats.bozzeCount', 0);
            stateManager.update('stats.richiesteCount', 0);
            stateManager.update('stats.agibilitaMese', 0);
            
            this.updateStatsUI({ bozzeCount: 0, richiesteCount: 0, agibilitaMese: 0 });
        }
    }
    
    /**
     * Conta le bozze non locked
     */
    static async countBozze() {
        try {
            const { count, error } = await DatabaseService.supabase
                .from('agibilita_bozze')
                .select('*', { count: 'exact', head: true })
                .or('locked_by.is.null,locked_until.lt.' + new Date().toISOString());
            
            if (error) throw error;
            return count || 0;
            
        } catch (error) {
            console.error('❌ Errore conteggio bozze:', error);
            return 0;
        }
    }
    
    /**
     * Conta le richieste non archiviate
     */
    static async countRichieste() {
        try {
            const { count, error } = await DatabaseService.supabase
                .from('richieste_esterne')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'archiviata');
            
            if (error) throw error;
            return count || 0;
            
        } catch (error) {
            console.error('❌ Errore conteggio richieste:', error);
            return 0;
        }
    }
    
    /**
     * Conta le agibilità del mese corrente
     */
    static async countAgibilitaMese() {
        try {
            const oggi = new Date();
            const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString();
            const fineMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0).toISOString();
            
            const { count, error } = await DatabaseService.supabase
                .from('agibilita')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', inizioMese)
                .lte('created_at', fineMese);
            
            if (error) throw error;
            return count || 0;
            
        } catch (error) {
            console.error('❌ Errore conteggio agibilità mese:', error);
            return 0;
        }
    }
    
    /**
     * Aggiorna l'UI delle statistiche
     */
    static updateStatsUI(stats) {
        const elements = {
            bozzeCount: document.getElementById('bozzeCount'),
            richiesteCount: document.getElementById('richiesteCount'),
            agibilitaMese: document.getElementById('agibilitaMese'),
            bozzeInLavorazione: document.getElementById('bozzeInLavorazione')
        };
        
        if (elements.bozzeCount) {
            elements.bozzeCount.textContent = stats.bozzeCount || 0;
        }
        
        if (elements.richiesteCount) {
            elements.richiesteCount.textContent = stats.richiesteCount || 0;
        }
        
        if (elements.agibilitaMese) {
            elements.agibilitaMese.textContent = stats.agibilitaMese || 0;
        }
        
        if (elements.bozzeInLavorazione) {
            // Per ora mostra 0, sarà aggiornato dal sistema bozze
            elements.bozzeInLavorazione.textContent = '0';
        }
    }
    
    /**
     * Setup listeners di sistema
     */
    static setupSystemListeners(stateManager) {
        console.log('🎧 Setup listeners di sistema...');
        
        // Listener per cambiamenti degli artisti selezionati
        stateManager.addListener('selectedArtists', (artists) => {
            const countElement = document.getElementById('selectedCount');
            if (countElement) {
                countElement.textContent = artists.length;
            }
        });
        
        // Listener per cambiamenti del step corrente
        stateManager.addListener('currentStep', (step) => {
            console.log(`📍 Step cambiato: ${step}`);
        });
        
        // Listener per debug mode
        stateManager.addListener('ui.debugMode', (debugMode) => {
            const debugIndicator = document.getElementById('debugIndicator');
            if (debugIndicator) {
                debugIndicator.classList.toggle('show', debugMode);
            }
        });
        
        console.log('✅ Listeners di sistema configurati');
    }
    
    /**
     * Inizializza l'UI di base
     */
    static initializeUI() {
        console.log('🖥️ Inizializzazione UI...');
        
        // Nascondi loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Mostra system status come online
        const systemStatus = document.getElementById('systemStatus');
        if (systemStatus) {
            systemStatus.style.display = 'flex';
            const statusText = systemStatus.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = 'Sistema Online';
            }
        }
        
        // Abilita debug mode in development
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            const debugIndicator = document.getElementById('debugIndicator');
            if (debugIndicator) {
                debugIndicator.classList.add('show');
            }
        }
        
        console.log('✅ UI inizializzata');
    }
    
    /**
     * Mostra errore di inizializzazione
     */
    static showInitializationError(error) {
        console.error('💥 Errore critico inizializzazione:', error);
        
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div style="text-align: center; color: #ff3b30;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Errore di Inizializzazione</h3>
                    <p>${error.message}</p>
                    <p style="font-size: 0.9em; margin-top: 1rem;">
                        Controlla la console per dettagli (F12)
                    </p>
                    <button onclick="location.reload()" 
                            style="padding: 12px 24px; background: #007aff; color: white; 
                                   border: none; border-radius: 8px; cursor: pointer; margin-top: 1rem;">
                        Ricarica Pagina
                    </button>
                </div>
            `;
            loadingOverlay.style.display = 'flex';
        }
    }
    
    /**
     * Cleanup risorse del sistema
     */
    static cleanup(stateManager) {
        console.log('🧹 Cleanup sistema...');
        
        // Ferma timer attivi
        const agibilitaData = stateManager.get('agibilitaData');
        if (agibilitaData && agibilitaData.warningTimer) {
            clearTimeout(agibilitaData.warningTimer);
        }
        
        const drafts = stateManager.get('drafts');
        if (drafts) {
            if (drafts.autosaveTimer) {
                clearInterval(drafts.autosaveTimer);
            }
            if (drafts.lockTimer) {
                clearInterval(drafts.lockTimer);
            }
        }
        
        console.log('✅ Cleanup completato');
    }
}

// Esporta classe principale
export default SystemInitializer;

console.log('✅ SystemInitializer module loaded');