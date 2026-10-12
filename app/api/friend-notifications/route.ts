import {eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {users} from '@/db/schema';
import {getClerkSessionAuth} from '@/app/lib/auth/clerk-auth';
import {friendQuota} from '@/app/lib/friends/queries';
import {notificationEndpoint} from '@/app/lib/friends/notificationEndpoint';
import {notificationState,notificationGlobal,notificationFriend,registerDevice,unregisterDevice} from '@/app/lib/friends/notificationQueries';
async function handle(request:Request){return notificationEndpoint(request,{
 identify:async()=>{const auth=await getClerkSessionAuth(request);if(!auth?.userId||!auth.sessionId)return null;const [user]=await getDb().select({id:users.id}).from(users).where(eq(users.clerkUserId,auth.userId)).limit(1);return user?{id:user.id,session:auth.sessionId}:null;},
 ready:()=>process.env.FRIEND_PUSH_ENABLED==='true',
 read:async id=>(await getDb().execute(notificationState(id))).rows[0],
 write:async(id,session,input)=>{
  const db=getDb();
  if(input.action==='device'||('enabled' in input && input.enabled)){
   const quota=await db.execute(friendQuota(id,'notification'));if(!quota.rows.length)return false;
  }
  if(input.action==='global')return (await db.execute(notificationGlobal(id,input.enabled))).rows.length>0;
  if(input.action==='friend')return (await db.execute(notificationFriend(id,input.targetId,input.enabled))).rows.length>0;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.installationKey));
  const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  if(input.action==='unregister'){await db.execute(unregisterDevice(id,hash));return true;}
  return (await db.execute(registerDevice(id,session,hash,input.token))).rows.length>0;
 },
});}
export const GET=handle;export const POST=handle;
