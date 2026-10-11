import { useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '@/lib/api';
type Relation={id:string;name:string;status:'pending'|'accepted';outgoing:boolean};
type Settings={id:string;alias:string|null;emailSearchEnabled:boolean;shareTraining:boolean;socialSuspended?:boolean};
export default function FriendsScreen() {
  const {getToken,userId,isLoaded}=useAuth({treatPendingAsSignedOut:false}); const router=useRouter();
  const tokenRef=useRef(getToken);const settingsDirty=useRef(false);
  const [hasChanges,setHasChanges]=useState(false);
  useEffect(()=>{tokenRef.current=getToken;},[getToken]);
  const scrollRef=useRef<ScrollView>(null);const searchTop=useRef(0);
  const [settings,setSettings]=useState<Settings|null>(null);const [relations,setRelations]=useState<Relation[]>([]);
  const [query,setQuery]=useState('');const [results,setResults]=useState<{id:string;name:string}[]>([]);
  const [managedFriend,setManagedFriend]=useState<string|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [blocked,setBlocked]=useState<{id:string}[]>([]);
  const [reportTarget,setReportTarget]=useState<Relation|null>(null);
  const [notice,setNotice]=useState('');
  const [showSettings,setShowSettings]=useState(false);
  const [showRequests,setShowRequests]=useState(false);
  function editSettings(change:Partial<Settings>){settingsDirty.current=true;setHasChanges(true);setSettings(current=>current?{...current,...change}:current);}
  async function api<T>(path:string,body?:unknown) {const token=await tokenRef.current();if(!token)throw new Error('ログインしてください。');return apiRequest<T>(path,{token,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});}
  async function reload(){const preserveDraft=settingsDirty.current;const data=await api<{settings:Settings;relations:Relation[];blocked?:{id:string}[]}>('/api/friends');if(!preserveDraft&&!settingsDirty.current)setSettings(data.settings);setRelations(data.relations);setBlocked(data.blocked??[]);}
  useEffect(()=>{
    let active = true;
    if(!isLoaded)return;
    (async()=>{
      const token=await tokenRef.current();
      if(!active)return;
      settingsDirty.current=false;setHasChanges(false);setSettings(null);setRelations([]);setManagedFriend(null);setResults([]);setError('');setBlocked([]);setReportTarget(null);setNotice('');
      if(!token) throw new Error('ログインしてください。');
      const data=await apiRequest<{settings:Settings;relations:Relation[];blocked?:{id:string}[]}>('/api/friends',{token,method:'GET'});
      if(active){if(!settingsDirty.current)setSettings(data.settings);setRelations(data.relations);setBlocked(data.blocked??[]);}
    })().catch(e=>{if(active)setError(e instanceof Error?e.message:'読み込めませんでした。');});
    return ()=>{active=false;};
  },[userId,isLoaded]);
  async function saveSettings(){if(busy||!settings)return;setBusy(true);setError('');try{await api('/api/friends',{action:'settings',alias:settings.alias?.trim()||null,emailSearchEnabled:settings.emailSearchEnabled,shareTraining:settings.shareTraining});settingsDirty.current=false;setHasChanges(false);await reload();}catch(e){setError(e instanceof Error?e.message:'設定を保存できませんでした。');}finally{setBusy(false);}}
  async function act(body:unknown){if(busy)return;setBusy(true);setError('');try{await api('/api/friends',body);setManagedFriend(null);setResults([]);await reload();}catch(e){setError(e instanceof Error?e.message:'操作できませんでした。');}finally{setBusy(false);}}
  async function search(){if(busy)return;Keyboard.dismiss();setBusy(true);setError('');setResults([]);try{const r=await api<{results:{id:string;name:string}[]}>('/api/friends',{action:'search',query});setResults(r.results);if(!r.results.length)setError('検索結果はありません。メール検索は相手が許可した場合のみ利用できます。');}catch(e){setError(e instanceof Error?e.message:'検索できませんでした。');}finally{setBusy(false);}}
  function block(id:string){Alert.alert('ブロックしますか？','友達関係を解除し、お互いの検索・申請・記録閲覧を停止します。解除しても友達関係は復元されません。',[{text:'キャンセル'},{text:'ブロック',style:'destructive',onPress:()=>act({action:'block',targetId:id})}]);}
  async function sendReport(reason:'harassment'|'inappropriate'|'spam'|'other'){
    if(!reportTarget||busy)return;setBusy(true);setError('');setNotice('');
    try{await api('/api/friends',{action:'report',targetId:reportTarget.id,reason});setNotice('通報を受け付けました。運営が内容を確認します。相手には通報者を表示しません。');setReportTarget(null);}
    catch(e){setError(e instanceof Error?e.message:'通報できませんでした。');}
    finally{setBusy(false);}
  }
  function safetyActions(relation:Relation){return <View><ActionButton busy={busy} label="通報する" onPress={()=>setReportTarget(relation)}/><ActionButton busy={busy} label="ブロックする" onPress={()=>block(relation.id)}/></View>;}
  const text={color:'#F4F6F3',fontSize:14};const card={padding:16,gap:10,borderWidth:1,borderColor:'#203441',borderRadius:16,backgroundColor:'#0C151D'};
  const friends=relations.filter(r=>r.status==='accepted');
  const incoming=relations.filter(r=>r.status==='pending'&&!r.outgoing);
  const outgoing=relations.filter(r=>r.status==='pending'&&r.outgoing);
  return <SafeAreaView style={{flex:1,backgroundColor:'#050A0F'}}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='android'?'height':undefined}>
    <ScrollView ref={scrollRef} automaticallyAdjustKeyboardInsets keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,paddingBottom:120,gap:16}}>
    <ActionButton busy={busy} label="‹ マイページへ" onPress={()=>router.back()}/>
    <View style={styles.headingRow}><Text style={styles.title}>友達</Text><Pressable accessibilityRole="button" accessibilityLabel="友達の公開設定を開く" accessibilityState={{expanded:showSettings}} onPress={()=>setShowSettings(v=>!v)} style={styles.settingsButton}><Text style={styles.settingsIcon}>＋</Text><Text style={styles.settingsLabel}>設定</Text></Pressable></View>
    <View onLayout={event=>{searchTop.current=event.nativeEvent.layout.y;}}>
      <View style={styles.searchRow}><View style={styles.searchField}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel="友達のユーザーIDまたはメールアドレス" placeholder="ユーザーIDで検索" placeholderTextColor="#858D94" autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={search} onFocus={()=>{scrollRef.current?.scrollTo({y:Math.max(0,searchTop.current-20),animated:true});}} value={query} onChangeText={v=>{setQuery(v);setResults([]);}} maxLength={254} style={styles.searchInput}/></View><Pressable accessibilityRole="button" accessibilityLabel="検索" disabled={busy||!query.trim()} onPress={search} style={[styles.searchButton,(busy||!query.trim())&&styles.disabled]}><Text style={styles.searchButtonText}>検索</Text></Pressable></View>
      <Text style={styles.caption}>IDまたは許可済みメールで完全一致検索 · 30回／日</Text>
      {results.map(r=><View style={styles.friendCard} key={r.id}><View style={styles.avatar}><Text style={styles.avatarText}>{r.name.slice(0,1).toUpperCase()}</Text></View><View style={styles.friendInfo}><Text style={styles.name}>{r.name}</Text><ActionButton busy={busy} label="友達申請を送る" onPress={()=>act({action:'request',targetId:r.id})}/><ActionButton busy={busy} label="ブロックする" onPress={()=>block(r.id)}/></View></View>)}
    </View>
    {busy&&<ActivityIndicator color="#73E7FF"/>}{!!error&&<Text style={{color:'#ff8e83'}}>{error}</Text>}
    {!!notice&&<Text style={text}>{notice}</Text>}
    {settings?.socialSuspended&&<Text style={{color:'#ff8e83'}}>友達機能の公開が停止されています。運営へお問い合わせください。</Text>}
    {!settings&&<ActionButton busy={busy} label="再読み込み" onPress={()=>{reload().catch(e=>setError(e.message));}}/>}
    {showSettings&&settings&&<View style={card}><Text style={styles.sectionTitle}>プロフィール・公開設定</Text><Text selectable style={text}>あなたのユーザーID：{settings.id}</Text>
      <Text style={text}>友達向けの表示名（本名を使う必要はありません）</Text><TextInput editable={!busy} value={settings.alias??''} maxLength={40} onChangeText={alias=>editSettings({alias})} style={{...text,borderColor:'#203441',borderWidth:1,padding:12}}/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={text}>メールでの検索を許可</Text><Switch disabled={busy} accessibilityLabel="メールでの検索を許可" value={settings.emailSearchEnabled} onValueChange={emailSearchEnabled=>editSettings({emailSearchEnabled})}/></View>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={text}>承認済み友達に記録を共有</Text><Switch disabled={busy} accessibilityLabel="承認済み友達に記録を共有" value={settings.shareTraining} onValueChange={shareTraining=>editSettings({shareTraining})}/></View>
      <Text style={text}>写真・体重・体脂肪率・AIチャット・記録メモは公開しません。設定変更は保存後に反映されます。</Text>
      {hasChanges&&<Text style={{color:'#ffb454'}}>未保存の変更があります。下の保存ボタンで反映します。</Text>}
      <ActionButton busy={busy} label="公開設定を保存" onPress={()=>{if(settings.shareTraining||settings.emailSearchEnabled)Alert.alert('公開設定の確認','許可した検索・記録共有が有効になります。',[{text:'キャンセル'},{text:'保存',onPress:saveSettings}]);else void saveSettings();}}/>
    </View>}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showRequests}} onPress={()=>setShowRequests(v=>!v)} style={styles.requestButton}><Text style={styles.requestText}>友達申請 {incoming.length>0?`· 受信${incoming.length}件`:''}{outgoing.length>0?` · 送信${outgoing.length}件`:''}</Text><Text style={styles.chevron}>{showRequests?'⌃':'⌄'}</Text></Pressable>
    {showRequests&&<View style={{gap:12}}><Text style={styles.sectionTitle}>受信した申請</Text>{!incoming.length&&<Text style={styles.caption}>申請はありません。</Text>}{incoming.map(r=><View style={card} key={r.id}><Text style={styles.name}>{r.name}</Text><ActionButton busy={busy} label="承認する" onPress={()=>act({action:'accept',targetId:r.id})}/><ActionButton busy={busy} label="拒否する" onPress={()=>act({action:'reject',targetId:r.id})}/>{safetyActions(r)}</View>)}<Text style={styles.sectionTitle}>送信した申請</Text>{!outgoing.length&&<Text style={styles.caption}>申請はありません。</Text>}{outgoing.map(r=><View style={card} key={r.id}><Text style={styles.name}>{r.name}</Text><ActionButton busy={busy} label="申請を取り消す" onPress={()=>act({action:'cancel',targetId:r.id})}/></View>)}</View>}
    <View style={styles.headingRow}><Text style={styles.sectionTitle}>友達一覧</Text><Text style={styles.count}>{friends.length}人</Text></View>
    {!friends.length&&<View style={styles.emptyCard}><Text style={styles.emptyTitle}>友達を見つけよう</Text><Text style={styles.caption}>相手のユーザーIDを検索して申請できます。承認されると、ここに表示されます。</Text></View>}
    {friends.map(r=><View key={r.id} style={{gap:6}}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${r.name} のカレンダーを開く`} disabled={busy} onPress={()=>router.push(`/friend-calendar?userId=${r.id}` as Href)} style={styles.friendCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{r.name.slice(0,1).toUpperCase()}</Text></View>
        <View style={styles.friendInfo}><Text style={styles.name}>{r.name}</Text><Text style={styles.friendSubtitle}>タップしてカレンダーを見る</Text></View><Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${r.name} の通報・ブロック・解除`} accessibilityState={{expanded:managedFriend===r.id}} disabled={busy} onPress={()=>setManagedFriend(current=>current===r.id?null:r.id)} style={styles.manageButton}><Text style={styles.requestText}>⋯ 管理</Text></Pressable>
      {managedFriend===r.id&&<View style={card}><Text style={styles.caption}>{r.name} の管理</Text>{safetyActions(r)}<ActionButton busy={busy} label="友達を解除" onPress={()=>Alert.alert('友達解除','解除後はお互いの記録を閲覧できません。',[{text:'キャンセル'},{text:'解除',style:'destructive',onPress:()=>act({action:'remove',targetId:r.id})}])}/></View>}
    </View>)}
    <ActionButton busy={busy} label="最新情報に更新" onPress={()=>{setManagedFriend(null);reload().catch(e=>setError(e.message));}}/>
    <ActionButton busy={busy} label="安全な利用について・運営へのお問い合わせ" onPress={()=>router.push('/friend-safety' as Href)}/>
    {showSettings&&<View style={{gap:12}}><Text style={styles.sectionTitle}>ブロックしたユーザー</Text>{!blocked.length&&<Text style={styles.caption}>ブロックしたユーザーはいません。</Text>}{blocked.map(r=><View style={card} key={r.id}><Text selectable style={text}>{r.id}</Text><ActionButton busy={busy} label="ブロックを解除" onPress={()=>Alert.alert('ブロック解除','友達関係は復元されません。共有には再度の申請と承認が必要です。',[{text:'キャンセル'},{text:'解除',onPress:()=>act({action:'unblock',targetId:r.id})}])}/></View>)}</View>}
  </ScrollView></KeyboardAvoidingView>
  <Modal visible={reportTarget!==null} transparent animationType="fade" onRequestClose={()=>{if(!busy)setReportTarget(null);}}>
    <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#000a'}}><View style={card}>
      <Text style={{...text,fontSize:22}}>通報する</Text><Text style={text}>対象：{reportTarget?.name}。理由を選んで運営へ送信してください。対象の表示名と公開中の種目名（最大20件）、双方のユーザーIDも運営へ送ります。写真・重量・体重・会話は送信しません。</Text>
      {([['harassment','嫌がらせ・脅迫'],['inappropriate','不適切な表示名・記録'],['spam','迷惑行為・スパム'],['other','その他']] as const).map(([reason,label])=><ActionButton key={reason} busy={busy} label={label} onPress={()=>{void sendReport(reason);}}/>)}
      {!!error&&<Text style={{color:'#ff8e83'}}>{error}</Text>}<ActionButton busy={busy} label="キャンセル" onPress={()=>setReportTarget(null)}/>
    </View></View>
  </Modal></SafeAreaView>;
}
function ActionButton({label,onPress,busy}:{label:string;onPress:()=>void;busy:boolean}){return <Pressable disabled={busy} onPress={onPress} accessibilityRole="button"><Text style={{color:'#73E7FF',paddingVertical:10,opacity:busy?0.5:1}}>{label}</Text></Pressable>;}
const styles=StyleSheet.create({
  headingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  title:{fontSize:30,fontWeight:'800',color:'#F4F6F3'},sectionTitle:{fontSize:21,fontWeight:'700',color:'#F4F6F3',flexShrink:1},
  settingsButton:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},settingsIcon:{color:'#F4F6F3',fontSize:28},settingsLabel:{color:'#939DA5',fontSize:11},
  searchRow:{flexDirection:'row',alignItems:'center',gap:10},searchField:{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:'#20262C',borderRadius:20,paddingHorizontal:14,minHeight:56},searchIcon:{fontSize:28,color:'#939DA5',marginRight:8},searchInput:{flex:1,minWidth:0,color:'#F4F6F3',fontSize:16,paddingVertical:16},
  searchButton:{backgroundColor:'#F4F6F3',borderRadius:28,minHeight:50,minWidth:72,paddingHorizontal:18,justifyContent:'center',alignItems:'center'},searchButtonText:{color:'#050A0F',fontSize:16,fontWeight:'700'},disabled:{opacity:0.45},
  caption:{color:'#939DA5',fontSize:12,lineHeight:19,marginTop:6},count:{color:'#939DA5',fontSize:14},
  requestButton:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:44},requestText:{color:'#73E7FF',fontSize:13},
  friendCard:{flexDirection:'row',alignItems:'center',gap:14,padding:16,borderWidth:1,borderColor:'#24323C',borderRadius:24,backgroundColor:'#080F15'},manageButton:{alignSelf:'flex-end',minHeight:44,paddingHorizontal:12,justifyContent:'center'},
  avatar:{width:48,height:48,borderRadius:24,backgroundColor:'#242D34',justifyContent:'center',alignItems:'center'},avatarText:{color:'#F4F6F3',fontSize:21,fontWeight:'700'},friendInfo:{flex:1,minWidth:0},name:{fontSize:19,fontWeight:'700',color:'#F4F6F3'},friendSubtitle:{color:'#939DA5',fontSize:13,lineHeight:21,marginTop:5},chevron:{color:'#939DA5',fontSize:26},
  emptyCard:{padding:20,borderRadius:24,borderWidth:1,borderColor:'#24323C'},emptyTitle:{fontSize:17,fontWeight:'700',color:'#F4F6F3'},divider:{height:1,backgroundColor:'#202C35',marginVertical:8},
  recordCard:{borderWidth:1,borderColor:'#24323C',borderRadius:24,padding:18,gap:18,backgroundColor:'#080F15'},badge:{backgroundColor:'#242D34',paddingHorizontal:12,paddingVertical:6,borderRadius:18},badgeText:{color:'#B6BEC4',fontSize:12},exerciseName:{color:'#F4F6F3',fontSize:16,fontWeight:'600'},detailButton:{borderRadius:28,borderWidth:1,borderColor:'#42505A',minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:12},detailText:{color:'#B6BEC4',fontSize:14,fontWeight:'600'},
});
