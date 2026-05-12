# scraper/fetcher.py
import logging
import re
from datetime import date

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.in.gov.br/consulta/-/buscar/dou"


def fetch_dou_today(since: date | None = None) -> list[dict]:
    """Fetch today's DOU publications using a headless browser."""
    target_date = since or date.today()
    date_str = target_date.strftime("%d/%m/%Y")

    try:
        with Stealth().use_sync(sync_playwright()) as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            logger.info("Carregando página de busca do DOU...")
            page.goto(SEARCH_URL, wait_until="networkidle", timeout=60_000)

            # Chama doSearch diretamente via JavaScript, sem depender do botão
            logger.info("Disparando busca via JavaScript...")
            with page.expect_navigation(timeout=30_000):
                page.evaluate("""
                    () => {
                        document.querySelector('input[name="sistema-busca"][value="2"]').checked = true;
                        selecionarData('dia');
                        doSearch('advancedSearch');
                    }
                """)

            articles = _extract_from_page(page)
            browser.close()
            return articles

    except Exception as e:
        logger.error(f"Erro no browser: {e}")
        return []


def _extract_from_page(page) -> list[dict]:
    """Parse the pesquisa.in.gov.br results table to extract DOU editions."""
    html = page.content()
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"id": "ResultadoConsulta"})

    if not table:
        logger.warning("Tabela de resultados não encontrada.")
        return []

    editions = []
    for row in table.find("tbody").find_all("tr"):
        cols = row.find_all("td")
        if len(cols) < 5:
            continue

        section_name = cols[0].get_text(strip=True)
        edition_number = cols[1].get_text(strip=True)
        pub_date = cols[2].get_text(strip=True)
        page_count = cols[3].get_text(strip=True)

        # Extrai URL do PDF do atributo onclick
        pdf_url = ""
        pdf_link = cols[4].find("a")
        if pdf_link:
            match = re.search(r"redirecionaSelect\('([^']+)'", pdf_link.get("onclick", ""))
            if match:
                pdf_url = match.group(1)

        editions.append({
            "title": section_name,
            "edition": edition_number,
            "date": pub_date,
            "pages": page_count,
            "pdf_url": pdf_url,
        })

    logger.info(f"{len(editions)} edições encontradas.")
    return editions


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    publicacoes = fetch_dou_today()
    print(f"\nEncontrado: {len(publicacoes)} publicações — {date.today().isoformat()}")
    for p in publicacoes:
        print(f"  - {p['title']} | Edição {p['edition']} | {p['pages']} págs")
