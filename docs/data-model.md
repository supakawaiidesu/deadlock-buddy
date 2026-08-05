# 618Lock – Data Model Overview

## Player Endpoints

### `/v1/players/mmr`
- **Purpose:** Retrieves the latest match-derived score snapshot for one or more account IDs.
- **Response shape:** Array of objects `{ account_id, match_id, start_time, player_score, rank, division, division_tier }`.
- **618Lock usage:** Player overview header showing player score, rank, and the latest update timestamp.

### `/v1/players/{accountId}/mmr-history`
- **Purpose:** Returns a chronological list of match score entries for an account.
- **Response shape:** Array matching the `/players/mmr` entry schema, sorted client-side by `start_time` with derived deltas between entries.
- **618Lock usage:** Feeds the score momentum line chart, exposing per-match gains and losses.

### `/v1/players/hero-stats`
- **Purpose:** Aggregates per-hero performance metrics for a player (matches, win rate, efficiency).
- **Parameters:** `account_ids`.
- **618Lock usage:** Populates the hero performance table and top-hero highlight cards.

### `/v1/players/{accountId}/match-history`
- **Purpose:** Returns the lightweight match list for a player, including match IDs, hero IDs, timestamps, outcome fields, and base scoreboard values.
- **618Lock usage:** Supplies the activity grid and the ordered source list for the match history feed.

### `/v1/matches/metadata`
- **Parameters:** `include_player_items=true`, `include_player_final_stats=true`, and up to 15 repeated `match_ids` parameters per feed page.
- **Purpose:** Enriches each match with the winning team, mode, duration, full player rosters, final stats, and item event streams.
- **618Lock usage:** Builds the per-match KDA, CS/min, kill participation, headshot rate, final souls, final build, and team roster sections.

### `/v1/players/steam`
- **Parameters:** Up to 100 deduplicated repeated `account_ids` parameters.
- **Purpose:** Resolves match roster account IDs to Steam `personaname` values.
- **618Lock usage:** Names the two team lists; per-account results are cached so shared teammates do not trigger repeat lookups.

## Query Key Taxonomy

| Resource                 | Query Key Example                                      | Staleness | Notes                                                  |
| ------------------------ | ------------------------------------------------------ | --------- | ------------------------------------------------------ |
| Player overview          | `['player', 123, 'overview']`                          | 5 min     | Contains MMR estimate & leaderboard data.             |
| Player hero stats        | `['player', 123, 'hero-stats']`                        | 5 min     | Includes derived win rate, KDA, farm metrics.         |
| Player match history     | `['player', 123, 'match-history']`                     | 5 min     | Shared by the activity grid and match history feed.   |
| Match metadata pages     | `['player', 123, 'match-metadata', signature]`         | 10 min    | Enriched in 15-match pages and ordered client-side.   |
| Steam roster names       | `['player', 'steam-names', accountIds]`                | 10 min    | Missing IDs are cached per account; requests batch 100.|
| Player MMR history       | `['player', 123, 'mmr-history']`                       | 5 min     | Sorted ascending for chart rendering.                 |

## Data Transformations

- **Win Rate:** `wins / matches_played` (guard against division by zero).
- **KDA:** `(kills + assists) / max(1, deaths)`.
- **Record Summary:** Aggregated `wins`, `losses`, `winRate` across hero stats.
- **History Deltas:** Provided `delta` field is optional; when absent we derive via diffing consecutive MMR entries.

- **Match outcome:** Prefer `winning_team === player.team`; fall back to `match_result === player_team`.
- **Kill participation:** `(player kills + assists) / team kills`, guarded against zero team kills.
- **Headshot rate:** `hero_bullets_hit_crit / hero_bullets_hit`, guarded against zero bullets hit.
- **CS/min:** Final `creep_kills` divided by match duration in minutes, falling back to lightweight `last_hits`.
- **Final build:** The latest item event for each item ID is kept; events with the sold flag (`flags & 1`) are excluded.
- **Roster identity:** Steam names are indexed by `account_id`, with unresolved IDs rendered as account fallbacks.

## Pending Additions

- Hero metadata service for IDs → names, roles, portraits (to power richer UI states).
- Item build and matchup analytics (`/v1/analytics/*`) staged for hero meta dashboard phase.
- Cached server actions for rate-limited aggregate queries once traffic warrants edge caching.
