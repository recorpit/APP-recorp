// supabase-config-agibilita.js - Configurazione Database RECORP - MODULO AGIBILITÀ
// Versione dedicata con funzionalità specifiche per agibilità

// ==================== CONFIGURAZIONE SUPABASE AGIBILITÀ ====================
const SUPABASE_CONFIG_AGIBILITA = {
    url: 'https://nommluymuwioddhaujxu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbW1sdXltdXdpb2RkaGF1anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODA5MjgsImV4cCI6MjA2NzU1NjkyOH0.oaF5uaNe21W8NU67n1HjngngMUClkss2achTQ7BZ5tE',
    // Configurazioni specifiche per agibilità
    tables: {
        artisti: 'artisti',
        agibilita: 'agibilita',
        venues: 'venues',
        invoice_data: 'invoice_data',
        bozze_agibilita: 'bozze_agibilita',
        agibilita_prenotazioni: 'agibilita_prenotazioni',
        configurazioni: 'configurazioni'
    },
    // Cache specifiche agibilità
    cache: {
        artisti_ttl: 5 * 60 * 1000, // 5 minuti
        venues_ttl: 30 * 60 * 1000, // 30 minuti
        invoice_data_ttl: 10 * 60 * 1000, // 10 minuti
        max_entries: 1000
    }
};

// ==================== INIZIALIZZAZIONE SUPABASE AGIBILITÀ ====================
let supabaseAgibilita = null;
let isInitializedAgibilita = false;
let agibilitaCache = new Map();

// Inizializza Supabase per agibilità
async function initializeSupabaseAgibilita() {
    try {
        console.log('🎭 Inizializzazione Supabase per modulo agibilità...');
        
        // Verifica credenziali
        if (SUPABASE_CONFIG_AGIBILITA.url.includes('TUO-PROGETTO') || 
            SUPABASE_CONFIG_AGIBILITA.anonKey.includes('TUA-CHIAVE')) {
            throw new Error('⚠️ CREDENZIALI AGIBILITÀ NON CONFIGURATE');
        }

        // Inizializza client Supabase
        supabaseAgibilita = window.supabase.createClient(
            SUPABASE_CONFIG_AGIBILITA.url,
            SUPABASE_CONFIG_AGIBILITA.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false // Disabilita per moduli
                },
                db: {
                    schema: 'public'
                },
                global: {
                    headers: {
                        'X-Client-Module': 'agibilita'
                    }
                }
            }
        );

        // Test connessione con tabelle agibilità
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.artisti)
            .select('count')
            .limit(1);

        if (error && error.code !== '42P01') {
            throw error;
        }

        isInitializedAgibilita = true;
        console.log('✅ Supabase agibilità inizializzato correttamente');
        console.log('🎭 Modulo: AGIBILITÀ');
        console.log('📋 Tabelle:', Object.keys(SUPABASE_CONFIG_AGIBILITA.tables).join(', '));
        
        // Setup cache cleanup
        setupCacheCleanup();
        
        return supabaseAgibilita;

    } catch (error) {
        console.error('❌ Errore inizializzazione Supabase agibilità:', error);
        showAgibilitaConfigError(error.message);
        throw error;
    }
}

// Setup pulizia cache periodica
function setupCacheCleanup() {
    setInterval(() => {
        const now = Date.now();
        const maxAge = Math.max(...Object.values(SUPABASE_CONFIG_AGIBILITA.cache)) || 300000;
        
        for (const [key, value] of agibilitaCache.entries()) {
            if (now - value.timestamp > maxAge) {
                agibilitaCache.delete(key);
            }
        }
        
        if (agibilitaCache.size > SUPABASE_CONFIG_AGIBILITA.cache.max_entries) {
            const entries = Array.from(agibilitaCache.entries())
                .sort((a, b) => b[1].timestamp - a[1].timestamp)
                .slice(0, SUPABASE_CONFIG_AGIBILITA.cache.max_entries);
            
            agibilitaCache.clear();
            entries.forEach(([key, value]) => agibilitaCache.set(key, value));
        }
    }, 60000); // Cleanup ogni minuto
}

