// supabase-config.js - Configurazione Database RECORP
// Versione con Singleton Pattern per evitare istanze multiple
// ==================== CONFIGURAZIONE SUPABASE ====================

// 🔧 INSERISCI QUI LE TUE CREDENZIALI SUPABASE
const SUPABASE_CONFIG = {
    url: 'https://nommluymuwioddhaujxu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbW1sdXltdXdpb2RkaGF1anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDgzMDQsImV4cCI6MjA1MzM4NDMwNH0.ke-LvKK6bB7hvJzF1Lkl8AvLpM95U3wGqR8j4cAyXso'
};

// ==================== IMPORTAZIONE SUPABASE ====================
// 🚨 SINGLETON PATTERN - Una sola istanza globale
let supabaseInstance = null;

async function initializeSupabase() {
    if (supabaseInstance) {
        return supabaseInstance; // Restituisce istanza esistente
    // Calcola percentuale completamento bozza
    calculateCompletamento(bozzaData) {
        let campiTotali = 0;
        let campiCompilati = 0;
        
        // Controlla artisti
        if (bozzaData.artisti && bozzaData.artisti.length > 0) {
            campiCompilati += 2;
        }
        campiTotali += 2;
        
        // Controlla date
        if (bozzaData.dataInizio) campiCompilati++;
        if (bozzaData.dataFine) campiCompilati++;
        campiTotali += 2;
        
        // Controlla locale
        if (bozzaData.locale) {
            if (bozzaData.locale.descrizione) campiCompilati++;
            if (bozzaData.locale.indirizzo) campiCompilati++;
            if (bozzaData.locale.citta) campiCompilati++;
            if (bozzaData.locale.cap) campiCompilati++;
            if (bozzaData.locale.provincia) campiCompilati++;
        }
        campiTotali += 5;
        
        // Controlla fatturazione
        if (bozzaData.fatturazione) {
            if (bozzaData.fatturazione.ragioneSociale) campiCompilati++;
            if (bozzaData.fatturazione.indirizzo) campiCompilati++;
            if (bozzaData.fatturazione.citta) campiCompilati++;
            if (bozzaData.fatturazione.cap) campiCompilati++;
            if (bozzaData.fatturazione.provincia) campiCompilati++;
        }
        campiTotali += 5;
        
        return Math.round((campiCompilati / campiTotali) * 100);
    }

    // ==================== COMPATIBILITÀ FALLBACK METHODS ====================
    
    // Mantiene compatibilità con il metodo esistente
    async reserveAgibilitaNumber() {
        const result = await this.reserveAgibilitaNumberSafe();
        return result.numero ? `AG-${result.anno}-${String(result.numero).padStart(3, '0')}` : result.codice;
    }

    async getAgibilita(filtri = {}) {
        try {
            await this.init();
            
            let query = this.supabase.from('agibilita').select('*');
            
            if (filtri.anno) {
                query = query.eq('anno', filtri.anno);
            }
            
            if (filtri.numero) {
                query = query.eq('numero', filtri.numero);
            }
            
            query = query.order('numero', { ascending: false });
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Errore caricamento agibilità:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Errore caricamento agibilità:', error);
            return { success: false, error: error.message };
        }
    }

    try {
        // Import dinamico per evitare conflitti
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        
        // Crea istanza SOLO se non esiste
        supabaseInstance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: localStorage,
                storageKey: 'recorp-auth' // Chiave univoca per evitare conflitti
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'X-Client-Info': 'recorp-app@1.0.0'
                }
            }
        });

        console.log('✅ Supabase Client inizializzato (Singleton)');
        return supabaseInstance;
    } catch (error) {
        console.error('❌ Errore inizializzazione Supabase:', error);
        throw error;
    }
}

