/**
 * SafeSphere Development Mock Data Layer
 * 
 * IMPORTANT: This file contains strictly development/demo data for UI demonstration 
 * in Step 3. It is decoupled from production database logic. Real-time GPS, AI scoring,
 * and live notification streams will connect to backend APIs in subsequent steps.
 */

export interface MockSafetyInsight {
  id: string;
  type: 'lighting' | 'road' | 'patrol' | 'helppoint';
  title: string;
  description: string;
  location: string;
  timeAgo: string;
  severity: 'low' | 'medium' | 'high' | 'info';
}

export interface MockRecentActivityItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: 'report' | 'journey' | 'feedback' | 'guardian' | 'sos';
  status: 'verified' | 'completed' | 'submitted' | 'active';
}

export interface MockTrustedContactItem {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  avatarInitials: string;
  status: 'active' | 'pending';
}

export interface MockNotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
  type: 'guardian' | 'report' | 'journey' | 'alert' | 'system';
}

export interface MockJourneyData {
  id: string;
  origin: string;
  destination: string;
  status: 'Active' | 'Completed' | 'Idle';
  estimatedRoute: string;
  locationSharing: 'Active' | 'Paused' | 'Off';
  etaMinutes: number;
  safetyScoreEstimate: number;
}

export const mockSafetyInsights: MockSafetyInsight[] = [
  {
    id: 'ins-1',
    type: 'lighting',
    title: 'Poor lighting reported nearby',
    description: '3 street lamps reported dark along Elmwood Avenue walkway.',
    location: 'Elmwood Ave (0.4 km away)',
    timeAgo: '12m ago',
    severity: 'medium',
  },
  {
    id: 'ins-2',
    type: 'road',
    title: 'Road issue / construction',
    description: 'Pedestrian detour active near Metro North station entrance.',
    location: 'Metro Station West (0.8 km away)',
    timeAgo: '35m ago',
    severity: 'low',
  },
  {
    id: 'ins-3',
    type: 'patrol',
    title: 'Community safety patrol active',
    description: 'Campus and community vigilance team operating along 4th Street.',
    location: 'University District (0.2 km away)',
    timeAgo: '1h ago',
    severity: 'info',
  },
  {
    id: 'ins-4',
    type: 'helppoint',
    title: '24/7 Verified Help Haven',
    description: 'St. Jude General Hospital triage desk open 24/7 with emergency beacon.',
    location: 'Civic Center (1.1 km away)',
    timeAgo: 'Always open',
    severity: 'info',
  },
];

export const mockRecentActivity: MockRecentActivityItem[] = [
  {
    id: 'act-1',
    title: 'Safety report submitted',
    description: 'Streetlight outage report logged for municipal verification.',
    timeAgo: '2 hours ago',
    type: 'report',
    status: 'submitted',
  },
  {
    id: 'act-2',
    title: 'Journey completed safely',
    description: 'Monitored trip from Tech Campus to Oakwood Residences finished.',
    timeAgo: 'Yesterday at 9:45 PM',
    type: 'journey',
    status: 'completed',
  },
  {
    id: 'act-3',
    title: 'Safety feedback submitted',
    description: 'Rated evening route comfort: 5/5 stars.',
    timeAgo: '2 days ago',
    type: 'feedback',
    status: 'submitted',
  },
  {
    id: 'act-4',
    title: 'Guardian connected',
    description: 'Primary guardian contact registered for account protection.',
    timeAgo: '3 days ago',
    type: 'guardian',
    status: 'active',
  },
];

export const mockTrustedContacts: MockTrustedContactItem[] = [
  {
    id: 'tc-1',
    name: 'Sarah Connor',
    relationship: 'Mother',
    phone: '+1 (555) 019-4829',
    avatarInitials: 'SC',
    status: 'active',
  },
  {
    id: 'tc-2',
    name: 'Alex Chen',
    relationship: 'Colleague',
    phone: '+1 (555) 438-9201',
    avatarInitials: 'AC',
    status: 'active',
  },
  {
    id: 'tc-3',
    name: 'Campus Security Desk',
    relationship: 'Organization Help',
    phone: '+1 (555) 911-0022',
    avatarInitials: 'CS',
    status: 'active',
  },
];

export const mockNotifications: MockNotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Guardian Connected',
    message: 'Your primary guardian was verified and is now connected to your safety account.',
    timeAgo: '10m ago',
    read: false,
    type: 'guardian',
  },
  {
    id: 'notif-2',
    title: 'Safety Report Verified',
    message: 'Your lighting report on 5th Street was confirmed by 2 community members.',
    timeAgo: '1h ago',
    read: false,
    type: 'report',
  },
  {
    id: 'notif-3',
    title: 'Journey Completed',
    message: 'Your monitored journey to Oakwood finished with zero safety alerts.',
    timeAgo: 'Yesterday',
    read: true,
    type: 'journey',
  },
  {
    id: 'notif-4',
    title: 'SafeSphere Advisory',
    message: 'Increased community watch active in University Sector tonight.',
    timeAgo: '2 days ago',
    read: true,
    type: 'alert',
  },
];

export const mockActiveJourney: MockJourneyData = {
  id: 'jrn-sample-101',
  origin: 'North Campus Library',
  destination: 'Riverdale Dormitory',
  status: 'Active',
  estimatedRoute: 'Lower estimated-risk route (via illuminated arterial)',
  locationSharing: 'Active',
  etaMinutes: 14,
  safetyScoreEstimate: 92,
};
