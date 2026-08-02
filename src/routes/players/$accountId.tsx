import { createFileRoute } from '@tanstack/react-router';
import { PlayerProfile } from '@/features/player-profile/components/player-profile';

export const Route = createFileRoute('/players/$accountId')({
  component: PlayerProfilePage,
});

function PlayerProfilePage() {
  const { accountId } = Route.useParams();
  const parsedId = Number.parseInt(accountId, 10);

  if (Number.isNaN(parsedId) || parsedId <= 0) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-4 py-6 text-center">
        <span className="border border-[var(--danger)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--danger)]">
          Invalid ID
        </span>
        <h2 className="text-3xl font-semibold text-white">Invalid account ID.</h2>
        <p className="text-sm text-[rgba(245,247,245,0.65)]">
          &ldquo;{accountId}&rdquo; is not a valid Deadlock account ID.
        </p>
      </div>
    );
  }

  return <PlayerProfile accountId={parsedId} />;
}
