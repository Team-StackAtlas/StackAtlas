export type PubMedSourceResult = {
  pmid: string;
  title: string;
  authors: string;
  year: number | null;
  journal: string;
  doi: string;
  publicationTypes: string[];
  abstract: string;
  url: string;
};

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export async function searchPubMedSources(query: string, maxResults: number): Promise<PubMedSourceResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const ids = await searchIds(trimmed, maxResults);
  if (!ids.length) return [];

  const params = new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'xml' });
  const response = await fetch(`${EUTILS}/efetch.fcgi?${params.toString()}`);
  if (!response.ok) throw new Error(`NCBI efetch returned ${response.status}`);

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('NCBI returned malformed PubMed XML');

  return Array.from(doc.querySelectorAll('PubmedArticle')).map(normalizeArticle).filter((r) => r.pmid && r.title);
}

async function searchIds(query: string, maxResults: number) {
  const params = new URLSearchParams({ db: 'pubmed', term: query, retmax: String(maxResults), retmode: 'json', sort: 'relevance' });
  const response = await fetch(`${EUTILS}/esearch.fcgi?${params.toString()}`);
  if (!response.ok) throw new Error(`NCBI esearch returned ${response.status}`);
  const data = (await response.json()) as { esearchresult?: { idlist?: string[] }; error?: string };
  if (data.error) throw new Error(data.error);
  return data.esearchresult?.idlist ?? [];
}

function normalizeArticle(article: Element): PubMedSourceResult {
  const pmid = text(article, 'MedlineCitation > PMID');
  const title = clean(text(article, 'ArticleTitle'));
  const journal = clean(text(article, 'Journal > Title')) || clean(text(article, 'ISOAbbreviation'));
  const authors = Array.from(article.querySelectorAll('AuthorList > Author')).map(authorName).filter(Boolean).join(', ');
  const year = publicationYear(article);
  const doi = Array.from(article.querySelectorAll('ArticleId')).find((id) => id.getAttribute('IdType')?.toLowerCase() === 'doi')?.textContent?.trim() ?? '';
  const publicationTypes = Array.from(article.querySelectorAll('PublicationTypeList > PublicationType')).map((type) => clean(type.textContent ?? '')).filter(Boolean);
  const abstract = Array.from(article.querySelectorAll('Abstract AbstractText')).map((node) => clean([node.getAttribute('Label'), node.textContent].filter(Boolean).join(': '))).filter(Boolean).join('\n');

  return { pmid, title, authors, year, journal, doi, publicationTypes, abstract, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
}

function authorName(author: Element) {
  const collective = text(author, 'CollectiveName');
  if (collective) return collective;
  return [text(author, 'LastName'), text(author, 'ForeName')].filter(Boolean).join(' ');
}

function publicationYear(article: Element) {
  const value = text(article, 'PubDate > Year') || text(article, 'ArticleDate > Year') || text(article, 'MedlineDate').match(/\d{4}/)?.[0] || '';
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? year : null;
}

function text(parent: Element, selector: string) {
  return clean(parent.querySelector(selector)?.textContent ?? '');
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
