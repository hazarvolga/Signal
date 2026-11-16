import {
  User,
  Contact,
  Template,
  Campaign,
  DashboardStats,
  Segment,
  CustomFieldDefinition,
  Flow,
  Event,
  Tag,
  ValidationLog,
  BulkValidationJob,
} from "../types";

let csrfTokenPromise: Promise<string> | null = null;

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) csrfTokenPromise = null;
  csrfTokenPromise ??= globalThis
    .fetch("/api/csrf-token", { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to initialize CSRF protection");
      const payload = (await response.json()) as { csrfToken?: string };
      if (!payload.csrfToken) throw new Error("CSRF token is missing");
      return payload.csrfToken;
    })
    .catch((error) => {
      csrfTokenPromise = null;
      throw error;
    });
  return csrfTokenPromise;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  const headers = new Headers(init.headers);

  if (isMutation) {
    headers.set("x-csrf-token", await getCsrfToken());
  }

  const requestInit: RequestInit = {
    ...init,
    credentials: "same-origin",
    headers,
  };
  let response = await globalThis.fetch(input, requestInit);

  if (isMutation && response.status === 403) {
    headers.set("x-csrf-token", await getCsrfToken(true));
    response = await globalThis.fetch(input, { ...requestInit, headers });
  }

  return response;
}

async function jsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof payload.error === "string"
        ? payload.error
        : fallbackMessage;
    throw new Error(message);
  }
  return payload as T;
}

