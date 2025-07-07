// comuni-loader.js - Sistema di caricamento database GI (Gestione Italiana)

// Namespace globale per il database GI
window.GIDatabase = window.GIDatabase || {
    data: {
        cap: null,
        comuni: null,
        comuniCap: null,
        comuniValidita: null,
        province: null
    },
    loaded: false,
    loading: false,
    loadPromise: null
};

// Funzione per determinare il percorso base
function getBasePath() {
    // Rileva se siamo in una sottocartella controllando l'URL
    const currentPath = window.location.pathname;
    if (currentPath.includes('/agibilita/')) {
        return '../data/';
    }
    return './data/';
}

// Configurazione percorsi file
const GI_FILES = {
    cap: 'gi_cap.json',
    comuni: 'gi_comuni.json',
    comuniCap: 'gi_comuni_cap.json',
    comuniValidita: 'gi_comuni_validita.json',
    province: 'gi_province.json'
};

// Funzione principale di caricamento
async function loadGIDatabase() {
    if (window.GIDatabase.loaded) {
        return window.GIDatabase.data;
    }
    
    if (window.GIDatabase.loading) {
        return window.GIDatabase.loadPromise;
    }
    
    window.GIDatabase.loading = true;
    const basePath = getBasePath();
    
    window.GIDatabase.loadPromise = (async () => {
        const loadPromises = {};
        
        // Carica tutti i file in parallelo
        for (const [key, filename] of Object.entries(GI_FILES)) {
            loadPromises[key] = loadFile(basePath + filename, key);
        }
        
        // Aspetta che tutti i file siano caricati
        const results = await Promise.allSettled(Object.values(loadPromises));
        
        // Verifica quali file sono stati caricati con successo
        const keys = Object.keys(GI_FILES);
        results.forEach((result, index) => {
            const key = keys[index];
            if (result.status === 'fulfilled') {
                window.GIDatabase.data[key] = result.value;
                console.log(`✅ ${key} caricato: ${result.value ? result.value.length : 0} elementi`);
            } else {
                console.warn(`⚠️ ${key}: Non caricato`);
            }
        });
        
        window.GIDatabase.loaded = true;
        window.GIDatabase.loading = false;
        console.log('🇮🇹 Database GI caricato completamente');
        
        return window.GIDatabase.data;
    })();
    
    return window.GIDatabase.loadPromise;
}

// Funzione per caricare un singolo file
async function loadFile(url, name) {
    try {
        console.log(`📄 Caricamento ${name} da ${url}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Errore caricamento ${name}:`, error.message);
        return null;
    }
}

// Funzioni di utilità per accedere ai dati
window.GIDatabase.getComuniByProvincia = function(siglaProvincia) {
    if (!window.GIDatabase.data.comuni) return [];
    
    return window.GIDatabase.data.comuni.filter(comune => {
        // Usa il campo corretto basato sulla struttura del file
        const provincia = comune.sigla_provincia || comune.provincia || comune.siglaProvincia;
        return provincia === siglaProvincia;
    }).map(comune => ({
        // Normalizza i dati per avere una struttura consistente
        codice: comune.codice_istat || comune.codiceIstat || comune.codice,
        nome: comune.denominazione_ita || comune.denominazione || comune.nome,
        provincia: comune.sigla_provincia || comune.provincia || comune.siglaProvincia,
        cap: comune.cap || '',
        lat: comune.lat || '',
        lon: comune.lon || ''
    }));
};

window.GIDatabase.getCapByComune = function(codiceIstat) {
    // Usa gi_cap.json che contiene effettivamente i CAP
    if (!window.GIDatabase.data.cap) {
        console.warn('⚠️ File gi_cap.json non caricato');
        return [];
    }
    
    const caps = window.GIDatabase.data.cap
        .filter(item => item.codice_istat === codiceIstat)
        .map(item => item.cap)
        .filter((cap, index, self) => cap && self.indexOf(cap) === index);
    
    console.log(`📮 CAP trovati per ${codiceIstat}:`, caps);
    return caps;
};

window.GIDatabase.getComuneByCap = function(cap) {
    if (!window.GIDatabase.data.cap || !window.GIDatabase.data.comuni) return [];
    
    // Trova tutti i codici ISTAT per questo CAP dal file gi_cap.json
    const codiciIstat = window.GIDatabase.data.cap
        .filter(item => item.cap === cap)
        .map(item => item.codice_istat);
    
    // Trova i comuni corrispondenti
    return window.GIDatabase.data.comuni.filter(comune => 
        codiciIstat.includes(comune.codice_istat || comune.codiceIstat)
    );
};

window.GIDatabase.getComuneByCodiceBelfiore = function(codiceBelfiore) {
    if (!window.GIDatabase.data.comuniValidita) {
        console.warn('⚠️ File gi_comuni_validita non caricato');
        return null;
    }
    
    console.log('🔍 Cerco codice Belfiore:', codiceBelfiore);
    
    // Cerca nel file gi_comuni_validita
    // Prima cerca tra i comuni attivi
    let found = window.GIDatabase.data.comuniValidita.find(item => 
        item.codice_belfiore === codiceBelfiore && 
        (item.stato_validita === 'Attivo' || !item.data_fine_validita)
    );
    
    // Se non trova tra gli attivi, cerca tra tutti (per date di nascita nel passato)
    if (!found) {
        found = window.GIDatabase.data.comuniValidita.find(item => 
            item.codice_belfiore === codiceBelfiore
        );
    }
    
    if (found) {
        console.log('✅ Trovato:', found);
        return {
            nome: found.denominazione_ita,
            provincia: found.sigla_provincia,
            codiceIstat: found.codice_istat,
            statoValidita: found.stato_validita
        };
    }
    
    console.log('❌ Non trovato codice:', codiceBelfiore);
    return null;
};

window.GIDatabase.getProvince = function() {
    if (!window.GIDatabase.data.province) return [];
    
    // Mappa i dati con i campi corretti
    return window.GIDatabase.data.province.map(p => ({
        sigla: p.sigla_provincia || p.sigla,
        nome: p.denominazione_provincia || p.denominazione || p.nome
    })).filter(p => p.sigla && p.nome);
};

// Funzioni helper
window.GIDatabase.getData = function() {
    return window.GIDatabase.data;
};

window.GIDatabase.isLoaded = function() {
    return window.GIDatabase.loaded;
};

window.GIDatabase.showStatus = function() {
    console.log('📊 Stato Database GI:', {
        loaded: window.GIDatabase.loaded,
        loading: window.GIDatabase.loading,
        cap: window.GIDatabase.data.cap ? `${window.GIDatabase.data.cap.length} elementi` : 'Non caricato',
        comuni: window.GIDatabase.data.comuni ? `${window.GIDatabase.data.comuni.length} elementi` : 'Non caricato',
        comuniCap: window.GIDatabase.data.comuniCap ? `${window.GIDatabase.data.comuniCap.length} elementi` : 'Non caricato',
        comuniValidita: window.GIDatabase.data.comuniValidita ? `${window.GIDatabase.data.comuniValidita.length} elementi` : 'Non caricato',
        province: window.GIDatabase.data.province ? `${window.GIDatabase.data.province.length} elementi` : 'Non caricato'
    });
};

// Inizializza il caricamento al load della pagina
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGIDatabase);
} else {
    loadGIDatabase();
}

// Debug info
console.log('📍 Database GI Loader inizializzato');
console.log('📁 Percorso base rilevato:', getBasePath());
