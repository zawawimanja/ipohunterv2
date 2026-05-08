let ipoData = [];
let currentStage = 1;
let currentGrade = 'all';
let currentYear = 'all';
let currentSearch = '';
let currentSort = 'newest';

// Load data from inline script (works with file:// protocol)
function initializeData() {
    try {
        // Step 1: Start with enrichment data from data.js
        if (typeof IPO_DATA !== 'undefined') {
            console.log('DEBUG: Initializing with ' + IPO_DATA.length + ' items from data.js');
            const stage4Count = IPO_DATA.filter(i => i.stage === 4).length;
            console.log('DEBUG: Items in Stage 4 in data.js: ' + stage4Count);
            ipoData = JSON.parse(JSON.stringify(IPO_DATA)); 
        }

        // Step 2: Show initial state
        renderIPOs(currentStage);

        console.log('Sync Engine: Ready (Manual trigger only)');
        
        // Disable auto-sync on load to prevent CORS errors. 
        // User can still click "Force Refresh" if they need it.
        // fetchLiveUpdates(); 
        
    } catch(e) {
        console.error('Failed to initialize:', e);
    }
}

async function fetchLiveUpdates() {
    const proxy = 'https://api.allorigins.win/get?url=';
    const endpoints = {
        upcoming: 'https://www.isaham.my/ipo',
        stats: 'https://www.isaham.my/ipo/statistics',
        miti: 'https://www.isaham.my/ipo/miti'
    };

    const timeHeader = document.getElementById('update-time');
    if(timeHeader) timeHeader.innerHTML = `<span style="color:var(--primary-light);">Syncing with Bursa (v1.0.2)...</span>`;

    try {
        const [upRes, statRes, mitiRes] = await Promise.all([
            fetch(proxy + encodeURIComponent(endpoints.upcoming)).then(r => r.json()),
            fetch(proxy + encodeURIComponent(endpoints.stats)).then(r => r.json()),
            fetch(proxy + encodeURIComponent(endpoints.miti)).then(r => r.json())
        ]);

        const parser = new DOMParser();
        let liveIpos = [];

        // 1. Parse Stage 4: Statistics (Listed)
        if (statRes.contents) {
            const doc = parser.parseFromString(statRes.contents, 'text/html');
            const rows = doc.querySelectorAll('table tbody tr');
            rows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if (cols.length >= 7) {
                    const name = cols[0].innerText.trim();
                    const open = parseFloat(cols[3].innerText);
                    const close = parseFloat(cols[6].innerText);
                    const ipoPrice = parseFloat(cols[2].innerText);
                    const year = cols[1].innerText.trim().split('-').pop();

                    liveIpos.push({
                        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        companyName: name,
                        stage: 5,
                        price: ipoPrice,
                        openPrice: open,
                        currentPrice: close,
                        closePrice: close,
                        year: parseInt(year) || 2026,
                        status: 'Listed'
                    });
                }
            });
        }

        // 2. Parse Stage 3: Upcoming (Application Open)
        if (upRes.contents) {
            const doc = parser.parseFromString(upRes.contents, 'text/html');
            const cards = doc.querySelectorAll('.f-ipo-card');
            cards.forEach(card => {
                const title = card.querySelector('.card-title')?.innerText.trim() || '';
                const titleParts = title.split('|');
                const symbol = titleParts[0].trim();
                const name = titleParts[1] ? titleParts[1].trim() : symbol;
                
                let market = '', price = 0, closingDate = '', listingDate = '', shariah = false;
                const details = card.querySelectorAll('span.font-weight-bold');
                details.forEach(span => {
                    const label = span.innerText.toLowerCase();
                    const val = span.nextElementSibling?.innerText.trim() || '';
                    if (label.includes('market')) market = val;
                    if (label.includes('listing price')) price = parseFloat(val);
                    if (label.includes('closing date')) closingDate = val;
                    if (label.includes('listing date')) listingDate = val;
                    if (label.includes('shariah')) shariah = val.toLowerCase().includes('yes');
                });

                liveIpos.push({
                    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    symbol: symbol,
                    companyName: name,
                    market: market.includes('ACE') ? 'ACE Market' : (market.includes('Main') ? 'Main Market' : market),
                    price: price,
                    closingDate: closingDate,
                    listingDate: listingDate,
                    shariah: shariah,
                    stage: 3,
                    status: 'Application Open'
                });
            });
        }

        // 3. Parse Stage 2: MITI and Stage 1: Draft
        if (mitiRes.contents) {
            const doc = parser.parseFromString(mitiRes.contents, 'text/html');
            
            // iSaham uses h5 for company names in the MITI section
            const headers = doc.querySelectorAll('h4, h5');
            let currentSection = '';
            
            headers.forEach(el => {
                const text = el.innerText.trim();
                if (el.tagName.toLowerCase() === 'h4') {
                    if (text.includes('MITI IPO') || text.includes('Upcoming Listing')) currentSection = 'MITI';
                    else if (text.includes('Future IPO')) currentSection = 'Draft';
                } else if (el.tagName.toLowerCase() === 'h5' && currentSection) {
                    const name = text;
                    const stage = currentSection === 'MITI' ? 2 : 1;
                    const status = currentSection === 'MITI' ? 'MITI Stage' : 'Draft / Exposure';
                    
                    if (!liveIpos.some(i => i.companyName.toLowerCase().includes(name.toLowerCase().substring(0, 10)))) {
                        liveIpos.push({
                            id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                            companyName: name,
                            stage: stage,
                            status: status,
                            price: 0
                        });
                    }
                }
            });
        }

        // 4. HYBRID MERGE: Combine Live Data with Enrichment Data
        const finalData = liveIpos.map(live => {
            const enrichment = IPO_DATA.find(e => {
                const stemLive = live.companyName.toLowerCase().replace(/berhad|bhd|group|holdings/g, '').trim();
                const stemEnrich = e.companyName.toLowerCase().replace(/berhad|bhd|group|holdings|corp/g, '').trim();
                return stemLive.includes(stemEnrich) || stemEnrich.includes(stemLive);
            });

            if (enrichment) {
                // IMPORTANT: Ensure the manual enrichment data's companyName is preserved if it's more descriptive
                return { 
                    ...enrichment, 
                    ...live, 
                    companyName: enrichment.companyName, // Keep the nice manual name
                    stage: enrichment.stage === 5 ? 5 : live.stage, 
                    closingDate: live.closingDate || enrichment.closingDate,
                    listingDate: live.listingDate || enrichment.listingDate,
                    currentPrice: live.currentPrice || enrichment.currentPrice 
                };
            }
            return live;
        });

        // Add leftovers from IPO_DATA that weren't in the live scrape
        IPO_DATA.forEach(e => {
            const alreadyIn = finalData.some(f => {
                const stemF = f.companyName.toLowerCase().replace(/berhad|bhd|group|holdings/g, '').trim();
                const stemE = e.companyName.toLowerCase().replace(/berhad|bhd|group|holdings|corp/g, '').trim();
                return stemF.includes(stemE) || stemE.includes(stemF);
            });
            if (!alreadyIn) {
                finalData.push(e);
            }
        });

        const now = new Date();
        const today = new Date();
        today.setHours(0,0,0,0);

        // Robust date parser - handles all formats from iSaham and data.js
        // "08-May-2026", "13-Feb-2026", "2026-05-08", "08 May 2026", "06 May", ISO strings
        function parseFlexDate(str) {
            if (!str) return null;
            // Already a valid ISO/JS date string like "2026-05-08" or "2026-05-08T17:00:00"
            const iso = new Date(str);
            if (!isNaN(iso.getTime())) return iso;
            // Handle "08-May-2026" or "13-Feb-2026" (DD-MMM-YYYY)
            const dashMonth = str.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
            if (dashMonth) return new Date(`${dashMonth[2]} ${dashMonth[1]}, ${dashMonth[3]}`);
            // Handle "08 May 2026" (DD MMM YYYY) - iSaham format
            const fullDate = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
            if (fullDate) return new Date(`${fullDate[2]} ${fullDate[1]}, ${fullDate[3]}`);
            // Handle "06 May" (no year — assume current year)
            const shortMonth = str.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
            if (shortMonth) return new Date(`${shortMonth[2]} ${shortMonth[1]}, ${new Date().getFullYear()}`);
            return null;
        }

        finalData.forEach(ipo => {
            // Skip auto-promotion if manually set to Stage 5 (Listed)
            if (ipo.stage === 5) return;
            
            if (ipo.year && ipo.year < 2026) {
                ipo.stage = 5;
                ipo.status = 'Listed';
            }

            if (ipo.stage >= 3) {
                // Auto-promote to Listed if listingDate has passed
                if (ipo.listingDate) {
                    const listDate = parseFlexDate(ipo.listingDate);
                    if (listDate) {
                        listDate.setHours(0, 0, 0, 0);
                        if (listDate <= today) {
                            ipo.stage = 5;
                            ipo.status = 'Listed';
                        } else if (ipo.closingDate) {
                            const closeDate = parseFlexDate(ipo.closingDate);
                            if (closeDate && closeDate < now) {
                                ipo.stage = 4;
                                ipo.status = 'Pre-Listing';
                            } else if (closeDate) {
                                ipo.stage = 3;
                                ipo.status = 'Application Open';
                            }
                        }
                    }
                } else if (ipo.closingDate) {
                    const closeDate = parseFlexDate(ipo.closingDate);
                    if (closeDate && closeDate < now) {
                        ipo.stage = 4;
                        ipo.status = 'Pre-Listing';
                    }
                }
            }
        });

        // 6. NOTIFICATION SYSTEM: Detect New Listings
        if (ipoData.length > 0) {
            const currentIds = new Set(ipoData.map(i => i.id));
            const newIpos = finalData.filter(f => !currentIds.has(f.id));
            if (newIpos.length > 0) {
                console.log('🔔 New IPOs detected!', newIpos);
                playNotificationSound();
                showToast(`New IPO Detected: ${newIpos[0].companyName}`);
            }
        }

        // Restore any local persistence
        const savedPrices = JSON.parse(localStorage.getItem('ipo_live_prices') || '{}');
        const huntedData = JSON.parse(localStorage.getItem('ipo_hunted_data') || '{}');

        finalData.forEach(ipo => {
            if (savedPrices[ipo.id]) {
                ipo.currentPrice = savedPrices[ipo.id].currentPrice || ipo.currentPrice;
            }
            if (huntedData[ipo.id]) {
                ipo.os = huntedData[ipo.id].os || ipo.os;
                ipo.avgTP = huntedData[ipo.id].avgTP || ipo.avgTP;
                ipo.pe = huntedData[ipo.id].pe || ipo.pe;
                ipo.research = huntedData[ipo.id].research || ipo.research;
            }
        });

        ipoData = finalData;
        renderIPOs(currentStage);
        
        // Trigger deep sync for missing OS/TP
        triggerDeepSync();
        
        const timeStr = new Date().toLocaleTimeString();
        if(timeHeader) timeHeader.innerHTML = `<span style="color:#10b981; font-weight:bold;">LIVE SYNCED (${timeStr})</span>`;

    } catch (e) {
        console.error('Fetch failed:', e);
        if(timeHeader) timeHeader.innerHTML = `<span style="color:#ef4444;">Offline Mode</span>`;
    }
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.warn('Audio play failed', e);
    }
}

