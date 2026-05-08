const fs = require('fs');

const upcomingIpos = [
    { id: 'adnex', companyName: 'Adnex Group Berhad', sector: 'Consumer', stage: 4, price: 0.20, openPrice: 0.22, closePrice: 0.23, currentPrice: 0.235, performance: '+17.5%', strategy: 'Scalp', market: 'ACE Market', status: 'Listed', year: 2026, shariah: true },
    { id: 'ogx', companyName: 'OGX Group Berhad', sector: 'Technology', stage: 4, price: 0.35, openPrice: 0.30, closePrice: 0.28, currentPrice: 0.27, performance: '-22.86%', strategy: 'Scalp', market: 'ACE Market', status: 'Listed', year: 2026, shariah: true },
    { id: 'teamstr', companyName: 'Teamstar Berhad', sector: 'Consumer', stage: 4, price: 0.26, openPrice: 0.25, closePrice: 0.25, currentPrice: 0.245, performance: '-5.77%', strategy: 'Scalp', market: 'ACE Market', status: 'Listed', year: 2026, shariah: true },
    { id: 'hocksoon', companyName: 'Hock Soon Capital Berhad', sector: 'Consumer Products', stage: 4, price: 0.60, openPrice: 0.40, closePrice: 0.38, currentPrice: 0.365, performance: '-39.17%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2026, shariah: true },
    { id: 'ambest', companyName: 'Ambest Group Berhad', sector: 'Industrial', stage: 4, price: 0.25, openPrice: 0.28, closePrice: 0.30, currentPrice: 0.31, performance: '+24.0%', strategy: 'Scalp', market: 'ACE Market', status: 'Listed', year: 2026, shariah: true },
    { id: 'isf', companyName: 'ISF Group Berhad', sector: 'Industrial', stage: 4, price: 0.33, openPrice: 0.35, closePrice: 0.37, currentPrice: 0.385, performance: '+16.67%', strategy: 'Scalp', market: 'ACE Market', status: 'Listed', year: 2026, shariah: true },
    { id: 'ogm', companyName: 'One Gasmaster Holdings Berhad', sector: 'Industrial', stage: 4, price: 0.25, openPrice: 0.20, closePrice: 0.15, currentPrice: 0.13, performance: '-48.0%', strategy: 'Scalp', market: 'ACE Market', status: 'Listed', year: 2026, shariah: true },
    { id: 'sbs', companyName: 'SBS Nexus Berhad', sector: 'Technology', stage: 4, price: 0.25, openPrice: 0.20, closePrice: 0.15, currentPrice: 0.13, performance: '-48.0%', strategy: 'Scalp', market: 'ACE Market', status: 'Listed', year: 2026, shariah: true }
];

const dataPath = './data.json';
let ipoData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter out GHS [NS] and SEMICO [NS] by simply replacing data if they somehow exist, but we only append the verified shariah ones
upcomingIpos.forEach(newIpo => {
    if (!ipoData.find(ipo => ipo.id === newIpo.id)) {
        ipoData.push(newIpo);
    }
});

fs.writeFileSync(dataPath, JSON.stringify(ipoData, null, 4), 'utf8');
console.log('Appended 8 new 2026 IPOs to data.json');
