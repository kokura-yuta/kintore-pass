// Reuse an existing Git credential in memory; do not create or persist credentials.
console.log('Ready for notification workflow operation on hidden stdin.');
process.stdin.setRawMode?.(true);
const input = await new Promise(resolve => {
  let data='';
  process.stdin.on('data', chunk => {data+=chunk;if(data.includes('\n'))resolve(JSON.parse(data.trim()));});
});
process.stdin.setRawMode?.(false);
process.stdin.pause();
try {
  const root='https://api.github.com/repos/kokura-yuta/kintore-pass';
  const actions={
    dispatch:{path:'/actions/workflows/friend-push.yml/dispatches',method:'POST',body:{ref:'main'}},
    runs:{path:'/actions/workflows/friend-push.yml/runs?per_page=3'},
    workflow:{path:'/actions/workflows/friend-push.yml'},
  };
  let operation=actions[input.action];
  if(input.action==='jobs' && /^\d+$/.test(String(input.runId)))operation={path:`/actions/runs/${input.runId}/jobs`};
  if(!operation)throw new Error('Unsupported operation');
  const response=await fetch(root+operation.path,{
    method:operation.method??'GET',redirect:'error',signal:AbortSignal.timeout(20000),
    headers:{Authorization:`Bearer ${input.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
      'Content-Type':'application/json'},
    ...(operation.body?{body:JSON.stringify(operation.body)}:{}),
  });
  if(!response.ok){console.log(JSON.stringify({status:response.status}));process.exitCode=1;}
  else if(response.status===204)console.log(JSON.stringify({status:204,dispatched:true}));
  else{
    const data=await response.json();
    if(input.action==='runs')console.log(JSON.stringify({runs:data.workflow_runs.map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,url:r.html_url,event:r.event,sha:r.head_sha,created:r.created_at}))}));
    else if(input.action==='jobs')console.log(JSON.stringify({jobs:data.jobs.map(j=>({id:j.id,name:j.name,status:j.status,conclusion:j.conclusion,steps:j.steps.map(s=>({name:s.name,status:s.status,conclusion:s.conclusion}))}))}));
    else console.log(JSON.stringify({id:data.id,state:data.state,path:data.path,url:data.html_url}));
  }
}catch{console.error('Workflow operation failed; credential and response details omitted.');process.exitCode=1;}
