import { getDb } from '@/db';
import { getAdminIdentity } from '@/app/lib/admin/requireAdmin';
import { moderationEndpoint } from '@/app/lib/admin/moderationEndpoint';
import { moderationList, moderationChange } from '@/app/lib/friends/adminQueries';
import { logServerError } from '@/app/lib/observability/serverLog';
async function handle(request:Request){
  return moderationEndpoint(request,{
    authorize:getAdminIdentity,
    list:async()=>({reports:(await getDb().execute(moderationList())).rows}),
    act:async input=>(await getDb().execute(moderationChange(input.reportId,input.action))).rows.length>0,
    log:error=>logServerError('admin.friend-reports',error),
  });
}
export const GET=handle;
export const POST=handle;
