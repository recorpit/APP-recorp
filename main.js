// main.js - Script principale RECORP ALL-IN-ONE

// Funzioni di NAVIGAZIONE tra le sezioni
function startNewAgibilita() {
    window.location.href = "./agibilita/index.html";
}
function goArtisti() {
    window.location.href = "./registrazione-artista.html";
}
function goComunicazioniIntermittenti() {
    window.location.href = "./comunicazioni-intermittenti.html";
}

// Esporta le funzioni per l'onclick HTML
window.startNewAgibilita = startNewAgibilita;
window.goArtisti = goArtisti;
window.goComunicazioniIntermittenti = goComunicazioniIntermittenti;

// Puoi aggiungere qui sotto altre funzioni globali, notifiche, loader, ecc.
// Esempio:
// window.showGlobalSuccess = function(msg) { ... }
