// Collection Type System - Watch-focused

export type CollectionType = 'watches';

// Watch item interface
export interface Watch {
  id: string;
  brand: string;
  model: string;
  cost: number;
  msrp: number | null;
  average_resale_price: number | null;
  status: 'active' | 'sold' | 'traded';
  sort_order: number;
  collection_id: string | null;
  user_id: string | null;
  ai_image_url: string | null;
  available_for_trade: boolean;
  when_bought: string | null;
  why_bought: string | null;
  what_i_like: string | null;
  what_i_dont_like: string | null;
  created_at: string;
  updated_at: string;
  dial_color: string;
  type: string;
  case_size: string | null;
  lug_to_lug_size: string | null;
  movement: string | null;
  has_sapphire: boolean | null;
  caseback_material: string | null;
  warranty_date: string | null;
  warranty_card_url: string | null;
  sentiment: string | null;
  sentiment_analyzed_at: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'grail' | null;
  historical_significance: 'regular' | 'notable' | 'historically_significant' | null;
  metadata_analyzed_at: string | null;
  metadata_analysis_reasoning: string | null;
}

// Configuration for watch collections
export interface CollectionTypeConfig {
  type: CollectionType;
  label: string;
  singularLabel: string;
  pluralLabel: string;
  icon: string;
  description: string;
  primaryColorLabel: string;
  typeLabel: string;
  typeOptions: string[];
  defaultTypeOption: string;
  usageVerb: string;
  usageVerbPast: string;
  usageNoun: string;
  usageNounPlural: string;
  supportsWaterTracking: boolean;
  supportsMovement: boolean;
  supportsWarranty: boolean;
}

export const WATCH_CONFIG: CollectionTypeConfig = {
  type: 'watches',
  label: 'Watches',
  singularLabel: 'Watch',
  pluralLabel: 'Watches',
  icon: 'Watch',
  description: 'Track your watch collection with movement, case size, and water resistance details',
  primaryColorLabel: 'Dial Color',
  typeLabel: 'Type',
  typeOptions: ['Diver', 'Dress', 'Field', 'Pilot', 'Racing', 'Sport', 'Tool', 'Casual'],
  defaultTypeOption: 'Sport',
  usageVerb: 'wore',
  usageVerbPast: 'worn',
  usageNoun: 'wear',
  usageNounPlural: 'wears',
  supportsWaterTracking: true,
  supportsMovement: true,
  supportsWarranty: true,
};

export const COLLECTION_CONFIGS: Record<CollectionType, CollectionTypeConfig> = {
  watches: WATCH_CONFIG,
};

// Utility functions
export const getCollectionConfig = (_type?: CollectionType): CollectionTypeConfig => {
  return WATCH_CONFIG;
};

export const getItemLabel = (_type?: CollectionType, plural = false): string => {
  return plural ? WATCH_CONFIG.pluralLabel : WATCH_CONFIG.singularLabel;
};

export const getTypeOptions = (_type?: CollectionType): string[] => {
  return WATCH_CONFIG.typeOptions;
};

export const isWatchCollection = (_type?: CollectionType): boolean => true;
