// Simplified Grade Audit v3 — Corrected Sync
const fs = require('fs');
const dataRaw = fs.readFileSync('./data.js', 'utf-8');
const match = dataRaw.match(/const IPO_DATA = (\[[\s\S]*\]);/);
const IPO_DATA = eval(match[1]);

function floatEquals(a, b) { return Math.abs(a - b) < 0.005; }

function grade(ipo) {
    if (!ipo.market) return 'Unrated';
    const os = ipo.os || 0;
    const hasOs = ipo.os !== undefined && ipo.os !== null;
    const perf = ipo.performance || '';
    const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0;
    const hero = ["maybank","public","kaf","alliance","cimb"].some(t => ib.includes(t));
    const top = ["maybank","cimb","rhb","public","aminvestment","alliance","affin hwang","kaf"].some(t => ib.includes(t));
    const mom = ["m&a","malacca","kenanga","ta securities","uob kay hian","mercury","apex","sj securities"].some(t => ib.includes(t));
    
    const positiveOpen = ipo.openPrice && ipo.price && ipo.openPrice > ipo.price;
    const openPremium = (ipo.openPrice && ipo.price) ? ((ipo.openPrice - ipo.price) / ipo.price) * 100 : 0;
    const strongGreen = openPremium >= 5.0;
    const flat = ipo.openPrice && ipo.price && floatEquals(ipo.openPrice, ipo.price);
    const hiPE = pe > 18;
    const red = perf.includes('-');

    if (ipo.stage < 4 && os === 0) return 'Pending';

    if (ipo.market === 'Main Market') {
        if (hero && (strongGreen || flat)) return 'A';
        if (ipo.stage===4 && !hasOs && strongGreen && (top||mom) && !hiPE) return 'A';
        if (ipo.stage===4 && !hasOs && strongGreen && pe>0 && pe<15) return 'A';
        if (hiPE && red) return 'C';
        if (flat && !hero) return 'C';
        
        // Rescue rule for A: needs >= 5%
        if (strongGreen && pe > 0 && pe < 15 && (top || mom)) return 'A';
        // Fallback to B: weak green but healthy PE/IB
        if (positiveOpen && pe > 0 && pe < 15 && (top || mom || hero)) return 'B';

        if (hasOs && os<10 && !hero && !strongGreen) return 'C';
        if (hasOs && os<10 && !hero && hiPE) return 'C';
        if (hiPE) return 'C';
        if (red) return 'C';
        if (os>=20 && (top||hero) && strongGreen) return 'A';
        if (strongGreen && !hiPE) return 'A';
        return 'C';
    }

    if (ipo.market === 'ACE Market') {
        if (hero && strongGreen && os>=3) return 'B';
        if (ipo.stage===4 && !hasOs && strongGreen && (mom||top||hero) && !hiPE) return 'B';
        if (hiPE) {
            if (os >= 50 && (mom || top || hero)) return 'B';
            if (pe > 28.0) return 'C';
            if (os < 20) return 'C';
        }
        if (os>=20 && (mom||top||hero) && (strongGreen||flat)) return 'B';
        if (os>=20 && strongGreen) return 'B';
        if (flat && os<20) return 'C';
        if (hasOs && os<10 && !hero) return 'C';
        if (!hasOs && !strongGreen) return 'C';
        if (strongGreen && !hiPE) return 'B';
        return 'C';
    }
    return 'Unrated';
}

const s4 = IPO_DATA.filter(i => i.stage === 4);
let results = [];
s4.forEach(ipo => {
    const g = grade(ipo);
    const op = ipo.openPrice && ipo.price ? ((ipo.openPrice-ipo.price)/ipo.price*100).toFixed(1) : '0.0';
    const hp = ipo.currentPrice && ipo.price ? ((ipo.currentPrice-ipo.price)/ipo.price*100).toFixed(1) : '0.0';
    let flag = '';
    if (g==='A' && parseFloat(op)<0) flag = 'ISSUE: A+red';
    if (g==='A' && parseFloat(hp)<-20) flag = 'ISSUE: A lost>20%';
    if (g==='C' && parseFloat(op)>30) flag = 'ISSUE: C+strong>30%';
    if (g==='C' && parseFloat(hp)>50) flag = 'ISSUE: C+huge gains';
    results.push(`${ipo.companyName.padEnd(35)} | G:${g} | Open:${op}% | OS:${ipo.os||'-'} | Hold:${hp}% ${flag}`);
});

results.forEach(r => console.log(r));
