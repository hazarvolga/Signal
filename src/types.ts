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
  organizationId: string;
  organization?: Organization;
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

export interface Template {
  id: string;
  name: string;
  content: string;
  category?: string;
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
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'ARCHIVED';
  timezone: string;
  scheduledAt?: string;
  sentAt?: string;
  organizationId: string;
  templateId?: string;
  template?: Template;
  createdAt: string;
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
