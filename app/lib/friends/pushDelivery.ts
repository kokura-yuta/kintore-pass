export type PushTarget={hash:string;token:string;session:string;clerkUserId:string};
export type PushEvent={id:string;sender_id:string;recipient_id:string;performed_on:string};
export async function deliverFriendPush(event:PushEvent,targets:PushTarget[],deps:{
 sessionActive:(session:string,user:string)=>Promise<boolean>;
 stillAllowed:(hash:string)=>Promise<boolean>;
 send:(payload:unknown)=>Promise<{status:string;id?:string;details?:{error?:string}}>;
 deactivate:(hash:string,token:string)=>Promise<void>; receipt:(id:string,hash:string,token:string)=>Promise<void>;
}){
 for(const target of targets){
  if(!await deps.sessionActive(target.session,target.clerkUserId)){await deps.deactivate(target.hash,target.token);continue;}
  if(!await deps.stillAllowed(target.hash))continue;
  const ticket=await deps.send({to:target.token,title:'筋トレPAS',body:'友達のトレーニング記録が更新されました。',
   sound:'default',channelId:'friend-training',ttl:3600,
   data:{type:'friend-training',recipientId:event.recipient_id,friendId:event.sender_id,performedOn:event.performed_on}});
  if(ticket.status==='ok'&&ticket.id)await deps.receipt(ticket.id,target.hash,target.token);
  else if(ticket.details?.error==='DeviceNotRegistered')await deps.deactivate(target.hash,target.token);
 }
}
