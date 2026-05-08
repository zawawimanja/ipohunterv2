const fs = require('fs');

const ipoData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const scrapedData = JSON.parse(fs.readFileSync('isaham_stats.json', 'utf8'));

function getOpenPerformance(ipo) {
    if (!ipo.openPrice || !ipo.price || ipo.price === 0) return 0;
    return ((ipo.openPrice - ipo.price) / ipo.price) * 100;
}
function floatEquals(a, b, tolerance = 0.005) { return Math.abs(a - b) < tolerance; }
// ... (I will paste a minimal version of getIpoGrade)
function getIpoGrade(ipo) {
    if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated' };
    const os = ipo.os || 0; const hasOsData = ipo.os !== undefined && ipo.os !== null; 
    const perf = ipo.performance || ''; const ib = (ipo.ib || '').toLowerCase();
    const pe = ipo.pe || 0; const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();
    const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
    const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
    const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
    const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity"];
    const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];
    const isHero = heroIBs.some(tier => ib.includes(tier));
    const isTopTier = topTierIBs.some(tier => ib.includes(tier));
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));
    const isPositiveOpen = ipo.openPrice && ipo.price && ipo.openPrice > ipo.price;
    const openPremium = (ipo.openPrice && ipo.price) ? ((ipo.openPrice - ipo.price) / ipo.price) * 100 : 0;
    const isStrongGreen = openPremium >= 5.0;
    const isFlat = ipo.openPrice && ipo.price && floatEquals(ipo.openPrice, ipo.price);
    const isHighPE = pe > 18.0; const isAttractivePE = pe > 0 && pe < 12.0; const isRed = perf.includes('-');

    if (ipo.stage < 4 && os === 0) return { grade: 'Pending' };
    if (ipo.stage === 3 && os > 0) {
        if (ipo.market === 'Main Market') {
            const isTopIB = heroIBs.some(tier => ib.includes(tier));
            if (os >= 20 && isTopIB) return { grade: 'A' };
            if (os >= 20 || os >= 5) return { grade: 'B' };
            return { grade: 'C' };
        }
        if (ipo.market === 'ACE Market') return { grade: os >= 20 ? 'B' : 'C' };
    }
    if (ipo.market === 'Main Market') {
        if (isHero && (isStrongGreen || isFlat)) return { grade: 'A' };
        if (ipo.stage === 4 && !hasOsData && isStrongGreen) {
            if ((isTopTier || isMomentum) && !isHighPE) return { grade: 'A' };
            if (pe > 0 && pe < 15 && isStrongGreen) return { grade: 'A' };
        }
        if (isHighPE && isRed) return { grade: 'C' };
        if (isFlat && !isHero) return { grade: 'C' };
        if (isStrongGreen && pe > 0 && pe < 15 && (isTopTier || isMomentum)) return { grade: 'A' };
        if (isPositiveOpen && pe > 0 && pe < 15 && (isTopTier || isMomentum || isHero)) return { grade: 'B' };
        if (hasOsData && os < 10 && !isHero && !isStrongGreen) return { grade: 'C' };
        if (isHighPE || isRed) return { grade: 'C' };
        if (os >= 20 && (isTopTier || isHero) && isStrongGreen) return { grade: 'A' };
        if (isStrongGreen && !isHighPE) return { grade: 'A' };
        return { grade: 'C' };
    }
    if (ipo.market === 'ACE Market') {
        if (isHero && isStrongGreen && os >= 3) return { grade: 'B' };
        if (ipo.stage === 4 && !hasOsData && isStrongGreen) {
            if ((isMomentum || isTopTier || isHero) && !isHighPE) return { grade: 'B' };
        }
        if (isHighPE) {
            if (os >= 50 && (isMomentum || isTopTier || isHero)) return { grade: 'B' };
            if (pe > 28.0 || os < 20) return { grade: 'C' };
        }
        if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return { grade: 'B' };
        if (os >= 20 && isStrongGreen) return { grade: 'B' };
        if (isFlat && os < 20) return { grade: 'C' };
        if (hasOsData && os < 10 && !isHero) return { grade: 'C' };
        if (!hasOsData && !isStrongGreen) return { grade: 'C' };
        if (isStrongGreen && !isHighPE) return { grade: 'B' };
        return { grade: 'C' };
    }
    return { grade: 'Unrated' };
}

let comparisons = [];
ipoData.forEach(d => {
    // try to find in scrapedData
    let match = scrapedData.find(s => s.Symbol && d.id && d.id.toLowerCase().includes(s.Symbol.toLowerCase()));
    if (!match) {
        match = scrapedData.find(s => s.Symbol && d.companyName && d.companyName.toLowerCase().includes(s.Symbol.toLowerCase()));
    }
    if (!match && d.id) {
        // Just checking some common ones
        if (d.id === 'mtt-shipping' && scrapedData.find(s=>s.Symbol==='MTTSL')) match = scrapedData.find(s=>s.Symbol==='MTTSL');
        if (d.id === 'ams-material' && scrapedData.find(s=>s.Symbol==='AMS')) match = scrapedData.find(s=>s.Symbol==='AMS');
    }
    
    if (match) {
        const grade = getIpoGrade(d).grade;
        comparisons.push({ name: d.companyName, ourGrade: grade, isahamScore: match['IPO Score'] });
    }
});

console.log('Comparisons:');
console.table(comparisons);

