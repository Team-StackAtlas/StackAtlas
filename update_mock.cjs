const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.ts', 'utf8');

const replacements = [
  { oldD: "'Enhancement'", oldC: "'Nootropics'", newD: "'Mind'", newC: "'Focus'" },
  { oldD: "'Enhancement'", oldC: "'Performance'", newD: "'Body'", newC: "'Endurance'" },
  { oldD: "'Enhancement'", oldC: "'Longevity'", newD: "'Vitality'", newC: "'Longevity'" },
  { oldD: "'Wellness'", oldC: "'Sleep Optimization'", newD: "'Mind'", newC: "'Sleep'" },
  { oldD: "'Wellness'", oldC: "'Stress Management'", newD: "'Mind'", newC: "'Mood'" },
  { oldD: "'Wellness'", oldC: "'Nutritional Foundations'", newD: "'Vitality'", newC: "'Gut Health'" },
  { oldD: "'Therapeutics'", oldC: "'Rehabilitation'", newD: "'Body'", newC: "'Recovery'" },
  { oldD: "'Therapeutics'", oldC: "'Mood Regulation'", newD: "'Mind'", newC: "'Mood'" },
  { oldD: "'Therapeutics'", oldC: "'ADHD & Focus'", newD: "'Mind'", newC: "'Focus'" },
  { oldD: "'Experimental'", oldC: "'Peptides'", newD: "'The Frontier'", newC: "'Peptides'" },
  { oldD: "'Experimental'", oldC: "'Research Chemicals'", newD: "'The Frontier'", newC: "'Research Chemicals'" },
  { oldD: "'Experimental'", oldC: "'Novel Compounds'", newD: "'The Frontier'", newC: "'Experimental'" },
];

for (const r of replacements) {
  const regex = new RegExp(`domain: ${r.oldD}, category: ${r.oldC}`, 'g');
  content = content.replace(regex, `domain: ${r.newD}, category: ${r.newC}`);
}

content = content.replace(/\/\/ ENHANCEMENT - Nootropics/g, '// MIND - Focus');
content = content.replace(/\/\/ ENHANCEMENT - Performance/g, '// BODY - Endurance');
content = content.replace(/\/\/ ENHANCEMENT - Longevity/g, '// VITALITY - Longevity');
content = content.replace(/\/\/ WELLNESS - Sleep Optimization/g, '// MIND - Sleep');
content = content.replace(/\/\/ WELLNESS - Stress Management/g, '// MIND - Mood');
content = content.replace(/\/\/ WELLNESS - Nutritional Foundations/g, '// VITALITY - Gut Health');
content = content.replace(/\/\/ THERAPEUTICS - Rehabilitation/g, '// BODY - Recovery');
content = content.replace(/\/\/ THERAPEUTICS - Mood Regulation/g, '// MIND - Mood');
content = content.replace(/\/\/ THERAPEUTICS - ADHD & Focus/g, '// MIND - Focus');
content = content.replace(/\/\/ EXPERIMENTAL - Peptides/g, '// THE FRONTIER - Peptides');
content = content.replace(/\/\/ EXPERIMENTAL - Research Chemicals/g, '// THE FRONTIER - Research Chemicals');
content = content.replace(/\/\/ EXPERIMENTAL - Novel Compounds/g, '// THE FRONTIER - Experimental');

fs.writeFileSync('src/data/mockData.ts', content);
console.log('Done');