function showToast(message) {
    let toast = document.getElementById('ipo-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ipo-toast';
        toast.style.cssText = `
            position: fixed; bottom: 2rem; right: 2rem; 
            background: var(--primary); color: white; 
            padding: 1rem 2rem; border-radius: 0.5rem; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            z-index: 9999; transform: translateY(100px);
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex; align-items: center; gap: 0.75rem;
            border-left: 4px solid #10b981;
        `;
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `<i data-lucide="bell-ring"></i> <span>${message}</span>`;
    if(typeof lucide !== 'undefined') lucide.createIcons();
toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.transform = 'translateY(150px)';
    }, 5000);
}

async function triggerDeepSync() {
    const missing = ipoData.filter(ipo => ipo.stage >= 3 && (!ipo.os || !ipo.avgTP));
    if (missing.length === 0) return;
    
    console.log(`Deep Hunter: Probing ${missing.length} IPOs for missing data...`);
    
    // Process in batches of 3 to avoid rate limiting
    for (let i = 0; i < missing.length; i += 3) {
        const batch = missing.slice(i, i + 3);
        await Promise.all(batch.map(ipo => autoHuntData(ipo)));
    }
}

// --- SYNC HUB UI ---
function openSyncHub() {
    const hub = document.createElement('div');
    hub.id = 'sync-hub-modal';
    hub.className = 'modal-overlay';
    hub.innerHTML = `
        <div class="modal-content glass-card" style="max-width: 600px; padding: 2.5rem; border: 1px solid rgba(16, 185, 129, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: #10b981; padding: 0.5rem; border-radius: 0.5rem; color: white;">
                        <i data-lucide="refresh-cw"></i>
                    </div>
                    <h2 style="margin: 0;">Hunter <span>Sync Hub</span></h2>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" class="close-btn">&times;</button>
            </div>
            
            <div style="display: grid; gap: 1.5rem; margin-bottom: 2rem;">
                <div class="sync-item" id="sync-draft">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Stage 1: Draft / Exposure</span>
                        <span class="status-label">Checking...</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
                <div class="sync-item" id="sync-miti">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Stage 2: MITI Applications</span>
                        <span class="status-label">Checking...</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
                <div class="sync-item" id="sync-public">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Stage 3: Public Subscription</span>
                        <span class="status-label">Checking...</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
                <div class="sync-item" id="sync-deep">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Deep Hunter: OS & Fair Value</span>
                        <span class="status-label">Ready</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
                </div>
            </div>

            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 1rem; border-radius: 0.75rem; font-size: 0.85rem; color: #f59e0b; margin-bottom: 2rem;">
                <i data-lucide="info" style="width: 16px; display: inline-block; vertical-align: middle;"></i>
                <strong>Note:</strong> Browser sync updates the UI temporarily. Run <code>node sync-isaham.js</code> in your terminal for permanent file updates.
            </div>

            <button onclick="runMasterSync(this)" class="btn-moomoo hero-cta" style="width: 100%; height: 3.5rem; font-size: 1.1rem;">
                <i data-lucide="zap"></i> Start Full Online Sync
            </button>
        </div>
    `;
    document.body.appendChild(hub);
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

async function runMasterSync(btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Syncing...`;
    if(typeof lucide !== 'undefined') lucide.createIcons();

    const stages = ['sync-draft', 'sync-miti', 'sync-public', 'sync-deep'];
    
    for (const id of stages) {
        const item = document.getElementById(id);
        item.querySelector('.status-label').innerText = 'Syncing...';
        item.querySelector('.progress').style.width = '50%';
        item.querySelector('.progress').style.background = '#6366f1';
        
        // Small delay to feel real
        await new Promise(r => setTimeout(r, 800));
        
        if (id === 'sync-deep') {
            await triggerDeepSync();
        } else {
            await fetchLiveUpdates();
        }

        item.querySelector('.status-label').innerText = 'Completed';
        item.querySelector('.progress').style.width = '100%';
        item.querySelector('.progress').style.background = '#10b981';
    }

    btn.innerHTML = `<i data-lucide="check-circle"></i> Sync Complete!`;
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="zap"></i> Start Full Online Sync`;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }, 3000);
}

