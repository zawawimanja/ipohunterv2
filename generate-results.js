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

const stats = {};
const years = [];

data.forEach(ipo => {
    const year = ipo['Year'];
    if (!year || year === 'Unknown') return;
    if (!years.includes(year)) years.push(year);

    const grade = ipo['Grade'];
    const perfSOStr = ipo['SO Performance %'] || '0';
    const perfVal = parseFloat(perfSOStr) || 0;

    if (!stats[year]) stats[year] = { A: { sum: 0, count: 0 }, B: { sum: 0, count: 0 }, C: { sum: 0, count: 0 } };
    if (stats[year][grade]) {
        stats[year][grade].sum += perfVal;
        stats[year][grade].count++;
    }
});

years.sort();

console.log('--- CORRECTED BACKTEST RESULTS ---');
console.log('| Year | Grade A | Grade B | Grade C |');
console.log('|------|---------|---------|---------|');

let totalA = 0, totalB = 0, totalC = 0;
years.forEach(y => {
    const a = stats[y].A || { sum: 0, count: 0 };
    const b = stats[y].B || { sum: 0, count: 0 };
    const c = stats[y].C || { sum: 0, count: 0 };
    totalA += a.sum; totalB += b.sum; totalC += c.sum;
    console.log(`| ${y} | ${a.sum.toFixed(1)}% (${a.count}) | ${b.sum.toFixed(1)}% (${b.count}) | ${c.sum.toFixed(1)}% (${c.count}) |`);
});

console.log(`| **TOTAL** | **${totalA.toFixed(1)}%** | **${totalB.toFixed(1)}%** | **${totalC.toFixed(1)}%** |`);
