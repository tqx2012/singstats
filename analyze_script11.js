const { datasets } = require('./data/analyze.js');
let ds = datasets.find(d => d.id === 'population_demographics');
console.log('Pop Fields:', ds.fields.map(f => f.name));
console.log('Pop data 0:', ds.data[0]);

let pp = datasets.find(d => d.id === 'property_price_index');
console.log('Property first row:', pp.data[0]);
