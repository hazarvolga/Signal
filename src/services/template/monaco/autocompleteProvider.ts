/**
 * Monaco Editor Autocomplete Provider for Template Syntax
 *
 * Provides intelligent autocomplete suggestions for:
 * - Variables from context schema
 * - Filters with documentation
 * - Template tags (if, for, assign, etc.)
 *
 * Requirements: 10.2, 10.3, 10.4, 10.5, 10.6
 */

import type { languages, Position, CancellationToken, editor } from "monaco-editor";
import { FilterMetadata } from "../types";

/**
 * Context schema for variable suggestions
 */
export interface ContextSchema {
  user?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    isPremium?: boolean;
    purchaseCount?: number;
    engagementScore?: number;
    customFields?: Record<string, any>;
  };
  campaign?: {
    id?: string;
    name?: string;
    variation?: string;
    unsubscribeUrl?: string;
    preferenceCenterUrl?: string;
    viewInBrowserUrl?: string;
  };
  organization?: {
    name?: string;
    logoUrl?: string;
    address?: string;
    timezone?: string;
  };
  products?: Array<{
    id?: string;
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    imageUrl?: string;
    productUrl?: string;
  }>;
  cart?: {
    items?: Array<any>;
    total?: number;
    currency?: string;
    checkoutUrl?: string;
  };
  workflow?: {
    id?: string;
    name?: string;
    triggerEvent?: string;
    eventProperties?: Record<string, any>;
  };
  now?: Date;
  today?: Date;
  variation?: string;
  [key: string]: any;
}

/**
 * Autocomplete provider configuration
 */
export interface AutocompleteProviderConfig {
  contextSchema?: ContextSchema;
  filters?: FilterMetadata[];
}

/**
 * Create autocomplete provider for template language
 */
export function createAutocompleteProvider(
  config: AutocompleteProviderConfig = {}
): languages.CompletionItemProvider {
  const { contextSchema = {}, filters = [] } = config;

  return {
    triggerCharacters: ["{", "|", "."],

    provideCompletionItems: (
      model: editor.ITextModel,
      position: Position,
      context: languages.CompletionContext,
      token: CancellationToken
    ): languages.ProviderResult<languages.CompletionList> => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Check if we're inside {{ }} for variable suggestions
      if (textUntilPosition.match(/\{\{[^}]*$/)) {
        return {
          suggestions: getVariableSuggestions(contextSchema, range),
        };
      }

      // Check if we're after | for filter suggestions
      if (textUntilPosition.match(/\|[^}|]*$/)) {
        return {
          suggestions: getFilterSuggestions(filters, range),
        };
      }

      // Check if we're inside {% %} for tag suggestions
      if (textUntilPosition.match(/\{%[^%]*$/)) {
        return {
          suggestions: getTagSuggestions(range),
        };
      }

      // Check if we're after a dot for property access
      if (textUntilPosition.match(/\w+\.[^.\s]*$/)) {
        const objectName = textUntilPosition.match(/(\w+)\.[^.\s]*$/)?.[1];
        if (objectName && contextSchema[objectName]) {
          return {
            suggestions: getPropertySuggestions(contextSchema[objectName], objectName, range),
          };
        }
      }

      return { suggestions: [] };
    },
  };
}

/**
 * Get variable suggestions from context schema
 */
function getVariableSuggestions(
  contextSchema: ContextSchema,
  range: any
): languages.CompletionItem[] {
  const suggestions: languages.CompletionItem[] = [];

  for (const [key, value] of Object.entries(contextSchema)) {
    const kind = getCompletionItemKind(value);
    const detail = getVariableDetail(value);

    suggestions.push({
      label: key,
      kind,
      detail,
      documentation: getVariableDocumentation(key, value),
      insertText: key,
      range,
    });
  }

  return suggestions;
}

/**
 * Get property suggestions for nested objects
 */
function getPropertySuggestions(
  obj: any,
  parentName: string,
  range: any
): languages.CompletionItem[] {
  const suggestions: languages.CompletionItem[] = [];

  if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const kind = getCompletionItemKind(value);
      const detail = getVariableDetail(value);

      suggestions.push({
        label: key,
        kind,
        detail,
        documentation: `${parentName}.${key}`,
        insertText: key,
        range,
      });
    }
  }

  return suggestions;
}

