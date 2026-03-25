import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Settings, Eye, Layout, Type, Image as ImageIcon, MousePointerClick, AlignLeft, Palette, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FormBuilderProps {
  onBack: () => void;
  initialType?: 'popup' | 'landing_page';
}

type ElementType = 'text' | 'input' | 'button' | 'image' | 'spacer';

interface FormElement {
  id: string;
  type: ElementType;
  content?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function FormBuilder({ onBack, initialType = 'landing_page' }: FormBuilderProps) {
  const [formName, setFormName] = useState('Untitled Form');
  const [elements, setElements] = useState<FormElement[]>([
    { id: '1', type: 'text', content: 'Join Our Newsletter', style: { fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' } },
    { id: '2', type: 'text', content: 'Get the latest updates directly to your inbox.', style: { fontSize: '16px', textAlign: 'center', marginBottom: '24px', color: '#666' } },
    { id: '3', type: 'input', placeholder: 'Enter your email address', style: { width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ccc' } },
    { id: '4', type: 'button', content: 'Subscribe Now', style: { width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' } },
  ]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'build' | 'design' | 'settings'>('build');

  const addElement = (type: ElementType) => {
    const newElement: FormElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'text' ? 'New Text Block' : type === 'button' ? 'Click Me' : '',
      placeholder: type === 'input' ? 'Enter text...' : '',
      style: {
        padding: '8px',
        marginBottom: '16px',
        width: type === 'input' || type === 'button' ? '100%' : 'auto'
      }
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<FormElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col h-screen">
      {/* Header */}
      <header className="h-16 border-b border-border-hairline bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-bg rounded-full transition-colors">
            <ArrowLeft size={20} className="text-ink/70" />
          </button>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
          />
          <span className="text-xs font-bold uppercase tracking-wider bg-burgundy/10 text-burgundy px-2 py-1 rounded">
            {initialType === 'landing_page' ? 'Landing Page' : 'Pop-up'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-ink/70 hover:bg-bg transition-colors">
            <Eye size={16} />
            Preview
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-burgundy text-white text-sm font-bold hover:bg-burgundy/90 transition-colors">
            <Save size={16} />
            Save & Publish
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-64 border-r border-border-hairline bg-white flex flex-col shrink-0">
          <div className="flex border-b border-border-hairline">
            <button
              onClick={() => setActiveTab('build')}
              className={cn("flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors", activeTab === 'build' ? "border-burgundy text-burgundy" : "border-transparent text-ink/50 hover:text-ink")}
            >
              Build
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={cn("flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors", activeTab === 'design' ? "border-burgundy text-burgundy" : "border-transparent text-ink/50 hover:text-ink")}
            >
              Design
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn("flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors", activeTab === 'settings' ? "border-burgundy text-burgundy" : "border-transparent text-ink/50 hover:text-ink")}
            >
              Settings
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {activeTab === 'build' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink/50 mb-3">Add Elements</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addElement('text')} className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors">
                      <Type size={20} />
                      <span className="text-xs font-medium">Text</span>
                    </button>
                    <button onClick={() => addElement('input')} className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors">
                      <AlignLeft size={20} />
                      <span className="text-xs font-medium">Input</span>
                    </button>
                    <button onClick={() => addElement('button')} className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors">
                      <MousePointerClick size={20} />
                      <span className="text-xs font-medium">Button</span>
                    </button>
                    <button onClick={() => addElement('image')} className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors">
                      <ImageIcon size={20} />
                      <span className="text-xs font-medium">Image</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-6">
                <div className="text-sm text-ink/70">Global design settings will go here (colors, fonts, background).</div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="text-sm text-ink/70">Form settings (success message, redirect URL, tags) will go here.</div>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 bg-bg/50 overflow-y-auto p-8 flex justify-center">
          <div 
            className={cn(
              "bg-white shadow-xl relative",
              initialType === 'popup' ? "w-[400px] h-fit rounded-lg mt-20" : "w-full max-w-2xl min-h-[800px] rounded-none"
            )}
            style={{ padding: '40px' }}
          >
            {elements.map((el) => (
              <div
                key={el.id}
                onClick={() => setSelectedElementId(el.id)}
                className={cn(
                  "relative group cursor-pointer border-2 border-transparent hover:border-burgundy/30 transition-colors",
                  selectedElementId === el.id && "border-burgundy border-dashed"
                )}
              >
                {el.type === 'text' && (
                  <div style={el.style}>{el.content}</div>
                )}
                {el.type === 'input' && (
                  <input type="text" placeholder={el.placeholder} style={el.style} readOnly />
                )}
                {el.type === 'button' && (
                  <button style={el.style}>{el.content}</button>
                )}
                {el.type === 'image' && (
                  <div style={{ ...el.style, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px' }}>
                    <ImageIcon className="text-ink/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar - Properties */}
        {selectedElement && (
          <aside className="w-72 border-l border-border-hairline bg-white flex flex-col shrink-0">
            <div className="p-4 border-b border-border-hairline flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Properties</h3>
              <button onClick={() => setSelectedElementId(null)} className="text-ink/50 hover:text-ink">
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {selectedElement.type === 'text' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Content</label>
                  <textarea
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="w-full p-2 border border-border-hairline rounded text-sm"
                    rows={3}
                  />
                </div>
              )}
              {selectedElement.type === 'input' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Placeholder</label>
                  <input
                    type="text"
                    value={selectedElement.placeholder}
                    onChange={(e) => updateElement(selectedElement.id, { placeholder: e.target.value })}
                    className="w-full p-2 border border-border-hairline rounded text-sm"
                  />
                </div>
              )}
              {selectedElement.type === 'button' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Button Text</label>
                  <input
                    type="text"
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="w-full p-2 border border-border-hairline rounded text-sm"
                  />
                </div>
              )}
              
              <div className="pt-4 border-t border-border-hairline">
                <button 
                  onClick={() => {
                    setElements(elements.filter(e => e.id !== selectedElement.id));
                    setSelectedElementId(null);
                  }}
                  className="w-full py-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Element
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
