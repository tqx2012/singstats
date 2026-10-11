const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const result = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      let field = line.substring(start, i).trim();
      if (field.startsWith('"') && field.endsWith('"')) {
        field = field.substring(1, field.length - 1).replace(/""/g, '"');
      }
      result.push(field);
      start = i + 1;
    }
  }
  let lastField = line.substring(start).trim();
  if (lastField.startsWith('"') && lastField.endsWith('"')) {
    lastField = lastField.substring(1, lastField.length - 1).replace(/""/g, '"');
  }
  result.push(lastField);
  return result;
}

function getDecade(year) {
  const y = parseInt(year, 10);
  if (isNaN(y)) return "Other";
  return Math.floor(y / 10) * 10 + "s";
}

// -------------------------------------------------------------
// 1. DATASET: crime_scams
// Source: M891481.csv
// -------------------------------------------------------------
function buildCrimeScamsDataset() {
  const file = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M891481.csv');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = parseCSVLine(lines[1]);
  const years = header.slice(4).map(y => y.trim()); // 2020 to 2025

  const data = [];
  for (let i = 2; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 5) continue;
    const seriesNo = row[0].trim();
    const desc = row[1].trim();
    const uom = row[2].trim();

    // Map to clear category and metric
    let categoryType = "Physical Crime";
    let crimeSubtype = desc;
    let metricType = "Cases Recorded";

    if (seriesNo === "1") {
      crimeSubtype = "Physical Crime Total";
      categoryType = "Physical Crime";
      metricType = "Cases Recorded";
    } else if (seriesNo.startsWith("1.")) {
      categoryType = "Physical Crime";
      metricType = "Cases Recorded";
    } else if (seriesNo === "2") {
      crimeSubtype = "Scams & Cybercrimes Total";
      categoryType = "Scams & Cybercrimes";
      metricType = "Cases Recorded";
    } else if (seriesNo === "2.1") {
      crimeSubtype = "Scams";
      categoryType = "Scams & Cybercrimes";
      metricType = "Cases Recorded";
    } else if (seriesNo === "3") {
      crimeSubtype = "Physical Crime Rate";
      categoryType = "Crime Rate per 100k";
      metricType = "Rate per 100k Population";
    } else if (seriesNo === "4") {
      crimeSubtype = "Scams & Cybercrimes Rate";
      categoryType = "Crime Rate per 100k";
      metricType = "Rate per 100k Population";
    } else if (seriesNo === "4.1") {
      crimeSubtype = "Scams Rate";
      categoryType = "Crime Rate per 100k";
      metricType = "Rate per 100k Population";
    } else {
      continue; // Skip granular rate subcategories to keep dataset clean
    }

    years.forEach((yr, idx) => {
      const raw = row[4 + idx];
      if (raw && raw !== "na" && raw !== "-") {
        const val = parseFloat(raw.replace(/,/g, ''));
        if (!isNaN(val)) {
          data.push({
            Year: yr,
            Category_Type: categoryType,
            Crime_Subtype: crimeSubtype,
            Metric_Type: metricType,
            Value: val
          });
        }
      }
    });
  }

  return {
    id: "crime_scams",
    title: "Singapore Crime Landscape: Scams & Cybercrime Surge (2020 - 2025)",
    theme: "Society",
    subject: "Public Safety & Law Enforcement",
    description: "Annual crime cases recorded by Singapore Police Force detailing the explosion of scams & cybercrime surpassing traditional physical crimes.",
    defaultPreset: {
      chartType: "stacked_bar",
      xField: "Year",
      yField: "Value",
      yAgg: "sum",
      colorField: "Crime_Subtype",
      filters: {
        "Metric_Type": ["Cases Recorded"],
        "Crime_Subtype": ["Physical Crime Total", "Scams & Cybercrimes Total"]
      }
    },
    fields: [
      { name: "Year", type: "dimension", role: "time" },
      { name: "Category_Type", type: "dimension", role: "category" },
      { name: "Crime_Subtype", type: "dimension", role: "category" },
      { name: "Metric_Type", type: "dimension", role: "category" },
      { name: "Value", type: "measure", defaultAgg: "sum", format: "integer" }
    ],
    data: data
  };
}

