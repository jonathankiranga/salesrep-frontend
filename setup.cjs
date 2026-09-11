const fs = require('fs');
const w = (p,c) => fs.writeFileSync(p,c,'utf8');

w('e:/FreeSchool/salesrep-frontend/vite.config.js', [
  'import { defineConfig } from ' + JSON.stringify('vite') + ';',
  'import react from ' + JSON.stringify('@vitejs/plugin-react') + ';',
  'export default defineConfig({ plugins: [react()] });',
  ''
].join('\n'));

w('e:/FreeSchool/salesrep-frontend/postcss.config.js',
  'export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n');

w('e:/FreeSchool/salesrep-frontend/tailwind.config.js',
  'export default { content: [' + JSON.stringify('./index.html') + ',' + JSON.stringify('./src/**/*.{js,jsx}') + '], theme: { extend: {} }, plugins: [] };\n');

w('e:/FreeSchool/salesrep-frontend/.gitignore', 'node_modules\ndist\n.env\n');

const html = [
  '<!DOCTYPE html>',
  '<html lang=' + JSON.stringify('en') + '>',
  '  <head>',
  '    <meta charset=' + JSON.stringify('UTF-8') + ' />',
  '    <meta name=' + JSON.stringify('viewport') + ' content=' + JSON.stringify('width=device-width, initial-scale=1.0') + ' />',
  '    <title>Sales Rep Portal</title>',
  '  </head>',
  '  <body>',
  '    <div id=' + JSON.stringify('root') + '></div>',
  '    <script type=' + JSON.stringify('module') + ' src=' + JSON.stringify('/src/main.jsx') + '></script>',
  '  </body>',
  '</html>'
].join('\n');
w('e:/FreeSchool/salesrep-frontend/index.html', html);

const css = [
  '@tailwind base;',
  '@tailwind components;',
  '@tailwind utilities;',
  '',
  ':root { font-family: Inter, system-ui, sans-serif; }',
  '.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }',
  '.input-field { width: 100%; border: 1px solid #E0E0E0; border-radius: 8px; padding: 10px 12px; font-size: 14px; outline: none; transition: border-color .15s; }',
  '.input-field:focus { border-color: #7B4F9B; }',
  '.btn-primary { background: #7B4F9B; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s; }',
  '.btn-primary:disabled { opacity: .5; cursor: not-allowed; }',
  '.btn-secondary { background: #F4F0F6; color: #5C3D76; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }',
  '.badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }',
  '.table-wrap { overflow-x: auto; }',
  '.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }',
  '.data-table th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #888; border-bottom: 1px solid #F0F0F0; }',
  '.data-table td { padding: 10px 12px; border-bottom: 1px solid #F8F8F8; color: #333; }',
  '.data-table tr:last-child td { border-bottom: none; }'
].join('\n');
w('e:/FreeSchool/salesrep-frontend/src/index.css', css);

w('e:/FreeSchool/salesrep-frontend/src/main.jsx', [
  'import React from ' + JSON.stringify('react') + ';',
  'import ReactDOM from ' + JSON.stringify('react-dom/client') + ';',
  'import { BrowserRouter } from ' + JSON.stringify('react-router-dom') + ';',
  'import App from ' + JSON.stringify('./App.jsx') + ';',
  'import ' + JSON.stringify('./index.css') + ';',
  'ReactDOM.createRoot(document.getElementById(' + JSON.stringify('root') + ')).render(',
  '  <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>',
  ');'
].join('\n'));

console.log('Config files created');
