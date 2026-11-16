# Monaco Editor Integration for Template Engine

This directory contains the Monaco Editor integration for the template engine's Liquid-like syntax. It provides syntax highlighting, autocomplete, and hover documentation for template editing.

## Features

### 1. Syntax Highlighting (Requirement 10.1)

- **Template Variables**: `{{ variable }}` syntax with distinct colors
- **Template Tags**: `{% tag %}` syntax for control flow
- **Filters**: `| filter` syntax with function highlighting
- **Operators**: Comparison (`==`, `!=`, `>`, `<`) and logical (`and`, `or`) operators
- **Strings and Numbers**: Proper highlighting for literals
- **HTML Integration**: Works seamlessly with HTML/MJML content

### 2. Autocomplete (Requirements 10.2-10.6)

#### Variable Suggestions
- Triggered by typing `{{`
- Shows all available variables from context schema
- Displays variable type (object, array, string, etc.)
- Provides documentation for each variable

#### Filter Suggestions
- Triggered by typing `|`
- Shows all available filters (built-in and custom)
- Displays filter signature and description
- Includes usage examples

#### Tag Suggestions
- Triggered by typing `{%`
- Shows template tags: `if`, `for`, `assign`, `capture`, `unless`, etc.
- Provides snippet completion with placeholders
- Includes documentation for each tag

#### Property Access
- Triggered by typing `.` after a variable
- Shows nested properties (e.g., `user.firstName`)
- Context-aware suggestions based on object structure

### 3. Hover Documentation (Requirement 10.7)

- **Filters**: Hover over filter names to see signature, description, and examples
- **Tags**: Hover over tag keywords to see syntax and usage
- **Variables**: Hover over special variables (e.g., `forloop.index`) for documentation

## Usage

### Basic Setup

```typescript
import * as monaco from 'monaco-editor';
import { registerTemplateLanguage } from './services/template/monaco';
import { FilterRegistry } from './services/template/FilterRegistry';

// Initialize filter registry
const filterRegistry = new FilterRegistry();
const filters = filterRegistry.list();

// Register template language
registerTemplateLanguage(monaco, {
  contextSchema: {
    user: { firstName: '', lastName: '', email: '', isPremium: false },
    campaign: { name: '', variation: '' },
    products: [],
  },
  filters,
});
```

### Using the React Component

```tsx
import { TemplateEditor } from './components/TemplateEditor';

function MyComponent() {
  const [template, setTemplate] = useState('Hello {{ user.firstName }}!');

  return (
    <TemplateEditor
      value={template}
      onChange={setTemplate}
      contextSchema={{
        user: { firstName: '', lastName: '', email: '' },
        campaign: { name: '', variation: '' },
      }}
      height="400px"
    />
  );
}
```

### Creating a Custom Editor Instance

```typescript
import { createTemplateEditor } from './services/template/monaco';

const editor = createTemplateEditor(
  monaco,
  document.getElementById('editor'),
  'Initial template content',
  {
    minimap: { enabled: false },
    lineNumbers: 'on',
    wordWrap: 'on',
  }
);

// Listen for changes
editor.onDidChangeModelContent(() => {
  const value = editor.getValue();
  console.log('Template changed:', value);
});
```

## File Structure

```
monaco/
├── index.ts                    # Main entry point, registration functions
├── languageDefinition.ts       # Language configuration and tokenizer
├── autocompleteProvider.ts     # Autocomplete/IntelliSense provider
├── hoverProvider.ts           # Hover documentation provider
└── README.md                  # This file
```

## Language Definition

### Supported Syntax

#### Variables
```liquid
{{ variable }}
{{ user.firstName }}
{{ products[0].name }}
{{ value | filter }}
{{ value | filter1 | filter2 }}
```

#### Tags
```liquid
{% if condition %}...{% endif %}
{% unless condition %}...{% endunless %}
{% for item in collection %}...{% endfor %}
{% assign variable = value %}
{% capture variable %}...{% endcapture %}
{% comment %}...{% endcomment %}
```

