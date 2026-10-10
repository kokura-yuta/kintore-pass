// Local-only visual QA. Synthetic fixtures are explicitly labelled and never deployed.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { analyzeLongRetention } from '../shared/retention.ts';
import { lineSegments } from '../shared/longChart.ts';
const source=readFileSync(new URL('../app/admin/retention/LongAnalysis.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext}}).outputText
  .replace(/import \{ lineSegments \}[^;]+;/,'')
  .replace('export function LongAnalysis','function LongAnalysis');
const component=new Function('React','lineSegments',`${compiled}; return LongAnalysis;`)(React,lineSegments);
const now=new Date('2026-10-10T03:00:00Z');
const user=(id,createdAt,weeklyGoal,trainingDays)=>({id,createdAt,weeklyGoal,trainingDays,displayName:null,totalTrainingDays:trainingDays.length,lastTrainingDate:trainingDays.at(-1)??null,activityDays:[],measurementStartedOn:null});
const users=[user('a','2025-01-01T00:00:00Z',4,['2026-09-05','2026-09-12','2026-10-01','2026-10-03','2026-10-09']),user('b','2026-10-01T00:00:00Z',2,['2026-10-08'])];
const options={range:'1y',unit:'month',cohortUnit:'month',userId:'b'};
const body=renderToStaticMarkup(React.createElement(component,{data:analyzeLongRetention(users,now,options),options,onChange:()=>{}}));
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ローカル見た目検証</title><style>body{background:#050a0f;color:#f4f6f3;font:16px sans-serif;max-width:1100px;margin:auto;padding:24px}select{background:#0c151d;color:white;padding:8px;border:1px solid #203441}td,th{padding:12px;text-align:left;border-bottom:1px solid #203441}small{color:#94aab5}table{width:100%}</style><h1>見た目検証専用（架空データ・運営数値ではありません）</h1>${body}</html>`;
createServer((request,response)=>{response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});response.end(html);}).listen(3041,'127.0.0.1',()=>console.log('Local: http://localhost:3041'));
