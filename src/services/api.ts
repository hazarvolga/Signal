import { User, Contact, Template, Campaign, DashboardStats, Segment, CustomFieldDefinition, Flow, Event, ValidationLog, BulkValidationJob } from '../types';

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

  async deleteCampaign(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'DELETE',
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

  async getSegmentContacts(id: string): Promise<Contact[]> {
    const res = await fetch(`/api/segments/${id}/contacts`);
    return res.json();
  },

  async getSegmentCount(id: string): Promise<{ count: number }> {
    const res = await fetch(`/api/segments/${id}/count`);
    return res.json();
  },

  async trackBehavioralEvent(data: { email: string, name: string, properties?: any }): Promise<any> {
    const res = await fetch('/api/events/behavioral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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

  async getFlowAnalytics(id: string): Promise<any> {
    const res = await fetch(`/api/flows/${id}/analytics`);
    return res.json();
  },

  async getDeliverabilityAnalytics(): Promise<any> {
    const res = await fetch('/api/analytics/deliverability');
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
  async generateFullContent(brief: string, tone: string): Promise<{ subject: string, content: string }> {
    const res = await fetch('/api/ai/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, tone })
    });
    return res.json();
  },
  async predictChurn(contactId: string): Promise<{ riskLevel: 'LOW' | 'MEDIUM' | 'HIGH', probability: number, reasons: string[] }> {
    const res = await fetch('/api/ai/predict-churn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId })
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
  async simulateAB(id: string): Promise<any> {
    const res = await fetch(`/api/campaigns/${id}/ab-simulate`, { method: 'POST' });
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

  async getRevenueAttribution(model: string): Promise<any[]> {
    const res = await fetch(`/api/analytics/revenue/attribution?model=${model}`);
    return res.json();
  },

  async getCohortAnalytics(): Promise<any[]> {
    const res = await fetch('/api/analytics/cohorts');
    const data = await res.json();
    return data.cohorts;
  },

  async getFunnelAnalytics(): Promise<any[]> {
    const res = await fetch('/api/analytics/funnel');
    const data = await res.json();
    return data.steps;
  },

  // Collaboration
  async getTeam(): Promise<any[]> {
    const res = await fetch('/api/team');
    return res.json();
  },
  async inviteTeamMember(data: { email: string, name: string, role: string }): Promise<any> {
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async activateUser(id: string): Promise<any> {
    const res = await fetch(`/api/team/${id}/activate`, { method: 'POST' });
    return res.json();
  },
  async updateTeamMember(id: string, data: { role?: string, name?: string }): Promise<any> {
    const res = await fetch(`/api/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteTeamMember(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/team/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  async getRoles(): Promise<any[]> {
    const res = await fetch('/api/roles');
    return res.json();
  },
  async addRole(data: any): Promise<any> {
    const res = await fetch('/api/roles', {
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
  async updateIntegration(id: string, data: { status?: string, config?: any }): Promise<any> {
    const res = await fetch(`/api/integrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getWebhooks(): Promise<any[]> {
    const res = await fetch('/api/webhooks');
    return res.json();
  },
  async addWebhook(data: { url: string, events: string[] }): Promise<any> {
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/webhooks/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  async simulateShopifyWebhook(type: 'stock' | 'order'): Promise<any> {
    const res = await fetch('/api/webhooks/shopify/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
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
  async getPublicPreferences(token: string): Promise<any> {
    const res = await fetch(`/api/preferences/${token}`);
    return res.json();
  },
  async updatePublicPreferences(token: string, data: any): Promise<any> {
    const res = await fetch(`/api/preferences/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getContactPreferences(id: string): Promise<any> {
    const res = await fetch(`/api/contacts/${id}/preferences`);
    return res.json();
  },
  async getContactNotifications(id: string): Promise<any[]> {
    const res = await fetch(`/api/contacts/${id}/notifications`);
    return res.json();
  },

  async updateContactPreferences(id: string, listIds: string[], extra?: any): Promise<any> {
    const res = await fetch(`/api/contacts/${id}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listIds, ...extra }),
    });
    return res.json();
  },

  // Compliance
  async getConsentLogs(): Promise<any[]> {
    const res = await fetch('/api/compliance/consent-logs');
    return res.json();
  },
  async getDataRequests(): Promise<any[]> {
    const res = await fetch('/api/compliance/data-requests');
    return res.json();
  },
  async getAuditLogs(): Promise<any[]> {
    const res = await fetch('/api/compliance/audit-logs');
    return res.json();
  },
  async getApiKeys(): Promise<any[]> {
    const res = await fetch('/api/keys');
    return res.json();
  },
  async createApiKey(data: { name: string, scopes?: string[] }): Promise<any> {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteApiKey(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/keys/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  async addDataRequest(data: any): Promise<any> {
    const res = await fetch('/api/compliance/data-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateDataRequestStatus(id: string, status: string): Promise<any> {
    const res = await fetch(`/api/compliance/data-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // SSO & MFA
  async getSSOUrl(): Promise<{ url: string, isMock: boolean }> {
    const res = await fetch('/api/auth/sso/url');
    return res.json();
  },

  async updateMFA(enabled: boolean): Promise<any> {
    const res = await fetch('/api/me/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },
  
  async getSSOConfig(): Promise<any> {
    const res = await fetch('/api/auth/sso/config');
    return res.json();
  },

  async updateSSOConfig(data: any): Promise<any> {
    const res = await fetch('/api/auth/sso/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async trackEngagement(data: { campaignId: string, contactId?: string, type: string, value: number, sectionId?: string, metadata?: any }): Promise<any> {
    const res = await fetch('/api/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getEngagementAnalytics(campaignId: string): Promise<any> {
    const res = await fetch(`/api/campaigns/${campaignId}/engagement`);
    return res.json();
  },

  // Assets
  async getAssets(): Promise<any[]> {
    const res = await fetch('/api/assets');
    return res.json();
  },

  async addAsset(data: { name: string, url: string, type: string, metadata?: any }): Promise<any> {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAsset(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Email Validation
  async validateEmail(email: string): Promise<any> {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async validateBulk(file: File): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/validate-bulk', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async getBulkJobStatus(id: string): Promise<BulkValidationJob> {
    const res = await fetch(`/api/validate-bulk/${id}`);
    return res.json();
  },

  async getValidationLogs(): Promise<ValidationLog[]> {
    const res = await fetch('/api/validation-logs');
    return res.json();
  },
};
