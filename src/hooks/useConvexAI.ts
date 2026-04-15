/**
 * Dual-mode AI hooks.
 *
 * CONVEX_MODE → wires to convex/ai.ts actions via useAction.
 * LOCAL_MODE  → no-ops (returns empty array / empty string).
 */
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

const noopSuggest  = async (_args?: any): Promise<string[]> => [];
const noopImprove  = async (_args?: any): Promise<string> => '';

function _useSuggestSubtasksConvex() { return useAction(api.ai.suggestSubtasks); }
function _useImproveDescriptionConvex() { return useAction(api.ai.improveDescription); }

export const useSuggestSubtasks    = CONVEX_MODE ? _useSuggestSubtasksConvex    : () => noopSuggest;
export const useImproveDescription = CONVEX_MODE ? _useImproveDescriptionConvex : () => noopImprove;
