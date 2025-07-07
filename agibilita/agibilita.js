// agibilita.js - Sistema Gestione Agibilità RECORP

// Variabili globali
let selectedArtists = [];
let agibilitaData = {
    isModifica: false,
    codiceAgibilita: null
};

// Carica database dal localStorage
let artistsDB = [];
let agibilitaDB = [];
let venuesDB = [];

try {
    artistsDB = JSON.parse(localStorage.getItem('artistsDB')) || [];
    agibilitaDB = JSON.parse(localStorage.getItem('agibilitaDB')) || [];
    venuesDB = JSON.parse(localStorage.getItem('venuesDB')) || [];
} catch (error) {
    console.error('Errore caricamento database:', error);
    artistsDB = [];
    agibilitaDB = [];
    venuesDB = [];
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataInizio').min = today;
    document.getElementById('dataFine').min = today;

    // Check if coming from artist search
    const selectedArtistId = sessionStorage.getItem('selectedArtistId');
    if (selectedArtistId) {
        sessionStorage.removeItem('selectedArtistId');
        startNewAgibilita();

        // Add the selected artist
        setTimeout(() => {
            const artistId = parseInt(selectedArtistId);
            const artist = artistsDB.find(a => a.id === artistId);
            if (artist) {
                addArtistToList(artistId);
            }
        }, 100);
    }

    // Check if coming from chat
    const quickAgibilita = sessionStorage.getItem('quickAgibilita');
    if (quickAgibilita) {
        sessionStorage.removeItem('quickAgibilita');
        const data = JSON.parse(quickAgibilita);

        // Start new agibilità
        startNewAgibilita();

        // Add artists
        setTimeout(() => {
            data.artisti.forEach(artistData => {
                const artist = artistsDB.find(a => a.cf === artistData.cf);
                if (artist) {
                    selectedArtists.push({
                        ...artist,
                        ruolo: artistData.ruolo,
                        compenso: artistData.compenso
                    });
                }
            });
            updateArtistsList();

            // Set dates
            if (data.dataInizio) {
                document.getElementById('dataInizio').value = data.dataInizio;
            }
            if (data.dataFine) {
                document.getElementById('dataFine').value = data.dataFine;
            }

            // Set venue
            if (data.locale) {
                document.getElementById('descrizioneLocale').value = data.locale.nome;
                document.getElementById('indirizzo').value = data.locale.indirizzo;
                document.getElementById('citta').value = data.locale.citta;
                document.getElementById('cap').value = data.locale.cap;
                document.getElementById('provincia').value = data.locale.provincia;
            }

            // Auto advance to step 2 if we have artists
            if (selectedArtists.length > 0) {
                setTimeout(() => {
                    goToStep2();
                }, 500);
            }
        }, 200);
    }
});

