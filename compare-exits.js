const fs = require('fs');

const csvPath = 'IPO_Graded_Results.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split(',');

const data = lines.slice(1).map(line => {
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const obj = {};
    headers.forEach((h, i) => {
        obj[h.trim()] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '';
    });
    return obj;
});

let totalOpen = 0, totalClose = 0, totalHigh = 0;
let count = 0;

data.forEach(ipo => {
    if (ipo['Grade'] === 'B') {
        const so = parseFloat(ipo['SO Performance %']) || 0;
        const sc = parseFloat(ipo['SC Performance %']) || 0;
        const h = parseFloat(ipo['H Performance %']) || 0;
        
        totalOpen += so;
        totalClose += sc;
        totalHigh += h;
        count++;
    }
});

console.log('--- EXIT STRATEGY COMPARISON (Grade B) ---');
console.log(`Analyzed ${count} Grade B IPOs\n`);
console.log(`1. Sell at Open:  +${totalOpen.toFixed(1)}%`);
console.log(`2. Sell at Close: +${totalClose.toFixed(1)}%`);
console.log(`3. Sell at High:  +${totalHigh.toFixed(1)}%`);

console.log('\n--- RECOMMENDATION ---');
if (totalHigh > totalOpen && totalHigh > totalClose) {
    console.log('High Performance is the theoretical winner, but catching the High is difficult.');
}
if (totalOpen > totalClose) {
    console.log('Selling at OPEN is better than holding until CLOSE.');
} else {
    console.log('Holding until CLOSE is better than selling at OPEN.');
}
