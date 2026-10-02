declare module "pdf-parse" {
  type PdfParseResult = {
    text?: string;
    [key: string]: unknown;
  };

  const parsePdf: (buffer: Buffer) => Promise<PdfParseResult>;
  export default parsePdf;
}
