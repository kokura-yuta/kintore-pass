import { getAdminIdentity } from '@/app/lib/admin/requireAdmin';
import { loadRetention } from '@/app/lib/admin/retentionData';
import { logServerError } from '@/app/lib/observability/serverLog';
import { retentionEndpoint } from '@/app/lib/admin/retentionEndpoint';
import { z } from 'zod';

const filters = z.object({ range: z.enum(['1m','3m','6m','1y','all']).default('1y'), unit: z.enum(['day','week','month']).default('month'),
  cohortUnit: z.enum(['week','month']).default('month'), userId: z.string().uuid().optional() });

export async function GET(request: Request) {
  return retentionEndpoint(request, { authorize: getAdminIdentity, load: async () => {
    const parsed = filters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new RangeError('分析条件が不正です。');
    return loadRetention(parsed.data);
  }, report: (error) => logServerError('admin.retention', error) });
}
