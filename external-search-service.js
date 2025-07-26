// external-search-service.js - Servizio per ricerche esterne (Venue e P.IVA)

class ExternalSearchService {
    constructor() {
        this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
        this.overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
        this.registroImpreseUrl = 'https://www.registroimprese.it/api/ricerca';
        this.pivaVerifyUrl = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat';
        
        // Rate limiting per rispettare i limiti delle API gratuite
        this.lastNominatimRequest = 0;
        this.nominatimDelay = 1000; // 1 secondo tra le richieste
        
        this.lastOverpassRequest = 0;
        this.overpassDelay = 1000; // 1 secondo tra le richieste
    }

    // ==================== RICERCA VENUE ====================
    
    /**
     * Cerca locali da ballo, club e sale eventi in Italia
     * @param {string} searchTerm - Termine di ricerca
     * @param {string} city - Città (opzionale)
     * @param {string} province - Provincia (opzionale)
     * @returns {Promise<Array>} Lista di venue trovati
     */
    async searchVenues(searchTerm, city = '', province = '') {
        console.log('🔍 Ricerca venue esterni:', { searchTerm, city, province });
        
        try {
            const results = [];
            
            // 1. Cerca con Overpass API (venue specifici)
            const overpassResults = await this.searchVenuesOverpass(searchTerm, city, province);
            results.push(...overpassResults);
            
            // 2. Se pochi risultati, cerca con Nominatim (ricerca generale)
            if (results.length < 3) {
                const nominatimResults = await this.searchVenuesNominatim(searchTerm, city, province);
                results.push(...nominatimResults);
            }
            
            // 3. Rimuovi duplicati e normalizza dati
            const uniqueResults = this.deduplicateVenues(results);
            
            console.log(`✅ Trovati ${uniqueResults.length} venue esterni`);
            return uniqueResults;
            
        } catch (error) {
            console.error('❌ Errore ricerca venue esterni:', error);
            return [];
        }
    }
    
