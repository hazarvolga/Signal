/**
 * Monaco Editor Hover Provider for Template Syntax
 *
 * Provides hover documentation for:
 * - Filters (signature, description, examples)
 * - Template tags
 * - Variables
 *
 * Requirements: 10.7
 */

import type { languages, Position, CancellationToken, editor } from "monaco-editor";
import { FilterMetadata } from "../types";

/**
 * Hover provider configuration
 */
export interface HoverProviderConfig {
  filters?: FilterMetadata[];
}

/**
 * Create hover provider for template language
 */
export function createHoverProvider(config: HoverProviderConfig = {}): languages.HoverProvider {
  const { filters = [] } = config;

  return {
    provideHover: (
      model: editor.ITextModel,
      position: Position,
      token: CancellationToken
    ): languages.ProviderResult<languages.Hover> => {
      const word = model.getWordAtPosition(position);
      if (!word) {
        return null;
      }

      const line = model.getLineContent(position.lineNumber);
      const wordText = word.word;

      // Check if hovering over a filter
      const filterMatch = line.match(new RegExp(`\\|\\s*${wordText}\\b`));
      if (filterMatch) {
        const filter = filters.find((f) => f.name === wordText);
        if (filter) {
          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn,
            },
            contents: [
              { value: `**Filter: ${filter.name}**` },
              { value: filter.description },
              { value: `**Signature:** \`${filter.signature}\`` },
              ...(filter.examples.length > 0
                ? [
                    { value: "**Examples:**" },
                    ...filter.examples.map((ex) => ({ value: `\`${ex}\`` })),
                  ]
                : []),
            ],
          };
        }
      }

      // Check if hovering over a template tag
      const tagMatch = line.match(new RegExp(`{%\\s*${wordText}\\b`));
      if (tagMatch) {
        const tagDoc = getTagDocumentation(wordText);
        if (tagDoc) {
          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn,
            },
            contents: [
              { value: `**Tag: ${wordText}**` },
              { value: tagDoc.description },
              { value: `**Syntax:** \`${tagDoc.syntax}\`` },
              ...(tagDoc.examples
                ? [{ value: "**Example:**" }, { value: `\`\`\`liquid\n${tagDoc.examples}\n\`\`\`` }]
                : []),
            ],
          };
        }
      }

      // Check if hovering over a special variable
      const specialVarDoc = getSpecialVariableDocumentation(wordText, line);
      if (specialVarDoc) {
        return {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn,
          },
          contents: [{ value: `**Variable: ${wordText}**` }, { value: specialVarDoc }],
        };
      }

      return null;
    },
  };
}

/**
 * Get documentation for template tags
 */
function getTagDocumentation(
  tag: string
): { description: string; syntax: string; examples?: string } | null {
  const tagDocs: Record<string, { description: string; syntax: string; examples?: string }> = {
    if: {
      description: "Renders content conditionally based on a boolean expression",
      syntax: "{% if condition %} ... {% endif %}",
      examples: "{% if user.isPremium %}\n  Welcome, premium member!\n{% endif %}",
    },
    elsif: {
      description: "Alternative condition in an if block",
      syntax: "{% elsif condition %}",
      examples:
        "{% if user.isPremium %}\n  Premium content\n{% elsif user.isRegistered %}\n  Registered content\n{% endif %}",
    },
    else: {
      description: "Default branch when no conditions match",
      syntax: "{% else %}",
      examples: "{% if user.isPremium %}\n  Premium\n{% else %}\n  Standard\n{% endif %}",
    },
    unless: {
      description: "Inverse conditional - renders content when condition is false",
      syntax: "{% unless condition %} ... {% endunless %}",
      examples: "{% unless user.isPremium %}\n  Upgrade to premium!\n{% endunless %}",
    },
    for: {
      description: "Iterates over a collection and renders content for each item",
      syntax: "{% for item in collection %} ... {% endfor %}",
      examples:
        "{% for product in products %}\n  {{ product.name }}: {{ product.price | money }}\n{% endfor %}",
    },
    assign: {
      description: "Assigns a value to a variable",
      syntax: "{% assign variable = value %}",
      examples: "{% assign total = product.price | times: quantity %}",
    },
    capture: {
      description: "Captures block content into a variable",
      syntax: "{% capture variable %} ... {% endcapture %}",
      examples:
        "{% capture greeting %}\n  Hello {{ user.firstName }}!\n{% endcapture %}\n{{ greeting }}",
    },
    comment: {
      description: "Comment block that is not rendered in output",
      syntax: "{% comment %} ... {% endcomment %}",
      examples: "{% comment %}\n  This is a comment\n{% endcomment %}",
    },
    endif: {
      description: "Closes an if or unless block",
      syntax: "{% endif %}",
    },
    endunless: {
      description: "Closes an unless block",
      syntax: "{% endunless %}",
    },
    endfor: {
      description: "Closes a for loop",
      syntax: "{% endfor %}",
    },
    endcapture: {
      description: "Closes a capture block",
      syntax: "{% endcapture %}",
    },
    endcomment: {
      description: "Closes a comment block",
      syntax: "{% endcomment %}",
    },
  };

  return tagDocs[tag] || null;
}

/**
 * Get documentation for special variables
 */
function getSpecialVariableDocumentation(word: string, line: string): string | null {
  // Check for forloop variables
  if (line.includes("forloop.")) {
    const forloopDocs: Record<string, string> = {
      index: "Current iteration number (1-based)",
      index0: "Current iteration number (0-based)",
      first: "True if this is the first iteration",
      last: "True if this is the last iteration",
      length: "Total number of iterations",
    };

    for (const [key, doc] of Object.entries(forloopDocs)) {
      if (word === key || line.includes(`forloop.${key}`)) {
        return `**forloop.${key}** - ${doc}`;
      }
    }
  }

  // Check for common context variables
  const contextDocs: Record<string, string> = {
    user: "User/contact information (email, firstName, lastName, isPremium, purchaseCount, etc.)",
    campaign: "Campaign information (name, variation, unsubscribeUrl, preferenceCenterUrl, etc.)",
    organization: "Organization information (name, logoUrl, address, timezone)",
    products: "Array of products with id, name, price, imageUrl, productUrl, etc.",
    cart: "Shopping cart with items array, total, currency, checkoutUrl",
    workflow: "Workflow context with id, name, triggerEvent, eventProperties",
    now: "Current timestamp (Date object)",
    today: "Current date at midnight (Date object)",
    variation: 'A/B test variation identifier ("A" or "B")',
  };

  return contextDocs[word] || null;
}
