import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * A strongly-typed hook for querying data via Prisma IPC.
 * 
 * @param queryKey The unique key for caching (e.g. ['vehicles', 'all'])
 * @param model The Prisma model name (e.g. 'vehicle')
 * @param operation The Prisma operation (e.g. 'findMany')
 * @param args The Prisma query arguments (e.g. { include: { driver: true } })
 */
export function usePrismaQuery<TData>(
  queryKey: unknown[],
  model: string,
  operation: string = 'findMany',
  args: any = {},
  options?: Omit<Parameters<typeof useQuery<TData, Error>>[0], 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, Error>({
    queryKey,
    ...options,
    queryFn: async () => {
      const res = await window.electronAPI.prisma.query(model, operation, args);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
  });
}

/**
 * A hook for mutating data via Prisma IPC (create, update, delete).
 * Automatically handles toasts and query invalidation.
 * 
 * @param model The Prisma model name (e.g. 'vehicle')
 * @param operation The Prisma operation (e.g. 'create')
 * @param invalidationKeys Optional array of query keys to invalidate on success
 */
export function usePrismaMutation<TArgs = any, TData = any>(
  model: string,
  operation: string,
  invalidationKeys?: unknown[][]
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TArgs>({
    mutationFn: async (args: TArgs) => {
      const res = await window.electronAPI.prisma.query(model, operation, args);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      if (invalidationKeys) {
        invalidationKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
    onError: (error) => {
      toast.error(`Error (${operation} ${model}): ${error.message}`);
    }
  });
}
