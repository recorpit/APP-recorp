// debug-system.js - Sistema Debug Zonale per Agibilità
console.log('🔧 Caricamento DebugSystem...');

/**
 * Sistema di debug zonale per il modulo agibilità
 * Permette di abilitare/disabilitare log per zone specifiche
 */
export class DebugSystem {
    
    /**
     * Zone di debug disponibili
     */
    static zones = {
        CORE: 'core',
        ARTISTS: 'artists',
        LOCATIONS: 'locations', 
        XML: 'xml',
        DRAFTS: 'drafts',
        REQUESTS: 'requests',
        UI: 'ui',
        SEARCH: 'search',
        VALIDATION: 'validation',
        STATE: 'state',
        EVENTS: 'events'
    };
    
    /**
     * Zone abilitate (Set per performance)
     */
    static enabledZones = new Set();
    
    /**
     * Statistiche debug
     */
    static stats = {
        logs: 0,
        errors: 0,
        warnings: 0,
        startTime: Date.now(),
        sessionId: this.generateSessionId()
    };
    
    /**
     * Storage locale per preferenze debug
     */
    static storageKey = 'agibilita_debug_preferences';
    
    /**
     * Abilita debug per una zona specifica
     */
    static enable(zone) {
        if (!Object.values(this.zones).includes(zone)) {
            console.warn(`⚠️ Zona debug non valida: ${zone}`);
            return false;
        }
        
        this.enabledZones.add(zone);
        this.savePreferences();
        console.log(`🔧 Debug abilitato per zona: ${zone}`);
        return true;
    }
    
    /**
     * Disabilita debug per una zona specifica
     */
    static disable(zone) {
        this.enabledZones.delete(zone);
        this.savePreferences();
        console.log(`🔧 Debug disabilitato per zona: ${zone}`);
        return true;
    }
    
    /**
     * Abilita debug per tutte le zone
     */
    static enableAll() {
        Object.values(this.zones).forEach(zone => this.enabledZones.add(zone));
        this.savePreferences();
        console.log('🔧 Debug abilitato per tutte le zone');
    }
    
    /**
     * Disabilita debug per tutte le zone
     */
    static disableAll() {
        this.enabledZones.clear();
        this.savePreferences();
        console.log('🔧 Debug disabilitato per tutte le zone');
    }
    
    /**
     * Verifica se una zona è abilitata
     */
    static isEnabled(zone) {
        return this.enabledZones.has(zone);
    }
    
