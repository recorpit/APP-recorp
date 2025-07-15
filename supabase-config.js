// supabase-config.js - Configurazione SICURA per RECORP con placeholder replacement
// GitHub Actions sostituirà i placeholder con i valori sicuri

// =====================================================
// CONFIGURAZIONE SUPABASE SICURA
// =====================================================

// Funzione per ottenere variabili ambiente in modo sicuro
function getEnvVar(name) {
  // Tentativo 1: import.meta.env (Vite - se disponibile)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[name];
    if (value) {
      console.log(`✅ ${name} caricato da import.meta.env`);
      return value;
    }
  }
  
  // Tentativo 2: process.env (Node.js/Webpack - se disponibile)
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[name];
    if (value) {
      console.log(`✅ ${name} caricato da process.env`);
      return value;
    }
  }
  
  // Tentativo 3: window.env (se impostato manualmente)
  if (typeof window !== 'undefined' && window.env) {
    const value = window.env[name];
    if (value) {
      console.log(`✅ ${name} caricato da window.env`);
      return value;
    }
  }
  
  // Tentativo 4: localStorage per sviluppo locale
  if (typeof localStorage !== 'undefined') {
    const value = localStorage.getItem(name);
    if (value) {
      console.log(`⚠️ ${name} caricato da localStorage (solo sviluppo)`);
      return value;
    }
  }
  
  // Tentativo 5: Valori sostituiti da GitHub Actions
  const placeholderValues = {
    'VITE_SUPABASE_URL': 'PLACEHOLDER_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY': 'PLACEHOLDER_SUPABASE_ANON_KEY'
  };
  
  const placeholderValue = placeholderValues[name];
  if (placeholderValue && !placeholderValue.startsWith('PLACEHOLDER_')) {
    console.log(`✅ ${name} caricato da GitHub Actions replacement`);
    return placeholderValue;
  }
  
  // NESSUN FALLBACK HARDCODED - SICUREZZA MASSIMA
  console.error(`❌ Variabile ambiente ${name} non trovata!`);
  throw new Error(`Configurazione mancante: ${name}. Configurare le variabili ambiente.`);
}

// 🔧 CONFIGURAZIONE CON PLACEHOLDER (GitHub Actions li sostituirà)
let supabaseUrl, supabaseAnonKey;

