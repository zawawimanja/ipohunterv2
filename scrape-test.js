const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.isaham.my/ipo/statistics').then(r => {
    const $ = cheerio.load(r.data);
    const result = [];
    
    $('table tbody tr').each((i, el) => {
        const tds = $(el).find('td');
        if(tds.length >= 6) {
            const cols = [];
            $(el).find('td').each((j, td) => cols.push($(td).text().replace(/\s+/g, ' ').trim()));
            
            const nameHtml = $(tds[0]).html() || '';
            const name = cols[0];
            
            result.push({
                name: name,
                shariahHtml: nameHtml.slice(0, 50), // grab first 50 chars of HTML to debug
                sector: cols[1],
                date: cols[9]
            });
        }
    });
    console.log(JSON.stringify(result.slice(0, 3), null, 2));
}).catch(e => console.log(e.message));
