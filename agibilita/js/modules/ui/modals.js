// modals.js - Sistema Modal Agibilità
console.log('🔔 Caricamento ModalManager...');

export class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.modalStack = [];
        this.keyHandlers = new Map();
        this.clickOutsideHandlers = new Map();
        
        console.log('🔔 ModalManager inizializzato');
    }
    
    /**
     * Inizializza il sistema modal
     */
    initialize() {
        console.log('🔔 Inizializzazione ModalManager...');
        
        // Setup global event listeners
        this.setupGlobalListeners();
        
        // Setup existing modals in DOM
        this.setupExistingModals();
        
        console.log('✅ ModalManager pronto');
    }
    
    /**
     * Setup global event listeners
     */
    setupGlobalListeners() {
        // ESC key per chiudere modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                this.close(topModal);
            }
        });
        
        // Click outside per chiudere modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.style.display !== 'none') {
                const modalId = e.target.id;
                if (modalId && this.isOpen(modalId)) {
                    this.close(modalId);
                }
            }
        });
        
        // Gestione focus trap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                this.handleFocusTrap(e, topModal);
            }
        });
    }
    
    /**
     * Setup modal esistenti nel DOM
     */
    setupExistingModals() {
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(modal => {
            this.setupModal(modal.id);
        });
        
        console.log(`✅ Setup ${existingModals.length} modal esistenti nel DOM`);
    }
    
    /**
     * Setup singolo modal
     * @param {string} modalId - ID del modal
     */
    setupModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Setup close buttons
        const closeButtons = modal.querySelectorAll('.modal-close, [data-modal-close]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close(modalId);
            });
        });
        
        // Setup confirm/cancel buttons
        const confirmBtn = modal.querySelector('.modal-confirm, [data-modal-confirm]');
        const cancelBtn = modal.querySelector('.modal-cancel, [data-modal-cancel]');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                this.handleConfirm(modalId, e);
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close(modalId);
            });
        }
        
        // Prevent modal content click from closing modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
    
    /**
     * Apre un modal
     * @param {string} modalId - ID del modal
     * @param {Object} options - Opzioni del modal
     */
    open(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`⚠️ Modal non trovato: ${modalId}`);
            return false;
        }
        
        console.log(`🔔 Apertura modal: ${modalId}`);
        
        // Setup modal se non già fatto
        if (!this.activeModals.has(modalId)) {
            this.setupModal(modalId);
        }
        
        // Aggiorna contenuto se fornito
        if (options.title) {
            const titleElement = modal.querySelector('.modal-title');
            if (titleElement) titleElement.textContent = options.title;
        }
        
        if (options.content) {
            const contentElement = modal.querySelector('.modal-body');
            if (contentElement) contentElement.innerHTML = options.content;
        }
        
        // Setup callbacks
        if (options.onConfirm) {
            this.keyHandlers.set(`${modalId}_confirm`, options.onConfirm);
        }
        
        if (options.onCancel) {
            this.keyHandlers.set(`${modalId}_cancel`, options.onCancel);
        }
        
        if (options.onClose) {
            this.keyHandlers.set(`${modalId}_close`, options.onClose);
        }
        
        // Aggiungi a stack e active set
        this.modalStack.push(modalId);
        this.activeModals.add(modalId);
        
        // Nascondi modal precedente se stack mode
        if (this.modalStack.length > 1 && options.stackMode !== false) {
            const prevModal = document.getElementById(this.modalStack[this.modalStack.length - 2]);
            if (prevModal) {
                prevModal.style.zIndex = parseInt(modal.style.zIndex || 1000) - 1;
            }
        }
        
        // Mostra modal
        modal.style.display = 'flex';
        modal.classList.add('modal-opening');
        
        // Aggiungi classe al body per bloccare scroll
        document.body.classList.add('modal-open');
        
        // Anima entrata
        requestAnimationFrame(() => {
            modal.classList.add('modal-active');
            modal.classList.remove('modal-opening');
        });
        
        // Setup z-index per stacking
        const baseZIndex = 1000;
        modal.style.zIndex = baseZIndex + this.modalStack.length;
        
        // Focus al primo elemento focusabile
        setTimeout(() => {
            this.focusFirstElement(modal);
        }, 150);
        
        // Auto-close se specificato
        if (options.autoClose) {
            setTimeout(() => {
                this.close(modalId);
            }, options.autoClose);
        }
        
        console.log(`✅ Modal aperto: ${modalId}`);
        return true;
    }
    
    /**
     * Chiude un modal
     * @param {string} modalId - ID del modal
     * @param {*} result - Risultato da passare ai callback
     */
    close(modalId, result = null) {
        const modal = document.getElementById(modalId);
        if (!modal || !this.activeModals.has(modalId)) {
            return false;
        }
        
        console.log(`🔔 Chiusura modal: ${modalId}`);
        
        // Rimuovi da stack e active set
        const stackIndex = this.modalStack.indexOf(modalId);
        if (stackIndex > -1) {
            this.modalStack.splice(stackIndex, 1);
        }
        this.activeModals.delete(modalId);
        
        // Anima uscita
        modal.classList.add('modal-closing');
        modal.classList.remove('modal-active');
        
        // Chiudi dopo animazione
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('modal-closing');
            
            // Rimuovi modal-open dal body se nessun modal aperto
            if (this.modalStack.length === 0) {
                document.body.classList.remove('modal-open');
            }
            
            // Ripristina focus al modal precedente o al body
            if (this.modalStack.length > 0) {
                const prevModalId = this.modalStack[this.modalStack.length - 1];
                const prevModal = document.getElementById(prevModalId);
                if (prevModal) {
                    prevModal.style.zIndex = 1000 + this.modalStack.length;
                    this.focusFirstElement(prevModal);
                }
            } else {
                // Focus al trigger element se disponibile
                const triggerElement = document.querySelector(`[data-modal-trigger="${modalId}"]`);
                if (triggerElement) {
                    triggerElement.focus();
                }
            }
        }, 300);
        
        // Esegui callback onClose
        const closeHandler = this.keyHandlers.get(`${modalId}_close`);
        if (closeHandler) {
            closeHandler(result);
            this.keyHandlers.delete(`${modalId}_close`);
        }
        
        // Cleanup handlers
        this.keyHandlers.delete(`${modalId}_confirm`);
        this.keyHandlers.delete(`${modalId}_cancel`);
        
        console.log(`✅ Modal chiuso: ${modalId}`);
        return true;
    }
    
    /**
     * Gestisce conferma del modal
     */
    handleConfirm(modalId, event) {
        const confirmHandler = this.keyHandlers.get(`${modalId}_confirm`);
        if (confirmHandler) {
            const result = confirmHandler(event);
            
            // Chiudi modal se handler non restituisce false
            if (result !== false) {
                this.close(modalId, result);
            }
        } else {
            // Default: chiudi modal
            this.close(modalId, true);
        }
    }
    
    /**
     * Verifica se un modal è aperto
     */
    isOpen(modalId) {
        return this.activeModals.has(modalId);
    }
    
    /**
     * Chiude tutti i modal aperti
     */
    closeAll() {
        const modalsToClose = [...this.activeModals];
        modalsToClose.forEach(modalId => {
            this.close(modalId);
        });
        
        console.log('🔔 Tutti i modal sono stati chiusi');
    }
    
    /**
     * Focus sul primo elemento focusabile
     */
    focusFirstElement(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
    
    /**
     * Gestisce focus trap nei modal
     */
    handleFocusTrap(event, modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }
    
    /**
     * Crea un modal dinamicamente
     * @param {string} modalId - ID del modal
     * @param {Object} config - Configurazione del modal
     */
    create(modalId, config = {}) {
        // Verifica se modal esiste già
        if (document.getElementById(modalId)) {
            console.warn(`⚠️ Modal ${modalId} esiste già`);
            return false;
        }
        
        console.log(`🔔 Creazione modal dinamico: ${modalId}`);
        
        const {
            title = 'Modal',
            content = '',
            size = 'medium', // small, medium, large, full
            type = 'default', // default, confirm, alert, info, warning, error
            buttons = [],
            backdrop = true,
            keyboard = true,
            focus = true
        } = config;
        
        // Crea struttura modal
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `modal modal-${size} modal-${type}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', `${modalId}-title`);
        modal.setAttribute('aria-modal', 'true');
        
        // Contenuto modal
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${modalId}-title">${title}</h5>
                    ${type !== 'alert' ? '<button type="button" class="modal-close" aria-label="Chiudi">&times;</button>' : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${buttons.map(btn => `
                            <button type="button" 
                                    class="btn ${btn.class || 'btn-secondary'} ${btn.action || ''}"
                                    ${btn.action ? `data-modal-${btn.action}` : ''}>
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Aggiungi al DOM
        document.body.appendChild(modal);
        
        // Setup del modal
        this.setupModal(modalId);
        
        console.log(`✅ Modal dinamico creato: ${modalId}`);
        return modal;
    }
    
    /**
     * Modal di conferma
     * @param {string} message - Messaggio da mostrare
     * @param {Object} options - Opzioni
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modalId = `confirm-modal-${Date.now()}`;
            
            this.create(modalId, {
                title: options.title || 'Conferma',
                content: `<p>${message}</p>`,
                type: 'confirm',
                size: options.size || 'small',
                buttons: [
                    { text: options.cancelText || 'Annulla', class: 'btn-secondary', action: 'cancel' },
                    { text: options.confirmText || 'Conferma', class: 'btn-primary', action: 'confirm' }
                ]
            });
            
            this.open(modalId, {
                onConfirm: () => {
                    resolve(true);
                    this.destroy(modalId);
                },
                onCancel: () => {
                    resolve(false);
                    this.destroy(modalId);
                },
                onClose: () => {
                    resolve(false);
                    this.destroy(modalId);
                }
            });
        });
    }
    
    /**
     * Modal di alert
     * @param {string} message - Messaggio da mostrare
     * @param {Object} options - Opzioni
     */
    alert(message, options = {}) {
        return new Promise((resolve) => {
            const modalId = `alert-modal-${Date.now()}`;
            
            this.create(modalId, {
                title: options.title || 'Avviso',
                content: `<p>${message}</p>`,
                type: 'alert',
                size: options.size || 'small',
                buttons: [
                    { text: options.buttonText || 'OK', class: 'btn-primary', action: 'confirm' }
                ]
            });
            
            this.open(modalId, {
                onConfirm: () => {
                    resolve(true);
                    this.destroy(modalId);
                },
                onClose: () => {
                    resolve(true);
                    this.destroy(modalId);
                }
            });
        });
    }
    
    /**
     * Modal di prompt
     * @param {string} message - Messaggio da mostrare
     * @param {string} defaultValue - Valore di default
     * @param {Object} options - Opzioni
     */
    prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const modalId = `prompt-modal-${Date.now()}`;
            const inputId = `prompt-input-${Date.now()}`;
            
            this.create(modalId, {
                title: options.title || 'Inserisci valore',
                content: `
                    <p>${message}</p>
                    <input type="text" 
                           id="${inputId}"
                           class="form-control" 
                           value="${defaultValue}"
                           placeholder="${options.placeholder || ''}"
                           ${options.required ? 'required' : ''}>
                `,
                type: 'confirm',
                size: options.size || 'small',
                buttons: [
                    { text: options.cancelText || 'Annulla', class: 'btn-secondary', action: 'cancel' },
                    { text: options.confirmText || 'OK', class: 'btn-primary', action: 'confirm' }
                ]
            });
            
            this.open(modalId, {
                onConfirm: () => {
                    const input = document.getElementById(inputId);
                    const value = input ? input.value.trim() : '';
                    
                    if (options.required && !value) {
                        input.classList.add('is-invalid');
                        input.focus();
                        return false; // Non chiudere modal
                    }
                    
                    resolve(value);
                    this.destroy(modalId);
                },
                onCancel: () => {
                    resolve(null);
                    this.destroy(modalId);
                },
                onClose: () => {
                    resolve(null);
                    this.destroy(modalId);
                }
            });
            
            // Focus input dopo apertura
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 200);
        });
    }
    
    /**
     * Distrugge un modal dinamico
     * @param {string} modalId - ID del modal
     */
    destroy(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            this.close(modalId);
            setTimeout(() => {
                modal.remove();
                console.log(`🗑️ Modal distrutto: ${modalId}`);
            }, 350);
        }
    }
    
    /**
     * Ottiene informazioni sui modal aperti
     */
    getOpenModals() {
        return {
            active: Array.from(this.activeModals),
            stack: [...this.modalStack],
            count: this.activeModals.size
        };
    }
    
    /**
     * Debug modal manager
     */
    debug() {
        console.group('🔔 Debug ModalManager');
        console.log('Modal attivi:', Array.from(this.activeModals));
        console.log('Stack modal:', this.modalStack);
        console.log('Handlers registrati:', this.keyHandlers.size);
        console.log('Body modal-open:', document.body.classList.contains('modal-open'));
        console.groupEnd();
        
        return this.getOpenModals();
    }
    
    /**
     * Cleanup modal manager
     */
    cleanup() {
        this.closeAll();
        this.keyHandlers.clear();
        this.clickOutsideHandlers.clear();
        
        console.log('🧹 ModalManager cleanup completato');
    }
}

