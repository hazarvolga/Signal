import { User, Contact, Template, Campaign, DashboardStats, Segment, CustomFieldDefinition } from '../types';

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
};
