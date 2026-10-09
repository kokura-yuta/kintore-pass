import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminRetention } from '@/components/AdminRetention';
export default function RetentionScreen() {
  const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#050A0F' }}><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}><Pressable onPress={() => router.back()}><Text style={{ color: '#73E7FF', padding: 10 }}>‹ 運営ダッシュボード</Text></Pressable><AdminRetention /></ScrollView></SafeAreaView>;
}
