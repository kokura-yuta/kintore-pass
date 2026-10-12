const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function friendNotificationTarget(data:Record<string,unknown>,owner:string){
 if(data.type!=='friend-training'||data.recipientId!==owner||typeof data.friendId!=='string'||!uuid.test(data.friendId)||data.friendId===owner||typeof data.performedOn!=='string')return null;
 const day=data.performedOn;
 if(!/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)return null;
 return {friendId:data.friendId,day};
}
