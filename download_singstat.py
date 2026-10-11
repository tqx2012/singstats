"""
SingStat Bulk Downloader
========================
Downloads all available statistical datasets from the Singapore Department of Statistics (SingStat)
Table Builder Developer API.

API Documentation: https://tablebuilder.singstat.gov.sg/api/table/
SingStat Rate Limit: 100 calls per minute per IP address
"""

import os
import sys
import time
import json
import csv
import logging
import argparse
from typing import List, Dict, Any, Optional
import urllib.request
import urllib.error
import urllib.parse

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("singstat_downloader.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("SingStatDownloader")

# Constants
BASE_URL = "https://tablebuilder.singstat.gov.sg/api/table"
DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
RATE_LIMIT_DELAY = 0.65  # ~92 requests/min to stay safely below the 100 calls/min threshold


class SingStatDownloader:
    def __init__(
        self,
        output_dir: str = "singstat_data",
        delay: float = RATE_LIMIT_DELAY,
        save_json: bool = True,
        save_csv: bool = True,
        save_metadata: bool = True,
        max_retries: int = 5,
        user_agent: str = DEFAULT_USER_AGENT
    ):
        self.output_dir = output_dir
        self.json_dir = os.path.join(output_dir, "json")
        self.csv_dir = os.path.join(output_dir, "csv")
        self.meta_dir = os.path.join(output_dir, "metadata")
        self.manifest_path = os.path.join(output_dir, "manifest.json")
        
        self.delay = delay
        self.save_json = save_json
        self.save_csv = save_csv
        self.save_metadata = save_metadata
        self.max_retries = max_retries
        self.user_agent = user_agent
        
        self._ensure_directories()
        self.manifest = self._load_manifest()

    def _ensure_directories(self):
        for directory in [self.output_dir, self.json_dir, self.csv_dir, self.meta_dir]:
            os.makedirs(directory, exist_ok=True)

    def _load_manifest(self) -> Dict[str, Any]:
        """Loads progress tracking manifest to allow safe resumes."""
        if os.path.exists(self.manifest_path):
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read existing manifest: {e}. Starting fresh.")
        return {"total_records": 0, "completed": {}, "failed": {}}

    def _save_manifest(self):
        """Persists current download state."""
        try:
            with open(self.manifest_path, "w", encoding="utf-8") as f:
                json.dump(self.manifest, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving manifest: {e}")

    def _http_get(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Executes HTTP GET request with required headers, retries, and rate limit pacing.
        """
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers)
        
        for attempt in range(1, self.max_retries + 1):
            try:
                time.sleep(self.delay)  # Rate limiting compliance
                with urllib.request.urlopen(req, timeout=30) as resp:
                    if resp.status == 200:
                        raw_data = resp.read().decode("utf-8")
                        try:
                            return json.loads(raw_data)
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse JSON from {url}. Server returned non-JSON content.")
                            return None
                    else:
                        logger.warning(f"HTTP status {resp.status} for {url}")
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait_time = attempt * 5
                    logger.warning(f"Rate limited (429). Backing off for {wait_time}s...")
                    time.sleep(wait_time)
                elif e.code == 403:
                    logger.error(f"403 Forbidden for {url}. SingStat WAF blocked request. Check User-Agent.")
                    return None
                elif e.code == 404:
                    logger.warning(f"404 Not Found for {url}")
                    return None
                else:
                    logger.warning(f"HTTP Error {e.code} for {url} (attempt {attempt}/{self.max_retries})")
                    time.sleep(attempt * 2)
            except Exception as e:
                logger.warning(f"Request failed: {e} (attempt {attempt}/{self.max_retries})")
                time.sleep(attempt * 2)
                
        return None

    def fetch_all_resource_ids(self, keyword: str = "%") -> List[Dict[str, Any]]:
        """
        Retrieves the catalog of datasets. Using '%' returns all ~2,800 tables.
        """
        encoded_kw = urllib.parse.quote(keyword)
        url = f"{BASE_URL}/resourceid?keyword={encoded_kw}&searchOption=all"
        logger.info(f"Fetching table catalog from: {url}")
        
        res = self._http_get(url)
        if not res:
            logger.error("Failed to fetch catalog from SingStat API.")
            return []

        # The structure is typically res["Data"]["records"] or res["data"]["records"]
        data_block = res.get("Data") or res.get("data") or {}
        records = data_block.get("records", [])
        
        logger.info(f"Successfully retrieved catalog with {len(records)} datasets.")
        
        # Save complete catalog index
        catalog_path = os.path.join(self.output_dir, "catalog.json")
        with open(catalog_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        logger.info(f"Catalog saved to {catalog_path}")
        
        # Also save catalog as CSV for easy browsing in Excel
        catalog_csv = os.path.join(self.output_dir, "catalog.csv")
        if records:
            keys = ["id", "title", "theme", "subject", "topic", "tableType"]
            with open(catalog_csv, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
                writer.writeheader()
                for rec in records:
                    writer.writerow(rec)
            logger.info(f"Catalog CSV saved to {catalog_csv}")

        return records

    def fetch_metadata(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """Fetches metadata for a given resourceId."""
        url = f"{BASE_URL}/metadata/{resource_id}"
        return self._http_get(url)

    def fetch_table_data(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """Fetches table data for a given resourceId."""
        url = f"{BASE_URL}/tabledata/{resource_id}"
        return self._http_get(url)

    def convert_to_csv(self, table_json: Dict[str, Any], output_csv_path: str):
        """
        Flattens SingStat table JSON into a standard tidy CSV format.
        Handles both row-based time series and multi-column formats.
        """
        data = table_json.get("Data") or table_json.get("data") or {}
        title = data.get("title", "")
        rows = data.get("row", [])
        
        if not rows:
            return

        # Collect all unique time periods / column headers across rows
        periods = []
        period_set = set()
        for r in rows:
            for col in (r.get("columns") or []):
                key = col.get("key")
                if key and key not in period_set:
                    periods.append(key)
                    period_set.add(key)

        with open(output_csv_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            
            # Write Table Title as a metadata comment row
            writer.writerow(["# Title:", title])
            
            # Header
            header = ["Series No", "Row Description", "Unit of Measure", "Footnotes"] + periods
            writer.writerow(header)
            
            # Rows
            for r in rows:
                series_no = r.get("seriesNo", "")
                row_text = r.get("rowText", "")
                uom = r.get("uoM", "")
                footnote = r.get("footnote", "")
                
                # Build lookup for period values
                col_map = {col.get("key"): col.get("value") for col in (r.get("columns") or [])}
                
                row_values = [col_map.get(p, "") for p in periods]
                writer.writerow([series_no, row_text, uom, footnote] + row_values)

    def download_dataset(self, resource_id: str, title: str = "") -> bool:
        """Downloads metadata and data for a single dataset, grouped by source."""
        logger.info(f"Downloading [{resource_id}] {title[:60]}...")
        
        # 1. Fetch Table Data (needed first to determine the source agency)
        table_data = self.fetch_table_data(resource_id)
        if not table_data:
            logger.error(f"Failed to retrieve table data for {resource_id}")
            return False

        # Extract Source (generatedBy) to use as the folder name
        data_block = table_data.get("Data") or table_data.get("data") or {}
        source_name = data_block.get("generatedBy", "Unknown Source").strip()
        
        # Sanitize the source name for safe directory creation
        safe_source = "".join(c if c.isalnum() or c in " -_" else "_" for c in source_name)
        if not safe_source:
            safe_source = "Unknown_Source"

        # 2. Save JSON
        if self.save_json:
            source_json_dir = os.path.join(self.json_dir, safe_source)
            os.makedirs(source_json_dir, exist_ok=True)
            json_path = os.path.join(source_json_dir, f"{resource_id}.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(table_data, f, indent=2, ensure_ascii=False)

        # 3. Save CSV
        if self.save_csv:
            source_csv_dir = os.path.join(self.csv_dir, safe_source)
            os.makedirs(source_csv_dir, exist_ok=True)
            csv_path = os.path.join(source_csv_dir, f"{resource_id}.csv")
            try:
                self.convert_to_csv(table_data, csv_path)
            except Exception as e:
                logger.warning(f"Could not convert {resource_id} to CSV: {e}")

        # 4. Fetch & Save Metadata
        if self.save_metadata:
            meta_data = self.fetch_metadata(resource_id)
            if meta_data:
                source_meta_dir = os.path.join(self.meta_dir, safe_source)
                os.makedirs(source_meta_dir, exist_ok=True)
                meta_path = os.path.join(source_meta_dir, f"{resource_id}_meta.json")
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(meta_data, f, indent=2, ensure_ascii=False)

        return True

    def run(self, keyword: str = "%", limit: Optional[int] = None, resume: bool = True):
        """Main execution loop."""
        records = self.fetch_all_resource_ids(keyword)
        if not records:
            logger.error("No records found to download.")
            return

        if limit:
            records = records[:limit]
            logger.info(f"Limiting download to first {limit} records as requested.")

        total = len(records)
        self.manifest["total_records"] = total
        
        logger.info(f"Starting bulk download of {total} datasets...")
        completed_count = len(self.manifest.get("completed", {}))
        
        start_time = time.time()
        
        for idx, rec in enumerate(records, start=1):
            resource_id = rec.get("id")
            title = rec.get("title", "")
            
            if not resource_id:
                continue

            # Resume check
            if resume and resource_id in self.manifest.get("completed", {}):
                logger.info(f"[{idx}/{total}] Skipping {resource_id} (already completed)")
                continue

            success = self.download_dataset(resource_id, title)
            
            if success:
                self.manifest["completed"][resource_id] = {
                    "title": title,
                    "downloaded_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                if resource_id in self.manifest.get("failed", {}):
                    del self.manifest["failed"][resource_id]
            else:
                self.manifest["failed"][resource_id] = {
                    "title": title,
                    "failed_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }

            # Periodic manifest checkpoint every 10 downloads
            if idx % 10 == 0:
                self._save_manifest()
                elapsed = time.time() - start_time
                done = len(self.manifest["completed"])
                logger.info(f"Progress checkpoint: {done}/{total} datasets completed ({elapsed:.1f}s elapsed).")

        self._save_manifest()
        
        elapsed = time.time() - start_time
        final_completed = len(self.manifest["completed"])
        final_failed = len(self.manifest.get("failed", {}))
        
        logger.info("=" * 60)
        logger.info(f"Download Finished in {elapsed/60:.2f} minutes.")
        logger.info(f"Successfully downloaded: {final_completed}/{total}")
        if final_failed > 0:
            logger.info(f"Failed datasets: {final_failed} (check manifest.json)")
        logger.info(f"Files saved in: {os.path.abspath(self.output_dir)}")
        logger.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Bulk download datasets from SingStat Table Builder API.")
    parser.add_argument("--keyword", type=str, default="%", help="Keyword to search (default: '%%' for ALL datasets)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of datasets to download (for testing)")
    parser.add_argument("--output", type=str, default="singstat_data", help="Output directory path")
    parser.add_argument("--delay", type=float, default=RATE_LIMIT_DELAY, help="Delay between API requests in seconds (default: 0.65s)")
    parser.add_argument("--no-resume", action="store_true", help="Do not resume previous run; re-download everything")
    parser.add_argument("--no-csv", action="store_true", help="Do not convert tables to CSV")
    parser.add_argument("--no-meta", action="store_true", help="Do not download metadata files")
    args = parser.parse_args()

    downloader = SingStatDownloader(
        output_dir=args.output,
        delay=args.delay,
        save_json=True,
        save_csv=not args.no_csv,
        save_metadata=not args.no_meta
    )

    downloader.run(
        keyword=args.keyword,
        limit=args.limit,
        resume=not args.no_resume
    )


if __name__ == "__main__":
    main()
