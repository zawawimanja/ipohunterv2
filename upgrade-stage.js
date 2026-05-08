const fs = require('fs');

const dataFile = '/home/awi/Desktop/ipohunter/data.js';
let content = fs.readFileSync(dataFile, 'utf8');

// replace "stage": 4 with "stage": 5
content = content.replace(/"stage":\s*4/g, '"stage": 5');

fs.writeFileSync(dataFile, content);
console.log('Updated data.js');

const mainFile = '/home/awi/Desktop/ipohunter/main.js';
let mainContent = fs.readFileSync(mainFile, 'utf8');

// Fix the auto-stage logic
mainContent = mainContent.replace(
    /if \(ipo\.year && ipo\.year < 2026\) \{\s*ipo\.stage = 4;/g,
    'if (ipo.year && ipo.year < 2026) {\n                ipo.stage = 5;'
);
mainContent = mainContent.replace(
    /if \(listDate <= now\) \{\s*ipo\.stage = 4;/g,
    'if (listDate <= now) {\n                    ipo.stage = 5;'
);
mainContent = mainContent.replace(
    /if \(ipo\.stage === 3 && ipo\.closingDate\) \{/g,
    'if ((ipo.stage === 3 || ipo.stage === 4) && ipo.closingDate) {'
);
mainContent = mainContent.replace(
    /if \(closeDate < now\) \{\s*ipo\.status = 'Application Closed';\s*\}/g,
    'if (closeDate < now) {\n                    ipo.status = \'Application Closed\';\n                    if (ipo.stage === 3) ipo.stage = 4;\n                }'
);

// getIpoGrade updates
mainContent = mainContent.replace(/ipo\.stage < 4/g, 'ipo.stage < 5');
mainContent = mainContent.replace(/ipo\.stage === 4/g, 'ipo.stage === 5');
mainContent = mainContent.replace(/ipo\.stage === 3 \|\| ipo\.stage === 4/g, 'ipo.stage === 3 || ipo.stage === 4 || ipo.stage === 5');
// Check missing listings
mainContent = mainContent.replace(/Must be stage 4/g, 'Must be stage 5');
// getPredictedGrade
mainContent = mainContent.replace(/ipo\.stage !== 4/g, 'ipo.stage !== 5');
// getIpoStrategy
mainContent = mainContent.replace(/ipo\.stage !== 3/g, '(ipo.stage !== 3 && ipo.stage !== 4)');

fs.writeFileSync(mainFile, mainContent);
console.log('Updated main.js');
