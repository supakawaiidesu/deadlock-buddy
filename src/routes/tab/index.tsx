import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';
import { useCustomPages } from '@/features/custom-pages/custom-pages-provider';
import {
  buildCustomPageNavigation,
  decodeCustomPageHash,
} from '@/features/custom-pages/custom-page-state';

export const Route = createFileRoute('/tab/')({
  component: SharedTabImportRoute,
});

function SharedTabImportRoute() {
  const locationHash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const { importSharedPage } = useCustomPages();
  const decoded = useMemo(
    () => decodeCustomPageHash(locationHash),
    [locationHash],
  );
  const importedHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (!decoded.ok || importedHashRef.current === locationHash) return;
    importedHashRef.current = locationHash;
    const page = importSharedPage(decoded.value);
    void navigate(buildCustomPageNavigation(page.tabNumber, true));
  }, [decoded, importSharedPage, locationHash, navigate]);

  if (!decoded.ok) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-16 text-center text-sm text-[rgb(var(--text-rgb)/0.65)]">
        This shared page link is invalid or unsupported.
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16 text-center text-sm text-[rgb(var(--text-rgb)/0.65)]">
      Importing shared custom tab…
    </div>
  );
}
