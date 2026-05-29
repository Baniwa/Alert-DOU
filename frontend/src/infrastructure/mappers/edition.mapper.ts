import { Edition } from '../../domain/entities/Edition'
import { detectSection } from '../../domain/value-objects/Section'
import { EditionDTO } from '../api/dto/EditionDTO'

/** Anti-Corruption Layer: transforms the API's snake_case DTO into a domain-rich Edition entity.
 *  String dates become Date objects. Section is derived from the title. */
export function toEdition(dto: EditionDTO): Edition {
  return {
    id: dto.id,
    title: dto.title,
    editionNumber: dto.edition_number,
    pubDate: new Date(dto.pub_date + 'T00:00:00'),
    pageCount: dto.page_count,
    pdfUrl: dto.pdf_url,
    scrapedAt: new Date(dto.scraped_at),
    section: detectSection(dto.title),
  }
}

export function toEditionList(dtos: EditionDTO[]): Edition[] {
  return dtos.map(toEdition)
}
