const fs = require('fs');
const upcomingStage2 = [
    { id: 'aerodyne', companyName: 'Aerodyne Group Berhad', sector: 'Technology', stage: 2, price: 0.85, market: 'Main Market', status: 'MITI Allocation Phase', prospectusUrl: 'https://sahamonline.miti.gov.my/', year: 2026, shariah: true, os: 0, ib: 'Maybank IB', fundUse: 'R&D / Ekspansi Global' },
    { id: 'carsome', companyName: 'Carsome Holdings Berhad', sector: 'Consumer Products', stage: 2, price: 1.20, market: 'Main Market', status: 'MITI Allocation Phase', prospectusUrl: 'https://sahamonline.miti.gov.my/', year: 2026, shariah: true, os: 0, ib: 'CIMB', fundUse: 'Pengembangan' }
];
const dataPath = './data.json';
let ipoData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
upcomingStage2.forEach(newIpo => {
    if (!ipoData.find(ipo => ipo.id === newIpo.id)) ipoData.push(newIpo);
});
fs.writeFileSync(dataPath, JSON.stringify(ipoData, null, 4), 'utf8');
