// progress-bar.js - Sistema Progress Bar Agibilità
console.log('📊 Caricamento ProgressBarManager...');

export class ProgressBarManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.steps = [
            { id: 1, name: 'Artisti', icon: '🎭', required: true },
            { id: 2, name: 'Località', icon: '📍', required: true },
            { id: 3, name: 'Riepilogo', icon: '📋', required: true }
        ];
        this.currentStep = 0;
        this.maxStep = 0;
        
        console.log('📊 ProgressBarManager inizializzato');
    }
    
    /**
     * Inizializza il sistema progress bar
     */
    initialize() {
        console.log('📊 Inizializzazione ProgressBarManager...');
        
        // Setup progress bar nel DOM
        this.setupProgressBar();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup auto-update dai cambiamenti di stato
        this.setupStateListeners();
        
        // Update iniziale
        this.updateProgress(0);
        
        console.log('✅ ProgressBarManager pronto');
    }
    
    /**
     * Setup della progress bar nel DOM (se non esiste)
     */
    setupProgressBar() {
        const progressContainer = document.getElementById('progressContainer');
        if (!progressContainer) {
            console.warn('⚠️ Progress container non trovato nel DOM');
            return;
        }
        
        // Verifica se progress bar è già presente
        const existingSteps = progressContainer.querySelectorAll('.progress-step');
        if (existingSteps.length > 0) {
            console.log('✅ Progress bar già presente nel DOM');
            return;
        }
        
        // Crea progress bar dinamicamente
        this.createProgressBar(progressContainer);
    }
    
    /**
     * Crea la progress bar dinamicamente
     */
    createProgressBar(container) {
        const progressWrapper = document.createElement('div');
        progressWrapper.className = 'progress-wrapper';
        
        // Crea steps
        this.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'progress-step';
            stepElement.dataset.step = step.id;
            stepElement.innerHTML = `
                <div class="step-circle">
                    <span class="step-icon">${step.icon}</span>
                    <span class="step-number">${step.id}</span>
                </div>
                <div class="step-label">${step.name}</div>
            `;
            
            // Aggiungi click handler per navigazione diretta
            stepElement.addEventListener('click', () => {
                this.navigateToStep(step.id);
            });
            
            progressWrapper.appendChild(stepElement);
            
            // Aggiungi linea di connessione (tranne per ultimo step)
            if (index < this.steps.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'progress-connector';
                progressWrapper.appendChild(connector);
            }
        });
        
        // Aggiungi progress line
        const progressLine = document.createElement('div');
        progressLine.id = 'progressLine';
        progressLine.className = 'progress-line';
        progressWrapper.appendChild(progressLine);
        
        container.appendChild(progressWrapper);
        console.log('✅ Progress bar creata dinamicamente');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Click sui step per navigazione diretta
        document.addEventListener('click', (e) => {
            const stepElement = e.target.closest('.progress-step');
            if (stepElement) {
                const stepNumber = parseInt(stepElement.dataset.step);
                this.navigateToStep(stepNumber);
            }
        });
    }
    
    /**
     * Setup listeners per aggiornamenti automatici dallo stato
     */
    setupStateListeners() {
        if (!this.stateManager) return;
        
        // Listen per cambiamenti step corrente
        this.stateManager.addListener('currentStep', (newStep) => {
            this.updateProgress(newStep);
        });
        
        // Listen per cambiamenti artisti (influenza completamento step 1)
        this.stateManager.addListener('selectedArtists', () => {
            this.updateStepCompletion();
        });
        
        // Listen per cambiamenti località (influenza completamento step 2)
        this.stateManager.addListener('locationData', () => {
            this.updateStepCompletion();
        });
        
        // Listen per cambiamenti dati fatturazione (influenza completamento step 2)
        this.stateManager.addListener('invoiceData', () => {
            this.updateStepCompletion();
        });
    }
    
    /**
     * Aggiorna il progresso della barra
     * @param {number} currentStep - Step corrente (0-3)
     */
    updateProgress(currentStep = 0) {
        this.currentStep = currentStep;
        this.maxStep = Math.max(this.maxStep, currentStep);
        
        const progressSteps = document.querySelectorAll('.progress-step');
        const progressLine = document.getElementById('progressLine');
        const progressConnectors = document.querySelectorAll('.progress-connector');
        
        if (progressSteps.length === 0) {
            console.warn('⚠️ Progress steps non trovati nel DOM');
            return;
        }
        
        console.log(`📊 Aggiornamento progress bar: step ${currentStep}`);
        
        // Reset tutti gli step
        progressSteps.forEach(step => {
            if (step) {
                step.classList.remove('active', 'completed', 'clickable');
            }
        });
        
        // Reset connectors
        progressConnectors.forEach(connector => {
            if (connector) {
                connector.classList.remove('completed');
            }
        });
        
        // Aggiorna step
        progressSteps.forEach((step, index) => {
            if (!step) return;
            
            const stepNumber = parseInt(step.dataset.step);
            
            if (stepNumber < currentStep) {
                // Step completato
                step.classList.add('completed');
                step.classList.add('clickable');
                
                // Anima completamento
                setTimeout(() => {
                    const stepCircle = step.querySelector('.step-circle');
                    if (stepCircle) {
                        stepCircle.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            stepCircle.style.transform = 'scale(1)';
                        }, 200);
                    }
                }, index * 100);
                
            } else if (stepNumber === currentStep) {
                // Step corrente
                step.classList.add('active');
                step.classList.add('clickable');
                
                // Pulse animation per step attivo
                const stepCircle = step.querySelector('.step-circle');
                if (stepCircle) {
                    stepCircle.style.animation = 'pulse 2s infinite';
                }
                
            } else if (stepNumber <= this.maxStep + 1) {
                // Step accessibile (massimo step raggiunto + 1)
                step.classList.add('clickable');
            }
        });
        
        // Aggiorna connectors
        progressConnectors.forEach((connector, index) => {
            if (!connector) return;
            
            if (index < currentStep - 1) {
                connector.classList.add('completed');
                
                // Anima connettore con delay
                setTimeout(() => {
                    if (connector.style) {
                        connector.style.width = '100%';
                    }
                }, (index + 1) * 150);
            }
        });
        
        // Aggiorna linea di progresso
        if (progressLine) {
            const totalSteps = this.steps.length;
            const progressPercent = totalSteps > 0 
                ? (currentStep / totalSteps) * 100 
                : 0;
            
            progressLine.style.width = `${Math.min(progressPercent, 100)}%`;
            
            // Aggiunge gradient animato
            if (currentStep > 0) {
                progressLine.style.background = `
                    linear-gradient(90deg, 
                        var(--apple-blue) 0%, 
                        var(--apple-blue-light) ${progressPercent}%, 
                        transparent ${progressPercent + 10}%
                    )
                `;
            }
        }
        
        // Update tooltips
        this.updateTooltips();
        
        console.log(`✅ Progress bar aggiornata: step ${currentStep}/${this.steps.length}`);
    }
    
    /**
     * Aggiorna il completamento degli step basato sullo stato
     */
    updateStepCompletion() {
        if (!this.stateManager) return;
        
        const progressSteps = document.querySelectorAll('.progress-step');
        
        progressSteps.forEach(step => {
            const stepNumber = parseInt(step.dataset.step);
            const isComplete = this.stateManager.isStepComplete(stepNumber);
            
            if (isComplete && stepNumber < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('incomplete');
            } else if (!isComplete && stepNumber < this.currentStep) {
                step.classList.add('incomplete');
                step.classList.remove('completed');
            }
        });
        
        // Aggiorna pulsanti di navigazione
        this.updateNavigationButtons();
    }
    
    /**
     * Naviga direttamente a uno step
     * @param {number} stepNumber - Numero dello step (1-3)
     */
    navigateToStep(stepNumber) {
        if (!this.canNavigateToStep(stepNumber)) {
            console.warn(`⚠️ Impossibile navigare al step ${stepNumber}`);
            
            // Mostra toast di avviso
            if (window.toastSystem) {
                window.toastSystem.show(
                    `Completa prima lo step ${stepNumber - 1}`, 
                    'warning'
                );
            }
            return false;
        }
        
        console.log(`📊 Navigazione diretta al step ${stepNumber}`);
        
        // Usa il navigation manager se disponibile
        if (window.navigationManager) {
            if (stepNumber === 0) {
                window.navigationManager.showSection('homeSection');
            } else {
                window.navigationManager.showSection(`step${stepNumber}`);
            }
        } else {
            // Fallback diretto
            this.updateProgress(stepNumber);
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.update('currentStep', stepNumber);
            }
        }
        
        return true;
    }
    
    /**
     * Verifica se è possibile navigare a uno step
     * @param {number} stepNumber - Numero dello step
     */
    canNavigateToStep(stepNumber) {
        if (stepNumber === 0) return true; // Home sempre accessibile
        if (stepNumber <= this.maxStep + 1) return true; // Step già raggiunti + 1
        
        // Verifica completamento step precedenti
        for (let i = 1; i < stepNumber; i++) {
            if (!this.stateManager?.isStepComplete(i)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Aggiorna tooltips degli step
     */
    updateTooltips() {
        const progressSteps = document.querySelectorAll('.progress-step');
        
        progressSteps.forEach(step => {
            if (!step) return;
            
            const stepNumber = parseInt(step.dataset.step);
            const stepData = this.steps.find(s => s.id === stepNumber);
            if (!stepData) return;
            
            let tooltipText = stepData.name;
            let status = '';
            
            if (stepNumber < this.currentStep) {
                status = '✅ Completato';
            } else if (stepNumber === this.currentStep) {
                status = '⚡ Corrente';
            } else if (this.canNavigateToStep(stepNumber)) {
                status = '📋 Clicca per iniziare';
            } else {
                status = '🔒 Completa step precedenti';
            }
            
            step.title = `${tooltipText} - ${status}`;
        });
    }
    
    /**
     * Aggiorna stati pulsanti di navigazione
     */
    updateNavigationButtons() {
        // Pulsante "Avanti" step 1
        const goToStep2Btn = document.getElementById('goToStep2');
        if (goToStep2Btn) {
            const canProceed = this.stateManager?.isStepComplete(1) || false;
            goToStep2Btn.disabled = !canProceed;
            goToStep2Btn.title = canProceed ? 'Procedi alla località' : 'Aggiungi almeno un artista';
        }
        
        // Pulsante "Avanti" step 2  
        const goToStep3Btn = document.getElementById('goToStep3');
        if (goToStep3Btn) {
            const canProceed = this.stateManager?.isStepComplete(2) || false;
            goToStep3Btn.disabled = !canProceed;
            goToStep3Btn.title = canProceed ? 'Procedi al riepilogo' : 'Completa dati evento e fatturazione';
        }
        
        // Pulsante "Finalizza" step 3
        const finalizeBtn = document.getElementById('finalizeAgibilita');
        if (finalizeBtn) {
            const canFinalize = this.stateManager?.isStepComplete(3) || false;
            finalizeBtn.disabled = !canFinalize;
            finalizeBtn.title = canFinalize ? 'Genera XML INPS' : 'Verifica tutti i dati';
        }
    }
    
    /**
     * Mostra/nasconde la progress bar
     * @param {boolean} visible - Se mostrare la barra
     */
    setVisible(visible = true) {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = visible ? 'block' : 'none';
            
            if (visible) {
                // Anima entrata
                progressContainer.style.opacity = '0';
                progressContainer.style.transform = 'translateY(-20px)';
                
                setTimeout(() => {
                    progressContainer.style.transition = 'all 0.3s ease';
                    progressContainer.style.opacity = '1';
                    progressContainer.style.transform = 'translateY(0)';
                }, 50);
            }
        }
    }
    
    /**
     * Reset della progress bar
     */
    reset() {
        console.log('🔄 Reset progress bar...');
        
        this.currentStep = 0;
        this.maxStep = 0;
        this.updateProgress(0);
        
        // Reset animazioni
        const progressSteps = document.querySelectorAll('.progress-step .step-circle');
        progressSteps.forEach(circle => {
            if (circle && circle.style) {
                circle.style.animation = '';
                circle.style.transform = '';
            }
        });
        
        // Reset connectors
        const connectors = document.querySelectorAll('.progress-connector');
        connectors.forEach(connector => {
            if (connector && connector.style) {
                connector.style.width = '0%';
            }
        });
        
        console.log('✅ Progress bar reset completato');
    }
    
    /**
     * Anima verso il prossimo step
     */
    animateToNextStep() {
        const nextStep = this.currentStep + 1;
        if (nextStep <= this.steps.length) {
            // Anima step corrente come completato
            const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`);
            if (currentStepElement) {
                currentStepElement.classList.add('completing');
                
                setTimeout(() => {
                    this.updateProgress(nextStep);
                    currentStepElement.classList.remove('completing');
                }, 300);
            } else {
                this.updateProgress(nextStep);
            }
        }
    }
    
    /**
     * Ottiene info progress per debug
     */
    getProgressInfo() {
        return {
            currentStep: this.currentStep,
            maxStep: this.maxStep,
            totalSteps: this.steps.length,
            steps: this.steps.map(step => ({
                id: step.id,
                name: step.name,
                completed: this.stateManager?.isStepComplete(step.id) || false,
                accessible: this.canNavigateToStep(step.id)
            })),
            stateManagerConnected: !!this.stateManager
        };
    }
    
    /**
     * Cleanup progress bar
     */
    cleanup() {
        this.reset();
        console.log('🧹 ProgressBarManager cleanup completato');
    }
    
    /**
     * Debug progress bar manager
     */
    debug() {
        console.group('📊 Debug ProgressBarManager');
        console.log('Step corrente:', this.currentStep);
        console.log('Max step raggiunto:', this.maxStep);
        console.log('Total steps:', this.steps.length);
        console.log('Steps info:', this.getProgressInfo().steps);
        console.log('StateManager collegato:', !!this.stateManager);
        console.groupEnd();
        
        return this.getProgressInfo();
    }
}

// Funzioni utility per CSS animations
const ProgressBarStyles = `
.progress-step.completing .step-circle {
    transform: scale(1.2);
    transition: transform 0.3s ease;
}

.progress-step .step-circle {
    transition: all 0.3s ease;
}

.progress-step.clickable {
    cursor: pointer;
}

.progress-step.clickable:hover .step-circle {
    transform: scale(1.05);
}

.progress-step.incomplete .step-circle {
    border: 2px solid var(--color-warning);
    animation: shake 0.5s ease;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
}

.progress-connector {
    transition: width 0.5s ease;
    width: 0%;
}

.progress-connector.completed {
    width: 100%;
}
`;

// Inietta CSS se non presente
if (!document.getElementById('progress-bar-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'progress-bar-styles';
    styleSheet.textContent = ProgressBarStyles;
    document.head.appendChild(styleSheet);
}

// Esporta classe
export default ProgressBarManager;

console.log('✅ ProgressBarManager module loaded');
