/**
 * registrazione-artista.js - VERSIONE SUPABASE CON MODIFICA
 * 
 * Script per la gestione della registrazione e modifica artisti nel sistema RECORP ALL-IN-ONE.
 * 
 * @author RECORP ALL-IN-ONE
 * @version 3.1 - Con fix autocompilazione CF
 */

// Import Supabase DatabaseService
import { DatabaseService } from './supabase-config.js';

// Variabili globali
let currentMode = null; // 'new' o 'edit'
let currentArtistId = null; // ID dell'artista in modifica
let allArtists = []; // Cache degli artisti

// Inizializzazione sistema registrazione artista
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inizializzazione sistema gestione artisti...');
    
    // Mostra indicatore caricamento
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = '⌛ Inizializzazione sistema e database...';
    }
    
    // Aspetta che il database GI sia caricato
    let attempts = 0;
    const maxAttempts = 20; // 10 secondi max
    
    while (!window.GIDatabase?.isLoaded() && attempts < maxAttempts) {
        console.log(`⏳ Attesa caricamento database GI... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    if (window.GIDatabase?.isLoaded()) {
        console.log('✅ Database GI caricato con successo');
        debugDatabaseStatus(); // Mostra lo stato per debug
    } else {
        console.error('❌ Timeout caricamento database GI');
    }
    
    // Inizializza sistema con Supabase
    const systemReady = await initializeRegistrationSystem();
    
    if (!systemReady) {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = '❌ Errore connessione database';
            loadingIndicator.style.backgroundColor = '#fee2e2';
            loadingIndicator.style.color = '#991b1b';
        }
        return;
    }
    
    // Ora che tutto è caricato, inizializza i componenti
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    loadProvinces();
    setupEventListeners();
});

// Funzione di debug per verificare lo stato del database
function debugDatabaseStatus() {
    console.log('🔍 Debug Database Status:');
    console.log('- window.GIDatabase exists:', !!window.GIDatabase);
    console.log('- isLoaded:', window.GIDatabase?.isLoaded());
    console.log('- comuniValidita loaded:', !!window.GIDatabase?.data?.comuniValidita);
    console.log('- comuni loaded:', !!window.GIDatabase?.data?.comuni);
    
    if (window.GIDatabase) {
        window.GIDatabase.showStatus();
    }
}

// Inizializzazione con Supabase
async function initializeRegistrationSystem() {
    try {
        console.log('🔗 Test connessione database...');
        
        // Test connessione e carica artisti
        allArtists = await DatabaseService.getAllArtisti();
        console.log('✅ Sistema gestione artisti pronto! Database contiene:', allArtists.length, 'artisti');
        
        return true;
    } catch (error) {
        console.error('❌ Errore inizializzazione sistema:', error);
        showError('Errore di connessione al database. Controlla la configurazione.');
        return false;
    }
}

// ==================== GESTIONE MODALITÀ ====================

function selectMode(mode) {
    currentMode = mode;
    
    const modeSelection = document.getElementById('modeSelection');
    const artistSelection = document.getElementById('artistSelection');
    const registrationForm = document.getElementById('registrationForm');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    if (mode === 'new') {
        // Modalità nuova registrazione
        modeSelection.style.display = 'none';
        artistSelection.style.display = 'none';
        registrationForm.style.display = 'block';
        
        pageTitle.textContent = 'Registrazione Nuovo Artista';
        pageSubtitle.textContent = 'Inserisci i dati dell\'artista per aggiungerlo al database';
        
        document.getElementById('submitText').textContent = 'Registra Artista';
        
        // Reset form
        resetForm();
        currentArtistId = null;
        
        // Focus sul codice fiscale
        setTimeout(() => {
            const cfField = document.getElementById('codiceFiscale');
            if (cfField) cfField.focus();
        }, 100);
        
    } else if (mode === 'edit') {
        // Modalità modifica esistente
        modeSelection.style.display = 'none';
        artistSelection.style.display = 'block';
        registrationForm.style.display = 'none';
        
        pageTitle.textContent = 'Modifica Artista Esistente';
        pageSubtitle.textContent = 'Seleziona l\'artista da modificare';
        
        // Carica lista artisti
        displayArtistsForSelection();
    }
}

function goBackToModeSelection() {
    currentMode = null;
    currentArtistId = null;
    
    const modeSelection = document.getElementById('modeSelection');
    const artistSelection = document.getElementById('artistSelection');
    const registrationForm = document.getElementById('registrationForm');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    modeSelection.style.display = 'block';
    artistSelection.style.display = 'none';
    registrationForm.style.display = 'none';
    
    pageTitle.textContent = 'Gestione Artisti';
    pageSubtitle.textContent = 'Scegli un\'azione da eseguire';
    
    // Reset form
    resetForm();
}

// ==================== GESTIONE SELEZIONE ARTISTI ====================

function displayArtistsForSelection() {
    const container = document.getElementById('artistsListContainer');
    const searchInput = document.getElementById('searchArtistInput');
    
    // Event listener per ricerca
    searchInput.addEventListener('input', filterArtistsForSelection);
    
    // Visualizza tutti gli artisti inizialmente
    renderArtistsList(allArtists);
}

function filterArtistsForSelection() {
    const query = document.getElementById('searchArtistInput').value.toLowerCase();
    
    if (query.length < 2) {
        renderArtistsList(allArtists);
        return;
    }
    
    const filtered = allArtists.filter(artist => {
        const searchText = `${artist.nome} ${artist.cognome} ${artist.codice_fiscale} ${artist.nome_arte || ''}`.toLowerCase();
        return searchText.includes(query);
    });
    
    renderArtistsList(filtered);
}

function renderArtistsList(artists) {
    const container = document.getElementById('artistsListContainer');
    
    if (artists.length === 0) {
        container.innerHTML = '<div class="no-artists"><h3>Nessun artista trovato</h3><p>Prova a modificare i termini di ricerca</p></div>';
        return;
    }
    
    container.innerHTML = artists.map(artist => {
        const displayName = artist.nome_arte || `${artist.nome} ${artist.cognome}`;
        return `
            <div class="artist-item" onclick="selectArtistForEdit(${artist.id})">
                <div class="artist-name">${displayName}</div>
                <div class="artist-details">
                    CF: ${artist.codice_fiscale} | 
                    ${artist.mansione} | 
                    ${artist.citta}, ${artist.provincia}
                    ${artist.tipo_rapporto === 'chiamata' ? ' | ⚡ Contratto a Chiamata' : ''}
                </div>
            </div>
        `;
    }).join('');
}

function selectArtistForEdit(artistId) {
    const artist = allArtists.find(a => a.id === artistId);
    if (!artist) {
        showError('Artista non trovato');
        return;
    }
    
    currentArtistId = artistId;
    
    // Passa alla modalità modifica
    const artistSelection = document.getElementById('artistSelection');
    const registrationForm = document.getElementById('registrationForm');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    artistSelection.style.display = 'none';
    registrationForm.style.display = 'block';
    
    const displayName = artist.nome_arte || `${artist.nome} ${artist.cognome}`;
    pageTitle.textContent = `Modifica: ${displayName}`;
    pageSubtitle.textContent = 'Modifica i dati dell\'artista';
    
    document.getElementById('submitText').textContent = 'Salva Modifiche';
    
    // Compila il form con i dati esistenti
    populateFormWithArtist(artist);
}

function populateFormWithArtist(artist) {
    try {
        // Dati anagrafici
        document.getElementById('codiceFiscale').value = artist.codice_fiscale || '';
        document.getElementById('nome').value = artist.nome || '';
        document.getElementById('cognome').value = artist.cognome || '';
        document.getElementById('nomeArte').value = artist.nome_arte || '';
        document.getElementById('dataNascita').value = artist.data_nascita || '';
        document.getElementById('sesso').value = artist.sesso || '';
        document.getElementById('luogoNascita').value = artist.luogo_nascita || '';
        document.getElementById('provinciaNascita').value = artist.provincia_nascita || '';
        document.getElementById('matricolaENPALS').value = artist.matricola_enpals || '';
        document.getElementById('nazionalita').value = artist.nazionalita || 'IT';
        document.getElementById('telefono').value = artist.telefono || '';
        document.getElementById('email').value = artist.email || '';
        
        // Indirizzo
        document.getElementById('indirizzo').value = artist.indirizzo || '';
        
        // Preseleziona provincia e aspetta il caricamento delle città
        if (artist.provincia) {
            document.getElementById('provincia').value = artist.provincia;
            loadCitta(artist.provincia);
            
            setTimeout(() => {
                if (artist.codice_istat_citta) {
                    document.getElementById('citta').value = artist.codice_istat_citta;
                    loadCAP(artist.codice_istat_citta);
                    
                    setTimeout(() => {
                        if (artist.cap) {
                            document.getElementById('cap').value = artist.cap;
                        }
                    }, 500);
                }
            }, 1000);
        }
        
        // Dati professionali
        document.getElementById('mansione').value = artist.mansione || '';
        document.getElementById('hasPartitaIva').value = artist.has_partita_iva ? 'si' : 'no';
        
        // Gestisci campi condizionali
        if (artist.has_partita_iva) {
            document.getElementById('partitaIva').value = artist.partita_iva || '';
            showPartitaIvaFields();
        } else {
            document.getElementById('tipoRapporto').value = artist.tipo_rapporto || 'occasionale';
            
            // Se ha codice comunicazione, mostralo
            if (artist.codice_comunicazione) {
                document.getElementById('codiceComunicazione').value = artist.codice_comunicazione;
            }
            
            showTipoRapportoFields();
            
            // Se è contratto a chiamata, mostra il campo codice comunicazione
            if (artist.tipo_rapporto === 'chiamata') {
                showCodiceComunicazioneField();
            }
        }
        
        document.getElementById('iban').value = artist.iban || '';
        document.getElementById('note').value = artist.note || '';
        
        console.log('✅ Form popolato con dati artista:', artist.nome, artist.cognome);
        
    } catch (error) {
        console.error('❌ Errore popolamento form:', error);
        showError('Errore nel caricamento dei dati dell\'artista');
    }
}

// ==================== GESTIONE CAMPI CONDIZIONALI ====================

function showPartitaIvaFields() {
    document.getElementById('partitaIvaGroup').style.display = 'block';
    document.getElementById('partitaIva').required = true;
    
    document.getElementById('tipoRapportoGroup').style.display = 'none';
    document.getElementById('tipoRapporto').required = false;
    
    document.getElementById('codiceComunicazioneGroup').style.display = 'none';
    document.getElementById('codiceComunicazione').required = false;
}

function showTipoRapportoFields() {
    document.getElementById('partitaIvaGroup').style.display = 'none';
    document.getElementById('partitaIva').required = false;
    document.getElementById('partitaIva').value = '';
    
    document.getElementById('tipoRapportoGroup').style.display = 'block';
    document.getElementById('tipoRapporto').required = true;
    
    // Controlla se mostrare codice comunicazione
    const tipoRapporto = document.getElementById('tipoRapporto').value;
    if (tipoRapporto === 'chiamata') {
        showCodiceComunicazioneField();
    } else {
        hideCodiceComunicazioneField();
    }
}

function showCodiceComunicazioneField() {
    document.getElementById('codiceComunicazioneGroup').style.display = 'block';
    document.getElementById('codiceComunicazione').required = true;
}

function hideCodiceComunicazioneField() {
    document.getElementById('codiceComunicazioneGroup').style.display = 'none';
    document.getElementById('codiceComunicazione').required = false;
    document.getElementById('codiceComunicazione').value = '';
}

// Cerca comune per codice catastale/Belfiore
function findComuneByCodCatastaleReg(codice) {
    console.log('🔍 Ricerca comune con codice Belfiore:', codice);
    
    // Usa la funzione esistente del comuni-loader
    const comuneInfo = window.GIDatabase.getComuneByCodiceBelfiore(codice);
    
    if (comuneInfo) {
        console.log('✅ Comune trovato:', comuneInfo);
        return comuneInfo;
    }
    
    // Se non trovato, potrebbe essere uno stato estero
    if (codice.startsWith('Z')) {
        console.log('🌍 Codice stato estero rilevato');
        // Lista stati esteri più comuni
        const statiEsteri = {
            'Z100': 'ALBANIA',
            'Z101': 'ANDORRA', 
            'Z102': 'AUSTRIA',
            'Z103': 'BELGIO',
            'Z104': 'BULGARIA',
            'Z107': 'DANIMARCA',
            'Z110': 'FINLANDIA',
            'Z111': 'FRANCIA',
            'Z112': 'GERMANIA',
            'Z113': 'REGNO UNITO',
            'Z114': 'GRECIA',
            'Z115': 'IRLANDA',
            'Z116': 'ISLANDA',
            'Z118': 'LUSSEMBURGO',
            'Z119': 'MALTA',
            'Z120': 'MONACO',
            'Z121': 'NORVEGIA',
            'Z122': 'PAESI BASSI',
            'Z123': 'POLONIA',
            'Z124': 'PORTOGALLO',
            'Z125': 'ROMANIA',
            'Z126': 'SAN MARINO',
            'Z127': 'SPAGNA',
            'Z128': 'SVEZIA',
            'Z129': 'SVIZZERA',
            'Z130': 'UCRAINA',
            'Z131': 'UNGHERIA',
            'Z132': 'RUSSIA',
            'Z133': 'TURCHIA',
            'Z134': 'REP. CECA',
            'Z135': 'SLOVACCHIA',
            'Z138': 'CITTÀ DEL VATICANO',
            'Z139': 'SLOVENIA',
            'Z140': 'CROAZIA',
            'Z148': 'BOSNIA-ERZEGOVINA',
            'Z149': 'MACEDONIA',
            'Z153': 'ESTONIA',
            'Z154': 'LETTONIA',
            'Z155': 'LITUANIA',
            'Z201': 'ALGERIA',
            'Z210': 'EGITTO',
            'Z217': 'ETIOPIA',
            'Z226': 'LIBIA',
            'Z229': 'MAROCCO',
            'Z243': 'NIGERIA',
            'Z252': 'SUDAFRICA',
            'Z256': 'TUNISIA',
            'Z301': 'AFGHANISTAN',
            'Z302': 'ARABIA SAUDITA',
            'Z311': 'CINA',
            'Z312': 'CIPRO',
            'Z314': 'COREA DEL SUD',
            'Z315': 'EMIRATI ARABI UNITI',
            'Z316': 'FILIPPINE',
            'Z319': 'GIAPPONE',
            'Z323': 'INDIA',
            'Z324': 'INDONESIA',
            'Z325': 'IRAN',
            'Z326': 'IRAQ',
            'Z327': 'ISRAELE',
            'Z330': 'KUWAIT',
            'Z332': 'LIBANO',
            'Z336': 'MALAYSIA',
            'Z342': 'PAKISTAN',
            'Z345': 'SINGAPORE',
            'Z346': 'SIRIA',
            'Z348': 'TAIWAN',
            'Z349': 'THAILANDIA',
            'Z352': 'VIETNAM',
            'Z401': 'ARGENTINA',
            'Z403': 'BRASILE',
            'Z404': 'CANADA',
            'Z405': 'CILE',
            'Z406': 'COLOMBIA',
            'Z409': 'CUBA',
            'Z411': 'ECUADOR',
            'Z415': 'GUATEMALA',
            'Z422': 'MESSICO',
            'Z427': 'PARAGUAY',
            'Z428': 'PERÙ',
            'Z436': 'STATI UNITI',
            'Z440': 'URUGUAY',
            'Z441': 'VENEZUELA',
            'Z501': 'AUSTRALIA',
            'Z515': 'NUOVA ZELANDA'
        };
        
        if (statiEsteri[codice]) {
            return {
                nome: statiEsteri[codice],
                provincia: 'EE' // EE = Estero
            };
        }
    }
    
    console.log('❌ Comune non trovato per codice:', codice);
    return null;
}

// Funzioni per menu a tendina cascata
function loadProvinces() {
    try {
        const provinceSelect = document.getElementById('provincia');
        if (!provinceSelect) return;
        
        provinceSelect.innerHTML = '<option value="">Seleziona provincia...</option>';
        
        // Usa la funzione helper dal comuni-loader
        const province = window.GIDatabase.getProvince();
        
        if (province.length === 0) {
            console.error('❌ Nessuna provincia trovata nel database');
            provinceSelect.innerHTML = '<option value="">Errore: nessuna provincia disponibile</option>';
            showError('Impossibile caricare le province. Verificare i file di database.');
            return;
        }
        
        console.log(`✅ Caricate ${province.length} province dal database`);
        
        // Ordina le province per sigla
        province.sort((a, b) => {
            if (!a.sigla || !b.sigla) return 0;
            return a.sigla.localeCompare(b.sigla);
        });
        
        // Popola il select
        province.forEach(p => {
            const option = document.createElement('option');
            option.value = p.sigla;
            option.textContent = `${p.sigla} - ${p.nome}`;
            provinceSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Errore caricamento province:', error);
        const provinceSelect = document.getElementById('provincia');
        if (provinceSelect) {
            provinceSelect.innerHTML = '<option value="">Errore caricamento province</option>';
        }
        showError('Errore nel caricamento delle province.');
    }
}

function setupEventListeners() {
    // Event listener per cambio provincia
    const provincia = document.getElementById('provincia');
    if (provincia) {
        provincia.addEventListener('change', function() {
            const selectedProvincia = this.value;
            const cittaSelect = document.getElementById('citta');
            const capSelect = document.getElementById('cap');
            
            if (selectedProvincia) {
                cittaSelect.disabled = false;
                loadCitta(selectedProvincia);
            } else {
                cittaSelect.disabled = true;
                cittaSelect.innerHTML = '<option value="">Prima seleziona la provincia</option>';
                capSelect.disabled = true;
                capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
            }
        });
    }
    
    // Event listener per cambio città
    const citta = document.getElementById('citta');
    if (citta) {
        citta.addEventListener('change', function() {
            const selectedCitta = this.value;
            const capSelect = document.getElementById('cap');
            
            if (selectedCitta) {
                capSelect.disabled = false;
                loadCAP(selectedCitta);
            } else {
                capSelect.disabled = true;
                capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
            }
        });
    }
    
    // Event listener per il form
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Auto-format telefono
    const telefono = document.getElementById('telefono');
    if (telefono) {
        telefono.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d+]/g, '');
            // Limita a +39 seguito da 10 cifre
            if (value.startsWith('+39')) {
                value = value.substring(0, 13); // +39 + 10 cifre
            } else {
                value = value.substring(0, 10); // Solo 10 cifre
            }
            e.target.value = value;
        });
    }
    
    // Auto-uppercase per codice fiscale e validazione
    const codiceFiscale = document.getElementById('codiceFiscale');
    if (codiceFiscale) {
        codiceFiscale.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
            
            // Validazione real-time
            if (e.target.value.length === 16) {
                if (validateCodiceFiscale(e.target.value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                    
                    // Estrai e compila automaticamente i dati dal CF
                    const extractedData = extractDataFromCF(e.target.value);
                    if (extractedData) {
                        // Compila data di nascita
                        if (extractedData.dataNascita) {
                            const dataNascitaField = document.getElementById('dataNascita');
                            if (dataNascitaField) {
                                dataNascitaField.value = extractedData.dataNascita;
                                dataNascitaField.dispatchEvent(new Event('change'));
                                
                                // Rimuovi eventuali alert di mancata corrispondenza
                                const existingAlert = dataNascitaField.parentElement.querySelector('.cf-mismatch-alert');
                                if (existingAlert) existingAlert.remove();
                            }
                        }
                        
                        // Compila sesso
                        if (extractedData.sesso) {
                            const sessoField = document.getElementById('sesso');
                            if (sessoField) sessoField.value = extractedData.sesso;
                        }
                        
                        // Compila luogo di nascita se trovato
                        if (extractedData.luogoNascita) {
                            const luogoField = document.getElementById('luogoNascita');
                            if (luogoField) luogoField.value = extractedData.luogoNascita;
                        }
                        
                        // Compila provincia di nascita se trovata
                        if (extractedData.provinciaNascita) {
                            const provField = document.getElementById('provinciaNascita');
                            if (provField) provField.value = extractedData.provinciaNascita;
                        }
                        
                        // Mostra info estratte
                        showExtractedInfo(extractedData);
                    }
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                    // Rimuovi span delle info se presente
                    const existingInfo = e.target.parentElement.querySelector('.cf-info-display');
                    if (existingInfo) existingInfo.remove();
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
                // Rimuovi span delle info se presente
                const existingInfo = e.target.parentElement.querySelector('.cf-info-display');
                if (existingInfo) existingInfo.remove();
            }
        });
    }
    
    // Auto-uppercase per matricola ENPALS
    const matricola = document.getElementById('matricolaENPALS');
    if (matricola) {
        matricola.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    // Event listener per mostrare/nascondere campo partita IVA e tipo rapporto
    const hasPartitaIva = document.getElementById('hasPartitaIva');
    if (hasPartitaIva) {
        hasPartitaIva.addEventListener('change', function(e) {
            if (e.target.value === 'si') {
                showPartitaIvaFields();
            } else if (e.target.value === 'no') {
                showTipoRapportoFields();
            } else {
                // Nessuna selezione: nascondi entrambi
                document.getElementById('partitaIvaGroup').style.display = 'none';
                document.getElementById('partitaIva').required = false;
                document.getElementById('partitaIva').value = '';
                
                document.getElementById('tipoRapportoGroup').style.display = 'none';
                document.getElementById('tipoRapporto').required = false;
                document.getElementById('tipoRapporto').value = '';
                
                document.getElementById('codiceComunicazioneGroup').style.display = 'none';
                document.getElementById('codiceComunicazione').required = false;
                document.getElementById('codiceComunicazione').value = '';
            }
        });
    }
    
    // Event listener per tipo rapporto
    const tipoRapporto = document.getElementById('tipoRapporto');
    if (tipoRapporto) {
        tipoRapporto.addEventListener('change', function(e) {
            if (e.target.value === 'chiamata') {
                showCodiceComunicazioneField();
            } else {
                hideCodiceComunicazioneField();
            }
        });
    }
    
    // Validazione partita IVA
    const partitaIva = document.getElementById('partitaIva');
    if (partitaIva) {
        partitaIva.addEventListener('input', function(e) {
            // Accetta solo numeri
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Validazione visiva
            if (e.target.value.length === 11) {
                if (validatePartitaIva(e.target.value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
            }
        });
    }
    
    // Validazione real-time email
    const email = document.getElementById('email');
    if (email) {
        email.addEventListener('blur', function(e) {
            if (e.target.value) {
                if (validateEmail(e.target.value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
            }
        });
    }
    
    // Auto-uppercase per provincia nascita
    const provinciaNascita = document.getElementById('provinciaNascita');
    if (provinciaNascita) {
        provinciaNascita.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase().substring(0, 2);
        });
    }
    
    // Validazione IBAN
    const iban = document.getElementById('iban');
    if (iban) {
        iban.addEventListener('input', function(e) {
            // Converte in maiuscolo e rimuove spazi
            e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
            
            // Validazione visiva
            if (e.target.value.length >= 15) { // IBAN minimo
                if (validateIBAN(e.target.value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
            }
        });
    }
    
    // Mostra età quando viene selezionata la data di nascita
    const dataNascita = document.getElementById('dataNascita');
    if (dataNascita) {
        dataNascita.addEventListener('change', function(e) {
            if (e.target.value) {
                const age = calculateAge(e.target.value);
                const ageText = age >= 18 ? `(${age} anni) ✓` : `(${age} anni) ❌ Minimo 18 anni`;
                
                // Rimuovi eventuale span esistente
                const existingSpan = e.target.parentElement.querySelector('.age-display');
                if (existingSpan) existingSpan.remove();
                
                // Aggiungi nuovo span con l'età
                const ageSpan = document.createElement('span');
                ageSpan.className = 'age-display';
                ageSpan.style.marginLeft = '10px';
                ageSpan.style.color = age >= 18 ? 'var(--success)' : 'var(--danger)';
                ageSpan.textContent = ageText;
                e.target.parentElement.appendChild(ageSpan);
                
                // Verifica corrispondenza con codice fiscale
                const cf = document.getElementById('codiceFiscale').value;
                if (cf.length === 16) {
                    if (!validateCFWithDate(cf, e.target.value)) {
                        // Rimuovi eventuale alert esistente
                        const existingAlert = e.target.parentElement.querySelector('.cf-mismatch-alert');
                        if (existingAlert) existingAlert.remove();
                        
                        // Aggiungi alert di mancata corrispondenza
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'cf-mismatch-alert alert alert-warning';
                        alertDiv.style.marginTop = '0.5rem';
                        alertDiv.style.padding = '0.5rem';
                        alertDiv.style.fontSize = '0.875rem';
                        alertDiv.textContent = '⚠️ La data non corrisponde al codice fiscale';
                        e.target.parentElement.appendChild(alertDiv);
                        
                        e.target.classList.add('invalid');
                    } else {
                        // Rimuovi alert se presente
                        const existingAlert = e.target.parentElement.querySelector('.cf-mismatch-alert');
                        if (existingAlert) existingAlert.remove();
                        e.target.classList.remove('invalid');
                    }
                }
            }
        });
    }
    
    // Auto-uppercase per codice comunicazione
    const codiceComunicazione = document.getElementById('codiceComunicazione');
    if (codiceComunicazione) {
        codiceComunicazione.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

function loadCitta(provincia) {
    const cittaSelect = document.getElementById('citta');
    if (!cittaSelect) return;
    
    cittaSelect.innerHTML = '<option value="">Seleziona città...</option>';
    
    try {
        const comuni = window.GIDatabase.getComuniByProvincia(provincia);
        console.log(`🔍 Debug per provincia ${provincia}:`, {
            totalComuni: window.GIDatabase?.getData()?.comuni?.length || 0,
            comuniTrovati: comuni.length,
            primoComune: comuni[0] || 'nessuno'
        });
        
        if (comuni.length === 0) {
            console.warn(`Nessun comune trovato per provincia ${provincia}`);
            cittaSelect.innerHTML = '<option value="">Nessuna città trovata</option>';
            return;
        }
        
        // Ordina i comuni alfabeticamente
        comuni.sort((a, b) => {
            const nomeA = a.denominazione_ita || a.denominazione || a.nome || '';
            const nomeB = b.denominazione_ita || b.denominazione || b.nome || '';
            return nomeA.localeCompare(nomeB);
        });
        
        // Popola il select
        comuni.forEach(comune => {
            const option = document.createElement('option');
            option.value = comune.codice_istat || comune.codiceIstat || comune.codice;
            option.textContent = comune.denominazione_ita || comune.denominazione || comune.nome;
            option.setAttribute('data-comune', JSON.stringify(comune));
            cittaSelect.appendChild(option);
        });
        
        console.log(`✅ Caricate ${comuni.length} città per ${provincia}`);
        
    } catch (error) {
        console.error('Errore caricamento città:', error);
        cittaSelect.innerHTML = '<option value="">Errore caricamento città</option>';
    }
}

function loadCAP(codiceIstat) {
    const capSelect = document.getElementById('cap');
    if (!capSelect) return;
    
    capSelect.innerHTML = '<option value="">Caricamento CAP...</option>';
    
    try {
        const capList = window.GIDatabase.getCapByComune(codiceIstat);
        
        console.log(`📮 CAP trovati per ${codiceIstat}:`, capList);
        
        if (capList.length === 0) {
            // Prova a recuperare il CAP dai dati del comune
            const selectedOption = document.querySelector(`#citta option[value="${codiceIstat}"]`);
            if (selectedOption) {
                const comuneData = JSON.parse(selectedOption.getAttribute('data-comune'));
                if (comuneData.cap) {
                    console.log('📮 Uso CAP di fallback dal comune:', comuneData.cap);
                    capList.push(comuneData.cap);
                }
            }
        }
        
        if (capList.length === 0) {
            capSelect.innerHTML = '<option value="">CAP non trovato</option>';
            return;
        }
        
        // Popola la select con i CAP trovati
        capSelect.innerHTML = '<option value="">Seleziona CAP...</option>';
        
        // Se c'è un solo CAP, selezionalo automaticamente
        if (capList.length === 1) {
            const option = document.createElement('option');
            option.value = capList[0];
            option.textContent = capList[0];
            option.selected = true;
            capSelect.appendChild(option);
        } else {
            // Altrimenti mostra tutti i CAP disponibili
            capList.forEach(cap => {
                const option = document.createElement('option');
                option.value = cap;
                option.textContent = cap;
                capSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Errore in loadCAP:', error);
        capSelect.innerHTML = '<option value="">Errore caricamento CAP</option>';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Raccogli i dati del form
    const formData = new FormData(e.target);
    const dataNascita = formData.get('dataNascita');
    
    const artistData = {
        nome: formData.get('nome').toUpperCase(),
        cognome: formData.get('cognome').toUpperCase(),
        nomeArte: formData.get('nomeArte'),
        codiceFiscale: formData.get('codiceFiscale').toUpperCase(),
        matricolaENPALS: formData.get('matricolaENPALS')?.toUpperCase() || '',
        dataNascita: dataNascita,
        sesso: formData.get('sesso') || '',
        luogoNascita: formData.get('luogoNascita') || '',
        provinciaNascita: formData.get('provinciaNascita')?.toUpperCase() || '',
        eta: calculateAge(dataNascita),
        nazionalita: formData.get('nazionalita'),
        telefono: formData.get('telefono'),
        email: formData.get('email'),
        indirizzo: formData.get('indirizzo'),
        provincia: formData.get('provincia'),
        citta: document.querySelector('#citta option:checked')?.textContent || '',
        cap: formData.get('cap'),
        codiceIstatCitta: formData.get('citta'), // Salva anche il codice ISTAT
        hasPartitaIva: formData.get('hasPartitaIva'),
        partitaIva: formData.get('hasPartitaIva') === 'si' ? formData.get('partitaIva') : '',
        tipoRapporto: formData.get('hasPartitaIva') === 'no' ? formData.get('tipoRapporto') : '',
        codiceComunicazione: formData.get('codiceComunicazione') || '', // NUOVO CAMPO
        iban: formData.get('iban').toUpperCase().replace(/\s/g, ''),
        mansione: formData.get('mansione'),
        note: formData.get('note'),
        dataRegistrazione: new Date().toISOString()
    };
    
    // Validazione base
    if (!validateCodiceFiscale(artistData.codiceFiscale)) {
        showError('Codice fiscale non valido');
        return;
    }
    
    if (artistData.email && !validateEmail(artistData.email)) {
        showError('Email non valida');
        return;
    }
    
    if (artistData.telefono && !validatePhone(artistData.telefono)) {
        showError('Numero di telefono non valido (inserire 10 cifre)');
        return;
    }
    
    // Verifica età minima (18 anni)
    if (artistData.eta < 18) {
        showError('L\'artista deve avere almeno 18 anni');
        return;
    }
    
    // Verifica che la data di nascita non sia nel futuro
    if (new Date(dataNascita) > new Date()) {
        showError('La data di nascita non può essere nel futuro');
        return;
    }
    
    // Verifica corrispondenza tra codice fiscale e data di nascita
    if (!validateCFWithDate(artistData.codiceFiscale, artistData.dataNascita)) {
        showError('La data di nascita non corrisponde al codice fiscale');
        return;
    }
    
    // Verifica IBAN
    if (!validateIBAN(artistData.iban)) {
        showError('IBAN non valido');
        return;
    }
    
    // Verifica partita IVA se presente
    if (artistData.hasPartitaIva === 'si' && !validatePartitaIva(artistData.partitaIva)) {
        showError('Partita IVA non valida');
        return;
    }
    
    // Verifica codice comunicazione per contratti a chiamata
    if (artistData.tipoRapporto === 'chiamata' && !artistData.codiceComunicazione) {
        showError('Codice comunicazione INPS obbligatorio per contratti a chiamata');
        return;
    }
    
    // Salva o aggiorna su Supabase
    if (currentMode === 'edit' && currentArtistId) {
        updateArtist(currentArtistId, artistData);
    } else {
        saveArtist(artistData);
    }
}

// Salvataggio artista su Supabase
async function saveArtist(artistData) {
    try {
        console.log('💾 Tentativo salvataggio artista:', artistData.nome, artistData.cognome);
        
        // Controlla se esiste già un artista con questo CF (solo per nuove registrazioni)
        if (currentMode === 'new') {
            const exists = await DatabaseService.artistaExists(artistData.codiceFiscale);
            if (exists) {
                showError('Esiste già un artista con questo codice fiscale nel database');
                return;
            }
        }
        
        // Salva in Supabase
        const savedArtist = await DatabaseService.saveArtista(artistData);
        console.log('✅ Artista salvato con successo:', savedArtist);
        
        // Mostra messaggio di successo
        showSuccess('Artista registrato con successo! Reindirizzamento...');
        
        // Reset form
        resetForm();
        
        // Reindirizza alla dashboard dopo 2 secondi
        setTimeout(() => {
            window.location.href = './index.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Errore salvataggio artista:', error);
        
        // Gestisci errori specifici
        if (error.code === '23505') { // Violazione unique constraint
            showError('Esiste già un artista con questo codice fiscale');
        } else if (error.message) {
            showError('Errore durante il salvataggio: ' + error.message);
        } else {
            showError('Errore durante il salvataggio. Riprova.');
        }
    }
}

// Aggiornamento artista esistente
async function updateArtist(artistId, artistData) {
    try {
        console.log('✏️ Tentativo aggiornamento artista:', artistData.nome, artistData.cognome);
        
        // Aggiorna in Supabase
        const updatedArtist = await DatabaseService.updateArtista(artistId, artistData);
        console.log('✅ Artista aggiornato con successo:', updatedArtist);
        
        // Mostra messaggio di successo
        showSuccess('Artista modificato con successo! Reindirizzamento...');
        
        // Reset form
        resetForm();
        
        // Reindirizza alla dashboard dopo 2 secondi
        setTimeout(() => {
            window.location.href = './index.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Errore aggiornamento artista:', error);
        
        if (error.message) {
            showError('Errore durante l\'aggiornamento: ' + error.message);
        } else {
            showError('Errore durante l\'aggiornamento. Riprova.');
        }
    }
}

// ==================== FUNZIONI DI VALIDAZIONE ====================

function validateCodiceFiscale(cf) {
    cf = cf.toUpperCase();
    if (cf.length !== 16) return false;
    
    const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return pattern.test(cf);
}

// Estrae il sesso dal codice fiscale
function extractGenderFromCF(cf) {
    if (!cf || cf.length < 11) return null;
    
    const dayCode = parseInt(cf.substring(9, 11));
    return dayCode > 40 ? 'F' : 'M';
}

// Estrae tutti i dati possibili dal codice fiscale
function extractDataFromCF(cf) {
    if (!cf || cf.length !== 16) return null;
    
    const data = {};
    
    // Estrai data di nascita
    data.dataNascita = extractDateFromCF(cf);
    
    // Estrai sesso
    data.sesso = extractGenderFromCF(cf);
    
    // Estrai codice catastale del comune
    const codiceCatastale = cf.substring(11, 15);
    
    // Cerca il comune di nascita
    const comuneInfo = findComuneByCodCatastaleReg(codiceCatastale);
    if (comuneInfo) {
        data.luogoNascita = comuneInfo.nome;
        data.provinciaNascita = comuneInfo.provincia;
    }
    
    return data;
}

// Mostra le informazioni estratte dal CF
function showExtractedInfo(data) {
    // Rimuovi eventuale span esistente
    const cfField = document.getElementById('codiceFiscale');
    const existingInfo = cfField.parentElement.querySelector('.cf-info-display');
    if (existingInfo) existingInfo.remove();
    
    // Crea testo informativo
    let infoText = 'Dati estratti: ';
    const infoParts = [];
    
    if (data.sesso) {
        infoParts.push(data.sesso === 'M' ? 'Maschio' : 'Femmina');
    }
    
    if (data.dataNascita) {
        const date = new Date(data.dataNascita);
        const dateStr = date.toLocaleDateString('it-IT');
        infoParts.push(`nato il ${dateStr}`);
    }
    
    if (data.luogoNascita) {
        let luogoText = data.luogoNascita;
        if (data.provinciaNascita) {
            luogoText += ` (${data.provinciaNascita})`;
        }
        infoParts.push(`a ${luogoText}`);
    }
    
    if (infoParts.length > 0) {
        infoText += infoParts.join(', ');
        
        // Aggiungi span con le info
        const infoSpan = document.createElement('span');
        infoSpan.className = 'cf-info-display';
        infoSpan.style.display = 'block';
        infoSpan.style.marginTop = '5px';
        infoSpan.style.color = 'var(--text-muted)';
        infoSpan.style.fontSize = '0.875rem';
        infoSpan.textContent = infoText;
        cfField.parentElement.appendChild(infoSpan);
    }
}

// Estrae la data di nascita dal codice fiscale
function extractDateFromCF(cf) {
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
    const isFemale = day > 40;
    if (isFemale) day -= 40;
    
    // Determina l'anno completo
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const lastCentury = currentCentury - 100;
    
    let year = parseInt(yearCode);
    // Se l'anno + secolo corrente è nel futuro, usa il secolo precedente
    if (currentCentury + year > currentYear) {
        year = lastCentury + year;
    } else {
        year = currentCentury + year;
    }
    
    // Formatta la data
    const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
    
    // Verifica che sia una data valida
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    return dateStr;
}

// Verifica che la data di nascita corrisponda al codice fiscale
function validateCFWithDate(cf, birthDate) {
    const extractedDate = extractDateFromCF(cf);
    if (!extractedDate) return false;
    
    return extractedDate === birthDate;
}

function validateEmail(email) {
    if (!email) return true; // Email è opzionale
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function validatePhone(phone) {
    if (!phone) return true; // Telefono è opzionale
    // Rimuovi spazi e caratteri non numerici (eccetto il +)
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    // Verifica formato italiano (opzionale +39, poi 10 cifre)
    const pattern = /^(\+39)?[0-9]{10}$/;
    return pattern.test(cleanPhone);
}

// Validazione IBAN
function validateIBAN(iban) {
    // Rimuovi spazi e converti in maiuscolo
    iban = iban.replace(/\s/g, '').toUpperCase();
    
    // Verifica lunghezza per paese (IT = 27 caratteri)
    const ibanLengths = {
        'AD': 24, 'AE': 23, 'AT': 20, 'AZ': 28, 'BA': 20, 'BE': 16,
        'BG': 22, 'BH': 22, 'BR': 29, 'CH': 21, 'CR': 21, 'CY': 28,
        'CZ': 24, 'DE': 22, 'DK': 18, 'DO': 28, 'EE': 20, 'ES': 24,
        'FI': 18, 'FO': 18, 'FR': 27, 'GB': 22, 'GI': 23, 'GL': 18,
        'GR': 27, 'GT': 28, 'HR': 21, 'HU': 28, 'IE': 22, 'IL': 23,
        'IS': 26, 'IT': 27, 'JO': 30, 'KW': 30, 'KZ': 20, 'LB': 28,
        'LI': 21, 'LT': 20, 'LU': 20, 'LV': 21, 'MC': 27, 'MD': 24,
        'ME': 22, 'MK': 19, 'MR': 27, 'MT': 31, 'MU': 30, 'NL': 18,
        'NO': 15, 'PK': 24, 'PL': 28, 'PS': 29, 'PT': 25, 'QA': 29,
        'RO': 24, 'RS': 22, 'SA': 24, 'SE': 24, 'SI': 19, 'SK': 24,
        'SM': 27, 'TN': 24, 'TR': 26
    };
    
    // Verifica formato base
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
        return false;
    }
    
    // Estrai codice paese
    const countryCode = iban.substring(0, 2);
    
    // Verifica lunghezza per paese
    if (ibanLengths[countryCode] && iban.length !== ibanLengths[countryCode]) {
        return false;
    }
    
    // Algoritmo di validazione IBAN
    // Sposta i primi 4 caratteri alla fine
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    
    // Converti lettere in numeri (A=10, B=11, ..., Z=35)
    let numericIBAN = '';
    for (let i = 0; i < rearranged.length; i++) {
        const char = rearranged.charAt(i);
        if (isNaN(char)) {
            numericIBAN += (char.charCodeAt(0) - 55).toString();
        } else {
            numericIBAN += char;
        }
    }
    
    // Calcola modulo 97
    let remainder = numericIBAN.substring(0, 2);
    for (let i = 2; i < numericIBAN.length; i++) {
        remainder = (parseInt(remainder) % 97) + numericIBAN.charAt(i);
    }
    
    return parseInt(remainder) % 97 === 1;
}

// Validazione Partita IVA
function validatePartitaIva(piva) {
    if (!piva || piva.length !== 11) return false;
    
    // Verifica che sia composta solo da numeri
    if (!/^\d{11}$/.test(piva)) return false;
    
    // Algoritmo di validazione partita IVA italiana
    let sum = 0;
    for (let i = 0; i < 11; i++) {
        const digit = parseInt(piva.charAt(i));
        if (i % 2 === 0) {
            sum += digit;
        } else {
            const doubled = digit * 2;
            sum += doubled > 9 ? doubled - 9 : doubled;
        }
    }
    
    return sum % 10 === 0;
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// ==================== FUNZIONI DI UTILITÀ ====================

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    } else {
        // Fallback se non trova l'elemento
        alert('✅ ' + message);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        // Fallback se non trova l'elemento
        alert('❌ ' + message);
    }
}

// Funzione per annullare la registrazione
function cancelRegistration() {
    if (confirm('Sei sicuro di voler annullare? I dati inseriti verranno persi.')) {
        goBackToModeSelection();
    }
}

// Funzione per resettare il form
function resetForm() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.reset();
        
        const cittaSelect = document.getElementById('citta');
        const capSelect = document.getElementById('cap');
        
        if (cittaSelect) {
            cittaSelect.disabled = true;
            cittaSelect.innerHTML = '<option value="">Prima seleziona la provincia</option>';
        }
        
        if (capSelect) {
            capSelect.disabled = true;
            capSelect.innerHTML = '<option value="">Prima seleziona la città</option>';
        }
        
        // Nascondi campi condizionali
        document.getElementById('partitaIvaGroup').style.display = 'none';
        document.getElementById('tipoRapportoGroup').style.display = 'none';
        document.getElementById('codiceComunicazioneGroup').style.display = 'none';
        
        // Rimuovi eventuali span di età e alert
        const ageDisplay = document.querySelector('.age-display');
        if (ageDisplay) ageDisplay.remove();
        
        const cfAlert = document.querySelector('.cf-mismatch-alert');
        if (cfAlert) cfAlert.remove();
        
        const cfInfo = document.querySelector('.cf-info-display');
        if (cfInfo) cfInfo.remove();
        
        // Rimuovi classi di validazione
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('valid', 'invalid');
        });
    }
}

// Rendi le funzioni disponibili globalmente
window.cancelRegistration = cancelRegistration;
window.selectMode = selectMode;
window.goBackToModeSelection = goBackToModeSelection;
window.selectArtistForEdit = selectArtistForEdit;
window.debugDatabaseStatus = debugDatabaseStatus;

console.log('📝 Sistema gestione artisti v3.1 - Con fix autocompilazione CF!');
