import time
import schedule
import logging
from scraper.fetcher import fetch_dou_today, save_editions
from scraper.indexer import index_pending

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def run_scraper():
    logger.info("Running scheduled scraper...")
    try:
        editions = fetch_dou_today()
        if editions:
            saved = save_editions(editions)
            logger.info(f"Scraper finished. Saved {saved} new editions.")
        else:
            logger.info("No editions found or an error occurred.")
    except Exception as e:
        logger.error(f"Error running scraper: {e}", exc_info=True)
    run_indexer()

def run_indexer():
    try:
        index_pending()
    except Exception as e:
        logger.error(f"Error running indexer: {e}", exc_info=True)

schedule.every().day.at("08:00").do(run_scraper)
schedule.every(30).minutes.do(run_indexer)

if __name__ == "__main__":
    logger.info("Starting scheduler. Scraper runs daily at 08:00, full-text indexer every 30 minutes.")
    run_scraper()

    while True:
        schedule.run_pending()
        time.sleep(60)
