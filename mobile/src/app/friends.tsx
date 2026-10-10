import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,Switch,Text,TextInput,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '@/lib/api';
type Relation={id:string;name:string;status:'pending'|'accepted';outgoing:boolean};
type Settings={id:string;alias:string|null;emailSearchEnabled:boolean;shareTraining:boolean};
type Profile={id:string;name:string;shared:boolean;records:{performedAt:string;exercises:{name:string;bodyPart:string;sets:{setNumber:number;weightKg:number|null;reps:number|null}[]}[]}[]};
export default function FriendsScreen() {
  const {getToken,userId,isLoaded}=useAuth({treatPendingAsSignedOut:false}); const router=useRouter();
  const tokenRef=useRef(getToken);const settingsDirty=useRef(false);
  const [hasChanges,setHasChanges]=useState(false);
  useEffect(()=>{tokenRef.current=getToken;},[getToken]);
  const scrollRef=useRef<ScrollView>(null);const searchTop=useRef(0);
  const [settings,setSettings]=useState<Settings|null>(null);const [relations,setRelations]=useState<Relation[]>([]);
  const [query,setQuery]=useState('');const [results,setResults]=useState<{id:string;name:string}[]>([]);
  const [profile,setProfile]=useState<Profile|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  function editSettings(change:Partial<Settings>){settingsDirty.current=true;setHasChanges(true);setSettings(current=>current?{...current,...change}:current);}
  async function api<T>(path:string,body?:unknown) {const token=await tokenRef.current();if(!token)throw new Error('ログインしてください。');return apiRequest<T>(path,{token,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});}
  async function reload(){const preserveDraft=settingsDirty.current;const data=await api<{settings:Settings;relations:Relation[]}>('/api/friends');if(!preserveDraft&&!settingsDirty.current)setSettings(data.settings);setRelations(data.relations);}
  useEffect(()=>{
    let active = true;
    if(!isLoaded)return;
    (async()=>{
      const token=await tokenRef.current();
      if(!active)return;
      settingsDirty.current=false;setHasChanges(false);setSettings(null);setRelations([]);setProfile(null);setResults([]);setError('');
      if(!token) throw new Error('ログインしてください。');
      const data=await apiRequest<{settings:Settings;relations:Relation[]}>('/api/friends',{token,method:'GET'});
      if(active){if(!settingsDirty.current)setSettings(data.settings);setRelations(data.relations);}
    })().catch(e=>{if(active)setError(e instanceof Error?e.message:'読み込めませんでした。');});
    return ()=>{active=false;};
  },[userId,isLoaded]);
  async function saveSettings(){if(busy||!settings)return;setBusy(true);setError('');try{await api('/api/friends',{action:'settings',alias:settings.alias?.trim()||null,emailSearchEnabled:settings.emailSearchEnabled,shareTraining:settings.shareTraining});settingsDirty.current=false;setHasChanges(false);await reload();}catch(e){setError(e instanceof Error?e.message:'設定を保存できませんでした。');}finally{setBusy(false);}}
  async function act(body:unknown){if(busy)return;setBusy(true);setError('');try{await api('/api/friends',body);setProfile(null);setResults([]);await reload();}catch(e){setError(e instanceof Error?e.message:'操作できませんでした。');}finally{setBusy(false);}}
  async function search(){if(busy)return;Keyboard.dismiss();setBusy(true);setError('');setResults([]);try{const r=await api<{results:{id:string;name:string}[]}>('/api/friends',{action:'search',query});setResults(r.results);if(!r.results.length)setError('検索結果はありません。メール検索は相手が許可した場合のみ利用できます。');}catch(e){setError(e instanceof Error?e.message:'検索できませんでした。');}finally{setBusy(false);}}
  async function visit(id:string){if(busy)return;setBusy(true);setError('');try{const r=await api<{profile:Profile}>(`/api/friends?userId=${id}`);setProfile(r.profile);}catch(e){setError(e instanceof Error?e.message:'閲覧できませんでした。');}finally{setBusy(false);}}
  const text={color:'#F4F6F3',fontSize:14};const card={padding:16,gap:10,borderWidth:1,borderColor:'#203441',borderRadius:16,backgroundColor:'#0C151D'};
  return <SafeAreaView style={{flex:1,backgroundColor:'#050A0F'}}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='android'?'height':undefined}>
    <ScrollView ref={scrollRef} automaticallyAdjustKeyboardInsets keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,paddingBottom:120,gap:16}}>
    <ActionButton busy={busy} label="‹ マイページへ" onPress={()=>router.back()}/><Text style={{...text,fontSize:26,fontWeight:'700'}}>友達</Text>
    <Text style={text}>公開タイムラインはありません。記録共有は初期状態でOFF。承認済みの友達だけに、筋トレの種目・重量・回数・セットを公開できます。</Text>
    {busy&&<ActivityIndicator color="#73E7FF"/>}{error&&<Text style={{color:'#ff8e83'}}>{error}</Text>}
    {!settings&&<ActionButton busy={busy} label="再読み込み" onPress={()=>{reload().catch(e=>setError(e.message));}}/>}
    {settings&&<View style={card}><Text selectable style={text}>あなたのユーザーID：{settings.id}</Text>
      <Text style={text}>友達向けの表示名（本名を使う必要はありません）</Text><TextInput editable={!busy} value={settings.alias??''} maxLength={40} onChangeText={alias=>editSettings({alias})} style={{...text,borderColor:'#203441',borderWidth:1,padding:12}}/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={text}>メールでの検索を許可</Text><Switch disabled={busy} accessibilityLabel="メールでの検索を許可" value={settings.emailSearchEnabled} onValueChange={emailSearchEnabled=>editSettings({emailSearchEnabled})}/></View>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={text}>承認済み友達に記録を共有</Text><Switch disabled={busy} accessibilityLabel="承認済み友達に記録を共有" value={settings.shareTraining} onValueChange={shareTraining=>editSettings({shareTraining})}/></View>
      <Text style={text}>写真・体重・体脂肪率・AIチャット・記録メモは公開しません。設定変更は保存後に反映されます。</Text>
      {hasChanges&&<Text style={{color:'#ffb454'}}>未保存の変更があります。下の保存ボタンで反映します。</Text>}
      <ActionButton busy={busy} label="公開設定を保存" onPress={()=>{if(settings.shareTraining||settings.emailSearchEnabled)Alert.alert('公開設定の確認','許可した検索・記録共有が有効になります。',[{text:'キャンセル'},{text:'保存',onPress:saveSettings}]);else void saveSettings();}}/>
    </View>}
    <View style={card} onLayout={event=>{searchTop.current=event.nativeEvent.layout.y;}}><Text style={text}>ユーザーIDまたはメールアドレス（完全一致・検索30回/日）</Text><TextInput accessibilityLabel="友達のユーザーIDまたはメールアドレス" autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={search} onFocus={()=>{scrollRef.current?.scrollTo({y:Math.max(0,searchTop.current-20),animated:true});}} value={query} onChangeText={v=>{setQuery(v);setResults([]);}} maxLength={254} style={{...text,borderColor:'#203441',borderWidth:1,padding:12}}/><ActionButton busy={busy} label="検索" onPress={search}/>
      <ActionButton busy={busy} label="キーボードを閉じる" onPress={()=>Keyboard.dismiss()}/>
      {results.map(r=><View key={r.id}><Text style={text}>{r.name}</Text><ActionButton busy={busy} label="友達申請を送る" onPress={()=>act({action:'request',targetId:r.id})}/></View>)}
    </View>
    <Text style={{...text,fontSize:20}}>受信した申請</Text>{relations.filter(r=>r.status==='pending'&&!r.outgoing).map(r=><View style={card} key={r.id}><Text style={text}>{r.name}</Text><ActionButton busy={busy} label="承認する" onPress={()=>act({action:'accept',targetId:r.id})}/><ActionButton busy={busy} label="拒否する" onPress={()=>act({action:'reject',targetId:r.id})}/></View>)}
    <Text style={{...text,fontSize:20}}>送信した申請</Text>{relations.filter(r=>r.status==='pending'&&r.outgoing).map(r=><View style={card} key={r.id}><Text style={text}>{r.name}</Text><ActionButton busy={busy} label="申請を取り消す" onPress={()=>act({action:'cancel',targetId:r.id})}/></View>)}
    <Text style={{...text,fontSize:20}}>友達一覧</Text>{relations.filter(r=>r.status==='accepted').map(r=><View style={card} key={r.id}><ActionButton busy={busy} label={`${r.name} のプロフィール`} onPress={()=>visit(r.id)}/><ActionButton busy={busy} label="友達を解除" onPress={()=>Alert.alert('友達解除','解除後はお互いの記録を閲覧できません。',[{text:'キャンセル'},{text:'解除',style:'destructive',onPress:()=>act({action:'remove',targetId:r.id})}])}/></View>)}
    {profile&&<View style={card}><Text style={{...text,fontSize:20}}>{profile.name} の最近の筋トレ</Text><Text style={text}>最新20記録。既に見た内容の記憶やスクリーンショットは解除後も消去できません。</Text>{!profile.shared&&<Text style={text}>相手は記録を公開していません。</Text>}{profile.shared&&!profile.records.length&&<Text style={text}>記録はありません。</Text>}{profile.records.map((r,i)=><View key={i} style={{gap:8,marginTop:14}}><Text style={text}>{new Date(r.performedAt).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'})}</Text>{r.exercises.map((e,j)=><View key={j}><Text style={text}>{e.bodyPart} · {e.name}（{e.sets.length}セット）</Text>{e.sets.map(s=><Text style={text} key={s.setNumber}>{s.setNumber}セット目：{s.weightKg??'未記録'}kg × {s.reps??'未記録'}回</Text>)}</View>)}</View>)}</View>}
    <ActionButton busy={busy} label="最新情報に更新" onPress={()=>{setProfile(null);reload().catch(e=>setError(e.message));}}/>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function ActionButton({label,onPress,busy}:{label:string;onPress:()=>void;busy:boolean}){return <Pressable disabled={busy} onPress={onPress} accessibilityRole="button"><Text style={{color:'#73E7FF',paddingVertical:10,opacity:busy?0.5:1}}>{label}</Text></Pressable>;}
