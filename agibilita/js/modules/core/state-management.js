// state-management.js - Gestione Stato Centrale Sistema Agibilità
console.log('🗄️ Caricamento StateManager...');

export class StateManager {
    constructor() {
        console.log('🏗️ Inizializzazione StateManager...');
        
        this.state = {
            // Stato applicazione
            currentSection: 'homeSection',
            currentStep: 0,
            isInitialized: false,
            
            // Dati agibilità
            agibilitaData: {
                isModifica: false,
                codiceAgibilita: null,
                numeroRiservato: null,
                reservationId: null,
                reservationExpires: null,
                warningTimer: null,
                dataInizio: null,
                dataFine: null
            },
            
            // Artisti selezionati
            selectedArtists: [],
            compensiConfermati: new Set(), // Set per compensi già confermati
            
            // Dati località
            locationData: {
                nomeVenue: '',
                indirizzoVenue: '',
                provincia: '',
                citta: '',
                cap: '',
                codiceBelfiore: '',
                cittaNome: ''
            },
            
            // Dati fatturazione
            invoiceData: {
                ragioneSociale: '',
                codiceFiscaleAzienda: '',
                partitaIva: '',
                indirizzoFatturazione: '',
                cittaFatturazione: '',
                capFatturazione: ''
            },
            
            // Stato UI
            ui: {
                activeModal: null,
                isLoading: false,
                debugMode: false,
                autosaveEnabled: true,
                lastAutosave: null
            },
            
            // Sessione utente
            userSession: {
                email: null,
                userId: null,
                sessionStart: null,
                permissions: []
            },
            
            // Bozze e richieste
            drafts: {
                currentBozzaId: null,
                currentLock: null,
                autosaveTimer: null,
                lockTimer: null,
                hasUnsavedChanges: false
            },
            
            // Database cache
            cache: {
                artists: [],
                venues: [],
                invoiceData: [],
                provinces: [],
                cities: {},
                caps: {},
                lastUpdated: null
            },
            
            // Statistiche dashboard
            stats: {
                bozzeCount: 0,
                richiesteCount: 0,
                agibilitaMese: 0,
                lastStatsUpdate: null
            }
        };
        
        // Listeners per cambiamenti di stato
        this.listeners = new Map();
        
        console.log('✅ StateManager inizializzato');
    }
    
    /**
     * Aggiorna un valore nello stato
     * @param {string} path - Percorso nel formato "parent.child" o "key"
     * @param {*} value - Nuovo valore
     * @param {boolean} notify - Se notificare i listeners (default: true)
     */
    update(path, value, notify = true) {
        try {
            const keys = path.split('.');
            let current = this.state;
            
            // Naviga fino al penultimo livello
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            // Aggiorna il valore finale
            const lastKey = keys[keys.length - 1];
            const oldValue = current[lastKey];
            current[lastKey] = value;
            
            // Notifica i listeners se richiesto
            if (notify) {
                this.notifyListeners(path, value, oldValue);
            }
            
            // Log per debug
            if (this.state.ui.debugMode) {
                console.log(`🗄️ State Update: ${path} =`, value);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Errore aggiornamento stato:', error);
            return false;
        }
    }
    
    /**
     * Ottiene un valore dallo stato
     * @param {string} path - Percorso nel formato "parent.child" o "key"
     * @returns {*} Valore richiesto o undefined
     */
    get(path) {
        try {
            const keys = path.split('.');
            let current = this.state;
            
            for (const key of keys) {
                if (current === null || current === undefined) {
                    return undefined;
                }
                current = current[key];
            }
            
            return current;
        } catch (error) {
            console.error('❌ Errore lettura stato:', error);
            return undefined;
        }
    }
    
    /**
     * Ottiene tutto lo stato (copia profonda)
     * @returns {object} Copia dello stato completo
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    /**
     * Reset dello stato a valori iniziali
     * @param {boolean} keepSession - Mantiene i dati di sessione (default: true)
     */
    reset(keepSession = true) {
        console.log('🔄 Reset stato sistema...');
        
        const sessionBackup = keepSession ? { ...this.state.userSession } : {};
        
        // Reset artisti e dati
        this.state.selectedArtists = [];
        this.state.compensiConfermati.clear();
        
        // Reset dati agibilità
        this.state.agibilitaData = {
            isModifica: false,
            codiceAgibilita: null,
            numeroRiservato: null,
            reservationId: null,
            reservationExpires: null,
            warningTimer: null,
            dataInizio: null,
            dataFine: null
        };
        
        // Reset dati località
        this.state.locationData = {
            nomeVenue: '',
            indirizzoVenue: '',
            provincia: '',
            citta: '',
            cap: '',
            codiceBelfiore: '',
            cittaNome: ''
        };
        
        // Reset dati fatturazione
        this.state.invoiceData = {
            ragioneSociale: '',
            codiceFiscaleAzienda: '',
            partitaIva: '',
            indirizzoFatturazione: '',
            cittaFatturazione: '',
            capFatturazione: ''
        };
        
        // Reset UI
        this.state.ui.activeModal = null;
        this.state.ui.isLoading = false;
        this.state.currentSection = 'homeSection';
        this.state.currentStep = 0;
        
        // Reset drafts
        this.state.drafts = {
            currentBozzaId: null,
            currentLock: null,
            autosaveTimer: null,
            lockTimer: null,
            hasUnsavedChanges: false
        };
        
        // Ripristina sessione se richiesto
        if (keepSession) {
            this.state.userSession = sessionBackup;
        }
        
        this.notifyListeners('reset', true);
        console.log('✅ Stato resettato');
    }
    
    /**
     * Aggiunge un listener per cambiamenti di stato
     * @param {string} path - Percorso da monitorare
     * @param {function} callback - Funzione da chiamare al cambiamento
     * @returns {string} ID del listener per rimozione
     */
    addListener(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Map());
        }
        
