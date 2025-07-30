// debug-system.js - Sistema debug zonale
console.log('🔧 Caricamento DebugSystem...');

export class DebugSystem {
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
    
    static enabledZones = new Set();
    static stats = {
        logs: 0,
        errors: 0,
        warnings: 0,
        startTime: Date.now()
    };
    
    static enable(zone) {
        this.enabledZones.add(zone);
        console.log(`🔧 Debug abilitato per zona: ${zone}`);
    }
    
    static disable(zone) {
        this.enabledZones.delete(zone);
        console.log(`🔧 Debug disabilitato per zona: ${zone}`);
    }
    
    static enableAll() {
        Object.values(this.zones).forEach(zone => this.enabledZones.add(zone));
        console.log('🔧 Debug abilitato per tutte le zone');
    }
    
    static disableAll() {
        this.enabledZones.clear();
        console.log('🔧 Debug disabilitato per tutte le zone');
    }
    
    static log(zone, message, data = null) {
        if (this.enabledZones.has(zone)) {
            this.stats.logs++;
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            const emoji = this.getZoneEmoji(zone);
            
            if (data !== null) {
                console.log(`[${timestamp}] ${emoji} [${zone.toUpperCase()}] ${message}`, data);
            } else {
                console.log(`[${timestamp}] ${emoji} [${zone.toUpperCase()}] ${message}`);
            }
        }
    }
    
    static error(zone, message, error = null) {
        if (this.enabledZones.has(zone)) {
            this.stats.errors++;
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            const emoji = this.getZoneEmoji(zone);
            
            if (error) {
                console.error(`[${timestamp}] ${emoji} [${zone.toUpperCase()}] ❌ ${message}`, error);
            } else {
                console.error(`[${timestamp}] ${emoji} [${zone.toUpperCase()}] ❌ ${message}`);
            }
        }
    }
    
    static warn(zone, message, data = null) {
        if (this.enabledZones.has(zone)) {
            this.stats.warnings++;
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            const emoji = this.getZoneEmoji(zone);
            
            if (data !== null) {
                console.warn(`[${timestamp}] ${emoji} [${zone.toUpperCase()}] ⚠️ ${message}`, data);
            } else {
                console.warn(`[${timestamp}] ${emoji} [${zone.toUpperCase()}] ⚠️ ${message}`);
            }
        }
    }
    
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
    
    static showStats() {
        const uptime = Math.round((Date.now() - this.stats.startTime) / 1000);
        const enabledZones = Array.from(this.enabledZones).join(', ');
        
        console.group('📊 Debug Statistics');
        console.log(`⏱️ Uptime: ${uptime}s`);
        console.log(`📝 Logs: ${this.stats.logs}`);
        console.log(`⚠️ Warnings: ${this.stats.warnings}`);
        console.log(`❌ Errors: ${this.stats.errors}`);
        console.log(`🔧 Zone abilitate: ${enabledZones || 'nessuna'}`);
        console.groupEnd();
        
        return this.stats;
    }
    
    static showZoneToggle() {
        let toggle = document.getElementById('debugZoneToggle');
        if (!toggle) {
            toggle = this.createZoneToggle();
        }
        toggle.style.display = toggle.style.display === 'none' ? 'block' : 'none';
    }
    
    static createZoneToggle() {
        const container = document.createElement('div');
        container.id = 'debugZoneToggle';
        container.style.cssText = `
            position: fixed;
            top: 50px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 9998;
            display: none;
        `;
        
        const zones = Object.values(this.zones);
        container.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>🔧 Debug Zones</strong>
                <button onclick="DebugSystem.enableAll()" style="margin-left: 10px; font-size: 10px;">All</button>
                <button onclick="DebugSystem.disableAll()" style="margin-left: 5px; font-size: 10px;">None</button>
            </div>
            ${zones.map(zone => `
                <label style="display: block; margin: 5px 0;">
                    <input type="checkbox" 
                           ${this.enabledZones.has(zone) ? 'checked' : ''}
                           onchange="DebugSystem.toggleZone('${zone}', this.checked)">
                    ${this.getZoneEmoji(zone)} ${zone}
                </label>
            `).join('')}
        `;
        
        document.body.appendChild(container);
        return container;
    }
    
    static toggleZone(zone, enabled) {
        if (enabled) {
            this.enable(zone);
        } else {
            this.disable(zone);
        }
    }
}

// Auto-enable in development
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    DebugSystem.enable(DebugSystem.zones.CORE);
    DebugSystem.enable(DebugSystem.zones.UI);
    DebugSystem.enable(DebugSystem.zones.ARTISTS);
}

// Esponi globalmente per console
window.DebugSystem = DebugSystem;

// Shortcut globali
window.debugOn = (zone) => DebugSystem.enable(zone);
window.debugOff = (zone) => DebugSystem.disable(zone);
window.debugStats = () => DebugSystem.showStats();
window.debugToggle = () => DebugSystem.showZoneToggle();

console.log('✅ DebugSystem inizializzato');

export default DebugSystem;