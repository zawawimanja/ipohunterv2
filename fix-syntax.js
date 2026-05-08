const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('main.js', content, 'utf8');
console.log('Fixed main.js syntax');
