// ==================== CONFIGURAZIONE SUPABASE ====================
const SUPABASE_URL = 'https://tuourl.supabase.co'; // INSERISCI IL TUO URL
const SUPABASE_ANON_KEY = 'tua-chiave-api'; // INSERISCI LA TUA CHIAVE

// Inizializzazione client Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== DATABASE SERVICE ====================
const DatabaseService = {
    // ==================== GESTIONE ARTISTI ====================
    
    // Ottieni tutti gli artisti
    async getAllArtisti() {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .order('cognome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel recupero artisti:', error);
            return [];
        }
    },

    // Ottieni artisti con paginazione
    async getArtisti(limit = 50, offset = 0) {
        try {
            const { data, error, count } = await supabase
                .from('artisti')
                .select('*', { count: 'exact' })
                .order('cognome', { ascending: true })
                .limit(limit)
                .range(offset, offset + limit - 1);
            
            if (error) throw error;
            return {
                data: data || [],
                count: count || 0
            };
        } catch (error) {
            console.error('Errore nel recupero artisti:', error);
            return { data: [], count: 0 };
        }
    },

    // Cerca artisti
    async searchArtisti(query) {
        try {
            const searchTerm = `%${query}%`;
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .or(`nome.ilike.${searchTerm},cognome.ilike.${searchTerm},codice_fiscale.ilike.${searchTerm},nome_arte.ilike.${searchTerm}`)
                .order('cognome', { ascending: true })
                .limit(10);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nella ricerca artisti:', error);
            return [];
        }
    },

    // Ottieni artista per ID
    async getArtistaById(id) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore nel recupero artista:', error);
            return null;
        }
    },

    // Salva nuovo artista
    async saveArtista(artistaData) {
        try {
            // Prepara i dati per il salvataggio
            const dataToSave = {
                nome: artistaData.nome || artistaData.Nome,
                cognome: artistaData.cognome || artistaData.Cognome,
                nome_arte: artistaData.nomeArte || artistaData.nome_arte || null,
                codice_fiscale: (artistaData.codiceFiscale || artistaData.codice_fiscale).toUpperCase(),
                matricola_enpals: artistaData.matricolaENPALS || artistaData.matricola_enpals || null,
                data_nascita: artistaData.dataNascita || artistaData.data_nascita,
                sesso: artistaData.sesso || null,
                luogo_nascita: artistaData.luogoNascita || artistaData.luogo_nascita || null,
                provincia_nascita: artistaData.provinciaNascita || artistaData.provincia_nascita || null,
                eta: artistaData.eta || null,
                nazionalita: artistaData.nazionalita || 'IT',
                telefono: artistaData.telefono || null,
                email: artistaData.email || null,
                indirizzo: artistaData.indirizzo,
                provincia: artistaData.provincia,
                citta: artistaData.citta,
                cap: artistaData.cap,
                codice_istat_citta: artistaData.codiceIstatCitta || artistaData.codice_istat_citta || null,
                has_partita_iva: artistaData.hasPartitaIva === 'si' || artistaData.has_partita_iva === true,
                partita_iva: artistaData.partitaIva || artistaData.partita_iva || null,
                tipo_rapporto: artistaData.tipoRapporto || artistaData.tipo_rapporto || null,
                codice_comunicazione: artistaData.codiceComunicazione || artistaData.codice_comunicazione || null,
                iban: artistaData.iban,
                mansione: artistaData.mansione,
                note: artistaData.note || null,
                data_registrazione: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('artisti')
                .insert([dataToSave])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Artista salvato con successo:', data);
            return data;
        } catch (error) {
            console.error('❌ Errore nel salvataggio artista:', error);
            throw error;
        }
    },

    // Aggiorna artista esistente
    async updateArtista(id, artistaData) {
        try {
            const updateData = {
                nome: artistaData.nome || artistaData.Nome,
                cognome: artistaData.cognome || artistaData.Cognome,
                nome_arte: artistaData.nomeArte || artistaData.nome_arte || null,
                codice_fiscale: (artistaData.codiceFiscale || artistaData.codice_fiscale).toUpperCase(),
                matricola_enpals: artistaData.matricolaENPALS || artistaData.matricola_enpals || null,
                data_nascita: artistaData.dataNascita || artistaData.data_nascita,
                sesso: artistaData.sesso || null,
                luogo_nascita: artistaData.luogoNascita || artistaData.luogo_nascita || null,
                provincia_nascita: artistaData.provinciaNascita || artistaData.provincia_nascita || null,
                eta: artistaData.eta || null,
                nazionalita: artistaData.nazionalita || 'IT',
                telefono: artistaData.telefono || null,
                email: artistaData.email || null,
                indirizzo: artistaData.indirizzo,
                provincia: artistaData.provincia,
                citta: artistaData.citta,
                cap: artistaData.cap,
                codice_istat_citta: artistaData.codiceIstatCitta || artistaData.codice_istat_citta || null,
                has_partita_iva: artistaData.hasPartitaIva === 'si' || artistaData.has_partita_iva === true,
                partita_iva: artistaData.partitaIva || artistaData.partita_iva || null,
                tipo_rapporto: artistaData.tipoRapporto || artistaData.tipo_rapporto || null,
                codice_comunicazione: artistaData.codiceComunicazione || artistaData.codice_comunicazione || null,
                iban: artistaData.iban,
                mansione: artistaData.mansione,
                note: artistaData.note || null,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('artisti')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Artista aggiornato con successo:', data);
            return data;
        } catch (error) {
            console.error('❌ Errore aggiornamento artista:', error);
            throw error;
        }
    },

    // Elimina artista
    async deleteArtista(id) {
        try {
            const { error } = await supabase
                .from('artisti')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione artista:', error);
            throw error;
        }
    },

    // Verifica se esiste già un artista con questo CF
    async artistaExists(codiceFiscale) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('id')
                .eq('codice_fiscale', codiceFiscale.toUpperCase())
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return !!data;
        } catch (error) {
            console.error('Errore verifica esistenza artista:', error);
            return false;
        }
    },

    // Verifica se esiste già un artista con questo CF (escludendo un ID specifico per modifiche)
    async artistaExistsExcluding(codiceFiscale, excludeId) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('id')
                .eq('codice_fiscale', codiceFiscale.toUpperCase())
                .neq('id', excludeId);
            
            if (error) throw error;
            return data && data.length > 0;
        } catch (error) {
            console.error('Errore verifica esistenza artista:', error);
            return false;
        }
    },

    // Ottieni solo artisti con contratto a chiamata
    async getArtistiAChiamata() {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .or('tipo_rapporto.eq.chiamata,tipo_rapporto.eq.Contratto a chiamata')
                .order('cognome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel recupero artisti a chiamata:', error);
            return [];
        }
    },

    // Ottieni artisti per tipo di rapporto
    async getArtistiByTipoRapporto(tipoRapporto) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .eq('tipo_rapporto', tipoRapporto)
                .order('cognome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel recupero artisti per tipo rapporto:', error);
            return [];
        }
    },

    // Ottieni artisti con partita IVA
    async getArtistiConPartitaIva() {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .eq('has_partita_iva', true)
                .order('cognome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel recupero artisti con P.IVA:', error);
            return [];
        }
    },

    // ==================== GESTIONE AGIBILITÀ ====================
    
    // Ottieni tutte le agibilità
    async getAllAgibilita() {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .order('data_creazione', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel recupero agibilità:', error);
            return [];
        }
    },

    // Alias per compatibilità
    async getAgibilita() {
        return this.getAllAgibilita();
    },

    // Salva nuova agibilità
    async saveAgibilita(agibilitaData) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .insert([agibilitaData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore salvataggio agibilità:', error);
            throw error;
        }
    },

    // Aggiorna agibilità esistente
    async updateAgibilita(id, agibilitaData) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .update(agibilitaData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore aggiornamento agibilità:', error);
            throw error;
        }
    },

    // Ottieni agibilità per codice
    async getAgibilitaByCodice(codice) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .eq('codice', codice)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Errore recupero agibilità:', error);
            return null;
        }
    },

    // Ottieni agibilità per periodo
    async getAgibilitaByPeriod(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .gte('data_inizio', startDate)
                .lte('data_fine', endDate)
                .order('data_inizio', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero agibilità per periodo:', error);
            return [];
        }
    },

    // Elimina agibilità
    async deleteAgibilita(id) {
        try {
            const { error } = await supabase
                .from('agibilita')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione agibilità:', error);
            throw error;
        }
    },

    // Cerca agibilità
    async searchAgibilita(query) {
        try {
            const searchTerm = `%${query}%`;
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .or(`codice.ilike.${searchTerm}`)
                .order('data_creazione', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nella ricerca agibilità:', error);
            return [];
        }
    },

    // Ottieni agibilità per artista
    async getAgibilitaByArtista(codiceFiscale) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .contains('artisti', [{cf: codiceFiscale}])
                .order('data_inizio', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore recupero agibilità per artista:', error);
            return [];
        }
    },

    // ==================== GESTIONE VENUES ====================
    
    // Ottieni tutti i venues
    async getAllVenues() {
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .order('nome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel recupero venues:', error);
            return [];
        }
    },

    // Alias per compatibilità
    async getVenues() {
        return this.getAllVenues();
    },

    // Salva nuovo venue
    async saveVenue(venueData) {
        try {
            const { data, error } = await supabase
                .from('venues')
                .insert([venueData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore salvataggio venue:', error);
            throw error;
        }
    },

    // Cerca venues
    async searchVenues(query) {
        try {
            const searchTerm = `%${query}%`;
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .or(`nome.ilike.${searchTerm},citta_nome.ilike.${searchTerm}`)
                .order('nome', { ascending: true })
                .limit(10);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nella ricerca venues:', error);
            return [];
        }
    },

    // Ottieni venue per ID
    async getVenueById(id) {
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore nel recupero venue:', error);
            return null;
        }
    },

    // Aggiorna venue
    async updateVenue(id, venueData) {
        try {
            const { data, error } = await supabase
                .from('venues')
                .update(venueData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore aggiornamento venue:', error);
            throw error;
        }
    },

    // Elimina venue
    async deleteVenue(id) {
        try {
            const { error } = await supabase
                .from('venues')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione venue:', error);
            throw error;
        }
    },

    // ==================== GESTIONE FATTURAZIONE ====================
    
    // Ottieni tutti i dati fatturazione
    async getAllInvoiceData() {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .select('*')
                .order('venue_name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel recupero dati fatturazione:', error);
            return [];
        }
    },

    // Ottieni dati fatturazione per venue
    async getInvoiceDataForVenue(venueName) {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .select('*')
                .eq('venue_name', venueName)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Errore recupero dati fatturazione:', error);
            return null;
        }
    },

    // Salva dati fatturazione
    async saveInvoiceData(invoiceData) {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .upsert([invoiceData], { onConflict: 'venue_name' })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore salvataggio dati fatturazione:', error);
            throw error;
        }
    },

    // Aggiorna dati fatturazione
    async updateInvoiceData(id, invoiceData) {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .update(invoiceData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore aggiornamento dati fatturazione:', error);
            throw error;
        }
    },

    // Elimina dati fatturazione
    async deleteInvoiceData(id) {
        try {
            const { error } = await supabase
                .from('invoice_data')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Errore eliminazione dati fatturazione:', error);
            throw error;
        }
    },

    // ==================== STATISTICHE ====================
    
    // Ottieni statistiche dashboard
    async getStats() {
        try {
            // Conta artisti
            const { count: totalArtists } = await supabase
                .from('artisti')
                .select('*', { count: 'exact', head: true });

            // Agibilità del mese corrente
            const currentMonth = new Date();
            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
            
            const { data: monthlyAgibilita } = await supabase
                .from('agibilita')
                .select('*')
                .gte('data_inizio', firstDay)
                .lte('data_inizio', lastDay);

            // Calcola compensi totali
            let totalCompensation = 0;
            if (monthlyAgibilita && monthlyAgibilita.length > 0) {
                monthlyAgibilita.forEach(agibilita => {
                    if (agibilita.artisti && Array.isArray(agibilita.artisti)) {
                        agibilita.artisti.forEach(artist => {
                            totalCompensation += artist.compenso || 0;
                        });
                    }
                });
            }

            // Calcola completion rate (assumiamo 100% per ora)
            const completionRate = 100;

            return {
                totalArtists: totalArtists || 0,
                monthlyAgibilita: monthlyAgibilita ? monthlyAgibilita.length : 0,
                totalCompensation: totalCompensation,
                completionRate: completionRate
            };
        } catch (error) {
            console.error('Errore nel calcolo statistiche:', error);
            return {
                totalArtists: 0,
                monthlyAgibilita: 0,
                totalCompensation: 0,
                completionRate: 0
            };
        }
    },

    // ==================== UTILITY ====================
    
    // Test connessione
    async testConnection() {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('count', { count: 'exact', head: true });
            
            if (error) throw error;
            
            console.log('✅ Connessione a Supabase riuscita!');
            return true;
        } catch (error) {
            console.error('❌ Errore connessione Supabase:', error);
            return false;
        }
    },

    // Health check del sistema
    async healthCheck() {
        const results = {
            connection: false,
            tables: {
                artisti: false,
                agibilita: false,
                venues: false,
                invoice_data: false
            }
        };

        try {
            // Test connessione generale
            results.connection = await this.testConnection();

            // Test accesso tabelle
            const tables = ['artisti', 'agibilita', 'venues', 'invoice_data'];
            
            for (const table of tables) {
                try {
                    const { error } = await supabase
                        .from(table)
                        .select('count', { count: 'exact', head: true });
                    
                    results.tables[table] = !error;
                } catch (e) {
                    results.tables[table] = false;
                }
            }

            return results;
        } catch (error) {
            console.error('Errore health check:', error);
            return results;
        }
    },

    // Get system info
    async getSystemInfo() {
        const health = await this.healthCheck();
        const stats = await this.getStats();
        
        return {
            health,
            stats,
            version: '1.0.0',
            database: 'Supabase',
            lastCheck: new Date().toISOString()
        };
    }
};

// ==================== TEST CONNECTION FUNCTION ====================
async function testConnection() {
    return DatabaseService.testConnection();
}

// ==================== FUNZIONI GLOBALI PER DEBUG ====================
window.showSystemInfo = async function() {
    const info = await DatabaseService.getSystemInfo();
    console.log('🔍 SYSTEM INFO:', info);
    return info;
};

window.supabaseHealthCheck = async function() {
    const health = await DatabaseService.healthCheck();
    console.log('🏥 HEALTH CHECK:', health);
    return health;
};

// ==================== EXPORT ====================
export { DatabaseService, testConnection };

console.log('✅ Supabase Config caricato - Versione COMPLETA con tutte le funzioni (650+ righe)');
