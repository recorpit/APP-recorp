// artist-list.js - Gestione lista artisti selezionati
console.log('📦 Caricamento ArtistList...');

export class ArtistList {
    constructor(stateManager) {
        this.state = stateManager;
        this.selectedArtists = [];
        this.compensiConfermati = new Set();
        
        console.log('📋 ArtistList inizializzato');
        this.setupListeners();
    }
    
    setupListeners() {
        // Listener per eventi di selezione artista
        document.addEventListener('artistSelected', (e) => {
            this.addArtist(e.detail.artist);
        });
        
        // Listener per rimozione artisti
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-remove-artist]')) {
                const index = parseInt(e.target.closest('[data-remove-artist]').getAttribute('data-remove-artist'));
                this.removeArtist(index);
            }
        });
        
        // Listener per aggiornamenti ruolo e compenso
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('artist-role-select')) {
                const index = parseInt(e.target.getAttribute('data-artist-index'));
                this.updateArtistRole(index, e.target.value);
            }
            
            if (e.target.classList.contains('artist-compensation-input')) {
                const index = parseInt(e.target.getAttribute('data-artist-index'));
                this.updateArtistCompensation(index, e.target.value);
            }
        });
    }
    
    addArtist(artist) {
        console.log(`➕ Aggiungendo artista: ${artist.nome} ${artist.cognome}`);
        
        // Verifica se già presente
        const existingIndex = this.selectedArtists.findIndex(a => 
            (a.codice_fiscale && a.codice_fiscale === artist.codice_fiscale) ||
            (a.codice_fiscale_temp && a.codice_fiscale_temp === artist.codice_fiscale_temp) ||
            a.id === artist.id
        );
        
        if (existingIndex !== -1) {
            console.warn('⚠️ Artista già presente nella lista');
            this.showToast('Questo artista è già stato aggiunto!', 'warning');
            return false;
        }
        
        // Prepara dati artista con defaults
        const artistWithDefaults = {
            ...artist,
            ruolo: this.mapMansioneToRuolo(artist.mansione),
            compenso: 0,
            tipoRapporto: this.determineTipoRapporto(artist),
            matricolaEnpals: artist.matricola_enpals || this.generateMatricolaEnpals()
        };
        
        this.selectedArtists.push(artistWithDefaults);
        
        // Aggiorna stato globale
        this.state.set('selectedArtists', this.selectedArtists);
        
        // Aggiorna UI
        this.updateDisplay();
        
        console.log(`✅ Artista aggiunto: ${artist.nome} ${artist.cognome}`);
        this.showToast(`${artist.nome} ${artist.cognome} aggiunto alla lista`, 'success');
        
        return true;
    }
    
    removeArtist(index) {
        if (index < 0 || index >= this.selectedArtists.length) {
            console.warn(`⚠️ Indice non valido: ${index}`);
            return;
        }
        
        const removedArtist = this.selectedArtists.splice(index, 1)[0];
        
        // Rimuovi conferma compenso se presente
        const artistKey = `${removedArtist.codice_fiscale}-${index}`;
        this.compensiConfermati.delete(artistKey);
        
        // Aggiorna stato globale
        this.state.set('selectedArtists', this.selectedArtists);
        
        // Aggiorna UI
        this.updateDisplay();
        
        console.log(`🗑️ Artista rimosso: ${removedArtist.nome} ${removedArtist.cognome}`);
        this.showToast(`${removedArtist.nome} ${removedArtist.cognome} rimosso dalla lista`, 'info');
    }
    
    updateArtistRole(index, role) {
        if (this.selectedArtists[index]) {
            const oldRole = this.selectedArtists[index].ruolo;
            this.selectedArtists[index].ruolo = role;
            
            // Aggiorna stato
            this.state.set('selectedArtists', this.selectedArtists);
            
            // Aggiorna pulsante avanti
            this.updateProceedButton();
            
            console.log(`🎭 Ruolo aggiornato per artista ${index}: ${oldRole} → ${role}`);
        }
    }
    
    updateArtistCompensation(index, value) {
        if (this.selectedArtists[index]) {
            const artist = this.selectedArtists[index];
            const oldValue = artist.compenso;
            artist.compenso = parseFloat(value) || 0;
            
            // Se il valore è cambiato, rimuovi la conferma precedente
            if (oldValue !== artist.compenso) {
                const artistKey = `${artist.codice_fiscale}-${index}`;
                this.compensiConfermati.delete(artistKey);
            }
            
            // Aggiorna stato
            this.state.set('selectedArtists', this.selectedArtists);
            
            // Aggiorna summary
            this.updateSummary();
            
            console.log(`💰 Compenso aggiornato per artista ${index}: €${oldValue} → €${artist.compenso}`);
        }
    }
    
    updateDisplay() {
        const listContainer = document.getElementById('artistList');
        if (!listContainer) {
            console.warn('⚠️ Container artistList non trovato');
            return;
        }
        
        if (this.selectedArtists.length === 0) {
            this.showEmptyState(listContainer);
            return;
        }
        
        const artistsHTML = this.selectedArtists.map((artist, index) => this.createArtistHTML(artist, index)).join('');
        listContainer.innerHTML = artistsHTML;
        
        this.updateSummary();
        this.updateProceedButton();
        
        console.log(`🔄 Lista aggiornata: ${this.selectedArtists.length} artisti`);
    }
    
    createArtistHTML(artist, index) {
        const isAChiamata = artist.tipoRapporto === 'chiamata';
        const identificativo = artist.codice_fiscale || artist.codice_fiscale_temp || 'NO-ID';
        const nazionalitaLabel = artist.nazionalita !== 'IT' ? ` 🌍 ${artist.nazionalita}` : '';
        
        return `
            <div class="artist-item ${isAChiamata ? 'artist-chiamata' : ''}" 
                 style="border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; ${isAChiamata ? 'border-left: 4px solid #ffc107;' : ''}">
                
                <div class="artist-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <strong style="font-size: 1.1rem;">${artist.nome} ${artist.cognome}${artist.nome_arte ? ' - ' + artist.nome_arte : ''}${nazionalitaLabel}</strong><br>
                        <small style="color: #666;">CF: ${identificativo}</small>
                        ${artist.matricolaEnpals ? `<br><small style="color: #666;">Matricola ENPALS: ${artist.matricolaEnpals}</small>` : ''}
                    </div>
                    <span class="tipo-rapporto-badge" style="background: ${this.getTipoRapportoColor(artist.tipoRapporto)}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">
                        ${this.getTipoRapportoLabel(artist.tipoRapporto)}
                    </span>
                </div>
                
                <div class="artist-controls" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: center;">
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 0.25rem;">Ruolo</label>
                        <select class="form-control artist-role-select" 
                                data-artist-index="${index}" 
                                style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid #ced4da; border-radius: 0.375rem;">
                            <option value="">Seleziona ruolo...</option>
                            <option value="DJ" ${artist.ruolo === 'DJ' ? 'selected' : ''}>DJ (032)</option>
                            <option value="Vocalist" ${artist.ruolo === 'Vocalist' ? 'selected' : ''}>Vocalist (031)</option>
                            <option value="Musicista" ${artist.ruolo === 'Musicista' ? 'selected' : ''}>Musicista (030)</option>
                            <option value="Cantante" ${artist.ruolo === 'Cantante' ? 'selected' : ''}>Cantante (033)</option>
                            <option value="Ballerino/a" ${artist.ruolo === 'Ballerino/a' ? 'selected' : ''}>Ballerino/a (092)</option>
                            <option value="Performer" ${artist.ruolo === 'Performer' ? 'selected' : ''}>Performer (090)</option>
                            <option value="Animatore" ${artist.ruolo === 'Animatore' ? 'selected' : ''}>Animatore (091)</option>
                            <option value="Tecnico Audio" ${artist.ruolo === 'Tecnico Audio' ? 'selected' : ''}>Tecnico Audio (117)</option>
                            <option value="Tecnico Luci" ${artist.ruolo === 'Tecnico Luci' ? 'selected' : ''}>Tecnico Luci (118)</option>
                            <option value="Fotografo" ${artist.ruolo === 'Fotografo' ? 'selected' : ''}>Fotografo (126)</option>
                            <option value="Videomaker" ${artist.ruolo === 'Videomaker' ? 'selected' : ''}>Videomaker (127)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 0.25rem;">Compenso €</label>
                        <input type="number" 
                               class="form-control artist-compensation-input" 
                               data-artist-index="${index}"
                               placeholder="0.00" 
                               value="${artist.compenso || ''}" 
                               min="0" 
                               step="0.01"
                               style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid #ced4da; border-radius: 0.375rem;">
                    </div>
                    
                    <button class="btn btn-danger btn-sm" 
                            data-remove-artist="${index}"
                            style="background: #dc3545; color: white; border: none; padding: 0.375rem 0.75rem; border-radius: 0.375rem; cursor: pointer;">
                        🗑️ Rimuovi
                    </button>
                </div>
                
                ${isAChiamata && artist.codice_comunicazione ? `
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fff3cd; border-radius: 4px;">
                        <small style="color: #856404;">📞 Cod. INPS Comunicazione: ${artist.codice_comunicazione}</small>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    showEmptyState(container) {
        container.innerHTML = `
            <div class="alert alert-warning" style="text-align: center; padding: 2rem; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👤</div>
                <h4>Nessun artista selezionato</h4>
                <p>Clicca su "Aggiungi Artista" per iniziare a comporre la tua lista.</p>
                <button class="btn btn-primary" onclick="window.showAddArtistModal ? window.showAddArtistModal() : console.log('Modal non disponibile')"
                        style="background: #007bff; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">
                    ➕ Aggiungi Primo Artista
                </button>
            </div>
        `;
        
        // Nascondi summary e pulsante avanti
        this.hideSummaryAndButton();
    }
    
    updateSummary() {
        const totalArtists = this.selectedArtists.length;
        const totalCompensation = this.selectedArtists.reduce((sum, artist) => sum + (artist.compenso || 0), 0);
        const artistiAChiamata = this.selectedArtists.filter(a => a.tipoRapporto === 'chiamata').length;
        
        // Aggiorna contatori
        const totalArtistsElement = document.getElementById('totalArtists');
        if (totalArtistsElement) {
            totalArtistsElement.textContent = totalArtists;
        }
        
        const totalCompensationElement = document.getElementById('totalCompensation');
        if (totalCompensationElement) {
            totalCompensationElement.textContent = totalCompensation.toFixed(2);
        }
        
        // Mostra/nascondi summary box
        const summaryBox = document.getElementById('summaryBox');
        if (summaryBox) {
            summaryBox.style.display = totalArtists > 0 ? 'block' : 'none';
            
            // Aggiungi info artisti a chiamata se presenti
            if (artistiAChiamata > 0) {
                const existingInfo = summaryBox.querySelector('.chiamata-info');
                if (!existingInfo) {
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'chiamata-info';
                    infoDiv.innerHTML = `<p style="color: #856404; font-size: 0.9rem; margin-top: 0.5rem;">📞 ${artistiAChiamata} artisti con contratto a chiamata</p>`;
                    summaryBox.appendChild(infoDiv);
                }
            } else {
                const existingInfo = summaryBox.querySelector('.chiamata-info');
                if (existingInfo) {
                    existingInfo.remove();
                }
            }
        }
    }
    
    updateProceedButton() {
        const canProceed = this.selectedArtists.length > 0 && 
                          this.selectedArtists.every(a => a.ruolo);
        
        const btnNext = document.getElementById('btnNext1');
        if (btnNext) {
            btnNext.style.display = canProceed ? 'inline-block' : 'none';
        }
    }
    
    hideSummaryAndButton() {
        const summaryBox = document.getElementById('summaryBox');
        if (summaryBox) {
            summaryBox.style.display = 'none';
        }
        
        const btnNext = document.getElementById('btnNext1');
        if (btnNext) {
            btnNext.style.display = 'none';
        }
    }
    
    // === UTILITY METHODS ===
    
    mapMansioneToRuolo(mansione) {
        const mansioneToRuoloMap = {
            'DJ': 'DJ',
            'Vocalist': 'Vocalist',
            'Musicista': 'Musicista',
            'Cantante': 'Cantante',
            'Ballerino': 'Ballerino/a',
            'Ballerina': 'Ballerino/a',
            'Performer': 'Performer',
            'Animatore': 'Animatore',
            'Tecnico Audio': 'Tecnico Audio',
            'Tecnico Luci': 'Tecnico Luci',
            'Fotografo': 'Fotografo',
            'Videomaker': 'Videomaker'
        };
        
        return mansioneToRuoloMap[mansione] || '';
    }
    
    determineTipoRapporto(artist) {
        if (artist.has_partita_iva) {
            return 'partitaiva';
        } else if (artist.tipo_rapporto === 'Contratto a chiamata') {
            return 'chiamata';
        } else {
            return 'occasionale';
        }
    }
    
    getTipoRapportoLabel(tipo) {
        const labels = {
            'partitaiva': 'P.IVA',
            'occasionale': 'Prestazione Occasionale',
            'chiamata': 'Contratto a Chiamata',
            'fulltime': 'Full Time'
        };
        return labels[tipo] || tipo;
    }
    
    getTipoRapportoColor(tipo) {
        const colors = {
            'partitaiva': '#28a745',
            'occasionale': '#007bff',
            'chiamata': '#ffc107',
            'fulltime': '#17a2b8'
        };
        return colors[tipo] || '#6c757d';
    }
    
    generateMatricolaEnpals() {
        return Math.floor(1000000 + Math.random() * 9000000).toString();
    }
    
    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[TOAST ${type.toUpperCase()}] ${message}`);
        }
    }
    
    // === PUBLIC API ===
    
    getSelectedArtists() {
        return [...this.selectedArtists];
    }
    
    clearAll() {
        this.selectedArtists = [];
        this.compensiConfermati.clear();
        this.state.set('selectedArtists', []);
        this.updateDisplay();
        
        console.log('🧹 Lista artisti svuotata');
    }
    
    getArtistiAChiamata() {
        return this.selectedArtists.filter(artist => 
            artist.tipoRapporto === 'chiamata' || 
            artist.tipo_rapporto === 'Contratto a chiamata'
        );
    }
    
    getTotalCompensation() {
        return this.selectedArtists.reduce((sum, artist) => sum + (artist.compenso || 0), 0);
    }
    
    getListStats() {
        return {
            total: this.selectedArtists.length,
            withRoles: this.selectedArtists.filter(a => a.ruolo).length,
            aChiamata: this.getArtistiAChiamata().length,
            totalCompensation: this.getTotalCompensation(),
            canProceed: this.selectedArtists.length > 0 && this.selectedArtists.every(a => a.ruolo)
        };
    }
}

export default ArtistList;