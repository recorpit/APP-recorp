// auth-guard.js - Sistema protezione pagine con Supabase Auth
import { DatabaseService } from './supabase-config.js';

export class AuthGuard {
  
  /**
   * Richiede autenticazione per accedere alla pagina
   */
  static async requireAuth() {
    try {
      console.log('🔍 Verifica autenticazione Supabase...');

      // CORREZIONE: Assicurati che DatabaseService sia inizializzato
      await DatabaseService.init();
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) {
        console.error('❌ Client Supabase non configurato');
        throw new Error('Sistema non configurato');
      }

      // Verifica sessione Supabase
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('❌ Errore verifica sessione:', error);
        throw error;
      }

      if (!session || !session.user) {
        console.log('❌ Utente non autenticato');
        this.redirectToLogin();
        throw new Error('Autenticazione richiesta');
      }

      // Verifica che la sessione non sia scaduta
      if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
        console.log('❌ Sessione scaduta');
        await this.logout();
        throw new Error('Sessione scaduta');
      }

      console.log('✅ Utente autenticato:', session.user.email);
      
      // Salva dati sessione localmente
      this.saveSessionData(session);
      
      // Setup monitoraggio sessione
      this.setupSessionMonitoring(session);
      
      return session;
    } catch (error) {
      this.redirectToLogin();
      throw error;
    }
  }

  /**
   * Salva dati sessione in localStorage come backup
   */
  static saveSessionData(session) {
    try {
      const sessionData = {
        user_id: session.user.id,
        email: session.user.email,
        login_time: new Date().toISOString(),
        expires_at: session.expires_at,
        access_token: session.access_token
      };
      
      localStorage.setItem('recorp_user_session', JSON.stringify(sessionData));
    } catch (error) {
      console.warn('⚠️ Impossibile salvare sessione localmente:', error);
    }
  }

  /**
   * Reindirizza alla pagina di login - VERSIONE CORRETTA PER GITHUB PAGES
   */
  static redirectToLogin() {
    try {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;
      
      // ✅ SEMPLICE: Costruisci redirect relativo
      let redirectUrl = '';
      if (currentPath.includes('/pagamenti/')) {
        redirectUrl = 'pagamenti/pagamenti.html' + currentSearch + currentHash;
      } else if (currentPath.includes('/agibilita/')) {
        redirectUrl = 'agibilita/agibilita.html' + currentSearch + currentHash;
      } else {
        const fileName = currentPath.split('/').pop() || 'index.html';
        redirectUrl = fileName + currentSearch + currentHash;
      }
      
      // ✅ SOLUZIONE ROBUSTA: Costruisci path login partendo da origin
      const currentUrl = window.location.href;
      let loginUrl;
      
      if (currentPath.includes('/pagamenti/')) {
        // Da https://recorpit.github.io/APP-recorp/pagamenti/pagamenti.html
        // a   https://recorpit.github.io/APP-recorp/login.html
        loginUrl = currentUrl.replace('/pagamenti/pagamenti.html', '/login.html');
      } else if (currentPath.includes('/agibilita/')) {
        // Da https://recorpit.github.io/APP-recorp/agibilita/agibilita.html  
        // a   https://recorpit.github.io/APP-recorp/login.html
        loginUrl = currentUrl.replace('/agibilita/agibilita.html', '/login.html');
      } else {
        // Da root
        const basePath = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
        loginUrl = basePath + 'login.html';
      }
      
      // Rimuovi query params e hash dall'URL login
      loginUrl = loginUrl.split('?')[0].split('#')[0];
      
      // ✅ Aggiungi parametro redirect se non siamo già nel login
      if (!currentPath.includes('login.html')) {
        const redirectParam = encodeURIComponent(redirectUrl);
        loginUrl += `?redirect=${redirectParam}`;
      }
      
      console.log('🔄 Redirect a login:', loginUrl);
      console.log('📍 Current URL:', currentUrl);
      console.log('🔗 Redirect param:', redirectUrl);
      
      window.location.href = loginUrl;
      
    } catch (error) {
      console.error('❌ Errore costruzione redirect:', error);
      
      // ✅ FALLBACK SICURO: Costruisci URL assoluto
      const parts = window.location.pathname.split('/');
      parts.pop(); // Rimuovi il file corrente
      if (parts[parts.length - 1] === 'pagamenti' || parts[parts.length - 1] === 'agibilita') {
        parts.pop(); // Rimuovi la cartella se siamo in una sottocartella
      }
      const basePath = window.location.origin + parts.join('/');
      window.location.href = basePath + '/login.html';
    }
  }

  /**
   * Effettua logout completo
   */
  static async logout() {
    try {
      console.log('🚪 Logout Supabase in corso...');
      
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
          console.error('❌ Errore logout Supabase:', error);
        } else {
          console.log('✅ Logout Supabase completato');
        }
      }
      
      // Rimuovi dati locali
      localStorage.removeItem('recorp_user_session');
      
      // ✅ CORRETTO: Reindirizza al login con path corretto
      if (window.location.pathname.includes('/pagamenti/') || 
          window.location.pathname.includes('/agibilita/')) {
        window.location.href = '../login.html';
      } else {
        window.location.href = './login.html';
      }
      
    } catch (error) {
      console.error('❌ Errore critico logout:', error);
      // Forza cleanup anche in caso di errore
      localStorage.removeItem('recorp_user_session');
      
      // ✅ CORRETTO: Fallback logout redirect al login
      if (window.location.pathname.includes('/pagamenti/') || 
          window.location.pathname.includes('/agibilita/')) {
        window.location.href = '../login.html';
      } else {
        window.location.href = './login.html';
      }
    }
  }

  /**
   * Controlla se l'utente è autenticato
   */
  static async isAuthenticated() {
    try {
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) return false;

      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error || !session) return false;

      // Verifica scadenza
      if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Errore verifica autenticazione:', error);
      return false;
    }
  }

  /**
   * Gestisce il redirect dopo login basato su parametro URL
   */
  static handlePostLoginRedirect() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');
      
      if (redirectParam) {
        console.log('🔄 Redirect post-login a:', redirectParam);
        
        // Decodifica il parametro redirect
        const decodedRedirect = decodeURIComponent(redirectParam);
        
        // ✅ CORRETTO: Gestisci redirect relativo
        if (decodedRedirect.startsWith('pagamenti/')) {
          window.location.href = `./${decodedRedirect}`;
        } else if (decodedRedirect.startsWith('agibilita/')) {
          window.location.href = `./${decodedRedirect}`;
        } else if (decodedRedirect.includes('.html')) {
          // File nella root
          window.location.href = `./${decodedRedirect}`;
        } else {
          // Fallback alla dashboard
          window.location.href = './index.html';
        }
      } else {
        // Nessun redirect, va alla dashboard
        window.location.href = './index.html';
      }
    } catch (error) {
      console.error('❌ Errore gestione redirect post-login:', error);
      // Fallback sicuro
      window.location.href = './index.html';
    }
  }

  /**
   * Ottiene l'utente corrente
   */
  static async getCurrentUser() {
    try {
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) return null;

      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error || !user) {
        // Fallback su localStorage
        const sessionData = localStorage.getItem('recorp_user_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          return {
            id: session.user_id,
            email: session.email,
            isFallback: true
          };
        }
        return null;
      }

      return user;
    } catch (error) {
      console.error('❌ Errore recupero utente:', error);
      return null;
    }
  }

  /**
   * Setup monitoraggio sessione
   */
  static setupSessionMonitoring(session) {
    if (!session.expires_at) return;

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;

    // Se scade tra meno di 10 minuti, tenta rinnovo
    if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
      console.log('⚠️ Sessione in scadenza, tentativo rinnovo...');
      this.renewSession();
    } else if (timeUntilExpiry <= 0) {
      // Sessione già scaduta
      console.log('❌ Sessione scaduta');
      this.showSessionExpiredWarning();
    } else {
      // Setup timer per prossimo controllo
      const checkTime = Math.min(timeUntilExpiry - 10 * 60 * 1000, 5 * 60 * 1000);
      setTimeout(() => {
        this.setupSessionMonitoring(session);
      }, Math.max(checkTime, 60000));
    }
  }

  /**
   * Rinnova la sessione Supabase
   */
  static async renewSession() {
    try {
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) return false;

      const { data, error } = await supabaseClient.auth.refreshSession();
      
      if (error) {
        console.error('❌ Errore rinnovo sessione:', error);
        this.showSessionExpiredWarning();
        return false;
      }

      if (data.session) {
        console.log('✅ Sessione rinnovata');
        this.saveSessionData(data.session);
        this.setupSessionMonitoring(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Errore critico rinnovo sessione:', error);
      this.showSessionExpiredWarning();
      return false;
    }
  }

  /**
   * Mostra avviso sessione scaduta
   */
  static showSessionExpiredWarning() {
    // Rimuovi eventuali modal esistenti
    const existingModal = document.getElementById('session-expired-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'session-expired-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      ">
        <div style="font-size: 3rem; margin-bottom: 16px;">⏰</div>
        <h2 style="margin-bottom: 16px; color: #1e293b;">Sessione Scaduta</h2>
        <p style="margin-bottom: 24px; color: #64748b; line-height: 1.5;">
          La tua sessione è scaduta per motivi di sicurezza. 
          Effettua nuovamente il login per continuare.
        </p>
        <button onclick="AuthGuard.logout()" style="
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
        ">
          Vai al Login
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-logout dopo 10 secondi
    setTimeout(() => {
      this.logout();
    }, 10000);
  }

  /**
   * Crea header con info utente
   */
  static async createUserHeader() {
    const user = await this.getCurrentUser();
    
    if (!user) return null;

    const header = document.createElement('div');
    header.style.cssText = `
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.9rem;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1001;
    `;

    // ✅ CORRETTO: Link al login e alla homepage
    const homePath = window.location.pathname.includes('/pagamenti/') || 
                    window.location.pathname.includes('/agibilita/') ? 
                    '../index.html' : './index.html';

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
        <span style="color: #10b981;">●</span>
        <span style="color: #64748b;">Connesso come</span>
        <strong style="color: #1e293b;">${user.email}</strong>
        ${user.isFallback ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">CACHE</span>' : ''}
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <a href="${homePath}" style="
          background: #6366f1;
          color: white;
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          transition: all 0.2s ease;
        ">
          🏠 Dashboard
        </a>
        <button onclick="AuthGuard.logout()" style="
          background: #ef4444;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          Logout
        </button>
      </div>
    `;

    // Aggiungi hover effect ai pulsanti
    const logoutBtn = header.querySelector('button');
    const dashboardBtn = header.querySelector('a');
    
    logoutBtn.addEventListener('mouseover', () => {
      logoutBtn.style.background = '#dc2626';
      logoutBtn.style.transform = 'translateY(-1px)';
    });
    logoutBtn.addEventListener('mouseout', () => {
      logoutBtn.style.background = '#ef4444';
      logoutBtn.style.transform = 'translateY(0)';
    });

    dashboardBtn.addEventListener('mouseover', () => {
      dashboardBtn.style.background = '#4f46e5';
      dashboardBtn.style.transform = 'translateY(-1px)';
    });
    dashboardBtn.addEventListener('mouseout', () => {
      dashboardBtn.style.background = '#6366f1';
      dashboardBtn.style.transform = 'translateY(0)';
    });

    return header;
  }

  /**
   * Inizializza protezione pagina completa
   */
  static async initPageProtection() {
    try {
      // Richiedi autenticazione
      await this.requireAuth();
      
      // Aggiungi header utente
      const header = await this.createUserHeader();
      if (header) {
        document.body.insertBefore(header, document.body.firstChild);
        
        // Aggiungi padding-top al body per compensare header fisso
        document.body.style.paddingTop = '50px';
      }
      
      // Setup listener per cambiamenti auth
      this.setupAuthStateListener();
      
      console.log('🛡️ Protezione pagina Supabase attivata');
      
    } catch (error) {
      console.error('❌ Errore protezione pagina:', error);
      // Il redirect è già gestito in requireAuth()
    }
  }

  /**
   * Setup listener per eventi auth Supabase
   */
  static setupAuthStateListener() {
    try {
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) return;

      supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state change:', event);
        
        switch (event) {
          case 'SIGNED_OUT':
            console.log('👋 Utente disconnesso');
            localStorage.removeItem('recorp_user_session');
            // ✅ CORRETTO: Controlla se non siamo già sulla pagina login
            if (!window.location.pathname.includes('login.html')) {
              this.redirectToLogin();
            }
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token rinnovato');
            if (session) {
              this.saveSessionData(session);
            }
            break;
            
          case 'SIGNED_IN':
            console.log('👤 Utente connesso:', session?.user?.email);
            if (session) {
              this.saveSessionData(session);
            }
            break;
        }
      });
    } catch (error) {
      console.error('❌ Errore setup auth listener:', error);
    }
  }
}

// Esporta per uso globale
window.AuthGuard = AuthGuard;

// ✅ CORRETTO: Auto-inizializza protezione se non sulla pagina login
if (!window.location.pathname.includes('login.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    AuthGuard.initPageProtection();
  });
}

console.log('🛡️ AuthGuard Supabase caricato e pronto');