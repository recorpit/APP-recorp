// auth-guard.js - Sistema protezione pagine per RECORP
import { supabase } from './supabase-config.js';

export class AuthGuard {
  
  /**
   * Richiede autenticazione per accedere alla pagina
   * Se l'utente non è autenticato, reindirizza al login
   */
  static async requireAuth() {
    try {
      console.log('🔍 Verifica autenticazione...');

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Errore verifica sessione:', error);
        throw error;
      }

      if (!session || !session.user) {
        console.log('❌ Utente non autenticato, redirect a login');
        this.redirectToLogin();
        throw new Error('Autenticazione richiesta');
      }

      console.log('✅ Utente autenticato:', session.user.email);
      
      // Setup logout automatico su scadenza sessione
      this.setupSessionMonitoring(session);
      
      return session;
    } catch (error) {
      this.redirectToLogin();
      throw error;
    }
  }

  /**
   * Reindirizza alla pagina di login salvando l'URL corrente
   */
  static redirectToLogin() {
    // Salva URL corrente per redirect post-login
    const currentUrl = window.location.href;
    const loginUrl = new URL('/login.html', window.location.origin);
    loginUrl.searchParams.set('redirect', currentUrl);
    
    console.log('🔄 Redirect a login:', loginUrl.href);
    window.location.href = loginUrl.href;
  }

  /**
   * Effettua logout e reindirizza al login
   */
  static async logout() {
    try {
      console.log('🚪 Logout in corso...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Errore logout:', error);
      } else {
        console.log('✅ Logout completato');
      }
      
      // Reindirizza sempre al login dopo logout
      window.location.href = '/login.html';
      
    } catch (error) {
      console.error('❌ Errore critico logout:', error);
      // Forza redirect anche in caso di errore
      window.location.href = '/login.html';
    }
  }

  /**
   * Controlla se l'utente è autenticato (senza redirect)
   */
  static async isAuthenticated() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return !error && session && session.user;
    } catch (error) {
      console.error('❌ Errore verifica autenticazione:', error);
      return false;
    }
  }

  /**
   * Ottiene l'utente corrente
   */
  static async getCurrentUser() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return !error && session ? session.user : null;
    } catch (error) {
      console.error('❌ Errore recupero utente:', error);
      return null;
    }
  }

  /**
   * Setup monitoraggio sessione per logout automatico
   */
  static setupSessionMonitoring(session) {
    if (!session || !session.expires_at) return;

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;

    // Se scade tra meno di 5 minuti, rinnova la sessione
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('⚠️ Sessione in scadenza, tentativo rinnovo...');
      this.renewSession();
    } else {
      // Setup timer per controllare scadenza
      const checkTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60000); // Max 1 minuto
      setTimeout(() => {
        this.setupSessionMonitoring(session);
      }, checkTime);
    }
  }

  /**
   * Rinnova la sessione corrente
   */
  static async renewSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Errore rinnovo sessione:', error);
        this.showSessionExpiredWarning();
        return false;
      }

      console.log('✅ Sessione rinnovata');
      return true;
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
    // Crea modal di avviso
    const modal = document.createElement('div');
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
   * Inizializza listener per eventi auth globali
   */
  static initGlobalAuthListeners() {
    // Listener per cambiamenti stato auth
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', event);
      
      switch (event) {
        case 'SIGNED_OUT':
          console.log('👋 Utente disconnesso');
          // Non fare nulla se già sulla pagina login
          if (!window.location.pathname.includes('login.html')) {
            window.location.href = '/login.html';
          }
          break;
          
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token rinnovato');
          break;
          
        case 'SIGNED_IN':
          console.log('👤 Utente connesso:', session?.user?.email);
          break;
      }
    });

    // Listener per chiusura finestra (cleanup)
    window.addEventListener('beforeunload', () => {
      console.log('👋 Chiusura applicazione');
    });
  }
}

// Esporta per uso globale
window.AuthGuard = AuthGuard;

// Inizializza listener globali se non sulla pagina login
if (!window.location.pathname.includes('login.html')) {
  AuthGuard.initGlobalAuthListeners();
}

console.log('🛡️ AuthGuard caricato e pronto');