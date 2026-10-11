import { z } from 'zod';
const reportReasons = ['harassment','inappropriate','spam','other'] as const;
export const friendActionSchema = z.discriminatedUnion('action', [
  z.object({ action:z.literal('search'), query:z.string().trim().max(254).refine(v=>z.string().uuid().safeParse(v).success || z.string().email().safeParse(v).success) }),
  ...(['request','accept','reject','cancel','remove','block','unblock'] as const).map(action=>z.object({ action:z.literal(action), targetId:z.string().uuid() })),
  z.object({action:z.literal('report'),targetId:z.string().uuid(),reason:z.enum(reportReasons)}),
  z.object({action:z.literal('settings'),alias:z.string().trim().min(1).max(40).nullable(),emailSearchEnabled:z.boolean(),shareTraining:z.boolean()}),
]);
export class FriendError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function friendEndpoint(request: Request, dependencies: {
  identify:(request:Request)=>Promise<{id:string|null;status?:number}>;
  list:(id:string)=>Promise<unknown>; profile:(id:string,target:string,month?:string)=>Promise<unknown>;
  action:(id:string,input:z.infer<typeof friendActionSchema>)=>Promise<unknown>; report:(error:unknown)=>void;
}) {
  const headers={'Cache-Control':'private, no-store'};
  try {
    const identity=await dependencies.identify(request);
    if(!identity.id) return Response.json({error:'ログインとユーザー登録が必要です。'},{status:identity.status??401,headers});
    if(request.method==='GET') {
      const target=new URL(request.url).searchParams.get('userId');
      const month=new URL(request.url).searchParams.get('month');
      if(month!==null && (!target || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month))) throw new FriendError('年月が不正です。',400);
      if(target && !z.string().uuid().safeParse(target).success) throw new FriendError('ユーザーIDが不正です。',400);
      return Response.json(target ? await dependencies.profile(identity.id,target,month??undefined) : await dependencies.list(identity.id),{headers});
    }
    const parsed=friendActionSchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success) throw new FriendError('入力内容が不正です。',400);
    if('targetId' in parsed.data && parsed.data.targetId===identity.id) throw new FriendError('自分自身には申請できません。',400);
    return Response.json(await dependencies.action(identity.id,parsed.data),{headers});
  } catch(error) {
    if(error instanceof FriendError) return Response.json({error:error.message},{status:error.status,headers});
    dependencies.report(error);
    return Response.json({error:'友達情報を取得・更新できませんでした。'},{status:503,headers});
  }
}
