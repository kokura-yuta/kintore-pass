import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function FoodCalendar({ selectedDate, onSelect }: { selectedDate: string; onSelect: (date: string) => void }) {
  const [month, setMonth] = useState(selectedDate.slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const offset = new Date(year, monthNumber - 1, 1).getDay();
  const days = new Date(year, monthNumber, 0).getDate();
  function move(delta: number) {
    const date = new Date(year, monthNumber - 1 + delta, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return <View style={styles.card}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="前の月" disabled={month === '2000-01'} onPress={() => move(-1)} style={styles.button}><Text style={styles.blue}>‹ 前月</Text></Pressable>
      <Text style={styles.title}>{year}年{monthNumber}月</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="次の月" disabled={month === '9999-12'} onPress={() => move(1)} style={styles.button}><Text style={styles.blue}>翌月 ›</Text></Pressable>
    </View>
    <View style={styles.grid}>
      {['日', '月', '火', '水', '木', '金', '土'].map(day => <View key={day} style={styles.cell}><Text style={styles.muted}>{day}</Text></View>)}
      {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
        const day = index - offset + 1;
        if (day < 1 || day > days) return <View key={index} style={styles.cell} />;
        const date = `${month}-${String(day).padStart(2, '0')}`;
        return <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${date}の食事を見る`}
          accessibilityState={{ selected: date === selectedDate }} onPress={() => onSelect(date)}
          style={[styles.cell, date === selectedDate && styles.selected]}><Text style={styles.title}>{day}</Text></Pressable>;
      })}
    </View>
    <Text style={styles.note}>日付を押すと、その日の食事を下に表示します。</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 10, borderWidth: 1, borderColor: '#203441', borderRadius: 17, backgroundColor: '#091118' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  selected: { backgroundColor: '#125169' },
  title: { color: '#F4F6F3', fontSize: 14, fontWeight: '600' },
  muted: { color: '#99AAB4', fontSize: 12 },
  blue: { color: '#73E7FF', fontSize: 13 },
  note: { color: '#99AAB4', fontSize: 11, marginVertical: 10, textAlign: 'center' },
});
