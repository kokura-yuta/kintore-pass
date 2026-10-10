import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LongOptions, LongRetentionData } from '../../../shared/retention';
import { RetentionLineChart, percentLabel as pct } from './RetentionLineChart';
export function LongRetention({ data, options, onChange, individual=false }: { data: LongRetentionData; options: LongOptions; onChange: (v: LongOptions) => void;individual?:boolean }) {
  const [details,setDetails]=useState(false);
  const [retentionDay,setRetentionDay]=useState(7);
  const latest=data.points.filter(p=>p.difference!==null).at(-1);
  const cohorts=data.cohorts.filter(c=>c.registered>0);
  return <View style={styles.section}>
    <Text style={styles.title}>{individual?'個人と全体平均の比較':'平均目標達成率の推移'}</Text>
    <View style={styles.controls}>{(['1m','3m','6m','1y','all'] as const).map((v,i)=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:options.range===v}} style={[styles.pill,options.range===v&&styles.selected]} onPress={()=>onChange({...options,range:v})}><Text style={styles.text}>{['1か月','3か月','6か月','1年','全期間'][i]}</Text></Pressable>)}</View>
    <View style={styles.controls}>{(['day','week','month'] as const).map((v,i)=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:options.unit===v}} style={[styles.pill,options.unit===v&&styles.selected]} onPress={()=>onChange({...options,unit:v})}><Text style={styles.text}>{['日別','週別','月別'][i]}</Text></Pressable>)}</View>
    <Text style={styles.muted}>{data.start} 〜 {data.end}</Text>
    <View style={styles.card}><Text style={styles.muted}>{individual?'選択ユーザー・期間内達成率':'全ユーザー・期間内平均'}</Text><Text style={styles.value}>{pct(individual?data.individual?.percent??null:data.average.percent)}</Text><Text style={styles.muted}>全体平均 {pct(data.average.percent)} ／ 集計対象 {data.average.users}人</Text></View>
    <RetentionLineChart points={data.points} individual={individual}/>
    {individual?<View style={styles.card}><Text style={styles.muted}>最新の集計期間・全体平均との差</Text><Text style={styles.value}>{latest?.difference!=null?`${latest.difference>0?'+':''}${latest.difference.toFixed(1)}ポイント`:'比較データなし'}</Text><Text style={styles.muted}>{latest?`${latest.start} 〜 ${latest.end}`:'個人と平均の両方が集計できた期間に表示します。'}</Text></View>:<View style={styles.card}><Text style={styles.text}>今月 {pct(data.monthComparison.current.percent)} ／ 前月 {pct(data.monthComparison.previous.percent)}</Text><Text style={styles.muted}>差 {data.monthComparison.difference?.toFixed(1)??'—'}ポイント。{data.monthComparison.note}</Text></View>}
    <Pressable accessibilityRole="button" onPress={()=>setDetails(v=>!v)}><Text style={styles.link}>{details?'期間別の数値を閉じる −':'期間別の数値・集計人数を見る ＋'}</Text></Pressable>
    {details&&data.points.map(p=><View style={styles.row} key={p.start}><Text style={styles.text}>{p.start} 〜 {p.end}</Text><Text style={styles.text}>平均 {pct(p.percent)}{individual?` ／ 個人 ${pct(p.individual)}`:''}</Text><Text style={styles.muted}>対象 {p.users}人 ／ 過去の目標を推定した人 {p.estimatedUsers}人{p.partial?' ／ 部分期間':''}</Text></View>)}
    {!individual&&<>
      <Text style={styles.title}>アプリ継続率・登録時期別</Text><Text style={styles.muted}>筋トレ達成率とは別指標です。起動・利用イベントで判定します。</Text>
      <View style={styles.controls}>{(['week','month'] as const).map(v=><Pressable key={v} style={[styles.pill,options.cohortUnit===v&&styles.selected]} onPress={()=>onChange({...options,cohortUnit:v})}><Text style={styles.text}>{v==='week'?'登録週':'登録月'}</Text></Pressable>)}</View>
      <View style={styles.controls}>{[7,14,30,60,90].map(day=><Pressable key={day} style={[styles.pill,day===retentionDay&&styles.selected]} onPress={()=>setRetentionDay(day)}><Text style={styles.text}>D{day}</Text></Pressable>)}</View>
      <View style={styles.card}>{!cohorts.length&&<Text style={styles.muted}>この期間に登録したユーザーはいません。</Text>}{cohorts.map(c=>{const m=c.metrics.find(m=>m.day===retentionDay)!;return <View key={c.start} style={styles.row}><Text style={styles.text}>{c.start}　{pct(m.percent)}</Text>{m.percent!==null&&<View style={styles.track}><View style={{height:10,width:`${Math.min(100,m.percent)}%`,backgroundColor:'#B497FF',borderRadius:5}}/></View>}<Text style={styles.muted}>登録 {c.registered}人 ／ 継続 {m.retained} ／ 対象 {m.eligible}人・未計測 {m.unmeasured}人</Text></View>;})}</View>
    </>}
    <Text style={styles.muted}>{data.goalBasis}</Text>
  </View>;
}
const styles=StyleSheet.create({section:{gap:14},title:{color:'#F4F6F3',fontSize:20,fontWeight:'700'},controls:{flexDirection:'row',flexWrap:'wrap',gap:8},pill:{paddingVertical:10,paddingHorizontal:12,borderRadius:18,backgroundColor:'#0C151D',borderWidth:1,borderColor:'#203441'},selected:{backgroundColor:'#123747',borderColor:'#73E7FF'},text:{color:'#F4F6F3',fontSize:14},muted:{color:'#94AAB5',fontSize:12,lineHeight:19},card:{padding:16,gap:10,backgroundColor:'#0C151D',borderRadius:18,borderWidth:1,borderColor:'#203441'},value:{color:'#F4F6F3',fontSize:28,fontWeight:'700'},link:{color:'#73E7FF',paddingVertical:12},row:{gap:6,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#203441'},track:{height:10,backgroundColor:'#203441',borderRadius:5,overflow:'hidden'}});
