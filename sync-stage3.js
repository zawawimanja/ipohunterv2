const fs = require('fs');

const path = './data.json';
let ipos = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Remove all existing Stage 3 (Public Stage) items to clear out old mocks
ipos = ipos.filter(ipo => ipo.stage !== 3);

// 2. Remove old Empire Sushi and MTT Shipping cases from wherever they were (Stage 2 or 4)
ipos = ipos.filter(ipo => ipo.id !== 'empire-sushi' && ipo.id !== 'mtt-shipping-listed');

// 3. Create the exact Stage 3 list based on the screenshot
const liveStage3 = [
    {
        id: 'mtt-shipping',
        companyName: 'MTT Shipping and Logistics Bhd',
        sector: 'Logistics',
        stage: 3,
        price: 1.03,
        market: 'Main Market',
        status: 'Application Open',
        closingDate: '2026-04-03T17:00:00',
        prospectusUrl: 'https://bursamalaysia.com/',
        year: 2026,
        shariah: true,
        os: 0,
        ib: 'Maybank IB',
        fundUse: 'Fasiliti Logistik',
        pe: 10.3
    },
    {
        id: 'empire-premium',
        companyName: 'Empire Premium Food Berhad',
        sector: 'Consumer Products',
        stage: 3,
        price: 0.70,
        market: 'Main Market',
        status: 'Application Open',
        closingDate: '2026-03-31T17:00:00',
        prospectusUrl: 'https://bursamalaysia.com/',
        year: 2026,
        shariah: true,
        os: 0,
        ib: 'Maybank IB',
        fundUse: 'Rangkaian Cawangan',
        pe: 20.0
    },
    {
        id: 'ams-material',
        companyName: 'AMS Advanced Material Berhad',
        sector: 'Industrial Products',
        stage: 3,
        price: 0.29,
        market: 'ACE Market',
        status: 'Application Open',
        closingDate: '2026-04-10T17:00:00',
        prospectusUrl: 'https://bursamalaysia.com/',
        year: 2026,
        shariah: true,
        os: 0,
        ib: 'M&A Securities',
        fundUse: 'Kilang / Mesin',
        pe: 15.85
    },
    {
        id: 'golden-destinations',
        companyName: 'Golden Destinations Group Berhad',
        sector: 'Consumer Products', // Tourism/Travel
        stage: 3,
        price: 0.45,
        market: 'ACE Market',
        status: 'Application Open',
        closingDate: '2026-04-06T17:00:00',
        prospectusUrl: 'https://bursamalaysia.com/',
        year: 2026,
        shariah: true,
        os: 0,
        ib: 'Malacca Securities',
        fundUse: 'Pengembangan',
        pe: 15.85
    }
];

ipos.push(...liveStage3);

fs.writeFileSync(path, JSON.stringify(ipos, null, 4));
console.log('Mirroring exact Maybank screenshot for Stage 3 successful.');