/**
 * Get filter suggestions with documentation
 */
function getFilterSuggestions(filters: FilterMetadata[], range: any): languages.CompletionItem[] {
  const suggestions: languages.CompletionItem[] = [];

  for (const filter of filters) {
    suggestions.push({
      label: filter.name,
      kind: 2, // Function
      detail: filter.signature,
      documentation: {
        value: formatFilterDocumentation(filter),
      },
      insertText: filter.name,
      range,
    });
  }

  return suggestions;
}

/**
 * Get template tag suggestions
 */
function getTagSuggestions(range: any): languages.CompletionItem[] {
  const tags = [
    {
      label: "if",
      insertText: "if ${1:condition} %}\n\t$0\n{% endif",
      documentation: "Conditional block: renders content if condition is true",
      detail: "{% if condition %} ... {% endif %}",
    },
    {
      label: "elsif",
      insertText: "elsif ${1:condition}",
      documentation: "Alternative condition in if block",
      detail: "{% elsif condition %}",
    },
    {
      label: "else",
      insertText: "else",
      documentation: "Default branch in if block",
      detail: "{% else %}",
    },
    {
      label: "unless",
      insertText: "unless ${1:condition} %}\n\t$0\n{% endunless",
      documentation: "Inverse conditional: renders content if condition is false",
      detail: "{% unless condition %} ... {% endunless %}",
    },
    {
      label: "for",
      insertText: "for ${1:item} in ${2:collection} %}\n\t$0\n{% endfor",
      documentation: "Loop over collection",
      detail: "{% for item in collection %} ... {% endfor %}",
    },
    {
      label: "assign",
      insertText: "assign ${1:variable} = ${2:value}",
      documentation: "Assign value to variable",
      detail: "{% assign variable = value %}",
    },
    {
      label: "capture",
      insertText: "capture ${1:variable} %}\n\t$0\n{% endcapture",
      documentation: "Capture block content into variable",
      detail: "{% capture variable %} ... {% endcapture %}",
    },
    {
      label: "comment",
      insertText: "comment %}\n\t$0\n{% endcomment",
      documentation: "Comment block (not rendered)",
      detail: "{% comment %} ... {% endcomment %}",
    },
  ];

  return tags.map((tag) => ({
    label: tag.label,
    kind: 14, // Keyword
    detail: tag.detail,
    documentation: tag.documentation,
    insertText: tag.insertText,
    insertTextRules: 4, // InsertAsSnippet
    range,
  }));
}

/**
 * Get completion item kind based on value type
 */
function getCompletionItemKind(value: any): number {
  if (typeof value === "function") return 2; // Function
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) return 17; // Array
    return 4; // Class/Object
  }
  if (typeof value === "string") return 12; // Value
  if (typeof value === "number") return 12; // Value
  if (typeof value === "boolean") return 12; // Value
  return 5; // Field
}

/**
 * Get variable detail string
 */
function getVariableDetail(value: any): string {
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) return "array";
    return "object";
  }
  return typeof value;
}

/**
 * Get variable documentation
 */
function getVariableDocumentation(key: string, value: any): string {
  const docs: Record<string, string> = {
    user: "User/contact information (email, firstName, lastName, isPremium, etc.)",
    campaign: "Campaign information (name, variation, unsubscribeUrl, etc.)",
    organization: "Organization information (name, logoUrl, address, etc.)",
    products: "Array of products (id, name, price, imageUrl, etc.)",
    cart: "Shopping cart information (items, total, checkoutUrl, etc.)",
    workflow: "Workflow context (id, name, triggerEvent, eventProperties, etc.)",
    now: "Current timestamp",
    today: "Current date (midnight)",
    variation: 'A/B test variation ("A" or "B")',
  };

  return docs[key] || `Variable: ${key}`;
}

/**
 * Format filter documentation
 */
function formatFilterDocumentation(filter: FilterMetadata): string {
  let doc = `**${filter.name}**\n\n${filter.description}\n\n`;
  doc += `**Signature:** \`${filter.signature}\`\n\n`;

  if (filter.examples.length > 0) {
    doc += "**Examples:**\n";
    for (const example of filter.examples) {
      doc += `- \`${example}\`\n`;
    }
  }

  return doc;
}
