import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { getClerkUserId } from '@/app/lib/auth/clerk-auth';
import { logServerError } from '@/app/lib/observability/serverLog';
import { FriendError, friendEndpoint } from '@/app/lib/friends/endpoint';
import { friendBlock, friendBlockList, friendUnblock, friendReport, friendChange, friendList, friendProfile, friendQuota, friendRequest, friendSearch, friendSettingsRead, friendSettingsSave } from '@/app/lib/friends/queries';
import { filterFriendOutput, safeSocialText } from '@/app/lib/friends/moderation';

async function handle(request:Request) {
  return friendEndpoint(request,{
    identify:async request=>{
      const clerk=await getClerkUserId(request);
      if(!clerk) return {id:null,status:401};
      const [user]=await getDb().select({id:users.id}).from(users).where(eq(users.clerkUserId,clerk)).limit(1);
      return {id:user?.id??null,status:404};
    },
    list:async id=>{
      const db=getDb();
      const [settings,relations,blocked]=await Promise.all([db.execute(friendSettingsRead(id)),db.execute(friendList(id)),db.execute(friendBlockList(id))]);
      return {settings:settings.rows[0],relations:filterFriendOutput(relations.rows),blocked:blocked.rows};
    },
    profile:async(id,target)=>{
      const result=await getDb().execute(friendProfile(id,target));
      if(!result.rows.length) throw new FriendError('承認済みの友達のみ閲覧できます。',403);
      return {profile:filterFriendOutput(result.rows[0])};
    },
    action:async(id,input)=>{
      const db=getDb();
      if(input.action==='settings') {
        if(input.alias && safeSocialText(input.alias,'')!==input.alias) throw new FriendError('この表示名は使用できません。別の表示名を入力してください。',400);
        const saved=await db.execute(friendSettingsSave(id,input.alias,input.emailSearchEnabled,input.shareTraining));
        if(!saved.rows.length) throw new FriendError('友達機能の公開が停止されています。運営へお問い合わせください。',403);
        return {updated:true};
      }
      if(input.action==='search' || input.action==='request' || input.action==='report') {
        const quota=await db.execute(friendQuota(id,input.action));
        if(!quota.rows.length) throw new FriendError(input.action==='report' ? '本日の通報上限に達しました。運営へお問い合わせください。' : '本日の検索・申請上限に達しました。',429);
      }
      if(input.action==='search') {
        const result=await db.execute(friendSearch(id,input.query,input.query.includes('@')));
        return {results:filterFriendOutput(result.rows)};
      }
      if(input.action==='block' || input.action==='unblock' || input.action==='report') {
        const result=await db.execute(input.action==='block' ? friendBlock(id,input.targetId)
          : input.action==='report' ? friendReport(id,input.targetId,input.reason) : friendUnblock(id,input.targetId));
        if(!result.rows.length) throw new FriendError('対象が見つからないか、すでに操作済みです。',409);
        return {updated:true};
      }
      const result=await db.execute(input.action==='request' ? friendRequest(id,input.targetId) : friendChange(id,input.targetId,input.action));
      if(!result.rows.length) throw new FriendError('対象が見つからないか、申請状態が変わりました。拒否・取消後の再申請は24時間後です。',409);
      return {updated:true};
    },
    report:error=>logServerError('friends.failed',error),
  });
}
export const GET=handle;
export const POST=handle;
