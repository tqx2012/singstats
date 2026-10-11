const { datasets } = require('./data/analyze.js');
let ds = datasets.find(d => d.id === 'cpi_inflation');
console.log(ds.data.slice(0, 10));
console.log(ds.data.slice(-10));
