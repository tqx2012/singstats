const { datasets } = require('./data/analyze.js');

datasets.forEach(ds => {
    console.log(`\n=== Dataset: ${ds.id} ===`);
    let years = ds.data.map(d => parseInt(d.Year)).filter(y => !isNaN(y));
    let minYear = Math.min(...years);
    let maxYear = Math.max(...years);
    console.log(`Years: ${minYear} - ${maxYear}`);
    
    // Check missing values or 'na'
    let nas = ds.data.filter(d => typeof d.Value === 'string' && ['na', '..', '-', ''].includes(d.Value.toLowerCase().trim()));
    if (nas.length > 0) console.log(`Missing values found: ${nas.length} instances`);
    
    // Domain / Logic checks
    if (ds.id === 'crime_scams') {
        const yearsSet = new Set(years);
        yearsSet.forEach(y => {
            const dataYear = ds.data.filter(d => d.Year == y);
            const totalPhys = dataYear.find(d => d.Crime_Subtype === 'Physical Crime Total');
            const subPhys = dataYear.filter(d => d.Category_Type === 'Physical Crime' && d.Crime_Subtype !== 'Physical Crime Total' && d.Metric_Type === 'Cases Recorded');
            const sumPhys = subPhys.reduce((sum, d) => sum + Number(d.Value), 0);
            if (totalPhys && sumPhys !== Number(totalPhys.Value)) {
                console.log(`Year ${y} Physical Crime Total mismatch: Total=${totalPhys.Value}, Sum=${sumPhys}`);
            }

            const totalScam = dataYear.find(d => d.Crime_Subtype === 'Scams & Cybercrimes Total');
            const subScam = dataYear.filter(d => d.Category_Type === 'Scams & Cybercrimes' && d.Crime_Subtype !== 'Scams & Cybercrimes Total' && d.Metric_Type === 'Cases Recorded');
            const sumScam = subScam.reduce((sum, d) => sum + Number(d.Value), 0);
            if (totalScam && sumScam !== Number(totalScam.Value)) {
                console.log(`Year ${y} Scams Total mismatch: Total=${totalScam.Value}, Sum=${sumScam}`);
            }
        });
    }

    if (ds.id === 'fertility_aging') {
       let tfrs = ds.data.filter(d => d.Indicator_Group === 'Total Fertility Rate');
       tfrs.forEach(t => {
           if(t.Value > 10 || t.Value < 0.5) console.log(`Anomalous TFR: Year ${t.Year}, Value ${t.Value}`);
       });
       let pops = ds.data.filter(d => d.Series_Name && d.Series_Name.includes('Population'));
       pops.forEach(p => {
           if(p.Value > 10000000) console.log(`Anomalous Population (too high): Year ${p.Year}, Value ${p.Value}, Series ${p.Series_Name}`);
           if(p.Value < 10) console.log(`Anomalous Population (too low? unit issue?): Year ${p.Year}, Value ${p.Value}, Series ${p.Series_Name}`);
       });
       
       let labels = new Set(ds.data.map(d => d.Indicator_Group));
       console.log("Labels in fertility:", [...labels].join(', '));
       let dupes = new Set();
       ds.data.forEach(d => {
          if (d.Indicator_Group === 'Totla Fertility Rate') console.log("Misspelled category: Totla Fertility Rate");
       });
    }
});
