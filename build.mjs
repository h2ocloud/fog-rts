// 把 src/ 內的模組依序內聯成單檔 dist/index.html
import fs from 'fs';
const S = 'src/';
const order = fs.readdirSync(S).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
const js = order.map(f => `/* ── ${f} ── */\n` + fs.readFileSync(S + f, 'utf8')).join('\n');
const css = ['style.css', 'theater.css', 'stats.css'].filter(f => fs.existsSync(S + f)).map(f => fs.readFileSync(S + f, 'utf8')).join('\n');
let html = fs.readFileSync(S + 'index.template.html', 'utf8');
html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(1) + ' KB', order.join(' '));
