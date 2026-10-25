let date='';let count=0;
// A process-local brake for the single-instance public demo, not a billing guarantee.
export function reservePublicAiRequest():boolean{
  if(process.env.PUBLIC_DEMO!=='1')return true;
  const today=new Date().toISOString().slice(0,10);
  if(today!==date){date=today;count=0;}
  const configured=Number(process.env.PUBLIC_AI_REQUESTS_PER_DAY||200);
  const limit=Number.isSafeInteger(configured)&&configured>0?configured:200;
  if(count>=limit)return false;
  count++;return true;
}
