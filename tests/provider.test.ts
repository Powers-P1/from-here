import {afterEach,expect,it,vi} from 'vitest';
import {modelJson} from '../server/agent/provider.js';
afterEach(()=>vi.unstubAllGlobals());
const request={operation:'test-only',system:'Test',prompt:'Test',schema:{type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false},mode:'text' as const};
it('accepts complete schema-valid JSON even if the provider used its token budget on trailing whitespace',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"value":"complete"}   \n\n'}}],usage:{completion_tokens:20}}),{status:200})));
  const result=await modelJson<{value:string}>(request);expect(result.value.value).toBe('complete');expect(result.receipt.finishReason).toBe('length');
});
it('rejects genuinely truncated JSON regardless of a success HTTP status',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"value":"incom'}}]}),{status:200})));
  await expect(modelJson(request)).rejects.toThrow('incomplete');
});
