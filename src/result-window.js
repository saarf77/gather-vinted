export const RESULT_BATCH_SIZE=24;
export function createResultWindow() {
 let results=[],limit=RESULT_BATCH_SIZE,previousContext=[];
 const snapshot=()=>({items:results.slice(0,limit),shown:Math.min(limit,results.length),total:results.length,hasMore:limit<results.length});
 return {
  update(items,context){
   if(context.length!==previousContext.length||context.some((value,index)=>!Object.is(value,previousContext[index])))limit=RESULT_BATCH_SIZE;
   results=items;previousContext=[...context];return snapshot();
  },
  more(){limit=Math.min(results.length,limit+RESULT_BATCH_SIZE);return snapshot();}
 };
}
