// supabase-config.js - Configurazione completa Supabase per RECORP ALL-IN-ONE
// Versione completa con tutte le funzionalità

// ==================== CONFIGURAZIONE ====================
// Sostituisci questi valori con le tue credenziali Supabase reali
const SUPABASE_URL = 'https://nommiumuwioddhauju.supabase.co'; // IL TUO URL QUI
const SUPABASE_ANON_KEY = 'LA_TUA_CHIAVE_API_CORRETTA_QUI'; // LA TUA CHIAVE QUI

// Import Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inizializza client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connessione iniziale
export async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('artisti')
            .select('id')
            .limit(1);
        
        if (error) throw error;
        console.log('🟢 Connessione Supabase OK!');
        return true;
    } catch (error) {
        console.error('🔴 Errore connessione Supabase:', error);
        return false;
    }
}

// ==================== DATABASE SERVICE ====================
export class DatabaseService {
    
    // ==================== ARTISTI ====================
    
    // Ottieni tutti gli artisti
    static async getAllArtisti() {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .order('cognome', { ascending: true })
                .order('nome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore caricamento artisti:', error);
            throw error;
        }
    }
    
    // Ottieni artisti con paginazione
    static async getArtisti(limit = 50, offset = 0) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .order('cognome', { ascending: true })
                .order('nome', { ascending: true })
                .range(offset, offset + limit - 1);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore caricamento artisti paginati:', error);
            throw error;
        }
    }
    
    // Cerca artisti per query
    static async searchArtisti(query) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .or(`nome.ilike.%${query}%,cognome.ilike.%${query}%,nome_arte.ilike.%${query}%,codice_fiscale.ilike.%${query}%`)
                .order('cognome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore ricerca artisti:', error);
            throw error;
        }
    }
    
    // Ottieni artista per ID
    static async getArtistaById(id) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Errore caricamento artista:', error);
            throw error;
        }
    }
    
    // Salva nuovo artista
    static async saveArtista(artistData) {
        try {
            console.log('💾 Salvataggio artista:', artistData.nome, artistData.cognome);
            
            // Prepara i dati per il database
            const dbData = {
                nome: artistData.nome.toUpperCase(),
                cognome: artistData.cognome.toUpperCase(),
                nome_arte: artistData.nomeArte || null,
                codice_fiscale: artistData.codiceFiscale.toUpperCase(),
                matricola_enpals: artistData.matricolaENPALS || null,
                data_nascita: artistData.dataNascita,
                sesso: artistData.sesso || null,
                luogo_nascita: artistData.luogoNascita || null,
                provincia_nascita: artistData.provinciaNascita || null,
                eta: artistData.eta,
                nazionalita: artistData.nazionalita || 'IT',
                telefono: artistData.telefono || null,
                email: artistData.email || null,
                indirizzo: artistData.indirizzo,
                provincia: artistData.provincia,
                citta: artistData.citta,
                cap: artistData.cap,
                codice_istat_citta: artistData.codiceIstatCitta || null,
                has_partita_iva: artistData.hasPartitaIva === 'si',
                partita_iva: artistData.partitaIva || null,
                tipo_rapporto: artistData.tipoRapporto || null,
                codice_comunicazione: artistData.codiceComunicazione || null,
                iban: artistData.iban.toUpperCase().replace(/\s/g, ''),
                mansione: artistData.mansione,
                note: artistData.note || null,
                data_registrazione: artistData.dataRegistrazione || new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('artisti')
                .insert([dbData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Errore Supabase insert artista:', error);
                throw error;
            }
            
            console.log('✅ Artista salvato con successo:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Errore in saveArtista:', error);
            throw error;
        }
    }
    
    // Aggiorna artista esistente
    static async updateArtista(artistId, artistData) {
        try {
            console.log('✏️ Aggiornamento artista ID:', artistId);
            
            // Prepara i dati per l'aggiornamento
            const updateData = {
                nome: artistData.nome.toUpperCase(),
                cognome: artistData.cognome.toUpperCase(),
                nome_arte: artistData.nomeArte || null,
                codice_fiscale: artistData.codiceFiscale.toUpperCase(),
                matricola_enpals: artistData.matricolaENPALS || null,
                data_nascita: artistData.dataNascita,
                sesso: artistData.sesso || null,
                luogo_nascita: artistData.luogoNascita || null,
                provincia_nascita: artistData.provinciaNascita || null,
                eta: artistData.eta,
                nazionalita: artistData.nazionalita || 'IT',
                telefono: artistData.telefono || null,
                email: artistData.email || null,
                indirizzo: artistData.indirizzo,
                provincia: artistData.provincia,
                citta: artistData.citta,
                cap: artistData.cap,
                codice_istat_citta: artistData.codiceIstatCitta || null,
                has_partita_iva: artistData.hasPartitaIva === 'si',
                partita_iva: artistData.partitaIva || null,
                tipo_rapporto: artistData.tipoRapporto || null,
                codice_comunicazione: artistData.codiceComunicazione || null,
                iban: artistData.iban.toUpperCase().replace(/\s/g, ''),
                mansione: artistData.mansione,
                note: artistData.note || null,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('artisti')
                .update(updateData)
                .eq('id', artistId)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Errore Supabase update artista:', error);
                throw error;
            }
            
            console.log('✅ Artista aggiornato con successo:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Errore in updateArtista:', error);
            throw error;
        }
    }
    
    // Elimina artista
    static async deleteArtista(artistId) {
        try {
            const { error } = await supabase
                .from('artisti')
                .delete()
                .eq('id', artistId);
            
            if (error) throw error;
            
            console.log('✅ Artista eliminato con successo');
            return true;
        } catch (error) {
            console.error('❌ Errore eliminazione artista:', error);
            throw error;
        }
    }
    
    // Controlla se esiste un artista con il CF specificato
    static async artistaExists(codiceFiscale) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('id, nome, cognome')
                .eq('codice_fiscale', codiceFiscale.toUpperCase())
                .limit(1);
            
            if (error) throw error;
            
            return data && data.length > 0;
        } catch (error) {
            console.error('❌ Errore in artistaExists:', error);
            throw error;
        }
    }
    
    // Controlla se esiste un artista con il CF specificato (escludendo un ID specifico)
    static async artistaExistsExcluding(codiceFiscale, excludeId) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('id, nome, cognome')
                .eq('codice_fiscale', codiceFiscale.toUpperCase())
                .neq('id', excludeId)
                .limit(1);
            
            if (error) throw error;
            
            return data && data.length > 0;
        } catch (error) {
            console.error('❌ Errore in artistaExistsExcluding:', error);
            throw error;
        }
    }
    
    // Ottieni artisti per tipo rapporto
    static async getArtistiByTipoRapporto(tipoRapporto) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .eq('tipo_rapporto', tipoRapporto)
                .order('cognome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore caricamento artisti per tipo rapporto:', error);
            throw error;
        }
    }
    
    // Ottieni artisti a chiamata
    static async getArtistiAChiamata() {
        return this.getArtistiByTipoRapporto('chiamata');
    }
    
    // ==================== VENUES ====================
    
    // Ottieni tutti i venues
    static async getAllVenues() {
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .order('nome', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore caricamento venues:', error);
            throw error;
        }
    }
    
    // Salva venue
    static async saveVenue(venueData) {
        try {
            const { data, error } = await supabase
                .from('venues')
                .insert([venueData])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Venue salvato:', data);
            return data;
        } catch (error) {
            console.error('❌ Errore salvataggio venue:', error);
            throw error;
        }
    }
    
    // ==================== INVOICE DATA ====================
    
    // Ottieni tutti i dati fatturazione
    static async getAllInvoiceData() {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .select('*')
                .order('venue_name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore caricamento dati fatturazione:', error);
            throw error;
        }
    }
    
    // Salva dati fatturazione
    static async saveInvoiceData(invoiceData) {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .upsert([invoiceData], { onConflict: 'venue_name' })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Dati fatturazione salvati:', data);
            return data;
        } catch (error) {
            console.error('❌ Errore salvataggio dati fatturazione:', error);
            throw error;
        }
    }
    
    // ==================== AGIBILITÀ ====================
    
    // Ottieni tutte le agibilità
    static async getAllAgibilita() {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .order('data_creazione', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore caricamento agibilità:', error);
            throw error;
        }
    }
    
    // Salva agibilità
    static async saveAgibilita(agibilitaData) {
        try {
            console.log('💾 Salvataggio agibilità:', agibilitaData.codice);
            
            const dbData = {
                codice: agibilitaData.codice,
                data_inizio: agibilitaData.dataInizio,
                data_fine: agibilitaData.dataFine,
                locale: agibilitaData.locale,
                fatturazione: agibilitaData.fatturazione || null,
                artisti: agibilitaData.artisti,
                xml_content: agibilitaData.xmlContent || null,
                is_modifica: agibilitaData.isModifica || false,
                codice_originale: agibilitaData.codiceOriginale || null,
                identificativo_inps: agibilitaData.identificativoINPS || null,
                data_creazione: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('agibilita')
                .insert([dbData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Errore Supabase insert agibilità:', error);
                throw error;
            }
            
            console.log('✅ Agibilità salvata con successo:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Errore in saveAgibilita:', error);
            throw error;
        }
    }
    
    // Aggiorna agibilità
    static async updateAgibilita(agibilitaId, agibilitaData) {
        try {
            const updateData = {
                codice: agibilitaData.codice,
                data_inizio: agibilitaData.dataInizio,
                data_fine: agibilitaData.dataFine,
                locale: agibilitaData.locale,
                fatturazione: agibilitaData.fatturazione || null,
                artisti: agibilitaData.artisti,
                xml_content: agibilitaData.xmlContent || null,
                is_modifica: agibilitaData.isModifica || false,
                codice_originale: agibilitaData.codiceOriginale || null,
                identificativo_inps: agibilitaData.identificativoINPS || null,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('agibilita')
                .update(updateData)
                .eq('id', agibilitaId)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Agibilità aggiornata:', data);
            return data;
        } catch (error) {
            console.error('❌ Errore aggiornamento agibilità:', error);
            throw error;
        }
    }
    
    // Cerca agibilità per codice
    static async getAgibilitaByCodice(codice) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .eq('codice', codice)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('❌ Errore ricerca agibilità per codice:', error);
            throw error;
        }
    }
    
    // Ottieni agibilità per periodo
    static async getAgibilitaByPeriod(dataInizio, dataFine) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .gte('data_inizio', dataInizio)
                .lte('data_fine', dataFine)
                .order('data_inizio', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Errore caricamento agibilità per periodo:', error);
            throw error;
        }
    }
    
    // ==================== STATISTICHE ====================
    
    // Ottieni statistiche dashboard
    static async getStats() {
        try {
            // Conta artisti
            const { data: artisti, error: artistiError } = await supabase
                .from('artisti')
                .select('id, tipo_rapporto')
                .order('id');
            
            if (artistiError) throw artistiError;
            
            // Conta agibilità
            const { data: agibilita, error: agibilitaError } = await supabase
                .from('agibilita')
                .select('id, data_creazione')
                .order('id');
            
            if (agibilitaError) throw agibilitaError;
            
            // Conta venues
            const { data: venues, error: venuesError } = await supabase
                .from('venues')
                .select('id')
                .order('id');
            
            if (venuesError) throw venuesError;
            
            // Calcola statistiche
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            const agibilitaThisMonth = agibilita.filter(a => {
                const date = new Date(a.data_creazione);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            
            const artistiAChiamata = artisti.filter(a => a.tipo_rapporto === 'chiamata');
            
            return {
                totalArtisti: artisti.length,
                totalAgibilita: agibilita.length,
                totalVenues: venues.length,
                agibilitaThisMonth: agibilitaThisMonth.length,
                artistiAChiamata: artistiAChiamata.length
            };
            
        } catch (error) {
            console.error('❌ Errore caricamento statistiche:', error);
            throw error;
        }
    }
    
    // ==================== UTILITY ====================
    
    // Test connessione
    static async testConnection() {
        return await testConnection();
    }
    
    // Health check completo
    static async healthCheck() {
        try {
            const tests = {
                connection: false,
                artisti: false,
                venues: false,
                agibilita: false,
                invoice_data: false
            };
            
            // Test connessione base
            tests.connection = await this.testConnection();
            
            if (tests.connection) {
                // Test tabelle
                try {
                    await supabase.from('artisti').select('id').limit(1);
                    tests.artisti = true;
                } catch (e) { console.warn('Tabella artisti non accessibile'); }
                
                try {
                    await supabase.from('venues').select('id').limit(1);
                    tests.venues = true;
                } catch (e) { console.warn('Tabella venues non accessibile'); }
                
                try {
                    await supabase.from('agibilita').select('id').limit(1);
                    tests.agibilita = true;
                } catch (e) { console.warn('Tabella agibilita non accessibile'); }
                
                try {
                    await supabase.from('invoice_data').select('id').limit(1);
                    tests.invoice_data = true;
                } catch (e) { console.warn('Tabella invoice_data non accessibile'); }
            }
            
            const allPassed = Object.values(tests).every(test => test === true);
            
            console.log('🏥 Health Check Supabase:', {
                status: allPassed ? 'OK' : 'PARZIALE',
                tests,
                timestamp: new Date().toISOString()
            });
            
            return { status: allPassed ? 'OK' : 'PARZIALE', tests };
            
        } catch (error) {
            console.error('❌ Errore health check:', error);
            return { status: 'ERROR', error: error.message };
        }
    }
    
    // Ottieni info sistema
    static async getSystemInfo() {
        try {
            const stats = await this.getStats();
            const health = await this.healthCheck();
            
            return {
                database: 'Supabase',
                url: SUPABASE_URL,
                health: health.status,
                stats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Errore info sistema:', error);
            return {
                database: 'Supabase',
                url: SUPABASE_URL,
                health: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// ==================== EXPORT ====================

// Export del client per usi avanzati
export { supabase };

// Export default del DatabaseService
export default DatabaseService;

// ==================== FUNZIONI HELPER GLOBALI ====================

// Funzione globale per debug (disponibile in console)
window.showSystemInfo = async function() {
    const info = await DatabaseService.getSystemInfo();
    console.table(info);
    return info;
};

// Funzione globale per health check
window.supabaseHealthCheck = async function() {
    const health = await DatabaseService.healthCheck();
    console.log('🏥 Supabase Health Check:', health);
    return health;
};

// Log inizializzazione
console.log('📡 DatabaseService caricato e pronto!');
console.log('🔧 Usa showSystemInfo() in console per info sistema');
console.log('🏥 Usa supabaseHealthCheck() per controllo stato database');
