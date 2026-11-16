/**
 * Preview System Component
 *
 * Real-time template preview with debounced rendering, customer profile selector,
 * and error display with line highlighting.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.8
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { TemplateEditor } from "./TemplateEditor";
import { TemplateEngine } from "../services/template/TemplateEngine";
import { ContextData } from "../services/template/types";

/**
 * Predefined customer profiles for preview
 */
const CUSTOMER_PROFILES = {
  premium: {
    name: "Premium Customer",
    data: {
      user: {
        id: "user-premium-001",
        email: "premium@example.com",
        firstName: "Sarah",
        lastName: "Johnson",
        fullName: "Sarah Johnson",
        isPremium: true,
        purchaseCount: 25,
        engagementScore: 95,
        customFields: {
          memberSince: "2020-01-15",
          tier: "Gold",
        },
      },
      campaign: {
        id: "camp-001",
        name: "Premium Member Exclusive",
        variation: "A",
        unsubscribeUrl: "https://example.com/unsubscribe",
        preferenceCenterUrl: "https://example.com/preferences",
        viewInBrowserUrl: "https://example.com/view",
      },
      organization: {
        name: "SIGNAL",
        logoUrl: "https://example.com/logo.png",
        address: "123 Main St, City, Country",
        timezone: "UTC",
      },
      products: [
        {
          id: "prod-premium-1",
          name: "Premium Widget Pro",
          price: 299.99,
          currency: "USD",
          imageUrl: "https://example.com/premium-widget.jpg",
          productUrl: "https://example.com/products/premium-widget",
        },
        {
          id: "prod-premium-2",
          name: "Elite Gadget",
          price: 499.99,
          currency: "USD",
          imageUrl: "https://example.com/elite-gadget.jpg",
          productUrl: "https://example.com/products/elite-gadget",
        },
      ],
      now: new Date(),
      today: new Date(),
      variation: "A",
    } as ContextData,
  },
  regular: {
    name: "Regular Customer",
    data: {
      user: {
        id: "user-regular-001",
        email: "regular@example.com",
        firstName: "John",
        lastName: "Smith",
        fullName: "John Smith",
        isPremium: false,
        purchaseCount: 5,
        engagementScore: 60,
        customFields: {
          memberSince: "2022-06-10",
        },
      },
      campaign: {
        id: "camp-002",
        name: "Monthly Newsletter",
        variation: "B",
        unsubscribeUrl: "https://example.com/unsubscribe",
        preferenceCenterUrl: "https://example.com/preferences",
        viewInBrowserUrl: "https://example.com/view",
      },
      organization: {
        name: "SIGNAL",
        logoUrl: "https://example.com/logo.png",
        address: "123 Main St, City, Country",
        timezone: "UTC",
      },
      products: [
        {
          id: "prod-regular-1",
          name: "Standard Widget",
          price: 49.99,
          currency: "USD",
          imageUrl: "https://example.com/standard-widget.jpg",
          productUrl: "https://example.com/products/standard-widget",
        },
      ],
      now: new Date(),
      today: new Date(),
      variation: "B",
    } as ContextData,
  },
  new: {
    name: "New Customer",
    data: {
      user: {
        id: "user-new-001",
        email: "newuser@example.com",
        firstName: "Emily",
        lastName: "Davis",
        fullName: "Emily Davis",
        isPremium: false,
        purchaseCount: 0,
        engagementScore: 10,
        customFields: {
          memberSince: new Date().toISOString().split("T")[0],
        },
      },
      campaign: {
        id: "camp-003",
        name: "Welcome Series",
        variation: "A",
        unsubscribeUrl: "https://example.com/unsubscribe",
        preferenceCenterUrl: "https://example.com/preferences",
        viewInBrowserUrl: "https://example.com/view",
      },
      organization: {
        name: "SIGNAL",
        logoUrl: "https://example.com/logo.png",
        address: "123 Main St, City, Country",
        timezone: "UTC",
      },
      products: [
        {
          id: "prod-starter-1",
          name: "Starter Pack",
          price: 19.99,
          currency: "USD",
          imageUrl: "https://example.com/starter-pack.jpg",
          productUrl: "https://example.com/products/starter-pack",
        },
      ],
      now: new Date(),
      today: new Date(),
      variation: "A",
    } as ContextData,
  },
};

