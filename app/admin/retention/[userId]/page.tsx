import Link from 'next/link';
import RetentionPanel from '../RetentionPanel';
import styles from '../../page.module.css';
export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <main className={styles.page}><Link href="/admin/retention">‹ ユーザー一覧へ</Link><RetentionPanel userId={userId} /></main>;
}