    /**
     * Log normale per una zona
     */
    static log(zone, message, data = null) {
        if (!this.enabledZones.has(zone)) return;
        
        this.stats.logs++;
        const timestamp = this.getTimestamp();
        const emoji = this.getZoneEmoji(zone);
        const prefix = `[${timestamp}] ${emoji} [${zone.toUpperCase()}]`;
        
        if (data !== null) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
    
    /**
     * Log di errore per una zona
     */
    static error(zone, message, error = null) {
        if (!this.enabledZones.has(zone)) return;
        
        this.stats.errors++;
        const timestamp = this.getTimestamp();
        const emoji = this.getZoneEmoji(zone);
        const prefix = `[${timestamp}] ${emoji} [${zone.toUpperCase()}] ❌`;
        
        if (error) {
            console.error(`${prefix} ${message}`, error);
            
            // Log aggiuntivo per stack trace in development
            if (this.isDevelopment()) {
                console.group(`🔍 Stack Trace - ${zone}`);
                console.error(error.stack || error);
                console.groupEnd();
            }
        } else {
            console.error(`${prefix} ${message}`);
        }
    }
    
    /**
     * Log di warning per una zona
     */
    static warn(zone, message, data = null) {
        if (!this.enabledZones.has(zone)) return;
        
        this.stats.warnings++;
        const timestamp = this.getTimestamp();
        const emoji = this.getZoneEmoji(zone);
        const prefix = `[${timestamp}] ${emoji} [${zone.toUpperCase()}] ⚠️`;
        
        if (data !== null) {
            console.warn(`${prefix} ${message}`, data);
        } else {
            console.warn(`${prefix} ${message}`);
        }
    }
    
    /**
     * Log con livello personalizzato
     */
    static logLevel(zone, level, message, data = null) {
        switch (level.toLowerCase()) {
            case 'error':
                this.error(zone, message, data);
                break;
            case 'warn':
            case 'warning':
                this.warn(zone, message, data);
                break;
            case 'info':
            case 'log':
            default:
                this.log(zone, message, data);
                break;
        }
    }
    
    /**
     * Ottiene emoji per zona
     */
    static getZoneEmoji(zone) {
        const emojis = {
            core: '🏗️',
            artists: '🎭',
            locations: '📍',
            xml: '📄',
            drafts: '📝',
            requests: '📋',
            ui: '🖥️',
            search: '🔍',
            validation: '✅',
            state: '🗄️',
            events: '🎧'
        };
        return emojis[zone] || '🔧';
    }
    
    /**
     * Ottiene timestamp formattato
     */
    static getTimestamp() {
        return new Date().toISOString().split('T')[1].split('.')[0];
    }
    
    /**
     * Verifica se siamo in development
     */
    static isDevelopment() {
        return location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1' || 
               location.hostname.includes('dev');
    }
    
    /**
     * Genera ID sessione univoco
     */
    static generateSessionId() {
        return `agb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Mostra statistiche debug
     */
    static showStats() {
        const uptime = Math.round((Date.now() - this.stats.startTime) / 1000);
        const enabledZones = Array.from(this.enabledZones).join(', ') || 'nessuna';
        
        console.group('📊 Statistiche Debug Agibilità');
        console.log(`🆔 Sessione: ${this.stats.sessionId}`);
        console.log(`⏱️ Uptime: ${uptime}s`);
        console.log(`📝 Logs: ${this.stats.logs}`);
        console.log(`⚠️ Warnings: ${this.stats.warnings}`);
        console.log(`❌ Errori: ${this.stats.errors}`);
        console.log(`🔧 Zone abilitate: ${enabledZones}`);
        console.log(`🏠 Ambiente: ${this.isDevelopment() ? 'Development' : 'Production'}`);
        console.groupEnd();
        
        return {
            ...this.stats,
            uptime,
            enabledZones: Array.from(this.enabledZones),
            environment: this.isDevelopment() ? 'development' : 'production'
        };
    }
    
    /**
     * Mostra/nasconde il pannello di controllo zone
     */
    static showZoneToggle() {
        let toggle = document.getElementById('debugZoneToggle');
        
        if (!toggle) {
            toggle = this.createZoneToggle();
        }
        
        toggle.style.display = toggle.style.display === 'none' ? 'block' : 'none';
        
        return toggle;
    }
    
    /**
     * Crea il pannello di controllo zone
     */
    static createZoneToggle() {
        // Rimuovi pannello esistente se presente
        const existing = document.getElementById('debugZoneToggle');
        if (existing) {
            existing.remove();
        }
        
        const container = document.createElement('div');
        container.id = 'debugZoneToggle';
        container.style.cssText = `
            position: fixed;
            top: 50px;
            left: 10px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 12px;
            font-family: monospace;
            z-index: 9998;
            display: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 250px;
        `;
        
        const zones = Object.values(this.zones);
        container.innerHTML = `
            <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">
                <strong>🔧 Debug Zones Agibilità</strong>
                <div style="margin-top: 8px;">
                    <button onclick="DebugSystem.enableAll(); location.reload();" 
                            style="font-size: 10px; padding: 3px 6px; margin-right: 5px; background: #007aff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                        All
                    </button>
                    <button onclick="DebugSystem.disableAll(); location.reload();" 
                            style="font-size: 10px; padding: 3px 6px; background: #ff3b30; color: white; border: none; border-radius: 3px; cursor: pointer;">
                        None
                    </button>
                </div>
            </div>
            <div style="max-height: 200px; overflow-y: auto;">
                ${zones.map(zone => `
                    <label style="display: block; margin: 8px 0; cursor: pointer; padding: 2px;">
                        <input type="checkbox" 
                               ${this.enabledZones.has(zone) ? 'checked' : ''}
                               onchange="DebugSystem.toggleZone('${zone}', this.checked)"
                               style="margin-right: 8px;">
                        <span style="font-size: 11px;">
                            ${this.getZoneEmoji(zone)} ${zone}
                        </span>
                    </label>
                `).join('')}
            </div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 10px; color: #ccc;">
                <div>Logs: ${this.stats.logs} | Errors: ${this.stats.errors}</div>
                <div>Sessione: ${this.stats.sessionId.split('_').pop()}</div>
            </div>
        `;
        
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * Toggle zona specifica
     */
    static toggleZone(zone, enabled) {
        if (enabled) {
            this.enable(zone);
        } else {
            this.disable(zone);
        }
    }
    
    /**
     * Salva preferenze nel localStorage
     */
    static savePreferences() {
        try {
            const preferences = {
                enabledZones: Array.from(this.enabledZones),
                lastUpdate: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(preferences));
        } catch (error) {
            console.warn('⚠️ Impossibile salvare preferenze debug:', error.message);
        }
    }
    
    /**
     * Carica preferenze dal localStorage
     */
    static loadPreferences() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return false;
            
            const preferences = JSON.parse(stored);
            if (preferences.enabledZones && Array.isArray(preferences.enabledZones)) {
                this.enabledZones = new Set(preferences.enabledZones);
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Impossibile caricare preferenze debug:', error.message);
        }
        return false;
    }
    
    /**
     * Reset completo delle statistiche
     */
    static resetStats() {
        this.stats = {
            logs: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            sessionId: this.generateSessionId()
        };
        console.log('🔄 Statistiche debug resettate');
    }
    
    /**
     * Esporta log per debugging
     */
    static exportLogs() {
        const logData = {
            session: this.stats.sessionId,
            stats: this.stats,
            enabledZones: Array.from(this.enabledZones),
            environment: this.isDevelopment() ? 'development' : 'production',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: location.href
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `agibilita-debug-${this.stats.sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📥 Log esportati');
        return logData;
    }
    
    /**
     * Crea un profiler per misurare performance
     */
    static createProfiler(zone, operation) {
        const start = performance.now();
        
        return {
            end: () => {
                const duration = performance.now() - start;
                this.log(zone, `⏱️ ${operation} completato in ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }
    
    /**
     * Utility per debugging oggetti complessi
     */
    static inspect(zone, label, object, depth = 2) {
        if (!this.enabledZones.has(zone)) return;
        
        console.group(`🔍 ${this.getZoneEmoji(zone)} [${zone.toUpperCase()}] ${label}`);
        
        if (typeof object === 'object' && object !== null) {
            console.log('Type:', Array.isArray(object) ? 'Array' : 'Object');
            console.log('Keys:', Object.keys(object));
            
            if (depth > 0) {
                console.log('Content:', object);
            } else {
                console.log('Content: [Object too deep]');
            }
        } else {
            console.log('Value:', object);
            console.log('Type:', typeof object);
        }
        
        console.groupEnd();
    }
    
    /**
     * Cleanup del sistema debug
     */
    static cleanup() {
        // Rimuovi pannello controllo se presente
        const toggle = document.getElementById('debugZoneToggle');
        if (toggle) {
            toggle.remove();
        }
        
        // Salva preferenze finali
        this.savePreferences();
        
        console.log('🧹 DebugSystem cleanup completato');
    }
}

// Auto-enable in development con zone predefinite
if (DebugSystem.isDevelopment()) {
    // Carica preferenze salvate o imposta default
    if (!DebugSystem.loadPreferences()) {
        // Default zones per development
        DebugSystem.enable(DebugSystem.zones.CORE);
        DebugSystem.enable(DebugSystem.zones.UI);
        DebugSystem.enable(DebugSystem.zones.EVENTS);
    }
} else {
    // Production: solo core e errori
    DebugSystem.enable(DebugSystem.zones.CORE);
}

// Esponi globalmente per console
window.DebugSystem = DebugSystem;

// Shortcut globali per facilità d'uso
window.debugOn = (zone) => DebugSystem.enable(zone);
window.debugOff = (zone) => DebugSystem.disable(zone);
window.debugStats = () => DebugSystem.showStats();
window.debugToggle = () => DebugSystem.showZoneToggle();
window.debugExport = () => DebugSystem.exportLogs();

// Cleanup automatico prima del page unload
window.addEventListener('beforeunload', () => {
    DebugSystem.cleanup();
});

console.log('✅ DebugSystem inizializzato');

// Export della classe
export default DebugSystem;