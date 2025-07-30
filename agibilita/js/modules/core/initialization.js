// initialization.js - Inizializzazione Sistema Agibilità
// Import configurazioni dedicate
import { DatabaseService } from '../../config/supabase-config-agibilita.js';
import { AuthGuard } from '../../config/auth-guard-agibilita.js';

console.log('🚀 Caricamento SystemInitializer...');

export class SystemInitializer {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.initialized = false;
        
        console.log('🚀 SystemInitializer creato');
    }
    
    /**
     * Inizializzazione principale del sistema
     */
    async initialize() {
        try {
            console.log('🔧 Inizializzazione SystemInitializer...');
            
            // Setup sessione utente
            await this.setupUserSession();
            
            // Carica database
            await this.loadDatabases();
            
            // Setup dati località
            await this.setupLocationData();
            
            // Carica statistiche dashboard
            await this.loadDashboardStats();
            
            // Setup date default
            this.setupDefaultDates();
            
            this.initialized = true;
            console.log('✅ SystemInitializer inizializzato con successo');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione SystemInitializer:', error);
            throw error;
        }
    }
    
    /**
     * Setup sessione utente dal sistema di autenticazione
     */
    async setupUserSession() {
        try {
            console.log('👤 Setup sessione utente agibilità...');
            
            // Ottieni utente corrente da AuthGuard dedicato
            const currentUser = await AuthGuard.getCurrentUser();
            if (!currentUser) {
                throw new Error('Utente non autenticato per agibilità');
            }
            
            const userSession = {
                id: currentUser.id,
                email: currentUser.email,
                name: currentUser.name || currentUser.email.split('@')[0],
                permissions: currentUser.permissions || {},
                loginTime: new Date(),
                module: 'agibilita'
            };
            
            // Salva nel state manager
            if (this.stateManager) {
                this.stateManager.update('userSession', userSession);
                console.log('✅ Sessione utente agibilità configurata:', userSession.name);
            }
            
            return userSession;
        } catch (error) {
            console.error('❌ Errore setup sessione utente agibilità:', error);
            throw error;
        }
    }
    
    /**
     * Carica tutti i database necessari
     */
    async loadDatabases() {
        try {
            console.log('🗄️ Caricamento database...');
            
            // Carica in parallelo per performance
            const [artists, venues, invoiceData] = await Promise.all([
                this.loadArtistsDatabase(),
                this.loadVenuesDatabase(), 
                this.loadInvoiceData()
            ]);
            
            console.log('✅ Database caricati:', {
                artists: artists.length,
                venues: venues.length,
                invoiceData: invoiceData.length
            });
            
        } catch (error) {
            console.error('❌ Errore caricamento database:', error);
            // Non bloccare l'inizializzazione per errori database
        }
    }
    
    /**
     * Carica database degli artisti
     */
    async loadArtistsDatabase() {
        try {
            console.log('🎭 Caricamento database artisti agibilità...');
            
            // Usa DatabaseService dedicato agibilità
            const artists = await DatabaseService.getArtistsForAgibilita();
            
            if (this.stateManager) {
                this.stateManager.update('artistsDatabase', artists);
                console.log(`✅ Database artisti caricato: ${artists.length} artisti`);
            }
            
            return artists;
        } catch (error) {
            console.error('❌ Errore caricamento artisti:', error);
            
            // Fallback con dati mock per sviluppo
            const mockArtists = this.getMockArtists();
            if (this.stateManager) {
                this.stateManager.update('artistsDatabase', mockArtists);
                console.log('⚠️ Uso dati artisti mock per sviluppo');
            }
            
            return mockArtists;
        }
    }
    
    /**
     * Carica database venues
     */
    async loadVenuesDatabase() {
        try {
            console.log('🏛️ Caricamento database venues agibilità...');
            
            // Usa DatabaseService dedicato agibilità
            const venues = await DatabaseService.getVenuesForAgibilita();
            
            if (this.stateManager) {
                this.stateManager.update('venuesDatabase', venues);
                console.log(`✅ Database venues caricato: ${venues.length} venues`);
            }
            
            return venues;
        } catch (error) {
            console.error('❌ Errore caricamento venues:', error);
            
            // Fallback con dati mock
            const mockVenues = this.getMockVenues();
            if (this.stateManager) {
                this.stateManager.update('venuesDatabase', mockVenues);
                console.log('⚠️ Uso dati venues mock per sviluppo');
            }
            
            return mockVenues;
        }
    }
    
    /**
     * Carica dati fatturazione
     */
    async loadInvoiceData() {
        try {
            console.log('🧾 Caricamento dati fatturazione agibilità...');
            
            // Usa DatabaseService dedicato agibilità
            const invoiceData = await DatabaseService.getInvoiceDataForAgibilita();
            
            if (this.stateManager) {
                this.stateManager.update('invoiceDatabase', invoiceData);
                console.log(`✅ Dati fatturazione caricati: ${invoiceData.length} record`);
            }
            
            return invoiceData;
        } catch (error) {
            console.error('❌ Errore caricamento dati fatturazione:', error);
            
            // Fallback con dati mock
            const mockInvoiceData = this.getMockInvoiceData();
            if (this.stateManager) {
                this.stateManager.update('invoiceDatabase', mockInvoiceData);
                console.log('⚠️ Uso dati fatturazione mock per sviluppo');
            }
            
            return mockInvoiceData;
        }
    }
    
    /**
     * Setup sistema dati località con GIDatabase
     */
    async setupLocationData() {
        try {
            console.log('📍 Setup sistema località...');
            
            // Per ora usa dati mock - in futuro integrato con GIDatabase
            const locationSystem = {
                provinces: this.getMockProvinces(),
                cities: this.getMockCities(),
                caps: this.getMockCAPs()
            };
            
            if (this.stateManager) {
                this.stateManager.update('locationSystem', locationSystem);
                console.log('✅ Sistema località configurato');
            }
            
        } catch (error) {
            console.error('❌ Errore setup località:', error);
        }
    }
    
    /**
     * Carica statistiche dashboard
     */
    async loadDashboardStats() {
        try {
            console.log('📊 Caricamento statistiche dashboard...');
            
            // Usa DatabaseService per statistiche reali
            const stats = await DatabaseService.getStatisticheAgibilita();
            
            if (this.stateManager) {
                this.stateManager.update('dashboardStats', stats);
                console.log('✅ Statistiche dashboard caricate:', stats);
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Errore caricamento statistiche:', error);
            
            // Fallback con statistiche mock
            const mockStats = this.getMockStats();
            if (this.stateManager) {
                this.stateManager.update('dashboardStats', mockStats);
                console.log('⚠️ Uso statistiche mock per sviluppo');
            }
            
            return mockStats;
        }
    }
    
    /**
     * Setup date di default
     */
    setupDefaultDates() {
        try {
            console.log('📅 Setup date default...');
            
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Formato YYYY-MM-DD per input HTML
            const defaultDates = {
                today: today.toISOString().split('T')[0],
                tomorrow: tomorrow.toISOString().split('T')[0],
                currentMonth: today.toISOString().substring(0, 7), // YYYY-MM
                currentYear: today.getFullYear()
            };
            
            if (this.stateManager) {
                this.stateManager.update('defaultDates', defaultDates);
                console.log('✅ Date default configurate:', defaultDates);
            }
            
        } catch (error) {
            console.error('❌ Errore setup date:', error);
        }
    }
    
    // ==================== DATI MOCK ====================
    
    getMockArtists() {
        return [
            {
                id: 'mock_1',
                nome: 'Mario',
                cognome: 'Rossi',
                nome_arte: 'Mario Red',
                codice_fiscale: 'RSSMRA80A01H501Z',
                mansione: 'Cantante',
                nazionalita: 'Italiana',
                telefono: '+39 333 1234567',
                email: 'mario.rossi@email.com',
                has_partita_iva: false,
                tipo_rapporto: 'occasionale',
                attivo: true
            },
            {
                id: 'mock_2',
                nome: 'Anna',
                cognome: 'Verdi',
                nome_arte: 'Anna Green',
                codice_fiscale: 'VRDNNA85B15F205Y',
                mansione: 'Musicista',
                nazionalita: 'Italiana',
                telefono: '+39 333 2345678',
                email: 'anna.verdi@email.com',
                has_partita_iva: true,
                partita_iva: '12345678901',
                tipo_rapporto: 'collaborazione',
                attivo: true
            },
            {
                id: 'mock_3',
                nome: 'Luca',
                cognome: 'Bianchi',
                nome_arte: 'Luke White',
                codice_fiscale: 'BNCLCU90C20G478X',
                mansione: 'Ballerino',
                nazionalita: 'Italiana',
                telefono: '+39 333 3456789',
                email: 'luca.bianchi@email.com',
                has_partita_iva: false,
                tipo_rapporto: 'occasionale',
                attivo: true
            }
        ];
    }
    
    getMockVenues() {
        return [
            {
                id: 'mock_venue_1',
                nome: 'Teatro dell\'Opera di Roma',
                indirizzo: 'Piazza Beniamino Gigli, 7',
                citta: 'Roma',
                cap: '00184',
                provincia: 'RM',
                telefono: '06 481601',
                email: 'info@operaroma.it'
            },
            {
                id: 'mock_venue_2',
                nome: 'Auditorium Parco della Musica',
                indirizzo: 'Viale Pietro de Coubertin, 30',
                citta: 'Roma',
                cap: '00196',
                provincia: 'RM',
                telefono: '06 80241281',
                email: 'info@auditorium.com'
            },
            {
                id: 'mock_venue_3',
                nome: 'Teatro alla Scala',
                indirizzo: 'Via Filodrammatici, 2',
                citta: 'Milano',
                cap: '20121',
                provincia: 'MI',
                telefono: '02 88791',
                email: 'info@teatroallascala.org'
            }
        ];
    }
    
    getMockInvoiceData() {
        return [
            {
                id: 'mock_invoice_1',
                ragione_sociale: 'OKL SRL - RECORP',
                codice_fiscale: '04433920248',
                partita_iva: '04433920248',
                indirizzo: 'Via Roma, 123',
                citta: 'Milano',
                cap: '20121',
                provincia: 'MI',
                telefono: '02 12345678',
                email: 'amministrazione@recorp.it',
                is_default: true,
                last_updated: new Date().toISOString()
            },
            {
                id: 'mock_invoice_2',
                ragione_sociale: 'RECORP EVENTI SRL',
                codice_fiscale: '12345678901',
                partita_iva: '12345678901',
                indirizzo: 'Via Milano, 456',
                citta: 'Roma',
                cap: '00100',
                provincia: 'RM',
                telefono: '06 87654321',
                email: 'eventi@recorp.it',
                is_default: false,
                last_updated: new Date().toISOString()
            }
        ];
    }
    
    getMockProvinces() {
        return [
            { code: 'RM', name: 'Roma' },
            { code: 'MI', name: 'Milano' },
            { code: 'NA', name: 'Napoli' },
            { code: 'TO', name: 'Torino' },
            { code: 'PA', name: 'Palermo' },
            { code: 'GE', name: 'Genova' },
            { code: 'BO', name: 'Bologna' },
            { code: 'FI', name: 'Firenze' },
            { code: 'BA', name: 'Bari' },
            { code: 'CT', name: 'Catania' }
        ];
    }
    
    getMockCities() {
        return {
            'RM': [
                { name: 'Roma', cap: ['00100', '00118', '00119', '00120', '00121'] },
                { name: 'Tivoli', cap: ['00019'] },
                { name: 'Frascati', cap: ['00044'] }
            ],
            'MI': [
                { name: 'Milano', cap: ['20100', '20121', '20122', '20123', '20124'] },
                { name: 'Monza', cap: ['20900'] },
                { name: 'Bergamo', cap: ['24100'] }
            ],
            'NA': [
                { name: 'Napoli', cap: ['80100', '80121', '80122', '80123'] },
                { name: 'Caserta', cap: ['81100'] },
                { name: 'Salerno', cap: ['84100'] }
            ]
        };
    }
    
    getMockCAPs() {
        return {
            'Roma': ['00100', '00118', '00119', '00120', '00121', '00184', '00196'],
            'Milano': ['20100', '20121', '20122', '20123', '20124'],
            'Napoli': ['80100', '80121', '80122', '80123'],
            'Torino': ['10100', '10121', '10122'],
            'Palermo': ['90100', '90121', '90122'],
            'Genova': ['16100', '16121', '16122'],
            'Bologna': ['40100', '40121', '40122'],
            'Firenze': ['50100', '50121', '50122'],
            'Bari': ['70100', '70121', '70122'],
            'Catania': ['95100', '95121', '95122']
        };
    }
    
    getMockStats() {
        return {
            agibilita_totali: 156,
            agibilita_anno: 45,
            bozze_attive: 8,
            cache_size: 0,
            ultimo_aggiornamento: new Date().toISOString(),
            module: 'agibilita',
            warning: 'Dati mock per sviluppo'
        };
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Verifica se il sistema è inizializzato
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Ricarica tutti i database
     */
    async reloadDatabases() {
        console.log('🔄 Ricarica database...');
        await this.loadDatabases();
        console.log('✅ Database ricaricati');
    }
    
    /**
     * Aggiorna statistiche dashboard
     */
    async refreshStats() {
        console.log('📊 Aggiornamento statistiche...');
        await this.loadDashboardStats();
        console.log('✅ Statistiche aggiornate');
    }
    
    /**
     * Debug system initializer
     */
    debug() {
        const state = this.stateManager ? this.stateManager.getAll() : {};
        
        return {
            initialized: this.initialized,
            stateManager: !!this.stateManager,
            databases: {
                artists: state.artistsDatabase?.length || 0,
                venues: state.venuesDatabase?.length || 0,
                invoiceData: state.invoiceDatabase?.length || 0
            },
            userSession: state.userSession || null,
            dashboardStats: state.dashboardStats || null,
            locationSystem: !!state.locationSystem,
            defaultDates: state.defaultDates || null
        };
    }
    
    /**
     * Cleanup system initializer
     */
    cleanup() {
        // Reset initialization flag
        this.initialized = false;
        
        console.log('🧹 SystemInitializer cleanup completato');
    }
}

// Esporta classe
export default SystemInitializer;

console.log('✅ SystemInitializer module loaded');