type ProfileKey = keyof typeof CUSTOMER_PROFILES;

/**
 * Preview System Props
 */
export interface PreviewSystemProps {
  /** Initial template content */
  initialTemplate?: string;
  /** Callback when template changes */
  onTemplateChange?: (template: string) => void;
  /** Enable MJML compilation */
  enableMJML?: boolean;
  /** Editor height */
  editorHeight?: string | number;
}

/**
 * Preview System Component
 *
 * Provides real-time template preview with:
 * - Debounced rendering (500ms)
 * - Predefined customer profiles (Premium, Regular, New)
 * - Custom JSON context input
 * - Error display with line highlighting
 * - Side-by-side editor and preview
 */
export const PreviewSystem: React.FC<PreviewSystemProps> = ({
  initialTemplate = "",
  onTemplateChange,
  enableMJML = false,
  editorHeight = "500px",
}) => {
  const [template, setTemplate] = useState(initialTemplate);
  const [selectedProfile, setSelectedProfile] = useState<ProfileKey>("regular");
  const [customContext, setCustomContext] = useState("");
  const [useCustomContext, setUseCustomContext] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState("");
  const [error, setError] = useState<{
    message: string;
    line?: number;
    column?: number;
  } | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const templateEngineRef = useRef(new TemplateEngine());

  /**
   * Render template with current context
   */
  const renderTemplate = useCallback(
    async (templateContent: string, context: ContextData) => {
      setIsRendering(true);
      setError(null);

      const startTime = performance.now();

      try {
        const result = await templateEngineRef.current.render(templateContent, context, {
          enableMJML,
        });

        const endTime = performance.now();
        setRenderTime(endTime - startTime);

        if (result.success && result.html) {
          setRenderedHtml(result.html);
        } else if (result.errors && result.errors.length > 0) {
          const firstError = result.errors[0];
          setError({
            message: firstError.message,
            line: firstError.line,
            column: firstError.column,
          });
          setRenderedHtml("");
        }
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : "Unknown error occurred",
        });
        setRenderedHtml("");
        setRenderTime(null);
      } finally {
        setIsRendering(false);
      }
    },
    [enableMJML]
  );

  /**
   * Get current context data
   */
  const getCurrentContext = useCallback((): ContextData | null => {
    if (useCustomContext && customContext) {
      try {
        return JSON.parse(customContext);
      } catch (err) {
        setError({
          message: `Invalid JSON in custom context: ${err instanceof Error ? err.message : "Parse error"}`,
        });
        return null;
      }
    }
    return CUSTOMER_PROFILES[selectedProfile].data;
  }, [useCustomContext, customContext, selectedProfile]);

  /**
   * Debounced render effect
   * Requirement 11.8: Debounce preview updates by 500ms
   */
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced render
    debounceTimerRef.current = setTimeout(() => {
      const context = getCurrentContext();
      if (context) {
        renderTemplate(template, context);
      }
    }, 500);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    template,
    selectedProfile,
    customContext,
    useCustomContext,
    getCurrentContext,
    renderTemplate,
  ]);

  /**
   * Handle template change
   */
  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    if (onTemplateChange) {
      onTemplateChange(value);
    }
  };

  /**
   * Handle profile change
   */
  const handleProfileChange = (profile: ProfileKey) => {
    setSelectedProfile(profile);
    setUseCustomContext(false);
  };

  /**
   * Handle custom context toggle
   */
  const handleCustomContextToggle = () => {
    const newValue = !useCustomContext;
    setUseCustomContext(newValue);

    // Pre-fill with current profile data when enabling custom context
    if (newValue && !customContext) {
      setCustomContext(JSON.stringify(CUSTOMER_PROFILES[selectedProfile].data, null, 2));
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1600px", margin: "0 auto" }}>
      <h1>Template Preview System</h1>

      {/* Profile Selector - Requirement 11.2, 11.3 */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <label style={{ fontWeight: "bold" }}>Customer Profile:</label>
        <button
          onClick={() => handleProfileChange("premium")}
          disabled={useCustomContext}
          style={{
            padding: "8px 16px",
            backgroundColor:
              selectedProfile === "premium" && !useCustomContext ? "#007bff" : "#f0f0f0",
            color: selectedProfile === "premium" && !useCustomContext ? "white" : "#333",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: useCustomContext ? "not-allowed" : "pointer",
          }}
        >
          Premium Customer
        </button>
        <button
          onClick={() => handleProfileChange("regular")}
          disabled={useCustomContext}
          style={{
            padding: "8px 16px",
            backgroundColor:
              selectedProfile === "regular" && !useCustomContext ? "#007bff" : "#f0f0f0",
            color: selectedProfile === "regular" && !useCustomContext ? "white" : "#333",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: useCustomContext ? "not-allowed" : "pointer",
          }}
        >
          Regular Customer
        </button>
        <button
          onClick={() => handleProfileChange("new")}
          disabled={useCustomContext}
          style={{
            padding: "8px 16px",
            backgroundColor: selectedProfile === "new" && !useCustomContext ? "#007bff" : "#f0f0f0",
            color: selectedProfile === "new" && !useCustomContext ? "white" : "#333",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: useCustomContext ? "not-allowed" : "pointer",
          }}
        >
          New Customer
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            id="custom-context"
            checked={useCustomContext}
            onChange={handleCustomContextToggle}
          />
          <label htmlFor="custom-context">Use Custom JSON</label>
        </div>
      </div>

      {/* Custom Context Input - Requirement 11.3 */}
      {useCustomContext && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>
            Custom Context (JSON):
          </label>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            style={{
              width: "100%",
              height: "150px",
              fontFamily: "monospace",
              fontSize: "12px",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            placeholder='{"user": {"firstName": "John", ...}}'
          />
        </div>
      )}

      {/* Side-by-side Editor and Preview - Requirement 11.5 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Template Editor */}
        <div>
          <h2>Template Editor</h2>
          <TemplateEditor
            value={template}
            onChange={handleTemplateChange}
            contextSchema={getCurrentContext() || undefined}
            height={editorHeight}
          />

          {/* Render Status */}
          <div style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
            {isRendering && <span>⏳ Rendering...</span>}
            {!isRendering && renderTime !== null && (
              <span>✓ Rendered in {renderTime.toFixed(2)}ms</span>
            )}
          </div>
        </div>

        {/* Preview Panel - Requirement 11.4 */}
        <div>
          <h2>Preview</h2>

          {/* Error Display - Requirement 11.6 */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                padding: "15px",
                backgroundColor: "#fee",
                border: "2px solid #fcc",
                borderRadius: "4px",
                color: "#c00",
                marginBottom: "10px",
                fontFamily: "monospace",
                fontSize: "13px",
              }}
            >
              <strong>❌ Rendering Error</strong>
              <div style={{ marginTop: "8px" }}>{error.message}</div>
              {error.line !== undefined && (
                <div style={{ marginTop: "8px", fontSize: "12px" }}>
                  Line {error.line}
                  {error.column !== undefined && `, Column ${error.column}`}
                </div>
              )}
            </div>
          )}

          {/* Rendered Output in iframe - Requirement 11.4 */}
          {renderedHtml && !error && (
            <iframe
              srcDoc={renderedHtml}
              style={{
                width: "100%",
                height: typeof editorHeight === "number" ? `${editorHeight}px` : editorHeight,
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "white",
              }}
              title="Template Preview"
              sandbox="allow-same-origin"
            />
          )}

          {/* Empty State */}
          {!renderedHtml && !error && !isRendering && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#999",
                border: "1px solid #ddd",
                borderRadius: "4px",
                height: typeof editorHeight === "number" ? `${editorHeight}px` : editorHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Start typing to see preview...
            </div>
          )}
        </div>
      </div>

      {/* Current Profile Info */}
      {!useCustomContext && (
        <div style={{ marginTop: "20px" }}>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
              View {CUSTOMER_PROFILES[selectedProfile].name} Data
            </summary>
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "15px",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "12px",
                marginTop: "10px",
              }}
            >
              {JSON.stringify(CUSTOMER_PROFILES[selectedProfile].data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default PreviewSystem;
