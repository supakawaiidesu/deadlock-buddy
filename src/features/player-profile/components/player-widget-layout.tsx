import { useMemo } from 'react';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';
import {
  defaultPlayerWidgetLayout,
  playerWidgetRegistry,
} from '@/features/player-profile/player-widget-registry';

const PLAYER_WIDGETS_STORAGE_KEY = 'deadlock-buddy-player-widgets.v2';
const LEGACY_PLAYER_WIDGETS_STORAGE_KEY = 'deadlock-buddy-player-widgets.v1';

type Props = {
  accountId: number;
};

export function PlayerWidgetLayout({ accountId }: Props) {
  const data = useMemo(() => ({ accountId }), [accountId]);

  return (
    <WidgetGrid
      registry={playerWidgetRegistry}
      defaultLayout={defaultPlayerWidgetLayout}
      data={data}
      storageKey={PLAYER_WIDGETS_STORAGE_KEY}
      legacyThreeColumnStorageKey={LEGACY_PLAYER_WIDGETS_STORAGE_KEY}
      emptyStateTitle="No widgets on this profile yet."
    />
  );
}
