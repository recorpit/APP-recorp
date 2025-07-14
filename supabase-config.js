// supabase-config.js - Configurazione e servizio database Supabase

const SUPABASE_URL = 'https://nommluymuwioddhaujxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbW1sdXltdXdpb2RkaGF1anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODA5MjgsImV4cCI6MjA2NzU1NjkyOH0.oaF5uaNe21W8NU67n1HjngngMUClkss2achTQ7BZ5tE';

// Inizializza Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Servizio database centralizzato
class DatabaseService {
    constructor() {
        this.supabase = supabase;
    }

    // ==================== GESTIONE ARTISTI ====================
    async getArtists() {
        try {
            const { data, error } = await this.supabase
                .from('artisti')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero artisti:', error);
            return [];
        }
    }

    // Alias per compatibilità con agibilita.js
    async getAllArtisti() {
        return this.getArtists();
    }

    async saveArtist(artistData) {
        try {
            const { data, error } = await this.supabase
                .from('artisti')
                .insert(artistData)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Errore salvataggio artista:', error);
            throw error;
        }
    }

    async getArtist(id) {
        try {
            const { data, error } = await this.supabase
                .from('artisti')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore recupero artista:', error);
            return null;
        }
    }

    async updateArtist(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('artisti')
                .update(updates)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Errore aggiornamento artista:', error);
            throw error;
        }
    }

    async deleteArtist(id) {
        try {
            const { error } = await this.supabase
                .from('artisti')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione artista:', error);
            throw error;
        }
    }

    // Metodo per cercare artisti per agibilità
    async searchArtistsForAgibilita(searchTerm) {
        try {
            const { data, error } = await this.supabase
                .from('artisti')
                .select('id, nome, cognome, codice_fiscale, codice_fiscale_temp, tipo_registrazione, mansione, email, telefono, compenso_default, nazionalita, nome_arte, matricola_enpals, has_partita_iva, tipo_rapporto, codice_comunicazione')
                .or(`nome.ilike.%${searchTerm}%,cognome.ilike.%${searchTerm}%,codice_fiscale.ilike.%${searchTerm}%`)
                .limit(10);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore ricerca artisti:', error);
            return [];
        }
    }

    // Alias per compatibilità
    async searchArtisti(searchTerm) {
        return this.searchArtistsForAgibilita(searchTerm);
    }

    // ==================== GESTIONE VENUES ====================
    async getVenues() {
        try {
            const { data, error } = await this.supabase
                .from('venues')
                .select('*')
                .order('nome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero venues:', error);
            return [];
        }
    }

    async saveVenue(venueData) {
        try {
            const { data, error } = await this.supabase
                .from('venues')
                .insert(venueData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore salvataggio venue:', error);
            throw error;
        }
    }

    async searchVenues(searchTerm) {
        try {
            const { data, error } = await this.supabase
                .from('venues')
                .select('*')
                .or(`nome.ilike.%${searchTerm}%,citta_nome.ilike.%${searchTerm}%`)
                .limit(10);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore ricerca venues:', error);
            return [];
        }
    }

    async deleteVenue(id) {
        try {
            const { error } = await this.supabase
                .from('venues')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione venue:', error);
            throw error;
        }
    }

    // ==================== GESTIONE COMUNICAZIONI ====================
    async getComunicazioni() {
        try {
            const { data, error } = await this.supabase
                .from('comunicazioni')
                .select('*')
                .order('data_invio', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero comunicazioni:', error);
            return [];
        }
    }

    async saveComunicazione(comunicazioneData) {
        try {
            const { data, error } = await this.supabase
                .from('comunicazioni')
                .insert(comunicazioneData)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Errore salvataggio comunicazione:', error);
            throw error;
        }
    }

    // ==================== GESTIONE AGIBILITÀ ====================
    async getAgibilita() {
        try {
            const { data, error } = await this.supabase
                .from('agibilita')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero agibilità:', error);
            return [];
        }
    }

    async saveAgibilita(agibilitaData) {
        try {
            const { data, error } = await this.supabase
                .from('agibilita')
                .insert(agibilitaData)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Errore salvataggio agibilità:', error);
            throw error;
        }
    }

    async updateAgibilita(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('agibilita')
                .update(updates)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Errore aggiornamento agibilità:', error);
            throw error;
        }
    }

    async deleteAgibilita(id) {
        try {
            const { error } = await this.supabase
                .from('agibilita')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione agibilità:', error);
            throw error;
        }
    }

    // ==================== GESTIONE LOCALI ====================
    async getLocali() {
        try {
            const { data, error } = await this.supabase
                .from('locali')
                .select('*')
                .order('ragione_sociale', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero locali:', error);
            return [];
        }
    }

    async saveLocale(localeData) {
        try {
            const { data, error } = await this.supabase
                .from('locali')
                .insert(localeData)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Errore salvataggio locale:', error);
            throw error;
        }
    }

    async searchLocali(searchTerm) {
        try {
            const { data, error } = await this.supabase
                .from('locali')
                .select('*')
                .or(`ragione_sociale.ilike.%${searchTerm}%,partita_iva.ilike.%${searchTerm}%,nome_locale.ilike.%${searchTerm}%`)
                .limit(10);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore ricerca locali:', error);
            return [];
        }
    }

    // ==================== GESTIONE DATI FATTURAZIONE ====================
    async getDatiFatturazione() {
        try {
            const { data, error } = await this.supabase
                .from('invoice_data')
                .select('*')
                .order('ragione_sociale', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero dati fatturazione:', error);
            return [];
        }
    }

    // Alias per compatibilità
    async getAllInvoiceData() {
        return this.getDatiFatturazione();
    }

    async saveDatiFatturazione(datiData) {
        try {
            const { data, error } = await this.supabase
                .from('invoice_data')
                .insert(datiData)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Errore salvataggio dati fatturazione:', error);
            throw error;
        }
    }

    // Alias per compatibilità
    async saveInvoiceData(invoiceData) {
        return this.saveDatiFatturazione(invoiceData);
    }

    async searchDatiFatturazione(searchTerm) {
        try {
            const { data, error } = await this.supabase
                .from('invoice_data')
                .select('*')
                .or(`ragione_sociale.ilike.%${searchTerm}%,partita_iva.ilike.%${searchTerm}%,nome_referente.ilike.%${searchTerm}%,cognome_referente.ilike.%${searchTerm}%`)
                .limit(10);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore ricerca dati fatturazione:', error);
            return [];
        }
    }

    // ==================== GESTIONE BOZZE ====================
    async getBozze() {
        try {
            const { data, error } = await this.supabase
                .from('agibilita_bozze')
                .select('*')
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero bozze:', error);
            return [];
        }
    }

    async createBozza(bozzaData, userSession) {
        try {
            // Genera un codice univoco per la bozza
            const codice = `BOZZA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const { data, error } = await this.supabase
                .from('agibilita_bozze')
                .insert({
                    codice: codice,
                    data: bozzaData,
                    completamento: this.calcolaCompletamento(bozzaData),
                    created_by: userSession.id,
                    created_by_name: userSession.name
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore creazione bozza:', error);
            throw error;
        }
    }

    async updateBozza(bozzaId, bozzaData) {
        try {
            const { data, error } = await this.supabase
                .from('agibilita_bozze')
                .update({
                    data: bozzaData,
                    completamento: this.calcolaCompletamento(bozzaData),
                    updated_at: new Date().toISOString()
                })
                .eq('id', bozzaId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore aggiornamento bozza:', error);
            throw error;
        }
    }

    async deleteBozza(bozzaId) {
        try {
            const { error } = await this.supabase
                .from('agibilita_bozze')
                .delete()
                .eq('id', bozzaId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione bozza:', error);
            throw error;
        }
    }

    async lockBozza(bozzaId, userSession) {
        try {
            // Prima verifica se è già bloccata
            const { data: bozza } = await this.supabase
                .from('agibilita_bozze')
                .select('locked_by, locked_by_name, locked_until')
                .eq('id', bozzaId)
                .single();
            
            if (bozza && bozza.locked_until && new Date(bozza.locked_until) > new Date()) {
                // È già bloccata da qualcun altro
                if (bozza.locked_by !== userSession.id) {
                    return { 
                        success: false, 
                        locked_by: bozza.locked_by_name || 'altro utente' 
                    };
                }
            }
            
            // Imposta il lock per 15 minuti
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 15);
            
            const { data, error } = await this.supabase
                .from('agibilita_bozze')
                .update({
                    locked_by: userSession.id,
                    locked_by_name: userSession.name,
                    locked_until: lockUntil.toISOString()
                })
                .eq('id', bozzaId)
                .select()
                .single();
            
            if (error) throw error;
            
            return { 
                success: true, 
                lock: data 
            };
        } catch (error) {
            console.error('Errore lock bozza:', error);
            throw error;
        }
    }

    async unlockBozza(bozzaId) {
        try {
            const { error } = await this.supabase
                .from('agibilita_bozze')
                .update({
                    locked_by: null,
                    locked_by_name: null,
                    locked_until: null
                })
                .eq('id', bozzaId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore unlock bozza:', error);
            throw error;
        }
    }

    async renewLock(bozzaId, userSession) {
        try {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 15);
            
            const { error } = await this.supabase
                .from('agibilita_bozze')
                .update({
                    locked_until: lockUntil.toISOString()
                })
                .eq('id', bozzaId)
                .eq('locked_by', userSession.id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore rinnovo lock:', error);
            throw error;
        }
    }

    // Metodo helper per calcolare la percentuale di completamento
    calcolaCompletamento(bozzaData) {
        if (!bozzaData) return 0;
        
        const campiTotali = 20; // Numero approssimativo di campi richiesti
        let campiCompletati = 0;
        
        // Step 1: Dettagli evento
        if (bozzaData.dataInizio) campiCompletati++;
        if (bozzaData.dataFine) campiCompletati++;
        if (bozzaData.numeroGiorni) campiCompletati++;
        if (bozzaData.numeroRepliche) campiCompletati++;
        if (bozzaData.artisti && bozzaData.artisti.length > 0) campiCompletati += 2;
        
        // Step 2: Dati locale
        if (bozzaData.locale) {
            if (bozzaData.locale.descrizione) campiCompletati++;
            if (bozzaData.locale.indirizzo) campiCompletati++;
            if (bozzaData.locale.citta) campiCompletati++;
            if (bozzaData.locale.provincia) campiCompletati++;
            if (bozzaData.locale.cap) campiCompletati++;
        }
        
        // Step 3: Dati fatturazione
        if (bozzaData.fatturazione) {
            if (bozzaData.fatturazione.ragioneSociale) campiCompletati++;
            if (bozzaData.fatturazione.piva) campiCompletati++;
            if (bozzaData.fatturazione.indirizzo) campiCompletati++;
            if (bozzaData.fatturazione.citta) campiCompletati++;
            if (bozzaData.fatturazione.provincia) campiCompletati++;
            if (bozzaData.fatturazione.cap) campiCompletati++;
            if (bozzaData.fatturazione.pec) campiCompletati++;
            if (bozzaData.fatturazione.codiceSDI) campiCompletati++;
        }
        
        return Math.round((campiCompletati / campiTotali) * 100);
    }

    // ==================== GESTIONE NUMERI RISERVATI ====================
    async reserveAgibilitaNumber() {
        try {
            // Chiama la funzione PostgreSQL che gestisce la generazione
            const { data, error } = await this.supabase
                .rpc('genera_numero_agibilita', {
                    session_id: localStorage.getItem('userSessionId') || 'unknown',
                    user_name: localStorage.getItem('userName') || 'Utente'
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore generazione numero agibilità:', error);
            // Fallback: genera un numero temporaneo se la stored procedure non esiste
            const year = new Date().getFullYear();
            const random = Math.floor(Math.random() * 9999);
            return `AG-${year}-${String(random).padStart(4, '0')}`;
        }
    }

    async markNumberAsUsed(numero, agibilitaId) {
        try {
            const { error } = await this.supabase
                .from('agibilita_numeri_riservati')
                .update({
                    utilizzato: true,
                    utilizzato_at: new Date().toISOString(),
                    agibilita_id: agibilitaId
                })
                .eq('numero', numero);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore marcatura numero utilizzato:', error);
            return false;
        }
    }

    // ==================== GESTIONE NOTIFICHE ====================
    async logNotifica(notificaData) {
        try {
            const { data, error } = await this.supabase
                .from('notifiche_log')
                .insert(notificaData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore log notifica:', error);
            throw error;
        }
    }

    async updateNotificaStatus(notificaId, stato, errorMessage = null) {
        try {
            const updateData = {
                stato: stato,
                inviato_at: stato === 'sent' ? new Date().toISOString() : null
            };
            
            if (errorMessage) {
                updateData.errore = errorMessage;
            }
            
            const { error } = await this.supabase
                .from('notifiche_log')
                .update(updateData)
                .eq('id', notificaId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore aggiornamento stato notifica:', error);
            throw error;
        }
    }

    async getNotificheByAgibilita(agibilitaId) {
        try {
            const { data, error } = await this.supabase
                .from('notifiche_log')
                .select('*')
                .eq('agibilita_id', agibilitaId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero notifiche agibilità:', error);
            return [];
        }
    }

    // ==================== STATISTICHE ====================
    async getStatistiche() {
        try {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            
            // Conta artisti registrati
            const { count: totalArtisti } = await this.supabase
                .from('artisti')
                .select('*', { count: 'exact', head: true });
            
            // Conta agibilità totali
            const { count: totalAgibilita } = await this.supabase
                .from('agibilita')
                .select('*', { count: 'exact', head: true });
            
            // Conta agibilità questo mese
            const { count: agibilitaMese } = await this.supabase
                .from('agibilita')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', firstDayOfMonth.toISOString());
            
            // Conta bozze in sospeso
            const { count: bozzeSospese } = await this.supabase
                .from('agibilita_bozze')
                .select('*', { count: 'exact', head: true });
            
            // Conta comunicazioni inviate quest'anno
            const { count: comunicazioniAnno } = await this.supabase
                .from('comunicazioni')
                .select('*', { count: 'exact', head: true })
                .gte('data_invio', firstDayOfYear.toISOString());
            
            return {
                artisti: totalArtisti || 0,
                agibilita_totali: totalAgibilita || 0,
                agibilita_mese: agibilitaMese || 0,
                bozze_sospese: bozzeSospese || 0,
                comunicazioni_anno: comunicazioniAnno || 0
            };
        } catch (error) {
            console.error('Errore recupero statistiche:', error);
            return {
                artisti: 0,
                agibilita_totali: 0,
                agibilita_mese: 0,
                bozze_sospese: 0,
                comunicazioni_anno: 0
            };
        }
    }

    // ==================== UTILITY ====================
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('artisti')
                .select('count')
                .limit(1);
            
            if (error) throw error;
            console.log('✅ Connessione a Supabase attiva');
            return true;
        } catch (error) {
            console.error('❌ Errore connessione Supabase:', error);
            return false;
        }
    }

    // ==================== VERIFICA TABELLE ====================
    async checkTables() {
        const tables = [
            'artisti',
            'agibilita',
            'agibilita_bozze',
            'agibilita_numeri_riservati',
            'notifiche_log',
            'venues',
            'invoice_data',
            'comunicazioni',
            'locali'
        ];
        
        const results = {};
        
        for (const table of tables) {
            try {
                const { count, error } = await this.supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                results[table] = !error;
            } catch (e) {
                results[table] = false;
            }
        }
        
        console.log('📊 Stato tabelle:', results);
        return results;
    }
}

// Crea istanza singleton del servizio
const dbService = new DatabaseService();

// Esporta per l'uso in altri moduli
export { dbService as DatabaseService, supabase };

// Per retrocompatibilità, esporta anche come window object
window.DatabaseService = dbService;
window.supabase = supabase;

console.log('🔌 Supabase configurato e pronto');
