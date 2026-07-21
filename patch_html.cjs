const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the skills-bento div
const startStr = '<div class="skills-bento">';
const endStr = '</div>\n        </div>\n    </section>';

const startIdx = html.indexOf(startStr);
const endIdx = html.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const before = html.substring(0, startIdx);
    const after = html.substring(endIdx);
    const replacement = '<div id="skills-root"></div>\n';
    
    html = before + replacement + after;
    
    // Also remove the old electric-border-root
    const oldRootStr = '    <!-- React Component Mount Point -->\n    <div id="electric-border-root" style="margin: 40px auto; max-width: 600px;"></div>\n';
    html = html.replace(oldRootStr, '');
    
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Successfully updated index.html');
} else {
    console.log('Could not find start or end strings in index.html');
}
