import time
import schedule
import logging
from datetime import date
from scraper.fetcher import fetch_dou_today, save_editions

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

schedule.every().day.at("08:00").do(run_scraper)

if __name__ == "__main__":
    logger.info("Starting scheduler. Scraper will run daily at 08:00 AM.")
    run_scraper()
    
    while True:
        schedule.run_pending()
        time.sleep(60)