        const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.listeners.get(path).set(listenerId, callback);
        
        return listenerId;
    }
    
    /**
     * Rimuove un listener
     * @param {string} path - Percorso del listener
     * @param {string} listenerId - ID del listener da rimuovere
     */
    removeListener(path, listenerId) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).delete(listenerId);
            
            // Rimuovi la mappa se vuota
            if (this.listeners.get(path).size === 0) {
                this.listeners.delete(path);
            }
        }
    }
    
    /**
     * Notifica tutti i listeners per un percorso
     * @param {string} path - Percorso modificato
     * @param {*} newValue - Nuovo valore
     * @param {*} oldValue - Valore precedente
     */
    notifyListeners(path, newValue, oldValue = null) {
        // Notifica listeners specifici per questo path
        if (this.listeners.has(path)) {
            this.listeners.get(path).forEach((callback, listenerId) => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`❌ Errore listener ${listenerId}:`, error);
                }
            });
        }
        
        // Notifica listeners generici (path '*')
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach((callback, listenerId) => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`❌ Errore listener globale ${listenerId}:`, error);
                }
            });
        }
    }
    
    /**
     * Aggiunge un artista alla lista selezionati
     * @param {object} artist - Dati artista
     * @returns {boolean} True se aggiunto con successo
     */
    addArtist(artist) {
        try {
            // Controlla duplicati per CF o CF_temp
            const isDuplicate = this.state.selectedArtists.some(existing => 
                (artist.CF && existing.CF === artist.CF) ||
                (artist.CF_temp && existing.CF_temp === artist.CF_temp)
            );
            
            if (isDuplicate) {
                console.warn('⚠️ Artista già presente nella lista');
                return false;
            }
            
            // Aggiungi artista con dati default
            const artistWithDefaults = {
                ...artist,
                ruolo: artist.ruolo || '',
                compenso: artist.compenso || 0,
                tipoRapporto: artist.tipoRapporto || 'occasionale',
                matricolaEnpals: artist.matricolaEnpals || '',
                index: this.state.selectedArtists.length
            };
            
            this.state.selectedArtists.push(artistWithDefaults);
            this.notifyListeners('selectedArtists', this.state.selectedArtists);
            
            console.log(`✅ Artista aggiunto: ${artist.nome} ${artist.cognome}`);
            return true;
        } catch (error) {
            console.error('❌ Errore aggiunta artista:', error);
            return false;
        }
    }
    
    /**
     * Rimuove un artista dalla lista
     * @param {number} index - Indice dell'artista da rimuovere
     * @returns {boolean} True se rimosso con successo
     */
    removeArtist(index) {
        try {
            if (index < 0 || index >= this.state.selectedArtists.length) {
                console.warn('⚠️ Indice artista non valido');
                return false;
            }
            
            const removedArtist = this.state.selectedArtists.splice(index, 1)[0];
            
            // Ricostruisci indici
            this.state.selectedArtists.forEach((artist, i) => {
                artist.index = i;
            });
            
            // Rimuovi eventuali conferme compensi per questo artista
            this.state.compensiConfermati.delete(index);
            
            this.notifyListeners('selectedArtists', this.state.selectedArtists);
            
            console.log(`✅ Artista rimosso: ${removedArtist.nome} ${removedArtist.cognome}`);
            return true;
        } catch (error) {
            console.error('❌ Errore rimozione artista:', error);
            return false;
        }
    }
    
    /**
     * Aggiorna un artista nella lista
     * @param {number} index - Indice dell'artista
     * @param {object} updates - Aggiornamenti da applicare
     * @returns {boolean} True se aggiornato con successo
     */
    updateArtist(index, updates) {
        try {
            if (index < 0 || index >= this.state.selectedArtists.length) {
                console.warn('⚠️ Indice artista non valido');
                return false;
            }
            
            const artist = this.state.selectedArtists[index];
            Object.assign(artist, updates);
            
            this.notifyListeners('selectedArtists', this.state.selectedArtists);
            this.notifyListeners(`selectedArtists.${index}`, artist);
            
            return true;
        } catch (error) {
            console.error('❌ Errore aggiornamento artista:', error);
            return false;
        }
    }
    
    /**
     * Calcola il compenso totale di tutti gli artisti
     * @returns {number} Compenso totale
     */
    getTotalCompensation() {
        return this.state.selectedArtists.reduce((total, artist) => {
            return total + (parseFloat(artist.compenso) || 0);
        }, 0);
    }
    
    /**
     * Verifica se tutti i dati obbligatori sono presenti per un step
     * @param {number} stepNumber - Numero dello step (1-3)
     * @returns {boolean} True se lo step è completo
     */
    isStepComplete(stepNumber) {
        switch (stepNumber) {
            case 1: // Artisti
                return this.state.selectedArtists.length > 0 &&
                       this.state.selectedArtists.every(artist => artist.ruolo);
            
            case 2: // Località
                const location = this.state.locationData;
                const invoice = this.state.invoiceData;
                return location.nomeVenue && location.indirizzoVenue && 
                       location.provincia && location.citta && location.cap &&
                       invoice.ragioneSociale && invoice.codiceFiscaleAzienda &&
                       this.state.agibilitaData.dataInizio && this.state.agibilitaData.dataFine;
            
            case 3: // Riepilogo
                return this.isStepComplete(1) && this.isStepComplete(2);
            
            default:
                return false;
        }
    }
    
    /**
     * Esporta lo stato corrente per il salvataggio
     * @returns {object} Stato serializzabile
     */
    exportForSave() {
        return {
            selectedArtists: this.state.selectedArtists,
            agibilitaData: this.state.agibilitaData,
            locationData: this.state.locationData,
            invoiceData: this.state.invoiceData,
            currentStep: this.state.currentStep,
            compensiConfermati: Array.from(this.state.compensiConfermati),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Importa uno stato salvato
     * @param {object} savedState - Stato da importare
     * @returns {boolean} True se importato con successo
     */
    importFromSave(savedState) {
        try {
            if (savedState.selectedArtists) {
                this.state.selectedArtists = savedState.selectedArtists;
            }
            
            if (savedState.agibilitaData) {
                Object.assign(this.state.agibilitaData, savedState.agibilitaData);
            }
            
            if (savedState.locationData) {
                Object.assign(this.state.locationData, savedState.locationData);
            }
            
            if (savedState.invoiceData) {
                Object.assign(this.state.invoiceData, savedState.invoiceData);
            }
            
            if (savedState.currentStep !== undefined) {
                this.state.currentStep = savedState.currentStep;
            }
            
            if (savedState.compensiConfermati) {
                this.state.compensiConfermati = new Set(savedState.compensiConfermati);
            }
            
            this.notifyListeners('import', savedState);
            console.log('✅ Stato importato da salvataggio');
            return true;
        } catch (error) {
            console.error('❌ Errore importazione stato:', error);
            return false;
        }
    }
    
    /**
     * Debug: stampa lo stato corrente
     */
    debug() {
        console.group('🗄️ Debug StateManager');
        console.log('Current Section:', this.state.currentSection);
        console.log('Current Step:', this.state.currentStep);
        console.log('Selected Artists:', this.state.selectedArtists.length);
        console.log('Location Data:', this.state.locationData);
        console.log('Invoice Data:', this.state.invoiceData);
        console.log('Agibilità Data:', this.state.agibilitaData);
        console.log('UI State:', this.state.ui);
        console.log('Listeners:', this.listeners.size);
        console.groupEnd();
    }
}

// Esporta classe principale
export default StateManager;

console.log('✅ StateManager module loaded');