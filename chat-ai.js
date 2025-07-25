// chat-ai.js - Sistema Chat AI per Agibilità RECORP
// Assistente intelligente integrato con Supabase e sistema agibilità

// ⚠️ IMPORTANTE SICUREZZA:
// - Non condividere MAI le API key nel codice
// - Non committare API key reali nei repository
// - Usa variabili d'ambiente per la produzione
// - Testa sempre in locale prima del deploy

// Import delle dipendenze
import { DatabaseService } from './supabase-config.js';
import { notificationService } from './notification-service.js';

// ==================== CONFIGURAZIONE CHAT AI ====================

const AI_CONFIG = {
    provider: 'mock', // Cambia per attivare AI reale: 'groq', 'huggingface', 'gemini', 'ollama', 'mock'
    model: 'llama3-8b-8192',
    
    // 🆓 COME OTTENERE API KEY GRATUITE:
    // 
    // 🦙 GROQ (RACCOMANDATO - Veloce e Potente):
    //    1. Vai su https://console.groq.com
    //    2. Registrati gratis
    //    3. Crea API key (inizia con gsk_)
    //    4. Incolla qui sotto e cambia provider a 'groq'
    //
    // 🤗 HUGGING FACE:
    //    1. Vai su https://huggingface.co/settings/tokens
    //    2. Crea token gratuito (inizia con hf_)
    //    3. Incolla qui sotto e cambia provider a 'huggingface'
    //
    // 🔍 GOOGLE GEMINI:
    //    1. Vai su https://makersuite.google.com/app/apikey
    //    2. Crea API key gratuita (inizia con AIza)
    //    3. Incolla qui sotto e cambia provider a 'gemini'
    
    apiKey: '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', // ← INSERISCI QUI LA TUA API KEY (senza condividerla mai!)
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
        
        // Inizializza sistema
        this.initialize();
    }

    // ==================== GESTIONE SICURA API KEY ====================

    async loadAPIKey() {
        // 🔐 SICUREZZA: Le API key dovrebbero essere gestite in modo sicuro
        
        // Opzione 1: Variabile d'ambiente (per produzione)
        if (typeof process !== 'undefined' && process.env) {
            return process.env.GROQ_API_KEY || process.env.HF_API_KEY || process.env.GEMINI_API_KEY;
        }
        
        // Opzione 2: Configurazione locale (per sviluppo)
        // ATTENZIONE: Non committare mai API key reali nel codice!
        return AI_CONFIG.apiKey;
    }

    async initialize() {
        console.log('🤖 Inizializzazione Chat AI...');
        
        try {
            // Carica API key in modo sicuro
            const apiKey = await this.loadAPIKey();
            if (apiKey && apiKey !== '') {
                AI_CONFIG.apiKey = apiKey;
                console.log(`🔑 API Key caricata per provider: ${AI_CONFIG.provider}`);
            } else if (AI_CONFIG.provider !== 'mock') {
                console.warn('⚠️ Nessuna API key trovata, uso provider mock');
                AI_CONFIG.provider = 'mock';
            }
            
            // Ottieni user session
            if (window.AuthGuard && window.AuthGuard.getCurrentUser) {
                try {
                    this.userSession = await window.AuthGuard.getCurrentUser();
                } catch (error) {
                    console.log('⚠️ Auth non ancora pronto, continuo senza utente:', error.message);
                }
            }
            
            // Carica contesto agibilità se disponibile
            await this.loadAgibilitaContext();
            
            // Setup system prompt
            this.setupSystemPrompt();
            
            // Test connettività AI se configurato
            if (AI_CONFIG.provider !== 'mock') {
                await this.testAIConnection();
            }
            
            console.log('✅ Chat AI inizializzata con successo');
        } catch (error) {
            console.error('❌ Errore inizializzazione Chat AI:', error);
            // Continua comunque con il provider mock
            AI_CONFIG.provider = 'mock';
        }
    }

    async testAIConnection() {
        try {
            let testEndpoint = '';
            let testOptions = { method: 'GET' };

            switch (AI_CONFIG.provider) {
                case 'groq':
                    if (!AI_CONFIG.apiKey) {
                        throw new Error('API Key mancante');
                    }
                    testEndpoint = 'https://api.groq.com/openai/v1/models';
                    testOptions = {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${AI_CONFIG.apiKey}` }
                    };
                    break;

                case 'huggingface':
                    if (!AI_CONFIG.apiKey) {
                        throw new Error('API Key mancante');
                    }
                    // Hugging Face non ha un endpoint di test semplice
                    console.log('✅ Hugging Face configurato con API key');
                    return;

                case 'gemini':
                    if (!AI_CONFIG.apiKey) {
                        throw new Error('API Key mancante'); 
                    }
                    testEndpoint = `https://generativelanguage.googleapis.com/v1/models?key=${AI_CONFIG.apiKey}`;
                    break;

                case 'ollama':
                    testEndpoint = `${AI_CONFIG.baseURL.replace('/api/generate', '')}/api/tags`;
                    break;

                default:
                    return;
            }

            const controller = new AbortController();
            setTimeout(() => controller.abort(), 3000);

            const response = await fetch(testEndpoint, {
                ...testOptions,
                signal: controller.signal
            });
            
            if (response.ok) {
                console.log(`✅ ${AI_CONFIG.provider.toUpperCase()} API disponibile`);
            } else {
                throw new Error(`Server risponde con ${response.status}`);
            }
        } catch (error) {
            console.warn(`⚠️ ${AI_CONFIG.provider.toUpperCase()} non disponibile:`, error.message);
            console.log('🔄 Fallback automatico al provider mock');
            AI_CONFIG.provider = 'mock';
        }
    }

    // ==================== SYSTEM PROMPT ====================
    
    setupSystemPrompt() {
        const systemPrompt = `Sei l'assistente AI RECORP per la gestione delle agibilità ENPALS.

RUOLO: Esperto consulente per agibilità, normative ENPALS, e sistema RECORP.

COMPETENZE:
- Creazione e gestione agibilità ENPALS
- Calcolo compensi e contributi
- Normative spettacolo e lavoro intermittente  
- Generazione XML per comunicazioni INPS
- Gestione artisti, venue e produttori
- Workflow amministrativo spettacolo

PERSONALITÀ:
- Professionale ma amichevole
- Preciso nelle informazioni normative
- Proattivo nel suggerire soluzioni
- Paziente nelle spiegazioni
- Orientato all'efficienza

FORMATO RISPOSTE:
- Usa emoji appropriate 🎭📝💰
- Struttura con bullet points quando utile
- Includi esempi pratici
- Suggerisci azioni concrete
- Mantieni tono professionale ma accessibile

FUNZIONI DISPONIBILI:
- createNewAgibilita(): Crea nuova agibilità
- searchArtisti(query): Cerca artisti nel database  
- calculateCompenso(data): Calcola compensi e contributi
- generateXML(agibilitaId): Genera XML INPS
- getVenues(): Ottieni lista venues
- saveData(type, data): Salva dati nel sistema

${this.userSession ? `UTENTE CORRENTE: ${this.userSession.email}` : ''}

Rispondi sempre in italiano e fornisci assistenza precisa per le agibilità ENPALS.`;

        this.conversationHistory = [{
            role: 'system',
            content: systemPrompt
        }];
    }

    // ==================== GESTIONE MESSAGGI ====================

    async processMessage(userMessage) {
        if (this.isProcessing) {
            notificationService.warning('⏳ Attendere, elaborazione in corso...');
            return;
        }

        this.isProcessing = true;
        
        try {
            console.log('🤖 Elaborazione messaggio:', userMessage);
            
            // Aggiungi messaggio utente alla cronologia
            this.conversationHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            // Analizza se il messaggio richiede azioni specifiche
            const actionRequired = await this.analyzeUserIntent(userMessage);
            
            // Genera risposta AI
            const response = await this.generateAIResponse(userMessage, actionRequired);
            
            // Aggiungi risposta alla cronologia
            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });

            // Mostra risposta nell'interfaccia
            this.hideThinking();
            this.addMessage(response, 'assistant');
            
            // Esegui azioni se richieste
            if (actionRequired.actions.length > 0) {
                await this.executeActions(actionRequired.actions);
            }

        } catch (error) {
            console.error('❌ Errore elaborazione messaggio:', error);
            this.hideThinking();
            this.addMessage('😅 Mi dispiace, ho riscontrato un problema tecnico. Puoi riprovare?', 'assistant');
            notificationService.error('Errore Chat AI: ' + error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    // ==================== ANALISI INTENTI UTENTE ====================

    async analyzeUserIntent(message) {
        const lowerMessage = message.toLowerCase();
        const actions = [];
        let intent = 'general';
        let entities = this.extractEntities(message);

        // Intent: Registrazione Artista (priorità alta)
        if (this.isArtistRegistrationIntent(lowerMessage)) {
            intent = 'register_artist';
            actions.push({ type: 'start_artist_registration', entities });
        }

        // Intent: Nuova Agibilità
        else if (lowerMessage.includes('nuova agibilità') || 
            lowerMessage.includes('crea agibilità') ||
            lowerMessage.includes('nuova comunicazione')) {
            intent = 'create_agibilita';
            actions.push({ type: 'navigate', target: 'new_agibilita' });
        }

        // Intent: Cerca Artisti
        else if (lowerMessage.includes('cerca artist') || 
                 lowerMessage.includes('trova artist') ||
                 lowerMessage.includes('gestione artist')) {
            intent = 'search_artists';
            actions.push({ type: 'search_artists', query: this.extractSearchQuery(message) });
        }

        // Intent: Modifica Artista
        else if (lowerMessage.includes('modific') && lowerMessage.includes('artist')) {
            intent = 'edit_artist';
            actions.push({ type: 'search_artists_for_edit', query: this.extractSearchQuery(message) });
        }

        // Intent: Calcolo Compensi
        else if (lowerMessage.includes('calcol') && 
                 (lowerMessage.includes('compenso') || lowerMessage.includes('contribut'))) {
            intent = 'calculate_compensation';
            actions.push({ type: 'show_calculator' });
        }

        // Intent: Genera XML
        else if (lowerMessage.includes('xml') || 
                 lowerMessage.includes('inps') ||
                 lowerMessage.includes('genera')) {
            intent = 'generate_xml';
        }

        // Intent: Normativa/Aiuto
        else if (lowerMessage.includes('normativ') || 
                 lowerMessage.includes('legge') ||
                 lowerMessage.includes('come funziona') ||
                 lowerMessage.includes('spiegami')) {
            intent = 'help_regulation';
        }

        return { intent, actions, originalMessage: message, entities };
    }

    // ==================== RICONOSCIMENTO REGISTRAZIONE ARTISTA ====================

    isArtistRegistrationIntent(message) {
        const registrationKeywords = [
            'registr', 'aggiungi', 'inserisci', 'nuovo artist', 'nuova artist',
            'crea artist', 'salva artist', 'artist', 'performer', 'musicista',
            'cantante', 'ballerino', 'dj', 'tecnico', 'truccatore'
        ];

        const contextKeywords = [
            'database', 'anagrafica', 'dati', 'nome', 'cognome', 'codice fiscal',
            'cf', 'telefono', 'email', 'indirizzo', 'partita iva', 'iban'
        ];

        // Cerca pattern di registrazione
        const hasRegistrationKeyword = registrationKeywords.some(keyword => 
            message.includes(keyword));
            
        const hasContextKeyword = contextKeywords.some(keyword => 
            message.includes(keyword));

        // Pattern specifici per registrazione
        const specificPatterns = [
            /ho un nuovo artist/i,
            /devo registrare/i,
            /aggiungi.*artist/i,
            /inserire.*dati/i,
            /nuovo.*performer/i,
            /artist.*database/i
        ];

        const hasSpecificPattern = specificPatterns.some(pattern => 
            pattern.test(message));

        return hasRegistrationKeyword || hasContextKeyword || hasSpecificPattern;
    }

    // ==================== ESTRAZIONE ENTITÀ ====================

    extractEntities(message) {
        const entities = {};
        
        // Estrai nomi (cerca pattern Nome Cognome)
        const namePattern = /(?:nome|chiama|artist)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
        const nameMatch = namePattern.exec(message);
        if (nameMatch) {
            const fullName = nameMatch[1].split(' ');
            if (fullName.length >= 2) {
                entities.nome = fullName[0];
                entities.cognome = fullName.slice(1).join(' ');
            } else {
                entities.nome = fullName[0];
            }
        }

        // Estrai codice fiscale
        const cfPattern = /([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])/gi;
        const cfMatch = cfPattern.exec(message);
        if (cfMatch) {
            entities.codiceFiscale = cfMatch[1];
        }

        // Estrai email
        const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
        const emailMatch = emailPattern.exec(message);
        if (emailMatch) {
            entities.email = emailMatch[1];
        }

        // Estrai telefono
        const phonePattern = /(?:tel|telefono|cell|cellulare|numero)[\s:]*([+]?[0-9\s-]{8,15})/gi;
        const phoneMatch = phonePattern.exec(message);
        if (phoneMatch) {
            entities.telefono = phoneMatch[1].replace(/\s|-/g, '');
        }

        // Estrai mansioni specifiche
        const mansioni = {
            'dj': 'DJ',
            'vocalist': 'Vocalist', 
            'musicista': 'Musicista',
            'cantante': 'Cantante',
            'ballerino': 'Ballerino/a',
            'ballerina': 'Ballerino/a',
            'performer': 'Performer',
            'animatore': 'Animatore',
            'tecnico audio': 'Tecnico Audio',
            'tecnico luci': 'Tecnico Luci',
            'fotografo': 'Fotografo',
            'videomaker': 'Videomaker',
            'truccatore': 'Truccatore',
            'costumista': 'Costumista',
            'scenografo': 'Scenografo'
        };

        for (const [keyword, mansione] of Object.entries(mansioni)) {
            if (message.toLowerCase().includes(keyword)) {
                entities.mansione = mansione;
                break;
            }
        }

        // Estrai nazionalità
        if (message.includes('straniero') || message.includes('estero')) {
            entities.nazionalita = 'EX';
        } else if (message.includes('europeo') || message.includes('ue') || message.includes('comunitario')) {
            entities.nazionalita = 'EU';
        } else if (message.includes('italiano') || message.includes('italia')) {
            entities.nazionalita = 'IT';
        }

        // Estrai presenza partita IVA
        if (message.includes('partita iva') || message.includes('p.iva') || message.includes('piva')) {
            entities.hasPartitaIva = message.includes('senza') || message.includes('non ha') ? false : true;
        }

        return entities;
    }

    extractSearchQuery(message) {
        // Estrai il termine di ricerca dal messaggio
        const patterns = [
            /cerca artist[ai]?\s+(.+)/i,
            /trova artist[ai]?\s+(.+)/i,
            /artist[ai]?\s+(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) return match[1].trim();
        }
        
        return '';
    }

    // ==================== GENERAZIONE RISPOSTE AI ====================

    async generateAIResponse(userMessage, actionContext) {
        try {
            // Gestisci registrazione artista con logica speciale
            if (actionContext.intent === 'register_artist') {
                return await this.handleArtistRegistration(userMessage, actionContext.entities);
            }
            
            // Prepara il contesto per l'AI
            const contextualPrompt = this.buildContextualPrompt(userMessage, actionContext);
            
            // Scegli il provider AI
            switch (AI_CONFIG.provider) {
                case 'groq':
                    return await this.callGroqAPI(contextualPrompt);
                case 'huggingface':
                    return await this.callHuggingFaceAPI(contextualPrompt);
                case 'gemini':
                    return await this.callGeminiAPI(contextualPrompt);
                case 'ollama':
                    return await this.callOllamaAPI(contextualPrompt);
                case 'mock':
                default:
                    return await this.generateMockResponse(userMessage, actionContext);
            }
            
        } catch (error) {
            console.error('❌ Errore generazione risposta AI:', error);
            return this.getFallbackResponse(actionContext.intent);
        }
    }

    buildContextualPrompt(userMessage, actionContext) {
        let prompt = `Messaggio utente: "${userMessage}"\n`;
        prompt += `Intent rilevato: ${actionContext.intent}\n`;
        
        if (this.agibilitaContext) {
            prompt += `Contesto agibilità: ${JSON.stringify(this.agibilitaContext, null, 2)}\n`;
        }
        
        if (actionContext.actions.length > 0) {
            prompt += `Azioni disponibili: ${actionContext.actions.map(a => a.type).join(', ')}\n`;
        }
        
        prompt += '\nFornisci una risposta utile e professionale in italiano.';
        
        return prompt;
    }

    // ==================== PROVIDER AI - GROQ (GRATUITO) ====================

    async callGroqAPI(prompt) {
        try {
            if (!AI_CONFIG.apiKey) {
                console.warn('⚠️ API Key Groq mancante, uso risposta mock');
                return this.generateMockResponse(prompt, { intent: 'general' });
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

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
                            content: 'Sei l\'assistente AI RECORP per la gestione delle agibilità ENPALS. Rispondi in italiano in modo professionale ma amichevole. Usa emoji appropriate e formatta le risposte con bullet points quando utile.'
                        },
                        {
                            role: 'user', 
                            content: prompt
                        }
                    ],
                    max_tokens: AI_CONFIG.maxTokens,
                    temperature: AI_CONFIG.temperature
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Groq API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || 'Risposta non disponibile';

        } catch (error) {
            console.warn('⚠️ Errore Groq API:', error.message);
            return this.generateMockResponse(prompt, { intent: 'general' });
        }
    }

    // ==================== PROVIDER AI - HUGGING FACE (GRATUITO) ====================

    async callHuggingFaceAPI(prompt) {
        try {
            if (!AI_CONFIG.apiKey) {
                console.warn('⚠️ API Key Hugging Face mancante, uso risposta mock');
                return this.generateMockResponse(prompt, { intent: 'general' });
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

            const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-large', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: AI_CONFIG.maxTokens,
                        temperature: AI_CONFIG.temperature
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Hugging Face API error: ${response.status}`);
            }

            const data = await response.json();
            return data[0]?.generated_text || 'Risposta non disponibile';

        } catch (error) {
            console.warn('⚠️ Errore Hugging Face API:', error.message);
            return this.generateMockResponse(prompt, { intent: 'general' });
        }
    }

    // ==================== PROVIDER AI - GOOGLE GEMINI (GRATUITO) ====================

    async callGeminiAPI(prompt) {
        try {
            if (!AI_CONFIG.apiKey) {
                console.warn('⚠️ API Key Gemini mancante, uso risposta mock');
                return this.generateMockResponse(prompt, { intent: 'general' });
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${AI_CONFIG.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Sei l'assistente AI RECORP per la gestione delle agibilità ENPALS. Rispondi in italiano in modo professionale ma amichevole. Usa emoji appropriate.\n\nDomanda: ${prompt}`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: AI_CONFIG.maxTokens,
                        temperature: AI_CONFIG.temperature
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0]?.content?.parts[0]?.text || 'Risposta non disponibile';

        } catch (error) {
            console.warn('⚠️ Errore Gemini API:', error.message);
            return this.generateMockResponse(prompt, { intent: 'general' });
        }
    }

    async callOllamaAPI(prompt) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

            const response = await fetch(`${AI_CONFIG.baseURL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: AI_CONFIG.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: AI_CONFIG.temperature,
                        max_tokens: AI_CONFIG.maxTokens
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            return data.response || 'Risposta non disponibile';

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ Timeout connessione Ollama, uso risposta mock');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('⚠️ Ollama non disponibile (server non avviato), uso risposta mock');
            } else {
                console.warn('⚠️ Errore Ollama:', error.message);
            }
            
            // Fallback automatico a mock
            AI_CONFIG.provider = 'mock';
            return this.generateMockResponse(prompt, { intent: 'general' });
        }
    }

    // ==================== PROVIDER AI - MOCK (FALLBACK) ====================

    async generateMockResponse(userMessage, actionContext) {
        // Simula delay per realismo
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        
        const intent = actionContext?.intent || 'general';
        
        const responses = {
            register_artist: [
                "🎭 Perfetto! Iniziamo la registrazione di un nuovo artista nel database RECORP.\n\n📋 Ti guiderò attraverso il processo raccogliendo tutte le informazioni necessarie:\n\n• 📝 Dati anagrafici (nome, CF, data nascita)\n• 🏠 Indirizzo di residenza\n• 🎨 Informazioni professionali\n• 💰 Dati fiscali (P.IVA o tipo contratto)\n• 🏦 IBAN per pagamenti\n\nPuoi fornire tutti i dati insieme o passo dopo passo!",
                "✨ Ottimo! Registriamo un nuovo artista nel sistema.\n\n🎯 Posso aiutarti con una registrazione completa includendo:\n• Validazioni automatiche codice fiscale\n• Estrazione dati da CF (età, sesso, comune)\n• Gestione artisti stranieri\n• Verifica duplicati nel database\n• Calcoli automatici contributi\n\nDimmi i dati che hai e procediamo!"
            ],
            create_agibilita: [
                "✨ Perfetto! Ti aiuto a creare una nuova agibilità ENPALS.\n\n📋 Per iniziare avrò bisogno di:\n• 🎭 Tipo di spettacolo\n• 📅 Date delle rappresentazioni\n• 🏢 Venue/location\n• 👥 Lista artisti coinvolti\n\nVuoi iniziare ora? Ti guiderò passo dopo passo!",
                "🎯 Ottima scelta! Creare una nuova agibilità è semplice con il sistema RECORP.\n\n🔧 Il wizard ti guiderà attraverso:\n1. Selezione tipo agibilità\n2. Inserimento dati spettacolo\n3. Gestione artisti e compensi\n4. Validazione e salvataggio\n\nProcediamo insieme?"
            ],
            search_artists: [
                "🔍 Perfetto! Il database artisti RECORP contiene tutti i professionisti registrati.\n\n✨ Puoi cercare per:\n• 📝 Nome/Cognome\n• 🎭 Specializzazione\n• 💰 Range compensi\n• 📍 Località\n\nDimmi cosa stai cercando e ti aiuto a trovare l'artista giusto!",
                "👥 Ottimo! La gestione artisti è una delle funzioni più potenti di RECORP.\n\n🎯 Posso aiutarti con:\n• Ricerca avanzata artisti\n• Verifica dati contributivi\n• Storico collaborazioni\n• Calcolo compensi standard\n\nCosa ti serve specificamente?"
            ],
            edit_artist: [
                "✏️ Perfetto! Ti aiuto a modificare i dati di un artista esistente.\n\n🔍 Dimmi chi vuoi modificare:\n• Nome e cognome\n• Codice fiscale\n• Nome d'arte\n\nTroverò l'artista nel database e potrai aggiornare tutti i suoi dati!",
                "🔧 Ottimo! La modifica artisti permette di aggiornare:\n• 📝 Dati anagrafici\n• 🏠 Indirizzo\n• 🎭 Mansione e specializzazioni\n• 💰 Dati fiscali\n• 🏦 IBAN\n\nChi vuoi modificare?"
            ],
            calculate_compensation: [
                "💰 Perfetto! Il calcolo dei compensi è fondamentale per le agibilità ENPALS.\n\n📊 Terrò conto di:\n• 💵 Compenso lordo\n• 🧮 Ritenute IRPEF\n• 🏛️ Contributi ENPALS\n• 📋 Detrazioni applicabili\n\nInserisci i dati e calcolerò tutto automaticamente!",
                "🧮 Ottima richiesta! I calcoli per ENPALS hanno regole specifiche.\n\n✅ Il sistema considera:\n• Scaglioni contributivi\n• Minimali giornalieri\n• Maggiorazioni festivi\n• Deduzioni ammesse\n\nVuoi che ti mostri il calcolatore?"
            ],
            generate_xml: [
                "📄 Eccellente! La generazione XML INPS è automatizzata in RECORP.\n\n🎯 Il file conterrà:\n• 📋 Dati identificativi\n• 👥 Elenco lavoratori\n• 💰 Compensi e contributi\n• 📅 Periodi di lavoro\n\nTutti i controlli di validità sono automatici!",
                "🔧 Perfetto! L'XML per INPS viene generato secondo le specifiche ufficiali.\n\n✅ Verifiche automatiche:\n• Codici fiscali\n• Date coerenti\n• Importi corretti\n• Formato conforme\n\nVuoi procedere con la generazione?"
            ],
            help_regulation: [
                "📚 Ottima domanda! La normativa ENPALS è complessa ma ti aiuto a orientarti.\n\n🎭 Punti chiave:\n• 📅 Tempistiche comunicazioni\n• 💰 Minimi contributivi\n• 📋 Obblighi datore lavoro\n• 🎪 Tipologie spettacolo\n\nSu cosa vuoi approfondire?",
                "⚖️ La normativa spettacolo ha regole specifiche, ti spiego volentieri!\n\n📖 Argomenti principali:\n• 🎭 Contratti spettacolo\n• 💼 Agibilità ENPALS\n• 🧮 Calcoli contributivi\n• 📄 Adempimenti fiscali\n\nQuale aspetto ti interessa di più?"
            ],
            general: [
                "👋 Sono qui per aiutarti con tutto quello che riguarda le agibilità ENPALS!\n\n🎯 Posso assisterti con:\n• ✨ Creazione agibilità\n• 🎭 Registrazione/modifica artisti\n• 🔍 Gestione database\n• 💰 Calcoli compensi\n• 📄 Documenti XML\n• 📚 Normative\n\nCosa posso fare per te?",
                "🤖 Eccomi! Sono il tuo assistente per il sistema agibilità RECORP.\n\n🎭 Specializzato in:\n• Procedure ENPALS\n• Gestione artisti completa\n• Workflow amministrativo\n• Ottimizzazione processi\n• Risoluzione problemi\n\nDimmi pure come posso aiutarti!"
            ]
        };
        
        const intentResponses = responses[intent] || responses.general;
        const randomResponse = intentResponses[Math.floor(Math.random() * intentResponses.length)];
        
        return randomResponse;
    }

    getFallbackResponse(intent) {
        const fallbacks = {
            register_artist: "🎭 Ti aiuto a registrare un nuovo artista! Dimmi i dati che hai e procediamo insieme.",
            create_agibilita: "✨ Ti aiuto a creare una nuova agibilità! Vuoi iniziare il processo guidato?",
            search_artists: "🔍 Posso aiutarti a cercare artisti nel database. Che tipo di ricerca vuoi fare?",
            edit_artist: "✏️ Ti aiuto a modificare un artista esistente. Chi vuoi modificare?",
            calculate_compensation: "💰 Ti assisto con i calcoli dei compensi ENPALS. Hai i dati da elaborare?",
            generate_xml: "📄 Posso aiutarti con la generazione dell'XML INPS. Procediamo?",
            help_regulation: "📚 Ti spiego volentieri la normativa ENPALS. Su cosa vuoi informazioni?",
            general: "🤖 Sono qui per aiutarti con le agibilità ENPALS. Come posso assisterti?"
        };
        
        return fallbacks[intent] || fallbacks.general;
    }

    // ==================== ESECUZIONE AZIONI ====================

    async executeActions(actions) {
        for (const action of actions) {
            try {
                await this.executeAction(action);
            } catch (error) {
                console.error('❌ Errore esecuzione azione:', action, error);
            }
        }
    }

    async executeAction(action) {
        switch (action.type) {
            case 'navigate':
                if (action.target === 'new_agibilita') {
                    // Naviga alla pagina nuova agibilità
                    setTimeout(() => {
                        window.location.href = '../agibilita/index.html';
                    }, 2000);
                    this.addMessage("🔄 Ti sto reindirizzando alla pagina di creazione agibilità...", 'assistant');
                }
                break;
                
            case 'search_artists':
                if (action.query) {
                    const results = await this.searchArtistsInDB(action.query);
                    this.showArtistResults(results);
                }
                break;
                
            case 'show_calculator':
                this.addMessage("🧮 Ecco il calcolatore compensi:\n\n💰 **Compenso Lordo**: €____\n📊 **Giorni Lavorativi**: ____\n🎭 **Tipo Attività**: ____\n\n_Compila i campi e ti calcolerò contributi e netto!_", 'assistant');
                break;
                
            default:
                console.log('⚠️ Azione non implementata:', action.type);
        }
    }

    // ==================== INTEGRAZIONE DATABASE ====================

    async loadAgibilitaContext() {
        try {
            // Carica statistiche agibilità per contesto
            const stats = await DatabaseService.getStatistiche();
            this.agibilitaContext = {
                totalAgibilita: stats?.totalAgibilita || 0,
                bozzeInCorso: stats?.bozzeInCorso || 0,
                artistiRegistrati: stats?.artistiRegistrati || 0
            };
        } catch (error) {
            console.warn('⚠️ Errore caricamento contesto agibilità:', error);
        }
    }

    async searchArtistsInDB(query) {
        try {
            const results = await DatabaseService.searchArtisti(query);
            return results || [];
        } catch (error) {
            console.error('❌ Errore ricerca artisti:', error);
            return [];
        }
    }

    showArtistResults(results) {
        if (results.length === 0) {
            this.addMessage("🔍 Nessun artista trovato per la ricerca. Vuoi:\n• 📝 Aggiungere un nuovo artista\n• 🔄 Modificare i criteri di ricerca\n• 📞 Verificare nel database esterno", 'assistant');
            return;
        }

        let message = `🎭 **Trovati ${results.length} artisti:**\n\n`;
        results.slice(0, 5).forEach((artist, index) => {
            message += `${index + 1}. **${artist.nome} ${artist.cognome}**\n`;
            message += `   📧 ${artist.email || 'N/A'}\n`;
            message += `   🎭 ${artist.mansione || 'Non specificata'}\n\n`;
        });

        if (results.length > 5) {
            message += `_... e altri ${results.length - 5} risultati_\n\n`;
        }

        message += "💡 Vuoi vedere i dettagli di qualcuno o fare una nuova ricerca?";
        
        this.addMessage(message, 'assistant');
    }

    showArtistResultsForEdit(results) {
        if (results.length === 0) {
            this.addMessage("🔍 Nessun artista trovato per la modifica. Vuoi:\n• 📝 Registrare un nuovo artista\n• 🔄 Modificare i criteri di ricerca", 'assistant');
            return;
        }

        let message = `✏️ **Artisti trovati per modifica:**\n\n`;
        results.slice(0, 3).forEach((artist, index) => {
            const id = artist.codice_fiscale || artist.codice_fiscale_temp || `ID-${artist.id}`;
            message += `${index + 1}. **${artist.nome} ${artist.cognome}**\n`;
            message += `   📋 ID: ${id}\n`;
            message += `   🎭 ${artist.mansione}\n`;
            message += `   📍 ${artist.citta}, ${artist.provincia}\n\n`;
        });

        if (results.length > 3) {
            message += `_... e altri ${results.length - 3} risultati_\n\n`;
        }

        message += "🔧 **Per modificare un artista, vai alla pagina di gestione artisti.**\n";
        message += "💡 Ti posso aiutare a registrare un nuovo artista se preferisci!";
        
        this.addMessage(message, 'assistant');
    }

    // ==================== SISTEMA REGISTRAZIONE ARTISTA INTELLIGENTE ====================

    async handleArtistRegistration(userMessage, entities) {
        console.log('🎭 Inizio registrazione artista intelligente', entities);
        
        // Inizializza sessione di registrazione se non esiste
        if (!this.currentRegistration) {
            this.currentRegistration = {
                step: 'init',
                data: {},
                missingFields: [],
                validationErrors: []
            };
        }

        // Aggiorna dati con le entità estratte
        this.updateRegistrationData(entities);

        // Determina il prossimo step
        const response = await this.processRegistrationStep(userMessage);
        
        return response;
    }

    updateRegistrationData(entities) {
        for (const [key, value] of Object.entries(entities)) {
            if (value && value.toString().trim()) {
                this.currentRegistration.data[key] = value;
                console.log(`📝 Aggiornato campo: ${key} = ${value}`);
            }
        }
    }

    async processRegistrationStep(userMessage) {
        const data = this.currentRegistration.data;
        
        // Verifica campi obbligatori e determina cosa manca
        const validation = this.validateArtistData(data);
        
        if (validation.isComplete) {
            // Tutti i dati sono completi, procedi con il salvataggio
            return await this.finalizeArtistRegistration();
        } else {
            // Chiedi i campi mancanti in modo intelligente
            return this.askForMissingFields(validation.missingFields, validation.suggestions);
        }
    }

    validateArtistData(data) {
        const required = ['nome', 'cognome'];
        const important = ['mansione', 'indirizzo', 'iban'];
        const conditional = [];
        
        const missing = [];
        const suggestions = [];
        
        // Verifica campi obbligatori base
        required.forEach(field => {
            if (!data[field]) {
                missing.push({ field, priority: 'high', type: 'required' });
            }
        });

        // Logica nazionalità e codice fiscale
        const nazionalita = data.nazionalita || 'IT';
        if (nazionalita === 'IT' && !data.codiceFiscale) {
            missing.push({ 
                field: 'codiceFiscale', 
                priority: 'high', 
                type: 'required',
                note: 'Obbligatorio per artisti italiani'
            });
        }

        // Data di nascita (può essere estratta dal CF)
        if (!data.dataNascita && !data.codiceFiscale) {
            missing.push({ field: 'dataNascita', priority: 'high', type: 'required' });
        }

        // Indirizzo - logica per stranieri vs italiani
        if (!data.indirizzo) {
            missing.push({ field: 'indirizzo', priority: 'medium', type: 'required' });
        }
        
        if (nazionalita === 'IT') {
            if (!data.provincia) {
                missing.push({ field: 'provincia', priority: 'medium', type: 'address' });
            }
            if (!data.citta) {
                missing.push({ field: 'citta', priority: 'medium', type: 'address' });
            }
        } else {
            if (!data.paeseResidenza) {
                missing.push({ field: 'paeseResidenza', priority: 'medium', type: 'address' });
            }
        }

        // Verifica mansione
        if (!data.mansione) {
            missing.push({ field: 'mansione', priority: 'high', type: 'professional' });
        }

        // Logica partita IVA
        if (data.hasPartitaIva === true && !data.partitaIva) {
            missing.push({ field: 'partitaIva', priority: 'high', type: 'fiscal' });
        } else if (data.hasPartitaIva === false) {
            if (!data.tipoRapporto) {
                missing.push({ field: 'tipoRapporto', priority: 'medium', type: 'professional' });
            }
            if (data.tipoRapporto === 'chiamata' && !data.codiceComunicazione) {
                missing.push({ field: 'codiceComunicazione', priority: 'high', type: 'required' });
            }
        } else if (data.hasPartitaIva === undefined) {
            missing.push({ field: 'hasPartitaIva', priority: 'high', type: 'fiscal' });
        }

        // IBAN sempre obbligatorio
        if (!data.iban) {
            missing.push({ field: 'iban', priority: 'high', type: 'fiscal' });
        }

        // Validazioni specifiche
        if (data.codiceFiscale && !this.validateCodiceFiscale(data.codiceFiscale)) {
            suggestions.push({
                type: 'validation_error',
                field: 'codiceFiscale',
                message: 'Il codice fiscale inserito non è valido'
            });
        }

        if (data.email && !this.validateEmail(data.email)) {
            suggestions.push({
                type: 'validation_error', 
                field: 'email',
                message: 'Email non valida'
            });
        }

        if (data.iban && !this.validateIBAN(data.iban)) {
            suggestions.push({
                type: 'validation_error',
                field: 'iban', 
                message: 'IBAN non valido'
            });
        }

        // Suggerimenti automatici
        if (data.codiceFiscale && data.codiceFiscale.length === 16 && !data.dataNascita) {
            const extractedDate = this.extractDateFromCF(data.codiceFiscale);
            if (extractedDate) {
                data.dataNascita = extractedDate;
                suggestions.push({
                    type: 'auto_fill',
                    field: 'dataNascita',
                    value: extractedDate,
                    message: 'Data di nascita estratta dal codice fiscale'
                });
            }
        }

        if (data.codiceFiscale && !data.sesso) {
            const extractedGender = this.extractGenderFromCF(data.codiceFiscale);
            if (extractedGender) {
                data.sesso = extractedGender;
                suggestions.push({
                    type: 'auto_fill',
                    field: 'sesso', 
                    value: extractedGender,
                    message: 'Sesso estratto dal codice fiscale'
                });
            }
        }

        return {
            isComplete: missing.length === 0 && suggestions.filter(s => s.type === 'validation_error').length === 0,
            missingFields: missing,
            suggestions: suggestions,
            completionPercentage: this.calculateCompletionPercentage(data)
        };
    }

    calculateCompletionPercentage(data) {
        const allFields = [
            'nome', 'cognome', 'codiceFiscale', 'dataNascita', 'mansione', 
            'indirizzo', 'provincia', 'citta', 'hasPartitaIva', 'iban'
        ];
        
        const filledFields = allFields.filter(field => data[field]).length;
        return Math.round((filledFields / allFields.length) * 100);
    }

    askForMissingFields(missingFields, suggestions) {
        let response = "";
        
        // Mostra suggerimenti automatici prima
        const autoFills = suggestions.filter(s => s.type === 'auto_fill');
        if (autoFills.length > 0) {
            response += "✨ **Dati compilati automaticamente:**\n";
            autoFills.forEach(fill => {
                response += `• ${this.getFieldDisplayName(fill.field)}: ${fill.value} _(${fill.message})_\n`;
            });
            response += "\n";
        }

        // Mostra errori di validazione
        const errors = suggestions.filter(s => s.type === 'validation_error');
        if (errors.length > 0) {
            response += "⚠️ **Errori da correggere:**\n";
            errors.forEach(error => {
                response += `• ${this.getFieldDisplayName(error.field)}: ${error.message}\n`;
            });
            response += "\n";
        }

        // Raggruppa campi mancanti per priorità
        const highPriority = missingFields.filter(f => f.priority === 'high');
        const mediumPriority = missingFields.filter(f => f.priority === 'medium');

        if (highPriority.length > 0) {
            response += "🔴 **Informazioni essenziali mancanti:**\n";
            response += this.generateFieldQuestions(highPriority.slice(0, 3)); // Max 3 domande alla volta
        } else if (mediumPriority.length > 0) {
            response += "🟡 **Informazioni aggiuntive:**\n";
            response += this.generateFieldQuestions(mediumPriority.slice(0, 2)); // Max 2 domande
        }

        // Mostra progressi
        const completion = this.calculateCompletionPercentage(this.currentRegistration.data);
        response += `\n📊 **Completamento**: ${completion}%`;
        
        if (completion >= 70) {
            response += "\n\n💡 _Hai inserito la maggior parte dei dati! Possiamo procedere se vuoi._";
        }

        return response;
    }

    generateFieldQuestions(fields) {
        let questions = "";
        
        fields.forEach((field, index) => {
            const name = this.getFieldDisplayName(field.field);
            const example = this.getFieldExample(field.field);
            const note = field.note ? ` _(${field.note})_` : '';
            
            questions += `${index + 1}. **${name}**${note}\n`;
            if (example) {
                questions += `   _Esempio: ${example}_\n`;
            }
            questions += "\n";
        });

        return questions;
    }

    getFieldDisplayName(field) {
        const displayNames = {
            'nome': 'Nome',
            'cognome': 'Cognome', 
            'nomeArte': 'Nome d\'Arte',
            'codiceFiscale': 'Codice Fiscale',
            'dataNascita': 'Data di Nascita',
            'mansione': 'Mansione/Ruolo',
            'telefono': 'Telefono',
            'email': 'Email',
            'indirizzo': 'Indirizzo',
            'provincia': 'Provincia',
            'citta': 'Città',
            'cap': 'CAP',
            'paeseResidenza': 'Paese di Residenza',
            'nazionalita': 'Nazionalità',
            'hasPartitaIva': 'Ha Partita IVA?',
            'partitaIva': 'Partita IVA',
            'tipoRapporto': 'Tipo di Contratto',
            'codiceComunicazione': 'Codice Comunicazione INPS',
            'iban': 'IBAN',
            'matricolaENPALS': 'Matricola ENPALS',
            'note': 'Note'
        };
        
        return displayNames[field] || field;
    }

    getFieldExample(field) {
        const examples = {
            'nome': 'Mario',
            'cognome': 'Rossi',
            'nomeArte': 'DJ Mario',
            'codiceFiscale': 'RSSMRA85T10A562S',
            'dataNascita': '1985-12-10',
            'mansione': 'DJ, Musicista, Cantante...',
            'telefono': '+39 333 1234567',
            'email': 'mario.rossi@email.it',
            'indirizzo': 'Via Roma 123',
            'provincia': 'RM, MI, NA...',
            'citta': 'Roma, Milano...',
            'paeseResidenza': 'Francia, Germania...',
            'hasPartitaIva': 'Sì o No',
            'partitaIva': '12345678901',
            'tipoRapporto': 'Occasionale, Chiamata, Full Time',
            'codiceComunicazione': 'ABCD123456',
            'iban': 'IT60X0542811101000000123456',
            'matricolaENPALS': '123456'
        };
        
        return examples[field];
    }

    async finalizeArtistRegistration() {
        try {
            console.log('💾 Finalizzazione registrazione artista:', this.currentRegistration.data);
            
            // Prepara i dati nel formato corretto per Supabase
            const artistData = this.formatArtistDataForDB(this.currentRegistration.data);
            
            // Salva usando DatabaseService
            const savedArtist = await DatabaseService.saveArtist(artistData);
            
            // Reset registrazione corrente
            this.currentRegistration = null;
            
            const displayName = savedArtist.nome_arte || `${savedArtist.nome} ${savedArtist.cognome}`;
            
            return `🎉 **Artista registrato con successo!**\n\n` +
                   `👤 **${displayName}**\n` +
                   `📋 ID: ${savedArtist.codice_fiscale || savedArtist.codice_fiscale_temp}\n` +
                   `🎭 Mansione: ${savedArtist.mansione}\n` +
                   `📍 Residenza: ${savedArtist.citta}, ${savedArtist.provincia}\n\n` +
                   `✅ L'artista è ora disponibile per le agibilità!\n\n` +
                   `💡 Vuoi registrare un altro artista o creare una nuova agibilità?`;
                   
        } catch (error) {
            console.error('❌ Errore salvataggio artista:', error);
            
            // Reset su errore
            this.currentRegistration = null;
            
            return `❌ **Errore durante la registrazione**\n\n` +
                   `Si è verificato un problema: ${error.message}\n\n` +
                   `💡 Riprova o contatta l'assistenza se il problema persiste.`;
        }
    }

    formatArtistDataForDB(data) {
        // Mappatura corretta per il database Supabase
        const dbData = {
            nome: data.nome?.toUpperCase() || '',
            cognome: data.cognome?.toUpperCase() || '',
            nome_arte: data.nomeArte || null,
            codice_fiscale: data.codiceFiscale?.toUpperCase() || null,
            matricola_enpals: data.matricolaENPALS?.toUpperCase() || '',
            data_nascita: data.dataNascita || null,
            sesso: data.sesso || '',
            luogo_nascita: data.luogoNascita || '',
            provincia_nascita: data.provinciaNascita?.toUpperCase() || '',
            nazionalita: data.nazionalita || 'IT',
            telefono: data.telefono || '',
            email: data.email || '',
            indirizzo: data.indirizzo || '',
            has_partita_iva: data.hasPartitaIva === true,
            partita_iva: data.hasPartitaIva === true ? data.partitaIva : '',
            tipo_rapporto: data.hasPartitaIva === false ? (data.tipoRapporto || 'occasionale') : '',
            codice_comunicazione: data.codiceComunicazione || '',
            iban: data.iban?.toUpperCase().replace(/\s/g, '') || '',
            mansione: data.mansione || '',
            note: data.note || ''
        };

        // Gestione indirizzo per nazionalità
        if (data.nazionalita === 'IT') {
            dbData.provincia = data.provincia || '';
            dbData.citta = data.citta || '';
            dbData.cap = data.cap || '';
            dbData.codice_istat_citta = data.codiceIstatCitta || null;
            dbData.paese_residenza = 'IT';
        } else {
            dbData.provincia = 'EE'; // Estero
            dbData.citta = data.paeseResidenza || '';
            dbData.cap = '00000';
            dbData.codice_istat_citta = null;
            dbData.paese_residenza = data.paeseResidenza || '';
        }

        // Se non c'è CF per stranieri, genera ID temporaneo
        if (!dbData.codice_fiscale && data.nazionalita !== 'IT') {
            const timestamp = Date.now();
            const tempId = `TEMP_${data.nome?.substring(0, 3) || 'XXX'}${data.cognome?.substring(0, 3) || 'XXX'}_${timestamp}`;
            dbData.codice_fiscale_temp = tempId;
            dbData.note = (dbData.note ? dbData.note + '\n' : '') + `[Sistema] ID temporaneo: ${tempId}`;
        }

        return dbData;
    }

    // ==================== FUNZIONI DI VALIDAZIONE INTEGRATE ====================

    validateCodiceFiscale(cf) {
        if (!cf) return false;
        cf = cf.toUpperCase();
        if (cf.length !== 16) return false;
        
        const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
        return pattern.test(cf);
    }

    validateEmail(email) {
        if (!email) return true; // Email è opzionale
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }

    validateIBAN(iban) {
        if (!iban) return false;
        // Rimuovi spazi e converti in maiuscolo
        iban = iban.replace(/\s/g, '').toUpperCase();
        
        // Verifica formato base per IBAN italiano (27 caratteri)
        if (iban.length < 15 || iban.length > 34) return false;
        if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false;
        
        return true; // Validazione semplificata per la chat
    }

    extractDateFromCF(cf) {
        if (!cf || cf.length < 11) return null;
        
        // Posizioni nel CF: anno (6-7), mese (8), giorno (9-10)
        const yearCode = cf.substring(6, 8);
        const monthCode = cf.substring(8, 9);
        const dayCode = cf.substring(9, 11);
        
        // Mappa dei mesi
        const monthMap = {
            'A': '01', 'B': '02', 'C': '03', 'D': '04',
            'E': '05', 'H': '06', 'L': '07', 'M': '08',
            'P': '09', 'R': '10', 'S': '11', 'T': '12'
        };
        
        const month = monthMap[monthCode];
        if (!month) return null;
        
        // Estrai giorno (per le donne è aumentato di 40)
        let day = parseInt(dayCode);
        if (day > 40) day -= 40;
        
        // Determina l'anno completo
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        const lastCentury = currentCentury - 100;
        
        let year = parseInt(yearCode);
        if (currentCentury + year > currentYear) {
            year = lastCentury + year;
        } else {
            year = currentCentury + year;
        }
        
        return `${year}-${month}-${day.toString().padStart(2, '0')}`;
    }

    extractGenderFromCF(cf) {
        if (!cf || cf.length < 11) return null;
        
        const dayCode = parseInt(cf.substring(9, 11));
        return dayCode > 40 ? 'F' : 'M';
    }

    // ==================== UTILITÀ INTERFACCIA ====================

    addMessage(text, sender) {
        if (typeof window.addMessage === 'function') {
            window.addMessage(text, sender);
        } else {
            console.log(`[${sender.toUpperCase()}]: ${text}`);
        }
    }

    hideThinking() {
        if (typeof window.hideThinking === 'function') {
            window.hideThinking();
        }
    }

    // ==================== GESTIONE CONVERSAZIONE ====================

    clearConversation() {
        this.conversationHistory = this.conversationHistory.filter(msg => msg.role === 'system');
        this.setupSystemPrompt();
    }

    exportConversation() {
        return {
            timestamp: new Date().toISOString(),
            user: this.userSession?.email || 'Anonimo',
            messages: this.conversationHistory.filter(msg => msg.role !== 'system')
        };
    }

    // ==================== API PUBBLICA ====================

    static async getInstance() {
        if (!window.ChatAI) {
            window.ChatAI = new ChatAI();
        }
        return window.ChatAI;
    }
}

// ==================== INIZIALIZZAZIONE GLOBALE ====================

// Crea istanza globale quando il DOM è pronto
document.addEventListener('DOMContentLoaded', async function() {
    try {
        window.ChatAI = await ChatAI.getInstance();
        console.log('✅ Chat AI globale inizializzata');
    } catch (error) {
        console.error('❌ Errore inizializzazione Chat AI globale:', error);
    }
});

// Export per moduli
export default ChatAI;
