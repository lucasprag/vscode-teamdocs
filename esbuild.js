const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Remove stale tsc output files that conflict with the bundle
const stale = ['out/explorer.js', 'out/util.js', 'out/extension.js.map',
                'out/explorer.js.map', 'out/util.js.map'];
for (const f of stale) {
  try { fs.unlinkSync(path.join(__dirname, f)); } catch {}
}

const ctx = esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: !production,
  minify: production,
});

ctx.then(c => watch ? c.watch() : c.rebuild().then(() => c.dispose()))
   .catch(() => process.exit(1));
