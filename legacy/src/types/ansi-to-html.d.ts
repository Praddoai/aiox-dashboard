declare module 'ansi-to-html' {
  interface AnsiToHtmlOptions {
    fg?: string;
    bg?: string;
    newline?: boolean;
    escapeXML?: boolean;
    stream?: boolean;
    colors?: Record<number, string> | string[];
  }

  class AnsiToHtml {
    constructor(options?: AnsiToHtmlOptions);
    toHtml(input: string): string;
  }

  export default AnsiToHtml;
}
