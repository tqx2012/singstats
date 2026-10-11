const { datasets } = require('./data/analyze.js');

datasets.forEach(ds => {
    // 1. Check Totals vs Sum of subcategories
    if (ds.fields.some(f => f.name.includes('Category') || f.name.includes('Group'))) {
        // Just heuristic: look for values containing "Total"
        let totalKeys = ds.data.filter(d => Object.values(d).some(v => typeof v === 'string' && v.includes('Total')));
        // specific for crime_scams we already found it.
    }
    
    // 2. Unit inconsistencies & domain issues
    let measure = ds.fields.find(f => f.type === 'measure');
    if (measure) {
        let maxV = Math.max(...ds.data.map(d => Number(d[measure.name])).filter(v => !isNaN(v)));
        let minV = Math.min(...ds.data.map(d => Number(d[measure.name])).filter(v => !isNaN(v)));
        if (ds.id === 'fertility_aging') {
            let tfr = ds.data.filter(d => d.Indicator_Group === 'Total Fertility Rate').map(d => Number(d[measure.name]));
            let maxTFR = Math.max(...tfr);
            if (maxTFR > 10) console.log(`${ds.id} TFR too high: ${maxTFR}`);
            let pop = ds.data.filter(d => d.Series_Name && d.Series_Name.includes('Population') && !d.Series_Name.includes('Proportion')).map(d => Number(d[measure.name]));
            let maxPop = Math.max(...pop);
            let minPop = Math.min(...pop);
            console.log(`${ds.id} Population range: ${minPop} - ${maxPop}`);
        }
    }

    // 3. Category labels duplicated or misspelled
    ds.fields.filter(f => f.type === 'dimension').forEach(dim => {
        let uniqueVals = [...new Set(ds.data.map(d => d[dim.name]))];
        let lowerVals = new Set();
        uniqueVals.forEach(v => {
            if (typeof v === 'string') {
                let lv = v.toLowerCase().trim();
                if (lowerVals.has(lv)) {
                    console.log(`Duplicate/Inconsistent label in ${ds.id}: '${v}' vs existing`);
                }
                lowerVals.add(lv);
                if (v.includes('Totla') || v.includes('total') || v.includes('Misspell')) {
                    console.log(`Misspelled label in ${ds.id}: '${v}'`);
                }
            }
        });
    });
});
