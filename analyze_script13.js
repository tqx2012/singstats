const { datasets } = require('./data/analyze.js');
let ds = datasets.find(d => d.id === 'gdp_industry');
console.log('GDP metrics:', [...new Set(ds.data.map(d => d.Metric))]);
let samples = ds.data.slice(0, 5);
console.log('GDP samples:', samples);

// check if there's thousands vs millions
let maxes = new Map();
ds.data.forEach(d => {
   if (!maxes.has(d.Industry)) maxes.set(d.Industry, []);
   maxes.get(d.Industry).push(Number(d.Value));
});
maxes.forEach((vals, ind) => {
   let max = Math.max(...vals);
   console.log(`Industry: ${ind}, Max: ${max}`);
});
