const { datasets } = require('./data/analyze.js');
let ds = datasets.find(d => d.id === 'fertility_aging');
let births = ds.data.filter(d => d.Series_Name === 'Total Live-Births');
console.log('Births:', births.slice(0,5));

let ds2 = datasets.find(d => d.id === 'cpi_inflation');
let cpi_base = ds2.data.filter(d => d.Basket === 'All Items');
console.log('CPI All items (First 5):', cpi_base.slice(0,5));

let ds3 = datasets.find(d => d.id === 'population_demographics');
console.log('Pop Series:', [...new Set(ds3.data.map(d => d.Category))]);
let pop = ds3.data.filter(d => d.Category === 'Total Residents');
console.log('Pop values:', pop.slice(0,5));
