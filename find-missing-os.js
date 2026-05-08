const { IPO_DATA } = require('./data.js');
// Need to mock IPO_DATA if it's not exported.
// Let's just read the file and extract it.
const fs = require('fs');
const content = fs.readFileSync('./data.js', 'utf8');
const ipoData = eval(content.replace('const IPO_DATA =', 'module.exports =') + '; module.exports;');

ipoData.forEach(ipo => {
    if (ipo.stage === 4 && (!ipo.os || ipo.os === 0)) {
        console.log(`ID: ${ipo.id}, Name: ${ipo.companyName}, OS: ${ipo.os}`);
    }
});
