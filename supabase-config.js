// supabase-config.js - Configurazione Database RECORP
// Versione integrata con numerazione thread-safe e supporto login

// ==================== CONFIGURAZIONE SUPABASE ====================
const SUPABASE_CONFIG = {
    url: 'https://nommluymuwioddhaujxu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbW1sdXltdXdpb2RkaGF1anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODA5MjgsImV4cCI6MjA2NzU1NjkyOH0.oaF5uaNe21W8NU67n1HjngngMUClkss2achTQ7BZ5tE'
};

// ==================== INIZIALIZZAZIONE SUPABASE ====================
let supabase = null;
let isInitialized = false;

// Inizializza Supabase
async function initializeSupabase() {
    try {
        // Verifica che le credenziali siano state configurate
        if (SUPABASE_CONFIG.url.includes('TUO-PROGETTO') || 
            SUPABASE_CONFIG.anonKey.includes('TUA-CHIAVE')) {
            throw new Error('⚠️ CREDENZIALI NON CONFIGURATE: Sostituisci URL e chiave nel file supabase-config.js');
        }

        // Inizializza client Supabase con opzioni auth
        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );

        // Test connessione
        const { data, error } = await supabase
            .from('artisti')
            .select('count')
            .limit(1);

        if (error && error.code !== '42P01') { // 42P01 = relation does not exist (tabella non esiste ancora)
            throw error;
        }

        isInitialized = true;
        console.log('✅ Supabase inizializzato correttamente');
        console.log('🔗 URL:', SUPABASE_CONFIG.url);
        console.log('🔑 Chiave configurata:', SUPABASE_CONFIG.anonKey.substring(0, 20) + '...');
        
        return supabase;

    } catch (error) {
        console.error('❌ Errore inizializzazione Supabase:', error);
        
        // Mostra messaggio di errore user-friendly
        showConfigurationError(error.message);
        throw error;
    }
}

