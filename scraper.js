const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const DATA_FILE = './data.json';

async function updateIpoData() {
    try {
        console.log('Starting IPO data update...');
        let existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        let updatedCount = 0;

        // 1. Fetching Live Stock Prices for Listed IPOs (Stage 4)
        // Note: For a robust system, we would query a stock API like Yahoo Finance
        // Here we simulate an update script that checks for new prices.
        // As a prototype, we just log that we are scanning the listed companies.
        console.log('Checking Stage 4 (Listed) market prices...');
        existingData.forEach(ipo => {
            if (ipo.stage === 4) {
                // In a true live system, we'd GET https://finance.yahoo.com/quote/CODE.KL
                // For now, we increase the price slightly to demonstrate an update (Simulated Live Data)
                // Remove / modify this simulation code when attaching to a real Stock API endpoint
                if (ipo.currentPrice) {
                    const fluctuation = (Math.random() * 0.04) - 0.02; // -2% to +2% daily change
                    ipo.currentPrice = parseFloat((ipo.currentPrice * (1 + fluctuation)).toFixed(3));
                    
                    if (ipo.price > 0) {
                        const newPerf = ((ipo.currentPrice - ipo.price) / ipo.price) * 100;
                        ipo.performance = (newPerf >= 0 ? '+' : '') + newPerf.toFixed(1) + '%';
                    }
                    updatedCount++;
                }
            }
        });

        // 2. Fetching upcoming IPOs from iSaham (Stage 1 & 2)
        // Using axios to fetch from https://www.isaham.my/ipo
        console.log('Scraping upcoming IPOs from iSaham...');
        try {
            const { data } = await axios.get('https://www.isaham.my/ipo', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const $ = cheerio.load(data);

            // This is a generic extractor based on standard HTML table parsing.
            // When iSaham HTML structure is fully known, map these selectors perfectly.
            $('table tbody tr').each((i, el) => {
                const row = $(el).find('td');
                if (row.length > 3) {
                    const companyName = $(row[0]).text().trim();
                    const market = $(row[1]).text().trim() || 'ACE Market';
                    const priceStr = $(row[2]).text().trim().replace('RM', '').trim();
                    const price = parseFloat(priceStr) || 0;

                    // Check if exists in our data
                    const exists = existingData.find(d => d.companyName.toLowerCase().includes(companyName.toLowerCase().split(' ')[0]));
                    
                    if (!exists && companyName) {
                        // Create new draft entry
                        existingData.push({
                            id: companyName.toLowerCase().replace(/\\s+/g, '-'),
                            companyName: companyName,
                            sector: 'TBA',
                            stage: 1,
                            price: price,
                            market: market.includes('Main') ? 'Main Market' : 'ACE Market',
                            status: 'Prospectus Exposure (Scraped)',
                            prospectusUrl: 'https://bursamalaysia.com/',
                            year: new Date().getFullYear()
                        });
                        console.log(`Added new IPO: ${companyName}`);
                        updatedCount++;
                    }
                }
            });
        } catch (scrapeErr) {
            console.warn('Could not scrape iSaham (CORS or blocking). Proceeding with price updates only.', scrapeErr.message);
        }

        // Save new data
        fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 4));
        console.log(`Update complete. Modified/Added ${updatedCount} records.`);

    } catch (e) {
        console.error('Failed to update IPO data:', e);
        process.exit(1);
    }
}

updateIpoData();