try {
  // Prima prova i metodi normali, poi i placeholder
  try {
    supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
    supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
  } catch (envError) {
    // Se fallisce, usa i placeholder che verranno sostituiti
    console.log('🔄 Usando configurazione placeholder per GitHub Actions...');
    
    supabaseUrl = 'PLACEHOLDER_SUPABASE_URL';
    supabaseAnonKey = 'PLACEHOLDER_SUPABASE_ANON_KEY';
    
    // Verifica che i placeholder siano stati sostituiti
    if (supabaseUrl.startsWith('PLACEHOLDER_') || supabaseAnonKey.startsWith('PLACEHOLDER_')) {
      throw new Error('❌ Placeholder non sostituiti. Configurare GitHub Secrets.');
    }
    
    console.log('✅ Configurazione caricata da GitHub Actions replacement');
  }
} catch (error) {
  // Per sviluppo locale, mostra come configurare
  console.error('🚨 CONFIGURAZIONE MANCANTE!');
  console.error('📋 Per configurare le credenziali:');
  console.error('');
  console.error('OPZIONE 1 - localStorage (sviluppo locale):');
  console.error('localStorage.setItem("VITE_SUPABASE_URL", "https://nommluymuwioddhaujxu.supabase.co");');
  console.error('localStorage.setItem("VITE_SUPABASE_ANON_KEY", "la_tua_anon_key");');
  console.error('');
  console.error('OPZIONE 2 - window.env (sviluppo locale):');
  console.error('window.env = { VITE_SUPABASE_URL: "...", VITE_SUPABASE_ANON_KEY: "..." };');
  console.error('');
  console.error('OPZIONE 3 - GitHub Secrets (produzione):');
  console.error('Repository → Settings → Secrets → Add VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  
  // Mostra errore in pagina
  if (typeof document !== 'undefined') {
    document.body.innerHTML = `
      <div style="
        font-family: Arial, sans-serif; 
        max-width: 600px; 
        margin: 50px auto; 
        padding: 30px; 
        background: #fee; 
        border: 2px solid #c33; 
        border-radius: 10px;
        text-align: center;
      ">
        <h2 style="color: #c33;">🚨 Configurazione Supabase Mancante</h2>
        <p>Le credenziali del database non sono configurate.</p>
        <p><strong>Per sviluppatori:</strong></p>
        <p>Controllare la console per le istruzioni di configurazione.</p>
        <button onclick="location.reload()" style="
          background: #2563eb; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer; 
          margin-top: 15px;
        ">
          🔄 Riprova
        </button>
        <p style="font-size: 0.9em; color: #666; margin-top: 20px;">
          Questo errore protegge la sicurezza impedendo credenziali hardcoded.
        </p>
      </div>
    `;
  }
  
  throw error;
}

// Verifica che Supabase sia caricato
if (typeof window === 'undefined' || !window.supabase) {
  throw new Error('❌ Supabase client non caricato. Assicurati che il CDN sia importato.');
}

// Inizializza Supabase client con configurazione sicura
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

console.log('✅ Supabase configurato SICURAMENTE:', {
  url: supabaseUrl.substring(0, 30) + '...',
  keyLength: supabaseAnonKey.length,
  secure: true,
  method: supabaseUrl.startsWith('http') ? 'GitHub Actions' : 'Environment Variables'
});

// =====================================================
// RESTO DEL CODICE RIMANE IDENTICO...
// =====================================================

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
                .select('id, nome, cognome, codice_fiscale, codice_fiscale_temp, tipo_registrazione, mansione, email, telefono, compenso_default, nazionalita, nome_arte, matricola_enpals, has_partita_iva, tipo_rapporto, codice_comunicazione, partita_iva, iban')
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

    // ==================== GESTIONE COMUNICAZIONI (SICURA) ====================
    async getComunicazioni() {
        try {
            const { data, error } = await this.supabase
                .from('comunicazioni')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.warn('Tabella comunicazioni non accessibile:', error);
                return [];
            }
            return data || [];
        } catch (error) {
            console.warn('Errore recupero comunicazioni (fallback attivo):', error);
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

    // ==================== STATISTICHE SICURE CON FALLBACK ====================
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
            
            // Recupera agibilità del mese per contare artisti
            const { data: agibilitaMeseData } = await this.supabase
                .from('agibilita')
                .select('artisti')
                .gte('created_at', firstDayOfMonth.toISOString());
            
            // Conta artisti nel mese (sia unici che totali)
            let artistiUniciMese = 0;
            let artistiTotaliMese = 0;
            const setArtistiUnici = new Set();
            
            if (agibilitaMeseData) {
                agibilitaMeseData.forEach(agibilita => {
                    if (agibilita.artisti && Array.isArray(agibilita.artisti)) {
                        artistiTotaliMese += agibilita.artisti.length;
                        agibilita.artisti.forEach(artista => {
                            if (artista.cf) {
                                setArtistiUnici.add(artista.cf);
                            }
                        });
                    }
                });
                artistiUniciMese = setArtistiUnici.size;
            }
            
            // Calcola media artisti per agibilità
            const mediaArtistiPerAgibilita = agibilitaMese > 0 ? 
                (artistiTotaliMese / agibilitaMese).toFixed(1) : 0;
            
            // Conta bozze con gestione errori
            let bozzeSospese = 0;
            try {
                const { count } = await this.supabase
                    .from('agibilita_bozze')
                    .select('*', { count: 'exact', head: true });
                bozzeSospese = count || 0;
            } catch (e) {
                console.warn('Tabella bozze non disponibile:', e);
                bozzeSospese = 0;
            }
            
            // Conta comunicazioni con gestione errori
            let comunicazioniAnno = 0;
            try {
                const { count } = await this.supabase
                    .from('comunicazioni')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', firstDayOfYear.toISOString());
                comunicazioniAnno = count || 0;
            } catch (e) {
                console.warn('Tabella comunicazioni non disponibile:', e);
                comunicazioniAnno = 0;
            }
            
            return {
                artisti: totalArtisti || 0,
                agibilita_totali: totalAgibilita || 0,
                agibilita_mese: agibilitaMese || 0,
                artisti_unici_mese: artistiUniciMese,
                artisti_totali_mese: artistiTotaliMese,
                media_artisti_agibilita: mediaArtistiPerAgibilita,
                bozze_sospese: bozzeSospese,
                comunicazioni_anno: comunicazioniAnno
            };
        } catch (error) {
            console.error('Errore recupero statistiche:', error);
            return {
                artisti: 0,
                agibilita_totali: 0,
                agibilita_mese: 0,
                artisti_unici_mese: 0,
                artisti_totali_mese: 0,
                media_artisti_agibilita: 0,
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
}

// =====================================================
// EXPORTS E COMPATIBILITÀ
// =====================================================

// Crea istanza singleton del servizio
const dbService = new DatabaseService();

// Esporta per l'uso in altri moduli
export { dbService as DatabaseService, supabase };

// Per retrocompatibilità, esporta anche come window object
window.DatabaseService = dbService;
window.supabase = supabase;

console.log('🔌 Supabase configurato SICURAMENTE e pronto');