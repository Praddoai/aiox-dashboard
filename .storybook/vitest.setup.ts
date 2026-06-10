import * as reactAnnotations from '@storybook/react/entry-preview';
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from 'storybook/preview-api';
import * as projectAnnotations from './preview';

// This file is NOT used via setupFiles (which breaks Vite's dependency scanner
// in browser mode). Instead, the storybookAnnotationsPlugin() in vitest.config.ts
// injects setProjectAnnotations() directly into story file transforms.
//
// Keeping this file as reference for the correct annotation setup:
// - reactAnnotations: provides render/renderToCanvas for React framework
// - a11yAddonAnnotations: accessibility addon annotations
// - projectAnnotations: project-level preview.tsx configuration
setProjectAnnotations([reactAnnotations, a11yAddonAnnotations, projectAnnotations]);
