export interface NodeInfo {
  id: string;
  name: string;
  region: 'NR' | 'WR' | 'SR' | 'ER' | 'NER' | 'ALL';
  level: 'national' | 'region' | 'bottom';
  description: string;
  type: 'state' | 'region' | 'national' | 'bulk_consumer' | 'residual';
}

export const NODE_DESCRIPTIONS: Record<string, NodeInfo> = {
  'India': {
    id: 'India',
    name: 'India (National Total)',
    region: 'ALL',
    level: 'national',
    description: 'National electricity demand across all five regional power grids in the Synchronous National Grid.',
    type: 'national',
  },
  'India/NR': {
    id: 'India/NR',
    name: 'Northern Region (NR)',
    region: 'NR',
    level: 'region',
    description: 'Northern power grid covering 9 northern states and Union Territories, plus railway and bulk consumers.',
    type: 'region',
  },
  'India/WR': {
    id: 'India/WR',
    name: 'Western Region (WR)',
    region: 'WR',
    level: 'region',
    description: 'Western power grid covering major industrial hubs: Maharashtra, Gujarat, Madhya Pradesh, Chhattisgarh, and heavy bulk consumers.',
    type: 'region',
  },
  'India/SR': {
    id: 'India/SR',
    name: 'Southern Region (SR)',
    region: 'SR',
    level: 'region',
    description: 'Southern power grid covering Tamil Nadu, Karnataka, Telangana, Andhra Pradesh, Kerala, and Puducherry.',
    type: 'region',
  },
  'India/ER': {
    id: 'India/ER',
    name: 'Eastern Region (ER)',
    region: 'ER',
    level: 'region',
    description: 'Eastern power grid covering West Bengal, Bihar, Odisha, Jharkhand, Sikkim, and the Damodar Valley Corporation.',
    type: 'region',
  },
  'India/NER': {
    id: 'India/NER',
    name: 'North Eastern Region (NER)',
    region: 'NER',
    level: 'region',
    description: 'North Eastern power grid covering the seven north-eastern states: Assam, Meghalaya, Tripura, Manipur, Nagaland, Mizoram, Arunachal Pradesh.',
    type: 'region',
  },
  // Key Western Region Nodes
  'India/WR/Maharashtra': {
    id: 'India/WR/Maharashtra',
    name: 'Maharashtra',
    region: 'WR',
    level: 'bottom',
    description: "India's highest electricity-consuming state, driven by industrial manufacturing and urban load in Mumbai and Pune.",
    type: 'state',
  },
  'India/WR/Gujarat': {
    id: 'India/WR/Gujarat',
    name: 'Gujarat',
    region: 'WR',
    level: 'bottom',
    description: 'Major industrial powerhouse with heavy continuous loads from petrochemicals, textiles, and ceramics.',
    type: 'state',
  },
  'India/WR/MP': {
    id: 'India/WR/MP',
    name: 'Madhya Pradesh',
    region: 'WR',
    level: 'bottom',
    description: 'Central agricultural and industrial state with high seasonal sensitivity to irrigation pumping cycles.',
    type: 'state',
  },
  'India/WR/Chhattisgarh': {
    id: 'India/WR/Chhattisgarh',
    name: 'Chhattisgarh',
    region: 'WR',
    level: 'bottom',
    description: 'Power-surplus state rich in coal reserves and heavy metal refining industries.',
    type: 'state',
  },
  'India/WR/RIL JAMNAGAR': {
    id: 'India/WR/RIL JAMNAGAR',
    name: 'Reliance Jamnagar Complex',
    region: 'WR',
    level: 'bottom',
    description: "The world's largest petroleum refinery complex, receiving dedicated bulk-power feed.",
    type: 'bulk_consumer',
  },
  'India/WR/Other_WR': {
    id: 'India/WR/Other_WR',
    name: 'Other (Western Region)',
    region: 'WR',
    level: 'bottom',
    description: 'Synthetic residual node capturing untracked municipal utilities and line variations to guarantee exact additivity.',
    type: 'residual',
  },

  // Key Northern Region Nodes
  'India/NR/UP': {
    id: 'India/NR/UP',
    name: 'Uttar Pradesh',
    region: 'NR',
    level: 'bottom',
    description: "India's most populous state with massive summer air conditioning swings and agricultural irrigation demand.",
    type: 'state',
  },
  'India/NR/Rajasthan': {
    id: 'India/NR/Rajasthan',
    name: 'Rajasthan',
    region: 'NR',
    level: 'bottom',
    description: 'Arid western territory featuring severe summer heatwave spikes and massive solar park installations.',
    type: 'state',
  },
  'India/NR/Punjab': {
    id: 'India/NR/Punjab',
    name: 'Punjab',
    region: 'NR',
    level: 'bottom',
    description: 'Major agricultural hub where electricity demand surges during the monsoon paddy transplantation season (June-August).',
    type: 'state',
  },
  'India/NR/Delhi': {
    id: 'India/NR/Delhi',
    name: 'Delhi (NCT)',
    region: 'NR',
    level: 'bottom',
    description: 'National capital territory with extreme weather sensitivity, swinging between hot summer cooling and cold winter heating.',
    type: 'state',
  },
  'India/NR/Other_NR': {
    id: 'India/NR/Other_NR',
    name: 'Other (Northern Region)',
    region: 'NR',
    level: 'bottom',
    description: 'Synthetic residual node capturing northern transmission balancing entries.',
    type: 'residual',
  },

  // Key Southern Region Nodes
  'India/SR/Tamil Nadu': {
    id: 'India/SR/Tamil Nadu',
    name: 'Tamil Nadu',
    region: 'SR',
    level: 'bottom',
    description: 'Heavy industrial and automotive manufacturing hub with substantial wind power generation.',
    type: 'state',
  },
  'India/SR/Karnataka': {
    id: 'India/SR/Karnataka',
    name: 'Karnataka',
    region: 'SR',
    level: 'bottom',
    description: 'Information technology hub in Bengaluru combined with significant rural pump-set electricity demand.',
    type: 'state',
  },
  'India/SR/Telangana': {
    id: 'India/SR/Telangana',
    name: 'Telangana',
    region: 'SR',
    level: 'bottom',
    description: 'Rapidly growing consumer driven by the Kaleshwaram lift irrigation project and Hyderabad urban growth.',
    type: 'state',
  },
  'India/SR/Andhra Pradesh': {
    id: 'India/SR/Andhra Pradesh',
    name: 'Andhra Pradesh',
    region: 'SR',
    level: 'bottom',
    description: 'Coastal state with strong aquaculture, agricultural, and industrial demand.',
    type: 'state',
  },
  'India/SR/Other_SR': {
    id: 'India/SR/Other_SR',
    name: 'Other (Southern Region)',
    region: 'SR',
    level: 'bottom',
    description: 'Synthetic residual node for southern island and inter-utility transfers.',
    type: 'residual',
  },

  // Key Eastern Region Nodes
  'India/ER/West Bengal': {
    id: 'India/ER/West Bengal',
    name: 'West Bengal',
    region: 'ER',
    level: 'bottom',
    description: 'Eastern coastal state with heavy tea, jute, steel, and urban commercial load centered in Kolkata.',
    type: 'state',
  },
  'India/ER/Bihar': {
    id: 'India/ER/Bihar',
    name: 'Bihar',
    region: 'ER',
    level: 'bottom',
    description: 'Densely populated state with rapid ongoing rural electrification and growing domestic consumption.',
    type: 'state',
  },
  'India/ER/Odisha': {
    id: 'India/ER/Odisha',
    name: 'Odisha',
    region: 'ER',
    level: 'bottom',
    description: 'Major mineral and metallurgical production center with steady round-the-clock baseload.',
    type: 'state',
  },
  'India/ER/Other_ER': {
    id: 'India/ER/Other_ER',
    name: 'Other (Eastern Region)',
    region: 'ER',
    level: 'bottom',
    description: 'Synthetic residual node balancing Eastern regional accounts.',
    type: 'residual',
  },

  // Key North Eastern Region Nodes
  'India/NER/Assam': {
    id: 'India/NER/Assam',
    name: 'Assam',
    region: 'NER',
    level: 'bottom',
    description: 'Primary load center of the north-east, supplying tea gardens, oil refineries, and river valley cities.',
    type: 'state',
  },
  'India/NER/Other_NER': {
    id: 'India/NER/Other_NER',
    name: 'Other (North Eastern Region)',
    region: 'NER',
    level: 'bottom',
    description: 'Synthetic residual balancing the hilly north-eastern territory networks.',
    type: 'residual',
  },
};

export function getNodeInfo(nodeId: string): NodeInfo {
  if (NODE_DESCRIPTIONS[nodeId]) {
    return NODE_DESCRIPTIONS[nodeId];
  }
  const parts = nodeId.split('/');
  const name = parts[parts.length - 1];
  const region = parts.length > 1 ? (parts[1] as any) : 'ALL';
  return {
    id: nodeId,
    name,
    region,
    level: parts.length === 1 ? 'national' : parts.length === 2 ? 'region' : 'bottom',
    description: `${name} electricity demand node under ${region}.`,
    type: 'state',
  };
}

