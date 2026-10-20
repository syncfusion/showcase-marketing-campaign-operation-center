// Synthetic fixture data. Demo-today: 2026-10-15. Campaigns span Q3 2025 - Q4 2026.
import type { Campaign, Dataset, Deliverable, Channel } from '../types/domain';

const owners = [
  'Aria Chen', 'Marcus Wright', 'Priya Patel', 'Diane Olsen',
  'Felix Romero', 'Junko Tanaka', 'Kwame Asante', 'Lara Vazquez'
];

const c = (
  id: string, code: string, title: string,
  objective: Campaign['objective'], targetAudience: Campaign['targetAudience'],
  channel: Channel, status: Campaign['status'],
  startDate: string, endDate: string,
  budget: number, spend: number, revenue: number,
  impressions: number, clicks: number, conversions: number,
  leadOwner: string
): Campaign => ({ id, code, title, objective, targetAudience, channel, status, startDate, endDate, budget, spend, revenue, impressions, clicks, conversions, leadOwner });

const campaigns: Campaign[] = [
  c('cmp-2026-q4-holiday', 'MKT-26-014', 'Holiday 2026 Brand Lift', 'Brand Awareness', 'Consumer Retail', 'Paid Social', 'Active',
    '2026-10-01', '2026-12-15', 480_000, 268_300, 612_400,
    14_200_000, 312_400, 21_400, owners[0]),
  c('cmp-2026-q4-b2b-search', 'MKT-26-015', 'Q4 Enterprise Search', 'Lead Generation', 'B2B Enterprise', 'Paid Search', 'Active',
    '2026-10-01', '2026-12-31', 320_000, 195_500, 580_000,
    5_200_000, 188_300, 6_400, owners[1]),
  c('cmp-2026-q4-influencer', 'MKT-26-016', 'Creator Wave — Lifestyle', 'Brand Awareness', 'Consumer Retail', 'Influencer Partnerships', 'Active',
    '2026-09-15', '2026-11-30', 220_000, 165_000, 248_500,
    8_400_000, 142_200, 7_900, owners[2]),
  c('cmp-2026-q4-launch', 'MKT-26-017', 'Atlas Cloud Launch', 'Product Launch', 'Mid-Market Tech', 'Content & SEO', 'Active',
    '2026-10-10', '2026-12-20', 180_000, 78_000, 410_000,
    2_300_000, 96_500, 4_200, owners[3]),
  c('cmp-2026-q4-event', 'MKT-26-018', 'Summit North America', 'Lead Generation', 'B2B Enterprise', 'Event & Webinar', 'Scheduled',
    '2026-11-08', '2026-11-12', 350_000, 24_000, 0,
    0, 0, 0, owners[4]),
  c('cmp-2026-q4-nurture', 'MKT-26-019', 'Q4 Lifecycle Nurture', 'Retention & Loyalty', 'Mid-Market Tech', 'Email Marketing', 'Active',
    '2026-10-01', '2026-12-31', 90_000, 56_000, 248_000,
    1_900_000, 168_000, 5_400, owners[5]),
  c('cmp-2026-q3-promo', 'MKT-26-012', 'Late Summer Promo', 'Customer Acquisition', 'Consumer Retail', 'Paid Social', 'Completed',
    '2026-08-01', '2026-09-30', 260_000, 248_900, 412_000,
    11_800_000, 268_000, 18_900, owners[6]),
  c('cmp-2026-q3-event', 'MKT-26-013', 'Roadshow — NYC', 'Lead Generation', 'B2B Enterprise', 'Event & Webinar', 'Completed',
    '2026-09-12', '2026-09-22', 150_000, 138_500, 184_000,
    0, 12_500, 2_100, owners[7]),
  c('cmp-2026-q3-content', 'MKT-26-011', 'Q3 Thought Leadership', 'Brand Awareness', 'Mid-Market Tech', 'Content & SEO', 'Completed',
    '2026-07-01', '2026-09-30', 110_000, 102_400, 188_500,
    2_100_000, 84_000, 2_800, owners[0]),
  c('cmp-2027-q1-pipeline', 'MKT-26-020', 'Q1 Pipeline Acceleration', 'Lead Generation', 'B2B Enterprise', 'Paid Search', 'Draft',
    '2027-01-08', '2027-03-31', 420_000, 0, 0,
    0, 0, 0, owners[1]),
  c('cmp-2027-q1-launch', 'MKT-26-021', 'Spring Product Launch', 'Product Launch', 'Consumer Retail', 'Paid Social', 'Draft',
    '2027-03-01', '2027-05-30', 380_000, 0, 0,
    0, 0, 0, owners[2]),
  c('cmp-2026-q4-rebrand', 'MKT-26-022', 'Brand Refresh', 'Brand Awareness', 'Consumer Retail', 'Influencer Partnerships', 'Paused',
    '2026-10-05', '2026-12-10', 160_000, 28_000, 12_500,
    1_400_000, 28_400, 920, owners[3])
];

