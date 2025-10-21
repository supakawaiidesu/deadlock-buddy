import { notFound } from 'next/navigation';
import { PlayerProfile } from '@/features/player-profile/components/player-profile';

type PlayerPageProps = {
  params: Promise<{
    accountId: string;
  }>;
};

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { accountId } = await params;
  const parsedId = Number.parseInt(accountId, 10);

  if (Number.isNaN(parsedId) || parsedId <= 0) {
    notFound();
  }

  return <PlayerProfile accountId={parsedId} />;
}
