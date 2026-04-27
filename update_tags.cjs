const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.ts', 'utf8');

// Add AccessTag type
content = content.replace(
  'export interface Supplement {',
  "export type AccessTag = 'Standard' | 'Pharma' | 'Unregulated' | 'Frontier' | 'Restricted';\n\nexport interface Supplement {\n  accessTag: AccessTag;"
);

const supplementTags = {
  'Piracetam': 'Pharma',
  'Modafinil': 'Pharma',
  'Creatine Monohydrate': 'Standard',
  'Beta-Alanine': 'Standard',
  'Nicotinamide Mononucleotide (NMN)': 'Unregulated',
  'Rapamycin': 'Pharma',
  'Magnesium L-Threonate': 'Standard',
  'Apigenin': 'Standard',
  'Ashwagandha (KSM-66)': 'Standard',
  'L-Tyrosine': 'Standard',
  'Vitamin D3 + K2': 'Standard',
  'Omega-3 Fish Oil (High EPA)': 'Standard',
  'BPC-157': 'Frontier',
  'Cissus Quadrangularis': 'Standard',
};

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id: \'s') && lines[i].includes('name:')) {
    const match = lines[i].match(/name:\s*'([^']+)'/);
    if (match) {
      const name = match[1];
      let tag = 'Standard';
      if (supplementTags[name]) {
        tag = supplementTags[name];
      } else {
        if (lines[i].includes("category: 'Peptides'") || lines[i].includes("category: 'Research Chemicals'") || lines[i].includes("category: 'Experimental'")) {
          tag = 'Frontier';
        } else if (lines[i].includes("category: 'Focus'") || lines[i].includes("category: 'Memory'")) {
          tag = 'Pharma';
        }
      }
      lines[i] = lines[i].replace(/name:\s*'[^']+',/, `name: '${name}', accessTag: '${tag}',`);
    }
  }
}

content = lines.join('\n');
fs.writeFileSync('src/data/mockData.ts', content);
console.log('Done');
