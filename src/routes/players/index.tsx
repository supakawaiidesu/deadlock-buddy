import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AccountSearchForm } from '@/features/player-search/components/account-search-form';
import { RecentPlayerList } from '@/features/player-search/components/recent-player-list';
import {
  promoteRecentPlayerId,
  readRecentPlayerIds,
  writeRecentPlayerIds,
} from '@/features/player-search/lib/recent-players';

export const Route = createFileRoute('/players/')({
  component: PlayerSearchPage,
});

function PlayerSearchPage() {
  const navigate = useNavigate();
  const [recentPlayerIds, setRecentPlayerIds] = useState(() =>
    readRecentPlayerIds(window.localStorage),
  );

  const openPlayer = (accountId: number) => {
    const nextRecentPlayerIds = promoteRecentPlayerId(recentPlayerIds, accountId);
    writeRecentPlayerIds(window.localStorage, nextRecentPlayerIds);
    setRecentPlayerIds(nextRecentPlayerIds);
    navigate({
      to: '/players/$accountId',
      params: { accountId: String(accountId) },
    });
  };

  return (
    <div className="flex min-h-full w-full items-center justify-center">
      <div className="flex w-full max-w-xl flex-col gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[rgb(var(--text-rgb)/0.5)]">
          LOOKUP PLAYER
        </p>
        <AccountSearchForm onResolved={openPlayer} />
        <RecentPlayerList accountIds={recentPlayerIds} onOpen={openPlayer} />
      </div>
    </div>
  );
}
