import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { LongOptions, LongRetentionData } from '../../../shared/retention';
import { lineSegments } from '../../../shared/longChart';
const pct = (v: number | null) => v === null ? 'データなし' : `${v.toFixed(1)}%`;
export function LongRetention({ data, options, onChange }: { data: LongRetentionData; options: LongOptions; onChange: (v: LongOptions) => void }) {
  const color='#73E7FF'; const label={color:'#F4F6F3',fontSize:13};
  const lines=lineSegments(data.points,'percent'); const own=lineSegments(data.points,'individual');
  return <View style={{gap:12,padding:12,borderWidth:1,borderColor:'#203441',borderRadius:14}}>
    <Text style={{...label,fontSize:20,fontWeight:'700'}}>長期推移・個人と平均</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{(['1m','3m','6m','1y','all'] as const).map((v,i)=><Pressable key={v} onPress={()=>onChange({...options,range:v})}><Text style={{color,padding:6}}>{options.range===v?'● ':''}{['1か月','3か月','6か月','1年','全期間'][i]}</Text></Pressable>)}</View>
    <View style={{flexDirection:'row',gap:12}}>{(['day','week','month'] as const).map((v,i)=><Pressable key={v} onPress={()=>onChange({...options,unit:v})}><Text style={{color,padding:6}}>{options.unit===v?'● ':''}{['日別','週別','月別'][i]}</Text></Pressable>)}</View>
    <Text style={label}>{data.start}〜{data.end} 平均{pct(data.average.percent)}（{data.average.users}人）</Text>
    <Text style={label}>今月{pct(data.monthComparison.current.percent)}／前月{pct(data.monthComparison.previous.percent)}／差{data.monthComparison.difference?.toFixed(1)??'—'}pt</Text><Text style={label}>{data.monthComparison.note}</Text>
    <Text style={label}>青：全体平均　橙：個人／未計測・登録前は線なし</Text>
    <Svg width="100%" height={240} viewBox="0 0 760 240" accessibilityLabel="筋トレ達成率の長期比較グラフ"><Line x1={35} x2={740} y1={210} y2={210} stroke="#657681" />
      <SvgText x={0} y={20} fill={color} fontSize={12}>{lines.max.toFixed(0)}%</SvgText>
      {lines.paths.map((d,i)=><Path key={`a${i}`} d={d} stroke="#00d4ff" strokeWidth={3} fill="none" />)}{own.paths.map((d,i)=><Path key={`u${i}`} d={d} stroke="#ffb454" strokeWidth={3} fill="none" />)}
      {data.points.flatMap((p,i)=>{const x=35+i/Math.max(1,data.points.length-1)*705;return (['percent','individual'] as const).map(k=>p[k]===null?null:<Circle key={`${p.start}-${k}`} cx={x} cy={15+(1-p[k]!/lines.max)*195} r={2} fill={k==='percent'?color:'#ffb454'}/>);})}
      <SvgText x={0} y={212} fill={color} fontSize={12}>0%</SvgText><SvgText x={35} y={232} fill={color} fontSize={12}>{data.start}</SvgText><SvgText x={660} y={232} fill={color} fontSize={12}>{data.end}</SvgText>
    </Svg>
    <ScrollView style={{maxHeight:220}} nestedScrollEnabled>{data.points.map(p=><Text style={label} key={p.start}>{p.start}：平均{pct(p.percent)}（{p.users}人）／個人{pct(p.individual)}／差{p.difference?.toFixed(1)??'—'}pt／推定目標{p.estimatedUsers}人</Text>)}</ScrollView>
    <Text style={{...label,fontWeight:'700'}}>登録時期別・アプリ継続率</Text>
    <View style={{flexDirection:'row',gap:16}}>{(['week','month'] as const).map(v=><Pressable key={v} onPress={()=>onChange({...options,cohortUnit:v})}><Text style={{color,padding:6}}>{options.cohortUnit===v?'● ':''}{v==='week'?'登録週':'登録月'}</Text></Pressable>)}</View>
    <ScrollView style={{maxHeight:260}} nestedScrollEnabled>{data.cohorts.map(c=><View key={c.start} style={{marginBottom:14,gap:4}}><Text style={label}>{c.start}（登録{c.registered}人）</Text>{c.metrics.map(m=><View key={m.day}><Text style={label}>D{m.day} {pct(m.percent)} · 継続{m.retained}/対象{m.eligible} · 未計測{m.unmeasured}</Text><View style={{height:5,backgroundColor:'#203441'}}><View style={{height:5,width:`${Math.min(100,m.percent??0)}%`,backgroundColor:'#b497ff'}}/></View></View>)}</View>)}</ScrollView>
    <Text style={label}>{data.goalBasis}</Text>
  </View>;
}
