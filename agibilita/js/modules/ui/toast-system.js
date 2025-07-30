// toast-system.js - Sistema Notifiche Toast
console.log('🔔 Caricamento ToastSystem...');

export class ToastSystem {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.defaultDuration = 3000;
        this.maxToasts = 5;
        
        console.log('🔔 ToastSystem inizializzato');
    }
    
    /**
     * Inizializza il sistema toast
     */
    initialize() {
        console.log('🔔 Inizializzazione ToastSystem...');
        
        // Trova o crea container
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.createContainer();
        }
        
        console.log('✅ ToastSystem pronto');
    }
    
    /**
     * Crea il container per i toast
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'toastContainer';
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }
    
    /**
     * Mostra un toast
     * @param {string} message - Messaggio da mostrare
     * @param {string} type - Tipo: success, error, warning, info
     * @param {number} duration - Durata in ms (0 = permanente)
     */
    show(message, type = 'info', duration = null) {
        if (!message) return null;
        
        duration = duration ?? this.defaultDuration;
        
        // Limita numero di toast
        if (this.toasts.size >= this.maxToasts) {
            this.removeOldest();
        }
        
        const toast = this.createToast(message, type, duration);
        this.container.appendChild(toast.element);
        
        // Auto-remove se ha durata
        if (duration > 0) {
            toast.timeout = setTimeout(() => {
                this.remove(toast.id);
            }, duration);
        }
        
        // Aggiungi alla mappa
        this.toasts.set(toast.id, toast);
        
        console.log(`🔔 Toast mostrato: [${type}] ${message}`);
        return toast.id;
    }
    
    /**
     * Crea elemento toast
     */
    createToast(message, type, duration) {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const element = document.createElement('div');
        element.className = `toast ${type}`;
        element.dataset.toastId = id;
        
        const icon = this.getIcon(type);
        
        element.innerHTML = `
            <i class="toast-icon ${icon}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" type="button">&times;</button>
        `;
        
        // Event listener per chiusura
        const closeBtn = element.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.remove(id);
        });
        
        return {
            id,
            element,
            type,
            message,
            duration,
            timeout: null,
            createdAt: Date.now()
        };
    }
    
    /**
     * Ottiene icona per tipo toast
     */
    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Rimuove un toast specifico
     */
    remove(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) return false;
        
        // Clear timeout se presente
        if (toast.timeout) {
            clearTimeout(toast.timeout);
        }
        
        // Animazione di uscita
        toast.element.style.animation = 'toastSlideOut 0.3s ease-in';
        
        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.toasts.delete(toastId);
        }, 300);
        
        return true;
    }
    
    /**
     * Rimuove il toast più vecchio
     */
    removeOldest() {
        let oldest = null;
        let oldestTime = Date.now();
        
        for (const [id, toast] of this.toasts) {
            if (toast.createdAt < oldestTime) {
                oldestTime = toast.createdAt;
                oldest = id;
            }
        }
        
        if (oldest) {
            this.remove(oldest);
        }
    }
    
    /**
     * Rimuove tutti i toast
     */
    clear() {
        for (const toastId of this.toasts.keys()) {
            this.remove(toastId);
        }
    }
    
    /**
     * Mostra toast di successo
     */
    success(message, duration = null) {
        return this.show(message, 'success', duration);
    }
    
    /**
     * Mostra toast di errore
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    /**
     * Mostra toast di warning
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }
    
    /**
     * Mostra toast informativo
     */
    info(message, duration = null) {
        return this.show(message, 'info', duration);
    }
    
    /**
     * Ottiene statistiche toast
     */
    getStats() {
        return {
            active: this.toasts.size,
            maxToasts: this.maxToasts,
            defaultDuration: this.defaultDuration
        };
    }
    
    /**
     * Cleanup del sistema
     */
    cleanup() {
        this.clear();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        console.log('🧹 ToastSystem cleanup completato');
    }
}

// Esporta classe
export default ToastSystem;

console.log('✅ ToastSystem module loaded');