// Navigazione sezioni
function showSection(sectionId) {
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// Start new agibilità
function startNewAgibilita() {
    console.log('Starting new agibilità...'); // Debug
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    selectedArtists = [];
    clearAllForms();
    showSection('step1');
}

// Show edit list
function showEditAgibilita() {
    document.getElementById('editListSection').style.display = 'block';
    showExistingAgibilita();
}

// Hide edit search
function hideEditSearch() {
    document.getElementById('editListSection').style.display = 'none';
}

// Clear all forms
function clearAllForms() {
    // Clear artists
    selectedArtists = [];
    updateArtistsList();

    // Clear dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataFine').value = '';

    // Clear location
    document.getElementById('descrizioneLocale').value = '';
    document.getElementById('indirizzo').value = '';
    document.getElementById('citta').value = '';
    document.getElementById('cap').value = '';
    document.getElementById('provincia').value = '';
    document.getElementById('noteLocale').value = '';

    // Hide edit list
    document.getElementById('editListSection').style.display = 'none';
}

// Modal functions
function showAddArtistModal() {
    document.getElementById('addArtistModal').style.display = 'block';
    document.getElementById('artistSearch').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function closeModal() {
    document.getElementById('addArtistModal').style.display = 'none';
}

// Search artists
function searchArtists() {
    const searchTerm = document.getElementById('artistSearch').value.toLowerCase();
    const results = artistsDB.filter(artist => 
        artist.nome.toLowerCase().includes(searchTerm) || 
        artist.cognome.toLowerCase().includes(searchTerm) ||
        artist.cf.toLowerCase().includes(searchTerm) ||
        (artist.nomeArte && artist.nomeArte.toLowerCase().includes(searchTerm))
    );

    const resultsDiv = document.getElementById('searchResults');
    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>Nessun artista trovato</p>';
    } else {
        resultsDiv.innerHTML = results.map(artist => `
            <div class="search-result" onclick="addArtistToList(${artist.id})">
                <strong>${artist.nome} ${artist.cognome}${artist.nomeArte ? ' - ' + artist.nomeArte : ''}</strong><br>
                <small>CF: ${artist.cf} | ${artist.mansione || 'Non specificata'}</small>
            </div>
        `).join('');
    }
}

// Add artist to list
function addArtistToList(artistId) {
    const artist = artistsDB.find(a => a.id === artistId);
    if (!artist) return;

    const existingIndex = selectedArtists.findIndex(a => a.cf === artist.cf);
    if (existingIndex !== -1) {
        alert('Questo artista è già stato aggiunto!');
        return;
    }

    selectedArtists.push({
        ...artist,
        ruolo: artist.mansione || '',
        compenso: 0
    });

    updateArtistsList();
    closeModal();
}

// Update artists list display
function updateArtistsList() {
    const listDiv = document.getElementById('artistList');

    if (selectedArtists.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #6b7280;">Nessun artista selezionato</p>';
        document.getElementById('summaryBox').style.display = 'none';
        document.getElementById('btnNext1').style.display = 'none';
    } else {
        listDiv.innerHTML = selectedArtists.map((artist, index) => `
            <div class="artist-item">
                <div class="artist-info">
                    <strong>${artist.nome} ${artist.cognome}${artist.nomeArte ? ' - ' + artist.nomeArte : ''}</strong><br>
                    <small>CF: ${artist.cf}</small>
                </div>
                <div class="artist-role-compensation">
                    <select class="form-control" required onchange="updateArtistRole(${index}, this.value)">
                        <option value="">Seleziona ruolo...</option>
                        <option value="DJ" ${artist.ruolo === 'DJ' ? 'selected' : ''}>DJ</option>
                        <option value="Vocalist" ${artist.ruolo === 'Vocalist' ? 'selected' : ''}>Vocalist</option>
                        <option value="Ballerino/a" ${artist.ruolo === 'Ballerino/a' ? 'selected' : ''}>Ballerino/a</option>
                        <option value="Tecnico" ${artist.ruolo === 'Tecnico' ? 'selected' : ''}>Tecnico</option>
                    </select>
                    <input type="number" class="form-control" placeholder="Compenso €" 
                           value="${artist.compenso || ''}" min="0" step="0.01"
                           onchange="updateArtistCompensation(${index}, this.value)"
                           style="width: 150px;">
                    <button class="btn-remove" onclick="removeArtist(${index})">Rimuovi</button>
                </div>
            </div>
        `).join('');

        document.getElementById('summaryBox').style.display = 'block';
        updateTotalCompensation();
        checkCanProceed();
    }
}

// Update artist role
function updateArtistRole(index, role) {
    selectedArtists[index].ruolo = role;
    checkCanProceed();
}

// Update artist compensation
function updateArtistCompensation(index, value) {
    selectedArtists[index].compenso = parseFloat(value) || 0;
    updateTotalCompensation();
    checkCanProceed();
}

// Update total compensation
function updateTotalCompensation() {
    const total = selectedArtists.reduce((sum, artist) => sum + (artist.compenso || 0), 0);
    document.getElementById('totalArtists').textContent = selectedArtists.length;
    document.getElementById('totalCompensation').textContent = total.toFixed(2);
}

// Remove artist
function removeArtist(index) {
    selectedArtists.splice(index, 1);
    updateArtistsList();
}

// Check if can proceed
function checkCanProceed() {
    const canProceed = selectedArtists.length > 0 && 
        selectedArtists.every(a => a.ruolo && a.compenso > 0);
    document.getElementById('btnNext1').style.display = canProceed ? 'inline-block' : 'none';
}

// Go to step 2
function goToStep2() {
    if (selectedArtists.length === 0) {
        alert('Seleziona almeno un artista');
        return;
    }
    showSection('step2');
}

// Validate dates
function validateDates() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;

    if (startDate && endDate) {
        if (endDate < startDate) {
            alert('La data di fine non può essere precedente alla data di inizio');
            document.getElementById('dataFine').value = startDate;
        }

        // Calculate duration
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        document.getElementById('dateInfo').style.display = 'block';
        document.getElementById('dateInfo').textContent = `Durata: ${diffDays} giorn${diffDays > 1 ? 'i' : 'o'}`;
    }
}

