import { User, Contact, Template, Campaign, DashboardStats, Segment, CustomFieldDefinition, Flow, Event } from '../types';

export const api = {
  async getMe(): Promise<User> {
    const res = await fetch('/api/me');
    return res.json();
  },

  async getSummary(): Promise<DashboardStats> {
    const res = await fetch('/api/stats/summary');
    return res.json();
  },

  async getContacts(): Promise<Contact[]> {
    const res = await fetch('/api/contacts');
    return res.json();
  },

  async addContact(data: Omit<Partial<Contact>, 'tags'> & { tags?: string }): Promise<Contact> {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getCampaigns(): Promise<Campaign[]> {
    const res = await fetch('/api/campaigns');
    return res.json();
  },

  async addCampaign(data: Partial<Campaign>): Promise<Campaign> {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCampaignStatus(id: string, status: Campaign['status']): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  async getTemplates(): Promise<Template[]> {
    const res = await fetch('/api/templates');
    return res.json();
  },

  async addTemplate(data: Partial<Template>): Promise<Template> {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getCampaignAnalytics(id: string): Promise<any> {
    const res = await fetch(`/api/campaigns/${id}/analytics`);
    return res.json();
  },

  async getSegments(): Promise<Segment[]> {
    const res = await fetch('/api/segments');
    return res.json();
  },

  async addSegment(data: Partial<Segment>): Promise<Segment> {
    const res = await fetch('/api/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSegment(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/segments/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getCustomFields(): Promise<CustomFieldDefinition[]> {
    const res = await fetch('/api/custom-fields');
    return res.json();
  },

  async addCustomField(data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    const res = await fetch('/api/custom-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCustomField(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/custom-fields/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getPersonalizationPreview(content: string, contactId: string): Promise<{ content: string }> {
    const res = await fetch('/api/personalize/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, contactId }),
    });
    return res.json();
  },
  
  async getFlows(): Promise<Flow[]> {
    const res = await fetch('/api/flows');
    return res.json();
  },

  async getFlow(id: string): Promise<Flow> {
    const res = await fetch(`/api/flows/${id}`);
    return res.json();
  },

  async addFlow(data: Partial<Flow>): Promise<Flow> {
    const res = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateFlow(id: string, data: Partial<Flow>): Promise<Flow> {
    const res = await fetch(`/api/flows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteFlow(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/flows/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getEvents(): Promise<Event[]> {
    const res = await fetch('/api/events');
    return res.json();
  },

  async trackEvent(data: { type: string, metadata?: any, contactId: string, campaignId?: string }): Promise<Event> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getDeliverabilityAnalytics(): Promise<any> {
    const res = await fetch('/api/analytics/deliverability');
    return res.json();
  },

  async getFunnelAnalytics(): Promise<any> {
    const res = await fetch('/api/analytics/funnel');
    return res.json();
  },

  async getCohortAnalytics(): Promise<any> {
    const res = await fetch('/api/analytics/cohorts');
    return res.json();
  },
  // AI Assistant
  async generateSubjectLines(topic: string): Promise<string[]> {
    const res = await fetch('/api/ai/subject-lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    return res.json();
  },
  async optimizePreview(subject: string, content: string): Promise<string> {
    const res = await fetch('/api/ai/optimize-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, content })
    });
    const data = await res.json();
    return data.preview;
  },
  async checkSpam(subject: string, content: string): Promise<{ score: number, reasons: string[] }> {
    const res = await fetch('/api/ai/spam-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, content })
    });
    return res.json();
  },
  async adjustTone(content: string, tone: string): Promise<string> {
    const res = await fetch('/api/ai/adjust-tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tone })
    });
    const data = await res.json();
    return data.content;
  },
  async translate(content: string, language: string): Promise<string> {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, language })
    });
    const data = await res.json();
    return data.content;
  },
  async predictSendTime(topic: string): Promise<{ hour: number, reason: string }> {
    const res = await fetch('/api/ai/predict-send-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    return res.json();
  },
  // A/B Testing
  async getABResults(id: string): Promise<any> {
    const res = await fetch(`/api/campaigns/${id}/ab-results`);
    return res.json();
  },
  async pickWinner(id: string, winnerVariation: 'A' | 'B'): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}/pick-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerVariation })
    });
    return res.json();
  },
  // Commerce
  async getProducts(): Promise<any[]> {
    const res = await fetch('/api/products');
    return res.json();
  },
  async syncProducts(): Promise<any> {
    const res = await fetch('/api/products/sync', { method: 'POST' });
    return res.json();
  },
  async getRevenueSummary(): Promise<any> {
    const res = await fetch('/api/revenue/summary');
    return res.json();
  },

  // Collaboration
  async getTeam(): Promise<any[]> {
    const res = await fetch('/api/team');
    return res.json();
  },
  async inviteTeamMember(data: any): Promise<any> {
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getBrands(): Promise<any[]> {
    const res = await fetch('/api/brands');
    return res.json();
  },

  // Integrations
  async getIntegrations(): Promise<any[]> {
    const res = await fetch('/api/integrations');
    return res.json();
  },
  async getWebhooks(): Promise<any[]> {
    const res = await fetch('/api/webhooks');
    return res.json();
  },

  async getWorkflowTemplates(): Promise<any[]> {
    const res = await fetch('/api/workflow-templates');
    return res.json();
  },

  async createFlowFromTemplate(templateId: string): Promise<Flow> {
    const res = await fetch('/api/flows/from-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    });
    return res.json();
  },

  // Approvals
  async getApprovals(): Promise<any[]> {
    const res = await fetch('/api/approvals');
    return res.json();
  },

  async requestApproval(data: { templateId?: string, campaignId?: string, requesterId?: string }): Promise<any> {
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateApprovalStatus(id: string, status: 'APPROVED' | 'REJECTED', comments?: string): Promise<any> {
    const res = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comments }),
    });
    return res.json();
  },

  // Preference Center
  async getContactPreferences(id: string): Promise<any> {
    const res = await fetch(`/api/contacts/${id}/preferences`);
    return res.json();
  },

  async updateContactPreferences(id: string, listIds: string[]): Promise<any> {
    const res = await fetch(`/api/contacts/${id}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listIds }),
    });
    return res.json();
  },
};
