/**
 * src/app/hooks/useAdmin.ts — TanStack Query hooks for admin operations.
 *
 * Hooks for job queue, admin flags, and job mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScanJob, ScanJobStatus } from '@/types/scan-job';
import type { AdminFlag } from '@/types/admin';
import {
  queryDocs,
  updateDoc,
  serverTimestamp,
  where,
  orderBy,
  limit,
  type Timestamp,
} from '@/core/db/firestore';
import { enqueueDiscoverJob } from '@/pipeline/queue';

const SCAN_JOBS_COLLECTION = 'scan_jobs';
const ADMIN_FLAGS_COLLECTION = 'admin_flags';

/** Fetches jobs, optionally filtered by status. Auto-refreshes every 30s. */
export function useJobs(statusFilter: ScanJobStatus | 'all' = 'all') {
  return useQuery({
    queryKey: ['admin-jobs', statusFilter],
    queryFn: async () => {
      const constraints = statusFilter === 'all'
        ? [orderBy('createdAt', 'desc'), limit(50)]
        : [where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(50)];
      return queryDocs<ScanJob>(SCAN_JOBS_COLLECTION, ...constraints);
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

/** Fetches active admin flags, sorted by resultCount ASC. */
export function useAdminFlags() {
  return useQuery({
    queryKey: ['admin-flags'],
    queryFn: () =>
      queryDocs<AdminFlag>(
        ADMIN_FLAGS_COLLECTION,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
    staleTime: 30_000,
  });
}

/** Retries a failed job by resetting status to pending. */
export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
        status: 'pending',
        attempts: 0,
        errorMessage: null,
        failedAt: null,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });
}

/** Dismisses a failed job. */
export function useDismissJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });
}

/** Cancels a pending or running job. */
export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
        status: 'failed',
        errorMessage: 'Cancelled by admin',
        failedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });
}

/** Queues a discover job from the pipeline form. */
export function useQueueDiscover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { query: string; source: 'github'; limit: number }) => {
      return enqueueDiscoverJob(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });
}

/** Actions an admin flag (marks as actioned). */
export function useActionFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ flagId, adminUid }: { flagId: string; adminUid: string }) => {
      await updateDoc<AdminFlag>(ADMIN_FLAGS_COLLECTION, flagId, {
        status: 'actioned',
        actionedAt: serverTimestamp() as unknown as Timestamp,
        actionedBy: adminUid,
        updatedAt: serverTimestamp() as unknown as Timestamp,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-flags'] });
    },
  });
}
