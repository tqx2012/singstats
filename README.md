# SingStat Bulk Dataset Downloader

A Python utility to systematically download all statistical datasets available on the Singapore Department of Statistics (SingStat) [Table Builder](https://tablebuilder.singstat.gov.sg/).

---

## Overview

SingStat hosts **~2,800 customizable tables** (~180,000 data series) covering economic indicators, population, business, labor, trade, education, and social statistics.

This script uses the official SingStat Table Builder Developer API:
1. **Catalog Query**: Uses the wildcard search (`keyword=%&searchOption=all`) on `https://tablebuilder.singstat.gov.sg/api/table/resourceid` to retrieve every dataset ID in the catalog.
2. **Metadata & Table Extraction**: Iterates through each table ID to retrieve both metadata and complete time-series data.
3. **Format Support**: Saves original responses as `.json` and converts table series into tabular `.csv` (Excel-compatible UTF-8 with BOM).
4. **Rate Limit Handling**: Adheres to SingStat's **100 calls/min** threshold with automatic backoff retry logic.
5. **Resume & Checkpointing**: Maintains a local `manifest.json`. If stopped or interrupted, re-running the script immediately resumes where it left off.

---

## Requirements

The script uses Python's built-in standard library (`urllib`, `json`, `csv`, `time`, `logging`, `argparse`). **No extra `pip install` packages are required.**

Compatible with Python 3.7+.

---

## Usage

### 1. Quick Test Run (e.g. 5 tables)
Before downloading all ~2,800 datasets, run a quick test on the first 5 tables:
```bash
python download_singstat.py --limit 5
```

### 2. Download Every Single Dataset Available (~2,800 tables)
```bash
python download_singstat.py
```
*(At ~92 requests/minute, the full catalog of ~2,800 tables will take approximately 30–35 minutes to finish).*

### 3. Filter by Subject / Keyword (Optional)
If you only want specific topics (e.g., GDP, retail, CPI, population):
```bash
python download_singstat.py --keyword "consumer price index"
python download_singstat.py --keyword "gdp"
python download_singstat.py --keyword "retail"
```

---

## Output Structure

The data is saved inside `singstat_data/` (or your custom `--output` directory):

```
singstat_data/
├── catalog.json          # Complete catalog index of all available tables
├── catalog.csv           # Searchable table catalog in CSV format
├── manifest.json         # State checkpoint tracking completed / failed downloads
├── json/                 # Raw JSON responses from SingStat API
│   ├── M212881.json
│   └── ...
├── csv/                  # Flattened time-series tables
│   ├── M212881.csv
│   └── ...
└── metadata/             # Table schema & series definitions
    ├── M212881_meta.json
    └── ...
```

---

## Command Line Options

| Argument | Default | Description |
| :--- | :--- | :--- |
| `--keyword` | `%` | Keyword to search. Default `%` selects all tables in SingStat. |
| `--limit` | `None` | Limit number of datasets to download (great for test runs). |
| `--output` | `singstat_data` | Directory where data files will be saved. |
| `--delay` | `0.65` | Seconds between requests (0.65s = ~92 calls/min, safely below 100/min). |
| `--no-csv` | `False` | Skip converting datasets to CSV format. |
| `--no-meta` | `False` | Skip downloading separate metadata files. |
| `--no-resume` | `False` | Ignore `manifest.json` and re-download everything from scratch. |
