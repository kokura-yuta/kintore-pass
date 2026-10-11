import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function FriendSafetyScreen(){
  const router=useRouter();
  return <SafeAreaView style={{flex:1,backgroundColor:'#050A0F'}}><ScrollView contentContainerStyle={{padding:24,gap:20}}>
    <Pressable onPress={()=>router.back()}><Text style={{color:'#73E7FF'}}>‹ 友達へ戻る</Text></Pressable>
    <Text style={{color:'#F4F6F3',fontSize:26,fontWeight:'700'}}>友達機能を安全に使うために</Text>
    <Text style={{color:'#F4F6F3',fontSize:16,lineHeight:27}}>嫌がらせ、脅迫、差別、性的・暴力的な内容、違法行為、迷惑な勧誘は禁止です。表示名と記録の共有内容にも適用します。不適切な表現は非表示にする場合があります。</Text>
    <Text style={{color:'#F4F6F3',fontSize:16,lineHeight:27}}>申請・友達一覧の「通報する」から理由を選んで運営へ送れます。通報者の情報は相手に表示しません。運営が確認し、必要に応じて共有停止などに対応します。</Text>
    <Text style={{color:'#F4F6F3',fontSize:16,lineHeight:27}}>「ブロックする」で友達関係を解除し、お互いの検索・申請・記録閲覧を停止します。解除後も友達関係は自動復元しません。既に撮られたスクリーンショットまでは消去できません。</Text>
    <Pressable onPress={()=>{void Linking.openURL('mailto:kintore505@gmail.com');}}><Text style={{color:'#73E7FF',fontSize:16}}>運営へのお問い合わせ：kintore505@gmail.com</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
