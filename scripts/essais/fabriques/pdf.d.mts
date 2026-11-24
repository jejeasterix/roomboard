// Types des fabriques PDF (cadrage cli-lot3, D43), `pdf.mjs`. Formes minimales : pdf-lib et pdf.js réels y entrent.
export interface PdfMakeLib {
  readonly PDFDocument: { create(): Promise<unknown> };
  readonly StandardFonts: { readonly Helvetica: unknown };
}
export interface PdfReadLibs {
  readonly pdfjs: { getDocument(src: object): { readonly promise: Promise<unknown>; destroy(): Promise<void> } };
  readonly PDFDocument: { load(bytes: Uint8Array): Promise<unknown> };
  readonly PDFName: unknown;
  readonly PDFDict: unknown;
  readonly PDFStream: unknown;
  /** URL `file:` du dossier `standard_fonts/` de pdfjs-dist (texte des polices standard). */
  readonly standardFontDataUrl?: string;
}
/** PDF de `n` pages (3) 612 × 792, « <label> i » (« RoomBoard page ») sur la page i. */
export function pdfPages(lib: PdfMakeLib, n?: number, label?: string): Promise<Uint8Array>;
/** `require` résolu depuis apps/web (`createRequire`). */
export interface WebRequire {
  (id: string): unknown;
  resolve(id: string): string;
}
/** pdf.js et pdf-lib d'apps/web, polices de pdfjs-dist ; `worker` : worker de pdf.js importé d'abord (dans le processus). */
export function readLibs(web: WebRequire, opts?: { readonly worker?: boolean }): Promise<PdfReadLibs & { readonly standardFontDataUrl: string }>;
/** Pages, texte par page, sous-types des XObject par page. */
export function readPdf(bytes: Uint8Array, libs: PdfReadLibs): Promise<{ pages: number; texts: string[]; overlays: string[][] }>;
