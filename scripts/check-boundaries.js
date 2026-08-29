#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_IMPORTS = [
  {
    from: 'packages/core',
    to: ['packages/api-secure', 'packages/api-vulnerable'],
    message: 'core cannot import from api-secure or api-vulnerable',
  },
  {
    from: 'packages/api-secure',
    to: ['packages/api-vulnerable'],
    message: 'api-secure cannot import from api-vulnerable',
  },
];

function findTsFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
        files.push(...findTsFiles(fullPath));
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkFile(filePath, violations) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(ROOT, filePath);

  const importRegex = /^(?:import|export).*\sfrom\s+['"]([^'"]+)['"]/gm;
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    checkImport(relativePath, importPath, violations);
  }

  while ((match = dynamicImportRegex.exec(content)) !== null) {
    const importPath = match[1];
    checkImport(relativePath, importPath, violations);
  }
}

function checkImport(filePath, importPath, violations) {
  if (importPath.startsWith('.')) {
    return;
  }

  if (importPath.startsWith('@barberlab/')) {
    const pkg = importPath.replace('@barberlab/', '');
    const fromPkg = getPackageFromPath(filePath);

    if (fromPkg) {
      for (const rule of FORBIDDEN_IMPORTS) {
        if (rule.from === `packages/${fromPkg}` && rule.to.includes(`packages/${pkg}`)) {
          violations.push({
            file: filePath,
            import: importPath,
            message: rule.message,
          });
        }
      }
    }
  }
}

function getPackageFromPath(filePath) {
  if (filePath.startsWith('packages/core/')) return 'core';
  if (filePath.startsWith('packages/api-secure/')) return 'api-secure';
  if (filePath.startsWith('packages/api-vulnerable/')) return 'api-vulnerable';
  if (filePath.startsWith('packages/web/')) return 'web';
  return null;
}

function main() {
  console.log('[check:boundaries] Checking import boundaries...\n');

  const violations = [];

  for (const pkg of ['core', 'api-secure', 'api-vulnerable', 'web']) {
    const pkgDir = path.join(ROOT, 'packages', pkg, 'src');
    if (fs.existsSync(pkgDir)) {
      const files = findTsFiles(pkgDir);
      for (const file of files) {
        checkFile(file, violations);
      }
    }
  }

  if (violations.length > 0) {
    console.error('[check:boundaries] FAILED - Found boundary violations:\n');
    for (const v of violations) {
      console.error(`  ${v.file}`);
      console.error(`    Import: ${v.import}`);
      console.error(`    Error:  ${v.message}\n`);
    }
    process.exit(1);
  } else {
    console.log('[check:boundaries] PASSED - No boundary violations found\n');
    process.exit(0);
  }
}

main();