// ==================== CLASSE DATABASE SERVICE ====================
class DatabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.initPromise = null; // Promise per evitare inizializzazioni multiple
    }

    async init() {
        // Se già inizializzato, restituisce istanza esistente
        if (this.initialized && this.supabase) {
            return this.supabase;
        }

        // Se inizializzazione in corso, aspetta quella esistente
        if (this.initPromise) {
            return await this.initPromise;
        }

        // Avvia nuova inizializzazione
        this.initPromise = this._performInit();
        return await this.initPromise;
    }

    async _performInit() {
        try {
            this.supabase = await initializeSupabase();
            this.initialized = true;
            
            // Setup listener eventi auth una sola volta
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log(`🔐 Auth Event: ${event}`, session ? 'User logged in' : 'User logged out');
            });

            return this.supabase;
        } catch (error) {
            console.error('❌ Errore init DatabaseService:', error);
            this.initPromise = null; // Reset per retry
            throw error;
        }
    }

    // Metodo per ottenere client Supabase
    getSupabaseClient() {
        if (!this.initialized || !this.supabase) {
            console.warn('⚠️  DatabaseService non inizializzato. Chiamare init() prima.');
            return null;
        }
        return this.supabase;
    }

    // Test connessione semplificato
    async testConnection() {
        try {
            if (!this.supabase) {
                await this.init();
            }

            // Test semplice con getSession (non richiede autenticazione)
            const { data, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Errore test connessione:', error);
                return { success: false, error: error.message };
            }

            return { 
                success: true, 
                message: 'Connessione Supabase OK',
                sessionExists: !!data.session
            };
        } catch (error) {
            console.error('❌ Errore test connessione:', error);
            return { 
                success: false, 
                error: error.message || 'Errore sconosciuto'
            };
        }
    }

    // ==================== SISTEMA NUMERAZIONE THREAD-SAFE ====================
    
    async reserveAgibilitaNumberSafe(anno = new Date().getFullYear()) {
        try {
            await this.init();
            
            const { data, error } = await this.supabase
                .rpc('reserve_next_agibilita_number', { anno_param: anno });

            if (error) {
                console.error('❌ Errore prenotazione numero:', error);
                return await this.reserveAgibilitaNumberFallback(anno);
            }

            if (data && data.nuovo_numero) {
                console.log(`✅ Numero ${data.nuovo_numero} riservato per anno ${anno}`);
                return {
                    success: true,
                    numero: data.nuovo_numero,
                    anno: anno,
                    scadenza: new Date(Date.now() + 30 * 60 * 1000) // 30 minuti
                };
            }

            throw new Error('Risposta invalida dal server');
        } catch (error) {
            console.error('❌ Errore sistema numerazione:', error);
            return await this.reserveAgibilitaNumberFallback(anno);
        }
    }

    async confirmAgibilitaNumber(numero, anno) {
        try {
            await this.init();
            
            const userEmail = await this.getCurrentUserEmail();
            const { data, error } = await this.supabase
                .from('agibilita_prenotazioni')
                .update({ stato: 'confermato', data_conferma: new Date().toISOString() })
                .eq('numero', numero)
                .eq('anno', anno)
                .eq('user_email', userEmail)
                .select();

            if (error) {
                console.error('❌ Errore conferma numero:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ Numero ${numero}/${anno} confermato`);
            return { success: true, numero, anno };
        } catch (error) {
            console.error('❌ Errore conferma numero:', error);
            return { success: false, error: error.message };
        }
    }

    async releaseAgibilitaNumber(numero, anno) {
        try {
            await this.init();
            
            const userEmail = await this.getCurrentUserEmail();
            const { error } = await this.supabase
                .from('agibilita_prenotazioni')
                .delete()
                .eq('numero', numero)
                .eq('anno', anno)
                .eq('user_email', userEmail)
                .eq('stato', 'prenotato');

            if (error) {
                console.error('❌ Errore rilascio numero:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ Numero ${numero}/${anno} rilasciato`);
            return { success: true, numero, anno };
        } catch (error) {
            console.error('❌ Errore rilascio numero:', error);
            return { success: false, error: error.message };
        }
    }

    async reserveAgibilitaNumberFallback(anno) {
        console.log('⚠️  Usando fallback per numerazione...');
        
        try {
            await this.init();
            
            // Fallback: cerca ultimo numero dalla tabella agibilita
            const { data: existing, error: selectError } = await this.supabase
                .from('agibilita')
                .select('numero')
                .eq('anno', anno)
                .order('numero', { ascending: false })
                .limit(1);

            if (selectError) {
                console.error('❌ Errore fallback:', selectError);
                return {
                    success: true,
                    numero: 1,
                    anno: anno,
                    fallback: true,
                    scadenza: new Date(Date.now() + 30 * 60 * 1000)
                };
            }

            const ultimoNumero = existing && existing.length > 0 ? existing[0].numero : 0;
            const nuovoNumero = ultimoNumero + 1;

            console.log(`✅ Numero fallback ${nuovoNumero} per anno ${anno}`);
            return {
                success: true,
                numero: nuovoNumero,
                anno: anno,
                fallback: true,
                scadenza: new Date(Date.now() + 30 * 60 * 1000)
            };
        } catch (error) {
            console.error('❌ Errore anche nel fallback:', error);
            return {
                success: true,
                numero: 1,
                anno: anno,
                fallback: true,
                error: 'Usando numero di default',
                scadenza: new Date(Date.now() + 30 * 60 * 1000)
            };
        }
    }

    // ==================== GESTIONE UTENTI E SESSIONI ====================
    
    async getCurrentUserEmail() {
        try {
            if (!this.supabase) await this.init();
            
            const { data: { session } } = await this.supabase.auth.getSession();
            return session?.user?.email || 'anonymous@recorp.local';
        } catch (error) {
            console.error('❌ Errore getting user email:', error);
            return 'anonymous@recorp.local';
        }
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ==================== OPERAZIONI BOZZE ====================
    
    async createBozzaWithReservedNumber(bozzaData, reservedNumber = null) {
        try {
            await this.init();
            
            const userEmail = await this.getCurrentUserEmail();
            const sessionId = this.generateSessionId();
            
            const bozzaCompleta = {
                ...bozzaData,
                user_session: sessionId,
                user_email: userEmail,
                reserved_number: reservedNumber?.numero || null,
                reserved_anno: reservedNumber?.anno || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('agibilita_bozze')
                .insert([bozzaCompleta])
                .select();

            if (error) {
                console.error('❌ Errore creazione bozza:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ Bozza creata con numero riservato: ${reservedNumber?.numero || 'nessuno'}`);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Errore creazione bozza:', error);
            return { success: false, error: error.message };
        }
    }

    async updateBozza(id, bozzaData) {
        try {
            await this.init();
            
            const userEmail = await this.getCurrentUserEmail();
            
            const updates = {
                ...bozzaData,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('agibilita_bozze')
                .update(updates)
                .eq('id', id)
                .eq('user_email', userEmail)
                .select();

            if (error) {
                console.error('❌ Errore update bozza:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Errore update bozza:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== OPERAZIONI AGIBILITA ====================
    
    async saveAgibilita(agibilitaData) {
        try {
            await this.init();
            
            const { data, error } = await this.supabase
                .from('agibilita')
                .insert([{
                    ...agibilitaData,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) {
                console.error('❌ Errore salvataggio agibilità:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Errore salvataggio agibilità:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== ARTISTI ====================
    async getArtists() {
        await this.init();
        const { data, error } = await this.supabase
            .from('artisti')
            .select('*')
            .eq('attivo', true)  // Solo artisti attivi (soft delete)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async getAllArtisti() {
        return await this.getArtists(); // Alias per compatibilità
    }

    async searchArtisti(searchTerm) {
        await this.init();
        const { data, error } = await this.supabase
            .from('artisti')
            .select(`
                id, nome, cognome, nome_arte, codice_fiscale, codice_fiscale_temp,
                mansione, matricola_enpals, nazionalita, telefono, email,
                has_partita_iva, tipo_rapporto, attivo
            `)
            .eq('attivo', true)
            .or(`nome.ilike.%${searchTerm}%,cognome.ilike.%${searchTerm}%,nome_arte.ilike.%${searchTerm}%,codice_fiscale.ilike.%${searchTerm}%,codice_fiscale_temp.ilike.%${searchTerm}%`)
            .limit(20);
        
        if (error) throw error;
        return data || [];
    }

    async saveArtist(artistData) {
        await this.init();
        // Aggiungi timestamp e flag attivo
        const dataToSave = {
            ...artistData,
            attivo: true,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await this.supabase
            .from('artisti')
            .insert([dataToSave])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateArtist(id, artistData) {
        await this.init();
        const dataToUpdate = {
            ...artistData,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await this.supabase
            .from('artisti')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // ==================== VENUES ====================
    async getVenues() {
        await this.init();
        const { data, error } = await this.supabase
            .from('venues')
            .select('*')
            .order('nome');
        
        if (error) throw error;
        return data || [];
    }

    async saveVenue(venueData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('venues')
            .insert([venueData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // ==================== FATTURAZIONE ====================
    async getAllInvoiceData() {
        await this.init();
        const { data, error } = await this.supabase
            .from('invoice_data')
            .select('*')
            .order('last_updated', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async saveInvoiceData(invoiceData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('invoice_data')
            .insert([invoiceData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // ==================== CONTRATTI ====================
    async getContratti(artistaId = null) {
        await this.init();
        let query = this.supabase.from('contratti').select('*');
        if (artistaId) {
            query = query.eq('artista_id', artistaId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async saveContratto(contrattoData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('contratti')
            .insert([{
                ...contrattoData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ==================== PAGAMENTI ====================
    async getPagamenti(filtri = {}) {
        await this.init();
        let query = this.supabase.from('pagamenti').select(`
            *, 
            artisti(nome, cognome, codice_fiscale),
            agibilita(codice, data_inizio, data_fine)
        `);
        
        if (filtri.stato) query = query.eq('stato', filtri.stato);
        if (filtri.anno) {
            const startYear = new Date(filtri.anno, 0, 1).toISOString();
            const endYear = new Date(filtri.anno + 1, 0, 1).toISOString();
            query = query.gte('created_at', startYear).lt('created_at', endYear);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async savePagamento(pagamentoData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('pagamenti')
            .insert([{
                ...pagamentoData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ==================== COMUNICAZIONI INTERMITTENTI ====================
    async getComunicazioniIntermittenti(anno = null) {
        await this.init();
        let query = this.supabase.from('comunicazioni_intermittenti').select('*');
        if (anno) {
            const startYear = new Date(anno, 0, 1).toISOString();
            const endYear = new Date(anno + 1, 0, 1).toISOString();
            query = query.gte('created_at', startYear).lt('created_at', endYear);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async saveComunicazioneIntermittente(comunicazioneData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('comunicazioni_intermittenti')
            .insert([{
                ...comunicazioneData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ==================== EVENTI CALENDARIO ====================
    async getEventiCalendario(dataInizio = null, dataFine = null) {
        await this.init();
        let query = this.supabase.from('eventi_calendario').select('*');
        if (dataInizio) query = query.gte('data_evento', dataInizio);
        if (dataFine) query = query.lte('data_evento', dataFine);
        const { data, error } = await query.order('data_evento', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    // ==================== DOCUMENTI ====================
    async getDocumenti(entitaTipo = null, entitaId = null) {
        await this.init();
        let query = this.supabase.from('documenti').select('*');
        if (entitaTipo && entitaId) {
            query = query.eq('entita_tipo', entitaTipo).eq('entita_id', entitaId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async saveDocumento(documentoData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('documenti')
            .insert([{
                ...documentoData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ==================== NOTIFICHE ====================
    async getNotifiche(utente = null, nonLette = false) {
        await this.init();
        let query = this.supabase.from('notifiche').select('*');
        if (utente) query = query.eq('destinatario', utente);
        if (nonLette) query = query.eq('letta', false);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async inviaNotifica(notificaData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('notifiche')
            .insert([{
                ...notificaData,
                inviata: false,
                letta: false,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async marcaNotificaLetta(notificaId) {
        await this.init();
        const { data, error } = await this.supabase
            .from('notifiche')
            .update({ 
                letta: true, 
                letta_at: new Date().toISOString() 
            })
            .eq('id', notificaId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ==================== STATISTICHE AVANZATE ====================
    async getStatistiche() {
        await this.init();
        
        try {
            // Statistiche parallele per performance
            const [
                artistiStats,
                agibilitaStats, 
                bozzeStats,
                agibilitaMeseStats,
                pagamentiStats
            ] = await Promise.all([
                // Conta artisti attivi
                this.supabase
                    .from('artisti')
                    .select('*', { count: 'exact', head: true })
                    .eq('attivo', true),
                
                // Conta agibilità totali
                this.supabase
                    .from('agibilita')
                    .select('*', { count: 'exact', head: true }),
                
                // Conta bozze non convertite
                this.supabase
                    .from('agibilita_bozze')
                    .select('*', { count: 'exact', head: true }),
                
                // Agibilità del mese corrente
                this.supabase
                    .from('agibilita')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
                
                // Statistiche pagamenti (opzionale, se tabella esiste)
                this.supabase
                    .from('pagamenti')
                    .select('importo_lordo, stato')
                    .eq('stato', 'pagato')
                    .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString())
                    .then(result => result.data || [])
                    .catch(() => []) // Se tabella non esiste
            ]);

            // Calcolo statistiche avanzate
            const totalePagamentiAnno = pagamentiStats.reduce((sum, p) => sum + (p.importo_lordo || 0), 0);
            
            return {
                // Contatori base
                artisti: artistiStats.count || 0,
                agibilita_totali: agibilitaStats.count || 0,
                agibilita_mese: agibilitaMeseStats.count || 0,
                bozze_sospese: bozzeStats.count || 0,
                
                // Statistiche aggiuntive
                artisti_unici_mese: agibilitaMeseStats.count || 0, // TODO: query più precisa
                media_artisti_agibilita: agibilitaStats.count > 0 ? 
                    Math.round((artistiStats.count || 0) / agibilitaStats.count * 10) / 10 : 0,
                artisti_totali_mese: agibilitaMeseStats.count * 3, // Stima
                
                // Metriche business
                fatturato_anno: totalePagamentiAnno,
                agibilita_in_corso: 0, // TODO: implementare
                eventi_prossimi: 0, // TODO: implementare con eventi_calendario
                
                // Metadata
                ultimo_aggiornamento: new Date().toISOString()
            };
            
        } catch (error) {
            console.warn('⚠️ Alcune tabelle potrebbero non esistere ancora:', error);
            
            // Fallback per sviluppo
            return {
                artisti: 0,
                agibilita_totali: 0,
                agibilita_mese: 0,
                bozze_sospese: 0,
                artisti_unici_mese: 0,
                media_artisti_agibilita: 0,
                artisti_totali_mese: 0,
                fatturato_anno: 0,
                agibilita_in_corso: 0,
                eventi_prossimi: 0,
                ultimo_aggiornamento: new Date().toISOString(),
                warning: 'Database in fase di inizializzazione'
            };
        }
    }

    async getAgibilita(filtri = {}) {
        try {
            await this.init();
            
            let query = this.supabase.from('agibilita').select('*');
            
            if (filtri.anno) {
                query = query.eq('anno', filtri.anno);
            }
            
            if (filtri.numero) {
                query = query.eq('numero', filtri.numero);
            }
            
            query = query.order('numero', { ascending: false });
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Errore caricamento agibilità:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Errore caricamento agibilità:', error);
            return { success: false, error: error.message };
        }
    }

    async getBozze(userEmail = null) {
        try {
            await this.init();
            
            const email = userEmail || await this.getCurrentUserEmail();
            
            const { data, error } = await this.supabase
                .from('agibilita_bozze')
                .select('*')
                .eq('user_email', email)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('❌ Errore caricamento bozze:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error) {
            console.error('❌ Errore caricamento bozze:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteBozza(id) {
        try {
            await this.init();
            
            const userEmail = await this.getCurrentUserEmail();
            
            const { error } = await this.supabase
                .from('agibilita_bozze')
                .delete()
                .eq('id', id)
                .eq('user_email', userEmail);

            if (error) {
                console.error('❌ Errore eliminazione bozza:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Errore eliminazione bozza:', error);
            return { success: false, error: error.message };
        }
    }
}

// ==================== ISTANZA SINGLETON ====================
// Una sola istanza globale per tutta l'app
const databaseService = new DatabaseService();

// ==================== EXPORT ====================
export { databaseService as DatabaseService };

// Compatibilità con vecchio codice
export { supabaseInstance as supabase };

// Export diretto del client per compatibilità
export const getSupabaseClient = () => {
    return supabaseInstance;
};

// Funzione di init globale
export const initSupabase = async () => {
    if (!supabaseInstance) {
        await initializeSupabase();
    }
    return supabaseInstance;
};