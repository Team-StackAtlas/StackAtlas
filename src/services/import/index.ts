// Public API for the client-side import engine. Consumers (Admin → Research
// pages) should import from this barrel rather than reaching into the
// individual modules.

export * from './types';
export { parseDataPackJson, parseSourcesCsv, parseImportFiles, type ParseImportFilesResult } from './parse';
export { validatePack, slugify, sourceKeyVariants } from './validate';
export {
  fetchExistingKeys,
  fetchSubstanceCatalog,
  runImport,
  listImportBatches,
  revertImportBatch,
  listSourceLibrary,
  editSource,
  listFindings,
  type SourceLibraryEntry,
  type SourceEditPatch,
  type FindingEntry,
} from './runner';
export { extractMarkdownSource, type SubstanceCatalogEntry, type MarkdownAmbiguousMatch } from './markdown';
export { extractZip, ZipLimitError, SUPPORTED_ENTRY_EXTENSIONS, ZIP_MAX_ENTRIES, ZIP_MAX_FILE_BYTES, ZIP_MAX_TOTAL_BYTES } from './zip';
export { hashText } from './hash';
