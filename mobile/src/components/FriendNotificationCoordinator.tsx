import {useAuth} from '@clerk/expo';
import {type Href,usePathname,useRouter} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {Alert,AppState,Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {apiRequest,isApiBypassEnabled} from '@/lib/api';
import {fetchFriendNotifications,registerFriendPush} from '@/lib/friendPush';
import {friendNotificationTarget} from '@/lib/friendNotificationTarget';
export function FriendNotificationCoordinator(){
 const {getToken,userId,isLoaded,isSignedIn}=useAuth({treatPendingAsSignedOut:false});
 const tokenRef=useRef(getToken),ownerRef=useRef<string|null>(null);useEffect(()=>{tokenRef.current=getToken;},[getToken]);
 const pathname=usePathname(),router=useRouter();
 const [pending,setPending]=useState<Notifications.NotificationResponse|null>(null);
 const handling=useRef(false),handled=useRef('');
 const ready=isLoaded&&isSignedIn&&['/training','/food','/chat','/my-page','/friends','/friend-calendar'].includes(pathname);
 useEffect(()=>{
  if(Platform.OS==='web'||isApiBypassEnabled)return;
  let active=true;
  Notifications.setNotificationHandler({handleNotification:async notification=>({shouldPlaySound:false,shouldSetBadge:false,
   shouldShowBanner:!!ownerRef.current&&notification.request.content.data?.recipientId===ownerRef.current,
   shouldShowList:!!ownerRef.current&&notification.request.content.data?.recipientId===ownerRef.current})});
  void Notifications.getLastNotificationResponseAsync().then(value=>{if(active&&value)setPending(value);}).catch(()=>{});
  const listener=Notifications.addNotificationResponseReceivedListener(setPending);
  return()=>{active=false;ownerRef.current=null;listener.remove();};
 },[userId]);
 useEffect(()=>{
  if(!ready||Platform.OS==='web'||isApiBypassEnabled)return;
  let active=true;
  async function sync(){try{const token=await tokenRef.current();if(!token||!active)return;
   const settings=await fetchFriendNotifications(token);if(!active)return;ownerRef.current=settings.id;
   const permission=await Notifications.getPermissionsAsync();
   // Never prompt on launch. Rebind an already permitted installation on account switch.
   if(permission.granted&&active)await registerFriendPush(token,false,()=>active);
  }catch{if(active)ownerRef.current=null;}}
  void sync();const listener=AppState.addEventListener('change',state=>{if(state==='active')void sync();});
  return()=>{active=false;listener.remove();};
 },[ready,userId]);
 useEffect(()=>{
  if(!ready||!pending||handling.current||handled.current===pending.notification.request.identifier)return;
  let active=true;handling.current=true;
  void (async()=>{
   const token=await tokenRef.current();if(!token||!active)return;
   const settings=await fetchFriendNotifications(token);if(!active)return;
   const target=friendNotificationTarget(pending.notification.request.content.data??{},settings.id);
   if(!target)return;
   const result=await apiRequest<{profile:{shared:boolean}}>(`/api/friends?userId=${target.friendId}&month=${target.day.slice(0,7)}`,{token,method:'GET'});
   if(!active)return;if(!result.profile.shared)throw Error('相手の記録共有がOFFになっています。');
   router.push(`/friend-calendar?userId=${target.friendId}&date=${target.day}` as Href);
  })().catch(()=>{if(active)Alert.alert('記録を開けませんでした','友達関係や公開設定が変更されている可能性があります。友達一覧から確認してください。');})
   .finally(()=>{handling.current=false;if(active){handled.current=pending.notification.request.identifier;setPending(null);void Notifications.clearLastNotificationResponseAsync().catch(()=>{});}});
  return()=>{active=false;};
 },[ready,pending,router]);
 return null;
}
