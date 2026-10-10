export type ChartPoint = { start: string; percent: number | null; individual: number | null };
// nullで線を分割し、登録前・未計測期間を0%へ結ばない。
export function lineSegments(points: ChartPoint[], key: 'percent' | 'individual', width = 760, height = 240) {
  const max = Math.max(100, ...points.flatMap(p => [p.percent ?? 0, p.individual ?? 0]));
  const paths: string[] = []; let path = '';
  points.forEach((point, index) => {
    const value = point[key];
    if (value === null) { if (path) paths.push(path); path = ''; return; }
    const x = 35 + index / Math.max(1, points.length - 1) * (width - 55);
    const y = 15 + (1 - value / max) * (height - 45);
    path += `${path ? ' L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  });
  if (path) paths.push(path);
  return { paths, max };
}
