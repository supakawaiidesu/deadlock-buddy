import { apiRequest } from './client';
import { MatchMetadataResponseSchema } from './schema';

export const MATCH_METADATA_PAGE_SIZE = 15;
/**
 * Fetch the enriched payload for a bounded batch of match IDs.
 *
 * The metadata endpoint returns a large player payload, so callers should keep
 * batches small and preserve the match-history order independently of the
 * response order.
 */
export async function fetchMatchMetadata(matchIds: readonly number[]) {
  const ids = Array.from(
    new Set(matchIds.filter((matchId) => Number.isInteger(matchId) && matchId > 0)),
  );
  if (ids.length === 0) return [];

  const result = await apiRequest<unknown>({
    path: '/v1/matches/metadata',
    searchParams: {
      include_player_items: true,
      include_player_final_stats: true,
      match_ids: ids,
    },
  });

  return MatchMetadataResponseSchema.parse(result);
}
