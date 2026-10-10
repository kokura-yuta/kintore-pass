import { useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '@/lib/api';
import type { RetentionData, LongRetentionData, LongOptions } from '../../../shared/retention';
import { LongRetention } from './LongRetention';
import { percentLabel as pct, RetentionLineChart } from './RetentionLineChart';

export function AdminRetention({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { getToken } = useAuth({ treatPendingAsSignedOut: false });
  const tokenRef = useRef(getToken);
  const [data, setData] = useState<(RetentionData & { longTerm: LongRetentionData }) | null>(null);
  const [options,setOptions] = useState<LongOptions>({range:'6m',unit:'month',cohortUnit:'month'});
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [revision,setRevision] = useState(0);
  const [mode,setMode] = useState<'overall'|'individual'>('overall');
  const [selected,setSelected] = useState<string|null>(null);
  const [picker,setPicker] = useState(false);
  const [more,setMore] = useState(false);
  const [sort,setSort] = useState<'seven'|'twentyEight'|'last'>('seven');
  const [page,setPage] = useState(0);
  useEffect(()=>{tokenRef.current=getToken;},[getToken]);
  useEffect(()=>{
    let active=true;
    (async()=>{
      const token=await tokenRef.current();if(!token)throw new Error('ログインが必要です。');
      if(!active)return;setLoading(true);setError('');
      const query=new URLSearchParams({range:options.range,unit:options.unit,cohortUnit:options.cohortUnit,...(selected?{userId:selected}:{})});
      const result=await apiRequest<RetentionData & {longTerm:LongRetentionData}>(`/api/admin/retention?${query}`,{method:'GET',token,timeoutMs:60_000});
      if(active)setData(result);
    })().catch(e=>{if(active)setError(e instanceof Error?e.message:'取得できませんでした。');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[revision,options,selected]);
  const user=data?.rows.find(u=>u.id===selected);
  const sorted=[...(data?.rows??[])].sort((a,b)=>sort==='last'?(a.lastTrainingDate??'').localeCompare(b.lastTrainingDate??''):(a[sort].percent??Infinity)-(b[sort].percent??Infinity));
  const d30=data?.appRetention.find(r=>r.day===30);
  const summary=data?.summary;
  const selectUser=(id:string)=>{setSelected(id);setPicker(false);};
  return <View style={styles.section}>
    <Text style={styles.title}>継続率分析</Text>
    {!compact&&<View style={styles.tabs}>{(['overall','individual'] as const).map((v,i)=><Pressable key={v} accessibilityRole="tab" accessibilityState={{selected:mode===v}} style={[styles.tab,mode===v&&styles.activeTab]} onPress={()=>{setMode(v);if(v==='overall')setSelected(null);}}><Text style={styles.tabText}>{['全体分析','個人分析'][i]}</Text></Pressable>)}</View>}
    {error&&<View style={styles.card}><Text style={styles.error}>{error}</Text><Pressable onPress={()=>setRevision(v=>v+1)}><Text style={styles.link}>再取得する</Text></Pressable></View>}
    {loading&&<View style={styles.loading}><ActivityIndicator color="#73E7FF"/><Text style={styles.muted}>分析データを取得中…</Text></View>}
    {data&&summary&&(compact||mode==='overall')&&<>
      <View style={styles.grid}>{[
        ['平均目標達成率',summary.meanTwentyEight.percent===null?'集計待ち':pct(summary.meanTwentyEight.percent),`直近28日・対象${summary.meanTwentyEight.users}人`],
        ['30日後アプリ継続率',d30?.percent==null?'未計測':pct(d30.percent),`D30・${d30?.retained??0}/${d30?.eligible??0}人・未計測${d30?.unmeasured??0}人`],
        ['活動ユーザー',`${summary.activeSeven}人`,'直近7日に筋トレ記録あり'],
        ['活動なし',`${summary.inactive}人`,'14日間筋トレ記録なし'],
      ].map(([label,value,note])=><Metric key={label} label={label} value={value} note={note}/>)}</View>
      {compact?<Pressable onPress={()=>router.push('/admin-retention' as Href)}><Text style={styles.link}>全体グラフ・個人分析を見る →</Text></Pressable>:<>
        {!loading&&!error&&<LongRetention data={data.longTerm} options={options} onChange={setOptions}/>}
        <Pressable onPress={()=>setMore(v=>!v)}><Text style={styles.link}>{more?'その他の全体指標を閉じる −':'その他の全体指標を見る ＋'}</Text></Pressable>
        {more&&<><View style={styles.grid}>{[
          ['総登録',`${summary.totalUsers}人`,''],['平均達成率・7日',pct(summary.meanSeven.percent),`対象${summary.meanSeven.users}人`],
          ['記録者・28日',`${summary.activeTwentyEight}人`,''],['頻度低下',`${summary.declining}人`,'記録からの推定'],
          ...data.appRetention.filter(r=>r.day!==30).map(r=>[`アプリD${r.day}`,pct(r.percent),`${r.retained}/${r.eligible}人・未計測${r.unmeasured}人`]),
        ].map(([label,value,note])=><Metric key={label} label={label} value={value} note={note}/>)}</View><Text style={styles.title}>過去8週間の平均達成率</Text><RetentionLineChart points={data.weeklyMeans.map(w=>({...w,individual:null}))}/></>}
        <Text style={styles.muted}>{data.activityBasis}</Text>
      </>}
    </>}
    {!compact&&mode==='individual'&&data&&<>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:picker}} onPress={()=>setPicker(v=>!v)} style={styles.card}><Text style={styles.tabText}>{user?user.displayName||user.id:'分析するユーザーを選択'}　⌄</Text></Pressable>
      {picker&&<View style={styles.card}>
        <View style={styles.tabs}>{(['seven','twentyEight','last'] as const).map((v,i)=><Pressable key={v} onPress={()=>{setSort(v);setPage(0);}}><Text style={styles.link}>{sort===v?'● ':''}{['7日達成率','28日達成率','最終日順'][i]}</Text></Pressable>)}</View>
        <ScrollView style={{maxHeight:280}} nestedScrollEnabled>{sorted.slice(page*25,(page+1)*25).map(u=><Pressable key={u.id} onPress={()=>selectUser(u.id)} style={styles.userRow}><Text style={styles.link}>{u.displayName||u.id}</Text><Text style={styles.muted}>28日 {pct(u.twentyEight.percent)} ／ 最終 {u.lastTrainingDate||'記録なし'} ／ {u.status}</Text></Pressable>)}</ScrollView>
        {!sorted.length&&<Text style={styles.muted}>ユーザーがいません。</Text>}
        <View style={styles.tabs}><Pressable disabled={!page} onPress={()=>setPage(v=>v-1)}><Text style={styles.link}>前へ</Text></Pressable><Text style={styles.muted}>{page+1}ページ</Text><Pressable disabled={(page+1)*25>=sorted.length} onPress={()=>setPage(v=>v+1)}><Text style={styles.link}>次へ</Text></Pressable></View>
      </View>}
      {!user&&<Text style={styles.muted}>ユーザーを選ぶと、個人の推移と全ユーザー平均を比較できます。</Text>}
      {user&&<>
        <View style={styles.grid}><Metric label="目標達成率" value={pct(user.twentyEight.percent)} note="直近28日"/><Metric label="週の目標回数" value={user.weeklyGoal===null?'未設定':`${user.weeklyGoal}回`} note={user.status}/></View>
        <View style={styles.card}><Text style={styles.text}>登録 {user.registeredOn}（{user.ageDays}日目）</Text><Text style={styles.text}>累計筋トレ {user.totalTrainingDays}日 ／ 最終 {user.lastTrainingDate||'記録なし'}</Text><Text style={styles.text}>直近7日 {pct(user.seven.percent)} ／ {user.seven.actual}日実施</Text></View>
        {!loading&&!error&&data.longTerm.selectedUserId===selected&&<LongRetention data={data.longTerm} options={options} onChange={setOptions} individual/>}
        <Text style={styles.title}>週の目標と実績・8週間</Text><Text style={styles.muted}>灰：目標回数 ／ 青：実施日数。部分週は日数按分。</Text>
        <View style={styles.card}>{user.weeks.map(w=><View key={w.start} style={styles.userRow}><Text style={styles.text}>{w.start}　{w.actual}日 ／ 目標 {w.target?.toFixed(1)??'未設定'}回</Text><View style={styles.track}>{w.target!==null&&<View style={[styles.goal,{width:`${Math.min(100,w.target/7*100)}%`}]}/>}</View><View style={styles.track}><View style={[styles.actual,{width:`${Math.min(100,w.actual/7*100)}%`}]}/></View><Text style={styles.muted}>{pct(w.percent)}{w.partial?'・部分週':''}</Text></View>)}</View>
      </>}
    </>}
    {!compact&&<Pressable onPress={()=>setRevision(v=>v+1)}><Text style={styles.link}>最新データに更新</Text></Pressable>}
  </View>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <View style={styles.metric}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{value}</Text><Text style={styles.muted}>{note}</Text></View>;}
const styles=StyleSheet.create({section:{gap:16},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{width:'48%',flexGrow:1,minHeight:120,backgroundColor:'#0C151D',borderRadius:18,padding:14,gap:10,borderWidth:1,borderColor:'#203441'},card:{borderWidth:1,borderColor:'#203441',borderRadius:18,padding:16,gap:10,backgroundColor:'#0C151D'},title:{color:'#F4F6F3',fontSize:22,fontWeight:'700'},text:{color:'#F4F6F3',fontSize:14,lineHeight:22},muted:{color:'#94AAB5',fontSize:12,lineHeight:19},value:{color:'#F4F6F3',fontSize:27,fontWeight:'700'},link:{color:'#73E7FF',paddingVertical:10},error:{color:'#ff8e83'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'},tab:{flex:1,padding:14,borderRadius:16,backgroundColor:'#0C151D',borderWidth:1,borderColor:'#203441',alignItems:'center'},activeTab:{backgroundColor:'#123747',borderColor:'#73E7FF'},tabText:{color:'#F4F6F3',fontSize:15,fontWeight:'600'},loading:{flexDirection:'row',alignItems:'center',gap:10},userRow:{paddingVertical:10,gap:5,borderBottomWidth:1,borderBottomColor:'#203441'},track:{height:8,backgroundColor:'#203441',borderRadius:4,overflow:'hidden',marginVertical:2},goal:{height:8,backgroundColor:'#657681'},actual:{height:8,backgroundColor:'#00C8FF'}});