// CSS Styles per modal
const ModalStyles = `
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.modal.modal-active {
    opacity: 1;
}

.modal.modal-opening {
    opacity: 0;
}

.modal.modal-closing {
    opacity: 0;
}

.modal-content {
    background: var(--bg-secondary);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    transform: scale(0.9) translateY(20px);
    transition: transform 0.3s ease;
}

.modal.modal-active .modal-content {
    transform: scale(1) translateY(0);
}

.modal-small .modal-content { max-width: 400px; }
.modal-medium .modal-content { max-width: 600px; }
.modal-large .modal-content { max-width: 800px; }
.modal-full .modal-content { 
    max-width: 95vw; 
    max-height: 95vh; 
}

.modal-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.modal-close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.modal-body {
    padding: 20px 24px;
    overflow-y: auto;
    max-height: 60vh;
}

.modal-footer {
    padding: 16px 24px 20px;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.modal-footer .btn {
    min-width: 80px;
}

/* Tipi di modal */
.modal-confirm .modal-header {
    border-bottom-color: var(--apple-blue);
}

.modal-alert .modal-header {
    border-bottom-color: var(--color-warning);
}

.modal-error .modal-header {
    border-bottom-color: var(--color-danger);
}

/* Body scroll lock */
body.modal-open {
    overflow: hidden;
}

/* Responsive */
@media (max-width: 768px) {
    .modal-content {
        margin: 20px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 40px);
    }
    
    .modal-body {
        max-height: calc(100vh - 200px);
    }
}
`;

// Inietta CSS se non presente
if (!document.getElementById('modal-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'modal-styles';
    styleSheet.textContent = ModalStyles;
    document.head.appendChild(styleSheet);
}

// Esporta classe
export default ModalManager;

console.log('✅ ModalManager module loaded');