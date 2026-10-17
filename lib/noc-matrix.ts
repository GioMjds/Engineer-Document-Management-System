import type { NocMatrixItem } from '@/types/noc';

// Standard NOC matrix templates by Master Authority ID.
export const SEED_MATRIX_TEMPLATES: Record<number, NocMatrixItem[]> = {};

// Returns eligible prerequisite items with sequence number strictly less than current sequence to prevent circular dependencies.
export function getAvailablePrerequisites(
  items: NocMatrixItem[],
  currentSeq: number,
): NocMatrixItem[] {
  return items
    .filter((item) => item.sequenceNo < currentSeq && item.active)
    .sort((a, b) => a.sequenceNo - b.sequenceNo);
}

// Resolves master authority name with dynamic map lookup.
export function getAuthorityName(
  masterAuthorityId: number,
  dynamicMap?: Map<number, string> | Record<number, string>,
): string {
  if (dynamicMap) {
    const val =
      dynamicMap instanceof Map
        ? dynamicMap.get(masterAuthorityId)
        : dynamicMap[masterAuthorityId];
    if (val) return val;
  }
  return `Authority #${masterAuthorityId}`;
}

// Resolves master authority ID with dynamic map lookup.
export function getMasterAuthorityId(
  authorityName: string,
  dynamicMap?: Map<string, number> | Record<string, number>,
): number | null {
  if (dynamicMap) {
    const val =
      dynamicMap instanceof Map
        ? dynamicMap.get(authorityName)
        : dynamicMap[authorityName];
    if (val !== undefined) return val;
  }
  return null;
}
