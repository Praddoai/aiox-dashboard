/**
 * Custom Mermaid themes for mermaidcn.
 * Maps theme names to Mermaid themeVariables overrides.
 */

export type MermaidCustomTheme = 'github' | 'ocean' | 'sunset';

export const mermaidThemes: Record<MermaidCustomTheme, Record<string, string>> = {
  github: {
    primaryColor: '#0969da',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#0550ae',
    lineColor: '#656d76',
    secondaryColor: '#ddf4ff',
    tertiaryColor: '#f6f8fa',
  },
  ocean: {
    primaryColor: '#0077b6',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#023e8a',
    lineColor: '#48cae4',
    secondaryColor: '#caf0f8',
    tertiaryColor: '#ade8f4',
  },
  sunset: {
    primaryColor: '#e85d04',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#dc2f02',
    lineColor: '#f48c06',
    secondaryColor: '#faa307',
    tertiaryColor: '#ffba08',
  },
};
