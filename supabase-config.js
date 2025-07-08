// supabase-config.js
// Configurazione per collegare RECORP a Supabase

// SOSTITUISCI CON LE TUE CREDENZIALI REALI
const SUPABASE_URL = 'https://nommiumuwioddhauju.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbW1sdXltdXdpb2RkaGF1anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODA5MjgsImV4cCI6MjA2NzU1NjkyOH0.oaF5uaNe21W8NU67n1HjngngMUClkss2achTQ7BZ5tE' // Sostituisci con la tua chiave completa

// Import Supabase da CDN (funziona senza npm)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Crea client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Funzioni helper per il database
export class DatabaseService {
    
    // ==================== ARTISTI ====================
    
    // Ottieni tutti gli artisti
    static async getArtisti() {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .order('cognome', { ascending: true })
            
            if (error) throw error
            console.log('✅ Artisti caricati:', data?.length || 0)
            return data || []
        } catch (error) {
            console.error('❌ Errore caricamento artisti:', error)
            throw error
        }
    }
    
    // Salva nuovo artista
    static async saveArtista(artistData) {
        try {
            // Converte i campi per il database
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
                iban: artistData.iban.toUpperCase().replace(/\s/g, ''),
                mansione: artistData.mansione,
                note: artistData.note || null,
                data_registrazione: artistData.dataRegistrazione || new Date().toISOString()
            }
            
            const { data, error } = await supabase
                .from('artisti')
                .insert([dbData])
                .select()
            
            if (error) throw error
            console.log('✅ Artista salvato:', data[0])
            return data[0]
        } catch (error) {
            console.error('❌ Errore salvataggio artista:', error)
            throw error
        }
    }
    
    // Cerca artisti
    static async searchArtisti(searchTerm) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('*')
                .or(`nome.ilike.%${searchTerm}%,cognome.ilike.%${searchTerm}%,nome_arte.ilike.%${searchTerm}%,codice_fiscale.ilike.%${searchTerm}%`)
            
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('❌ Errore ricerca artisti:', error)
            throw error
        }
    }
    
    // Controlla se esiste artista con CF
    static async artistaExists(codiceFiscale) {
        try {
            const { data, error } = await supabase
                .from('artisti')
                .select('id')
                .eq('codice_fiscale', codiceFiscale.toUpperCase())
                .limit(1)
            
            if (error) throw error
            return data && data.length > 0
        } catch (error) {
            console.error('❌ Errore controllo duplicati:', error)
            return false
        }
    }
    
    // ==================== VENUES ====================
    
    // Ottieni tutti i venues
    static async getVenues() {
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .order('nome', { ascending: true })
            
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('❌ Errore caricamento venues:', error)
            throw error
        }
    }
    
    // Salva nuovo venue
    static async saveVenue(venueData) {
        try {
            const { data, error } = await supabase
                .from('venues')
                .insert([venueData])
                .select()
            
            if (error) throw error
            console.log('✅ Venue salvato:', data[0])
            return data[0]
        } catch (error) {
            console.error('❌ Errore salvataggio venue:', error)
            throw error
        }
    }
    
    // ==================== INVOICE DATA ====================
    
    // Ottieni dati fatturazione per venue
    static async getInvoiceDataForVenue(venueName) {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .select('*')
                .eq('venue_name', venueName)
                .single()
            
            if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
            return data || null
        } catch (error) {
            console.error('❌ Errore caricamento dati fatturazione:', error)
            return null
        }
    }
    
    // Salva dati fatturazione
    static async saveInvoiceData(invoiceData) {
        try {
            const { data, error } = await supabase
                .from('invoice_data')
                .upsert([invoiceData], { 
                    onConflict: 'venue_name'
                })
                .select()
            
            if (error) throw error
            console.log('✅ Dati fatturazione salvati:', data[0])
            return data[0]
        } catch (error) {
            console.error('❌ Errore salvataggio dati fatturazione:', error)
            throw error
        }
    }
    
    // ==================== AGIBILITÀ ====================
    
    // Ottieni tutte le agibilità
    static async getAgibilita() {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .order('data_creazione', { ascending: false })
            
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('❌ Errore caricamento agibilità:', error)
            throw error
        }
    }
    
    // Salva nuova agibilità
    static async saveAgibilita(agibilitaData) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .insert([agibilitaData])
                .select()
            
            if (error) throw error
            console.log('✅ Agibilità salvata:', data[0])
            return data[0]
        } catch (error) {
            console.error('❌ Errore salvataggio agibilità:', error)
            throw error
        }
    }
    
    // Cerca agibilità
    static async searchAgibilita(searchTerm) {
        try {
            const { data, error } = await supabase
                .from('agibilita')
                .select('*')
                .or(`codice.ilike.%${searchTerm}%`)
                .order('data_creazione', { ascending: false })
            
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('❌ Errore ricerca agibilità:', error)
            throw error
        }
    }
    
    // ==================== STATISTICHE ====================
    
    // Ottieni statistiche dashboard
    static async getStats() {
        try {
            // Conta artisti
            const { count: artistiCount } = await supabase
                .from('artisti')
                .select('*', { count: 'exact', head: true })
            
            // Conta agibilità del mese corrente
            const currentMonth = new Date().getMonth() + 1
            const currentYear = new Date().getFullYear()
            const startOfMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
            const endOfMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-31`
            
            const { count: agibilitaCount } = await supabase
                .from('agibilita')
                .select('*', { count: 'exact', head: true })
                .gte('data_inizio', startOfMonth)
                .lte('data_inizio', endOfMonth)
            
            // Calcola compenso totale (questo richiederà un calcolo lato client)
            const { data: agibilita } = await supabase
                .from('agibilita')
                .select('artisti')
            
            let totalCompensation = 0
            if (agibilita) {
                agibilita.forEach(a => {
                    if (a.artisti && Array.isArray(a.artisti)) {
                        a.artisti.forEach(artista => {
                            totalCompensation += parseFloat(artista.compenso) || 0
                        })
                    }
                })
            }
            
            return {
                totalArtists: artistiCount || 0,
                monthlyAgibilita: agibilitaCount || 0,
                totalCompensation: totalCompensation,
                completionRate: 100 // Per ora fisso al 100%
            }
        } catch (error) {
            console.error('❌ Errore caricamento statistiche:', error)
            return {
                totalArtists: 0,
                monthlyAgibilita: 0,
                totalCompensation: 0,
                completionRate: 0
            }
        }
    }
}

// Funzione di test connessione
export async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('artisti')
            .select('count(*)')
            .limit(1)
        
        if (error) throw error
        console.log('🟢 Connessione Supabase OK!')
        return true
    } catch (error) {
        console.error('🔴 Errore connessione Supabase:', error)
        return false
    }
}

console.log('📡 DatabaseService caricato e pronto!')