async function autoHuntData(ipo) {
    if (!ipo.companyName) return;
    
    const proxy = 'https://api.allorigins.win/get?url=';
    const stem = ipo.companyName.toLowerCase().replace(/berhad|bhd|group|holdings/g, '').trim().replace(/\s+/g, '-');
    const ticker = ipo.symbol ? ipo.symbol.toLowerCase() : stem;
    
    const urls = [
        `https://www.isaham.my/ipo/${stem}`,
        `https://www.isaham.my/ipo-insights/${stem}`,
        `https://www.isaham.my/stock/${ticker}/insights`
    ];
    
    console.log(`🚀 Deep Hunter probing for ${ipo.companyName}...`);
    
    for (const url of urls) {
        try {
            const res = await fetch(proxy + encodeURIComponent(url));
            const json = await res.json();
            if (!json.contents) continue;

            const html = json.contents;
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const text = doc.body.innerText;

            // 1. Hunt for OS (Oversubscription)
            if (!ipo.os || ipo.os === 0) {
                const osMatch = text.match(/Oversubscription rate:\s*(\d+\.\d+)x/i) || 
                              text.match(/subscribed by\s*(\d+\.\d+)\s*times/i) ||
                              text.match(/OS Rate:\s*(\d+\.\d+)/i);
                if (osMatch) {
                    ipo.os = parseFloat(osMatch[1]);
                    ipo.isAutoOS = true;
                    console.log(`✨ OS Found: ${ipo.os}x for ${ipo.id}`);
                }
            }

            // 2. Hunt for Target Price / Fair Value
            const tpPatterns = [
                /Fair Value\s*(?:of|is|at)?\s*RM\s*(\d+\.\d+)/i,
                /Target Price\s*(?:of|is|at)?\s*RM\s*(\d+\.\d+)/i,
                /Average Target Price:\s*RM\s*(\d+\.\d+)/i,
                /FV\s*(?:of|is|at)?\s*RM\s*(\d+\.\d+)/i
            ];

            let foundTP = null;
            for (const pattern of tpPatterns) {
                const match = text.match(pattern);
                if (match) {
                    foundTP = parseFloat(match[1]);
                    break;
                }
            }

            if (foundTP && (!ipo.avgTP || ipo.avgTP === 0)) {
                ipo.avgTP = foundTP;
                ipo.isAutoTP = true;
                if (!ipo.research) ipo.research = [];
                
                const analystEntry = { 
                    house: "iSaham (Auto-Hunt)", 
                    tp: foundTP, 
                    view: "Auto-Detected Value", 
                    img: "https://www.isaham.my/img/logo-isaham.png",
                    isAuto: true 
                };

                if (!ipo.research.some(r => r.house === analystEntry.house)) {
                    ipo.research.push(analystEntry);
                }
                console.log(`✨ TP Found: RM ${foundTP} for ${ipo.id}`);
            }

            // 3. Hunt for P/E Ratio
            if (!ipo.pe || ipo.pe === 0) {
                const peMatch = text.match(/P\/E Ratio:\s*(\d+\.\d+)/i) || text.match(/PE:\s*(\d+\.\d+)/i);
                if (peMatch) {
                    ipo.pe = parseFloat(peMatch[1]);
                    ipo.isAutoPE = true;
                    console.log(`✨ PE Found: ${ipo.pe} for ${ipo.id}`);
                }
            }

            // Sync with Persistence
            const savedData = JSON.parse(localStorage.getItem('ipo_hunted_data') || '{}');
            savedData[ipo.id] = {
                os: ipo.os,
                avgTP: ipo.avgTP,
                pe: ipo.pe,
                research: ipo.research,
                isAutoOS: ipo.isAutoOS,
                isAutoTP: ipo.isAutoTP,
                isAutoPE: ipo.isAutoPE
            };
            localStorage.setItem('ipo_hunted_data', JSON.stringify(savedData));

        } catch (e) {
            console.warn(`Deep hunt failed for ${url}`, e);
        }
    }
    
    // Refresh UI if data was found
    renderIPOs(currentStage);
}

// Global Trigger: Run deep hunt on any Stage 3 or 4 IPO missing OS/TP
function triggerDeepSync() {
    console.log('🔍 Starting Global Deep Sync...');
    ipoData.forEach(ipo => {
        if ((ipo.stage === 3 || ipo.stage === 5) && (!ipo.os || !ipo.avgTP)) {
            autoHuntData(ipo);
        }
    });
}


const ipoGrid = document.getElementById('ipo-grid');
const tabBtns = document.querySelectorAll('.tab-btn');

// Helper: compute opening performance dynamically
function getOpenPerformance(ipo) {
    if (!ipo.openPrice || !ipo.price || ipo.price === 0) return 0;
    return ((ipo.openPrice - ipo.price) / ipo.price) * 100;
}

function getOpenPerfString(ipo) {
    const perf = getOpenPerformance(ipo);
    return (perf >= 0 ? '+' : '') + perf.toFixed(1) + '%';
}

// Helper: tolerance-based float comparison
function floatEquals(a, b, tolerance = 0.005) {
    return Math.abs(a - b) < tolerance;
}

// Update tab counts
function updateTabCounts() {
    tabBtns.forEach(btn => {
        const stage = parseInt(btn.dataset.stage);
        const count = ipoData.filter(ipo => ipo.stage === stage).length;
        let countEl = btn.querySelector('.tab-count');
        if (!countEl) {
            countEl = document.createElement('span');
            countEl.className = 'tab-count';
            btn.querySelector('.tab-label').appendChild(countEl);
        }
        countEl.textContent = count + ' IPO' + (count !== 1 ? 's' : '');
    });
}

