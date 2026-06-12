const fs = require('fs');

const files = [
  'src/components/BarcodeScanner.tsx',
  'src/components/store/ProductDetailDialog.tsx',
  'src/pages/Invoices.tsx',
  'src/pages/ProductFinder.tsx',
  'src/pages/Products.tsx',
  'src/pages/Quotations.tsx',
  'src/pages/Store.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\{\s*\}/g, '{/* no-op */}');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed empty blocks in ${file}`);
  }
}