// -------------------------------------------------------------
// 2. DATASET: fertility_aging
// Sources: M810091.csv (Births & Fertility), M810611.csv (Elderly)
// -------------------------------------------------------------
function buildFertilityAgingDataset() {
  const data = [];

  // M810091
  const fFile = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M810091.csv');
  const fLines = fs.readFileSync(fFile, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const fHeader = parseCSVLine(fLines[1]);
  const fYears = fHeader.slice(4).map(y => y.trim());

  const targetFertRows = [
    { rowDesc: "Total Fertility Rate (TFR)", name: "Total Fertility Rate (TFR)", group: "Total Fertility Rate", unit: "Per Female", agg: "avg" },
    { rowDesc: "Chinese", name: "Chinese TFR", group: "TFR by Ethnicity", unit: "Per Female", agg: "avg" },
    { rowDesc: "Malays", name: "Malay TFR", group: "TFR by Ethnicity", unit: "Per Female", agg: "avg" },
    { rowDesc: "Indians", name: "Indian TFR", group: "TFR by Ethnicity", unit: "Per Female", agg: "avg" },
    { rowDesc: "Total Live-Births", name: "Total Live-Births", group: "Live Birth Counts", unit: "Number of Births", agg: "sum" },
    { rowDesc: "Resident Live-Births", name: "Resident Live-Births", group: "Live Birth Counts", unit: "Number of Births", agg: "sum" },
    { rowDesc: "Citizen Live-Births", name: "Citizen Live-Births", group: "Live Birth Counts", unit: "Number of Births", agg: "sum" }
  ];

  for (let i = 2; i < fLines.length; i++) {
    const row = parseCSVLine(fLines[i]);
    if (row.length < 5) continue;
    const desc = row[1].trim();
    const target = targetFertRows.find(t => t.rowDesc.toLowerCase() === desc.toLowerCase());
    if (target) {
      fYears.forEach((yr, idx) => {
        const raw = row[4 + idx];
        if (raw && raw !== "na" && raw !== "-") {
          const val = parseFloat(raw.replace(/,/g, ''));
          if (!isNaN(val)) {
            data.push({
              Year: yr,
              Decade: getDecade(yr),
              Indicator_Group: target.group,
              Series_Name: target.name,
              Unit: target.unit,
              Value: val
            });
          }
        }
      });
    }
  }

  // M810611 (Elderly)
  const eFile = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M810611.csv');
  const eLines = fs.readFileSync(eFile, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const eHeader = parseCSVLine(eLines[1]);
  const eYears = eHeader.slice(4).map(y => y.trim());

  const targetElderRows = [
    { rowDesc: "Proportion Of Elderly Residents (65 Years & Over) Among Resident Population", name: "Elderly Proportion (65+)", group: "Aging Population", unit: "Per Cent" },
    { rowDesc: "Number Of Elderly Residents (65 Years & Over) Who Are Living In One-Person Household", name: "Elderly Living Alone", group: "Elderly Households", unit: "Number of Persons" }
  ];

  for (let i = 2; i < eLines.length; i++) {
    const row = parseCSVLine(eLines[i]);
    if (row.length < 5) continue;
    const desc = row[1].trim();
    const target = targetElderRows.find(t => t.rowDesc.toLowerCase() === desc.toLowerCase());
    if (target) {
      eYears.forEach((yr, idx) => {
        const raw = row[4 + idx];
        if (raw && raw !== "na" && raw !== "-") {
          const val = parseFloat(raw.replace(/,/g, ''));
          if (!isNaN(val)) {
            data.push({
              Year: yr,
              Decade: getDecade(yr),
              Indicator_Group: target.group,
              Series_Name: target.name,
              Unit: target.unit,
              Value: val
            });
          }
        }
      });
    }
  }

  return {
    id: "fertility_aging",
    title: "Singapore Fertility Collapse & Super-Aged Demographics (1960 - 2026)",
    theme: "Population",
    subject: "Demographics & Vital Statistics",
    description: "Historical tracking of Total Fertility Rate (plunging to record 0.87) alongside citizen aging crossing into a super-aged society in 2026.",
    defaultPreset: {
      chartType: "line",
      xField: "Year",
      yField: "Value",
      yAgg: "avg",
      colorField: "Series_Name",
      filters: {
        "Indicator_Group": ["Total Fertility Rate", "TFR by Ethnicity"]
      }
    },
    fields: [
      { name: "Year", type: "dimension", role: "time" },
      { name: "Decade", type: "dimension", role: "time" },
      { name: "Indicator_Group", type: "dimension", role: "category" },
      { name: "Series_Name", type: "dimension", role: "category" },
      { name: "Unit", type: "dimension", role: "uom" },
      { name: "Value", type: "measure", defaultAgg: "avg", format: "number" }
    ],
    data: data
  };
}

// -------------------------------------------------------------
// 3. DATASET: property_price_index
// Sources: M212161.csv (HDB Resale Index), M212261.csv (Private Residential)
// -------------------------------------------------------------
function buildPropertyPriceDataset() {
  const data = [];

  // M212161 HDB Resale
  const hdbFile = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M212161.csv');
  const hLines = fs.readFileSync(hdbFile, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const hHeader = parseCSVLine(hLines[1]);
  const quarters = hHeader.slice(4).map(q => q.trim());

  for (let i = 2; i < hLines.length; i++) {
    const row = parseCSVLine(hLines[i]);
    if (row.length < 5) continue;
    const desc = row[1].trim();
    if (desc === "HDB Resale Price Index") {
      quarters.forEach((q, idx) => {
        const raw = row[4 + idx];
        if (raw && raw !== "na" && raw !== "-") {
          const val = parseFloat(raw.replace(/,/g, ''));
          if (!isNaN(val)) {
            const [yr, qtr] = q.split(' ');
            data.push({
              Period: q,
              Year: yr,
              Quarter: qtr || "All",
              Property_Sector: "HDB Resale Index",
              Housing_Type: "Public Housing",
              Index_Value: val
            });
          }
        }
      });
    }
  }

  // M212261 Private Residential
  const privFile = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M212261.csv');
  const pLines = fs.readFileSync(privFile, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const pHeader = parseCSVLine(pLines[1]);
  const pQuarters = pHeader.slice(4).map(q => q.trim());

  const targetPrivRows = [
    { rowDesc: "Residential Properties", name: "Private Residential All", type: "Private Residential" },
    { rowDesc: "Landed", name: "Private Landed", type: "Private Residential" },
    { rowDesc: "Non-Landed", name: "Private Non-Landed", type: "Private Residential" }
  ];

  for (let i = 2; i < pLines.length; i++) {
    const row = parseCSVLine(pLines[i]);
    if (row.length < 5) continue;
    const desc = row[1].trim();
    const target = targetPrivRows.find(t => t.rowDesc.toLowerCase() === desc.toLowerCase());
    if (target) {
      pQuarters.forEach((q, idx) => {
        const raw = row[4 + idx];
        if (raw && raw !== "na" && raw !== "-") {
          const val = parseFloat(raw.replace(/,/g, ''));
          if (!isNaN(val)) {
            const [yr, qtr] = q.split(' ');
            data.push({
              Period: q,
              Year: yr,
              Quarter: qtr || "All",
              Property_Sector: target.name,
              Housing_Type: target.type,
              Index_Value: val
            });
          }
        }
      });
    }
  }

  return {
    id: "property_price_index",
    title: "Housing Affordability & Property Price Index (1990 - 2026 Q2)",
    theme: "Economy & Prices",
    subject: "Real Estate & Housing",
    description: "Quarterly HDB Resale Price Index and Private Residential Property Price Indices (1Q2009 = 100), documenting the 2024-2026 surge past index 203.",
    defaultPreset: {
      chartType: "line",
      xField: "Period",
      yField: "Index_Value",
      yAgg: "avg",
      colorField: "Property_Sector",
      filters: {
        "Property_Sector": ["HDB Resale Index", "Private Residential All", "Private Non-Landed"]
      }
    },
    fields: [
      { name: "Period", type: "dimension", role: "time" },
      { name: "Year", type: "dimension", role: "time" },
      { name: "Quarter", type: "dimension", role: "time" },
      { name: "Property_Sector", type: "dimension", role: "category" },
      { name: "Housing_Type", type: "dimension", role: "category" },
      { name: "Index_Value", type: "measure", defaultAgg: "avg", format: "number" }
    ],
    data: data
  };
}

// -------------------------------------------------------------
// 4. DATASET: climate_weather
// Source: M890191.csv (Annual Temperature, Sunshine, Rainfall)
// -------------------------------------------------------------
function buildClimateWeatherDataset() {
  const data = [];
  const file = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M890191.csv');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = parseCSVLine(lines[1]);
  const years = header.slice(4).map(y => y.trim());

  const targetRows = [
    { desc: "Air Temperature Means Daily Maximum", name: "Mean Daily Maximum Temp", unit: "°C", agg: "avg" },
    { desc: "Air Temperature Absolute Extremes Maximum", name: "Absolute Extreme Max Temp", unit: "°C", agg: "max" },
    { desc: "Air Temperature Means Daily Minimum", name: "Mean Daily Minimum Temp", unit: "°C", agg: "avg" },
    { desc: "Total Rainfall", name: "Total Annual Rainfall", unit: "mm", agg: "sum" },
    { desc: "Highest Daily Rainfall Total", name: "Peak Daily Rainfall", unit: "mm", agg: "max" },
    { desc: "Number Of Rainy Days", name: "Rainy Days Count", unit: "Days", agg: "sum" }
  ];

  for (let i = 2; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 5) continue;
    const desc = row[1].trim();
    const target = targetRows.find(t => t.desc.toLowerCase() === desc.toLowerCase());
    if (target) {
      years.forEach((yr, idx) => {
        const raw = row[4 + idx];
        if (raw && raw !== "na" && raw !== "-") {
          const val = parseFloat(raw.replace(/,/g, ''));
          if (!isNaN(val)) {
            data.push({
              Year: yr,
              Decade: getDecade(yr),
              Weather_Metric: target.name,
              Unit: target.unit,
              Value: val
            });
          }
        }
      });
    }
  }

  return {
    id: "climate_weather",
    title: "Singapore Climate Crisis & Extreme Urban Heat (1960 - 2025)",
    theme: "Environment",
    subject: "Climate & Meteorology",
    description: "Meteorological Service Singapore records showing temperature maximums approaching 36°C and extreme rainfall, driving the 2026 Year of Climate Adaptation.",
    defaultPreset: {
      chartType: "line",
      xField: "Year",
      yField: "Value",
      yAgg: "avg",
      colorField: "Weather_Metric",
      filters: {
        "Weather_Metric": ["Mean Daily Maximum Temp", "Absolute Extreme Max Temp"]
      }
    },
    fields: [
      { name: "Year", type: "dimension", role: "time" },
      { name: "Decade", type: "dimension", role: "time" },
      { name: "Weather_Metric", type: "dimension", role: "category" },
      { name: "Unit", type: "dimension", role: "uom" },
      { name: "Value", type: "measure", defaultAgg: "avg", format: "number" }
    ],
    data: data
  };
}

// -------------------------------------------------------------
// 5. DATASET: nodx_trade
// Sources: M451301.csv (NODX by Market), M450981.csv (NODX Products)
// Filtered to 2018-2026 for tight relevance to current geopolitics & AI boom
// -------------------------------------------------------------
function buildNodxTradeDataset() {
  const data = [];

  // M451301 Markets
  const mFile = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M451301.csv');
  const mLines = fs.readFileSync(mFile, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const mHeader = parseCSVLine(mLines[1]);
  const mPeriods = mHeader.slice(4).map(p => p.trim());

  const targetMarkets = [
    { rowDesc: "United States Of America", name: "United States" },
    { rowDesc: "Mainland China", name: "Mainland China" },
    { rowDesc: "Taiwan", name: "Taiwan" },
    { rowDesc: "EU", name: "European Union (EU)" },
    { rowDesc: "Malaysia", name: "Malaysia" },
    { rowDesc: "Indonesia", name: "Indonesia" },
    { rowDesc: "Republic Of Korea", name: "South Korea" },
    { rowDesc: "Japan", name: "Japan" }
  ];

  for (let i = 2; i < mLines.length; i++) {
    const row = parseCSVLine(mLines[i]);
    if (row.length < 5) continue;
    const desc = row[1].trim();
    const target = targetMarkets.find(t => t.rowDesc.toLowerCase() === desc.toLowerCase());
    if (target) {
      mPeriods.forEach((p, idx) => {
        // Only 2018 onwards
        const [yr, month] = p.split(' ');
        const yrNum = parseInt(yr, 10);
        if (yrNum >= 2018) {
          const raw = row[4 + idx];
          if (raw && raw !== "na" && raw !== "-") {
            const val = parseFloat(raw.replace(/,/g, ''));
            if (!isNaN(val)) {
              data.push({
                Period: p,
                Year: yr,
                Month: month || "All",
                Trade_Dimension: "Destination Market",
                Category: target.name,
                Export_Mil_SGD: Math.round((val / 1000) * 10) / 10 // Thousand SGD -> Million SGD
              });
            }
          }
        }
      });
    }
  }

  // M450981 Products
  const pFile = path.join(__dirname, '../singstat_data/csv/SingStat Table Builder/M450981.csv');
  const pLines = fs.readFileSync(pFile, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const pHeader = parseCSVLine(pLines[1]);
  const pPeriods = pHeader.slice(4).map(p => p.trim());

  const targetProducts = [
    { rowDesc: "Total Electronic Products", name: "Electronics Total" },
    { rowDesc: "Integrated Circuits", name: "Integrated Circuits (Semiconductors)" },
    { rowDesc: "Personal Computers", name: "Personal Computers" },
    { rowDesc: "Specialised Machinery", name: "Specialised Machinery" },
    { rowDesc: "Pharmaceuticals", name: "Pharmaceuticals" },
    { rowDesc: "Petrochemicals", name: "Petrochemicals" }
  ];

  for (let i = 2; i < pLines.length; i++) {
    const row = parseCSVLine(pLines[i]);
    if (row.length < 5) continue;
    const desc = row[1].trim();
    const target = targetProducts.find(t => t.rowDesc.toLowerCase() === desc.toLowerCase());
    if (target) {
      pPeriods.forEach((p, idx) => {
        const [yr, month] = p.split(' ');
        const yrNum = parseInt(yr, 10);
        if (yrNum >= 2018) {
          const raw = row[4 + idx];
          if (raw && raw !== "na" && raw !== "-") {
            const val = parseFloat(raw.replace(/,/g, ''));
            if (!isNaN(val)) {
              data.push({
                Period: p,
                Year: yr,
                Month: month || "All",
                Trade_Dimension: "Product Division",
                Category: target.name,
                Export_Mil_SGD: Math.round((val / 1000) * 10) / 10 // Thousand SGD -> Million SGD
              });
            }
          }
        }
      });
    }
  }

  return {
    id: "nodx_trade",
    title: "Global Geoeconomic Shift & Semiconductor Trade (2018 - 2026)",
    theme: "Trade & Investment",
    subject: "Merchandise Trade & NODX",
    description: "Monthly Non-Oil Domestic Exports across major world markets (US, China, Taiwan, EU) and high-tech sectors including the AI semiconductor wave.",
    defaultPreset: {
      chartType: "stacked_bar",
      xField: "Year",
      yField: "Export_Mil_SGD",
      yAgg: "sum",
      colorField: "Category",
      filters: {
        "Trade_Dimension": ["Destination Market"],
        "Category": ["United States", "Mainland China", "Taiwan", "European Union (EU)"]
      }
    },
    fields: [
      { name: "Period", type: "dimension", role: "time" },
      { name: "Year", type: "dimension", role: "time" },
      { name: "Month", type: "dimension", role: "time" },
      { name: "Trade_Dimension", type: "dimension", role: "category" },
      { name: "Category", type: "dimension", role: "category" },
      { name: "Export_Mil_SGD", type: "measure", defaultAgg: "sum", format: "currency_m" }
    ],
    data: data
  };
}

// -------------------------------------------------------------
// MAIN EXECUTION
// -------------------------------------------------------------
console.log("Building Curated Datasets...");
const crimeDs = buildCrimeScamsDataset();
console.log(`- ${crimeDs.id}: ${crimeDs.data.length} records`);

const fertDs = buildFertilityAgingDataset();
console.log(`- ${fertDs.id}: ${fertDs.data.length} records`);

const propDs = buildPropertyPriceDataset();
console.log(`- ${propDs.id}: ${propDs.data.length} records`);

const climDs = buildClimateWeatherDataset();
console.log(`- ${climDs.id}: ${climDs.data.length} records`);

const nodxDs = buildNodxTradeDataset();
console.log(`- ${nodxDs.id}: ${nodxDs.data.length} records`);

// Read existing singstat_curated.js
const targetFile = path.join(__dirname, '../data/singstat_curated.js');
const rawCode = fs.readFileSync(targetFile, 'utf8');

const sandbox = {};
const fn = new Function('window', rawCode);
fn(sandbox);

const existingDatasets = sandbox.SINGSTAT_CURATED_DATASETS || [];
const catalogSummary = sandbox.SINGSTAT_CATALOG_SUMMARY || [];

console.log(`Existing datasets: ${existingDatasets.length}`);

// Combine: Put the 5 new critical issue datasets first, followed by previous 4
const newDatasets = [
  crimeDs,
  fertDs,
  propDs,
  climDs,
  nodxDs
];

// Deduplicate if already present
const combinedDatasets = [...newDatasets];
existingDatasets.forEach(ex => {
  if (!combinedDatasets.some(d => d.id === ex.id)) {
    combinedDatasets.push(ex);
  }
});

console.log(`Total Curated Datasets: ${combinedDatasets.length}`);

const outputCode = `// Auto-generated SingStat Curated BI Datasets & Catalog
window.SINGSTAT_CURATED_DATASETS = ${JSON.stringify(combinedDatasets, null, 2)};
window.SINGSTAT_CATALOG_SUMMARY = ${JSON.stringify(catalogSummary)};
`;

fs.writeFileSync(targetFile, outputCode, 'utf8');
console.log(`Successfully updated ${targetFile}! File size: ${(fs.statSync(targetFile).size / 1024).toFixed(1)} KB`);
