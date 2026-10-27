/** A species page's face over time (pure, for creatureThumb and tests). */
import type { DrawOpts } from '../render/art/creature-art.ts';

/** A species page's opening moment (ms from its first draw): eyes-open, no signature yet. */
export const OPEN_IDLE_MS = 2500;

/**
 * Art critique round 5: a species page opens eyes-open. A new catch (`wake`) is awake and `idle`
 * from the first frame (it used to doze, blink, then look shy), and for the first OPEN_IDLE_MS no
 * scheduled signature runs (a closed-eyed `happy`/`proud` beat could land right as it opened).
 * `dt`: ms since the page's first animated draw (null before it).
 */
export function pageFace(
  o: { animate?: boolean; wake?: boolean; shy?: boolean; awake?: boolean; still?: boolean },
  dt: number | null,
): Pick<DrawOpts, 'expression' | 'awake' | 'noSignature'> {
  const shy = o.shy ? ('shy' as const) : undefined;
  const opening = !!o.animate && (dt === null || dt < OPEN_IDLE_MS);
  if (o.wake) return { expression: opening || o.still ? 'idle' : shy, awake: true, noSignature: opening };
  return { expression: shy, awake: !!o.awake, noSignature: opening };
}
