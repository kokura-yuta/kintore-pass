'use client';
import type { LongOptions, LongRetentionData } from '@/shared/retention';
import { lineSegments } from '@/shared/longChart';
const pct = (v: number | null) => v === null ? 'データなし' : `${v.toFixed(1)}%`;
export function LongAnalysis({ data, options, onChange }: { data: LongRetentionData; options: LongOptions; onChange: (v: LongOptions) => void }) {
  const overall = lineSegments(data.points, 'percent'); const own = lineSegments(data.points, 'individual');
  return <section style={{ margin: '24px 0', border: '1px solid #203441', borderRadius: 16, padding: 20 }}>
    <h2>長期の筋トレ目標達成率</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <label>期間 <select value={options.range} onChange={e => onChange({ ...options, range: e.target.value as LongOptions['range'] })}>{[['1m','1か月'],['3m','3か月'],['6m','6か月'],['1y','1年'],['all','全期間']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label>集計 <select value={options.unit} onChange={e => onChange({ ...options, unit: e.target.value as LongOptions['unit'] })}>{[['day','日別'],['week','週別'],['month','月別']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label>登録時期 <select value={options.cohortUnit} onChange={e => onChange({ ...options, cohortUnit: e.target.value as LongOptions['cohortUnit'] })}><option value="week">登録週</option><option value="month">登録月</option></select></label>
    </div>
    <p>{data.start} 〜 {data.end}｜期間平均 {pct(data.average.percent)}（対象{data.average.users}人）{data.individual && `｜個人 ${pct(data.individual.percent)}`}</p>
    <p>今月 {pct(data.monthComparison.current.percent)}／前月 {pct(data.monthComparison.previous.percent)}／差 {data.monthComparison.difference?.toFixed(1) ?? '—'}ポイント</p>
    <small>{data.monthComparison.note}</small>
    <p>青：全ユーザー平均　橙：選択した個人（欠測箇所は線を繋ぎません）</p>
    <svg viewBox="0 0 760 240" role="img" aria-label="全ユーザー平均と個人の目標達成率の長期比較" style={{ width: '100%', maxHeight: 300 }}>
      <line x1="35" x2="740" y1="210" y2="210" stroke="#657681" /><text x="0" y="25" fill="#94AAB5" fontSize="12">{overall.max.toFixed(0)}%</text><text x="0" y="212" fill="#94AAB5" fontSize="12">0%</text>
      {overall.paths.map((d,i) => <path key={`a${i}`} d={d} stroke="#00d4ff" strokeWidth="3" fill="none" />)}
      {own.paths.map((d,i) => <path key={`u${i}`} d={d} stroke="#ffb454" strokeWidth="3" fill="none" />)}
      {data.points.map((p,i) => { const x = 35 + i / Math.max(1,data.points.length-1)*705; return <g key={p.start}>
        {[['percent','#00d4ff'],['individual','#ffb454']].map(([k,c]) => { const v = p[k as 'percent'|'individual']; return v === null ? null : <circle key={k} cx={x} cy={15+(1-v/overall.max)*195} r="3" fill={c}><title>{`${p.start}〜${p.end} ${pct(v)} 対象${p.users}人`}</title></circle>; })}
        {(i===0 || i===data.points.length-1) && <text x={i ? x-80 : x} y="225" fill="#94AAB5" fontSize="12">{p.start}</text>}
      </g>; })}
    </svg>
    <details><summary>期間ごとの数値・対象人数・平均との差</summary><div style={{ maxHeight: 320, overflow: 'auto' }}><table><thead><tr>{['期間','平均','人数','個人','平均との差','推定目標の人数'].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{data.points.map(p => <tr key={p.start}><td>{p.start}〜{p.end}</td><td>{pct(p.percent)}</td><td>{p.users}</td><td>{pct(p.individual)}{p.partial?'（部分期間）':''}</td><td>{p.difference?.toFixed(1)??'—'}pt</td><td>{p.estimatedUsers}</td></tr>)}</tbody></table></div></details>
    <h3>登録時期別のアプリ継続率（筋トレ達成率とは別指標）</h3>
    <div style={{ overflowX: 'auto', maxHeight: 400 }}><table><thead><tr><th>登録時期</th>{[7,14,30,60,90].map(d => <th key={d}>D{d}</th>)}</tr></thead><tbody>{data.cohorts.map(c => <tr key={c.start}><td>{c.start}（登録{c.registered}人）</td>{c.metrics.map(m => <td key={m.day}><div style={{ height: 6, width: 100, background: '#203441' }}><div style={{ height: 6, width: `${Math.min(100,m.percent??0)}%`, background: '#b497ff' }} /></div>{pct(m.percent)}<br/><small>継続{m.retained}/対象{m.eligible}・未計測{m.unmeasured}</small></td>)}</tr>)}</tbody></table></div>
    <small>{data.goalBasis}</small>
  </section>;
}