function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated', reason: 'Market classification unknown.' };
    const os = ipo.os || 0;
    const hasOsData = ipo.os !== undefined && ipo.os !== null; 
    const perf = ipo.performance || '';
    const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0;
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();

    const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
    const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
    const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
    
    const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity"];
    const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

    const isHero = heroIBs.some(tier => ib.includes(tier));
    const isTopTier = topTierIBs.some(tier => ib.includes(tier));
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));
    
    const isPositiveOpen = ipo.openPrice && ipo.price && ipo.openPrice > ipo.price;
    const openPremium = (ipo.openPrice && ipo.price) ? ((ipo.openPrice - ipo.price) / ipo.price) * 100 : 0;
    const isStrongGreen = openPremium >= 5.0;
    const isFlat = ipo.openPrice && ipo.price && floatEquals(ipo.openPrice, ipo.price);
    const isHighPE = pe > 18.0;
    const isAttractivePE = pe > 0 && pe < 12.0;
    const isRed = perf.includes('-');

    if (ipo.stage < 5 && os === 0) {
        // Calculate Pre-OS Grade
        let score = 0;
        if (isHero) score += 40;
        else if (isTopTier) score += 30;
        else if (isMomentum) score += 20;
        
        if (isTrendingSector) score += 30;
        if (isExpansionFund) score += 20;
        
        if (ipo.market === 'Main Market') score += 10;
        else if (ipo.market === 'ACE Market') score += 5;

        let predGrade = 'C';
        if (score >= 70) predGrade = 'A';
        else if (score >= 40) predGrade = 'B';

        // Special case for Automation
        if (sector.includes('automation') && predGrade === 'B') {
            return { 
                grade: `Pred: B`, 
                reason: `<b>Pre-OS Grade B</b> (Score: ${score})<br>💡 Note: If classified as Tech/Semi, jumps to Grade A.<br>⏳ Waiting for OS data.` 
            };
        }

        return { 
            grade: `Pred: ${predGrade}`, 
            reason: `<b>Pre-OS Grade ${predGrade}</b> (Score: ${score}/100)<br>⏳ Waiting for OS data.` 
        };
    }
    
    // Stage 3 & 4 - Subscription Results In
    if ((ipo.stage === 3 || ipo.stage === 4) && os > 0) {
        if (ipo.market === 'Main Market') {
            const isTopIB = heroIBs.some(tier => ib.includes(tier));
            if (os >= 20 && isTopIB) return { grade: 'A', reason: '<b>Grade A (The Giants):</b><br>🚀 Institutional interest (OS > 20x)<br>🏛️ Top-tier IB backing' };
            if (os >= 20) return { grade: 'B', reason: '<b>Strong Demand:</b><br>✅ Institutional interest (OS > 20x)' };
            if (os >= 5) return { grade: 'B', reason: '<b>Moderate Interest:</b><br>✅ Main Market stability' };
            return { grade: 'C', reason: '<b>Low Momentum:</b><br>⚠️ Low subscription interest' };
        }

        if (ipo.market === 'ACE Market') {
            const reasonParts = [];
            if (os >= 50) reasonParts.push(`🚀 Exceptional Demand (${os}x)`);
            else if (os >= 20) reasonParts.push(`✅ High Demand (${os}x)`);
            else reasonParts.push(`⚠️ Low Demand (${os}x)`);

            if (isMomentum || isTopTier || isHero) reasonParts.push(`⚡ ${ipo.ib} (Momentum IB)`);
            if (isTrendingSector) reasonParts.push(`🔥 Trending Sector (${ipo.sector})`);
            if (isAttractivePE) reasonParts.push(`💎 Attractive P/E (${pe}x)`);
            if (isExpansionFund) reasonParts.push(`📈 Expansion Fund Use`);

            if (os >= 20) return { grade: 'B', reason: reasonParts.join('<br>') };
            return { grade: 'C', reason: '<b>Low Momentum:</b><br>⚠️ Low oversubscription (< 20x)' };
        }
    }

    if (ipo.market === 'Main Market') {
        if (isHero && (isStrongGreen || isFlat)) return { grade: 'A', reason: '<b>Elite Setup:</b><br>🏛️ Hero IB Support<br>✅ Positive Day 1 Debut' };
        
        if (ipo.stage === 5 && !hasOsData && isStrongGreen) {
            if ((isTopTier || isMomentum) && !isHighPE) return { grade: 'A', reason: '<b>Momentum Setup:</b><br>✅ Strong Open<br>📊 Healthy Valuation' };
            if (pe > 0 && pe < 15 && isStrongGreen) return { grade: 'A', reason: '<b>Value Pick:</b><br>💎 Low PE (${pe}x)<br>🚀 Strong Momentum' };
        }
        
        if (isHighPE && isRed) return { grade: 'C', reason: '<b>High Risk:</b><br>❌ Expensive Valuation<br>📉 Negative Performance' };
        if (isFlat && !isHero) return { grade: 'C', reason: '<b>Lack of Support:</b><br>⚠️ Flat debut without Hero IB' };
        
        if (isStrongGreen && pe > 0 && pe < 15 && (isTopTier || isMomentum)) return { grade: 'A', reason: '<b>Solid Performance:</b><br>🚀 Strong Debut<br>💎 Attractive PE' };
        
        if (isPositiveOpen && pe > 0 && pe < 15 && (isTopTier || isMomentum || isHero)) return { grade: 'B', reason: '<b>Safe Entry:</b><br>📊 Good Valuation<br>🏛️ Reputable IB' };
        
        if (hasOsData && os < 10 && !isHero && !isStrongGreen) return { grade: 'C', reason: '<b>Weak Setup:</b><br>⚠️ Low Demand<br>❌ Poor Opening' };
        if (isHighPE) return { grade: 'C', reason: '<b>Premium Risk:</b><br>⚠️ PE > 18x' };
        if (isRed) return { grade: 'C', reason: '<b>Sentiment Risk:</b><br>📉 Negative Market Reaction' };
        
        if (os >= 20 && (isTopTier || isHero) && isStrongGreen) return { grade: 'A', reason: '<b>High Demand:</b><br>🚀 OS > 20x<br>🏛️ Strong Support' };
        if (isStrongGreen && !isHighPE) return { grade: 'A', reason: '<b>Positive Debut:</b><br>✅ Healthy setup' };
        return { grade: 'C', reason: '<b>Caution:</b><br>⚠️ Moderate demand/valuation' };
    }

    if (ipo.market === 'ACE Market') {
        const reasonParts = [];
        if (os >= 50) reasonParts.push(`🚀 Exceptional Demand (${os}x)`);
        else if (os >= 20) reasonParts.push(`✅ High Demand (${os}x)`);
        
        if (isMomentum || isTopTier || isHero) reasonParts.push(`⚡ ${ipo.ib} Backing`);
        if (isTrendingSector) reasonParts.push(`🔥 Trending Sector`);
        if (isAttractivePE) reasonParts.push(`💎 Attractive P/E (${pe}x)`);
        if (isExpansionFund) reasonParts.push(`📈 Expansion Fund Use`);
        if (isStrongGreen) reasonParts.push(`🚀 Strong Opening`);

        if (isHero && isStrongGreen && os >= 3) return { grade: 'B', reason: reasonParts.join('<br>') };
        
        if (ipo.stage === 5 && !hasOsData && isStrongGreen) {
            if ((isMomentum || isTopTier || isHero) && !isHighPE) return { grade: 'B', reason: reasonParts.join('<br>') };
        }
        
        if (isHighPE) {
            if (os >= 50 && (isMomentum || isTopTier || isHero)) return { grade: 'B', reason: '<b>Demand Rescue:</b><br>' + reasonParts.join('<br>') };
            if (pe > 28.0) return { grade: 'C', reason: '<b>Extreme Risk:</b><br>❌ PE > 28x' };
            if (os < 20) return { grade: 'C', reason: '<b>Valuation Risk:</b><br>⚠️ High PE + Low Demand' };
        }
        
        if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return { grade: 'B', reason: reasonParts.join('<br>') };
        if (os >= 20 && isStrongGreen) return { grade: 'B', reason: reasonParts.join('<br>') };
        
        if (isFlat && os < 20) return { grade: 'C', reason: '<b>No Momentum:</b><br>⚠️ Flat open + Low Demand' };
        if (hasOsData && os < 10 && !isHero) return { grade: 'C', reason: '<b>Weak Appetite:</b><br>⚠️ Low OS' };
        if (!hasOsData && !isStrongGreen) return { grade: 'C', reason: '<b>Unknown Setup:</b><br>⚠️ Missing data' };
        
        if (isStrongGreen && !isHighPE) return { grade: 'B', reason: reasonParts.join('<br>') };
        return { grade: 'C', reason: '<b>Avoid:</b><br>❌ Lack of momentum' };
    }
    return { grade: 'Unrated', reason: 'Insufficient data for grading.' };
}

function getIpoStrategy(ipo) {
    // Dynamic Strategy Update: If the stock is currently crashing, override the initial strategy
    const holdPerf = (ipo.currentPrice && ipo.price) ? ((ipo.currentPrice - ipo.price) / ipo.price) * 100 : 0;
    if (ipo.stage === 5 && holdPerf < -10) return 'Wait / Exit (Risk)';

    const gradeObj = getIpoGrade(ipo);
    const grade = gradeObj.grade;
    if (grade === 'Pending') return 'Wait for OS';
    
    if (grade === 'C') {
        const perf = ipo.performance || '';
        const isGreenOpen = !perf.includes('-') && ipo.openPrice > ipo.price;
        if (isGreenOpen) return 'Scalp Only';
        return 'Skip / Elak';
    }
    
    if (grade === 'A') {
        const os = ipo.os || 0;
        const hasOsData = ipo.os !== undefined && ipo.os !== null;
        // Grade A with low OS (rescued) is safer for Scalp than Swing
        if (hasOsData && os < 15) return 'Scalp (Take Profit)';
        return 'Swing (Strong Setup)';
    }
    
    if (grade === 'B') {
        const os = ipo.os || 0;
        const pe = ipo.pe || 0;
        const ib = (ipo.ib || '').toLowerCase();
        const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
        const isTopIB = topTierIBs.some(tier => ib.includes(tier));

        if (os > 40 && pe < 15 && isTopIB) return 'Swing (High Conviction)';
        if (os > 20) return 'Scalping (9:00 - 9:30 AM)';
        return 'Scalp Only';
    }
    
    return ipo.strategy || 'N/A';
}