// Search venue
function searchVenue() {
    const searchTerm = document.getElementById('descrizioneLocale').value.toLowerCase();
    const dropdown = document.getElementById('venueDropdown');

    if (searchTerm.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    const matches = venuesDB.filter(venue => 
        venue.nome.toLowerCase().includes(searchTerm) ||
        venue.citta.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(venue => `
            <div class="autocomplete-item" onclick="selectVenue('${venue.nome}', '${venue.indirizzo}', '${venue.citta}', '${venue.cap}', '${venue.provincia}')">
                <strong>${venue.nome}</strong><br>
                <small>${venue.citta} - ${venue.provincia}</small>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

// Select venue
function selectVenue(nome, indirizzo, citta, cap, provincia) {
    document.getElementById('descrizioneLocale').value = nome;
    document.getElementById('indirizzo').value = indirizzo;
    document.getElementById('citta').value = citta;
    document.getElementById('cap').value = cap;
    document.getElementById('provincia').value = provincia;
    document.getElementById('venueDropdown').style.display = 'none';
}

// Go to step 3
function goToStep3() {
    // Validate all fields
    const requiredFields = ['dataInizio', 'dataFine', 'descrizioneLocale', 'indirizzo', 'citta', 'cap', 'provincia'];
    const missingFields = requiredFields.filter(field => !document.getElementById(field).value);

    if (missingFields.length > 0) {
        alert('Compila tutti i campi obbligatori');
        return;
    }

    // Save venue if new
    const venueName = document.getElementById('descrizioneLocale').value;
    const existingVenue = venuesDB.find(v => v.nome.toLowerCase() === venueName.toLowerCase());

    if (!existingVenue) {
        const newVenue = {
            id: Date.now(),
            nome: venueName,
            indirizzo: document.getElementById('indirizzo').value,
            citta: document.getElementById('citta').value,
            cap: document.getElementById('cap').value,
            provincia: document.getElementById('provincia').value
        };
        venuesDB.push(newVenue);
        localStorage.setItem('venuesDB', JSON.stringify(venuesDB));
    }

    // Update summaries
    updateSummaries();
    generateXMLPreview();
    showSection('step3');
}

// Update summaries
function updateSummaries() {
    // Artists summary
    const artistsHtml = selectedArtists.map(artist => 
        `<p><strong>${artist.nome} ${artist.cognome}</strong> - ${artist.ruolo} - €${artist.compenso.toFixed(2)}</p>`
    ).join('');
    document.getElementById('summaryArtists').innerHTML = artistsHtml;

    // Dates summary
    const startDate = new Date(document.getElementById('dataInizio').value);
    const endDate = new Date(document.getElementById('dataFine').value);
    const datesHtml = `
        <p>Dal: ${startDate.toLocaleDateString('it-IT')}</p>
        <p>Al: ${endDate.toLocaleDateString('it-IT')}</p>
    `;
    document.getElementById('summaryDates').innerHTML = datesHtml;

    // Location summary
    const locationHtml = `
        <p><strong>${document.getElementById('descrizioneLocale').value}</strong></p>
        <p>${document.getElementById('indirizzo').value}</p>
        <p>${document.getElementById('cap').value} ${document.getElementById('citta').value} (${document.getElementById('provincia').value})</p>
    `;
    document.getElementById('summaryLocation').innerHTML = locationHtml;
}

// Show tab
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
}

// Generate XML
function generateXML() {
    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;
    const tipo = agibilitaData.isModifica ? 'V' : 'N';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Agibilita xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <CodiceFiscaleAzienda>04433920248</CodiceFiscaleAzienda>
    <Matricola>9112806447</Matricola>
    <Descrizione>OKL SRL</Descrizione>
    <Tipo>${tipo}</Tipo>`;

    if (agibilitaData.isModifica && agibilitaData.codiceAgibilita) {
        xml += `\n    <IdentificativoAgibilita>${agibilitaData.codiceAgibilita}</IdentificativoAgibilita>`;
    }

    xml += `
    <Occupazione>
        <Tipo>O</Tipo>
        <TipoRetribuzione>G</TipoRetribuzione>
        <Descrizione>${document.getElementById('descrizioneLocale').value}</Descrizione>
        <Indirizzo>${document.getElementById('indirizzo').value}</Indirizzo>
        <Comune>${document.getElementById('citta').value}</Comune>
        <CAP>${document.getElementById('cap').value}</CAP>
        <Provincia>${document.getElementById('provincia').value}</Provincia>
        <Periodo>
            <DataDal>${startDate}</DataDal>
            <DataAl>${endDate}</DataAl>
        </Periodo>`;

    // Add workers
    selectedArtists.forEach(artist => {
        const qualificaMap = {
            'DJ': '032',
            'Vocalist': '101',
            'Ballerino/a': '102',
            'Tecnico': '103'
        };

        // Calculate daily compensation
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const dailyCompensation = (artist.compenso / days).toFixed(2);

        xml += `
        <Lavoratore>
            <CodiceFiscale>${artist.cf}</CodiceFiscale>
            <Nome>${artist.nome}</Nome>
            <Cognome>${artist.cognome}</Cognome>
            <CodiceQualifica>${qualificaMap[artist.ruolo] || '032'}</CodiceQualifica>
            <Retribuzione>${dailyCompensation}</Retribuzione>
            <LegaleRappresentante>NO</LegaleRappresentante>
        </Lavoratore>`;
    });

    xml += `
    </Occupazione>
</Agibilita>`;

    return xml;
}

// Generate XML preview
function generateXMLPreview() {
    const xml = generateXML();
    const preview = xml.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    document.getElementById('xmlPreview').innerHTML = preview;
}

// Save agibilità to database
function saveAgibilitaToDatabase(xmlContent) {
    const agibilita = {
        id: Date.now(),
        codice: `AG-${new Date().getFullYear()}-${String(agibilitaDB.length + 1).padStart(3, '0')}`,
        dataCreazione: new Date().toISOString(),
        dataInizio: document.getElementById('dataInizio').value,
        dataFine: document.getElementById('dataFine').value,
        locale: {
            descrizione: document.getElementById('descrizioneLocale').value,
            indirizzo: document.getElementById('indirizzo').value,
            citta: document.getElementById('citta').value,
            cap: document.getElementById('cap').value,
            provincia: document.getElementById('provincia').value
        },
        artisti: selectedArtists.map(a => ({
            cf: a.cf,
            nome: a.nome,
            cognome: a.cognome,
            nomeArte: a.nomeArte,
            ruolo: a.ruolo,
            compenso: a.compenso
        })),
        xml: xmlContent,
        isModifica: agibilitaData.isModifica,
        codiceOriginale: agibilitaData.codiceAgibilita
    };

    agibilitaDB.push(agibilita);
    localStorage.setItem('agibilitaDB', JSON.stringify(agibilitaDB));

    // Update artists' agibilità
    selectedArtists.forEach(artist => {
        const artistIndex = artistsDB.findIndex(a => a.cf === artist.cf);
        if (artistIndex !== -1) {
            if (!artistsDB[artistIndex].agibilita) {
                artistsDB[artistIndex].agibilita = [];
            }
            artistsDB[artistIndex].agibilita.push({
                data: `${agibilita.dataInizio} - ${agibilita.dataFine}`,
                locale: agibilita.locale.descrizione,
                compenso: `€${artist.compenso.toFixed(2)}`,
                note: artist.ruolo
            });
        }
    });
    localStorage.setItem('artistsDB', JSON.stringify(artistsDB));
}

// Download XML
function downloadXML(xmlContent) {
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agibilita_${new Date().toISOString().slice(0,10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
}

// Generate PDF
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const startDate = document.getElementById('dataInizio').value;
    const endDate = document.getElementById('dataFine').value;
    const dataRichiesta = new Date().toLocaleDateString('it-IT');
    const oraStampa = new Date().toLocaleTimeString('it-IT');
    const protocollo = `INPS.9100.${formatDate(new Date())}.${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`;
    const numeroAgibilita = Math.floor(Math.random() * 10000000).toString();

    // Add INPS logo placeholder (in production, use actual logo)
    doc.setFillColor(0, 84, 159);
    doc.rect(20, 10, 30, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('INPS', 35, 20, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Header info - right side
    doc.setFontSize(10);
    doc.text('SEDE DI: VICENZA', 150, 15);

    // Certificate title
    doc.setFontSize(11);
    doc.text(`CERTIFICATO DI AGIBILITA' N. ${numeroAgibilita}`, 20, 35);
    doc.text(`PROTOCOLLO: ${protocollo}`, 120, 35);

    // Gray box for period
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 40, 180, 20, 'F');
    doc.setFontSize(10);
    doc.text(`Periodo di validità: dal ${formatDate(startDate)} al ${formatDate(endDate)}`, 20, 50);
    doc.text(`Data richiesta di consolidamento: ${dataRichiesta}`, 20, 56);

    // Company section
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('IMPRESA', 20, 70);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Codice Fiscale: 04433920248', 20, 78);
    doc.text('Denominazione: OKL SRL', 100, 78);

    // Legal representative
    doc.setFont(undefined, 'bold');
    doc.text('LEGALE RAPPRESENTANTE', 20, 88);
    doc.setFont(undefined, 'normal');
    doc.text('Codice Fiscale: TMSCST88S22I531L', 20, 96);
    doc.text('Cognome / Nome: TOMASI CRISTIANO', 100, 96);

    // Contributive position
    doc.setFont(undefined, 'bold');
    doc.text('POSIZIONE CONTRIBUTIVA', 20, 106);
    doc.setFont(undefined, 'normal');
    doc.text('Denominazione: OKL SRL', 20, 114);
    doc.text('Matricola: 9112806447', 140, 114);
    doc.text('Via e num.: MONTE PASUBIO, 222/1', 20, 121);
    doc.text('CAP: 36010', 140, 121);
    doc.text('Comune: ZANE\'', 20, 128);
    doc.text('Prov: VI', 140, 128);

    // Footer of first section
    doc.line(15, 135, 195, 135);
    doc.setFontSize(9);
    doc.text(`Data Stampa: ${dataRichiesta} ore: ${oraStampa}`, 20, 142);
    doc.text(`Data richiesta: ${dataRichiesta}`, 120, 142);

    // Director signature
    doc.text('Il Direttore di Sede', 160, 155);
    doc.text('GRAZIANO NUMA', 160, 162);
    doc.setFontSize(8);
    doc.text('Firma autografa omessa ai sensi dell\'art. 3, comma 2 del D. Lgs. n. 39/1993', 105, 175, { align: 'center' });

    // Legend
    doc.setFont(undefined, 'bold');
    doc.text('LEGENDA : Codici Tipo Agibilità', 20, 190);
    doc.setFont(undefined, 'normal');
    doc.text('O - prestazione ordinaria, retribuita e soggetta a obblighi contributivi', 20, 197);
    doc.text('E - lavoratore straniero che versa la contribuzione nel paese di origine', 20, 204);
    doc.text('(es. mod. E101)', 25, 210);
    doc.text('G - prestazione non retribuita priva di obblighi contributivi (es.', 20, 217);
    doc.text('spettacoli di beneficenza)', 25, 223);

    // New page for workers list
    doc.addPage();

    // Header for page 2
    doc.setFillColor(0, 84, 159);
    doc.rect(20, 10, 30, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('INPS', 35, 20, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(10);
    doc.text('SEDE DI: VICENZA', 150, 15);
    doc.text(`CERTIFICATO DI AGIBILITA' N. ${numeroAgibilita}`, 20, 35);
    doc.text(`Periodo di validità: dal ${formatDate(startDate)} al ${formatDate(endDate)}`, 20, 45);

    // Workers table title
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Elenco Lavoratori', 20, 60);
    doc.setFont(undefined, 'normal');

    // Table header
    doc.setFontSize(8);
    const tableTop = 70;
    doc.line(15, tableTop, 195, tableTop);

    // Table columns
    const columns = [
        { text: 'Codice fiscale', x: 16 },
        { text: 'Matricola\nEnpals', x: 45 },
        { text: 'Cognome e nome', x: 65 },
        { text: 'Qual.', x: 105 },
        { text: 'Num.\nGG.', x: 115 },
        { text: 'Periodo occupazione\ndal        al', x: 125 },
        { text: 'Retribuzione', x: 155 },
        { text: 'Tipo\nRetrib.', x: 175 },
        { text: 'Legale\nRapp.', x: 185 },
        { text: 'Tipo\nAgib.', x: 193 }
    ];

    columns.forEach(col => {
        const lines = col.text.split('\n');
        lines.forEach((line, i) => {
            doc.text(line, col.x, tableTop + 6 + (i * 4));
        });
    });

    doc.line(15, tableTop + 14, 195, tableTop + 14);

    // Workers data
    let yPos = tableTop + 22;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    selectedArtists.forEach((artist, index) => {
        const qualificaMap = {
            'DJ': '032',
            'Vocalist': '101',
            'Ballerino/a': '102',
            'Tecnico': '103'
        };

        const dailyCompensation = (artist.compenso / days).toFixed(0);
        const matricolaEnpals = Math.floor(Math.random() * 10000000).toString();

        // Add location info below table
        const localeInfo = `${document.getElementById('descrizioneLocale').value}`;
        const indirizzoInfo = `${document.getElementById('indirizzo').value} ${document.getElementById('cap').value}`;

        // Row data
        doc.text(artist.cf, 16, yPos);
        doc.text(matricolaEnpals, 45, yPos);
        doc.text(`${artist.cognome} ${artist.nome}`.toUpperCase(), 65, yPos);
        doc.text(qualificaMap[artist.ruolo] || '032', 107, yPos);
        doc.text(days.toString(), 117, yPos);
        doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, 125, yPos);
        doc.text(dailyCompensation, 160, yPos);
        doc.text('G', 177, yPos);
        doc.text('N', 187, yPos);
        doc.text('O', 195, yPos);

        // Location info on next line
        yPos += 6;
        doc.text(localeInfo.toUpperCase(), 16, yPos);
        doc.text(indirizzoInfo.toUpperCase(), 100, yPos);

        yPos += 8;

        if (yPos > 270 && index < selectedArtists.length - 1) {
            doc.addPage();
            yPos = 40;
        }
    });

    return doc;
}

// Format date for PDF
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

// Download PDF
function downloadPDF() {
    const pdf = generatePDF();
    pdf.save(`agibilita_${new Date().toISOString().slice(0,10)}.pdf`);
}

// Download and save (updated to include PDF)
function downloadAndSave() {
    const xmlContent = generateXML();

    // Download XML
    downloadXML(xmlContent);

    // Download PDF
    setTimeout(() => {
        downloadPDF();
    }, 500);

    // Save to database
    saveAgibilitaToDatabase(xmlContent);

    document.getElementById('btnConfirm').style.display = 'none';
    document.getElementById('btnNewAgibilita').style.display = 'inline-block';

    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success';
    successMsg.textContent = 'XML e PDF scaricati, agibilità salvata con successo!';
    document.getElementById('tabInvio').insertBefore(successMsg, document.getElementById('tabInvio').firstChild);
}

// Confirm and proceed
function confirmAndProceed() {
    downloadAndSave();
}

// New agibilità
function newAgibilita() {
    clearAllForms();
    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;
    selectedArtists = [];

    document.getElementById('btnConfirm').style.display = 'inline-block';
    document.getElementById('btnNewAgibilita').style.display = 'none';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;

    showSection('tipoSection');
}

// Save draft
function saveDraft() {
    alert('Funzionalità bozza in sviluppo');
}

// Show existing agibilità
function showExistingAgibilita() {
    const listDiv = document.getElementById('agibilitaList');
    listDiv.innerHTML = '';

    if (agibilitaDB.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #6b7280;">Nessuna agibilità trovata</p>';
        return;
    }

    agibilitaDB.forEach(agibilita => {
        const totalCompensation = agibilita.artisti.reduce((sum, a) => sum + (a.compenso || 0), 0);
        const artistsList = agibilita.artisti.map(a => 
            `${a.nome} ${a.cognome} (${a.ruolo})`
        ).join(', ');

        const item = document.createElement('div');
        item.className = 'agibilita-item';
        item.innerHTML = `
            <div class="agibilita-info">
                <div class="agibilita-code">[${agibilita.codice}]</div>
                <div class="agibilita-dates">${agibilita.dataInizio} - ${agibilita.dataFine}</div>
                <div class="agibilita-location">${agibilita.locale.descrizione} - ${agibilita.locale.citta}</div>
                <div class="agibilita-artists">Artisti: ${artistsList} - Totale: €${totalCompensation.toFixed(2)}</div>
            </div>
            <div class="agibilita-actions">
                <button class="btn btn-primary btn-sm" onclick="editAgibilita('${agibilita.codice}')">📝 Modifica</button>
                <button class="btn btn-success btn-sm" onclick="duplicateAgibilita('${agibilita.codice}')">📋 Duplica</button>
                <button class="btn btn-danger btn-sm" onclick="cancelAgibilita('${agibilita.codice}')">❌ Annulla</button>
            </div>
        `;
        listDiv.appendChild(item);
    });
}

// Filter agibilità
function filterAgibilita() {
    const searchTerm = document.getElementById('searchAgibilita').value.toLowerCase();
    const items = document.querySelectorAll('.agibilita-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Edit agibilità
function editAgibilita(codice) {
    const agibilita = agibilitaDB.find(a => a.codice === codice);
    if (!agibilita) return;

    agibilitaData.isModifica = true;
    agibilitaData.codiceAgibilita = codice;

    selectedArtists = [];
    agibilita.artisti.forEach(artData => {
        const artist = artistsDB.find(a => a.cf === artData.cf);
        if (artist) {
            selectedArtists.push({
                ...artist,
                ruolo: artData.ruolo,
                compenso: artData.compenso
            });
        }
    });

    document.getElementById('dataInizio').value = agibilita.dataInizio;
    document.getElementById('dataFine').value = agibilita.dataFine;
    document.getElementById('descrizioneLocale').value = agibilita.locale.descrizione;
    document.getElementById('indirizzo').value = agibilita.locale.indirizzo;
    document.getElementById('citta').value = agibilita.locale.citta;
    document.getElementById('cap').value = agibilita.locale.cap;
    document.getElementById('provincia').value = agibilita.locale.provincia;

    updateArtistsList();
    hideEditSearch();
    showSection('step1');
}

// Duplicate agibilità
function duplicateAgibilita(codice) {
    const agibilita = agibilitaDB.find(a => a.codice === codice);
    if (!agibilita) return;

    agibilitaData.isModifica = false;
    agibilitaData.codiceAgibilita = null;

    selectedArtists = [];
    agibilita.artisti.forEach(artData => {
        const artist = artistsDB.find(a => a.cf === artData.cf);
        if (artist) {
            selectedArtists.push({
                ...artist,
                ruolo: artData.ruolo,
                compenso: artData.compenso
            });
        }
    });

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataInizio').value = today;
    document.getElementById('dataFine').value = '';

    document.getElementById('descrizioneLocale').value = agibilita.locale.descrizione;
    document.getElementById('indirizzo').value = agibilita.locale.indirizzo;
    document.getElementById('citta').value = agibilita.locale.citta;
    document.getElementById('cap').value = agibilita.locale.cap;
    document.getElementById('provincia').value = agibilita.locale.provincia;

    updateArtistsList();
    hideEditSearch();
    showSection('step1');
}

// Cancel agibilità
function cancelAgibilita(codice) {
    if (confirm(`Sei sicuro di voler annullare l'agibilità ${codice}?`)) {
        const index = agibilitaDB.findIndex(a => a.codice === codice);
        if (index !== -1) {
            agibilitaDB.splice(index, 1);
            localStorage.setItem('agibilitaDB', JSON.stringify(agibilitaDB));

            showExistingAgibilita();

            const listDiv = document.getElementById('agibilitaList');
            const msg = document.createElement('div');
            msg.className = 'alert alert-success';
            msg.style.marginBottom = '1rem';
            msg.textContent = `Agibilità ${codice} annullata con successo`;
            listDiv.insertBefore(msg, listDiv.firstChild);

            setTimeout(() => msg.remove(), 3000);
        }
    }
}

// Close modal on click outside
window.onclick = function(event) {
    const modal = document.getElementById('addArtistModal');

    if (event.target == modal) {
        closeModal();
    }

    // Close venue dropdown
    if (!event.target.matches('#descrizioneLocale')) {
        document.getElementById('venueDropdown').style.display = 'none';
    }
}