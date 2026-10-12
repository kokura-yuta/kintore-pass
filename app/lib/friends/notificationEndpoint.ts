import {z} from 'zod';
export const notificationAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('global'),enabled:z.boolean()}).strict(),
 z.object({action:z.literal('friend'),targetId:z.string().uuid(),enabled:z.boolean()}).strict(),
 z.object({action:z.literal('device'),installationKey:z.string().uuid(),token:z.string().regex(/^(Expo(nent)?PushToken)\[[A-Za-z0-9_-]{10,200}\]$/)}).strict(),
 z.object({action:z.literal('unregister'),installationKey:z.string().uuid()}).strict(),
]);
export async function notificationEndpoint(request:Request,deps:{identify:()=>Promise<{id:string;session:string}|null>;ready:()=>boolean;read:(id:string)=>Promise<unknown>;write:(id:string,session:string,input:z.infer<typeof notificationAction>)=>Promise<boolean>}){
 const headers={'Cache-Control':'private, no-store'};
 try {
  const actor=await deps.identify();
  if(!actor)return Response.json({error:'ログインしてください。'},{status:401,headers});
  if(!deps.ready())return Response.json({error:'通知機能は配信準備中です。'},{status:503,headers});
  if(request.method==='GET')return Response.json(await deps.read(actor.id),{headers});
  const input=notificationAction.safeParse(await request.json().catch(()=>null));
  if(!input.success || ('targetId' in input.data && input.data.targetId===actor.id))return Response.json({error:'入力内容が不正です。'},{status:400,headers});
  if(!await deps.write(actor.id,actor.session,input.data))return Response.json({error:'設定できませんでした。友達関係を確認してください。'},{status:409,headers});
  return Response.json({updated:true},{headers});
 }catch{return Response.json({error:'通知設定を取得・更新できませんでした。'},{status:503,headers});}
}
