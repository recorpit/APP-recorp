// navigation.js - Gestione Navigazione Sistema Agibilità
console.log('🧭 Caricamento NavigationManager...');

export class NavigationManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.sections = [
            'homeSection',
            'step1', 
            'step2',
            'step3',
            'bozzeRichiesteSection'
        ];
        this.currentSection = 'homeSection';
        
        console.log('🧭 NavigationManager inizializzato');
    }
    
    /**
     * Inizializza il sistema di navigazione
     */
    initialize() {
        console.log('🧭 Inizializzazione NavigationManager...');
        
        // Setup progress bar
        this.setupProgressBar();
        
        // Mostra sezione iniziale
        this.showSection('homeSection', false);
        
        console.log('✅ NavigationManager pronto');
    }
    
    /**
     * Mostra una sezione specifica
     * @param {string} sectionId - ID della sezione da mostrare
     * @param {boolean} updateState - Se aggiornare lo stato (default: true)
     */
    showSection(sectionId, updateState = true) {
        if (!this.sections.includes(sectionId)) {
            console.warn(`⚠️ Sezione non valida: ${sectionId}`);
            return false;
        }
        
        console.log(`🧭 Navigazione verso: ${sectionId}`);
        
        // Nascondi tutte le sezioni
        this.sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.classList.remove('active');
                section.style.display = 'none';
            }
        });
        
        // Mostra sezione target
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            
            // Scroll to top
            targetSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
        
        // Aggiorna stato
        if (updateState && this.stateManager) {
            this.stateManager.update('currentSection', sectionId);
            
            // Aggiorna step se è una sezione step
            const stepMatch = sectionId.match(/step(\d+)/);
            if (stepMatch) {
                const stepNumber = parseInt(stepMatch[1]);
                this.stateManager.update('currentStep', stepNumber);
                this.updateProgressBar(stepNumber);
            } else if (sectionId === 'homeSection') {
                this.stateManager.update('currentStep', 0);
                this.updateProgressBar(0);
            }
        }
        
        // Aggiorna progress bar visibility
        this.updateProgressBarVisibility(sectionId);
        
        // Aggiorna navigation buttons
        this.updateNavigationButtons(sectionId);
        
        this.currentSection = sectionId;
        console.log(`✅ Navigazione completata: ${sectionId}`);
        
        return true;
    }
    
    /**
     * Setup della progress bar
     */
    setupProgressBar() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            // Progress bar è già nel DOM dall'HTML
            console.log('✅ Progress bar trovata nel DOM');
        } else {
            console.warn('⚠️ Progress container non trovato');
        }
    }
    
    /**
     * Aggiorna la progress bar
     * @param {number} currentStep - Step corrente (0-3)
     */
    updateProgressBar(currentStep = 0) {
        const progressSteps = document.querySelectorAll('.progress-step');
        const progressLine = document.getElementById('progressLine');
        
        if (progressSteps.length === 0) return;
        
        // Reset tutti gli step
        progressSteps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        // Aggiorna step
        progressSteps.forEach((step, index) => {
            const stepNumber = parseInt(step.dataset.step);
            
            if (stepNumber < currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === currentStep) {
                step.classList.add('active');
            }
        });
        
        // Aggiorna linea di progresso
        if (progressLine) {
            const progressPercent = progressSteps.length > 0 
                ? (currentStep / (progressSteps.length - 1)) * 100 
                : 0;
            progressLine.style.width = `${Math.min(progressPercent, 100)}%`;
        }
        
        console.log(`📊 Progress bar aggiornata: step ${currentStep}`);
    }
    
    /**
     * Aggiorna visibilità progress bar
     */
    updateProgressBarVisibility(sectionId) {
        const progressContainer = document.getElementById('progressContainer');
        if (!progressContainer) return;
        
        // Mostra progress bar solo per step e non per home/bozze
        const showProgress = ['step1', 'step2', 'step3'].includes(sectionId);
        progressContainer.style.display = showProgress ? 'block' : 'none';
        
        if (showProgress) {
            // Estrae numero step
            const stepNumber = parseInt(sectionId.replace('step', ''));
            this.updateProgressBar(stepNumber);
        }
    }
    
    /**
     * Aggiorna stati dei pulsanti di navigazione
     */
    updateNavigationButtons(sectionId) {
        // Pulsante "Avanti" step 1
        const goToStep2Btn = document.getElementById('goToStep2');
        if (goToStep2Btn && sectionId === 'step1') {
            const canProceed = this.stateManager?.isStepComplete(1) || false;
            goToStep2Btn.disabled = !canProceed;
        }
        
        // Pulsante "Avanti" step 2  
        const goToStep3Btn = document.getElementById('goToStep3');
        if (goToStep3Btn && sectionId === 'step2') {
            const canProceed = this.stateManager?.isStepComplete(2) || false;
            goToStep3Btn.disabled = !canProceed;
        }
        
        // Pulsante "Finalizza" step 3
        const finalizeBtn = document.getElementById('finalizeAgibilita');
        if (finalizeBtn && sectionId === 'step3') {
            const canFinalize = this.stateManager?.isStepComplete(3) || false;
            finalizeBtn.disabled = !canFinalize;
        }
    }
    
    /**
     * Naviga al prossimo step
     */
    goToNextStep() {
        const currentStep = this.stateManager?.get('currentStep') || 0;
        const nextStep = currentStep + 1;
        
        if (nextStep <= 3) {
            if (nextStep === 1) {
                this.showSection('step1');
            } else if (nextStep === 2 && this.stateManager?.isStepComplete(1)) {
                this.showSection('step2');
            } else if (nextStep === 3 && this.stateManager?.isStepComplete(2)) {
                this.showSection('step3');
            } else {
                console.warn(`⚠️ Impossibile procedere al step ${nextStep}: requisiti non soddisfatti`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Naviga al step precedente
     */
    goToPreviousStep() {
        const currentStep = this.stateManager?.get('currentStep') || 0;
        const prevStep = currentStep - 1;
        
        if (prevStep >= 0) {
            if (prevStep === 0) {
                this.showSection('homeSection');
            } else {
                this.showSection(`step${prevStep}`);
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Verifica se una sezione è attiva
     */
    isActive(sectionId) {
        return this.currentSection === sectionId;
    }
    
    /**
     * Ottiene la sezione corrente
     */
    getCurrentSection() {
        return this.currentSection;
    }
    
    /**
     * Ottiene lo step corrente
     */
    getCurrentStep() {
        const stepMatch = this.currentSection.match(/step(\d+)/);
        return stepMatch ? parseInt(stepMatch[1]) : 0;
    }
    
    /**
     * Forza aggiornamento di tutti i controlli di navigazione
     */
    updateAllControls() {
        this.updateProgressBar(this.getCurrentStep());
        this.updateNavigationButtons(this.currentSection);
        this.updateProgressBarVisibility(this.currentSection);
    }
    
    /**
     * Registra listener per aggiornamenti automatici
     */
    setupAutoUpdate() {
        if (!this.stateManager) return;
        
        // Listen per cambiamenti artisti (influenza step 1)
        this.stateManager.addListener('selectedArtists', () => {
            if (this.currentSection === 'step1') {
                this.updateNavigationButtons('step1');
            }
        });
        
        // Listen per cambiamenti località (influenza step 2)
        this.stateManager.addListener('locationData', () => {
            if (this.currentSection === 'step2') {
                this.updateNavigationButtons('step2');
            }
        });
        
        // Listen per cambiamenti dati fatturazione (influenza step 2)
        this.stateManager.addListener('invoiceData', () => {
            if (this.currentSection === 'step2') {
                this.updateNavigationButtons('step2');
            }
        });
    }
    
    /**
     * Ottiene informazioni di navigazione per debug
     */
    getNavigationInfo() {
        return {
            currentSection: this.currentSection,
            currentStep: this.getCurrentStep(),
            availableSections: this.sections,
            stateManagerConnected: !!this.stateManager
        };
    }
    
    /**
     * Cleanup del navigation manager
     */
    cleanup() {
        // Reset alla home
        this.showSection('homeSection', false);
        console.log('🧹 NavigationManager cleanup completato');
    }
    
    /**
     * Debug del navigation manager
     */
    debug() {
        console.group('🧭 Debug NavigationManager');
        console.log('Sezione corrente:', this.currentSection);
        console.log('Step corrente:', this.getCurrentStep());
        console.log('Sezioni disponibili:', this.sections);
        console.log('StateManager collegato:', !!this.stateManager);
        console.groupEnd();
        
        return this.getNavigationInfo();
    }
}

// Esporta classe
export default NavigationManager;

console.log('✅ NavigationManager module loaded');