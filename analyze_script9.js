const { datasets } = require('./data/analyze.js');
let ds = datasets.find(d => d.id === 'fertility_aging');
let series = [...new Set(ds.data.map(d => d.Series_Name))];
console.log('Fertility Series:', series);
