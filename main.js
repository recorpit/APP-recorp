// main.js - Script principale RECORP ALL-IN-ONE

// =============== NAVIGAZIONE CARD e GLOBAL FUNCTIONS ===============

// Azioni delle card della dashboard (home)
function startNewAgibilita() {
    window.location.href = "./agibilita/index.html";
}
function goArtisti() {
    window.location.href = "./registrazione-artista.html";
}
function goComunicazioniIntermittenti() {
    window.location.href = "./comunicazioni-intermittenti.html";
}

// Rendi globali le funzioni per l'onclick HTML
window.startNewAgibilita = startNewAgibilita;
window.goArtisti = goArtisti;
window.goComunicazioniIntermittenti = goComunicazioniIntermittenti;

// =============== NAVBAR ACTIVE LINK ===============
document.addEventListener("DOMContentLoaded", function() {
    // Evidenzia il link attivo nella navbar
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === window.location.pathname.split('/').pop()) {
            link.classList.add('active');
        }
    });
});

// =============== NOTIFICHE GLOBALI ===============
window.showGlobalSuccess = function(msg) {
    let el = document.getElementById('globalSuccess');
    if (!el) {
        el = document.createElement('div');
        el.id = 'globalSuccess';
        el.className = 'alert alert-success global-alert';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
};
window.showGlobalError = function(msg) {
    let el = document.getElementById('globalError');
    if (!el) {
        el = document.createElement('div');
        el.id = 'globalError';
        el.className = 'alert alert-danger global-alert';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
};

// =============== LOADER GLOBALE (opzionale) ===============
window.showGlobalLoader = function(msg="Caricamento...") {
    let el = document.getElementById('globalLoader');
    if (!el) {
        el = document.createElement('div');
        el.id = 'globalLoader';
        el.className = 'global-loader';
        el.innerHTML = `<div class="loader-spinner"></div><span class="loader-msg">${msg}</span>`;
        document.body.appendChild(el);
    }
    el.querySelector('.loader-msg').textContent = msg;
    el.style.display = 'flex';
};
window.hideGlobalLoader = function() {
    let el = document.getElementById('globalLoader');
    if (el) el.style.display = 'none';
};
