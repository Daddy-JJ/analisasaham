/**
 * IDX Broker Reference & Practical Classification
 * 
 * Klasifikasi Broker Saham Indonesia:
 * 1. Foreign / foreign-affiliated
 * 2. Local / swasta domestik
 * 3. BUMN / state-linked broker houses
 */

export type BrokerPracticalClass = 'FOREIGN' | 'DOMESTIC_PRIVATE' | 'BUMN' | 'OTHER';
export type BrokerCharacterType = 'INSTITUTIONAL' | 'RETAIL_HEAVY' | 'MIXED' | 'OTHER';

export interface BrokerDefinition {
  code: string;
  name: string;
  classification: BrokerPracticalClass;
  classificationLabel: string;
  character: string;
  characterType: BrokerCharacterType;
  isRetailHeavy: boolean;
  isInstitutional: boolean;
}

/**
 * Master Reference Broker Klasifikasi Praktis
 */
export const BROKER_MASTER_LIST: BrokerDefinition[] = [
  // ==========================================
  // 1. Foreign / foreign-affiliated
  // ==========================================
  {
    code: 'AK',
    name: 'UBS Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional global',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'ZP',
    name: 'Maybank Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional/foreign',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'YU',
    name: 'CGS International / CGS-CIMB Sekuritas',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional Asia',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'KZ',
    name: 'CLSA Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional foreign',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'RX',
    name: 'Macquarie Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional foreign',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'XA',
    name: 'NH Korindo Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'foreign-affiliated',
    characterType: 'MIXED',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'YP',
    name: 'Mirae Asset Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'foreign-affiliated, tetapi basis retail juga sangat besar',
    characterType: 'RETAIL_HEAVY',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'BQ',
    name: 'Korea Investment & Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'foreign-affiliated, mixed retail/private',
    characterType: 'MIXED',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'KK',
    name: 'Phillip Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'foreign-affiliated, cukup retail-heavy',
    characterType: 'RETAIL_HEAVY',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'AI',
    name: 'UOB Kay Hian Sekuritas',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'foreign-affiliated',
    characterType: 'MIXED',
    isRetailHeavy: false,
    isInstitutional: true,
  },

  // ==========================================
  // 2. Local / swasta domestik
  // ==========================================
  {
    code: 'MG',
    name: 'Semesta Indovest',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'Top/Institusi (Market Maker / Local Institutional)',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'BK',
    name: 'Investindo Nusantara Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'local, institutional-oriented',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'LG',
    name: 'Trimegah Sekuritas Indonesia',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'local, institutional/fund flow',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'IF',
    name: 'Samuel Sekuritas Indonesia',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'semi-top/institutional mix',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'BB',
    name: 'Verdhana Sekuritas Indonesia',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'semi-top',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'AZ',
    name: 'Sucor Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'semi-top / mixed',
    characterType: 'MIXED',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'DH',
    name: 'Sinarmas Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'mixed',
    characterType: 'MIXED',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'KI',
    name: 'Ciptadana Sekuritas Asia',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'institutional mix',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'GR',
    name: 'Panin Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'semi-retail/mixed',
    characterType: 'MIXED',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'PD',
    name: 'Indo Premier Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'retail-heavy',
    characterType: 'RETAIL_HEAVY',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'EP',
    name: 'MNC Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'retail-heavy',
    characterType: 'RETAIL_HEAVY',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'XC',
    name: 'Ajaib Sekuritas Asia',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'retail-heavy',
    characterType: 'RETAIL_HEAVY',
    isRetailHeavy: true,
    isInstitutional: false,
  },

  // ==========================================
  // 3. BUMN / state-linked broker houses
  // ==========================================
  {
    code: 'CC',
    name: 'Mandiri Sekuritas',
    classification: 'BUMN',
    classificationLabel: 'BUMN / state-linked broker houses',
    character: 'BUMN Institutional / Market Leader',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'NI',
    name: 'BNI Sekuritas',
    classification: 'BUMN',
    classificationLabel: 'BUMN / state-linked broker houses',
    character: 'BUMN Institutional',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'DX',
    name: 'Bahana Sekuritas',
    classification: 'BUMN',
    classificationLabel: 'BUMN / state-linked broker houses',
    character: 'BUMN Institutional / Asset Management',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'OD',
    name: 'BRI Danareksa Sekuritas',
    classification: 'BUMN',
    classificationLabel: 'BUMN / state-linked broker houses',
    character: 'BUMN Institutional',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },

  // ==========================================
  // Supplementary / Fallback Broker Codes
  // ==========================================
  {
    code: 'CS',
    name: 'Credit Suisse Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional global',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'MS',
    name: 'Morgan Stanley Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional global',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'DB',
    name: 'Deutsche Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional global',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'SQ',
    name: 'BCA Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'institutional private bank & mixed',
    characterType: 'MIXED',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'XL',
    name: 'Stockbit Sekuritas Digital',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'retail-heavy',
    characterType: 'RETAIL_HEAVY',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'CP',
    name: 'KB Valbury Sekuritas',
    classification: 'DOMESTIC_PRIVATE',
    classificationLabel: 'Local / swasta domestik',
    character: 'semi-retail/mixed',
    characterType: 'MIXED',
    isRetailHeavy: true,
    isInstitutional: false,
  },
  {
    code: 'DR',
    name: 'RHB Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'regional ASEAN mix',
    characterType: 'MIXED',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'SS',
    name: 'Shinhan Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'foreign-affiliated',
    characterType: 'MIXED',
    isRetailHeavy: false,
    isInstitutional: true,
  },
  {
    code: 'TP',
    name: 'OCBC Sekuritas Indonesia',
    classification: 'FOREIGN',
    classificationLabel: 'Foreign / foreign-affiliated',
    character: 'institutional regional',
    characterType: 'INSTITUTIONAL',
    isRetailHeavy: false,
    isInstitutional: true,
  },
];