export const api = {
  async generateImage(prompt: string, aspectRatio: string): Promise<string> {
    const res = await apiFetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio }),
    });
    const data = await res.json();
    if (!res.ok || !data.dataUrl) throw new Error(data.error || "Image generation failed");
    return data.dataUrl;
  },

  async getMe(): Promise<User> {
    const res = await apiFetch("/api/me");
    if (!res.ok) throw new Error(`Authentication failed with status ${res.status}`);
    const data = await res.json();
    if (data && data.id) return data;
    throw new Error("Invalid user payload");
  },

  async login(email: string, password: string): Promise<User> {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return jsonOrThrow<User>(res, "Login failed");
  },

  async getSummary(): Promise<DashboardStats> {
    try {
      const res = await apiFetch("/api/stats/summary");
      if (!res.ok) throw new Error("API not ok");
      const data = await res.json();
      if (data && data.totalSubscribers !== undefined) return data;
      throw new Error("Invalid stats payload");
    } catch (e) {
      return {
        totalSubscribers: 0,
        totalCampaigns: 0,
        totalOpens: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        revenueAttributed: 0,
        activeCampaigns: 0,
        totalSent: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
      };
    }
  },

  async getContacts(): Promise<Contact[]> {
    try {
      const contacts: Contact[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 40; page++) {
        const query = new URLSearchParams({ limit: "250" });
        if (cursor) query.set("cursor", cursor);
        const res = await apiFetch(`/api/contacts?${query.toString()}`);
        if (!res.ok) return contacts;
        const payload = (await res.json()) as {
          data?: Contact[];
          pagination?: { hasMore?: boolean; nextCursor?: string | null };
        };
        if (!Array.isArray(payload.data)) return contacts;
        contacts.push(...payload.data);
        cursor = payload.pagination?.nextCursor || null;
        if (!payload.pagination?.hasMore || !cursor) break;
      }
      return contacts;
    } catch {
      return [];
    }
  },

  async addContact(data: Omit<Partial<Contact>, "tags"> & { tags?: string }): Promise<Contact> {
    const res = await apiFetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async importContacts(contacts: any[]): Promise<{ imported: number; failed: number }> {
    const res = await apiFetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts }),
    });
    return res.json();
  },

  async getCampaigns(): Promise<Campaign[]> {
    try {
      const campaigns: Campaign[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 40; page++) {
        const query = new URLSearchParams({ limit: "250" });
        if (cursor) query.set("cursor", cursor);
        const res = await apiFetch(`/api/campaigns?${query.toString()}`);
        if (!res.ok) return campaigns;
        const payload = (await res.json()) as {
          data?: Campaign[];
          pagination?: { hasMore?: boolean; nextCursor?: string | null };
        };
        if (!Array.isArray(payload.data)) return campaigns;
        campaigns.push(...payload.data);
        cursor = payload.pagination?.nextCursor || null;
        if (!payload.pagination?.hasMore || !cursor) break;
      }
      return campaigns;
    } catch {
      return [];
    }
  },

  async addCampaign(
    data: Partial<Campaign> & { audienceContactIds?: string[] }
  ): Promise<Campaign> {
    const res = await apiFetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return jsonOrThrow<Campaign>(res, "Campaign creation failed");
  },

  async updateCampaignStatus(
    id: string,
    status: Extract<Campaign["status"], "DRAFT" | "PAUSED" | "ARCHIVED">
  ): Promise<Campaign> {
    const res = await apiFetch(`/api/campaigns/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return jsonOrThrow<Campaign>(res, "Campaign update failed");
  },

  async dispatchCampaign(id: string): Promise<{ success: boolean; dispatchId: string }> {
    const res = await apiFetch(`/api/email/campaigns/${id}/dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `manual-ui:${id}`,
      },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Campaign dispatch failed" }));
      throw new Error(error.error || "Campaign dispatch failed");
    }
    return res.json();
  },

  async deleteCampaign(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/campaigns/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  async getTemplates(): Promise<Template[]> {
    try {
      const res = await apiFetch("/api/templates");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async addTemplate(data: Partial<Template>): Promise<Template> {
    const res = await apiFetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/templates/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  async getCampaignAnalytics(id: string): Promise<any> {
    const res = await apiFetch(`/api/campaigns/${id}/analytics`);
    return res.json();
  },

  async getSegments(): Promise<Segment[]> {
    try {
      const res = await apiFetch("/api/segments");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async addSegment(data: Partial<Segment>): Promise<Segment> {
    const res = await apiFetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSegment(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/segments/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  async getSegmentContacts(id: string): Promise<Contact[]> {
    try {
      const res = await apiFetch(`/api/segments/${id}/contacts`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSegmentCount(id: string): Promise<{ count: number }> {
    const res = await apiFetch(`/api/segments/${id}/count`);
    return res.json();
  },

  async trackBehavioralEvent(data: {
    email: string;
    name: string;
    properties?: any;
  }): Promise<any> {
    const res = await apiFetch("/api/events/behavioral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getCustomFields(): Promise<CustomFieldDefinition[]> {
    try {
      const res = await apiFetch("/api/custom-fields");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async addCustomField(data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    const res = await apiFetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCustomField(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/custom-fields/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  async getPersonalizationPreview(
    content: string,
    contactId: string
  ): Promise<{ content: string }> {
    const res = await apiFetch("/api/personalize/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, contactId }),
    });
    return res.json();
  },

  async getFlows(): Promise<Flow[]> {
    try {
      const res = await apiFetch("/api/flows");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getFlow(id: string): Promise<Flow> {
    const res = await apiFetch(`/api/flows/${id}`);
    return jsonOrThrow<Flow>(res, "Workflow could not be loaded");
  },

  async addFlow(data: Partial<Flow>): Promise<Flow> {
    const res = await apiFetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return jsonOrThrow<Flow>(res, "Workflow creation failed");
  },

  async updateFlow(id: string, data: Partial<Flow>): Promise<Flow> {
    const res = await apiFetch(`/api/flows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return jsonOrThrow<Flow>(res, "Workflow update failed");
  },

  async deleteFlow(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/flows/${id}`, {
      method: "DELETE",
    });
    return jsonOrThrow<{ success: boolean }>(res, "Workflow deletion failed");
  },

  async getEvents(): Promise<Event[]> {
    try {
      const res = await apiFetch("/api/events");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async trackEvent(data: {
    type: string;
    metadata?: any;
    contactId: string;
    campaignId?: string;
  }): Promise<Event> {
    const res = await apiFetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return jsonOrThrow<Event>(res, "Event creation failed");
  },

  async getFlowAnalytics(id: string): Promise<any> {
    const res = await apiFetch(`/api/flows/${id}/analytics`);
    return res.json();
  },

  async getDeliverabilityAnalytics(): Promise<any> {
    const res = await apiFetch("/api/analytics/deliverability");
    return res.json();
  },

  // AI Assistant
  async generateSubjectLines(topic: string): Promise<string[]> {
    const res = await apiFetch("/api/ai/subject-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    return res.json();
  },
  async optimizePreview(subject: string, content: string): Promise<string> {
    const res = await apiFetch("/api/ai/optimize-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, content }),
    });
    const data = await res.json();
    return data.preview;
  },
  async checkSpam(subject: string, content: string): Promise<{ score: number; reasons: string[] }> {
    const res = await apiFetch("/api/ai/spam-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, content }),
    });
    return res.json();
  },
  async adjustTone(content: string, tone: string): Promise<string> {
    const res = await apiFetch("/api/ai/adjust-tone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, tone }),
    });
    const data = await res.json();
    return data.content;
  },
  async translate(content: string, language: string): Promise<string> {
    const res = await apiFetch("/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, language }),
    });
    const data = await res.json();
    return data.content;
  },
  async predictSendTime(
    topic: string,
    timezone: string
  ): Promise<{ hour: number; reason: string }> {
    const res = await apiFetch("/api/ai/predict-send-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, timezone }),
    });
    return res.json();
  },
  async generateFullContent(
    brief: string,
    tone: string
  ): Promise<{ subject: string; content: string }> {
    const res = await apiFetch("/api/ai/generate-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, tone }),
    });
    return res.json();
  },
  async predictChurn(
    contactId: string
  ): Promise<{ riskLevel: "LOW" | "MEDIUM" | "HIGH"; probability: number; reasons: string[] }> {
    const res = await apiFetch("/api/ai/predict-churn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    return res.json();
  },
  async getBulkChurnPrediction(): Promise<any> {
    const res = await apiFetch("/api/ai/churn-prediction", { method: "POST" });
    if (!res.ok) throw new Error("Bulk churn prediction failed");
    return res.json();
  },
  // A/B Testing
  async getABResults(id: string): Promise<any> {
    const res = await apiFetch(`/api/campaigns/${id}/ab-results`);
    return res.json();
  },
  async finalizeABTest(id: string): Promise<Campaign> {
    const res = await apiFetch(`/api/campaigns/${id}/pick-winner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return res.json();
  },
  // Commerce
  async getProducts(): Promise<any[]> {
    const res = await apiFetch("/api/products");
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async syncProducts(): Promise<any> {
    const res = await apiFetch("/api/products/sync", { method: "POST" });
    return res.json().catch(() => ({}));
  },
  async getRevenueSummary(): Promise<any> {
    const res = await apiFetch("/api/revenue/summary");
    const data = await res.json().catch(() => ({ totalRevenue: 0 }));
    return data && typeof data === "object" ? data : { totalRevenue: 0 };
  },

  async getRevenueAttribution(model: string): Promise<any[]> {
    const res = await apiFetch(`/api/analytics/revenue/attribution?model=${model}`);
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  async getCohortAnalytics(): Promise<any[]> {
    const res = await apiFetch("/api/analytics/cohorts");
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.cohorts) ? data.cohorts : [];
  },

  async getFunnelAnalytics(): Promise<any[]> {
    const res = await apiFetch("/api/analytics/funnel");
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.steps) ? data.steps : [];
  },

  // Collaboration
  async getTeam(): Promise<any[]> {
    const res = await apiFetch("/api/team");
    return res.json();
  },
  async inviteTeamMember(data: { email: string; name: string; role: string }): Promise<any> {
    const res = await apiFetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async activateUser(id: string, temporaryPassword: string): Promise<any> {
    const res = await apiFetch(`/api/team/${id}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ temporaryPassword }),
    });
    return res.json();
  },
  async updateTeamMember(id: string, data: { role?: string; name?: string }): Promise<any> {
    const res = await apiFetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteTeamMember(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/team/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
  async getRoles(): Promise<any[]> {
    const res = await apiFetch("/api/roles");
    return res.json();
  },
  async addRole(data: any): Promise<any> {
    const res = await apiFetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getBrands(): Promise<any[]> {
    const res = await apiFetch("/api/brands");
    return res.json();
  },

  // Integrations
  async getIntegrations(): Promise<any[]> {
    const res = await apiFetch("/api/integrations");
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async updateIntegration(id: string, data: { status?: string; config?: any }): Promise<any> {
    const res = await apiFetch(`/api/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json().catch(() => ({}));
  },
  async getIntegrationsStatus(): Promise<
    Record<string, { status: string; updatedAt?: string; configSummary?: any }>
  > {
    const res = await apiFetch("/api/integrations/status");
    return res.json().catch(() => ({}));
  },
  async getProviderIntegration(
    type: string
  ): Promise<{ id?: string; type: string; status: string; config: any }> {
    const res = await apiFetch(`/api/integrations/provider/${type}`);
    return res.json().catch(() => ({ type, status: "DISCONNECTED", config: {} }));
  },
  async saveProviderIntegration(
    type: string,
    data: { status?: string; config: any }
  ): Promise<any> {
    const res = await apiFetch(`/api/integrations/provider/${type}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async testProviderIntegration(
    type: string,
    config?: any
  ): Promise<{ success: boolean; message?: string; details?: any; error?: string }> {
    const res = await apiFetch(`/api/integrations/provider/${type}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    return res.json();
  },
  async syncProviderIntegration(
    type: string
  ): Promise<{ success: boolean; count?: number; syncedAt?: string; error?: string }> {
    const res = await apiFetch(`/api/integrations/provider/${type}/sync`, {
      method: "POST",
    });
    return res.json();
  },
  async disconnectProviderIntegration(type: string): Promise<{ success: boolean; status: string }> {
    const res = await apiFetch(`/api/integrations/provider/${type}/disconnect`, {
      method: "POST",
    });
    return res.json();
  },
  async getWebhooks(): Promise<any[]> {
    const res = await apiFetch("/api/webhooks");
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async addWebhook(data: { url: string; events: string[] }): Promise<any> {
    const res = await apiFetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/webhooks/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
  async simulateShopifyWebhook(type: "stock" | "order"): Promise<any> {
    const res = await apiFetch("/api/webhooks/shopify/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    return res.json();
  },

  async getWorkflowTemplates(): Promise<any[]> {
    try {
      const res = await apiFetch("/api/workflow-templates");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createFlowFromTemplate(templateId: string): Promise<Flow> {
    const res = await apiFetch("/api/flows/from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    return jsonOrThrow<Flow>(res, "Workflow template could not be created");
  },

  // Approvals
  async getApprovals(): Promise<any[]> {
    const res = await apiFetch("/api/approvals");
    return res.json();
  },

  async requestApproval(data: {
    templateId?: string;
    campaignId?: string;
    requesterId?: string;
  }): Promise<any> {
    const res = await apiFetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateApprovalStatus(
    id: string,
    status: "APPROVED" | "REJECTED",
    comments?: string
  ): Promise<any> {
    const res = await apiFetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comments }),
    });
    return res.json();
  },

  // Preference Center
  async getPublicPreferences(token: string): Promise<any> {
    const res = await apiFetch(`/api/preferences/${token}`);
    return res.json();
  },
  async updatePublicPreferences(token: string, data: any): Promise<any> {
    const res = await apiFetch(`/api/preferences/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getContactPreferences(id: string): Promise<any> {
    const res = await apiFetch(`/api/contacts/${id}/preferences`);
    return res.json();
  },
  async getContactNotifications(id: string): Promise<any[]> {
    const res = await apiFetch(`/api/contacts/${id}/notifications`);
    return res.json();
  },

  async updateContactPreferences(id: string, listIds: string[], extra?: any): Promise<any> {
    const res = await apiFetch(`/api/contacts/${id}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listIds, ...extra }),
    });
    return res.json();
  },

  // Compliance
  async getConsentLogs(): Promise<any[]> {
    try {
      const res = await apiFetch("/api/compliance/consent-logs");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async getDataRequests(): Promise<any[]> {
    try {
      const res = await apiFetch("/api/compliance/data-requests");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async getAuditLogs(): Promise<any[]> {
    try {
      const res = await apiFetch("/api/compliance/audit-logs");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async getApiKeys(): Promise<any[]> {
    try {
      const res = await apiFetch("/api/keys");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async createApiKey(data: { name: string; scopes?: string[] }): Promise<any> {
    const res = await apiFetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteApiKey(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/keys/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
  async addDataRequest(data: any): Promise<any> {
    const res = await apiFetch("/api/compliance/data-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async retryDataRequest(id: string): Promise<any> {
    const res = await apiFetch(`/api/compliance/data-requests/${id}/retry`, {
      method: "POST",
    });
    return res.json();
  },

  // SSO & MFA
  async getSSOUrl(): Promise<{ url: string; isMock: boolean }> {
    const res = await apiFetch("/api/auth/sso/url");
    return res.json();
  },

  async updateMFA(enabled: boolean): Promise<any> {
    const res = await apiFetch("/api/me/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },

  async getSSOConfig(): Promise<any> {
    const res = await apiFetch("/api/auth/sso/config");
    return res.json();
  },

  async updateSSOConfig(data: any): Promise<any> {
    const res = await apiFetch("/api/auth/sso/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async trackEngagement(data: {
    campaignId: string;
    contactId?: string;
    type: string;
    value: number;
    sectionId?: string;
    metadata?: any;
  }): Promise<any> {
    const res = await apiFetch("/api/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getEngagementAnalytics(campaignId: string): Promise<any> {
    const res = await apiFetch(`/api/campaigns/${campaignId}/engagement`);
    return res.json();
  },

  // Assets
  async getAssets(): Promise<any[]> {
    try {
      const assets: any[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 40; page++) {
        const query = new URLSearchParams({ limit: "250" });
        if (cursor) query.set("cursor", cursor);
        const res = await apiFetch(`/api/assets?${query.toString()}`);
        if (!res.ok) return assets;
        const payload = await res.json();
        if (!Array.isArray(payload.data)) return assets;
        assets.push(...payload.data);
        cursor = payload.pagination?.nextCursor || null;
        if (!payload.pagination?.hasMore || !cursor) break;
      }
      return assets;
    } catch {
      return [];
    }
  },

  async addAsset(data: { name: string; url: string; type: string; metadata?: any }): Promise<any> {
    const res = await apiFetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAsset(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/assets/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  // Email Validation
  async validateEmail(email: string): Promise<any> {
    const res = await apiFetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async validateBulk(file: File): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiFetch("/api/validate-bulk", {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  async getBulkJobStatus(id: string): Promise<BulkValidationJob> {
    const res = await apiFetch(`/api/validate-bulk/${id}`);
    return res.json();
  },

  async getValidationLogs(): Promise<ValidationLog[]> {
    try {
      const res = await apiFetch("/api/validation-logs");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    try {
      const res = await apiFetch("/api/tags");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  // Forms & Landing Pages
  async getForms(): Promise<any[]> {
    try {
      const res = await apiFetch("/api/forms");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async deleteForm(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/forms/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  // Growth Data
  async getGrowthData(signal?: AbortSignal): Promise<any> {
    const res = await apiFetch("/api/growth", { signal });
    if (!res.ok) throw new Error("Unable to load referral data.");
    return res.json();
  },
};
