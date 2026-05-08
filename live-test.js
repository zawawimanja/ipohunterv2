const axios = require('axios');
const cheerio = require('cheerio');

async function testScrape() {
    try {
        console.log('Testing Upcoming / Public (Stage 1 & 3)...');
        const res1 = await axios.get('https://www.isaham.my/ipo');
        let $ = cheerio.load(res1.data);
        $('table.table-striped').each((tableIdx, table) => {
            console.log(`Table ${tableIdx}:`);
            $(table).find('tbody tr').slice(0,2).each((i, el) => {
                const text = $(el).text().replace(/\s+/g, ' ').trim();
                console.log('  Row:', text.substring(0, 100));
            });
        });

        console.log('\nTesting MITI (Stage 2)...');
        const res2 = await axios.get('https://www.isaham.my/ipo/miti');
        $ = cheerio.load(res2.data);
        $('table.table-hover tbody tr').slice(0, 2).each((i, el) => {
             const text = $(el).text().replace(/\s+/g, ' ').trim();
             console.log('  Row:', text.substring(0, 100));
        });

    } catch(e) {
        console.log('Error:', e.message);
    }
}
testScrape();
