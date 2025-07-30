// auth-guard-agibilita.js - Sistema protezione pagine MODULO AGIBILITÀ
// Import DatabaseService agibilità
import { DatabaseService } from './supabase-config-agibilita.js';

export class AuthGuard {
  
  /**
   * Richiede autenticazione per accedere al modulo agibilità
   */
  static async requireAuth() {
    try {
      console.log('🎭 Verifica autenticazione modulo agibilità...');

      // Inizializza DatabaseService agibilità
      await DatabaseService.init();
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) {
        console.error('❌ Client Supabase agibilità non configurato');
        throw new Error('Sistema agibilità non configurato');
      }

      // Verifica sessione Supabase
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('❌ Errore verifica sessione agibilità:', error);
        throw error;
      }

      if (!session || !session.user) {
        console.log('❌ Utente non autenticato per modulo agibilità');
        this.redirectToLogin();
        throw new Error('Autenticazione richiesta per agibilità');
      }

      // Verifica scadenza sessione
      if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
        console.log('❌ Sessione scaduta per modulo agibilità');
        await this.logout();
        throw new Error('Sessione scaduta');
      }

      console.log('✅ Utente autenticato per agibilità:', session.user.email);
      
      // Salva dati sessione localmente per agibilità
      this.saveAgibilitaSessionData(session);
      
      // Setup monitoraggio sessione
      this.setupAgibilitaSessionMonitoring(session);
      
      return session;
    } catch (error) {
      this.redirectToLogin();
      throw error;
    }
  }

  /**
   * Salva dati sessione specifici per agibilità
   */
  static saveAgibilitaSessionData(session) {
    try {
      const sessionData = {
        user_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        login_time: new Date().toISOString(),
        expires_at: session.expires_at,
        access_token: session.access_token,
        module: 'agibilita',
        permissions: this.extractAgibilitaPermissions(session.user)
      };
      
      localStorage.setItem('recorp_agibilita_session', JSON.stringify(sessionData));
      console.log('💾 Sessione agibilità salvata localmente');
    } catch (error) {
      console.warn('⚠️ Impossibile salvare sessione agibilità localmente:', error);
    }
  }

  /**
   * Estrae permessi specifici agibilità dall'utente
   */
  static extractAgibilitaPermissions(user) {
    // Default permissions per agibilità
    const defaultPermissions = {
      can_create_agibilita: true,
      can_edit_agibilita: true,
      can_delete_agibilita: false,
      can_manage_artists: true,
      can_manage_venues: false,
      can_approve_agibilita: false,
      can_export_xml: true,
      can_view_statistics: true
    };

    // Estrai permessi da user metadata se presenti
    const userPermissions = user.user_metadata?.permissions?.agibilita || {};
    
    return {
      ...defaultPermissions,
      ...userPermissions
    };
  }

  /**
   * Reindirizza alla pagina di login dal modulo agibilità
   */
  static redirectToLogin() {
    try {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;
      
      // Costruisci URL di redirect completo
      const fullCurrentUrl = currentPath + currentSearch + currentHash;
      
      // Per il modulo agibilità, usa sempre path relativo
      let loginPath = '../login.html';
      
      // Aggiungi parametro redirect specifico per agibilità
      if (!currentPath.includes('login.html')) {
        const redirectParam = encodeURIComponent(fullCurrentUrl);
        loginPath += `?redirect=${redirectParam}&module=agibilita`;
      }
      
      console.log('🔄 Redirect agibilità a login:', loginPath);
      console.log('📍 Current agibilità path:', currentPath);
      console.log('🔗 Redirect URL:', fullCurrentUrl);
      
      window.location.href = loginPath;
      
    } catch (error) {
      console.error('❌ Errore costruzione redirect agibilità:', error);
      
      // Fallback sicuro per agibilità
      window.location.href = '../login.html?module=agibilita';
    }
  }

  /**
   * Effettua logout dal modulo agibilità
   */
  static async logout() {
    try {
      console.log('🚪 Logout modulo agibilità in corso...');
      
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
          console.error('❌ Errore logout Supabase agibilità:', error);
        } else {
          console.log('✅ Logout Supabase agibilità completato');
        }
      }
      
      // Rimuovi dati locali agibilità
      localStorage.removeItem('recorp_agibilita_session');
      
      // Cleanup cache agibilità
      if (DatabaseService.clearCache) {
        DatabaseService.clearCache();
        console.log('🧹 Cache agibilità pulita');
      }
      
      // Reindirizza al login
      window.location.href = '../login.html?module=agibilita&action=logout';
      
    } catch (error) {
      console.error('❌ Errore critico logout agibilità:', error);
      
      // Forza cleanup anche in caso di errore
      localStorage.removeItem('recorp_agibilita_session');
      
      // Fallback logout redirect
      window.location.href = '../login.html?module=agibilita&error=logout_error';
    }
  }

  /**
   * Controlla se l'utente è autenticato per agibilità
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
      console.error('❌ Errore verifica autenticazione agibilità:', error);
      return false;
    }
  }

  /**
   * Ottiene l'utente corrente per agibilità
   */
  static async getCurrentUser() {
    try {
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) return null;

      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error || !user) {
        // Fallback su localStorage agibilità
        const sessionData = localStorage.getItem('recorp_agibilita_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          return {
            id: session.user_id,
            email: session.email,
            name: session.name,
            permissions: session.permissions,
            isFallback: true,
            module: 'agibilita'
          };
        }
        return null;
      }

      // Aggiungi informazioni specifiche agibilità
      return {
        ...user,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        permissions: this.extractAgibilitaPermissions(user),
        module: 'agibilita'
      };
    } catch (error) {
      console.error('❌ Errore recupero utente agibilità:', error);
      return null;
    }
  }

  /**
   * Verifica permesso specifico agibilità
   */
  static async hasPermission(permission) {
    const user = await this.getCurrentUser();
    if (!user || !user.permissions) return false;
    
    return user.permissions[permission] === true;
  }

  /**
   * Setup monitoraggio sessione specifico agibilità
   */
  static setupAgibilitaSessionMonitoring(session) {
    if (!session.expires_at) return;

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;

    // Monitoraggio più frequente per agibilità (modulo critico)
    if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
      console.log('⚠️ Sessione agibilità in scadenza tra 5 minuti, tentativo rinnovo...');
      this.renewAgibilitaSession();
    } else if (timeUntilExpiry <= 0) {
      console.log('❌ Sessione agibilità scaduta');
      this.showAgibilitaSessionExpiredWarning();
    } else {
      // Setup timer per prossimo controllo (ogni 2 minuti per agibilità)
      const checkTime = Math.min(timeUntilExpiry - 5 * 60 * 1000, 2 * 60 * 1000);
      setTimeout(() => {
        this.setupAgibilitaSessionMonitoring(session);
      }, Math.max(checkTime, 30000)); // Minimo 30 secondi
    }
  }

  /**
   * Rinnova la sessione agibilità
   */
  static async renewAgibilitaSession() {
    try {
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) return false;

      const { data, error } = await supabaseClient.auth.refreshSession();
      
      if (error) {
        console.error('❌ Errore rinnovo sessione agibilità:', error);
        this.showAgibilitaSessionExpiredWarning();
        return false;
      }

      if (data.session) {
        console.log('✅ Sessione agibilità rinnovata');
        this.saveAgibilitaSessionData(data.session);
        this.setupAgibilitaSessionMonitoring(data.session);
        
        // Mostra notifica rinnovo
        this.showAgibilitaSessionRenewedNotification();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Errore critico rinnovo sessione agibilità:', error);
      this.showAgibilitaSessionExpiredWarning();
      return false;
    }
  }

  /**
   * Mostra notifica sessione rinnovata
   */
  static showAgibilitaSessionRenewedNotification() {
    // Usa toast system se disponibile
    if (window.toastSystem) {
      window.toastSystem.show('Sessione agibilità rinnovata automaticamente', 'success', 3000);
      return;
    }

    // Fallback notifica visuale
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 9999;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      animation: slideInRight 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>🎭</span>
        <span>Sessione agibilità rinnovata</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Mostra avviso sessione scaduta specifico agibilità
   */
  static showAgibilitaSessionExpiredWarning() {
    // Rimuovi eventuali modal esistenti
    const existingModal = document.getElementById('agibilita-session-expired-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'agibilita-session-expired-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 450px;
        text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <div style="font-size: 4rem; margin-bottom: 20px;">🎭⏰</div>
        <h2 style="margin-bottom: 16px; color: #1e293b; font-size: 24px;">
          Sessione Agibilità Scaduta
        </h2>
        <p style="margin-bottom: 24px; color: #64748b; line-height: 1.6; font-size: 16px;">
          La tua sessione per il modulo agibilità è scaduta per motivi di sicurezza.<br>
          <strong>Eventuali bozze non salvate potrebbero essere perse.</strong>
        </p>
        <div style="background: #fef3c7; color: #92400e; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 14px;">
          💡 <strong>Suggerimento:</strong> Salva frequentemente le tue bozze per evitare perdite di dati
        </div>
        <button onclick="AuthGuard.logout()" style="
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          font-size: 16px;
          transition: all 0.2s ease;
        ">
          Torna al Login Agibilità
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-logout dopo 15 secondi (più tempo per agibilità)
    setTimeout(() => {
      this.logout();
    }, 15000);
  }

  /**
   * Crea header con info utente specifico agibilità
   */
  static async createAgibilitaUserHeader() {
    const user = await this.getCurrentUser();
    
    if (!user) return null;

    const header = document.createElement('div');
    header.id = 'agibilita-user-header';
    header.style.cssText = `
      background: linear-gradient(135deg, #f8fafc, #e2e8f0);
      border-bottom: 1px solid #cbd5e1;
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    const permissionsCount = Object.values(user.permissions || {}).filter(Boolean).length;
    
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🎭</span>
          <span style="color: #64748b; font-weight: 500;">AGIBILITÀ</span>
        </div>
        <div style="height: 20px; width: 1px; background: #cbd5e1;"></div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #10b981; font-size: 12px;">●</span>
          <span style="color: #64748b;">Connesso come</span>
          <strong style="color: #1e293b;">${user.name || user.email}</strong>
          ${user.isFallback ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">CACHE</span>' : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #64748b; font-size: 0.8rem;">Permessi: ${permissionsCount}</span>
          <div style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500;">
            v1.0
          </div>
        </div>
      </div>
      <button onclick="AuthGuard.logout()" style="
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
      ">
        🚪 Logout Sicuro
      </button>
    `;

    // Aggiungi hover effect al logout button
    const logoutBtn = header.querySelector('button');
    logoutBtn.addEventListener('mouseover', () => {
      logoutBtn.style.transform = 'translateY(-1px)';
      logoutBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
    });
    logoutBtn.addEventListener('mouseout', () => {
      logoutBtn.style.transform = 'translateY(0)';
      logoutBtn.style.boxShadow = 'none';
    });

    return header;
  }

  /**
   * Inizializzazione protezione pagina agibilità
   */
  static async initAgibilitaPageProtection() {
    try {
      console.log('🛡️ Inizializzazione protezione pagina agibilità...');
      
      // Richiedi autenticazione
      const session = await this.requireAuth();
      
      // Aggiungi header utente agibilità
      const header = await this.createAgibilitaUserHeader();
      if (header) {
        document.body.insertBefore(header, document.body.firstChild);
        
        // Aggiungi padding-top al body per compensare header fisso
        document.body.style.paddingTop = '60px';
      }
      
      // Setup listener per cambiamenti auth
      this.setupAgibilitaAuthStateListener();
      
      // Verifica permessi specifici se necessario
      const user = await this.getCurrentUser();
      if (user && user.permissions) {
        console.log('🔐 Permessi agibilità caricati:', user.permissions);
      }
      
      console.log('🛡️ Protezione pagina agibilità attivata');
      
      return session;
      
    } catch (error) {
      console.error('❌ Errore protezione pagina agibilità:', error);
      throw error;
    }
  }

  /**
   * Setup listener per eventi auth specifici agibilità
   */
  static setupAgibilitaAuthStateListener() {
    try {
      const supabaseClient = DatabaseService.getSupabaseClient();
      
      if (!supabaseClient) return;

      supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state change agibilità:', event);
        
        switch (event) {
          case 'SIGNED_OUT':
            console.log('👋 Utente disconnesso da agibilità');
            localStorage.removeItem('recorp_agibilita_session');
            if (DatabaseService.clearCache) {
              DatabaseService.clearCache();
            }
            if (!window.location.pathname.includes('login.html')) {
              this.redirectToLogin();
            }
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token agibilità rinnovato');
            if (session) {
              this.saveAgibilitaSessionData(session);
            }
            break;
            
          case 'SIGNED_IN':
            console.log('👤 Utente connesso ad agibilità:', session?.user?.email);
            if (session) {
              this.saveAgibilitaSessionData(session);
            }
            break;
        }
      });
    } catch (error) {
      console.error('❌ Errore setup auth listener agibilità:', error);
    }
  }

  /**
   * Cleanup completo agibilità
   */
  static cleanup() {
    // Rimuovi header se presente
    const header = document.getElementById('agibilita-user-header');
    if (header) header.remove();
    
    // Rimuovi padding-top dal body
    document.body.style.paddingTop = '';
    
    // Cleanup localStorage
    localStorage.removeItem('recorp_agibilita_session');
    
    // Cleanup cache database
    if (DatabaseService.clearCache) {
      DatabaseService.clearCache();
    }
    
    console.log('🧹 AuthGuard agibilità cleanup completato');
  }

  /**
   * Debug auth guard agibilità
   */
  static async debug() {
    const user = await this.getCurrentUser();
    const isAuth = await this.isAuthenticated();
    
    return {
      module: 'agibilita',
      authenticated: isAuth,
      user: user,
      permissions: user?.permissions || null,
      session_storage: !!localStorage.getItem('recorp_agibilita_session'),
      database_ready: DatabaseService.isReady(),
      cache_size: DatabaseService.debug?.().cache_size || 0
    };
  }
}

// Esporta per uso globale
window.AuthGuard = AuthGuard;

// CSS Styles per componenti agibilità
const AgibilitaAuthStyles = `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

#agibilita-user-header button:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
}

#agibilita-session-expired-modal button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(37, 99, 235, 0.3);
}

/* Stili per permessi agibilità */
.agibilita-permission-badge {
  background: #e0f2fe;
  color: #0277bd;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-block;
  margin: 2px;
}

.agibilita-permission-badge.granted {
  background: #e8f5e8;
  color: #2e7d32;
}

.agibilita-permission-badge.denied {
  background: #ffebee;
  color: #c62828;
}

/* Loading states per agibilità */
.agibilita-auth-loading {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

// Inietta CSS se non presente
if (!document.getElementById('agibilita-auth-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'agibilita-auth-styles';
    styleSheet.textContent = AgibilitaAuthStyles;
    document.head.appendChild(styleSheet);
}

console.log('🛡️ AuthGuard agibilità caricato e pronto con protezione avanzata');