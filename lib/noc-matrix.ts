import type {
  MasterAuthority,
  NocMatrixItem,
} from '@/types/noc';

// Standard NOC matrix templates by Master Authority ID.
export const SEED_MATRIX_TEMPLATES: Record<number, NocMatrixItem[]> = {};

// Returns eligible prerequisite items with sequence number strictly less than current sequence to prevent circular dependencies.
export function getAvailablePrerequisites(
  items: NocMatrixItem[],
  currentSeq: number
): NocMatrixItem[] {
  return items
    .filter((item) => item.sequenceNo < currentSeq && item.active)
    .sort((a, b) => a.sequenceNo - b.sequenceNo);
}

// Hardcoded master authorities with numeric IDs. In a real application, these could be fetched from a database or configuration file.
export function getAuthorityName(
  masterAuthorityId: number,
  dynamicMap?: Map<number, string> | Record<number, string>
): MasterAuthority {
  if (dynamicMap) {
    const val =
      dynamicMap instanceof Map
        ? dynamicMap.get(masterAuthorityId)
        : dynamicMap[masterAuthorityId];
    if (val) return val;
  }
  switch (masterAuthorityId) {
    case 1:
      return 'Nakheel and Trakhees';
    case 2:
      return 'Dubai Municipality';
    case 3:
      return 'Dubai Development Authority';
    default:
      return `Authority #${masterAuthorityId}`;
  }
}

// Hardcoded master authorities with numeric IDs. In a real application, these could be fetched from a database or configuration file.
export function getMasterAuthorityId(
  authorityName: MasterAuthority,
  dynamicMap?: Map<string, number> | Record<string, number>
): number {
  if (dynamicMap) {
    const val =
      dynamicMap instanceof Map
        ? dynamicMap.get(authorityName)
        : dynamicMap[authorityName];
    if (val !== undefined) return val;
  }
  switch (authorityName) {
    case 'Nakheel and Trakhees':
      return 1;
    case 'Dubai Municipality':
      return 2;
    case 'Dubai Development Authority':
      return 3;
    default:
      return 1;
  }
}
