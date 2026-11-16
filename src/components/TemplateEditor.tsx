/**
 * Template Editor Component
 *
 * React component wrapper for Monaco Editor with template language support.
 * Provides syntax highlighting, autocomplete, and hover documentation
 * for the template engine's Liquid-like syntax.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import {
  registerTemplateLanguage,
  createTemplateEditor,
  TEMPLATE_LANGUAGE_ID,
  ContextSchema,
} from "../services/template/monaco";
import { FilterRegistry } from "../services/template/FilterRegistry";

/**
 * Template Editor Props
 */
export interface TemplateEditorProps {
  /** Initial template content */
  value?: string;
  /** Callback when template content changes */
  onChange?: (value: string) => void;
  /** Context schema for variable autocomplete */
  contextSchema?: ContextSchema;
  /** Custom filter registry (optional, uses default if not provided) */
  filterRegistry?: FilterRegistry;
  /** Editor height */
  height?: string | number;
  /** Editor options */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  /** Read-only mode */
  readOnly?: boolean;
}

/**
 * Template Editor Component
 *
 * @example
 * ```tsx
 * <TemplateEditor
 *   value="Hello {{ user.firstName }}!"
 *   onChange={(value) => console.log(value)}
 *   contextSchema={{
 *     user: { firstName: '', lastName: '', email: '' },
 *     campaign: { name: '', variation: '' },
 *   }}
 *   height="400px"
 * />
 * ```
 */
export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  value = "",
  onChange,
  contextSchema,
  filterRegistry,
  height = "400px",
  options = {},
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Register language once
    if (!isRegisteredRef.current) {
      const registry = filterRegistry || new FilterRegistry();
      const filters = registry.list();

      registerTemplateLanguage(monaco, {
        contextSchema: contextSchema || getDefaultContextSchema(),
        filters,
      });

      isRegisteredRef.current = true;
    }

    // Create editor instance
    const editor = createTemplateEditor(monaco, containerRef.current, value, {
      readOnly,
      ...options,
    });

    editorRef.current = editor;

    // Listen for content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const currentValue = editor.getValue();
      if (onChange) {
        onChange(currentValue);
      }
    });

    // Cleanup
    return () => {
      disposable.dispose();
      editor.dispose();
    };
  }, []); // Only run once on mount

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Update read-only mode
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: "100%",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    />
  );
};

/**
 * Get default context schema
 */
function getDefaultContextSchema(): ContextSchema {
  return {
    user: {
      id: "",
      email: "",
      firstName: "",
      lastName: "",
      fullName: "",
      isPremium: false,
      purchaseCount: 0,
      engagementScore: 0,
      customFields: {},
    },
    campaign: {
      id: "",
      name: "",
      variation: "",
      unsubscribeUrl: "",
      preferenceCenterUrl: "",
      viewInBrowserUrl: "",
    },
    organization: {
      name: "",
      logoUrl: "",
      address: "",
      timezone: "",
    },
    products: [],
    cart: {
      items: [],
      total: 0,
      currency: "USD",
      checkoutUrl: "",
    },
    workflow: {
      id: "",
      name: "",
      triggerEvent: "",
      eventProperties: {},
    },
    now: new Date(),
    today: new Date(),
    variation: "A",
  };
}

export default TemplateEditor;
