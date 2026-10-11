const { datasets } = require('./data/analyze.js');

datasets.forEach(ds => {
    // 1. Missing data silently treated as 0 or skipped
    let nas = ds.data.filter(d => typeof d.Value === 'string' && ['na', '..', '-', ''].includes(d.Value.toLowerCase().trim()));
    if (nas.length > 0) console.log(`${ds.id}: Missing values found: ${nas.length} instances`);
    
    // 2. Unit inconsistencies
    if (ds.id === 'planning_area_housing') {
        console.log(`planning_area_housing first 2 rows:`, ds.data.slice(0, 2));
    }
    
    if (ds.id === 'fertility_aging') {
       // Look for missing years or jumping values
       let pops = ds.data.filter(d => d.Series_Name && d.Series_Name.includes('Population') && !d.Series_Name.includes('Proportion'));
       pops.forEach(p => {
           if (p.Value < 1000) console.log(`Unit issue in population? Year ${p.Year}, Value ${p.Value} (Should be actual number but might be in thousands)`);
       });
    }

    if (ds.id === 'cpi_inflation') {
       let cpis = ds.data.filter(d => d.Indicator === 'All Items CPI' && d.Year == '2020');
       console.log(`CPI in 2020 (Base year check):`, cpis);
    }
});
