const fs = require('fs');
const path = require('path');

function addCommentsToDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');

      // Process controllers
      if (dir.includes('controllers')) {
        content = content.replace(/^(exports\.[a-zA-Z0-9_]+\s*=\s*catchAsync\(async\s*\([^)]*\)\s*=>\s*\{)/gm, (match) => {
          const funcName = match.split('.')[1].split('=')[0].trim();
          const title = funcName.replace(/([A-Z])/g, ' $1').toUpperCase();
          const comment = `// ==========================================\n// ${title}\n// ==========================================\n`;
          // Prevent double comments
          if (content.includes(`// ${title}`)) return match;
          return comment + match;
        });
      }

      // Process routes
      if (dir.includes('routes')) {
        content = content.replace(/^(router\.(route|get|post|put|delete)\([^)]*\))/gm, (match) => {
          const routePathMatch = match.match(/['"]([^'"]+)['"]/);
          const routePath = routePathMatch ? routePathMatch[1] : 'ROUTE';
          const title = `ROUTE: ${routePath.toUpperCase()}`;
          const comment = `\n// ==========================================\n// ${title}\n// ==========================================\n`;
          if (content.includes(`// ${title}`)) return match;
          return comment + match;
        });
      }

      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
}

addCommentsToDirectory(path.join(__dirname, 'controllers'));
addCommentsToDirectory(path.join(__dirname, 'routes'));

console.log('Comments added successfully!');
