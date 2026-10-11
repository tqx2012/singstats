const { datasets } = require('./data/analyze.js');
let ds = datasets.find(d => d.id === 'gdp_industry');

let maxes = new Map();
ds.data.forEach(d => {
   if (!maxes.has(d.Sector)) maxes.set(d.Sector, []);
   maxes.get(d.Sector).push(Number(d.GDP_Value));
});
maxes.forEach((vals, ind) => {
   let max = Math.max(...vals);
   let uom = ds.data.find(d => d.Sector === ind).UoM;
   console.log(`Sector: ${ind}, Max: ${max}, UoM: ${uom}`);
});
