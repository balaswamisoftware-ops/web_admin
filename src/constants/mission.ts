/**
 * Chant mission targets.
 *
 * These are two DIFFERENT goals — don't conflate them:
 *
 *  • PERSONAL — each devotee's own seva goal (shown in the mobile app as
 *    "chant 1,00,000 times"). This is stored in `settings.target` and can be
 *    changed per deployment; the constant below is only the default.
 *
 *  • COMMUNITY — the collective achievement goal across ALL devotees' chants
 *    combined. This is what the admin dashboard measures total chants against.
 */

/** Each devotee's personal chant goal — 1 Lakh (1,00,000). */
export const PERSONAL_CHANT_TARGET = 100_000

/** Community-wide achievement goal — 11 Crore (11,00,00,000) for all devotees. */
export const COMMUNITY_CHANT_TARGET = 110_000_000