// Deliverables
const d = (
  id: string, campaignId: string, title: string, channel: Channel,
  stage: Deliverable['stage'], priority: Deliverable['priority'],
  dueDate: string, assignee: string, assetType: Deliverable['assetType'], notes: string
): Deliverable => ({ id, campaignId, title, channel, stage, priority, dueDate, assignee, assetType, notes });

const deliverables: Deliverable[] = [
  d('del-101', 'cmp-2026-q4-holiday', 'Holiday Carousel — Hero Stories', 'Paid Social', 'In Production', 'High', '2026-10-25', 'Aria Chen', 'Video Creative', 'Animated carousel for IG/FB; 6 stories.'),
  d('del-102', 'cmp-2026-q4-holiday', 'Holiday Carousel — Gift Finder', 'Paid Social', 'In Review', 'Medium', '2026-10-28', 'Marcus Wright', 'Ad Copy', 'Carousel copy variants A/B.'),
  d('del-103', 'cmp-2026-q4-holiday', 'Holiday Landing Page', 'Paid Social', 'Ready for Launch', 'Urgent', '2026-10-30', 'Priya Patel', 'Landing Page', 'PDP hero, social proof, CTAs.'),
  d('del-104', 'cmp-2026-q4-b2b-search', 'Q4 Search Ads — Decision Maker', 'Paid Search', 'In Production', 'High', '2026-10-22', 'Diane Olsen', 'Ad Copy', 'Long-tail keywords for VP+ titles.'),
  d('del-105', 'cmp-2026-q4-b2b-search', 'Q4 Search Ads — Pain Point', 'Paid Search', 'Backlog', 'Medium', '2026-11-05', 'Diane Olsen', 'Ad Copy', 'Pain-point keyword clusters.'),
  d('del-106', 'cmp-2026-q4-influencer', 'Creator Wave Brief', 'Influencer Partnerships', 'Completed', 'High', '2026-09-30', 'Felix Romero', 'Ad Copy', 'Brief approved by legal.'),
  d('del-107', 'cmp-2026-q4-influencer', 'Influencer Onboarding', 'Influencer Partnerships', 'In Production', 'Urgent', '2026-10-20', 'Junko Tanaka', 'Email Template', 'Onboarding kit and contract flow.'),
  d('del-108', 'cmp-2026-q4-launch', 'Atlas Cloud Launch Email', 'Email Marketing', 'In Review', 'High', '2026-10-22', 'Kwame Asante', 'Email Template', 'Pre-launch teaser sequence.'),
  d('del-109', 'cmp-2026-q4-launch', 'Atlas Cloud Comparison Page', 'Content & SEO', 'In Production', 'High', '2026-11-01', 'Lara Vazquez', 'Landing Page', 'SEO-optimized comparison page.'),
  d('del-110', 'cmp-2026-q4-event', 'Summit Keynote Deck', 'Event & Webinar', 'Backlog', 'Urgent', '2026-10-30', 'Aria Chen', 'Webinar Deck', '40-min keynote, 12 slides.'),
  d('del-111', 'cmp-2026-q4-event', 'Summit Email Cadence', 'Event & Webinar', 'In Production', 'High', '2026-10-26', 'Marcus Wright', 'Email Template', 'Save-the-date, invite, reminder.'),
  d('del-112', 'cmp-2026-q4-nurture', 'Q4 Nurture — Lead Scoring Flow', 'Email Marketing', 'In Review', 'Medium', '2026-10-29', 'Priya Patel', 'Email Template', '4-email sequence tied to lead score.'),
  d('del-113', 'cmp-2026-q4-rebrand', 'Brand Refresh Microsite', 'Influencer Partnerships', 'Backlog', 'Low', '2026-11-15', 'Diane Olsen', 'Landing Page', 'Concept stage, paused pending budget review.'),
  d('del-114', 'cmp-2026-q4-launch', 'Atlas Cloud Demo Video', 'Content & SEO', 'Backlog', 'Medium', '2026-11-20', 'Felix Romero', 'Video Creative', '90-second product demo for launch.')
];

export const seedDataset: Dataset = {
  campaigns,
  deliverables,
  owners,
  generatedAt: '2026-10-15T08:00:00Z'
};
