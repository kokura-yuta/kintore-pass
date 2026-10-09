import { getAdminIdentity } from '@/app/lib/admin/requireAdmin';
import { loadRetention } from '@/app/lib/admin/retentionData';
import { logServerError } from '@/app/lib/observability/serverLog';
import { retentionEndpoint } from '@/app/lib/admin/retentionEndpoint';

export async function GET(request: Request) {
  return retentionEndpoint(request, { authorize: getAdminIdentity, load: loadRetention, report: (error) => logServerError('admin.retention', error) });
}
