import {createClerkClient} from '@clerk/backend';
import {sql} from 'drizzle-orm';
import {getDb} from '@/db';
import {claimNotifications,notificationTargets} from '@/app/lib/friends/notificationQueries';
import {deliverFriendPush,type PushEvent,type PushTarget} from '@/app/lib/friends/pushDelivery';
import {logServerError} from '@/app/lib/observability/serverLog';
async function expoPost(path:string,body:unknown){
 const response=await fetch(`https://exp.host/--/api/v2/push/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Push provider unavailable');
 return response.json();
}
export async function drainFriendPush(){
 // Explicit production activation only after migration, APNs and device checks.
 if(process.env.FRIEND_PUSH_ENABLED!=='true'||!process.env.EXPO_PUSH_ACCESS_TOKEN||!process.env.CLERK_SECRET_KEY)return;
 const db=getDb(),clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
 const deactivate=async(hash:string,token:string)=>{await db.execute(sql`UPDATE friend_push_devices SET active=false WHERE installation_hash=${hash} AND push_token=${token}`);};
 const claimed=await db.execute(claimNotifications());
 for(const raw of claimed.rows){
  const event=raw as unknown as PushEvent;
  try{
   const load=async()=>(await db.execute(notificationTargets(event.id,event.recipient_id,event.sender_id))).rows as unknown as PushTarget[];
   await deliverFriendPush(event,await load(),{
    sessionActive:async(session,user)=>{const result=await clerk.sessions.getSession(session);return result.status==='active'&&result.userId===user;},
    stillAllowed:async hash=>(await load()).some(target=>target.hash===hash),
    send:async payload=>{const result=await expoPost('send',payload);if(!result.data)throw new Error('Invalid push ticket');return result.data;},
    deactivate,
    receipt:async(id,hash,token)=>{await db.execute(sql`INSERT INTO friend_push_receipts(ticket_id,installation_hash,push_token) VALUES(${id},${hash},${token}) ON CONFLICT DO NOTHING`);},
   });
  }catch(error){logServerError('friend_push_delivery_failed',error);}
  finally{await db.execute(sql`UPDATE friend_push_outbox SET finished_at=now() WHERE id=${event.id}::uuid`);}
 }
 // Expo accepts a ticket first; delivery receipts can later invalidate a token.
 const pending=await db.execute(sql`SELECT ticket_id,installation_hash,push_token FROM friend_push_receipts WHERE checked_at IS NULL AND created_at<now()-interval '15 minutes' ORDER BY created_at LIMIT 100`);
 if(pending.rows.length){
  const result=await expoPost('getReceipts',{ids:pending.rows.map(row=>row.ticket_id)});
  for(const row of pending.rows){const receipt=result.data?.[String(row.ticket_id)];if(!receipt)continue;
   if(receipt.details?.error==='DeviceNotRegistered')await deactivate(String(row.installation_hash),String(row.push_token));
   await db.execute(sql`UPDATE friend_push_receipts SET checked_at=now() WHERE ticket_id=${row.ticket_id}`);
  }
 }
 await db.execute(sql`DELETE FROM friend_push_receipts WHERE created_at<now()-interval '7 days'`);
 await db.execute(sql`DELETE FROM friend_push_outbox WHERE created_at<now()-interval '7 days'`);
}
