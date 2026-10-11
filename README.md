# SingStat BI Studio — Singapore Statistical Intelligence

An interactive, zero-dependency executive business intelligence (BI) dashboard exploring national data trends across Singapore's economy, society, housing, crime, and climate.

Built with a Google Store-inspired aesthetic, Tableau-style drag-and-drop analytics, and Apache ECharts.

---

## 🚀 Live Demo

Open `index.html` directly in any web browser, or access the deployed version hosted on GitHub Pages:

> **[Open Live Dashboard](https://tqx2012.github.io/singstats/)** *(or open `index.html` locally)*

No server setup, Node.js runtime, database, or API keys required. Everything runs 100% in the client browser.

---

## ✨ Key Features

### 1. 📖 Interactive Story Hub (Guided Narratives)
Explore curated data stories examining key issues and long-term structural trends in Singapore:

- **🚨 Scam & Cybercrime Epidemic**: Visualizing the surge in online scams and cybercrime overtaking traditional physical crime.
- **📉 Total Fertility Rate (TFR) & Super-Aged Society**: Tracking the fertility rate drop alongside Singapore's rapid demographic shift towards 2026.
- **🏘️ The Million-Dollar HDB Resale Era**: Price appreciation, resale volume trends, and town-by-town housing patterns.
- **☀️ Climate & Extreme Heat Trends**: Decadal temperature rises, heatwave anomalies, and climate adaptation metrics.
- **🌐 Non-Oil Domestic Exports (NODX) & Tech Cycles**: Singapore's trade resilience, electronics demand, and global tech supply chain exposure.
- **🛒 CPI & Cost of Living Cycles**: Decades of inflation shifts, oil shocks, and cost-of-living basket trends.
- **🇸🇬 60-Year Real GDP by Sector**: Long-term structural transformation across manufacturing, finance, and services.
- **👥 Population Age Pyramid**: Interactive age-band and gender breakdowns.

### 2. 🎛️ Tableau-Style Drag-and-Drop BI Studio
- **Flexible Shelves**: Drag-and-drop dimensions into **Columns (X)** and **Rows (Y)**, numeric values into **Measures**, and breakdown categories into **Color / Breakdown**.
- **Interactive Filtering**: Filter datasets on the fly with real-time multi-select filters.
- **Multi-Aggregation Engine**: Dynamically calculate **Sum**, **Average (Mean)**, **Count**, **Min**, and **Max** on grouped data.
- **Swap & Reset**: Instant one-click axes swapping (`⇄ Swap`) and workspace reset (`↺ Reset`).

### 3. 📊 Versatile Visualizations (Apache ECharts)
Switch across 9 visualization modes with a single click:
- 🧱 **Stacked Bar** & 📊 **Grouped Bar**
- 📑 **Horizontal Bar** (auto-sorted for ranking comparisons)
- 📈 **Line Trend** & 🌊 **Stacked Area**
- 🍩 **Donut / Pie Chart**
- 🗂️ **Treemap**
- 🔢 **Pivot Matrix Table** (hierarchical spreadsheet grid)
- 🏆 **KPI Metric Cards**

### 4. 🛠️ Power User Tools
- **🔍 Catalog Search (2,820 Tables)**: Search through SingStat's comprehensive database table catalog directly from the UI.
- **📁 Custom File Upload**: Drag or load any external CSV or JSON dataset to slice, dice, and graph within the BI studio.
- **📷 High-Resolution PNG Export**: Export publication-ready chart figures.
- **📊 Aggregated CSV Export**: Download the active slice and aggregated computations directly to CSV for Excel or Python analysis.
- **☀️ Light & 🌙 Dark Mode**: Fully responsive, Google-styled light theme with dark mode toggle.

---

## 📂 Datasets Included

The built-in curated data (`data/singstat_curated.js`) aggregates official public datasets sourced from the **Singapore Department of Statistics (SingStat)**:

| Topic | Coverage | Description |
| :--- | :--- | :--- |
| **Demographics** | Population & TFR | Population by age group, sex, ethnic group, and resident birth rates. |
| **Economy** | Real GDP by Industry | Value added across manufacturing, construction, finance, wholesale, and services. |
| **Inflation** | Consumer Price Index (CPI) | Multi-decade historical CPI series and inflation baskets. |
| **Crime** | Police Force Crime Data | Commercial scams, cybercrimes, and traditional physical crime rates. |
| **Trade** | NODX & Merchandise Trade | Export performance by major commodity groups and trading partners. |
| **Housing** | Resale & Dwelling Stock | Resale transactions and dwelling unit distributions across 40 planning areas. |
| **Climate** | Surface Air Temperatures | Long-term historical weather records and monthly extremes. |

---

## 💻 Local Quickstart

### Running Locally
Because all data and libraries are bundled locally, you only need a modern web browser:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/tqx2012/singstats.git
   cd singstats
   ```
2. Double-click `index.html` to open it in your browser (Chrome, Edge, Firefox, Safari), or serve it via a local static server:
   ```bash
   # Optional: Python static server
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

---

## ⚖️ Data Attribution & Licence

- **Source**: Singapore Department of Statistics ([SingStat Table Builder](https://tablebuilder.singstat.gov.sg/)).
- **Licence**: Public data accessed and published under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).
- Developer tools for re-scraping or updating raw API datasets are documented in [DATA_DOWNLOADER.md](DATA_DOWNLOADER.md).