// Mostra errore di configurazione
function showConfigurationError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'supabase-config-error';
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #dc2626;
        color: white;
        padding: 1rem;
        text-align: center;
        z-index: 9999;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    
    errorDiv.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            🚨 <strong>Configurazione Supabase Richiesta</strong><br>
            <span style="font-weight: normal; font-size: 0.9rem;">${message}</span><br>
            <small style="opacity: 0.9;">Modifica il file supabase-config.js con le tue credenziali</small>
        </div>
    `;
    
    // Rimuovi errore precedente se esiste
    const existing = document.getElementById('supabase-config-error');
    if (existing) existing.remove();
    
    document.body.prepend(errorDiv);
}

// ==================== DATABASE SERVICE ====================
export const DatabaseService = {
    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        if (!isInitialized) {
            await initializeSupabase();
        }
        return supabase;
    },

    // Verifica se è inizializzato
    isReady() {
        return isInitialized && supabase !== null;
    },

    // ✅ AGGIUNTO: Metodo per ottenere il client Supabase (necessario per login)
    getSupabaseClient() {
        return supabase;
    },

    // ✅ AGGIUNTO: Test connessione migliorato per login
    async testConnection() {
        try {
            if (!supabase) {
                return {
                    connected: false,
                    authenticated: false,
                    error: 'Client Supabase non configurato'
                };
            }

            // Test connessione con auth check
            const { data: { session }, error } = await supabase.auth.getSession();
            
            // Test accesso database
            const { data: dbTest, error: dbError } = await supabase
                .from('artisti')
                .select('count')
                .limit(1);
            
            return {
                connected: !dbError || dbError.code === '42P01', // OK se tabella non esiste ancora
                authenticated: !!session,
                user: session?.user || null,
                error: error?.message || dbError?.message || null,
                database_accessible: !dbError
            };
        } catch (error) {
            return {
                connected: false,
                authenticated: false,
                error: error.message,
                database_accessible: false
            };
        }
    },

    // ==================== ARTISTI ====================
    async getArtists() {
        await this.init();
        const { data, error } = await supabase
            .from('artisti')
            .select('*')
            .eq('attivo', true)  // Solo artisti attivi (soft delete)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async getAllArtisti() {
        return await this.getArtists(); // Alias per compatibilità
    },

    async searchArtisti(searchTerm) {
        await this.init();
        const { data, error } = await supabase
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
    },

    async saveArtist(artistData) {
        await this.init();
        // Aggiungi timestamp e flag attivo
        const dataToSave = {
            ...artistData,
            attivo: true,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('artisti')
            .insert([dataToSave])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async updateArtist(id, artistData) {
        await this.init();
        const dataToUpdate = {
            ...artistData,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('artisti')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // ==================== AGIBILITÀ ====================
    async getAgibilita() {
        await this.init();
        const { data, error } = await supabase
            .from('agibilita')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async saveAgibilita(agibilitaData) {
        await this.init();
        const { data, error } = await supabase
            .from('agibilita')
            .insert([agibilitaData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // ==================== NUMERAZIONE THREAD-SAFE ====================
    
    // ✅ AGGIUNTO: Sistema numerazione thread-safe
    async reserveAgibilitaNumberSafe() {
        await this.init();
        
        const currentYear = new Date().getFullYear();
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            try {
                // STEP 1: Ottieni e incrementa atomicamente il numero
                const { data, error } = await supabase.rpc('reserve_next_agibilita_number', {
                    target_year: currentYear
                });
                
                if (error) {
                    // Se la funzione non esiste, usa il metodo fallback
                    if (error.code === '42883') { // function does not exist
                        console.warn('⚠️ Funzione PostgreSQL non trovata, uso metodo fallback');
                        return await this.reserveAgibilitaNumberFallback();
                    }
                    throw error;
                }
                
                const numeroProgressivo = data.nuovo_numero;
                const codiceAgibilita = `AG-${currentYear}-${String(numeroProgressivo).padStart(3, '0')}`;
                
                // STEP 2: Registra immediatamente la prenotazione
                const prenotazione = {
                    codice: codiceAgibilita,
                    anno: currentYear,
                    numero_progressivo: numeroProgressivo,
                    stato: 'riservato',
                    riservato_da: await this.getCurrentUserEmail(),
                    riservato_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minuti
                    session_id: this.generateSessionId()
                };
                
                const { data: reserved, error: reserveError } = await supabase
                    .from('agibilita_prenotazioni')
                    .insert([prenotazione])
                    .select()
                    .single();
                
                if (reserveError) {
                    // Se la tabella non esiste, usa fallback
                    if (reserveError.code === '42P01') { // relation does not exist
                        console.warn('⚠️ Tabella prenotazioni non trovata, uso metodo fallback');
                        return await this.reserveAgibilitaNumberFallback();
                    }
                    
                    console.warn(`⚠️ Tentativo ${attempts + 1}: Numero ${codiceAgibilita} già prenotato`);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                
                console.log(`✅ Numero agibilità riservato: ${codiceAgibilita}`);
                return {
                    codice: codiceAgibilita,
                    numero_progressivo: numeroProgressivo,
                    reservation_id: reserved.id,
                    expires_at: prenotazione.expires_at
                };
                
            } catch (error) {
                console.error(`❌ Tentativo ${attempts + 1} fallito:`, error);
                attempts++;
                
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 200 * attempts));
                }
            }
        }
        
        throw new Error('Impossibile riservare numero agibilità dopo ' + maxAttempts + ' tentativi');
    },

    // ✅ AGGIUNTO: Metodo fallback se le tabelle thread-safe non esistono
    async reserveAgibilitaNumberFallback() {
        console.log('🔄 Uso metodo numerazione fallback');
        const year = new Date().getFullYear();
        const agibilita = await this.getAgibilita();
        const yearAgibilita = agibilita.filter(a => 
            a.created_at && new Date(a.created_at).getFullYear() === year
        );
        const nextNumber = yearAgibilita.length + 1;
        const codice = `AG-${year}-${String(nextNumber).padStart(3, '0')}`;
        
        return {
            codice: codice,
            numero_progressivo: nextNumber,
            reservation_id: null, // Nessuna prenotazione nel fallback
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        };
    },

    // Mantiene compatibilità con il metodo esistente
    async reserveAgibilitaNumber() {
        const result = await this.reserveAgibilitaNumberSafe();
        return result.codice;
    },

    // ✅ AGGIUNTO: Conferma utilizzo numero riservato
    async confirmAgibilitaNumber(reservationId, agibilitaId) {
        if (!reservationId) return true; // Fallback mode, niente da confermare
        
        await this.init();
        
        const { data, error } = await supabase
            .from('agibilita_prenotazioni')
            .update({
                stato: 'utilizzato',
                agibilita_id: agibilitaId,
                updated_at: new Date().toISOString()
            })
            .eq('id', reservationId)
            .eq('stato', 'riservato')
            .select()
            .single();
        
        if (error) {
            console.error('❌ Errore conferma numero:', error);
            throw error;
        }
        
        console.log('✅ Numero agibilità confermato come utilizzato');
        return data;
    },

    // ✅ AGGIUNTO: Rilascia numero riservato
    async releaseAgibilitaNumber(reservationId) {
        if (!reservationId) return true; // Fallback mode, niente da rilasciare
        
        await this.init();
        
        const { error } = await supabase
            .from('agibilita_prenotazioni')
            .update({
                stato: 'rilasciato',
                updated_at: new Date().toISOString()
            })
            .eq('id', reservationId)
            .eq('stato', 'riservato');
        
        if (error) {
            console.error('❌ Errore rilascio numero:', error);
            return false;
        }
        
        console.log('✅ Numero agibilità rilasciato');
        return true;
    },

    // ✅ AGGIUNTO: Utility per utente corrente
    async getCurrentUserEmail() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user?.email || 'unknown';
        } catch {
            return 'unknown';
        }
    },
    
    // ✅ AGGIUNTO: Genera ID sessione
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    // ==================== VENUES ====================
    async getVenues() {
        await this.init();
        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .order('nome');
        
        if (error) throw error;
        return data || [];
    },

    async saveVenue(venueData) {
        await this.init();
        const { data, error } = await supabase
            .from('venues')
            .insert([venueData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // ==================== FATTURAZIONE ====================
    async getAllInvoiceData() {
        await this.init();
        const { data, error } = await supabase
            .from('invoice_data')
            .select('*')
            .order('last_updated', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async saveInvoiceData(invoiceData) {
        await this.init();
        const { data, error } = await supabase
            .from('invoice_data')
            .insert([invoiceData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // ==================== BOZZE AGIBILITÀ ====================
    async getBozze() {
        await this.init();
        const { data, error } = await supabase
            .from('bozze_agibilita')  // Nome corretto secondo documentazione
            .select('*')
            .order('updated_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async createBozza(bozzaData, userSession) {
        await this.init();
        const bozza = {
            data: bozzaData,
            created_by: userSession.id,
            created_by_name: userSession.name,
            locked_by: userSession.id,
            locked_by_name: userSession.name,
            locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 ora
            completamento_percentuale: this.calculateCompletamento(bozzaData),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('bozze_agibilita')
            .insert([bozza])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // ✅ AGGIUNTO: Crea bozza con numero riservato
    async createBozzaWithReservedNumber(bozzaData, userSession) {
        await this.init();
        
        const bozza = {
            data: {
                ...bozzaData,
                // Includi dati numerazione se presenti
                numeroRiservato: bozzaData.numeroRiservato,
                reservationId: bozzaData.reservationId,
                reservationExpires: bozzaData.reservationExpires
            },
            codice_riservato: bozzaData.numeroRiservato || null,
            reservation_id: bozzaData.reservationId || null,
            created_by: userSession.id,
            created_by_name: userSession.name,
            locked_by: userSession.id,
            locked_by_name: userSession.name,
            locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            completamento_percentuale: this.calculateCompletamento(bozzaData),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('bozze_agibilita')
            .insert([bozza])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async updateBozza(bozzaId, bozzaData, userSession = null) {
        await this.init();
        const updateData = {
            data: bozzaData,
            completamento_percentuale: this.calculateCompletamento(bozzaData),
            updated_at: new Date().toISOString()
        };

        // Se fornito userSession, aggiorna anche i dati lock
        if (userSession) {
            updateData.locked_by = userSession.id;
            updateData.locked_by_name = userSession.name;
            updateData.locked_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }

        const { data, error } = await supabase
            .from('bozze_agibilita')
            .update(updateData)
            .eq('id', bozzaId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async deleteBozza(bozzaId) {
        await this.init();
        const { error } = await supabase
            .from('bozze_agibilita')
            .delete()
            .eq('id', bozzaId);
        
        if (error) throw error;
        return true;
    },

    async lockBozza(bozzaId, userSession) {
        await this.init();
        
        // Verifica se già bloccata
        const { data: existing } = await supabase
            .from('bozze_agibilita')
            .select('locked_by, locked_until, locked_by_name')
            .eq('id', bozzaId)
            .single();

        if (existing && existing.locked_until > new Date().toISOString() && 
            existing.locked_by !== userSession.id) {
            return {
                success: false,
                locked_by: existing.locked_by_name || existing.locked_by
            };
        }

        // Blocca la bozza
        const lockUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('bozze_agibilita')
            .update({
                locked_by: userSession.id,
                locked_by_name: userSession.name,
                locked_until: lockUntil
            })
            .eq('id', bozzaId)
            .select()
            .single();

        if (error) throw error;
        
        return {
            success: true,
            lock: {
                id: userSession.id,
                until: lockUntil
            }
        };
    },

    async unlockBozza(bozzaId) {
        await this.init();
        const { data, error } = await supabase
            .from('bozze_agibilita')
            .update({
                locked_by: null,
                locked_by_name: null,
                locked_until: null
            })
            .eq('id', bozzaId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async renewLock(bozzaId, lock) {
        await this.init();
        const newLockUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('bozze_agibilita')
            .update({
                locked_until: newLockUntil
            })
            .eq('id', bozzaId)
            .eq('locked_by', lock.id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

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
    },

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
                supabase
                    .from('artisti')
                    .select('*', { count: 'exact', head: true })
                    .eq('attivo', true),
                
                // Conta agibilità totali
                supabase
                    .from('agibilita')
                    .select('*', { count: 'exact', head: true }),
                
                // Conta bozze non convertite
                supabase
                    .from('bozze_agibilita')
                    .select('*', { count: 'exact', head: true }),
                
                // Agibilità del mese corrente
                supabase
                    .from('agibilita')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
                
                // Statistiche pagamenti (opzionale, se tabella esiste)
                supabase
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
    },

    // ==================== METODI AGGIUNTIVI SECONDO DOCUMENTAZIONE ====================
    
    // CONTRATTI
    async getContratti(artistaId = null) {
        await this.init();
        let query = supabase.from('contratti').select('*');
        if (artistaId) {
            query = query.eq('artista_id', artistaId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async saveContratto(contrattoData) {
        await this.init();
        const { data, error } = await supabase
            .from('contratti')
            .insert([{
                ...contrattoData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // PAGAMENTI
    async getPagamenti(filtri = {}) {
        await this.init();
        let query = supabase.from('pagamenti').select(`
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
    },

    async savePagamento(pagamentoData) {
        await this.init();
        const { data, error } = await supabase
            .from('pagamenti')
            .insert([{
                ...pagamentoData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // COMUNICAZIONI INTERMITTENTI
    async getComunicazioniIntermittenti(anno = null) {
        await this.init();
        let query = supabase.from('comunicazioni_intermittenti').select('*');
        if (anno) {
            const startYear = new Date(anno, 0, 1).toISOString();
            const endYear = new Date(anno + 1, 0, 1).toISOString();
            query = query.gte('created_at', startYear).lt('created_at', endYear);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async saveComunicazioneIntermittente(comunicazioneData) {
        await this.init();
        const { data, error } = await supabase
            .from('comunicazioni_intermittenti')
            .insert([{
                ...comunicazioneData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // EVENTI CALENDARIO
    async getEventiCalendario(dataInizio = null, dataFine = null) {
        await this.init();
        let query = supabase.from('eventi_calendario').select('*');
        if (dataInizio) query = query.gte('data_evento', dataInizio);
        if (dataFine) query = query.lte('data_evento', dataFine);
        const { data, error } = await query.order('data_evento', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    // DOCUMENTI
    async getDocumenti(entitaTipo = null, entitaId = null) {
        await this.init();
        let query = supabase.from('documenti').select('*');
        if (entitaTipo && entitaId) {
            query = query.eq('entita_tipo', entitaTipo).eq('entita_id', entitaId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async saveDocumento(documentoData) {
        await this.init();
        const { data, error } = await supabase
            .from('documenti')
            .insert([{
                ...documentoData,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // NOTIFICHE
    async getNotifiche(utente = null, nonLette = false) {
        await this.init();
        let query = supabase.from('notifiche').select('*');
        if (utente) query = query.eq('destinatario', utente);
        if (nonLette) query = query.eq('letta', false);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async inviaNotifica(notificaData) {
        await this.init();
        const { data, error } = await supabase
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
    },

    async marcaNotificaLetta(notificaId) {
        await this.init();
        const { data, error } = await supabase
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
};

// ==================== INIZIALIZZAZIONE GLOBALE ====================
// Auto-inizializza quando il modulo viene caricato
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await DatabaseService.init();
        console.log('🎉 DatabaseService inizializzato e pronto');
    } catch (error) {
        console.error('💥 Errore inizializzazione DatabaseService:', error);
    }
});

// Export per compatibilità
export default DatabaseService;