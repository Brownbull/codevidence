/**
 * src/app/components/admin/PipelineTab.tsx — Discovery run form.
 *
 * React Hook Form + Zod validation. Queues discover job on submit.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueueDiscover } from '@/app/hooks/useAdmin';

const discoverSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  source: z.enum(['github']),
  limit: z.number().min(1).max(1000),
});

type DiscoverFormData = z.infer<typeof discoverSchema>;

export function PipelineTab() {
  const queueDiscover = useQueueDiscover();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DiscoverFormData>({
    resolver: zodResolver(discoverSchema),
    defaultValues: { query: '', source: 'github', limit: 100 },
  });

  const onSubmit = async (data: DiscoverFormData) => {
    await queueDiscover.mutateAsync(data);
    reset();
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Discovery Run</h2>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-lg space-y-4">
        {/* Query */}
        <div>
          <label htmlFor="discover-query" className="block text-xs font-medium text-slate-700 mb-1">
            Query <span className="text-red-500">*</span>
          </label>
          <input
            id="discover-query"
            type="text"
            {...register('query')}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            placeholder="e.g. python fastapi"
          />
          {errors.query && (
            <p className="text-xs text-red-500 mt-1">{errors.query.message}</p>
          )}
        </div>

        {/* Source */}
        <div>
          <label htmlFor="discover-source" className="block text-xs font-medium text-slate-700 mb-1">
            Source
          </label>
          <select
            id="discover-source"
            {...register('source')}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="github">GitHub</option>
          </select>
        </div>

        {/* Limit */}
        <div>
          <label htmlFor="discover-limit" className="block text-xs font-medium text-slate-700 mb-1">
            Limit
          </label>
          <input
            id="discover-limit"
            type="number"
            {...register('limit', { valueAsNumber: true })}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            min={1}
            max={1000}
          />
          {errors.limit && (
            <p className="text-xs text-red-500 mt-1">{errors.limit.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Queuing...' : 'Queue Discovery'}
        </button>

        {queueDiscover.isSuccess && (
          <p className="text-xs text-green-600">Discovery job queued successfully.</p>
        )}
      </form>
    </div>
  );
}
