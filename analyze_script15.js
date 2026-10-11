const { datasets } = require('./data/analyze.js');

let ds = datasets.find(d => d.id === 'nodx_trade');
let uoms = new Set(ds.data.map(d => d.UoM));
console.log('NODX UoM:', [...uoms]);

let maxes = new Map();
ds.data.forEach(d => {
   if (!maxes.has(d.Category)) maxes.set(d.Category, []);
   maxes.get(d.Category).push(Number(d.Value));
});
maxes.forEach((vals, ind) => {
   let max = Math.max(...vals);
   let uom = ds.data.find(d => d.Category === ind).UoM;
   console.log(`Category: ${ind}, Max: ${max}, UoM: ${uom}`);
});

