const { datasets } = require('./data/analyze.js');

datasets.forEach(ds => {
    // Check misspelled/duplicated categories
    let dims = ds.fields.filter(f => f.type === 'dimension').map(f => f.name);
    dims.forEach(dim => {
        let vals = [...new Set(ds.data.map(d => d[dim]))];
        // Look for similar strings (e.g. "Total " vs "Total", lowercase vs uppercase)
        let normalized = vals.map(v => typeof v === 'string' ? v.trim().toLowerCase() : String(v));
        let setN = new Set(normalized);
        if (setN.size !== vals.length) {
            console.log(`Duplicate/Inconsistent casing/spacing in ${ds.id}, field ${dim}:`, vals);
        }
    });

    // Subcategory summation check for everything
    if (ds.id === 'cpi_inflation') {
       console.log('CPI Fields:', ds.fields.map(f => f.name));
       let bases = [...new Set(ds.data.filter(d => d.Basket === 'All Items').map(d => d.Metric))];
       console.log('CPI Metrics:', bases);
    }
    
    // Percent charts can exceed 100%? dashboard.js viz logic?
});
