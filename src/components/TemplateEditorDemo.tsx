/**
 * Template Editor Demo Component
 *
 * Example usage of the TemplateEditor component with live preview.
 * Demonstrates syntax highlighting, autocomplete, and hover documentation.
 */

import React, { useState } from "react";
import { TemplateEditor } from "./TemplateEditor";
import { TemplateEngine } from "../services/template/TemplateEngine";
import { ContextSchema } from "../services/template/monaco";

const EXAMPLE_TEMPLATE = `<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          <h1>Hello {{ user.firstName | default: "Customer" }}!</h1>
          
          {% if user.isPremium %}
            <p>Welcome back, premium member! 🌟</p>
          {% else %}
            <p>Upgrade to premium for exclusive benefits!</p>
          {% endif %}
          
          {% if products %}
            <h2>Recommended Products:</h2>
            {% for product in products limit:3 %}
              <div>
                <strong>{{ product.name }}</strong>
                <p>{{ product.price | money }}</p>
                {% if forloop.first %}
                  <span>⭐ Top Pick!</span>
                {% endif %}
              </div>
            {% endfor %}
          {% endif %}
          
          <p>Campaign: {{ campaign.name }}</p>
          <p><a href="{{ campaign.unsubscribeUrl }}">Unsubscribe</a></p>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

const EXAMPLE_CONTEXT: ContextSchema = {
  user: {
    id: "123",
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    isPremium: true,
    purchaseCount: 5,
    engagementScore: 85,
  },
  campaign: {
    id: "camp-001",
    name: "Summer Sale 2024",
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
      id: "prod-1",
      name: "Premium Widget",
      description: "The best widget on the market",
      price: 99.99,
      currency: "USD",
      imageUrl: "https://example.com/widget.jpg",
      productUrl: "https://example.com/products/widget",
    },
    {
      id: "prod-2",
      name: "Deluxe Gadget",
      description: "A fantastic gadget",
      price: 149.99,
      currency: "USD",
      imageUrl: "https://example.com/gadget.jpg",
      productUrl: "https://example.com/products/gadget",
    },
  ],
  now: new Date(),
  today: new Date(),
  variation: "A",
};

/**
 * Template Editor Demo Component
 */
export const TemplateEditorDemo: React.FC = () => {
  const [template, setTemplate] = useState(EXAMPLE_TEMPLATE);
  const [renderedHtml, setRenderedHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
  };

  const handleRender = async () => {
    setIsRendering(true);
    setError(null);

    try {
      const engine = new TemplateEngine();
      const result = await engine.render(template, EXAMPLE_CONTEXT, {
        enableMJML: true,
      });

      if (result.success && result.html) {
        setRenderedHtml(result.html);
      } else if (result.errors && result.errors.length > 0) {
        setError(result.errors[0].message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1>Template Editor Demo</h1>
      <p>
        Try editing the template below. Use <code>{"{{"}</code> for variables,{" "}
        <code>{"{% %}"}</code> for tags, and <code>|</code> for filters.
      </p>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}
      >
        {/* Editor Panel */}
        <div>
          <h2>Template Editor</h2>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Features:
            <ul>
              <li>Syntax highlighting for template tags and variables</li>
              <li>
                Autocomplete: Type <code>{"{{"}</code> for variables, <code>|</code> for filters
              </li>
              <li>Hover over filters and tags for documentation</li>
            </ul>
          </p>
          <TemplateEditor
            value={template}
            onChange={handleTemplateChange}
            contextSchema={EXAMPLE_CONTEXT}
            height="500px"
          />
          <button
            onClick={handleRender}
            disabled={isRendering}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isRendering ? "not-allowed" : "pointer",
            }}
          >
            {isRendering ? "Rendering..." : "Render Template"}
          </button>
        </div>

        {/* Preview Panel */}
        <div>
          <h2>Preview</h2>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                padding: "10px",
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                color: "#c00",
                marginBottom: "10px",
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}
          {renderedHtml && !error && (
            <iframe
              srcDoc={renderedHtml}
              style={{
                width: "100%",
                height: "500px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "white",
              }}
              title="Template Preview"
            />
          )}
          {!renderedHtml && !error && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#999",
                border: "1px solid #ddd",
                borderRadius: "4px",
                height: "500px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Click "Render Template" to see the preview
            </div>
          )}
        </div>
      </div>

      {/* Context Data Display */}
      <div style={{ marginTop: "40px" }}>
        <h2>Available Context Data</h2>
        <details>
          <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
            Click to view available variables
          </summary>
          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "12px",
            }}
          >
            {JSON.stringify(EXAMPLE_CONTEXT, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default TemplateEditorDemo;
