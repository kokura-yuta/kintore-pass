// Local-only QA of the actual native screen components through react-native-web.
// Synthetic data, stub authentication and fake persistence. Never deploy this server.
import { createServer, transformWithEsbuild } from 'vite';
import { resolve } from 'node:path';
const root=process.cwd();
const aliases=[
  {find:'@/lib/api',replacement:'qa:api'},
  {find:'@clerk/expo',replacement:'qa:auth'},
  {find:'expo-router',replacement:'qa:router'},
  {find:'react-native-safe-area-context',replacement:'qa:safe'},
  {find:/^react-native$/,replacement:resolve(root,'mobile/node_modules/react-native-web')},
  {find:/^react$/,replacement:resolve(root,'node_modules/react')},
  {find:/^react-dom(\/.*)?$/,replacement:resolve(root,'node_modules/react-dom')+'$1'},
  {find:'react-native-svg',replacement:'qa:svg'},
];
const modules={
  'qa:auth':`export function useAuth(){return {getToken:async()=> 'fake-qa-token',userId:'qa-actor',isLoaded:true};}`,
  'qa:router':`export function useRouter(){return {back(){},push(){}};}`,
  'qa:safe':`export {View as SafeAreaView} from 'react-native';`,
  'qa:svg':`import React from 'react';export default function Svg({accessibilityLabel,...props}){return React.createElement('svg',{'aria-label':accessibilityLabel,...props});}export const Circle=p=>React.createElement('circle',p),Line=p=>React.createElement('line',p),Path=p=>React.createElement('path',p),Text=p=>React.createElement('text',p);`,
  'qa:api':`
    import {analyzeRetention,analyzeLongRetention} from '/shared/retention.ts';
    const now=new Date('2026-10-11T03:00:00Z');
    const users=['a','b'].map((id,i)=>({id,displayName:'検証ユーザー'+id,createdAt:'2026-04-01T00:00:00Z',weeklyGoal:i?3:4,trainingDays:['2026-09-03','2026-09-12','2026-10-02','2026-10-06','2026-10-09'],totalTrainingDays:5,lastTrainingDate:'2026-10-09',activityDays:[],measurementStartedOn:null}));
    let settings={id:'qa-uuid',alias:null,emailSearchEnabled:false,shareTraining:false};
    export async function apiRequest(path,options){
      await new Promise(resolve=>setTimeout(resolve,40));
      if(path.startsWith('/api/admin')){const p=new URL(path,'https://qa.invalid').searchParams;return {...analyzeRetention(users,now),longTerm:analyzeLongRetention(users,now,{range:p.get('range'),unit:p.get('unit'),cohortUnit:p.get('cohortUnit'),userId:p.get('userId')})};}
      if(options.body){const body=JSON.parse(options.body);if(body.action==='settings')settings={...settings,...body};return body.action==='search'?{results:[]}:{updated:true};}
      return {settings:{...settings},relations:[]};
    }
  `,
  'qa:entry':`
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import {View,Pressable,Text,Alert} from 'react-native';
    import Friends from '/mobile/src/app/friends.tsx';import {AdminRetention} from '/mobile/src/components/AdminRetention.tsx';
    Alert.alert=(title,message,buttons)=>{if(window.confirm(title+'\\n'+message))buttons?.find(b=>b.text==='保存')?.onPress?.();};
    function QA(){const [screen,setScreen]=useState('friends');return <View style={{gap:14,padding:20}}><Text style={{color:'#ffb454'}}>検証専用・架空データ（本番ではありません）</Text><View style={{flexDirection:'row',gap:20}}>{['friends','admin'].map(s=><Pressable key={s} onPress={()=>setScreen(s)}><Text style={{color:'#73E7FF'}}>{s}</Text></Pressable>)}</View>{screen==='friends'?<Friends/>:<AdminRetention/>}</View>;}createRoot(document.getElementById('root')).render(<QA/>);
  `,
};
const server=await createServer({configFile:false,root,resolve:{alias:aliases},server:{host:'127.0.0.1',port:3042,strictPort:true},plugins:[{
  name:'local-mobile-qa',resolveId(id){if(id in modules)return '\0'+id;},
  load(id){if(id.startsWith('\0qa:'))return modules[id.slice(1)];},
  async transform(code,id){if(id==='\0qa:entry')return transformWithEsbuild(code,'qa.tsx',{loader:'tsx',jsx:'automatic'});},
  configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#050A0F}#root{max-width:390px;margin:auto}</style><div id="root"></div><script type="module" src="/@id/__x00__qa:entry"></script></html>');});},
} ],esbuild:{jsx:'automatic'}});
await server.listen();console.log('Local-only QA: http://localhost:3042');