function getBoomPrediction(ipo) {
    if ((ipo.stage !== 3 && ipo.stage !== 4)) return null;

    let score = 0;
    const os = ipo.os || 0;
    const pe = ipo.pe || 0;
    const market = (ipo.market || '').toLowerCase();
    const ib = (ipo.ib || '').toLowerCase();
    const sector = (ipo.sector || '').toLowerCase();
    const insight = (ipo.analystInsight || '').toLowerCase();

    // 1. Oversubscription (OS) - Max 40%
    if (os >= 100) score += 40;
    else if (os >= 50) score += 30;
    else if (os >= 20) score += 15;

    // 2. IB Backing - Max 20%
    const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
    const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
    const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];

    if (heroIBs.some(t => ib.includes(t))) score += 20;
    else if (topTierIBs.some(t => ib.includes(t))) score += 15;
    else if (momentumIBs.some(t => ib.includes(t))) score += 10;

    // 3. Sector Trending - Max 20%
    const trending = ["data centre", "data center", "solar", "ai", "technology", "semiconductor", "renewable", "ev", "digital", "power", "energy", "infrastructure"];
    if (trending.some(s => sector.includes(s) || insight.includes(s))) score += 20;

    // 4. Valuation - Max 20%
    if (pe > 0 && pe < 12) score += 20;
    else if (pe > 0 && pe < 18) score += 10;

    // Market Multiplier
    if (market.includes('ace')) score += 5;
    
    // Final Tweak: Main Market giants are stable but rarely "boom" >100% on day 1
    if (market.includes('main') && score > 70) score = 70;

    score = Math.min(score, 99);

    let label = 'Moderate';
    let color = '#a5b4fc';
    if (score >= 70) { label = 'High (Boom Potential)'; color = '#10b981'; }
    else if (score >= 40) { label = 'Strong Momentum'; color = '#f59e0b'; }
    else if (score < 30) { label = 'Low Confidence'; color = '#ef4444'; }

    return { score, label, color, isPreliminary: os === 0 };
}
function checkMissingListings() {
    const bannerContainer = document.getElementById('reminder-banner-container');
    if (!bannerContainer) return;
    
    const now = new Date();
    // Look for Stage 4 IPOs with a listing date that is <= today, but no openPrice
    const missing = ipoData.filter(ipo => {
        // Must be stage 5 (Listed stage)
        if (ipo.stage === 5 && ipo.listingDate && typeof ipo.openPrice === 'undefined') {
            const listDate = new Date(ipo.listingDate);
            const today = new Date();
            
            // Set both times to midnight for fair comparison
            listDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);

            // Calculate the difference in days
            const diffTime = today - listDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Only alert if the listing was in the last 7 days
            return listDate <= today && diffDays <= 7;
        }
        return false;
    });

    if (missing.length > 0) {
        const names = missing.map(m => m.companyName).join(', ');
        bannerContainer.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-left: 4px solid #ef4444; padding: 1rem 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; margin-top: 2rem;">
                <i data-lucide="alert-triangle" style="color: #ef4444; width: 24px; height: 24px; flex-shrink: 0;"></i>
                <div>
                    <h4 style="color: #ef4444; margin: 0 0 0.25rem 0; font-size: 1.05rem;">Listing Day Action Required!</h4>
                    <p style="margin: 0; color: var(--text-main); font-size: 0.95rem;">Please update the opening price for: <strong>${names}</strong> in <code style="background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px;">data.js</code></p>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        bannerContainer.innerHTML = '';
    }
}


function renderIPOs(stage) {
    ipoGrid.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Fetching real-time data...</p>
        </div>
    `;

    // Update tab counts whenever we render
    if (ipoData.length > 0) updateTabCounts();

    setTimeout(() => {
        try {
            const stageNum = parseInt(currentStage || stage || 1);
            const filtered = ipoData.filter(ipo => ipo.stage === stageNum);

            if (filtered.length === 0) {
                updateIpoCount(0, 0);
                ipoGrid.innerHTML = `
                    <div class="loading-state">
                        <i data-lucide="inbox" style="width: 48px; height: 48px; color: var(--primary-light); margin-bottom: 0.5rem;"></i>
                        <p>No IPOs currently in this stage.</p>
                    </div>
                `;
                if(typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            let displayData = filtered;
            if (typeof currentGrade !== 'undefined' && currentGrade !== 'all') {
                displayData = displayData.filter(ipo => getIpoGrade(ipo).grade === currentGrade);
            }
            
            if (typeof currentYear !== 'undefined' && currentYear !== 'all') {
                displayData = displayData.filter(ipo => ipo.year === parseInt(currentYear));
            }

            if (currentSearch) {
                const searchLower = currentSearch.toLowerCase();
                displayData = displayData.filter(ipo => 
                    ipo.companyName.toLowerCase().includes(searchLower) || 
                    ipo.sector.toLowerCase().includes(searchLower)
                );
            }

            // Sorting Logic — use computed performance for sorting
            displayData.sort((a, b) => {
                if (currentSort === 'performance-desc') {
                    const perfA = getOpenPerformance(a) || -999;
                    const perfB = getOpenPerformance(b) || -999;
                    return perfB - perfA;
                } else if (currentSort === 'performance-asc') {
                    const perfA = getOpenPerformance(a) || 999;
                    const perfB = getOpenPerformance(b) || 999;
                    return perfA - perfB;
                } else if (currentSort === 'name-asc') {
                    return a.companyName.localeCompare(b.companyName);
                } else {
                    if (a.year !== b.year) return b.year - a.year;
                    return (b.id || '').localeCompare(a.id || '');
                }
            });

            // Update IPO count display
            updateIpoCount(displayData.length, filtered.length);

            if (displayData.length === 0) {
                ipoGrid.innerHTML = `
                    <div class="loading-state">
                        <i data-lucide="search-x" style="width: 48px; height: 48px; color: var(--primary-light); margin-bottom: 0.5rem;"></i>
                        <p>No IPOs match the selected filters.</p>
                    </div>
                `;
                if(typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            ipoGrid.innerHTML = `
                <div class="table-responsive" style="width: 100%; overflow-x: auto; grid-column: 1 / -1;">
                    <table class="ipo-table" style="width: 100%; border-collapse: collapse; text-align: left; background: var(--card-bg); backdrop-filter: blur(16px); border: 1px solid var(--glass-border); border-radius: 1rem; overflow: hidden;">
                        <thead style="background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <tr>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">Symbol & Market</th>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">Date</th>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">Demand (OS)</th>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">Price Info</th>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">Performance</th>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">IPO Score</th>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">Analyst Verdict</th>
                                <th style="padding: 1rem; font-weight: 600; color: var(--text-dim); white-space: nowrap;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayData.map((ipo, index) => {
                                try {
                                    return createIPOCard(ipo, index);
                                } catch(cardErr) {
                                    console.error('Error rendering card for:', ipo.companyName, cardErr);
                                    return '';
                                }
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            if(typeof lucide !== 'undefined') lucide.createIcons();
            checkMissingListings();
        } catch(err) {
            console.error('renderIPOs error:', err);
            ipoGrid.innerHTML = `
                <div class="loading-state">
                    <p>Error rendering IPOs. Check console for details.</p>
                </div>
            `;
        }
    }, 400);
}

