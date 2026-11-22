/** C13 (lot 2, palier bas) : signature des paperboards ActivInspire (` Bamboo `, 8 octets) ; le lot 3 étend ce module. */
const BAMBOO_MAGIC = [0x20, 0x42, 0x61, 0x6d, 0x62, 0x6f, 0x6f, 0x20] as const;

export const FLIPCHART_LATER_MESSAGE = "paperboard ActivInspire pas encore lu : exporter en .iwb ou PDF depuis ActivInspire";

export function hasBambooMagic(head: Uint8Array): boolean {
  return head.length >= BAMBOO_MAGIC.length && BAMBOO_MAGIC.every((b, i) => head[i] === b);
}
