import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, LayoutTemplate, FileText, ExternalLink, Code, MoreVertical, Edit, Trash2, Copy, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { HelpTooltip } from './HelpTooltip';
import FormBuilder from './FormBuilder';

type FormType = 'popup' | 'landing_page';

interface Form {
  id: string;
  name: string;
  type: FormType;
  status: 'active' | 'draft' | 'archived';
  views: number;
  submissions: number;
  conversionRate: number;
  createdAt: string;
  url?: string;
}

const mockForms: Form[] = [
  {
    id: '1',
    name: 'Newsletter Signup Popup',
    type: 'popup',
    status: 'active',
    views: 1250,
    submissions: 150,
    conversionRate: 12,
    createdAt: '2023-10-25',
  },
  {
    id: '2',
    name: 'Link in Bio - Instagram',
    type: 'landing_page',
    status: 'active',
    views: 5400,
    submissions: 820,
    conversionRate: 15.1,
    createdAt: '2023-11-02',
    url: 'https://signal.app/l/insta-bio'
  },
  {
    id: '3',
    name: 'E-book Download Form',
    type: 'landing_page',
    status: 'draft',
    views: 0,
    submissions: 0,
    conversionRate: 0,
    createdAt: '2023-11-15',
  }
];

export default function FormsPages() {
  const [forms, setForms] = useState<Form[]>(mockForms);
  const [activeTab, setActiveTab] = useState<'all' | 'popup' | 'landing_page'>('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderType, setBuilderType] = useState<'popup' | 'landing_page'>('landing_page');
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const filteredForms = forms.filter(form => activeTab === 'all' || form.type === activeTab);

  const handleCreateNew = (type: 'popup' | 'landing_page') => {
    setBuilderType(type);
    setIsBuilderOpen(true);
    setShowTypeSelector(false);
  };

  if (isBuilderOpen) {
    return <FormBuilder onBack={() => setIsBuilderOpen(false)} initialType={builderType} />;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-serif font-black text-ink mb-2 flex items-center gap-3">
            Forms & Pages
            <HelpTooltip guideKey="forms_overview" />
          </h1>
          <p className="text-lg text-ink/60 max-w-2xl">
            Create high-converting landing pages and embeddable pop-ups to grow your audience.
          </p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            className="bg-burgundy text-white px-6 py-3 rounded-none font-bold tracking-wide hover:bg-burgundy/90 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Create New
          </button>
          
          {showTypeSelector && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-border-hairline shadow-lg z-10">
              <button 
                onClick={() => handleCreateNew('landing_page')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg transition-colors border-b border-border-hairline"
              >
                <LayoutTemplate size={16} className="text-ink/50" />
                <span className="text-sm font-bold">Landing Page</span>
              </button>
              <button 
                onClick={() => handleCreateNew('popup')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg transition-colors"
              >
                <FileText size={16} className="text-ink/50" />
                <span className="text-sm font-bold">Pop-up Form</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="bg-white border border-border-hairline p-6 shadow-sm">
        <div className="flex gap-6 border-b border-border-hairline mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative",
              activeTab === 'all' ? "text-burgundy" : "text-ink/50 hover:text-ink"
            )}
          >
            All Items
            {activeTab === 'all' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-burgundy" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('landing_page')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative",
              activeTab === 'landing_page' ? "text-burgundy" : "text-ink/50 hover:text-ink"
            )}
          >
            Landing Pages
            {activeTab === 'landing_page' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-burgundy" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('popup')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative",
              activeTab === 'popup' ? "text-burgundy" : "text-ink/50 hover:text-ink"
            )}
          >
            Pop-ups
            {activeTab === 'popup' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-burgundy" />
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-hairline">
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ink/50">Name</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ink/50">Type</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ink/50">Status</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ink/50 text-right">Views</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ink/50 text-right">Submissions</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ink/50 text-right">Conv. Rate</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ink/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredForms.map((form) => (
                <tr key={form.id} className="border-b border-border-hairline hover:bg-bg/50 transition-colors group">
                  <td className="py-4 px-4">
                    <div className="font-bold text-ink">{form.name}</div>
                    <div className="text-xs text-ink/50 mt-1">Created {new Date(form.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-sm text-ink/70">
                      {form.type === 'landing_page' ? <LayoutTemplate size={16} /> : <FileText size={16} />}
                      {form.type === 'landing_page' ? 'Landing Page' : 'Pop-up'}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider px-2 py-1",
                      form.status === 'active' ? "bg-green-100 text-green-800" :
                      form.status === 'draft' ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    )}>
                      {form.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-sm">{form.views.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-mono text-sm">{form.submissions.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-mono text-sm">{form.conversionRate}%</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {form.type === 'landing_page' && form.url && (
                        <button className="p-2 text-ink/50 hover:text-burgundy hover:bg-burgundy/5 transition-colors" title="Open Link">
                          <ExternalLink size={16} />
                        </button>
                      )}
                      {form.type === 'popup' && (
                        <button className="p-2 text-ink/50 hover:text-burgundy hover:bg-burgundy/5 transition-colors" title="Get Embed Code">
                          <Code size={16} />
                        </button>
                      )}
                      <button className="p-2 text-ink/50 hover:text-burgundy hover:bg-burgundy/5 transition-colors" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 text-ink/50 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredForms.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink/50">
                    No forms or pages found. Create your first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
