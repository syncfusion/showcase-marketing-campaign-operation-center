// Domain types for the Marketing Campaign Operations Center.

export type Channel =
  | 'Paid Search'
  | 'Paid Social'
  | 'Email Marketing'
  | 'Influencer Partnerships'
  | 'Content & SEO'
  | 'Event & Webinar';

export const CHANNELS: Channel[] = [
  'Paid Search',
  'Paid Social',
  'Email Marketing',
  'Influencer Partnerships',
  'Content & SEO',
  'Event & Webinar'
];

export type CampaignStatus = 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Completed';
export const CAMPAIGN_STATUSES: CampaignStatus[] = ['Draft', 'Scheduled', 'Active', 'Paused', 'Completed'];

export type Objective =
  | 'Brand Awareness'
  | 'Lead Generation'
  | 'Customer Acquisition'
  | 'Retention & Loyalty'
  | 'Product Launch';

export type Audience = 'B2B Enterprise' | 'Mid-Market Tech' | 'Growth Startups' | 'Consumer Retail';

export interface Campaign {
  id: string;
  code: string;
  title: string;
  objective: Objective;
  targetAudience: Audience;
  channel: Channel;
  status: CampaignStatus;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  budget: number;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leadOwner: string;
}

export type Stage = 'Backlog' | 'In Production' | 'In Review' | 'Ready for Launch' | 'Completed';
export const STAGES: Stage[] = ['Backlog', 'In Production', 'In Review', 'Ready for Launch', 'Completed'];

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

export type AssetType = 'Ad Copy' | 'Video Creative' | 'Landing Page' | 'Email Template' | 'Webinar Deck';
export const ASSET_TYPES: AssetType[] = ['Ad Copy', 'Video Creative', 'Landing Page', 'Email Template', 'Webinar Deck'];

export interface Deliverable {
  id: string;
  campaignId: string;
  title: string;
  channel: Channel;
  stage: Stage;
  priority: Priority;
  dueDate: string;
  assignee: string;
  assetType: AssetType;
  notes: string;
}

export interface Dataset {
  campaigns: Campaign[];
  deliverables: Deliverable[];
  owners: string[];
  generatedAt: string; // ISO timestamp
}
