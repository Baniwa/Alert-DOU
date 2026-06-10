import logging
import re
from datetime import date, datetime

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth
from sqlalchemy.dialects.postgresql import insert as pg_insert

from database import Edition, get_session

logger = logging.getLogger(__name__)

# Portal principal — carregado para estabelecer sessão e passar pelo WAF
SEARCH_URL = "https://www.in.gov.br/consulta/-/buscar/dou"

# Endpoint real do DOU: recebe POST com params de data e retorna HTML com a tabela de edições
JOURNAL_LIST_URL = "https://pesquisa.in.gov.br/imprensa/core/jornalList.action"



def fetch_dou_today(since: date | None = None, debug: bool = False) -> list[dict]:
    """Fetch DOU edition list for the given date (defaults to today).

    Strategy:
      1. Navigate to in.gov.br to get a valid session and bypass Cloudflare WAF.
      2. Use that browser context to POST directly to pesquisa.in.gov.br/jornalList.action.
         (context.request shares cookies/headers with the browser, no UI automation needed)
      3. Parse the ResultadoConsulta table from the HTML response.

    Args:
        since: date to fetch. Defaults to today.
        debug: saves screenshot + HTML response to disk for inspection.
    """
    target_date = since or date.today()
    logger.info(f"Buscando edições do DOU para {target_date.isoformat()}...")

    try:
        with Stealth().use_sync(sync_playwright()) as p:
            browser = p.chromium.launch(headless=not debug)
            context = browser.new_context()
            page    = context.new_page()

            logger.info("Estabelecendo sessão em in.gov.br (bypassa WAF)...")
            page.goto(SEARCH_URL, wait_until="networkidle", timeout=60_000)

            if debug:
                page.screenshot(path="debug_before.png")
                logger.info("Debug: salvo debug_before.png")

            # Configura data via jQuery datepicker e aciona doSearch, que submete um
            # <form method="POST"> para pesquisa.in.gov.br/jornalList.action.
            # Usamos expect_navigation para capturar essa navegação cross-domain.
            # IMPORTANTE: context.request.post() foi tentado mas Azion WAF bloqueia (403)
            # requisições que não vêm de um browser real. O form submit do próprio browser
            # carrega o fingerprint correto e passa pelo WAF.
            logger.info("Configurando busca e aguardando navegação para pesquisa.in.gov.br...")
            with page.expect_navigation(wait_until="load", timeout=60_000):
                page.evaluate(f"""
                    () => {{
                        $('input[name="sistema-busca"][value="2"]').prop('checked', true);

                        // Seleciona "Personalizado" — necessário para data específica.
                        // selecionarData('dia') só funcionaria para hoje.
                        $('#personalizado').prop('checked', true);

                        // jQuery UI datepicker: setDate atualiza o estado interno que
                        // validateDate() lê. Setar .value diretamente não funciona.
                        var dt = new Date({target_date.year}, {target_date.month - 1}, {target_date.day});
                        $('#data-inicio').datepicker('setDate', dt);
                        $('#data-fim').datepicker('setDate', dt);

                        // doSearch valida a data e faz form.submit() → navega para jornalList.action
                        doSearch('advancedSearch');
                    }}
                """)

            html = page.content()
            logger.info(f"Navegou para {page.url} ({len(html)} chars)")

            if debug:
                page.screenshot(path="debug_after.png")
                with open("debug_response.html", "w", encoding="utf-8") as f:
                    f.write(html)
                logger.info("Debug: salvos debug_after.png e debug_response.html")

            editions = _parse_html(html)
            browser.close()
            return editions

    except Exception as e:
        logger.error(f"Erro no browser: {e}")
        return []


def _parse_html(html: str) -> list[dict]:
    """Parse the ResultadoConsulta table returned by pesquisa.in.gov.br."""
    soup  = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"id": "ResultadoConsulta"})

    if not table:
        logger.warning("Tabela ResultadoConsulta não encontrada na resposta.")
        return []

    editions = []
    for row in table.find("tbody").find_all("tr"):
        cols = row.find_all("td")
        if len(cols) < 5:
            continue

        section_name   = cols[0].get_text(strip=True)
        edition_number = cols[1].get_text(strip=True)
        pub_date_str   = cols[2].get_text(strip=True)
        page_count_str = cols[3].get_text(strip=True)

        pdf_url = ""
        pdf_link = cols[4].find("a")
        if pdf_link:
            match = re.search(r"redirecionaSelect\('([^']+)'", pdf_link.get("onclick", ""))
            if match:
                pdf_url = match.group(1)

        editions.append({
            "title":   section_name,
            "edition": edition_number,
            "date":    pub_date_str,
            "pages":   page_count_str,
            "pdf_url": pdf_url,
        })

    logger.info(f"{len(editions)} edições encontradas.")
    return editions


def save_editions(editions: list[dict]) -> int:
    """Persist scraped editions to the database. Returns count of new rows inserted.

    Uses INSERT ... ON CONFLICT DO NOTHING so re-running is always safe.
    Field mapping: scraper keys → model columns.
    """
    if not editions:
        return 0

    rows = []
    for e in editions:
        try:
            pub_date   = datetime.strptime(e["date"], "%d/%m/%Y").date()
            page_count = int(str(e["pages"]).strip())
        except (ValueError, KeyError) as exc:
            logger.warning(f"Skipping malformed edition {e}: {exc}")
            continue

        rows.append({
            "title":          e["title"],
            "edition_number": e["edition"],
            "pub_date":       pub_date,
            "page_count":     page_count,
            "pdf_url":        e.get("pdf_url", ""),
        })

    if not rows:
        return 0

    with get_session() as session:
        stmt = pg_insert(Edition).values(rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_edition_per_day",
            set_={"pdf_url": stmt.excluded.pdf_url}
        )
        result = session.execute(stmt)
        session.commit()
        return result.rowcount


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    # uso: python -m scraper.fetcher [YYYY-MM-DD] [--debug]
    target    = None
    debug_mode = "--debug" in sys.argv
    for arg in sys.argv[1:]:
        if arg != "--debug":
            target = datetime.strptime(arg, "%Y-%m-%d").date()

    editions = fetch_dou_today(since=target, debug=debug_mode)
    label    = target.isoformat() if target else date.today().isoformat()
    print(f"\nEncontradas: {len(editions)} edições — {label}")
    for e in editions:
        print(f"  - {e['title']} | Edição {e['edition']} | {e['pages']} págs")

    if editions:
        saved = save_editions(editions)
        print(f"\nSalvas no banco: {saved} novas edições")
