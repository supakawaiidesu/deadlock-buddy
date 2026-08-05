import { useMemo } from 'react';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';
import {
  defaultPlayerWidgetLayout,
  playerWidgetRegistry,
} from '@/features/player-profile/player-widget-registry';

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
      storageKey="deadlock-buddy-player-widgets.v1"
      emptyStateTitle="No widgets on this profile yet."
      className="items-start"
    />
  );
}
