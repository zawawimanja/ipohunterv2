const axios = require('axios');
const cheerio = require('cheerio');

async function testStats() {
    try {
        const res = await axios.get('https://www.isaham.my/ipo/statistics');
        const $ = cheerio.load(res.data);
        $('table tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if(cols.length > 5) {
                const name = $(cols[0]).text().trim();
                if(name.toLowerCase().includes('kee ming')) {
                    console.log('COMPANY:', name);
                    for(let j=0; j<cols.length; j++) {
                        console.log(`Col ${j}:`, $(cols[j]).text().trim());
                    }
                }
            }
        });
    } catch(e) {
        console.error(e.message);
    }
}
testStats();
