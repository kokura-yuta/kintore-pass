import Link from 'next/link';
import RetentionPanel from './RetentionPanel';
import styles from '../page.module.css';
export default function Page() {
  return <main className={styles.page}><Link href="/admin">‹ 運営ダッシュボード</Link><RetentionPanel /></main>;
}