#### Operators
```liquid
{% if x == y %}
{% if x != y %}
{% if x > y %}
{% if x < y %}
{% if x >= y %}
{% if x <= y %}
{% if x and y %}
{% if x or y %}
{% if collection contains item %}
```

#### Filters
```liquid
{{ text | upcase }}
{{ text | downcase }}
{{ text | capitalize }}
{{ text | truncate: 50 }}
{{ html | strip_html }}
{{ url | url_encode }}
{{ price | money }}
{{ price | money: "EUR" }}
{{ value | plus: 10 }}
{{ value | minus: 5 }}
{{ value | times: 2 }}
{{ value | divided_by: 3 }}
{{ value | modulo: 2 }}
{{ date | date: "MMMM dd, yyyy" }}
{{ value | default: "fallback" }}
```

## Customization

### Adding Custom Context Schema

```typescript
const customSchema = {
  user: {
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    customFields: {
      loyaltyPoints: 0,
      membershipTier: '',
    },
  },
  order: {
    id: '',
    total: 0,
    items: [],
  },
};

registerTemplateLanguage(monaco, {
  contextSchema: customSchema,
  filters,
});
```

### Adding Custom Filters

```typescript
const filterRegistry = new FilterRegistry();

// Register custom filter
filterRegistry.registerCustomFilter(
  'reverse',
  'function(value) { return String(value).split("").reverse().join(""); }',
  { type: 'organization', organizationId: 'org-123' },
  'Reverse a string',
  ['{{ "hello" | reverse }} => "olleh"']
);

// Get updated filter list
const filters = filterRegistry.list('org-123');

// Update Monaco with new filters
registerTemplateLanguage(monaco, {
  contextSchema,
  filters,
});
```

### Updating Context at Runtime

```typescript
import { updateAutocompleteContext } from './services/template/monaco';

// Update context when data changes
updateAutocompleteContext(monaco, newContextSchema, updatedFilters);
```

## Theme Customization

The default theme uses VS Code light theme colors. You can customize colors by modifying `themeRules` in `languageDefinition.ts`:

```typescript
export const themeRules = [
  { token: 'delimiter.tag', foreground: '808080', fontStyle: 'bold' },
  { token: 'delimiter.variable', foreground: '808080', fontStyle: 'bold' },
  { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
  // ... add more rules
];
```

## Testing

To test the Monaco Editor integration:

1. Run the demo component:
```bash
npm run dev
```

2. Navigate to the template editor demo page

3. Test the following features:
   - Type `{{` and verify variable suggestions appear
   - Type `|` after a variable and verify filter suggestions appear
   - Type `{%` and verify tag suggestions appear
   - Hover over filter names and verify documentation appears
   - Verify syntax highlighting for all token types

## Browser Compatibility

Monaco Editor requires modern browsers with ES6 support:
- Chrome 63+
- Firefox 67+
- Safari 11.1+
- Edge 79+

## Performance Considerations

- Language registration is done once during app initialization
- Autocomplete providers are lightweight and don't impact typing performance
- Large context schemas (>1000 properties) may slow down autocomplete
- Consider lazy-loading Monaco Editor for faster initial page load

## Troubleshooting

### Autocomplete not working
- Ensure `registerTemplateLanguage()` is called before creating editor
- Verify context schema is properly formatted
- Check browser console for errors

### Syntax highlighting not working
- Verify language ID is set to `'liquid-template'`
- Ensure theme is set to `'liquid-template-theme'`
- Check that monarch tokenizer is registered

### Hover documentation not showing
- Ensure filters array is passed to `registerTemplateLanguage()`
- Verify filter metadata includes description and examples
- Check that hover provider is registered

## Future Enhancements

- [ ] Diagnostic provider for real-time syntax validation
- [ ] Code actions for quick fixes (e.g., close unclosed tags)
- [ ] Formatting provider for pretty-printing templates
- [ ] Signature help for filter parameters
- [ ] Go-to-definition for variables and filters
- [ ] Find references for variables
- [ ] Rename refactoring for variables

## References

- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [Monarch Tokenizer Guide](https://microsoft.github.io/monaco-editor/monarch.html)
- [Language Service API](https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.html)