// IPO count display
function updateIpoCount(showing, total) {
    let countBar = document.getElementById('ipo-count-bar');
    if (!countBar) {
        countBar = document.createElement('div');
        countBar.id = 'ipo-count-bar';
        countBar.className = 'ipo-count-bar';
        ipoGrid.parentNode.insertBefore(countBar, ipoGrid);
    }
    if (total === 0) {
        countBar.innerHTML = '';
        return;
    }
    countBar.innerHTML = `
        <i data-lucide="layout-grid" style="width: 16px; color: var(--primary-light);"></i>
        <span>Showing <strong>${showing}</strong> of <strong>${total}</strong> IPO${total !== 1 ? 's' : ''}</span>
    `;
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function getPredictedGrade(ipo) {
    if (ipo.predictedGrade) return ipo.predictedGrade;
    if (ipo.stage !== 5) return null; // Only show predictions for listed IPOs
    
    // Simulate Stage 3 grading logic to see what it was predicted as
    const tempIpo = { ...ipo, stage: 3 };
    const gradeObj = getIpoGrade(tempIpo);
    
    if (gradeObj && gradeObj.grade && gradeObj.grade !== 'Pending' && gradeObj.grade !== 'Unrated') {
        return gradeObj.grade;
    }
    return null;
}

function createIPOCard(ipo, index = 0) {
    let specificDetails = '';
    const statusClass = ipo.status?.toLowerCase().includes('live') ? 'live' : (ipo.status?.toLowerCase().includes('open') ? 'open' : 'pending');
    const animDelay = Math.min(index * 0.06, 0.6); // staggered animation, cap at 600ms
    const perfString = getOpenPerfString(ipo);
    const perfValue = getOpenPerformance(ipo);

    const gradeObj = getIpoGrade(ipo);
    const grade = gradeObj.grade;
    const prediction = getBoomPrediction(ipo);
    const baseGrade = grade.replace('Pred: ', '');
    const gradeColor = baseGrade === 'A' ? '#10b981' : baseGrade === 'B' ? '#f59e0b' : (baseGrade === 'Pending' ? '#a5b4fc' : '#ef4444');

    let dateDisplay = '<span style="color: var(--text-dim);">TBA</span>';
    if (ipo.stage === 3 || ipo.stage === 4) {
        const closing = ipo.closingDate ? new Date(ipo.closingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBA';
        const listing = ipo.listingDate ? (isNaN(new Date(ipo.listingDate).getTime()) ? ipo.listingDate : new Date(ipo.listingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })) : 'TBA';
        dateDisplay = `
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.8rem;">Last Date: ${closing}</div>
            <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 2px;">Listing: ${listing}</div>
        `;
    } else if (ipo.stage === 5) {
        dateDisplay = ipo.listingDate || ipo.year || 'Listed';
    }

    let priceDisplay = ipo.price > 0 ? 'RM ' + ipo.price.toFixed(2) : 'TBA';
    
    let currentOpenPrice = 'TBA';
    if (ipo.currentPrice) currentOpenPrice = 'RM ' + ipo.currentPrice.toFixed(2);
    else if (ipo.openPrice) currentOpenPrice = 'RM ' + ipo.openPrice.toFixed(2);

    let perfDisplay = '-';
    if (ipo.stage === 5) {
        if (ipo.currentPrice) {
            const holdPerf = ((ipo.currentPrice - ipo.price) / ipo.price * 100);
            const isProfit = holdPerf >= 0;
            const perfColor = isProfit ? '#10b981' : '#ef4444';
            perfDisplay = `<span style="color: ${perfColor}; font-weight: 600;">${holdPerf > 0 ? '+' : ''}${holdPerf.toFixed(1)}%</span>`;
        } else if (ipo.openPrice) {
            perfDisplay = `<span style="color: ${perfValue >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${perfString}</span>`;
        }
    }

    let actionBtn = '';
    if (ipo.stage === 3) {
        actionBtn = `<button onclick="alert('Apply via your Online Banking (e-IPO) menu e.g. Maybank2u, CIMB Clicks, etc.')" class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer; border: none;">Apply Now</button>`;
    } else if (ipo.stage === 2) {
        actionBtn = `<a href="https://sahamonline.miti.gov.my/" target="_blank" class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; text-decoration: none; display: inline-block;">MITI</a>`;
    } else if (ipo.stage === 1) {
        actionBtn = `<button onclick="showDetails('${ipo.id}')" class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer; border: none;">Details</button>`;
    } else {
        actionBtn = `<span style="font-size: 0.8rem; color: var(--text-dim);">${getIpoStrategy(ipo)}</span>`;
    }

    const isSurging = ipo.price > 0 && ipo.avgTP > (ipo.price * 1.5);

    return `
        <tr class="card-animate ipo-table-row" style="animation-delay: ${animDelay}s; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            <td style="padding: 0.75rem 1rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <span class="badge ${ipo.market?.includes('Main') ? 'main-market' : 'ace-market'}" style="padding: 0.15rem 0.4rem; font-size: 0.65rem; min-width: 35px; text-align: center;">${ipo.market === 'Main Market' ? 'MAIN' : 'ACE'}</span>
                    ${isSurging ? '<span class="badge surge-badge" style="padding: 0.15rem 0.4rem; font-size: 0.65rem;"><i data-lucide="flame" style="width: 10px; height: 10px; margin-right: 2px;"></i> HOT SURGE</span>' : ''}
                    ${ipo.outlier ? '<span class="badge outlier-badge" style="padding: 0.15rem 0.4rem; font-size: 0.65rem;"><i data-lucide="zap" style="width: 10px; height: 10px; margin-right: 2px;"></i> Outlier Watch</span>' : ''}
                    <div style="font-weight: 600; font-size: 0.9rem;">${ipo.companyName} ${ipo.shariah ? '<span style="color: #10b981; font-size: 0.75rem;" title="Shariah-Compliant">[S]</span>' : ''}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; margin-top: 0.3rem; color: var(--text-dim); padding-left: 2.8rem;">
                    <span class="status-dot ${statusClass}" style="width: 6px; height: 6px; display: inline-block; border-radius: 50%;"></span>
                    ${ipo.sector} • ${ipo.ib || 'TBA'}
                </div>
            </td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem; color: var(--text-dim); white-space: nowrap;">${dateDisplay}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem; white-space: nowrap;">
                <div style="font-weight: 600; color: ${ipo.os >= 20 ? '#10b981' : 'var(--text-main)'}; display: flex; align-items: center; gap: 0.3rem;">
                    ${ipo.os ? ipo.os.toFixed(1) + 'x' : (ipo.predictedOS ? '<span style="color: var(--accent-primary);">' + ipo.predictedOS + '</span>' : 'TBA')}
                    ${ipo.isAutoOS ? '<i data-lucide="cpu" style="width: 12px; color: #10b981;" title="Auto-Hunted"></i>' : ''}
                </div>
                <div style="font-size: 0.65rem; color: var(--text-dim);">Subscription</div>
            </td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem; white-space: nowrap;">
                <div style="font-weight: 600;">${currentOpenPrice}</div>
                <div style="font-size: 0.65rem; color: var(--text-dim);">IPO: ${priceDisplay}</div>
                ${ipo.highPrice ? `<div style="font-size: 0.65rem; color: #f59e0b; margin-top: 2px;">High: RM ${ipo.highPrice.toFixed(2)}</div>` : ''}
                ${ipo.stage === 3 && ipo.estOpen ? `<div style="font-size: 0.65rem; color: #10b981; margin-top: 2px; font-weight: 600;">Est. Open: RM ${ipo.estOpen.toFixed(2)}</div>` : ''}
            </td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem; white-space: nowrap;">${perfDisplay}</td>
            <td style="padding: 0.75rem 1rem; white-space: nowrap;">
                <span style="color: ${gradeColor}; font-weight: bold; font-size: 0.8rem; padding: 0.15rem 0.4rem; border: 1px solid ${gradeColor}40; border-radius: 4px; background: ${gradeColor}10;">
                    ${ipo.stage < 5 && grade !== 'Pending' ? 'Pred: ' : ''}${grade === 'Pending' ? 'Pending' : grade}
                </span>
                ${(function() {
                    const predGrade = getPredictedGrade(ipo);
                    if (predGrade && ipo.stage === 5) {
                        return `
                        <div style="margin-top: 0.4rem; font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.2rem;">
                            Pred: <strong style="color: ${predGrade === grade ? '#10b981' : '#f59e0b'};">${predGrade}</strong>
                            ${predGrade === grade ? '<i data-lucide="check-circle" style="width: 12px; color: #10b981;"></i>' : ''}
                        </div>
                        `;
                    }
                    return '';
                })()}
                ${prediction ? `
                <div style="margin-top: 0.4rem; width: 80px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.6rem; margin-bottom: 2px;">
                        <span style="color: var(--text-dim);">Boom</span>
                        <span style="color: ${prediction.color}; font-weight: 700;">${prediction.score}%</span>
                    </div>
                    <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                        <div style="width: ${prediction.score}%; height: 100%; background: ${prediction.color}; box-shadow: 0 0 5px ${prediction.color};"></div>
                    </div>
                </div>
                ` : ''}
            </td>
            <td style="padding: 0.75rem 1rem; min-width: 180px; font-size: 0.75rem; color: var(--text-dim); line-height: 1.3;">
                ${gradeObj.reason}
            </td>
            <td style="padding: 0.75rem 1rem; white-space: nowrap;">${actionBtn}</td>
        </tr>
    `;
}



tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStage = parseInt(btn.dataset.stage);
        // Reset filters on tab switch
        resetFilters();
        renderIPOs();
    });
});

