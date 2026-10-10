import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { lineSegments, type ChartPoint } from '../../../shared/longChart';

export const percentLabel = (value:number|null) => value===null?'データなし':`${value.toFixed(1)}%`;
const averageColor='#B497FF', individualColor='#00C8FF';
export function RetentionLineChart({points,individual=false}:{points:ChartPoint[];individual?:boolean}) {
  const [width,setWidth]=useState(320);
  const [selected,setSelected]=useState<string|null>(null);
  const height=260;
  const visible=points.map(p=>({...p,individual:individual?p.individual:null}));
  const average=lineSegments(visible,'percent',width,height);
  const own=lineSegments(visible,'individual',width,height);
  const selectedPoint=points.find(p=>p.start===selected)??points.at(-1);
  const labelIndexes=[...new Set([0,Math.floor((points.length-1)/2),points.length-1])].filter(i=>i>=0);
  const hasData=visible.some(p=>p.percent!==null||p.individual!==null);
  return <View style={styles.card} onLayout={event=>setWidth(Math.max(240,event.nativeEvent.layout.width-28))}>
    <View style={styles.legend}><Text style={{color:averageColor}}>● 全ユーザー平均</Text>{individual&&<Text style={{color:individualColor}}>● 選択ユーザー</Text>}</View>
    {!hasData?<View style={styles.empty}><Text style={styles.text}>この期間は集計可能なデータがありません</Text><Text style={styles.muted}>未設定・登録前を0%として表示しません。</Text></View>:<Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel={individual?'個人と全ユーザー平均の筋トレ目標達成率比較':'全ユーザー平均の筋トレ目標達成率推移'}>
      {[0,0.25,0.5,0.75,1].map(ratio=>{const y=15+(1-ratio)*(height-45);return <ViewGrid key={ratio} width={width} y={y} label={`${Math.round(average.max*ratio)}`} />;})}
      {average.paths.map((d,i)=><Path key={`average-${i}`} d={d} stroke={averageColor} strokeWidth={3} fill="none"/>)}
      {individual&&own.paths.map((d,i)=><Path key={`own-${i}`} d={d} stroke={individualColor} strokeWidth={3} fill="none"/>)}
      {visible.flatMap((point,i)=>(['percent','individual'] as const).map(key=>{
        const value=point[key];if(value===null)return null;
        const x=35+i/Math.max(1,points.length-1)*(width-55),y=15+(1-value/average.max)*(height-45);
        return <Circle key={`${point.start}-${key}`} cx={x} cy={y} r={points.length<=32?5:2.5} fill={key==='percent'?averageColor:individualColor} stroke="#0C151D" strokeWidth={1} onPress={()=>setSelected(point.start)}/>;
      }))}
      {labelIndexes.map(i=><SvgText key={i} x={35+i/Math.max(1,points.length-1)*(width-55)} y={height-7} textAnchor={i===0?'start':i===points.length-1?'end':'middle'} fill="#94AAB5" fontSize={11}>{points[i].start.slice(2)}</SvgText>)}
    </Svg>}
    <Text style={styles.muted}>縦軸：達成率（%）／横軸：日本時間の集計期間</Text>
    {hasData&&selectedPoint&&<Text style={styles.text}>{selectedPoint.start}　平均 {percentLabel(selectedPoint.percent)}{individual?` ／ 個人 ${percentLabel(selectedPoint.individual)}`:''}</Text>}
    <Text style={styles.muted}>欠測期間は線をつなぎません。点をタップすると数値を確認できます。</Text>
  </View>;
}
function ViewGrid({width,y,label}:{width:number;y:number;label:string}) {
  return <><Line x1={35} x2={width-20} y1={y} y2={y} stroke="#283C49" strokeDasharray="4 5"/><SvgText x={30} y={y+4} textAnchor="end" fill="#94AAB5" fontSize={11}>{label}</SvgText></>;
}
const styles=StyleSheet.create({card:{backgroundColor:'#0C151D',borderRadius:20,padding:14,gap:12,borderWidth:1,borderColor:'#203441'},legend:{flexDirection:'row',flexWrap:'wrap',gap:12},text:{color:'#F4F6F3',fontSize:13},muted:{color:'#94AAB5',fontSize:12},empty:{height:200,justifyContent:'center',gap:12}});
