/**
 * Reef numbering constants (ADR 0009), split out of endless.ts so eager code (save validation)
 * doesn't pull the generator and solvers into the initial bundle. endless.ts re-exports them.
 */
/** Reefs shipped in the pack (ids R001…R360). Generated reefs start after these. */
export const SHIPPED_REEFS = 360;
export const CHAPTER_SIZE = 20;
/** Highest reef number we accept (far beyond anyone's reach; keeps ids and seeds sane). */
export const MAX_REEF = 9_999_999;
