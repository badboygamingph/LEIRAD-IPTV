export interface PlaylistSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  channelCount: number;
  content?: string; // Optional raw string for file uploads
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  quality: string;
  tvgId: string;
  isHttps: boolean;
  sourceId?: string;
  sourceName?: string;
}

export type ViewMode = 'grid' | 'table';

export type TabType = 'all' | 'favorites' | 'history' | 'categories' | 'countries';

export interface FilterOptions {
  search: string;
  category: string;
  country: string;
  quality: string;
  httpsOnly: boolean;
  sortBy: 'name-asc' | 'name-desc' | 'category' | 'country';
  sourceId?: string;
}

export interface PlaylistStats {
  totalChannels: number;
  httpsChannels: number;
  categoriesCount: number;
  countriesCount: number;
  url: string;
  lastUpdated: number;
}
