const { datasets } = require('./data/analyze.js');

datasets.forEach(ds => {
    // We group by all dimensions except Year
    let dimNames = ds.fields.filter(f => f.type === 'dimension' && f.name !== 'Year' && f.name !== 'Decade').map(f => f.name);
    let measure = ds.fields.find(f => f.type === 'measure');
    if (!measure) return;

    let seriesMap = new Map();
    ds.data.forEach(d => {
        let key = dimNames.map(dim => d[dim]).join('|');
        if (!seriesMap.has(key)) seriesMap.set(key, []);
        let y = parseInt(d.Year || d.Census_Year);
        let v = parseFloat(d[measure.name]);
        if (!isNaN(y) && !isNaN(v)) {
            seriesMap.get(key).push({y, v, raw: d});
        }
    });

    seriesMap.forEach((points, key) => {
        points.sort((a,b) => a.y - b.y);
        for(let i=1; i<points.length; i++) {
            let prev = points[i-1];
            let curr = points[i];
            if (curr.y === prev.y + 1) { // consecutive years
                if (prev.v > 0 && curr.v > prev.v * 900) {
                    console.log(`Massive jump in ${ds.id} (${key}): ${prev.y}=${prev.v} -> ${curr.y}=${curr.v} (~${Math.round(curr.v/prev.v)}x)`);
                }
                if (curr.v > 0 && prev.v > curr.v * 900) {
                    console.log(`Massive drop in ${ds.id} (${key}): ${prev.y}=${prev.v} -> ${curr.y}=${curr.v} (~${Math.round(prev.v/curr.v)}x)`);
                }
            }
        }
    });
});
