// notification-service.js - Servizio per l'invio di notifiche Email e SMS

// ==================== CONFIGURAZIONE PROVIDER ====================
const CONFIG = {
    // Email provider configuration (esempio con SendGrid)
    email: {
        provider: 'sendgrid', // Opzioni: 'sendgrid', 'mailgun', 'smtp', 'aws-ses'
        apiKey: 'YOUR_SENDGRID_API_KEY', // Sostituisci con la tua API key
        fromEmail: 'noreply@recorp.it',
        fromName: 'RECORP Agibilità',
        templateId: null, // ID template SendGrid se usi template
        
        // Configurazione SMTP alternativa
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'your-email@gmail.com',
                pass: 'your-app-password'
            }
        }
    },
    
    // SMS provider configuration (esempio con Twilio)
    sms: {
        provider: 'twilio', // Opzioni: 'twilio', 'vonage', 'aws-sns'
        accountSid: 'YOUR_TWILIO_ACCOUNT_SID', // Sostituisci con il tuo Account SID
        authToken: 'YOUR_TWILIO_AUTH_TOKEN', // Sostituisci con il tuo Auth Token
        fromNumber: '+1234567890', // Il tuo numero Twilio
        
        // Configurazione alternativa per altri provider
        vonage: {
            apiKey: 'YOUR_VONAGE_API_KEY',
            apiSecret: 'YOUR_VONAGE_API_SECRET',
            fromNumber: 'RECORP'
        }
    },
    
    // Configurazione generale
    general: {
        enableEmail: true, // Abilita/disabilita invio email
        enableSMS: true, // Abilita/disabilita invio SMS
        testMode: false, // Se true, simula l'invio senza inviare realmente
        logToConsole: true, // Log delle operazioni in console
        saveToDatabase: true // Salva log notifiche nel database
    }
};

// ==================== CLASSE NOTIFICATION SERVICE ====================
class NotificationService {
    constructor() {
        this.config = CONFIG;
        this.queue = [];
        this.processing = false;
    }
    
    // ==================== METODI PUBBLICI ====================
    
