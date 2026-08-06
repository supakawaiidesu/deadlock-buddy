import { describe, expect, it } from 'vitest';
import {
  PlayerSteamSearchResponseSchema,
  SteamLookupResponseSchema,
} from '@/lib/api/schema';

describe('SteamLookupResponseSchema', () => {
  it('preserves the resolved profile contract and nullable ban fields', () => {
    const response = SteamLookupResponseSchema.parse({
      input: '342189169',
      input_format: 'steam32',
      profile: {
        account_id: 342189169,
        steam_id_64: '76561198302454897',
        persona_name: 'Re:ZERO Season 4™',
        real_name: null,
        profile_url: 'https://steamcommunity.com/profiles/76561198302454897/',
        avatar_url: 'https://cdn.example.test/avatar.jpg',
        avatar_full_url: 'https://cdn.example.test/avatar-full.jpg',
        country_code: null,
        visibility: 'public',
        time_created: 1430000000,
        vac_banned: null,
        vac_ban_count: null,
        game_ban_count: null,
        community_banned: null,
        economy_ban: null,
        days_since_last_ban: null,
        fetched_at: 1750000000,
      },
    });

    expect(response.profile.account_id).toBe(342189169);
    expect(response.profile.steam_id_64).toBe('76561198302454897');
    expect(response.profile.steam_id_64).toEqual(expect.any(String));
    expect(response.profile.vac_banned).toBeNull();
    expect(response.profile.vac_ban_count).toBeNull();
    expect(response.profile.game_ban_count).toBeNull();
    expect(response.profile.community_banned).toBeNull();
    expect(response.profile.economy_ban).toBeNull();
    expect(response.profile.days_since_last_ban).toBeNull();
  });
});

describe('PlayerSteamSearchResponseSchema', () => {
  it('parses Deadlock player search identities and preserves rich fields', () => {
    const response = PlayerSteamSearchResponseSchema.parse([
      {
        account_id: 342189169,
        personaname: 'Re:ZERO Season 4™',
        profileurl: 'https://steamcommunity.com/profiles/76561198302454897/',
        avatar: 'https://avatars.steamstatic.com/profile.jpg',
        avatarmedium: 'https://avatars.steamstatic.com/profile_medium.jpg',
        avatarfull: 'https://avatars.steamstatic.com/profile_full.jpg',
        matches_played_last_30d: 5,
        friends: [{ account_id: 56454520, friend_since: '2024-05-26T00:00:00Z' }],
      },
    ]);

    expect(response).toHaveLength(1);
    expect(response[0]?.account_id).toBe(342189169);
    expect(response[0]?.personaname).toBe('Re:ZERO Season 4™');
    expect(response[0]?.avatarmedium).toBe(
      'https://avatars.steamstatic.com/profile_medium.jpg',
    );
    expect(response[0]?.matches_played_last_30d).toBe(5);
  });
});
