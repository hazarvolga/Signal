/**
 * Monaco Editor Language Definition for Liquid-like Template Syntax
 *
 * Defines tokenizer, syntax highlighting, and language configuration
 * for the template engine's Liquid-like syntax.
 *
 * Requirements: 10.1
 */

import type { editor, languages } from "monaco-editor";

export const TEMPLATE_LANGUAGE_ID = "liquid-template";

/**
 * Language configuration for bracket matching, auto-closing, etc.
 */
export const languageConfiguration: languages.LanguageConfiguration = {
  comments: {
    blockComment: ["{% comment %}", "{% endcomment %}"],
  },
  brackets: [
    ["{%", "%}"],
    ["{{", "}}"],
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{%", close: "%}" },
    { open: "{{", close: "}}" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: "{%", close: "%}" },
    { open: "{{", close: "}}" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

/**
 * Monarch tokenizer for syntax highlighting
 */
export const monarchLanguage: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".liquid",

  // Keywords for template tags
  keywords: [
    "if",
    "elsif",
    "else",
    "endif",
    "unless",
    "endunless",
    "for",
    "endfor",
    "in",
    "limit",
    "assign",
    "capture",
    "endcapture",
    "comment",
    "endcomment",
  ],

  // Operators
  operators: ["==", "!=", ">", "<", ">=", "<=", "and", "or", "contains"],

  // Built-in filters
  filters: [
    "upcase",
    "downcase",
    "capitalize",
    "truncate",
    "strip_html",
    "url_encode",
    "money",
    "plus",
    "minus",
    "times",
    "divided_by",
    "modulo",
    "date",
    "default",
  ],

  // Special variables
  specialVariables: [
    "forloop.index",
    "forloop.index0",
    "forloop.first",
    "forloop.last",
    "forloop.length",
  ],

  // Tokenizer rules
  tokenizer: {
    root: [
      // Template tags {% ... %}
      [/\{%/, { token: "delimiter.tag", next: "@tag" }],

      // Template variables {{ ... }}
      [/\{\{/, { token: "delimiter.variable", next: "@variable" }],

      // HTML tags
      [/<\/?[a-zA-Z][\w-]*/, "tag"],
      [/<[a-zA-Z][\w-]*/, "tag", "@htmlTag"],

      // Default text
      [/./, "text"],
    ],

    // Inside {% ... %} tags
    tag: [
      [/%}/, { token: "delimiter.tag", next: "@pop" }],

      // Keywords
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@keywords": "keyword",
            "@operators": "operator",
            "@default": "variable",
          },
        },
      ],

      // Numbers
      [/\d+(\.\d+)?/, "number"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-terminated string
      [/'([^'\\]|\\.)*$/, "string.invalid"], // non-terminated string
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],

      // Operators
      [/[=!<>]=?/, "operator"],
      [/[|:]/, "delimiter"],

      // Whitespace
      [/\s+/, "white"],
    ],

    // Inside {{ ... }} variables
    variable: [
      [/}}/, { token: "delimiter.variable", next: "@pop" }],

      // Filter pipe
      [/\|/, "delimiter.filter", "@filter"],

      // Property access
      [/\./, "delimiter"],
      [/\[/, "delimiter", "@arrayAccess"],

      // Variable names
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@specialVariables": "variable.predefined",
            "@default": "variable",
          },
        },
      ],

      // Numbers
      [/\d+/, "number"],

      // Whitespace
      [/\s+/, "white"],
    ],

    // Inside filter expressions
    filter: [
      [/}}/, { token: "delimiter.variable", next: "@pop" }],
      [/\|/, "delimiter.filter"],

      // Filter names
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@filters": "function",
            "@default": "function",
          },
        },
      ],

      // Filter arguments
      [/:/, "delimiter"],
      [/\d+(\.\d+)?/, "number"],
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],

      // Whitespace
      [/\s+/, "white"],
    ],

    // Array access [index]
    arrayAccess: [
      [/\]/, "delimiter", "@pop"],
      [/\d+/, "number"],
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
      [/[a-zA-Z_]\w*/, "variable"],
    ],

    // String literals (double quotes)
    string_double: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],

    // String literals (single quotes)
    string_single: [
      [/[^\\']+/, "string"],
      [/\\./, "string.escape"],
      [/'/, "string", "@pop"],
    ],

    // HTML tag attributes
    htmlTag: [
      [/>/, "tag", "@pop"],
      [/[a-zA-Z-]+/, "attribute.name"],
      [/=/, "delimiter"],
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
      [/\s+/, "white"],
    ],
  },
};

/**
 * Theme configuration for syntax highlighting colors
 */
export const themeRules: editor.ITokenThemeRule[] = [
  { token: "delimiter.tag", foreground: "808080", fontStyle: "bold" },
  { token: "delimiter.variable", foreground: "808080", fontStyle: "bold" },
  { token: "delimiter.filter", foreground: "FFA500" },
  { token: "keyword", foreground: "0000FF", fontStyle: "bold" },
  { token: "operator", foreground: "000000" },
  { token: "variable", foreground: "001080" },
  { token: "variable.predefined", foreground: "0070C1", fontStyle: "italic" },
  { token: "function", foreground: "795E26" },
  { token: "number", foreground: "098658" },
  { token: "string", foreground: "A31515" },
  { token: "string.escape", foreground: "EE0000", fontStyle: "bold" },
  { token: "string.invalid", foreground: "FF0000" },
  { token: "tag", foreground: "800000" },
  { token: "attribute.name", foreground: "FF0000" },
];
