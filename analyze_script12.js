const { datasets } = require('./data/analyze.js');
let ds = datasets.find(d => d.id === 'population_demographics');
let total = ds.data.filter(d => d.Age_Group === 'Total Residents' && d.Sex === 'Total' && d.Ethnicity === 'All Ethnicities');
if (total.length > 0) {
    console.log('Pop total:', total.slice(0,3));
} else {
    // try to sum
    let y2023 = ds.data.filter(d => d.Year === '2023' && d.Sex === 'Total' && d.Ethnicity === 'All Ethnicities' && d.Age_Group !== 'Total');
    let sum = y2023.reduce((acc, d) => acc + Number(d.Population), 0);
    console.log('Pop 2023 sum:', sum);
}