// Mostra errore configurazione agibilità
function showAgibilitaConfigError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'supabase-agibilita-error';
    errorDiv.style.cssText = `
        position: fixed;
        top: 60px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #dc2626, #991b1b);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        z-index: 9998;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(220, 38, 38, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">🎭</div>
            <div>
                <div style="font-size: 16px; margin-bottom: 4px;">
                    <strong>Configurazione Supabase Agibilità Richiesta</strong>
                </div>
                <div style="font-size: 14px; opacity: 0.9;">${message}</div>
                <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
                    Modifica: /agibilita/js/config/supabase-config-agibilita.js
                </div>
            </div>
        </div>
    `;
    
    // Rimuovi errore precedente
    const existing = document.getElementById('supabase-agibilita-error');
    if (existing) existing.remove();
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove dopo 10 secondi
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

// ==================== DATABASE SERVICE AGIBILITÀ ====================
export const DatabaseService = {
    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        if (!isInitializedAgibilita) {
            await initializeSupabaseAgibilita();
        }
        return supabaseAgibilita;
    },

    // Verifica se è inizializzato
    isReady() {
        return isInitializedAgibilita && supabaseAgibilita !== null;
    },

    // Ottieni client Supabase
    getSupabaseClient() {
        return supabaseAgibilita;
    },

    // Test connessione dedicato agibilità
    async testConnection() {
        try {
            if (!supabaseAgibilita) {
                return {
                    connected: false,
                    authenticated: false,
                    error: 'Client Supabase agibilità non configurato',
                    module: 'agibilita'
                };
            }

            // Test auth
            const { data: { session }, error: authError } = await supabaseAgibilita.auth.getSession();
            
            // Test accesso tabelle agibilità
            const { data: artistiTest, error: artistiError } = await supabaseAgibilita
                .from(SUPABASE_CONFIG_AGIBILITA.tables.artisti)
                .select('count')
                .limit(1);
            
            const { data: agibilitaTest, error: agibilitaError } = await supabaseAgibilita
                .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita)
                .select('count')
                .limit(1);
            
            return {
                connected: true,
                authenticated: !!session,
                user: session?.user || null,
                module: 'agibilita',
                tables_status: {
                    artisti: !artistiError || artistiError.code === '42P01',
                    agibilita: !agibilitaError || agibilitaError.code === '42P01'
                },
                cache_size: agibilitaCache.size,
                error: authError?.message || null
            };
        } catch (error) {
            return {
                connected: false,
                authenticated: false,
                module: 'agibilita',
                error: error.message
            };
        }
    },

    // ==================== CACHE UTILITIES ====================
    getCached(key, ttl = 300000) {
        const cached = agibilitaCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < ttl) {
            return cached.data;
        }
        return null;
    },

    setCache(key, data) {
        agibilitaCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    },

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of agibilitaCache.keys()) {
                if (key.includes(pattern)) {
                    agibilitaCache.delete(key);
                }
            }
        } else {
            agibilitaCache.clear();
        }
    },

    // ==================== ARTISTI AGIBILITÀ ====================
    async getArtistsForAgibilita() {
        await this.init();
        
        const cacheKey = 'artists_agibilita';
        const cached = this.getCached(cacheKey, SUPABASE_CONFIG_AGIBILITA.cache.artisti_ttl);
        if (cached) return cached;
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.artisti)
            .select(`
                id, nome, cognome, nome_arte, codice_fiscale, codice_fiscale_temp,
                mansione, matricola_enpals, nazionalita, telefono, email,
                has_partita_iva, tipo_rapporto, attivo, created_at
            `)
            .eq('attivo', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const result = data || [];
        this.setCache(cacheKey, result);
        return result;
    },

    async searchArtistsForAgibilita(searchTerm) {
        await this.init();
        
        if (!searchTerm || searchTerm.length < 2) {
            return await this.getArtistsForAgibilita();
        }
        
        const cacheKey = `artists_search_${searchTerm.toLowerCase()}`;
        const cached = this.getCached(cacheKey, 60000); // 1 minuto per ricerche
        if (cached) return cached;
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.artisti)
            .select(`
                id, nome, cognome, nome_arte, codice_fiscale, codice_fiscale_temp,
                mansione, matricola_enpals, nazionalita, telefono, email,
                has_partita_iva, tipo_rapporto, attivo
            `)
            .eq('attivo', true)
            .or(`nome.ilike.%${searchTerm}%,cognome.ilike.%${searchTerm}%,nome_arte.ilike.%${searchTerm}%,codice_fiscale.ilike.%${searchTerm}%,codice_fiscale_temp.ilike.%${searchTerm}%`)
            .limit(50);
        
        if (error) throw error;
        
        const result = data || [];
        this.setCache(cacheKey, result);
        return result;
    },

    async getArtistById(artistId) {
        await this.init();
        
        const cacheKey = `artist_${artistId}`;
        const cached = this.getCached(cacheKey, SUPABASE_CONFIG_AGIBILITA.cache.artisti_ttl);
        if (cached) return cached;
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.artisti)
            .select('*')
            .eq('id', artistId)
            .eq('attivo', true)
            .single();
        
        if (error) throw error;
        
        this.setCache(cacheKey, data);
        return data;
    },

    // ==================== VENUES AGIBILITÀ ====================
    async getVenuesForAgibilita() {
        await this.init();
        
        const cacheKey = 'venues_agibilita';
        const cached = this.getCached(cacheKey, SUPABASE_CONFIG_AGIBILITA.cache.venues_ttl);
        if (cached) return cached;
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.venues)
            .select('*')
            .order('nome');
        
        if (error) {
            // Se tabella non esiste, ritorna array vuoto
            if (error.code === '42P01') {
                console.warn('⚠️ Tabella venues non trovata, uso dati mock');
                return this.getMockVenues();
            }
            throw error;
        }
        
        const result = data || [];
        this.setCache(cacheKey, result);
        return result;
    },

    async searchVenues(searchTerm) {
        await this.init();
        
        if (!searchTerm || searchTerm.length < 2) {
            return await this.getVenuesForAgibilita();
        }
        
        const cacheKey = `venues_search_${searchTerm.toLowerCase()}`;
        const cached = this.getCached(cacheKey, 60000);
        if (cached) return cached;
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.venues)
            .select('*')
            .or(`nome.ilike.%${searchTerm}%,indirizzo.ilike.%${searchTerm}%,citta.ilike.%${searchTerm}%`)
            .limit(20);
        
        if (error) {
            if (error.code === '42P01') {
                return this.getMockVenues().filter(v => 
                    v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.indirizzo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.citta.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            throw error;
        }
        
        const result = data || [];
        this.setCache(cacheKey, result);
        return result;
    },

    // Dati mock venues per sviluppo
    getMockVenues() {
        return [
            {
                id: 'mock_1',
                nome: 'Teatro dell\'Opera di Roma',
                indirizzo: 'Piazza Beniamino Gigli, 7',
                citta: 'Roma',
                cap: '00184',
                provincia: 'RM',
                telefono: '06 481601',
                email: 'info@operaroma.it'
            },
            {
                id: 'mock_2',
                nome: 'Auditorium Parco della Musica',
                indirizzo: 'Viale Pietro de Coubertin, 30',
                citta: 'Roma',
                cap: '00196',
                provincia: 'RM',
                telefono: '06 80241281',
                email: 'info@auditorium.com'
            },
            {
                id: 'mock_3',
                nome: 'Teatro alla Scala',
                indirizzo: 'Via Filodrammatici, 2',
                citta: 'Milano',
                cap: '20121',
                provincia: 'MI',
                telefono: '02 88791',
                email: 'info@teatroallascala.org'
            }
        ];
    },

    // ==================== INVOICE DATA AGIBILITÀ ====================
    async getInvoiceDataForAgibilita() {
        await this.init();
        
        const cacheKey = 'invoice_data_agibilita';
        const cached = this.getCached(cacheKey, SUPABASE_CONFIG_AGIBILITA.cache.invoice_data_ttl);
        if (cached) return cached;
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.invoice_data)
            .select('*')
            .order('last_updated', { ascending: false });
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('⚠️ Tabella invoice_data non trovata, uso dati mock');
                return this.getMockInvoiceData();
            }
            throw error;
        }
        
        const result = data || [];
        this.setCache(cacheKey, result);
        return result;
    },

    // Dati mock fatturazione per sviluppo
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
            }
        ];
    },

    // ==================== AGIBILITÀ CRUD ====================
    async getAgibilita(filtri = {}) {
        await this.init();
        
        let query = supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita)
            .select('*');

        // Applica filtri
        if (filtri.fromDate) {
            query = query.gte('created_at', filtri.fromDate);
        }
        if (filtri.toDate) {
            query = query.lte('created_at', filtri.toDate);
        }
        if (filtri.stato) {
            query = query.eq('stato_invio', filtri.stato);
        }
        if (filtri.year) {
            const startYear = new Date(filtri.year, 0, 1).toISOString();
            const endYear = new Date(filtri.year + 1, 0, 1).toISOString();
            query = query.gte('created_at', startYear).lt('created_at', endYear);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async saveAgibilita(agibilitaData) {
        await this.init();
        
        // Validazione dati obbligatori
        if (!agibilitaData.artisti || agibilitaData.artisti.length === 0) {
            throw new Error('Almeno un artista è richiesto');
        }
        
        if (!agibilitaData.data_inizio || !agibilitaData.data_fine) {
            throw new Error('Date inizio e fine sono richieste');
        }
        
        const dataToSave = {
            ...agibilitaData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            stato_invio: agibilitaData.stato_invio || 'bozza'
        };
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita)
            .insert([dataToSave])
            .select()
            .single();
        
        if (error) throw error;
        
        // Invalida cache
        this.clearCache('agibilita');
        
        console.log('✅ Agibilità salvata con successo:', data.id);
        return data;
    },

    async updateAgibilita(id, agibilitaData) {
        await this.init();
        
        const dataToUpdate = {
            ...agibilitaData,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita)
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        // Invalida cache
        this.clearCache('agibilita');
        
        console.log('✅ Agibilità aggiornata con successo:', data.id);
        return data;
    },

    // ==================== NUMERAZIONE THREAD-SAFE AGIBILITÀ ====================
    async reserveAgibilitaNumberSafe() {
        await this.init();
        
        const currentYear = new Date().getFullYear();
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            try {
                // Usa funzione PostgreSQL se disponibile
                const { data, error } = await supabaseAgibilita.rpc('reserve_next_agibilita_number', {
                    target_year: currentYear
                });
                
                if (error) {
                    if (error.code === '42883') { // function does not exist
                        console.warn('⚠️ Funzione PostgreSQL non trovata, uso metodo fallback');
                        return await this.reserveAgibilitaNumberFallback();
                    }
                    throw error;
                }
                
                const numeroProgressivo = data.nuovo_numero;
                const codiceAgibilita = `AG-${currentYear}-${String(numeroProgressivo).padStart(3, '0')}`;
                
                // Registra prenotazione
                const prenotazione = {
                    codice: codiceAgibilita,
                    anno: currentYear,
                    numero_progressivo: numeroProgressivo,
                    stato: 'riservato',
                    riservato_da: await this.getCurrentUserEmail(),
                    riservato_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                    session_id: this.generateSessionId()
                };
                
                const { data: reserved, error: reserveError } = await supabaseAgibilita
                    .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita_prenotazioni)
                    .insert([prenotazione])
                    .select()
                    .single();
                
                if (reserveError) {
                    if (reserveError.code === '42P01') {
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

    async reserveAgibilitaNumberFallback() {
        console.log('🔄 Uso metodo numerazione fallback per agibilità');
        const year = new Date().getFullYear();
        const agibilita = await this.getAgibilita({ year });
        const nextNumber = agibilita.length + 1;
        const codice = `AG-${year}-${String(nextNumber).padStart(3, '0')}`;
        
        return {
            codice: codice,
            numero_progressivo: nextNumber,
            reservation_id: null,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        };
    },

    async confirmAgibilitaNumber(reservationId, agibilitaId) {
        if (!reservationId) return true;
        
        await this.init();
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita_prenotazioni)
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
            console.error('❌ Errore conferma numero agibilità:', error);
            throw error;
        }
        
        console.log('✅ Numero agibilità confermato come utilizzato');
        return data;
    },

    async releaseAgibilitaNumber(reservationId) {
        if (!reservationId) return true;
        
        await this.init();
        
        const { error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita_prenotazioni)
            .update({
                stato: 'rilasciato',
                updated_at: new Date().toISOString()
            })
            .eq('id', reservationId)
            .eq('stato', 'riservato');
        
        if (error) {
            console.error('❌ Errore rilascio numero agibilità:', error);
            return false;
        }
        
        console.log('✅ Numero agibilità rilasciato');
        return true;
    },

    // ==================== BOZZE AGIBILITÀ ====================
    async getBozzeAgibilita() {
        await this.init();
        
        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.bozze_agibilita)
            .select('*')
            .order('updated_at', { ascending: false });
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('⚠️ Tabella bozze_agibilita non trovata');
                return [];
            }
            throw error;
        }
        
        return data || [];
    },

    async createBozzaAgibilita(bozzaData, userSession) {
        await this.init();
        
        const bozza = {
            data: bozzaData,
            codice_riservato: bozzaData.numeroRiservato || null,
            reservation_id: bozzaData.reservationId || null,
            created_by: userSession.id,
            created_by_name: userSession.name || userSession.email,
            locked_by: userSession.id,
            locked_by_name: userSession.name || userSession.email,
            locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            completamento_percentuale: this.calculateCompletamentoAgibilita(bozzaData),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.bozze_agibilita)
            .insert([bozza])
            .select()
            .single();
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('⚠️ Tabella bozze_agibilita non trovata, salvo in localStorage');
                return this.saveBozzaLocally(bozza);
            }
            throw error;
        }
        
        return data;
    },

    async updateBozzaAgibilita(bozzaId, bozzaData, userSession = null) {
        await this.init();
        
        const updateData = {
            data: bozzaData,
            completamento_percentuale: this.calculateCompletamentoAgibilita(bozzaData),
            updated_at: new Date().toISOString()
        };

        if (userSession) {
            updateData.locked_by = userSession.id;
            updateData.locked_by_name = userSession.name || userSession.email;
            updateData.locked_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }

        const { data, error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.bozze_agibilita)
            .update(updateData)
            .eq('id', bozzaId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async deleteBozzaAgibilita(bozzaId) {
        await this.init();
        
        const { error } = await supabaseAgibilita
            .from(SUPABASE_CONFIG_AGIBILITA.tables.bozze_agibilita)
            .delete()
            .eq('id', bozzaId);
        
        if (error) throw error;
        return true;
    },

    // Calcola completamento specifico agibilità
    calculateCompletamentoAgibilita(bozzaData) {
        let campiTotali = 0;
        let campiCompilati = 0;
        
        // Artisti (peso 30%)
        if (bozzaData.selectedArtists && bozzaData.selectedArtists.length > 0) {
            campiCompilati += 3;
        }
        campiTotali += 3;
        
        // Date evento (peso 20%)
        if (bozzaData.eventStartDate) campiCompilati++;
        if (bozzaData.eventEndDate) campiCompilati++;
        campiTotali += 2;
        
        // Località (peso 25%)
        if (bozzaData.locationData?.venue) campiCompilati++;
        if (bozzaData.locationData?.address) campiCompilati++;
        if (bozzaData.locationData?.city) campiCompilati++;
        if (bozzaData.locationData?.cap) campiCompilati++;
        if (bozzaData.locationData?.province) campiCompilati++;
        campiTotali += 5;
        
        // Dati fatturazione (peso 25%)
        if (bozzaData.invoiceData?.company) campiCompilati++;
        if (bozzaData.invoiceData?.address) campiCompilati++;
        if (bozzaData.invoiceData?.city) campiCompilati++;
        if (bozzaData.invoiceData?.fiscalCode) campiCompilati++;
        campiTotali += 4;
        
        return Math.round((campiCompilati / campiTotali) * 100);
    },

    // Fallback localStorage per bozze
    saveBozzaLocally(bozza) {
        const localBozze = JSON.parse(localStorage.getItem('bozze_agibilita_local') || '[]');
        const newBozza = {
            ...bozza,
            id: 'local_' + Date.now(),
            is_local: true
        };
        localBozze.push(newBozza);
        localStorage.setItem('bozze_agibilita_local', JSON.stringify(localBozze));
        return newBozza;
    },

    // ==================== STATISTICHE AGIBILITÀ ====================
    async getStatisticheAgibilita() {
        await this.init();
        
        try {
            const [agibilitaStats, bozzeStats] = await Promise.all([
                supabaseAgibilita
                    .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita)
                    .select('*', { count: 'exact', head: true }),
                
                supabaseAgibilita
                    .from(SUPABASE_CONFIG_AGIBILITA.tables.bozze_agibilita)
                    .select('*', { count: 'exact', head: true })
                    .catch(() => ({ count: 0 }))
            ]);

            const currentYear = new Date().getFullYear();
            const { data: agibilitaAnno } = await supabaseAgibilita
                .from(SUPABASE_CONFIG_AGIBILITA.tables.agibilita)
                .select('*', { count: 'exact', head: true })
                .gte('created_at', new Date(currentYear, 0, 1).toISOString())
                .lt('created_at', new Date(currentYear + 1, 0, 1).toISOString());

            return {
                agibilita_totali: agibilitaStats.count || 0,
                agibilita_anno: agibilitaAnno || 0,
                bozze_attive: bozzeStats.count || 0,
                cache_size: agibilitaCache.size,
                ultimo_aggiornamento: new Date().toISOString(),
                module: 'agibilita'
            };
            
        } catch (error) {
            console.warn('⚠️ Errore calcolo statistiche agibilità:', error);
            return {
                agibilita_totali: 0,
                agibilita_anno: 0,
                bozze_attive: 0,
                cache_size: agibilitaCache.size,
                ultimo_aggiornamento: new Date().toISOString(),
                module: 'agibilita',
                warning: 'Database in fase di inizializzazione'
            };
        }
    },

    // ==================== UTILITY METHODS ====================
    async getCurrentUserEmail() {
        try {
            const { data: { user } } = await supabaseAgibilita.auth.getUser();
            return user?.email || 'unknown';
        } catch {
            return 'unknown';
        }
    },
    
    generateSessionId() {
        return 'agibilita_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    // Debug del servizio
    debug() {
        return {
            initialized: isInitializedAgibilita,
            client_ready: !!supabaseAgibilita,
            cache_size: agibilitaCache.size,
            cache_keys: Array.from(agibilitaCache.keys()),
            config: {
                tables: SUPABASE_CONFIG_AGIBILITA.tables,
                cache_settings: SUPABASE_CONFIG_AGIBILITA.cache
            },
            module: 'agibilita'
        };
    },

    // Cleanup
    cleanup() {
        this.clearCache();
        console.log('🧹 DatabaseService agibilità cleanup completato');
    }
};

// Export per compatibilità
export default DatabaseService;

console.log('🎭 DatabaseService agibilità caricato e pronto');