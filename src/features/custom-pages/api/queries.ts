import { useMutation, useQuery } from '@tanstack/react-query';
import { createShare, fetchShare, isRetryableShareError } from '@/lib/api/shares';
import type { ShareDocumentV2 } from '@/lib/api/schema';

export const shareQueryKeys = {
  detail: (id: string) => ['share', id] as const,
};

export function useCreateShare() {
  return useMutation({
    mutationFn: (document: ShareDocumentV2) => createShare(document),
    retry: isRetryableShareError,
  });
}

export function useShare(id: string | null) {
  return useQuery({
    queryKey: shareQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => fetchShare(id as string, signal),
    enabled: id !== null,
    retry: isRetryableShareError,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
}
