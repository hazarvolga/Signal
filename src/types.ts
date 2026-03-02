export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  address?: string;
  timezone: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'ANALYST' | 'VIEWER';
  roleId?: string;
  customRole?: Role;
  organizationId: string;
  organization?: Organization;
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
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  type: string;
  metadata: string; // JSON string
  campaignId?: string;
  contactId: string;
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
