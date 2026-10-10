'use client';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import type { RetentionData, LongRetentionData, LongOptions } from '@/shared/retention';
import { LongAnalysis } from './LongAnalysis';
import styles from '../page.module.css';
import local from './retention.module.css';

const percent = (value: number | null) => value === null ? '未設定・未計測' : `${value.toFixed(1)}%`;
export default function RetentionPanel({ compact = false, userId }: { compact?: boolean; userId?: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<(RetentionData & { longTerm: LongRetentionData }) | null>(null);
  const [options, setOptions] = useState<LongOptions>({ range: '1y', unit: 'month', cohortUnit: 'month' });
  const [error, setError] = useState('');
  const [sort, setSort] = useState('seven');
  const selected = userId ?? null;
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    (async () => {
      const token = await getToken();
      const query = new URLSearchParams({ range: options.range, unit: options.unit, cohortUnit: options.cohortUnit, ...(userId ? { userId } : {}) });
      const response = await fetch(`/api/admin/retention?${query}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '取得できませんでした。');
      if (active) { setData(result); setError(''); }
    })().catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : '取得できませんでした。'); });
    return () => { active = false; };
  }, [getToken, isLoaded, isSignedIn, revision, options, userId]);
  if (!isLoaded) return <p>認証確認中…</p>;
  if (!isSignedIn) return <p>管理者でログインしてください。<Link href="/admin">管理画面へ</Link></p>;
  if (error) return <p className={styles.error}>{error} <button onClick={() => setRevision((v) => v + 1)}>再試行</button></p>;
  if (!data) return <p>継続状況を集計しています…</p>;
  const s = data.summary;
  const detail = data.rows.find((u) => u.id === selected);
  const rows = [...data.rows].sort((a, b) => sort === 'last'
    ? (a.lastTrainingDate ?? '').localeCompare(b.lastTrainingDate ?? '')
    : (sort === 'seven' ? a.seven.percent ?? Infinity : a.twentyEight.percent ?? Infinity) - (sort === 'seven' ? b.seven.percent ?? Infinity : b.twentyEight.percent ?? Infinity));
  return <section>
    <header className={styles.header}><div><p>ADMIN ONLY · TRAINING & APP RETENTION</p><h2>継続率分析</h2><span>{new Date(data.generatedAt).toLocaleString('ja-JP')} 時点</span></div>
      {compact ? <Link href="/admin/retention">ユーザー別に見る →</Link> : <button onClick={() => setRevision((v) => v + 1)}>最新データに更新</button>}</header>
    <div className={styles.grid}>
      {[
        ['平均筋トレ達成率・7日', percent(s.meanSeven.percent), `対象 ${s.meanSeven.users}人`],
        ['平均筋トレ達成率・28日', percent(s.meanTwentyEight.percent), `対象 ${s.meanTwentyEight.users}人`],
        ['総登録ユーザー', `${s.totalUsers}人`, ''], ['7日／28日に記録', `${s.activeSeven}／${s.activeTwentyEight}人`, ''],
        ['頻度低下', `${s.declining}人`, '記録からの推定'], ['活動なし', `${s.inactive}人`, `${data.rules.inactiveDays}日間記録なし`],
        ...data.appRetention.map((r) => [`アプリ${r.day}日後継続率`, percent(r.percent), `継続 ${r.retained}／対象 ${r.eligible}人・未計測 ${r.unmeasured}人`]),
      ].map(([label, value, note]) => <article className={styles.card} key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
    </div>
    <p className={styles.kind}>{data.goalBasis}</p><p className={styles.kind}>{data.activityBasis}</p>
    <p className={styles.kind}>筋トレ記録による分類はアプリ離脱の確定ではありません。達成率は個人ごとの算術平均です。</p>
    {!compact && <>
      <LongAnalysis data={data.longTerm} options={options} onChange={v => { setOptions(v); setData(null); }} />
      {!userId && <><article className={styles.panel}><h2>過去8週間・平均筋トレ達成率</h2><Trend values={data.weeklyMeans.map((w) => ({ label: w.start, value: w.percent, note: `対象${w.users}人` }))} /></article>
      <article className={styles.panel}><h2>登録週別・アプリ7日後継続率</h2><Trend values={data.cohorts.map((w) => ({ label: w.start, value: w.percent, note: `${w.retained}/${w.eligible}人・未計測${w.unmeasured}` }))} /></article>
      <article className={styles.panel}><h2>ユーザー一覧</h2><label>並び替え <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}><option value="seven">7日達成率が低い順</option><option value="twentyEight">28日達成率が低い順</option><option value="last">最終筋トレ日が古い順（未実施が先頭）</option></select></label>
        <div className={local.table}><table><thead><tr>{['ユーザー', '登録日', '週目標', '7日実施', '7日達成率', '28日達成率', '最終筋トレ日', '継続状況'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>
          {rows.slice(page * 50, (page + 1) * 50).map((u) => <tr key={u.id}><td><Link href={`/admin/retention/${u.id}`}>{u.displayName || u.id}</Link></td><td>{u.registeredOn}</td><td>{u.weeklyGoal ?? '未設定'}</td><td>{u.seven.actual}回</td><td>{percent(u.seven.percent)}{u.seven.partial ? '（部分期間）' : ''}</td><td>{percent(u.twentyEight.percent)}{u.twentyEight.observedDays < 28 ? '（部分期間）' : ''}</td><td>{u.lastTrainingDate || '記録なし'}</td><td>{u.status}</td></tr>)}
        </tbody></table></div>
        <button disabled={page === 0} onClick={() => setPage((v) => v - 1)}>前へ</button> {page + 1}ページ <button disabled={(page + 1) * 50 >= rows.length} onClick={() => setPage((v) => v + 1)}>次へ</button>
      </article></>}
      {userId && !detail && <p>対象ユーザーが存在しないか、削除されています。</p>}
      {detail && <article className={styles.panel}><h2>{detail.displayName || detail.id} の詳細</h2><p>登録から{detail.ageDays}日／週目標 {detail.weeklyGoal ?? '未設定'}回／累計{detail.totalTrainingDays}日／最終 {detail.lastTrainingDate || '記録なし'}</p>
        <p>7日 {percent(detail.seven.percent)}・28日 {percent(detail.twentyEight.percent)}／{detail.status}</p>
        <h3>8週間の目標（灰）と実績（青）</h3>
        <div className={styles.bars}>{detail.weeks.map((w) => {
          const max = Math.max(7, ...detail.weeks.map((v) => Math.max(v.actual, v.target ?? 0)));
          return <div className={styles.barColumn} key={w.start}><span>{w.actual}／{w.target?.toFixed(1) ?? '未設定'}回</span><div className={local.pair}><div style={{ height: `${(w.target ?? 0) / max * 140}px`, background: '#657681' }} /><div style={{ height: `${w.actual / max * 140}px`, background: '#00d4ff' }} /></div><span>{w.start.slice(5)}{w.partial ? '部分週' : ''}</span></div>;
        })}</div><h3>目標達成率の推移</h3><Trend values={detail.weeks.map((w) => ({ label: w.start, value: w.percent, note: `${w.observedDays}日分` }))} />
      </article>}
    </>}
  </section>;
}
function Trend({ values }: { values: { label: string; value: number | null; note: string }[] }) {
  const max = Math.max(100, ...values.map((v) => v.value ?? 0));
  return <div className={styles.bars}>{values.map((v) => <div key={v.label} className={styles.barColumn}><span>{percent(v.value)}</span><div className={styles.barTrack}><div className={styles.revenueBar} style={{ height: `${(v.value ?? 0) / max * 100}%` }} /></div><span>{v.label.slice(5)}</span><small>{v.note}</small></div>)}</div>;
}
