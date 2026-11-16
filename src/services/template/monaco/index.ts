/**
 * Monaco Editor Integration for Template Engine
 *
 * Main entry point for registering custom language definition,
 * autocomplete provider, and hover provider with Monaco Editor.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import type { editor } from "monaco-editor";
import {
  TEMPLATE_LANGUAGE_ID,
  languageConfiguration,
  monarchLanguage,
  themeRules,
} from "./languageDefinition";
import {
  createAutocompleteProvider,
} from "./autocompleteProvider";
import type { AutocompleteProviderConfig, ContextSchema } from "./autocompleteProvider";
import { createHoverProvider } from "./hoverProvider";
import type { HoverProviderConfig } from "./hoverProvider";
import type { FilterMetadata } from "../types";

/**
 * Configuration for Monaco Editor integration
 */
export interface MonacoIntegrationConfig {
  contextSchema?: ContextSchema;
  filters?: FilterMetadata[];
}

/**
 * Register template language with Monaco Editor
 *
 * This function should be called once during application initialization
 * to register the custom language definition, syntax highlighting,
 * autocomplete, and hover providers.
 *
 * @param monaco - Monaco editor instance
 * @param config - Configuration for autocomplete and hover providers
 *
 * @example
 * ```typescript
 * import * as monaco from 'monaco-editor';
 * import { registerTemplateLanguage } from './services/template/monaco';
 * import { FilterRegistry } from './services/template/FilterRegistry';
 *
 * const filterRegistry = new FilterRegistry();
 * const filters = filterRegistry.list();
 *
 * registerTemplateLanguage(monaco, {
 *   contextSchema: {
 *     user: { firstName: '', lastName: '', email: '' },
 *     campaign: { name: '', variation: '' },
 *   },
 *   filters,
 * });
 * ```
 */
export function registerTemplateLanguage(
  monaco: typeof import("monaco-editor"),
  config: MonacoIntegrationConfig = {}
): void {
  const { contextSchema, filters = [] } = config;

  // Register the language
  monaco.languages.register({ id: TEMPLATE_LANGUAGE_ID });

  // Set language configuration (brackets, auto-closing, etc.)
  monaco.languages.setLanguageConfiguration(TEMPLATE_LANGUAGE_ID, languageConfiguration);

  // Set monarch tokenizer for syntax highlighting
  monaco.languages.setMonarchTokensProvider(TEMPLATE_LANGUAGE_ID, monarchLanguage);

  // Define custom theme with syntax highlighting colors
  monaco.editor.defineTheme("liquid-template-theme", {
    base: "vs",
    inherit: true,
    rules: themeRules as any,
    colors: {},
  });

  // Register autocomplete provider
  const autocompleteConfig: AutocompleteProviderConfig = {
    contextSchema,
    filters,
  };
  monaco.languages.registerCompletionItemProvider(
    TEMPLATE_LANGUAGE_ID,
    createAutocompleteProvider(autocompleteConfig)
  );

  // Register hover provider
  const hoverConfig: HoverProviderConfig = {
    filters,
  };
  monaco.languages.registerHoverProvider(TEMPLATE_LANGUAGE_ID, createHoverProvider(hoverConfig));
}

/**
 * Create Monaco Editor instance with template language
 *
 * Helper function to create a Monaco Editor instance configured
 * for template editing.
 *
 * @param container - DOM element to mount the editor
 * @param value - Initial template content
 * @param options - Additional Monaco editor options
 * @returns Monaco editor instance
 *
 * @example
 * ```typescript
 * const editor = createTemplateEditor(
 *   document.getElementById('editor'),
 *   'Hello {{ user.firstName }}!',
 *   { minimap: { enabled: false } }
 * );
 * ```
 */
export function createTemplateEditor(
  monaco: typeof import("monaco-editor"),
  container: HTMLElement,
  value: string = "",
  options: editor.IStandaloneEditorConstructionOptions = {}
): editor.IStandaloneCodeEditor {
  return monaco.editor.create(container, {
    value,
    language: TEMPLATE_LANGUAGE_ID,
    theme: "liquid-template-theme",
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: "on",
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: false,
    fontSize: 14,
    wordWrap: "on",
    ...options,
  });
}

/**
 * Update autocomplete context schema
 *
 * Updates the context schema used for variable suggestions.
 * Call this when the available context data changes.
 *
 * @param monaco - Monaco editor instance
 * @param contextSchema - New context schema
 * @param filters - Updated filter list
 */
export function updateAutocompleteContext(
  monaco: typeof import("monaco-editor"),
  contextSchema: ContextSchema,
  filters: FilterMetadata[]
): void {
  // Dispose existing providers
  // Note: Monaco doesn't provide a direct way to update providers,
  // so we need to re-register them

  // Re-register autocomplete provider with new context
  const autocompleteConfig: AutocompleteProviderConfig = {
    contextSchema,
    filters,
  };
  monaco.languages.registerCompletionItemProvider(
    TEMPLATE_LANGUAGE_ID,
    createAutocompleteProvider(autocompleteConfig)
  );

  // Re-register hover provider with new filters
  const hoverConfig: HoverProviderConfig = {
    filters,
  };
  monaco.languages.registerHoverProvider(TEMPLATE_LANGUAGE_ID, createHoverProvider(hoverConfig));
}

// Export types and constants
export { TEMPLATE_LANGUAGE_ID };
export type { ContextSchema, FilterMetadata };
