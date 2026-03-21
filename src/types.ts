export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  address?: string;
  timezone: string;
  createdAt: string;
  
  // SSO Config
  ssoEnabled: boolean;
  ssoDomain?: string;
  ssoClientId?: string;
  ssoIssuer?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'ANALYST' | 'VIEWER';
  status: 'PENDING' | 'ACTIVE';
  roleId?: string;
  customRole?: Role;
  organizationId: string;
  organization?: Organization;
  
  // SSO & MFA
  ssoId?: string;
  ssoProvider?: string;
  mfaEnabled: boolean;
  lastLoginAt?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string; // JSON string
  organizationId: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINED' | 'CLEANED';
  source?: string;
  engagementScore: number;
  customFields: string;
  emailConsent: boolean;
  smsConsent: boolean;
  whatsappConsent: boolean;
  preferenceToken?: string;
  organizationId: string;
  createdAt: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
}

export interface List {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
}

export interface Product {
  id: string;
  externalId?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  productUrl?: string;
  source: 'SHOPIFY' | 'WOOCOMMERCE' | 'CUSTOM';
  organizationId: string;
  createdAt: string;
}

export interface Revenue {
  id: string;
  amount: number;
  currency: string;
  campaignId?: string;
  flowId?: string;
  contactId: string;
  organizationId: string;
  timestamp: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  organizationId: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  type: 'SHOPIFY' | 'WOOCOMMERCE' | 'ZAPIER' | 'HUBSPOT';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  config: string; // JSON string
  organizationId: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string; // JSON string
  secret?: string;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  templateId?: string;
  campaignId?: string;
  requesterId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  template?: Template;
  campaign?: Campaign;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  category?: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
  organizationId: string;
  createdAt: string;
}

export interface Segment {
  id: string;
  name: string;
  rules: string; // JSON string
  organizationId: string;
  createdAt: string;
  contactCount: number;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  organizationId: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  previewText?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  content: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  subjectB?: string;
  contentB?: string;
  testPercentage?: number;
  testDuration?: number;
  winnerCriteria?: 'OPEN_RATE' | 'CLICK_RATE';
  type: 'REGULAR' | 'AB' | 'AUTOMATED' | 'TRANSACTIONAL';
  status: 'DRAFT' | 'IN_REVIEW' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'ARCHIVED';
  timezone: string;
  scheduledAt?: string;
  sentAt?: string;
  organizationId: string;
  templateId?: string;
  template?: Template;
  createdAt: string;
}

export interface Flow {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  nodes: string; // JSON string
  edges: string; // JSON string
  scheduledAt?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  type: string;
  name?: string;
  metadata: string; // JSON string
  campaignId?: string;
  contactId: string;
  timestamp: string;
}

export interface BehavioralEvent {
  id: string;
  name: string;
  properties: string; // JSON string
  contactId: string;
  organizationId: string;
  timestamp: string;
}

export interface ConsentLog {
  id: string;
  contactId: string;
  contact?: Contact;
  action: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'PREFERENCE_UPDATE' | 'DATA_EXPORT' | 'DATA_DELETE';
  source: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface DataRequest {
  id: string;
  contactId: string;
  contact?: Contact;
  type: 'EXPORT' | 'DELETE';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSubscribers: number;
  totalCampaigns: number;
  totalSent: number;
  totalOpens: number;
}

export interface CampaignAnalytics {
  campaign: Campaign;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    bounced: number;
    conversions: number;
  };
  timeSeries: {
    timestamp: string;
    opens: number;
    clicks: number;
  }[];
  deviceData: {
    name: string;
    value: number;
  }[];
}

export interface ValidationLog {
  id: string;
  email: string;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  score: number;
  confidence: number;
  details: string; // JSON string
  organizationId: string;
  createdAt: string;
}

export interface BulkValidationJob {
  id: string;
  name?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalCount: number;
  processedCount: number;
  validCount: number;
  invalidCount: number;
  riskyCount: number;
  error?: string;
  organizationId: string;
  results?: BulkValidationResult[];
  createdAt: string;
  updatedAt: string;
}

export interface BulkValidationResult {
  id: string;
  jobId: string;
  email: string;
  status: string;
  score: number;
  details: string;
  createdAt: string;
}