    /**
     * Invia email
     * @param {string} to - Indirizzo email destinatario
     * @param {string} subject - Oggetto email
     * @param {string} message - Corpo del messaggio
     * @param {object} options - Opzioni aggiuntive
     */
    async sendEmail(to, subject, message, options = {}) {
        if (!this.config.general.enableEmail) {
            console.log('📧 Email disabilitate nella configurazione');
            return { success: false, error: 'Email disabled' };
        }
        
        if (!this.validateEmail(to)) {
            console.error('❌ Email non valida:', to);
            return { success: false, error: 'Invalid email address' };
        }
        
        if (this.config.general.testMode) {
            console.log('🧪 TEST MODE - Email simulata:', { to, subject, message });
            return { success: true, testMode: true };
        }
        
        try {
            let result;
            
            switch (this.config.email.provider) {
                case 'sendgrid':
                    result = await this.sendEmailViaSendGrid(to, subject, message, options);
                    break;
                case 'mailgun':
                    result = await this.sendEmailViaMailgun(to, subject, message, options);
                    break;
                case 'smtp':
                    result = await this.sendEmailViaSMTP(to, subject, message, options);
                    break;
                case 'aws-ses':
                    result = await this.sendEmailViaAWSSES(to, subject, message, options);
                    break;
                default:
                    throw new Error(`Provider email non supportato: ${this.config.email.provider}`);
            }
            
            if (this.config.general.saveToDatabase) {
                await this.saveNotificationLog('email', to, subject, result);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Errore invio email:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Invia SMS
     * @param {string} to - Numero di telefono destinatario
     * @param {string} message - Messaggio SMS
     * @param {object} options - Opzioni aggiuntive
     */
    async sendSMS(to, message, options = {}) {
        if (!this.config.general.enableSMS) {
            console.log('📱 SMS disabilitati nella configurazione');
            return { success: false, error: 'SMS disabled' };
        }
        
        const cleanNumber = this.cleanPhoneNumber(to);
        if (!this.validatePhoneNumber(cleanNumber)) {
            console.error('❌ Numero di telefono non valido:', to);
            return { success: false, error: 'Invalid phone number' };
        }
        
        if (this.config.general.testMode) {
            console.log('🧪 TEST MODE - SMS simulato:', { to: cleanNumber, message });
            return { success: true, testMode: true };
        }
        
        try {
            let result;
            
            switch (this.config.sms.provider) {
                case 'twilio':
                    result = await this.sendSMSViaTwilio(cleanNumber, message, options);
                    break;
                case 'vonage':
                    result = await this.sendSMSViaVonage(cleanNumber, message, options);
                    break;
                case 'aws-sns':
                    result = await this.sendSMSViaAWSSNS(cleanNumber, message, options);
                    break;
                default:
                    throw new Error(`Provider SMS non supportato: ${this.config.sms.provider}`);
            }
            
            if (this.config.general.saveToDatabase) {
                await this.saveNotificationLog('sms', cleanNumber, message, result);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Errore invio SMS:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Invia notifiche batch
     * @param {Array} notifications - Array di notifiche da inviare
     */
    async sendBatch(notifications) {
        const results = [];
        
        for (const notification of notifications) {
            if (notification.type === 'email') {
                const result = await this.sendEmail(
                    notification.to,
                    notification.subject,
                    notification.message,
                    notification.options
                );
                results.push({ ...notification, result });
            } else if (notification.type === 'sms') {
                const result = await this.sendSMS(
                    notification.to,
                    notification.message,
                    notification.options
                );
                results.push({ ...notification, result });
            }
        }
        
        return results;
    }
    
    // ==================== PROVIDER EMAIL ====================
    
    async sendEmailViaSendGrid(to, subject, message, options) {
        const url = 'https://api.sendgrid.com/v3/mail/send';
        
        const emailData = {
            personalizations: [{
                to: [{ email: to }],
                subject: subject
            }],
            from: {
                email: this.config.email.fromEmail,
                name: this.config.email.fromName
            },
            content: [{
                type: 'text/html',
                value: this.formatEmailHTML(message)
            }]
        };
        
        if (this.config.email.templateId && options.templateData) {
            emailData.template_id = this.config.email.templateId;
            emailData.personalizations[0].dynamic_template_data = options.templateData;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.email.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });
        
        if (response.ok) {
            console.log('✅ Email inviata via SendGrid a:', to);
            return { success: true, provider: 'sendgrid', messageId: response.headers.get('x-message-id') };
        } else {
            const error = await response.text();
            throw new Error(`SendGrid error: ${error}`);
        }
    }
    
    async sendEmailViaMailgun(to, subject, message, options) {
        // Implementazione Mailgun
        console.log('📧 Mailgun implementation needed');
        return { success: false, error: 'Mailgun not implemented' };
    }
    
    async sendEmailViaSMTP(to, subject, message, options) {
        // Implementazione SMTP (richiede un server backend)
        console.log('📧 SMTP implementation needs backend server');
        return { success: false, error: 'SMTP requires backend implementation' };
    }
    
    async sendEmailViaAWSSES(to, subject, message, options) {
        // Implementazione AWS SES
        console.log('📧 AWS SES implementation needed');
        return { success: false, error: 'AWS SES not implemented' };
    }
    
    // ==================== PROVIDER SMS ====================
    
    async sendSMSViaTwilio(to, message, options) {
        const accountSid = this.config.sms.accountSid;
        const authToken = this.config.sms.authToken;
        const fromNumber = this.config.sms.fromNumber;
        
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        
        const params = new URLSearchParams();
        params.append('To', to);
        params.append('From', fromNumber);
        params.append('Body', message);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SMS inviato via Twilio a:', to);
            return { success: true, provider: 'twilio', messageId: data.sid };
        } else {
            const error = await response.text();
            throw new Error(`Twilio error: ${error}`);
        }
    }
    
    async sendSMSViaVonage(to, message, options) {
        // Implementazione Vonage
        console.log('📱 Vonage implementation needed');
        return { success: false, error: 'Vonage not implemented' };
    }
    
    async sendSMSViaAWSSNS(to, message, options) {
        // Implementazione AWS SNS
        console.log('📱 AWS SNS implementation needed');
        return { success: false, error: 'AWS SNS not implemented' };
    }
    
    // ==================== UTILITY METHODS ====================
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    validatePhoneNumber(phone) {
        // Validazione base per numeri internazionali
        const re = /^\+?[1-9]\d{1,14}$/;
        return re.test(phone);
    }
    
    cleanPhoneNumber(phone) {
        // Rimuovi spazi, trattini e caratteri non numerici
        let cleaned = phone.replace(/[\s\-\(\)]/g, '');
        
        // Se non inizia con +, aggiungi prefisso italiano
        if (!cleaned.startsWith('+')) {
            if (cleaned.startsWith('39')) {
                cleaned = '+' + cleaned;
            } else {
                cleaned = '+39' + cleaned;
            }
        }
        
        return cleaned;
    }
    
    formatEmailHTML(message) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f8f9fa; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>RECORP - Sistema Agibilità</h2>
                    </div>
                    <div class="content">
                        <p>${message}</p>
                    </div>
                    <div class="footer">
                        <p>Questa è una comunicazione automatica dal sistema di gestione agibilità RECORP.</p>
                        <p>Non rispondere a questa email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    async saveNotificationLog(type, to, content, result) {
        if (this.config.general.logToConsole) {
            console.log('📝 Log notifica:', {
                type,
                to,
                content: content.substring(0, 100) + '...',
                result,
                timestamp: new Date().toISOString()
            });
        }
        
        // Qui puoi implementare il salvataggio su database
        // await DatabaseService.saveNotificationLog({ type, to, content, result });
    }
}

// ==================== EXPORT ====================
export const notificationService = new NotificationService();
export { NotificationService };