    /**
     * Ricerca venue specifici con Overpass API
     */
    async searchVenuesOverpass(searchTerm, city, province) {
        await this.rateLimitOverpass();
        
        try {
            // Query Overpass per locali da ballo, club, teatri, sale eventi
            const query = this.buildOverpassQuery(searchTerm, city, province);
            
            const response = await fetch(this.overpassBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `data=${encodeURIComponent(query)}`
            });
            
            if (!response.ok) {
                throw new Error(`Overpass API error: ${response.status}`);
            }
            
            const data = await response.json();
            return this.parseOverpassResults(data);
            
        } catch (error) {
            console.error('❌ Errore Overpass API:', error);
            return [];
        }
    }
    
    /**
     * Ricerca generale con Nominatim
     */
    async searchVenuesNominatim(searchTerm, city, province) {
        await this.rateLimitNominatim();
        
        try {
            const searchQuery = this.buildNominatimQuery(searchTerm, city, province);
            
            const url = `${this.nominatimBaseUrl}/search?` + new URLSearchParams({
                q: searchQuery,
                format: 'jsonv2',
                countrycodes: 'it',
                addressdetails: 1,
                limit: 10,
                'accept-language': 'it'
            });
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'RECORP-Agibilita/1.0 (amministrazione@recorp.it)'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Nominatim API error: ${response.status}`);
            }
            
            const data = await response.json();
            return this.parseNominatimResults(data, searchTerm);
            
        } catch (error) {
            console.error('❌ Errore Nominatim API:', error);
            return [];
        }
    }
    
    // ==================== RICERCA P.IVA ====================
    
    /**
     * Cerca dati azienda tramite P.IVA
     * @param {string} piva - Partita IVA (11 cifre)
     * @returns {Promise<Object|null>} Dati azienda o null
     */
    async searchCompanyByPIVA(piva) {
        console.log('🔍 Ricerca azienda per P.IVA:', piva);
        
        // Normalizza P.IVA
        const normalizedPiva = piva.replace(/\D/g, '');
        
        if (!this.isValidPIVA(normalizedPiva)) {
            throw new Error('Partita IVA non valida');
        }
        
        try {
            // 1. Prima verifica validità con VIES (UE)
            const viesData = await this.verifyPIVAWithVIES(normalizedPiva);
            
            // 2. Cerca dati completi con servizi italiani
            const companyData = await this.searchCompanyDataItaly(normalizedPiva);
            
            // 3. Combina i risultati
            const result = {
                piva: normalizedPiva,
                valid: viesData.valid,
                ragioneSociale: companyData.ragioneSociale || viesData.name || '',
                indirizzo: companyData.indirizzo || viesData.address || '',
                citta: companyData.citta || '',
                cap: companyData.cap || '',
                provincia: companyData.provincia || '',
                codiceFiscale: companyData.codiceFiscale || '',
                source: companyData.source || 'vies'
            };
            
            console.log('✅ Dati azienda trovati:', result.ragioneSociale);
            return result;
            
        } catch (error) {
            console.error('❌ Errore ricerca P.IVA:', error);
            throw error;
        }
    }
    
    /**
     * Verifica P.IVA con sistema VIES europeo
     */
    async verifyPIVAWithVIES(piva) {
        try {
            const url = `${this.pivaVerifyUrl}/${piva}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`VIES API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                valid: data.valid || false,
                name: data.name || '',
                address: data.address || ''
            };
            
        } catch (error) {
            console.warn('⚠️ VIES non disponibile, continuo con altre fonti:', error.message);
            return { valid: true, name: '', address: '' }; // Fallback ottimistico
        }
    }
    
    /**
     * Cerca dati azienda con servizi italiani gratuiti
     */
    async searchCompanyDataItaly(piva) {
        // Questo è un placeholder - implementazione dipende dai servizi disponibili
        // Potresti usare:
        // 1. API Camera di Commercio (se disponibili gratuitamente)
        // 2. Scraping di servizi pubblici (con cautela)
        // 3. Database open data governativi
        
        console.log('🇮🇹 Ricerca dati italiani per P.IVA:', piva);
        
        try {
            // Esempio di implementazione con servizio fittizio
            // Sostituire con API reale quando disponibile
            const mockData = await this.searchPIVAMockService(piva);
            return mockData;
            
        } catch (error) {
            console.warn('⚠️ Servizi italiani non disponibili:', error.message);
            return {
                ragioneSociale: '',
                indirizzo: '',
                citta: '',
                cap: '',
                provincia: '',
                codiceFiscale: '',
                source: 'none'
            };
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Rate limiting per Nominatim (1 req/sec)
     */
    async rateLimitNominatim() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastNominatimRequest;
        
        if (timeSinceLastRequest < this.nominatimDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, this.nominatimDelay - timeSinceLastRequest)
            );
        }
        
        this.lastNominatimRequest = Date.now();
    }
    
    /**
     * Rate limiting per Overpass (1 req/sec)
     */
    async rateLimitOverpass() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastOverpassRequest;
        
        if (timeSinceLastRequest < this.overpassDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, this.overpassDelay - timeSinceLastRequest)
            );
        }
        
        this.lastOverpassRequest = Date.now();
    }
    
    /**
     * Costruisce query Overpass per venue specifici
     */
    buildOverpassQuery(searchTerm, city, province) {
        const bbox = this.getItalyBoundingBox(province);
        
        return `
            [out:json][timeout:25];
            (
                node["amenity"="nightclub"]${bbox};
                node["amenity"="theatre"]${bbox};
                node["leisure"="dance"]${bbox};
                node["amenity"="community_centre"]${bbox};
                node["amenity"="events_venue"]${bbox};
                way["amenity"="nightclub"]${bbox};
                way["amenity"="theatre"]${bbox};
                way["leisure"="dance"]${bbox};
                way["amenity"="community_centre"]${bbox};
                way["amenity"="events_venue"]${bbox};
            );
            out center meta;
        `;
    }
    
    /**
     * Costruisce query Nominatim
     */
    buildNominatimQuery(searchTerm, city, province) {
        let query = searchTerm;
        
        if (city) {
            query += ` ${city}`;
        }
        
        if (province) {
            query += ` ${province}`;
        }
        
        query += ' Italia';
        
        return query;
    }
    
    /**
     * Parse risultati Overpass
     */
    parseOverpassResults(data) {
        if (!data.elements) return [];
        
        return data.elements
            .filter(element => element.tags && element.tags.name)
            .map(element => {
                const lat = element.lat || (element.center && element.center.lat);
                const lon = element.lon || (element.center && element.center.lon);
                
                return {
                    nome: element.tags.name,
                    tipo: this.getVenueType(element.tags),
                    indirizzo: this.buildAddressFromTags(element.tags),
                    citta: element.tags['addr:city'] || '',
                    cap: element.tags['addr:postcode'] || '',
                    provincia: element.tags['addr:province'] || '',
                    telefono: element.tags.phone || '',
                    website: element.tags.website || '',
                    coordinates: lat && lon ? { lat, lon } : null,
                    source: 'overpass',
                    osm_id: element.id
                };
            })
            .filter(venue => venue.nome && venue.indirizzo);
    }
    
    /**
     * Parse risultati Nominatim
     */
    parseNominatimResults(data, searchTerm) {
        return data
            .filter(item => 
                item.display_name && 
                item.address &&
                this.isRelevantVenue(item, searchTerm)
            )
            .map(item => ({
                nome: this.extractVenueName(item),
                tipo: this.guessVenueType(item),
                indirizzo: this.buildAddressFromNominatim(item.address),
                citta: item.address.city || item.address.town || item.address.village || '',
                cap: item.address.postcode || '',
                provincia: item.address.state || '',
                coordinates: {
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon)
                },
                source: 'nominatim',
                osm_id: item.osm_id
            }))
            .filter(venue => venue.nome && venue.indirizzo);
    }
    
    /**
     * Rimuove duplicati dai risultati venue
     */
    deduplicateVenues(venues) {
        const seen = new Set();
        return venues.filter(venue => {
            const key = `${venue.nome.toLowerCase()}-${venue.citta.toLowerCase()}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    
    /**
     * Determina tipo di venue da tag OSM
     */
    getVenueType(tags) {
        if (tags.amenity === 'nightclub') return 'Discoteca';
        if (tags.amenity === 'theatre') return 'Teatro';
        if (tags.leisure === 'dance') return 'Sala da ballo';
        if (tags.amenity === 'community_centre') return 'Centro eventi';
        if (tags.amenity === 'events_venue') return 'Sala eventi';
        return 'Locale';
    }
    
    /**
     * Costruisce indirizzo da tag OSM
     */
    buildAddressFromTags(tags) {
        const parts = [];
        
        if (tags['addr:street']) {
            parts.push(tags['addr:street']);
        }
        
        if (tags['addr:housenumber']) {
            parts.push(tags['addr:housenumber']);
        }
        
        return parts.join(' ') || tags.name || '';
    }
    
    /**
     * Costruisce indirizzo da risultato Nominatim
     */
    buildAddressFromNominatim(address) {
        const parts = [];
        
        if (address.road) {
            parts.push(address.road);
        }
        
        if (address.house_number) {
            parts.push(address.house_number);
        }
        
        return parts.join(' ') || '';
    }
    
    /**
     * Estrae nome venue da risultato Nominatim
     */
    extractVenueName(item) {
        // Prova diversi campi per il nome
        return item.name || 
               item.display_name.split(',')[0] || 
               'Locale senza nome';
    }
    
    /**
     * Indovina tipo venue da risultato Nominatim
     */
    guessVenueType(item) {
        const displayName = item.display_name.toLowerCase();
        const category = item.category || '';
        
        if (displayName.includes('disco') || displayName.includes('club')) return 'Discoteca';
        if (displayName.includes('teatro') || category === 'theatre') return 'Teatro';
        if (displayName.includes('sala') || displayName.includes('centro')) return 'Sala eventi';
        
        return 'Locale';
    }
    
    /**
     * Verifica se il risultato è rilevante per la ricerca venue
     */
    isRelevantVenue(item, searchTerm) {
        const relevantCategories = [
            'leisure', 'amenity', 'tourism', 'building'
        ];
        
        const relevantTypes = [
            'nightclub', 'theatre', 'community_centre', 'event_venue',
            'arts_centre', 'music_venue', 'conference_centre'
        ];
        
        return relevantCategories.includes(item.category) ||
               relevantTypes.includes(item.type) ||
               item.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    /**
     * Bounding box per Italia (opzionale per provincia)
     */
    getItalyBoundingBox(province = '') {
        // Bounding box generale Italia
        const italyBbox = '[bbox:36.619987291,6.7499552751,47.1153931748,18.4802470232]';
        
        // Qui potresti aggiungere bounding box specifici per provincia
        // se vuoi restringere la ricerca geograficamente
        
        return italyBbox;
    }
    
    /**
     * Valida formato P.IVA italiana
     */
    isValidPIVA(piva) {
        if (!/^\d{11}$/.test(piva)) return false;
        
        // Algoritmo di controllo P.IVA italiana
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            let digit = parseInt(piva[i]);
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }
        
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(piva[10]);
    }
    
    /**
     * Servizio mock per test P.IVA (sostituire con API reale)
     */
    async searchPIVAMockService(piva) {
        // Simula ricerca in database aziendale
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Dati di esempio - sostituire con API reale
        const mockDatabase = {
            '04433920248': {
                ragioneSociale: 'RECORP SRL',
                indirizzo: 'Via Monte Pasubio 222/1',
                citta: 'Zanè',
                cap: '36010',
                provincia: 'VI',
                codiceFiscale: '04433920248',
                source: 'registro_imprese'
            }
        };
        
        return mockDatabase[piva] || {
            ragioneSociale: '',
            indirizzo: '',
            citta: '',
            cap: '',
            provincia: '',
            codiceFiscale: '',
            source: 'not_found'
        };
    }
}

// Esporta servizio
export { ExternalSearchService };