// Lookup Map by 2-letter uppercase broker code
const BROKER_MAP = new Map<string, BrokerDefinition>(
  BROKER_MASTER_LIST.map((b) => [b.code.toUpperCase(), b])
);

/**
 * Get Broker Definition by 2-letter broker code
 */
export function getBrokerInfo(code: string): BrokerDefinition | undefined {
  if (!code) return undefined;
  return BROKER_MAP.get(code.trim().toUpperCase());
}

/**
 * Get practical classification: 'FOREIGN' | 'DOMESTIC_PRIVATE' | 'BUMN' | 'OTHER'
 */
export function getBrokerClassification(code: string): BrokerPracticalClass {
  const info = getBrokerInfo(code);
  return info ? info.classification : 'OTHER';
}

/**
 * Check if a broker is retail-heavy
 */
export function isBrokerRetailHeavy(code: string): boolean {
  const info = getBrokerInfo(code);
  return info ? info.isRetailHeavy : false;
}

/**
 * Check if a broker is institutional or state-linked smart money
 */
export function isBrokerInstitutional(code: string): boolean {
  const info = getBrokerInfo(code);
  return info ? info.isInstitutional : false;
}

/**
 * Legacy category mapping for backward-compatibility with existing schemas
 */
export function getBrokerCategoryLegacy(code: string): 'FOREIGN_INST' | 'LOCAL_INST' | 'RETAIL' | 'OTHER' {
  const info = getBrokerInfo(code);
  if (!info) return 'OTHER';
  if (info.isRetailHeavy) return 'RETAIL';
  if (info.classification === 'FOREIGN') return 'FOREIGN_INST';
  if (info.classification === 'BUMN' || info.classification === 'DOMESTIC_PRIVATE') return 'LOCAL_INST';
  return 'OTHER';
}

/**
 * Grouped master reference for UI tables
 */
export const BROKER_GROUPS = {
  FOREIGN: BROKER_MASTER_LIST.filter((b) => b.classification === 'FOREIGN'),
  DOMESTIC_PRIVATE: BROKER_MASTER_LIST.filter((b) => b.classification === 'DOMESTIC_PRIVATE'),
  BUMN: BROKER_MASTER_LIST.filter((b) => b.classification === 'BUMN'),
};
