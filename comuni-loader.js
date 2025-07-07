// comuni-loader.js - Sistema per caricare database GI (file ufficiali italiani)

// Variabili globali per i database
let comuniDatabase = {
    cap: null,
    comuni: null,
    comuniCap: null,
    comuniValidita: null,
    province: null
};

let isLoading = false;
let isLoaded = false;

// Rileva automaticamente il percorso base per i file GI
function getBasePath() {
    const currentPath = window.location.pathname;
    
    // Se siamo in una sottocartella (contiene /agibilita/)
    if (currentPath.includes('/agibilita/')) {
        return '../data/';
    }
    
    // Se siamo nella root
    return './data/';
}

// Configurazione files del database GI
const GI_DATABASE_CONFIG = {
    files: {
        cap: getBasePath() + 'gi_cap.json',
        comuni: getBasePath() + 'gi_comuni.json', 
        comuniCap: getBasePath() + 'gi_comuni_cap.json',
        comuniValidita: getBasePath() + 'gi_comuni_validita.json',
        province: getBasePath() + 'gi_province.json'
    },
    // Cache nel localStorage per performance
    useCache: true,
    cacheExpiry: 24 * 60 * 60 * 1000 // 24 ore
};

// Inizializza il caricamento del database GI
async function initializeGIDatabase() {
    if (isLoading || isLoaded) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        // Prova a caricare dalla cache prima
        if (GI_DATABASE_CONFIG.useCache) {
            const cached = loadFromCache();
            if (cached) {
                comuniDatabase = cached;
                isLoaded = true;
                isLoading = false;
                hideLoadingIndicator();
                console.log('📦 Database GI caricato dalla cache');
                return;
            }
        }
        
        // Carica tutti i file GI
        const loadPromises = Object.entries(GI_DATABASE_CONFIG.files).map(
            ([key, path]) => loadGIFile(key, path)
        );
        
        await Promise.all(loadPromises);
        
        // Salva in cache se abilitata
        if (GI_DATABASE_CONFIG.useCache) {
            saveToCache(comuniDatabase);
        }
        
        isLoaded = true;
        console.log('🇮🇹 Database GI caricato completamente');
        
    } catch (error) {
        console.error('❌ Errore caricamento database GI:', error);
        // Fallback ai dati minimi
        loadFallbackData();
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

// Carica un singolo file GI
async function loadGIFile(key, path) {
    try {
        console.log(`📄 Caricamento ${key} da ${path}...`);
        
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        comuniDatabase[key] = data;
        
        console.log(`✅ ${key} caricato: ${Array.isArray(data) ? data.length : Object.keys(data).length} elementi`);
        
    } catch (error) {
        console.error(`❌ Errore caricamento ${key}:`, error);
        throw error;
    }
}

// Carica dalla cache localStorage
function loadFromCache() {
    try {
        const cacheKey = 'gi_database_cache';
        const cached = localStorage.getItem(cacheKey);
        
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        
        // Controlla se la cache è scaduta
        if (Date.now() - timestamp > GI_DATABASE_CONFIG.cacheExpiry) {
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        return data;
        
    } catch (error) {
        console.error('Errore lettura cache:', error);
        return null;
    }
}

// Salva in cache localStorage
function saveToCache(data) {
    try {
        const cacheKey = 'gi_database_cache';
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('💾 Database GI salvato in cache');
        
    } catch (error) {
        console.error('Errore salvataggio cache:', error);
    }
}

// Dati di fallback minimi
function loadFallbackData() {
    console.log('🔄 Caricamento dati di fallback...');
    
    comuniDatabase = {
        comuni: [
            { denominazione: "VICENZA", codiceCatastale: "L840", siglaProvincialeSedeMunicipio: "VI" },
            { denominazione: "VENEZIA", codiceCatastale: "L736", siglaProvincialeSedeMunicipio: "VE" },
            { denominazione: "ZANE'", codiceCatastale: "M145", siglaProvincialeSedeMunicipio: "VI" },
            { denominazione: "COGOLLO DEL CENGIO", codiceCatastale: "C822", siglaProvincialeSedeMunicipio: "VI" }
        ],
        province: [
            { sigla: "VI", denominazione: "VICENZA" },
            { sigla: "VE", denominazione: "VENEZIA" },
            { sigla: "VR", denominazione: "VERONA" },
            { sigla: "PD", denominazione: "PADOVA" },
            { sigla: "TV", denominazione: "TREVISO" },
            { sigla: "RO", denominazione: "ROVIGO" },
            { sigla: "BL", denominazione: "BELLUNO" }
        ],
        comuniCap: [
            { comune: "L840", cap: "36100" },
            { comune: "L736", cap: "30100" },
            { comune: "M145", cap: "36010" },
            { comune: "C822", cap: "36010" }
        ]
    };
    
    isLoaded = true;
}

// FUNZIONI DI RICERCA E UTILITÀ

// Cerca comuni per termine di ricerca
function searchComuni(searchTerm) {
    if (!isLoaded || !comuniDatabase.comuni) {
        return [];
    }
    
    const term = searchTerm.toLowerCase().trim();
    if (term.length < 2) return [];
    
    return comuniDatabase.comuni
        .filter(comune => {
            const nome = comune.denominazione || comune.nome || '';
            const provincia = comune.siglaProvincialeSedeMunicipio || comune.provincia || '';
            
            // Cerca per CAP se il termine è numerico
            if (/^\d+$/.test(searchTerm)) {
                const capRecord = comuniDatabase.comuniCap?.find(cap => 
                    cap.cap.includes(searchTerm) && cap.comune === (comune.codiceCatastale || comune.codice)
                );
                return !!capRecord;
            }
            
            return nome.toLowerCase().includes(term) ||
                   provincia.toLowerCase().includes(term);
        })
        .slice(0, 10) // Limita risultati
        .map(comune => ({
            nome: comune.denominazione || comune.nome,
            codice: comune.codiceCatastale || comune.codice,
            provincia: comune.siglaProvincialeSedeMunicipio || comune.provincia,
            cap: getCAPForComune(comune.codiceCatastale || comune.codice)
        }));
}

// Ottieni CAP per un comune
function getCAPForComune(codiceComune) {
    if (!comuniDatabase.comuniCap) return '';
    
    const capRecord = comuniDatabase.comuniCap.find(cap => cap.comune === codiceComune);
    return capRecord ? capRecord.cap : '';
}

// Cerca per CAP
function searchByCAP(cap) {
    if (!isLoaded || !comuniDatabase.comuniCap) {
        return [];
    }
    
    return comuniDatabase.comuniCap
        .filter(item => item.cap === cap)
        .map(item => {
            const comune = getComuneByCodice(item.comune);
            return {
                ...item,
                nomeComune: comune ? comune.nome : 'Sconosciuto',
                provincia: comune ? comune.provincia : ''
            };
        });
}

// Ottieni comune per codice
function getComuneByCodice(codice) {
    if (!isLoaded || !comuniDatabase.comuni) {
        return null;
    }
    
    const comune = comuniDatabase.comuni.find(c => 
        (c.codiceCatastale || c.codice) === codice
    );
    
    if (!comune) return null;
    
    return {
        nome: comune.denominazione || comune.nome,
        codice: comune.codiceCatastale || comune.codice,
        provincia: comune.siglaProvincialeSedeMunicipio || comune.provincia,
        cap: getCAPForComune(comune.codiceCatastale || comune.codice)
    };
}

// Ottieni provincia per codice
function getProvinciaByCode(codice) {
    if (!isLoaded || !comuniDatabase.province) {
        return null;
    }
    
    const provincia = comuniDatabase.province.find(p => 
        (p.sigla || p.codice) === codice
    );
    
    return provincia ? {
        codice: provincia.sigla || provincia.codice,
        nome: provincia.denominazione || provincia.nome
    } : null;
}

// Valida CAP per provincia
function validateCAPForProvincia(cap, provincia) {
    if (!isLoaded) return false;
    
    const risultatiCAP = searchByCAP(cap);
    return risultatiCAP.some(item => item.provincia === provincia);
}

// Ottieni tutti i comuni di una provincia
function getComuniByProvincia(codiceProvincia) {
    if (!isLoaded || !comuniDatabase.comuni) {
        return [];
    }
    
    return comuniDatabase.comuni
        .filter(comune => (comune.siglaProvincialeSedeMunicipio || comune.provincia) === codiceProvincia)
        .map(comune => ({
            nome: comune.denominazione || comune.nome,
            codice: comune.codiceCatastale || comune.codice,
            provincia: comune.siglaProvincialeSedeMunicipio || comune.provincia,
            cap: getCAPForComune(comune.codiceCatastale || comune.codice)
        }));
}

// FUNZIONI UI

// Mostra indicatore di caricamento
function showLoadingIndicator() {
    const indicator = document.getElementById('dbLoadingIndicator');
    if (indicator) {
        indicator.style.display = 'block';
        return;
    }
    
    // Crea indicatore se non esiste
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'dbLoadingIndicator';
    loadingDiv.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; 
                    padding: 12px 20px; border-radius: 8px; z-index: 9999; font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #ffffff40; 
                         border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; 
                         margin-right: 8px;"></span>
            Caricamento database comuni...
        </div>
    `;
    
    document.body.appendChild(loadingDiv);
}

// Nascondi indicatore di caricamento
function hideLoadingIndicator() {
    const indicator = document.getElementById('dbLoadingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Mostra stato database
function showDatabaseStatus() {
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white;
        padding: 8px 16px; border-radius: 6px; font-size: 12px; z-index: 1000;
    `;
    
    if (isLoaded) {
        const totalComuni = comuniDatabase.comuni ? comuniDatabase.comuni.length : 0;
        statusDiv.innerHTML = `✅ Database: ${totalComuni} comuni caricati`;
    } else {
        statusDiv.innerHTML = `❌ Database non disponibile`;
        statusDiv.style.background = '#ef4444';
    }
    
    document.body.appendChild(statusDiv);
    
    // Rimuovi dopo 3 secondi
    setTimeout(() => statusDiv.remove(), 3000);
}

// EXPORT PER USO GLOBALE
if (typeof window !== 'undefined') {
    window.GIDatabase = {
        // Inizializzazione
        init: initializeGIDatabase,
        
        // Stato
        isLoaded: () => isLoaded,
        isLoading: () => isLoading,
        
        // Ricerca
        searchComuni: searchComuni,
        searchByCAP: searchByCAP,
        getComuneByCodice: getComuneByCodice,
        getProvinciaByCode: getProvinciaByCode,
        getComuniByProvincia: getComuniByProvincia,
        
        // Validazione
        validateCAP: validateCAPForProvincia,
        
        // Utilità
        showStatus: showDatabaseStatus,
        
        // Accesso diretto ai dati (per debug)
        getData: () => comuniDatabase
    };
}

// Auto-inizializzazione quando il DOM è pronto
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGIDatabase);
    } else {
        // Se il DOM è già carico, inizializza subito
        setTimeout(initializeGIDatabase, 100);
    }
}

// CSS per l'animazione di caricamento
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
