const fs = require('fs');

let ipoData = [];
try {
    ipoData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
} catch (e) {
    console.error("Could not read data.json");
    process.exit(1);
}

// Add Stratus Global if not present for demonstration
const stratusPresent = ipoData.some(ipo => ipo.companyName.toLowerCase().includes('stratus'));
if (!stratusPresent) {
    ipoData.push({
        companyName: "Stratus Global Holdings Berhad",
        market: "Main Market",
        ib: "UOB Kay Hian",
        sector: "Factory Automation / Cleanroom Handling",
        fundUse: "Expansion & R&D",
        stage: 2, // MITI stage
        os: 0
    });
}

const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];

const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity"];
const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

function predictGrade(ipo) {
    const ib = (ipo.ib || '').toLowerCase();
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();
    const market = ipo.market;

    const isHero = heroIBs.some(tier => ib.includes(tier));
    const isTopTier = topTierIBs.some(tier => ib.includes(tier));
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    const isTrendingSector = trendingSectors.some(s => sector.includes(s));
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));

    // Scoring system
    let score = 0;
    let reasons = [];
    
    // IB Score (Max 40)
    if (isHero) {
        score += 40;
        reasons.push("Hero IB (+40)");
    } else if (isTopTier) {
        score += 30;
        reasons.push("Top Tier IB (+30)");
    } else if (isMomentum) {
        score += 20;
        reasons.push("Momentum IB (+20)");
    }
    
    // Sector Score (Max 30)
    if (isTrendingSector) {
        score += 30;
        reasons.push("Trending Sector (+30)");
    }
    
    // Fund Use Score (Max 20)
    if (isExpansionFund) {
        score += 20;
        reasons.push("Expansion/R&D Fund Use (+20)");
    }
    
    // Market Score (Max 10)
    if (market === 'Main Market') {
        score += 10;
        reasons.push("Main Market (+10)");
    } else if (market === 'ACE Market') {
        score += 5;
        reasons.push("ACE Market (+5)");
    }

    // Grade Assignment
    let grade = 'C';
    if (score >= 70) grade = 'A';
    else if (score >= 40) grade = 'B';
    
    return { grade, score, reasons };
}

console.log("=== PRE-OS PREDICTIVE GRADING ===");
console.log("Evaluating IPOs without waiting for Oversubscription data.\n");

ipoData.forEach(ipo => {
    // Process IPOs in Stage 2 or 3, or Stage 4 without OS
    if (ipo.stage === 2 || ipo.stage === 3 || (ipo.stage === 4 && (!ipo.os || ipo.os === 0))) {
        const result = predictGrade(ipo);
        console.log(`Company: ${ipo.companyName}`);
        console.log(`Market:  ${ipo.market} | IB: ${ipo.ib}`);
        console.log(`Sector:  ${ipo.sector}`);
        console.log(`Grade:   [${result.grade}] (Score: ${result.score}/100)`);
        console.log(`Factors: ${result.reasons.join(', ')}`);
        
        // Specific advice for Stratus or similar automation companies
        if (ipo.sector.toLowerCase().includes('automation') && result.grade === 'B') {
            console.log(`💡 Note: If you consider "Automation" as part of the Tech/Semi trending sector, this would score +30 more, making it a Grade A.`);
        }
        
        console.log("-".repeat(50));
    }
});
