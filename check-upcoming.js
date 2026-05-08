const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.isaham.my/ipo').then(res => {
    const $ = cheerio.load(res.data);
    const data = [];
    $('table tbody tr').each((i, el) => {
        const tds = $(el).find('td');
        if(tds.length >= 3) {
            const name = $(tds[0]).text().replace(/\n/g, '').replace(/\s+/g, ' ').trim();
            const date = $(tds[3]).text().trim();
            const prospectus = $(tds[4]).text().trim();
            data.push({ name, date, prospectus });
        }
    });
    console.log(JSON.stringify(data.slice(0, 15), null, 2));
}).catch(console.error);
