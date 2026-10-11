const { datasets } = require('./data/analyze.js');

datasets.forEach(ds => {
    let dimNames = ds.fields.filter(f => f.type === 'dimension').map(f => f.name);
    let measure = ds.fields.find(f => f.type === 'measure');
    if (!measure) return;

    let yField = dimNames.find(d => d.includes('Year') || d.includes('year'));
    if (!yField) {
        console.log(`${ds.id} NO YEAR FIELD`);
        return;
    }
    
    let years = ds.data.map(d => parseInt(d[yField])).filter(y => !isNaN(y));
    let minYear = Math.min(...years);
    let maxYear = Math.max(...years);
    if (minYear < 1950 || maxYear > 2026) {
        console.log(`${ds.id} Year out of bounds: ${minYear} - ${maxYear}`);
    }
});
