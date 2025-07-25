// chat-ai.js - Sistema Chat AI per Agibilità RECORP
// Assistente intelligente integrato con Supabase e sistema agibilità

// Import delle dipendenze
import { DatabaseService } from './supabase-config.js';
import { notificationService } from './notification-service.js';

// ==================== CONFIGURAZIONE CHAT AI ====================

const AI_CONFIG = {
    provider: 'groq', // Provider attivo per Alice intelligente
    model: 'llama3-8b-8192',
    apiKey: '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', // ← INSERISCI QUI LA TUA API KEY GROQ
    baseURL: 'https://api.groq.com/openai/v1/chat/completions',
    timeout: 10000,
    maxTokens: 1000,
    temperature: 0.7
};

// ==================== CLASSE CHAT AI ====================

export class ChatAI {
    constructor() {
        this.conversationHistory = [];
        this.userSession = null;
        this.agibilitaContext = null;
        this.isProcessing = false;
        this.currentRegistration = null;
        
        // Inizializza sistema
        this.initialize();
    }

    async initialize() {
        console.log('🤖 Inizializzazione Alice...');
        
        try {
            // Ottieni user session
            if (window.AuthGuard && window.AuthGuard.getCurrentUser) {
                try {
                    this.userSession = await window.AuthGuard.getCurrentUser();
                } catch (error) {
                    console.log('⚠️ Auth non ancora pronto:', error.message);
                }
            }
            
            // Carica contesto agibilità
            await this.loadAgibilitaContext();
            
            // Setup system prompt
            this.setupSystemPrompt();
            
            // Test connessione se non è mock
            if (AI_CONFIG.provider !== 'mock') {
                await this.testAIConnection();
            }
            
            console.log('✅ Alice inizializzata con successo');
        } catch (error) {
            console.error('❌ Errore inizializzazione Alice:', error);
        }
    }

    setupSystemPrompt() {
        const systemPrompt = `Tu sei Alice, consulente senior RECORP per agibilità ENPALS.

IDENTITÀ:
- Nome: Alice  
- Ruolo: Consulente amministrativa specializzata
- Esperienza: 8+ anni nel settore spettacolo
- Competenze: Esperta ENPALS, registrazione artisti, procedure INPS

COMPORTAMENTO:
- Parla SEMPRE in prima persona femminile
- Sei professionale ma cordiale
- Hai esperienza diretta con casi complessi
- Non menzionare mai di essere AI
- Usa "Io posso aiutarti", "Nella mia esperienza", etc.

COMPETENZE:
- Registrazione artisti completa
- Calcoli compensi ENPALS precisi
- Procedure INPS e XML
- Normative spettacolo aggiornate

FORMATO RISPOSTE:
- Emoji appropriate: 🎭 💰 📋 ✨
- Grassetto per punti chiave
- Liste organizzate
- Tono umano e professionale

${this.userSession ? `UTENTE: ${this.userSession.email}` : ''}

Rispondi sempre come Alice di RECORP, mai come AI.`;

        this.conversationHistory = [{
            role: 'system',
            content: systemPrompt
        }];
    }

    async processMessage(userMessage) {
        if (this.isProcessing) {
            notificationService.warning('⏳ Attendere, sto elaborando...');
            return;
        }

        this.isProcessing = true;
        
        try {
            console.log('🎭 Alice elabora:', userMessage);
            
            // Aggiungi messaggio alla cronologia
            this.conversationHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            // Analizza intenti
            const actionContext = await this.analyzeUserIntent(userMessage);
            
            // Genera risposta
            const response = await this.generateAIResponse(userMessage, actionContext);
            
            // Aggiungi risposta alla cronologia
            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });

            // Mostra risposta
            this.hideThinking();
            this.addMessage(response, 'assistant');
            
