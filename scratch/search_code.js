const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../src/app/api');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      search(filePath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const hasQuery = line.includes('.find(') || line.includes('.findOne(') || line.includes('.findById(') || line.includes('.findByIdAndUpdate(');
        const hasExec = line.includes('.exec()');
        if (hasQuery && !hasExec) {
          console.log(`Match: ${filePath} L${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

search(apiDir);