function resetFilters() {
    currentGrade = 'all';
    currentYear = 'all';
    currentSearch = '';
    currentSort = 'newest';
    // Reset filter button styles
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-main)';
        b.style.borderColor = 'rgba(255,255,255,0.2)';
    });
    const allFilterBtn = document.querySelector('.filter-btn[data-grade="all"]');
    if (allFilterBtn) {
        allFilterBtn.classList.add('active');
        allFilterBtn.style.background = 'var(--primary)';
        allFilterBtn.style.color = 'white';
        allFilterBtn.style.borderColor = 'var(--primary)';
    }
    // Reset year buttons
    document.querySelectorAll('.year-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-main)';
        b.style.borderColor = 'rgba(255,255,255,0.2)';
    });
    const allYearBtn = document.querySelector('.year-btn[data-year="all"]');
    if (allYearBtn) {
        allYearBtn.classList.add('active');
        allYearBtn.style.background = 'var(--primary)';
        allYearBtn.style.color = 'white';
        allYearBtn.style.borderColor = 'var(--primary)';
    }
    // Reset search input
    const searchInput = document.getElementById('ipo-search');
    if (searchInput) searchInput.value = '';
    // Reset sort
    const sortSelect = document.getElementById('ipo-sort');
    if (sortSelect) sortSelect.value = 'newest';
}

const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-main)';
            b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--primary)';
        currentGrade = btn.dataset.grade;
        renderIPOs();
    });
});

const yearBtns = document.querySelectorAll('.year-btn');
yearBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        yearBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-main)';
            b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--primary)';
        currentYear = btn.dataset.year;
        renderIPOs();
    });
});

const searchInput = document.getElementById('ipo-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderIPOs();
    });
}

const sortSelect = document.getElementById('ipo-sort');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderIPOs();
    });
}

