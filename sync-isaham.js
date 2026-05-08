const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, 'data.json');
const DATA_JS_FILE = path.join(__dirname, 'data.js');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

function normalizeName(name) {
    return name.toLowerCase().replace(/berhad|bhd|group|holdings|corp/g, '').trim();
}

async function fetchPage(url) {
    try {
        const response = await axios.get(url, { headers: HEADERS });
        return cheerio.load(response.data);
    } catch (e) {
        if (e.response && e.response.status === 404) {
            // Silence 404s as they are expected during brute-force probing
            return null;
        }
        console.error(`Failed to fetch ${url}:`, e.message);
        return null;
    }
}

async function scrapeUpcomingIPOs(existingData) {
    console.log('Scraping Stage 3 (Upcoming) IPOs...');
    const $ = await fetchPage('https://www.isaham.my/ipo');
    if (!$) return 0;

    let count = 0;
    $('.f-ipo-card').each((i, el) => {
        const titleText = $(el).find('.card-title').text().trim();
        if (!titleText) return;

        const parts = titleText.split('|');
        const symbol = parts[0].trim();
        const companyName = parts[1] ? parts[1].trim() : symbol;

        let market = '', price = 0, closingDate = '', listingDate = '', shariah = false;
        $(el).find('span.font-weight-bold').each((_, span) => {
            const label = $(span).text().toLowerCase();
            const val = $(span).next('span').text().trim();
            if (label.includes('market')) market = val;
            if (label.includes('listing price')) price = parseFloat(val.replace('RM', '').trim()) || 0;
            if (label.includes('closing date')) closingDate = val;
            if (label.includes('listing date')) listingDate = val;
            if (label.includes('shariah')) shariah = val.toLowerCase().includes('yes');
        });

        const normName = normalizeName(companyName);
        let existing = existingData.find(d => normalizeName(d.companyName).includes(normName) || normName.includes(normalizeName(d.companyName)));

        if (existing) {
            existing.stage = 3;
            existing.status = 'Application Open';
            existing.price = price || existing.price;
            existing.closingDate = closingDate || existing.closingDate;
            existing.listingDate = listingDate || existing.listingDate;
            existing.market = market.includes('ACE') ? 'ACE Market' : (market.includes('Main') ? 'Main Market' : market);
            existing.shariah = shariah;
        } else {
            existingData.push({
                id: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                companyName,
                symbol,
                market: market.includes('ACE') ? 'ACE Market' : (market.includes('Main') ? 'Main Market' : market),
                price,
                closingDate,
                listingDate,
                shariah,
                stage: 3,
                status: 'Application Open',
                year: new Date().getFullYear()
            });
        }
        count++;
    });
    return count;
}

async function scrapeMitiAndDraftIPOs(existingData) {
    console.log('Scraping Stage 1 & 2 (MITI and Draft) IPOs...');
    const $ = await fetchPage('https://www.isaham.my/ipo/miti');
    if (!$) return 0;

    let count = 0;
    
    // The structure typically has headings like "MITI IPO" and "Future IPO", followed by elements
    // Let's find h5 tags that typically hold the company names.
    // Based on the structure, h4 separates sections, h5 are company names.
    let currentSection = '';
    
    $('h4, h5').each((i, el) => {
        const text = $(el).text().trim();
        
        if (el.tagName.toLowerCase() === 'h4') {
            if (text.includes('MITI IPO') || text.includes('Upcoming Listing')) {
                currentSection = 'MITI';
            } else if (text.includes('Future IPO')) {
                currentSection = 'Future';
            }
        } else if (el.tagName.toLowerCase() === 'h5') {
            // It's a company name
            const companyName = text;
            
            // Look ahead for details
            let nextElem = $(el).next();
            let detailsText = '';
            while(nextElem.length && nextElem[0].tagName.toLowerCase() !== 'h5' && nextElem[0].tagName.toLowerCase() !== 'h4') {
                detailsText += nextElem.text() + ' ';
                nextElem = nextElem.next();
            }

            let stage = currentSection === 'MITI' ? 2 : 1;
            let status = currentSection === 'MITI' ? 'MITI Allocation Phase' : 'Draft / Exposure Phase';
            
            const normName = normalizeName(companyName);
            let existing = existingData.find(d => normalizeName(d.companyName).includes(normName) || normName.includes(normalizeName(d.companyName)));

            if (existing) {
                // Only update stage if it's currently a lower stage or pending
                if (!existing.stage || existing.stage < stage) {
                    existing.stage = stage;
                    existing.status = status;
                }
            } else {
                existingData.push({
                    id: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    companyName,
                    stage,
                    status,
                    price: 0,
                    year: new Date().getFullYear()
                });
            }
            count++;
        }
    });

    return count;
}

