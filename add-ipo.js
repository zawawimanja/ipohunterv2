const fs = require('fs');

const extraIpos = [
    // 2024 Main Market
    { id: 'prolintas', companyName: 'Prolintas Infra Business Trust', sector: 'Transportation', stage: 4, price: 0.95, openPrice: 0.95, closePrice: 0.97, currentPrice: 0.94, performance: '-1.0%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2024 },
    { id: 'keyfield', companyName: 'Keyfield International Berhad', sector: 'Energy', stage: 4, price: 0.90, openPrice: 1.70, closePrice: 1.88, currentPrice: 2.15, performance: '+138.8%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2024 },
    { id: 'mkh-oil', companyName: 'MKH Oil Palm (East Kalimantan)', sector: 'Plantation', stage: 4, price: 0.62, openPrice: 0.63, closePrice: 0.64, currentPrice: 0.58, performance: '-6.4%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2024 },
    { id: 'mega-fortris', companyName: 'Mega Fortris Berhad', sector: 'Industrial', stage: 4, price: 0.67, openPrice: 0.66, closePrice: 0.64, currentPrice: 0.65, performance: '-2.9%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2024 },
    { id: 'azam-jaya', companyName: 'Azam Jaya Berhad', sector: 'Construction', stage: 4, price: 0.78, openPrice: 1.09, closePrice: 1.09, currentPrice: 1.25, performance: '+60.2%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2024 },
    { id: 'wct-reit', companyName: 'WCT REIT', sector: 'REITs', stage: 4, price: 1.00, openPrice: 1.02, closePrice: 1.01, currentPrice: 1.05, performance: '+5.0%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2024 },
    
    // 2025 Main Market
    { id: 'pantech-global', companyName: 'Pantech Global Berhad', sector: 'Industrial', stage: 4, price: 0.85, openPrice: 0.95, closePrice: 1.02, currentPrice: 1.10, performance: '+29.4%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2025 },
    { id: 'wawasan-dengkil', companyName: 'Wawasan Dengkil Holdings', sector: 'Construction', stage: 4, price: 0.55, openPrice: 0.60, closePrice: 0.58, currentPrice: 0.62, performance: '+12.7%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2025 },
    { id: 'saliran-group', companyName: 'Saliran Group Berhad', sector: 'Industrial', stage: 4, price: 0.45, openPrice: 0.50, closePrice: 0.52, currentPrice: 0.56, performance: '+24.4%', strategy: 'Swing', market: 'Main Market', status: 'Listed', year: 2025 }
];

const dataPath = './data.json';
let ipoData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Only add if not already present
extraIpos.forEach(newIpo => {
    if (!ipoData.find(ipo => ipo.id === newIpo.id)) {
        ipoData.push(newIpo);
    }
});

fs.writeFileSync(dataPath, JSON.stringify(ipoData, null, 4), 'utf8');
console.log('Appended 9 new Main Market IPOs to data.json');
