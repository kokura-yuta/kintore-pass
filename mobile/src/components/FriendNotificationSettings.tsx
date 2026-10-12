import {useAuth} from '@clerk/expo';
import {useEffect,useRef,useState} from 'react';
import {Switch,Text,View} from 'react-native';
import {Pressable} from '@/components/FeedbackPressable';
import {fetchFriendNotifications,registerFriendPush,saveFriendNotification,type FriendNotificationState} from '@/lib/friendPush';
export function FriendNotificationSettings({friends}:{friends:{id:string;name:string}[]}){
 const {getToken}=useAuth({treatPendingAsSignedOut:false}),tokenRef=useRef(getToken);
 useEffect(()=>{tokenRef.current=getToken;},[getToken]);
 const [state,setState]=useState<FriendNotificationState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const mounted=useRef(true),lock=useRef(false);
 useEffect(()=>{mounted.current=true;void (async()=>{try{const token=await tokenRef.current();if(!token)throw Error('ログインしてください。');const result=await fetchFriendNotifications(token);if(mounted.current)setState(result);}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'通知設定を確認できませんでした。');}})();return()=>{mounted.current=false;};},[]);
 async function load(){const token=await tokenRef.current();if(!token)throw Error('ログインしてください。');const result=await fetchFriendNotifications(token);if(mounted.current){setState(result);setError('');}}
 async function change(enabled:boolean,targetId?:string){
  if(lock.current||!state)return;lock.current=true;setBusy(true);setError('');
  try{const token=await tokenRef.current();if(!token)throw Error('ログインしてください。');
   if(!targetId&&enabled)await registerFriendPush(token,true);
   await saveFriendNotification(token,targetId?{action:'friend',targetId,enabled}:{action:'global',enabled});await load();
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'保存できませんでした。');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 const text={color:'#F4F6F3',fontSize:14};
 return <View style={{padding:16,gap:12,borderWidth:1,borderColor:'#203441',borderRadius:16,backgroundColor:'#0C151D'}}>
  <Text style={{...text,fontWeight:'700'}}>友達の記録更新通知</Text>
  {!state?<><Text style={text}>{error||'通知設定を確認中…'}</Text>{!!error&&<Pressable onPress={()=>void load().catch(e=>setError(e.message))}><Text style={{color:'#73E7FF'}}>再読み込み</Text></Pressable>}</>:<>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Text style={text}>更新通知を受け取る</Text><Switch accessibilityLabel="友達の更新通知を受け取る" disabled={busy} value={state.enabled} onValueChange={value=>void change(value)}/></View>
   <Text style={{color:'#99AAB4',fontSize:12}}>下で選んだ友達だけ通知します。同じ友達からは1日1回まで。相手の記録共有がOFFの場合は通知しません。</Text>
   {friends.map(friend=><View key={friend.id} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Text style={{...text,flex:1}}>{friend.name}</Text><Switch accessibilityLabel={`${friend.name}の記録更新通知`} disabled={busy} value={state.friends.includes(friend.id)} onValueChange={value=>void change(value,friend.id)}/></View>)}
   {!friends.length&&<Text style={text}>承認済みの友達が増えると選べます。</Text>}
   {!!error&&<Text accessibilityRole="alert" style={{color:'#FF9595'}}>{error}</Text>}
  </>}
 </View>;
}
