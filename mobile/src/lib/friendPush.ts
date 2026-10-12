import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
import {apiRequest} from '@/lib/api';
const installationStorage='friend-push-installation-v1';
export type FriendNotificationState={id:string;enabled:boolean;friends:string[]};
export const fetchFriendNotifications=(token:string)=>apiRequest<FriendNotificationState>('/api/friend-notifications',{token,method:'GET'});
export const saveFriendNotification=(token:string,body:unknown)=>apiRequest('/api/friend-notifications',{token,method:'POST',body:JSON.stringify(body)});
let registrationQueue:Promise<void>=Promise.resolve();
export function registerFriendPush(token:string,askPermission:boolean,isCurrent=()=>true){
 const task=registrationQueue.catch(()=>{}).then(()=>performRegistration(token,askPermission,isCurrent));registrationQueue=task;return task;
}
async function performRegistration(token:string,askPermission:boolean,isCurrent:()=>boolean){
 if(!isCurrent())return;
 if(Platform.OS==='web')throw new Error('通知の設定はiPhone／Androidアプリから行ってください。');
 let permission=await Notifications.getPermissionsAsync();
 if(askPermission&&!permission.granted)permission=await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw new Error('端末の通知が許可されていません。設定アプリで筋トレPASの通知を許可してください。');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('friend-training',{name:'友達のトレーニング',importance:Notifications.AndroidImportance.DEFAULT});
 const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
 if(!projectId)throw new Error('通知の配布設定がありません。');
 const push=await Notifications.getExpoPushTokenAsync({projectId});
 let installationKey=await SecureStore.getItemAsync(installationStorage);
 if(!installationKey){installationKey=Crypto.randomUUID();await SecureStore.setItemAsync(installationStorage,installationKey);}
 if(isCurrent())await saveFriendNotification(token,{action:'device',installationKey,token:push.data});
}
export async function unregisterFriendPush(token:string){
 if(Platform.OS==='web')return;
 const installationKey=await SecureStore.getItemAsync(installationStorage);
 if(installationKey)await saveFriendNotification(token,{action:'unregister',installationKey});
}
