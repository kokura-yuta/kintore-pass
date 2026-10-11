import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Pressable,ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '@/lib/api';
type Report={id:string;reporterId:string;targetId:string;name:string;exerciseNames:string[];reason:string;status:string;createdAt:string;suspended:boolean};
const labels:Record<string,string>={harassment:'嫌がらせ・脅迫',inappropriate:'不適切な表示名・記録',spam:'迷惑行為・スパム',other:'その他'};
export default function AdminFriendReportsScreen(){
  const {getToken}=useAuth({treatPendingAsSignedOut:false});const tokenRef=useRef(getToken);const router=useRouter();
  const [reports,setReports]=useState<Report[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{tokenRef.current=getToken;},[getToken]);
  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{const token=await tokenRef.current();if(!token)throw Error('ログインしてください。');const result=await apiRequest<{reports:Report[]}>('/api/admin/friend-reports',{token,method:'GET'});setReports(result.reports);}
    catch(e){setError(e instanceof Error?e.message:'取得できませんでした。');}finally{setBusy(false);}
  },[]);
  useEffect(()=>{const timer=setTimeout(()=>{void load();},0);return()=>clearTimeout(timer);},[load]);
  async function act(reportId:string,action:'resolve'|'suspend'|'restore'){
    if(busy)return;setBusy(true);setError('');
    try{const token=await tokenRef.current();if(!token)throw Error('ログインしてください。');await apiRequest('/api/admin/friend-reports',{token,method:'POST',body:JSON.stringify({reportId,action})});await load();}
    catch(e){setError(e instanceof Error?e.message:'更新できませんでした。');}finally{setBusy(false);}
  }
  const text={color:'#F4F6F3',fontSize:15};
  return <SafeAreaView style={{flex:1,backgroundColor:'#050A0F'}}><ScrollView contentContainerStyle={{padding:24,gap:18}}>
    <Button busy={busy} label="‹ 運営ダッシュボード" onPress={()=>router.back()}/><Text style={{...text,fontSize:25,fontWeight:'700'}}>友達機能の通報対応</Text>
    <Text style={text}>未対応を優先して最大200件表示。対象の表示名・共有記録を確認し、必要なら共有を停止してください。通報は毎日確認し、放置しないでください。</Text>
    <Button busy={busy} label="更新する" onPress={()=>{void load();}}/>{busy&&<ActivityIndicator color="#73E7FF"/>}{!!error&&<Text style={{color:'#ff8e83'}}>{error}</Text>}
    {!busy&&!error&&!reports.length&&<Text style={text}>通報はありません。</Text>}
    {reports.map(r=><View key={r.id} style={{padding:18,gap:10,borderRadius:16,borderWidth:1,borderColor:'#203441',backgroundColor:'#0C151D'}}>
      <Text style={{...text,fontWeight:'700'}}>{r.name}：{labels[r.reason]??r.reason}</Text><Text selectable style={text}>対象ID：{r.targetId}</Text><Text selectable style={text}>通報者ID：{r.reporterId}</Text>
      {!!r.exerciseNames?.length&&<Text style={text}>通報時に共有された種目名：{r.exerciseNames.join('、')}</Text>}
      <Text style={text}>{new Date(r.createdAt).toLocaleString('ja-JP')}／{r.status==='pending'?'未対応':'対応済み'}／{r.suspended?'共有停止中':'共有停止なし'}</Text>
      {r.status==='pending'&&<Button busy={busy} label="確認済みとして完了" onPress={()=>Alert.alert('対応完了','内容を確認し、対応が不要または完了した場合のみ選んでください。',[{text:'キャンセル'},{text:'完了',onPress:()=>{void act(r.id,'resolve');}}])}/>}
      <Button busy={busy} label={r.suspended?'共有停止を解除':'対象ユーザーの友達共有を停止'} onPress={()=>Alert.alert(r.suspended?'共有停止を解除':'友達共有を停止',r.suspended?'友達関係は復元せず、公開設定もOFFのまま解除します。':'対象ユーザーの友達関係を解除し、検索・申請・共有を停止します。AIや本人の記録は変更しません。',[{text:'キャンセル'},{text:'実行',onPress:()=>{void act(r.id,r.suspended?'restore':'suspend');}}])}/>
    </View>)}
  </ScrollView></SafeAreaView>;
}
function Button({label,onPress,busy}:{label:string;onPress:()=>void;busy:boolean}){return <Pressable disabled={busy} onPress={onPress}><Text style={{color:'#73E7FF',paddingVertical:10,opacity:busy?0.5:1}}>{label}</Text></Pressable>;}
