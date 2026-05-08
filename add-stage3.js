const fs = require('fs');

const upcomingStage3 = [
];

const dataPath = './data.json';
let ipoData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

upcomingStage3.forEach(newIpo => {
    if (!ipoData.find(ipo => ipo.id === newIpo.id)) {
        ipoData.push(newIpo);
    }
});

fs.writeFileSync(dataPath, JSON.stringify(ipoData, null, 4), 'utf8');
console.log('Appended 5 new Stage 3 active IPOs to data.json');