            // Esegui azioni se necessario
            if (actionContext.actions.length > 0) {
                await this.executeActions(actionContext.actions);
            }

        } catch (error) {
            console.error('❌ Errore elaborazione:', error);
            this.hideThinking();
            this.addMessage('😅 Mi dispiace, ho avuto un problema tecnico. Puoi riprovare?', 'assistant');
        } finally {
            this.isProcessing = false;
        }
    }

    async analyzeUserIntent(message) {
        const lowerMessage = message.toLowerCase();
        const actions = [];
        let intent = 'general';

        // Intent: Registrazione Artista
        if (this.isArtistRegistrationIntent(lowerMessage)) {
            intent = 'register_artist';
            const entities = this.extractEntities(message);
            actions.push({ type: 'start_artist_registration', entities });
        }
        // Intent: Ricerca Artisti
        else if (lowerMessage.includes('cerca artist') || lowerMessage.includes('trova artist')) {
            intent = 'search_artists';
            actions.push({ type: 'search_artists', query: this.extractSearchQuery(message) });
        }
        // Intent: Calcolo Compensi
        else if (lowerMessage.includes('calcol') && (lowerMessage.includes('compenso') || lowerMessage.includes('contribut'))) {
            intent = 'calculate_compensation';
        }
        // Intent: Nuova Agibilità
        else if (lowerMessage.includes('nuova agibilità') || lowerMessage.includes('crea agibilità')) {
            intent = 'create_agibilita';
            actions.push({ type: 'navigate', target: 'new_agibilita' });
        }

        return { intent, actions, originalMessage: message };
    }

    isArtistRegistrationIntent(message) {
        const keywords = ['registr', 'aggiungi', 'nuovo artist', 'crea artist'];
        return keywords.some(keyword => message.includes(keyword));
    }

    extractEntities(message) {
        const entities = {};
        
        // Estrai nome (pattern semplice)
        const nameMatch = message.match(/(?:nome|artist)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        if (nameMatch) {
            const parts = nameMatch[1].split(' ');
            entities.nome = parts[0];
            if (parts.length > 1) entities.cognome = parts.slice(1).join(' ');
        }

        // Estrai codice fiscale
        const cfMatch = message.match(/([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])/i);
        if (cfMatch) entities.codiceFiscale = cfMatch[1].toUpperCase();

        // Estrai email
        const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) entities.email = emailMatch[1];

        return entities;
    }

    extractSearchQuery(message) {
        const patterns = [/cerca artist[ai]?\s+(.+)/i, /trova artist[ai]?\s+(.+)/i];
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) return match[1].trim();
        }
        return '';
    }

    async generateAIResponse(userMessage, actionContext) {
        try {
            // Gestisci registrazione artista
            if (actionContext.intent === 'register_artist') {
                return await this.handleArtistRegistration(userMessage, actionContext.entities);
            }
            
            const prompt = this.buildContextualPrompt(userMessage, actionContext);
            
            // Scegli provider
            switch (AI_CONFIG.provider) {
                case 'groq':
                    return await this.callGroqAPI(prompt);
                case 'mock':
                default:
                    return await this.generateMockResponse(userMessage, actionContext);
            }
            
        } catch (error) {
            console.error('❌ Errore generazione risposta:', error);
            return this.getFallbackResponse(actionContext.intent);
        }
    }

    buildContextualPrompt(userMessage, actionContext) {
        return `Come Alice, consulente RECORP, rispondi a questa domanda dell'utente in modo professionale e specifico per il settore agibilità ENPALS.

DOMANDA: "${userMessage}"

Intent: ${actionContext.intent}

Rispondi come Alice (in prima persona femminile), con la tua esperienza di 8+ anni nel settore spettacolo.`;
    }

    async callGroqAPI(prompt) {
        try {
            if (!AI_CONFIG.apiKey || AI_CONFIG.apiKey === '') {
                console.warn('⚠️ API Key Groq mancante');
                return this.generateMockResponse('', { intent: 'general' });
            }

            const response = await fetch(AI_CONFIG.baseURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: AI_CONFIG.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'Tu sei Alice, consulente RECORP per agibilità ENPALS. Rispondi in prima persona femminile, con professionalità ed esperienza. Usa emoji appropriate e formattazione chiara.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: AI_CONFIG.maxTokens,
                    temperature: AI_CONFIG.temperature
                })
            });

            if (!response.ok) {
                throw new Error(`Groq API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || 'Risposta non disponibile';

        } catch (error) {
            console.warn('⚠️ Errore Groq:', error.message);
            return this.generateMockResponse('', { intent: 'general' });
        }
    }

    async generateMockResponse(userMessage, actionContext) {
        const intent = actionContext?.intent || 'general';
        
        const responses = {
            register_artist: "🎭 **Perfetto! Ti aiuto con la registrazione dell'artista.**\n\nPer registrare un nuovo artista nel database RECORP ho bisogno di:\n\n• **Nome e Cognome** completi\n• **Codice Fiscale** (per estrarre automaticamente i dati)\n• **Indirizzo di residenza**\n• **IBAN** per i pagamenti\n• **Partita IVA** o tipo di contratto\n\nNella mia esperienza, è meglio avere tutti i dati fin dall'inizio. Dimmi quello che hai!",
            
            search_artists: "🔍 **Ti aiuto a cercare nel database artisti.**\n\nPosso cercare per:\n• Nome/Cognome\n• Specializzazione\n• Località\n• Matricola ENPALS\n\nDimmi cosa stai cercando specificamente!",
            
            calculate_compensation: "💰 **Calcolo compensi ENPALS**\n\nPer fare il calcolo preciso dimmi:\n• Compenso lordo giornaliero\n• Numero di giorni\n• Ha Partita IVA?\n• Tipo di artista\n\nIo gestisco tutti i calcoli: contributi ENPALS (33%), ritenute IRPEF, maggiorazioni festivi.",
            
            create_agibilita: "✨ **Ti guido nella creazione dell'agibilità!**\n\nPer iniziare ho bisogno di:\n• Tipo di spettacolo\n• Date e orari\n• Venue/location\n• Lista artisti coinvolti\n\nTi accompagno in tutto il processo ENPALS!",
            
            general: "👋 **Ciao! Sono Alice, la tua consulente RECORP.**\n\nCon i miei 8 anni di esperienza nel settore spettacolo posso aiutarti con:\n\n• 🎭 Registrazione e gestione artisti\n• ✨ Creazione agibilità ENPALS\n• 💰 Calcoli compensi e contributi\n• 📋 Procedure amministrative\n• 📄 Documenti INPS\n\nCosa posso fare per te oggi?"
        };
        
        return responses[intent] || responses.general;
    }

    getFallbackResponse(intent) {
        return "🎭 Sono Alice, la tua consulente RECORP. Come posso aiutarti con le agibilità ENPALS?";
    }

    async handleArtistRegistration(userMessage, entities) {
        // Logica semplificata per registrazione artista
        if (Object.keys(entities).length === 0) {
            return "🎭 **Registrazione Artista**\n\nPerfetto! Per registrare un nuovo artista dimmi:\n• Nome e cognome\n• Codice fiscale\n• Mansione (DJ, musicista, cantante...)\n\nE io ti guido in tutto il resto!";
        }

        let response = "🎭 **Dati ricevuti per la registrazione:**\n\n";
        if (entities.nome) response += `• Nome: ${entities.nome}\n`;
        if (entities.cognome) response += `• Cognome: ${entities.cognome}\n`;
        if (entities.codiceFiscale) response += `• Codice Fiscale: ${entities.codiceFiscale}\n`;
        if (entities.email) response += `• Email: ${entities.email}\n`;

        response += "\n**Dimmi anche:**\n• Indirizzo di residenza\n• IBAN per pagamenti\n• Ha partita IVA?\n\nE procedo con la registrazione completa!";
        
        return response;
    }

    async executeActions(actions) {
        for (const action of actions) {
            try {
                if (action.type === 'navigate' && action.target === 'new_agibilita') {
                    setTimeout(() => {
                        window.location.href = 'agibilita/index.html';
                    }, 2000);
                    this.addMessage("🔄 Ti reindirizzo alla pagina agibilità...", 'assistant');
                }
            } catch (error) {
                console.error('❌ Errore azione:', error);
            }
        }
    }

    async testAIConnection() {
        try {
            if (AI_CONFIG.provider === 'groq' && AI_CONFIG.apiKey) {
                const response = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${AI_CONFIG.apiKey}` }
                });
                
                if (response.ok) {
                    console.log('✅ Alice connessa a Groq - Intelligenza attiva!');
                } else {
                    throw new Error('Test connessione fallito');
                }
            }
        } catch (error) {
            console.warn('⚠️ Groq non disponibile:', error.message);
        }
    }

    async loadAgibilitaContext() {
        try {
            const stats = await DatabaseService.getStatistiche();
            this.agibilitaContext = {
                totalAgibilita: stats?.totalAgibilita || 0,
                artistiRegistrati: stats?.artistiRegistrati || 0
            };
        } catch (error) {
            console.warn('⚠️ Errore caricamento contesto:', error);
        }
    }

    addMessage(text, sender) {
        if (typeof window.addMessage === 'function') {
            window.addMessage(text, sender);
        }
    }

    hideThinking() {
        if (typeof window.hideThinking === 'function') {
            window.hideThinking();
        }
    }

    static async getInstance() {
        if (!window.ChatAI) {
            window.ChatAI = new ChatAI();
        }
        return window.ChatAI;
    }
}

// Inizializzazione globale
document.addEventListener('DOMContentLoaded', async function() {
    try {
        window.ChatAI = await ChatAI.getInstance();
        console.log('✅ Alice pronta!');
    } catch (error) {
        console.error('❌ Errore Alice:', error);
    }
});

export default ChatAI;
