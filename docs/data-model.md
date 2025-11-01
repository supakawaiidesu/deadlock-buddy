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

## Query Key Taxonomy

| Resource                | Query Key Example                    | Staleness | Notes                                         |
| ----------------------- | ------------------------------------ | --------- | --------------------------------------------- |
| Player overview         | `['player', 123, 'overview']`        | 5 min     | Contains MMR estimate & leaderboard data.     |
| Player hero stats       | `['player', 123, 'hero-stats']`      | 5 min     | Includes derived win rate, KDA, farm metrics. |
| Player MMR history      | `['player', 123, 'mmr-history']`     | 5 min     | Sorted ascending for chart rendering.         |

## Data Transformations

- **Win Rate:** `wins / matches_played` (guard against division by zero).
- **KDA:** `(kills + assists) / max(1, deaths)`.
- **Record Summary:** Aggregated `wins`, `losses`, `winRate` across hero stats.
- **History Deltas:** Provided `delta` field is optional; when absent we derive via diffing consecutive MMR entries.

## Pending Additions

- Hero metadata service for IDs → names, roles, portraits (to power richer UI states).
- Item build and matchup analytics (`/v1/analytics/*`) staged for hero meta dashboard phase.
- Cached server actions for rate-limited aggregate queries once traffic warrants edge caching.
