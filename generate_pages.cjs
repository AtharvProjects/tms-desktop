const fs = require('fs');
const path = require('path');

const pages = [
  'Trips',
  'Vehicles',
  'Drivers',
  'Parties',
  'Diesel',
  'Expenses',
  'Invoices',
  'Settings'
];

pages.forEach(page => {
  const content = `export default function ${page}() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">${page}</h1>
      <div className="glass p-6 rounded-xl">
        <p>This is the ${page} module.</p>
      </div>
    </div>
  )
}
`;
  fs.writeFileSync(path.join(__dirname, 'src/pages', `${page}.tsx`), content);
});

console.log('Pages generated successfully!');
