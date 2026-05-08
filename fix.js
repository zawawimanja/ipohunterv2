const fs = require('fs');
const filepath = 'c:\\\\Users\\\\aaror\\\\OneDrive - PERTUBUHAN KESELAMATAN SOSIAL\\\\Desktop\\\\ipo\\\\ipohunter\\\\main.js';
let content = fs.readFileSync(filepath, 'utf8');

// Replace 1: badge
content = content.replace(
    /const statusClass = ipo\.stage === 3 \? 'status-live' : \(\(ipo\.stage === 1 \|\| ipo\.stage === 2\) \? 'status-draft' : 'status-closed'\);\r?\n\r?\n    return `\r?\n        <div class="ipo-card glass-card">\r?\n            <div class="card-header">\r?\n                <div class="badges">/g,
    `const statusClass = ipo.stage === 3 ? 'status-live' : ((ipo.stage === 1 || ipo.stage === 2) ? 'status-draft' : 'status-closed');
    const grade = getIpoGrade(ipo);
    const gradeColor = grade === 'A' ? '#10b981' : grade === 'B' ? '#f59e0b' : '#ef4444';

    return \`
        <div class="ipo-card glass-card">
            <div class="card-header">
                <div class="badges">
                    <span class="badge grade-badge" style="border: 1px solid \${gradeColor}; color: \${gradeColor}; background: rgba(0,0,0,0.2);">Grade \${grade}</span>`
);

// Replace 2: event listeners
content = content.replace(
    /tabBtns\.forEach\(btn => \{\r?\n    btn\.addEventListener\('click', \(\) => \{\r?\n        tabBtns\.forEach\(b => b\.classList\.remove\('active'\)\);\r?\n        btn\.classList\.add\('active'\);\r?\n        renderIPOs\(btn\.dataset\.stage\);\r?\n    \}\);\r?\n\}\);\r?\n\r?\nrenderIPOs\(1\);/g,
    `tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStage = btn.dataset.stage;
        renderIPOs();
    });
});

const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-main)';
            b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--primary)';
        currentGrade = btn.dataset.grade;
        renderIPOs();
    });
});

renderIPOs();`
);

fs.writeFileSync(filepath, content, 'utf8');
