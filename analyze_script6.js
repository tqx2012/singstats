const { datasets } = require('./data/analyze.js');

datasets.forEach(ds => {
    let dimNames = ds.fields.filter(f => f.type === 'dimension' && !f.name.includes('Year') && f.name !== 'Decade').map(f => f.name);
    let measure = ds.fields.find(f => f.type === 'measure');
    if (!measure) return;

    let seriesMap = new Map();
    ds.data.forEach(d => {
        let key = dimNames.map(dim => d[dim]).join('|');
        if (!seriesMap.has(key)) seriesMap.set(key, []);
        let y = parseInt(d.Year || d.Census_Year);
        let v = parseFloat(d[measure.name]);
        if (!isNaN(y) && !isNaN(v)) {
            seriesMap.get(key).push({y, v});
        }
    });

    let maxJump = 0;
    let jumpInfo = '';
    seriesMap.forEach((points, key) => {
        points.sort((a,b) => a.y - b.y);
        for(let i=1; i<points.length; i++) {
            let prev = points[i-1];
            let curr = points[i];
            if (curr.y === prev.y + 1) { // consecutive years
                let ratio = Math.max(prev.v / (curr.v || 1), curr.v / (prev.v || 1));
                if (ratio > maxJump && prev.v !== 0 && curr.v !== 0) {
                    maxJump = ratio;
                    jumpInfo = `${ds.id} (${key}): ${prev.y}=${prev.v} -> ${curr.y}=${curr.v} (~${Math.round(ratio)}x)`;
                }
            }
        }
    });
    if (maxJump > 5) console.log(jumpInfo);
});