// renderIPOs(1) is now called inside the fetch promise
// Modal Logic
const modal = document.getElementById('ipo-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

window.showDetails = function(id) {
    const ipo = ipoData.find(item => item.id === id);
    if (!ipo) return;

    modalBody.innerHTML = `
        <h2>${ipo.companyName}</h2>
        <p><strong>Sector:</strong> ${ipo.sector} &nbsp;|&nbsp; <strong>Market:</strong> ${ipo.market}</p>
        <div class="modal-details">
            <div class="detail-item">
                <span class="label">Stage</span>
                <span class="value" style="color: #f59e0b;">${ipo.status}</span>
            </div>
            <div class="detail-item">
                <span class="label">Est. Price</span>
                <span class="value">${ipo.price > 0 ? 'RM ' + ipo.price.toFixed(2) : 'TBA'}</span>
            </div>
        </div>
        <p style="font-size: 0.9rem; margin-top: 1rem; padding: 1rem; background: rgba(99, 102, 241, 0.1); border-radius: 0.5rem; border: 1px dashed var(--primary-light);">
            <strong>Notice:</strong> This is a Draft Prospectus phase. Information is for reference only and not an offer to buy shares.
        </p>
    `;
    
    modal.style.display = 'flex';
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

function showResearch(ipoId) {
    const ipo = ipoData.find(item => item.id === ipoId);
    if (!ipo || !ipo.research) return;

    modalBody.innerHTML = `
        <div class="research-hub">
            <h2 style="color: var(--primary-light); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                <i data-lucide="microscope" style="width: 24px;"></i> Analyst Research Lab
            </h2>
            
            <div class="comparison-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                ${ipo.research.map(note => `
                    <div class="lab-card glass-card" style="padding: 1.25rem; border: 1px solid rgba(99, 102, 241, 0.2);">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #a5b4fc; font-weight: 700; margin-bottom: 0.5rem;">${note.house}</div>
                        <div style="font-size: 1.25rem; font-weight: 800; color: white; margin-bottom: 0.25rem;">RM ${note.tp.toFixed(2)}</div>
                        <div style="font-size: 0.8rem; color: #10b981; font-weight: 600; margin-bottom: 1rem;">${note.view}</div>
                        
                        <div class="note-preview" style="background: rgba(0,0,0,0.3); border-radius: 0.5rem; overflow: hidden; height: 180px; position: relative; cursor: pointer;" onclick="window.open('${note.img}', '_blank')">
                            <img src="${note.img}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.7; transition: 0.3s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 0.75rem; font-size: 0.7rem; color: white; text-align: center;">
                                Click to View Full Note
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="padding: 1rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 0.75rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #10b981;">Hunter Strategy Analysis:</h4>
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-main); line-height: 1.5;">
                    The consensus from TA Securities and M+ Global confirms a strong upside potential of ${((ipo.avgTP - ipo.price) / ipo.price * 100).toFixed(1)}%. 
                    While TA is more conservative at RM 0.83, M+ projects a "Fair Value" of RM 0.93. 
                    <strong>Our Take:</strong> Accumulate for Step 3, but prioritize taking partial profits at ${ipo.avgTP}.
                </p>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

window.showResearch = showResearch;
window.showDetails = showDetails;
window.initializeData = initializeData;
window.playNotificationSound = playNotificationSound;
window.showToast = showToast;
window.fetchLiveUpdates = fetchLiveUpdates;

// --- Ballot Calculator Logic ---

// --- Hunter Pro Tier & Financing Hub Logic ---

const IPO_TIERS = [
    { units: 100, tier: 1 },
    { units: 300, tier: 2 },
    { units: 1100, tier: 3 },
    { units: 2100, tier: 4 },
    { units: 3100, tier: 5 },
    { units: 4100, tier: 6 },
    { units: 6100, tier: 7 },
    { units: 11100, tier: 8 },
    { units: 20100, tier: 9 },
    { units: 50100, tier: 10 },
    { units: 100100, tier: 11 },
    { units: 200100, tier: 12 },
    { units: 500100, tier: 13 },
    { units: 1000100, tier: 14 },
    { units: 2000100, tier: 15 },
    { units: 5000100, tier: 16 },
    { units: 10000100, tier: 17 }
];

function openCalculatorModal() {
    const modal = document.getElementById('calculator-modal');
    if (!modal) return;
    
    // Populate dropdown with Stage 3 IPOs
    const select = document.getElementById('calc-ipo-select');
    if (select) {
        select.innerHTML = '<option value="">-- Select IPO --</option>';
        const stage3Ipos = ipoData.filter(ipo => ipo.stage === 3);
        stage3Ipos.forEach(ipo => {
            select.innerHTML += `<option value="${ipo.id}" data-price="${ipo.price}">${ipo.companyName} (RM ${ipo.price})</option>`;
        });
    }
    
    // Default values
    document.getElementById('calc-capital').value = 10000;
    document.getElementById('calc-leverage').value = 2;
    document.getElementById('calc-cds-num').value = 1;
    
    syncHunterProCalculator();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeCalculatorModal() {
    const modal = document.getElementById('calculator-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function switchProTab(tabId) {
    document.querySelectorAll('.pro-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(tabId)) btn.classList.add('active');
    });
    document.querySelectorAll('.pro-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('pro-tab-' + tabId).classList.add('active');
}

function syncHunterProCalculator() {
    const ipoId = document.getElementById('calc-ipo-select').value;
    const capital = parseFloat(document.getElementById('calc-capital').value) || 0;
    const leverage = parseInt(document.getElementById('calc-leverage').value) || 1;
    const cdsNum = parseInt(document.getElementById('calc-cds-num').value) || 1;

    const ipo = ipoData.find(i => i.id === ipoId);
    if (!ipo || !ipo.price) {
        resetProCalculatorUI();
        return;
    }

    const price = ipo.price;
    const totalCapital = capital * cdsNum;
    const financingFactor = leverage - 1; // 1 for 2x, 0 for 1x
    const financingAmount = totalCapital * financingFactor;
    const totalPower = totalCapital + financingAmount;

    // 1. Tier Logic
    let bestTier = IPO_TIERS[0];
    for (const tier of IPO_TIERS) {
        if (tier.units * price <= totalPower) {
            bestTier = tier;
        } else {
            break;
        }
    }

    const actualCost = bestTier.units * price;
    const unitsPerCds = Math.floor(bestTier.units / cdsNum);
    
    // UI Update: Summary
    document.getElementById('res-total-power').innerText = 'RM ' + totalPower.toLocaleString();
    document.getElementById('res-principal').innerText = 'Cash: RM ' + totalCapital.toLocaleString();
    document.getElementById('res-loan').innerText = 'Loan: RM ' + financingAmount.toLocaleString();
    
    document.getElementById('res-tier-badge').innerText = 'Tier ' + bestTier.tier;
    document.getElementById('res-recommended-units').innerText = bestTier.units.toLocaleString() + ' units';
    document.getElementById('res-recommended-cost').innerText = 'Cost: RM ' + actualCost.toLocaleString();

    // 2. Financing Logic
    // Estimate days: closingDate to listingDate
    let days = 15;
    if (ipo.closingDate && ipo.listingDate) {
        const start = new Date(ipo.closingDate);
        const end = new Date(ipo.listingDate);
        if (!isNaN(start) && !isNaN(end)) {
            days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        }
    }
    
    const interestRate = 0.068; // 6.8%
    const interest = (financingAmount * interestRate * days) / 365;
    const sst = interest * 0.08; // 8% SST
    const totalFinCost = interest + sst;

    document.getElementById('res-interest').innerText = 'RM ' + interest.toFixed(2);
    document.getElementById('res-sst').innerText = 'RM ' + sst.toFixed(2);
    document.getElementById('res-total-cost').innerText = 'RM ' + totalFinCost.toFixed(2);
    document.getElementById('res-days').innerText = days + ' days';

    // Deposit Logic
    const depositReq = actualCost - totalCapital;
    const depositAlert = document.getElementById('res-additional-deposit');
    if (depositReq > 0 && leverage > 1) {
        depositAlert.style.display = 'flex';
        document.getElementById('res-deposit-val').innerText = 'RM ' + depositReq.toFixed(2);
    } else {
        depositAlert.style.display = 'none';
    }

    // 3. Tier Table Update
    const tableBody = document.getElementById('tier-table-body');
    tableBody.innerHTML = IPO_TIERS.map(t => {
        const cost = t.units * price;
        const isActive = t.tier === bestTier.tier;
        return `
            <tr class="${isActive ? 'active' : ''}">
                <td>${t.units.toLocaleString()}</td>
                <td>Tier ${t.tier}</td>
                <td>RM ${cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td>${cost <= totalPower ? '<span style="color:#10b981;">Affordable</span>' : '<span style="color:var(--text-dim);">Too high</span>'}</td>
            </tr>
        `;
    }).join('');

    // 4. Sell Calculator
    let sellPrice = parseFloat(document.getElementById('calc-sell-price').value);
    if (isNaN(sellPrice)) {
        sellPrice = ipo.estOpen || ipo.avgTP || (price * 1.5);
        document.getElementById('calc-sell-price').value = sellPrice.toFixed(2);
    }

    const grossProceeds = bestTier.units * sellPrice;
    
    // Brokerage: M+ (0.08% or min RM8)
    const buyBrokerage = Math.max(8, actualCost * 0.0008);
    const sellBrokerage = Math.max(8, grossProceeds * 0.0008);
    
    const netProfit = grossProceeds - actualCost - buyBrokerage - sellBrokerage - totalFinCost;
    const roi = (netProfit / totalCapital) * 100;

    const profitEl = document.getElementById('res-net-profit');
    const roiEl = document.getElementById('res-roi');
    
    profitEl.innerText = 'RM ' + netProfit.toLocaleString(undefined, {minimumFractionDigits: 2});
    roiEl.innerText = (roi >= 0 ? '+' : '') + roi.toFixed(2) + '%';
    
    profitEl.style.color = netProfit >= 0 ? '#10b981' : '#ef4444';
    roiEl.style.color = roi >= 0 ? '#10b981' : '#ef4444';
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function resetProCalculatorUI() {
    document.getElementById('res-total-power').innerText = 'RM 0.00';
    document.getElementById('res-tier-badge').innerText = 'Tier -';
    document.getElementById('res-recommended-units').innerText = '0 units';
    document.getElementById('tier-table-body').innerHTML = '';
}

window.openCalculatorModal = openCalculatorModal;
window.closeCalculatorModal = closeCalculatorModal;
window.syncHunterProCalculator = syncHunterProCalculator;
window.switchProTab = switchProTab;

// --- Hunter AI Assistant Logic ---

function toggleChat() {
    const window = document.getElementById('ai-window');
    const iconOpen = document.getElementById('toggle-icon-open');
    const iconClose = document.getElementById('toggle-icon-close');
    const badge = document.querySelector('.notification-badge');

    if (window.style.display === 'none') {
        window.style.display = 'flex';
        iconOpen.style.display = 'none';
        iconClose.style.display = 'block';
        if(badge) badge.style.display = 'none';
    } else {
        window.style.display = 'none';
        iconOpen.style.display = 'block';
        iconClose.style.display = 'none';
    }
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const messageContainer = document.getElementById('ai-messages');
    const text = input.value.trim();

    if (!text) return;

    // Add User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.textContent = text;
    messageContainer.appendChild(userMsg);
    
    input.value = '';
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Show Typing Indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'message ai-message typing';
    typingMsg.innerHTML = '<span class="dot-typing"></span><span class="dot-typing"></span><span class="dot-typing"></span>';
    messageContainer.appendChild(typingMsg);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    try {
        const systemPrompt = `You are "Hunter AI", a professional Malaysian IPO assistant for the IPO Hunter website.
You help users understand IPOs listed on Bursa Malaysia.
CURRENT IPO DATA: ${JSON.stringify(ipoData.slice(0, 15).map(i => ({
    name: i.companyName, status: i.status, price: i.price,
    os: i.os, market: i.market, sector: i.sector, pe: i.pe,
    insight: i.analystInsight
})))}
Keep answers short, helpful, and use emojis. Mention Grade (A=strong swing, B=scalp, C=avoid) when relevant.`;

        // Use server proxy on Vercel (production), direct Groq call when running locally
        const isLocal = location.protocol === 'file:' || location.hostname === 'localhost';
        let response;

        if (isLocal) {
            // Local fallback — Groq works in Malaysia, rate-limited per key
            const GROQ_KEY = 'YOUR_GROQ_API_KEY_HERE';
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    max_tokens: 512,
                    temperature: 0.7
                })
            });
            const groqData = await response.json();
            const groqText = groqData?.choices?.[0]?.message?.content || '';
            response = { ok: true, _groqText: groqText };
        } else {
            // Production: secure proxy on Vercel (key hidden in env vars)
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: systemPrompt + '\n\nUser question: ' + text })
            });
        }

        // Handle both local (Groq direct) and production (proxy) responses
        let rawText = '';
        if (response._groqText !== undefined) {
            rawText = response._groqText; // local mode — already extracted
        } else {
            const data = await response.json();
            rawText = data.text || '';
            if (!rawText && data.error) {
                rawText = `⚠️ Error: ${data.error}`;
            }
        }

        messageContainer.removeChild(typingMsg);
        const aiMsg = document.createElement('div');
        aiMsg.className = 'message ai-message';

        if (rawText) {
            aiMsg.innerHTML = rawText
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>');
        } else {
            aiMsg.innerHTML = "Sorry, I couldn't get a response. Please try again!";
        }

        messageContainer.appendChild(aiMsg);
    } catch (err) {
        console.error('Chat Error:', err);
        messageContainer.removeChild(typingMsg);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message ai-message';
        errorMsg.textContent = "Oops! Something went wrong. Check your internet connection and try again.";
        messageContainer.appendChild(errorMsg);
    }
    
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

window.toggleChat = toggleChat;
window.sendAIMessage = sendAIMessage;
