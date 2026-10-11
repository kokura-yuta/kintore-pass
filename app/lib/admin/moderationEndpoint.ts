import { z } from 'zod';
const actionSchema=z.object({action:z.enum(['resolve','suspend','restore']),reportId:z.string().uuid()});
export async function moderationEndpoint(request:Request,deps:{
  authorize:(request:Request)=>Promise<{allowed:boolean;status?:number}>;
  list:()=>Promise<unknown>;
  act:(input:z.infer<typeof actionSchema>)=>Promise<boolean>;
  log:(error:unknown)=>void;
}){
  const headers={'Cache-Control':'private, no-store'};
  try{
    const identity=await deps.authorize(request);
    if(!identity.allowed)return Response.json({error:'管理者のみ利用できます。'},{status:identity.status??403,headers});
    if(request.method==='GET')return Response.json(await deps.list(),{headers});
    const input=actionSchema.safeParse(await request.json().catch(()=>null));
    if(!input.success)return Response.json({error:'入力内容が不正です。'},{status:400,headers});
    if(!await deps.act(input.data))return Response.json({error:'通報が見つかりません。'},{status:404,headers});
    return Response.json({updated:true},{headers});
  }catch(error){deps.log(error);return Response.json({error:'通報を取得・更新できませんでした。'},{status:503,headers});}
}