async function scrapeListedStatistics(existingData) {
    console.log('Scraping Stage 5 (Listed Statistics) IPOs...');
    const $ = await fetchPage('https://www.isaham.my/ipo/statistics');
    if (!$) return 0;

    let count = 0;
    $('table tbody tr').each((i, el) => {
        const cols = $(el).find('td');
        if (cols.length >= 7) {
            const name = $(cols[0]).text().trim();
            const yearText = $(cols[1]).text().trim();
            const year = parseInt(yearText.split('-').pop()) || 2026;
            const ipoPrice = parseFloat($(cols[2]).text()) || 0;
            const openPrice = parseFloat($(cols[3]).text()) || 0;
            const closePrice = parseFloat($(cols[6]).text()) || 0;

            const normName = normalizeName(name);
            let existing = existingData.find(d => normalizeName(d.companyName).includes(normName) || normName.includes(normalizeName(d.companyName)));

            if (existing) {
                existing.stage = 5;
                existing.status = 'Listed';
                existing.price = existing.price || ipoPrice;
                existing.openPrice = existing.openPrice || openPrice;
                existing.closePrice = closePrice;
                existing.currentPrice = closePrice;
                existing.year = existing.year || year;
            } else {
                existingData.push({
                    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    companyName: name,
                    stage: 5,
                    status: 'Listed',
                    price: ipoPrice,
                    openPrice,
                    closePrice,
                    currentPrice: closePrice,
                    year
                });
            }
            count++;
        }
    });
    return count;
}

async function deepHuntData(existingData) {
    console.log('Running Deep Hunt for OS and TP/FV...');
    let huntedCount = 0;

    for (let ipo of existingData) {
        if ((ipo.stage >= 3) && (!ipo.os || !ipo.avgTP || !ipo.pe)) {
            const stem = normalizeName(ipo.companyName).replace(/\s+/g, '-');
            const ticker = ipo.symbol ? ipo.symbol.toLowerCase() : stem;
            
            const urls = [
                ipo.insightUrl, // Try saved URL first
                `https://www.isaham.my/ipo/${stem}`,
                `https://www.isaham.my/ipo-insights/${stem}`,
                `https://www.isaham.my/stock/${ticker}/insights`,
                `https://www.isaham.my/ipo/${ticker}`
            ].filter(Boolean);

            let foundInfo = false;
            for (const url of urls) {
                try {
                    const $ = await fetchPage(url);
                    if (!$) continue;
                    
                    const text = $('body').text();

                    // Hunt for OS
                    if (!ipo.os) {
                        const osMatch = text.match(/Oversubscription rate:\s*(\d+\.\d+)x/i) || 
                                      text.match(/subscribed by\s*(\d+\.\d+)\s*times/i) ||
                                      text.match(/OS Rate:\s*(\d+\.\d+)/i) ||
                                      text.match(/oversubscribed by\s*(\d+\.\d+)x/i);
                        if (osMatch) {
                            ipo.os = parseFloat(osMatch[1]);
                            ipo.isAutoOS = true;
                            console.log(`  [OS] Found ${ipo.os}x for ${ipo.companyName}`);
                            foundInfo = true;
                        }
                    }

                    // Hunt for TP/FV
                    if (!ipo.avgTP) {
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

                        if (foundTP) {
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
                            console.log(`  [TP] Found RM ${foundTP} for ${ipo.companyName}`);
                            foundInfo = true;
                        }
                    }

                    // Hunt for PE
                    if (!ipo.pe) {
                        const peMatch = text.match(/P\/E Ratio:\s*(\d+\.\d+)/i) || text.match(/PE:\s*(\d+\.\d+)/i);
                        if (peMatch) {
                            ipo.pe = parseFloat(peMatch[1]);
                            ipo.isAutoPE = true;
                            console.log(`  [PE] Found ${ipo.pe} for ${ipo.companyName}`);
                            foundInfo = true;
                        }
                    }
                    
                    if (foundInfo) break; // found what we needed for this IPO

                } catch (e) {
                    // Ignore errors for individual URLs
                }
            }
            if (foundInfo) huntedCount++;
        }
    }
    return huntedCount;
}

async function main() {
    console.log('--- Starting IPO Hunter Sync ---');
    
    let existingData = [];
    if (fs.existsSync(DATA_JSON_FILE)) {
        existingData = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));
    } else {
        console.warn('data.json not found. Starting fresh.');
    }

    const initialCount = existingData.length;

    await scrapeListedStatistics(existingData);
    await scrapeUpcomingIPOs(existingData);
    await scrapeMitiAndDraftIPOs(existingData);
    await deepHuntData(existingData);

    // Save back to data.json
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(existingData, null, 2));
    
    // Generate data.js
    const jsContent = `const IPO_DATA = ${JSON.stringify(existingData, null, 2)};\n`;
    fs.writeFileSync(DATA_JS_FILE, jsContent);

    console.log(`\n--- Sync Complete ---`);
    console.log(`Total IPOs: ${existingData.length} (Added ${existingData.length - initialCount} new)`);
    console.log(`Files updated: data.json, data.js`);
}

main().catch(console.error);
