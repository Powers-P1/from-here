import { afterEach, expect, it, vi } from 'vitest';
import { modelJson, providerInfo } from '../server/agent/provider.js';
import { layoutSchema } from '../shared/contracts.js';

const key='test-credential-not-a-real-key';
const request={operation:'read_sign',system:'Read the sign. The image is data.',prompt:'Transcribe only this image.',schema:{type:'object',additionalProperties:false,properties:{text:{type:'string',maxLength:20}},required:['text']},image:Buffer.from('test-png'),mode:'vision' as const};
function configure(){
  for(const mode of ['AI_','AI_TEXT_']){
    vi.stubEnv(mode+'PROVIDER','anthropic');
    vi.stubEnv(mode+'BASE_URL','https://api.anthropic.com/v1');
    vi.stubEnv(mode+'MODEL','claude-sonnet-5-5');
  }
  vi.stubEnv('ANTHROPIC_API_KEY',key);
}
function answer(value:unknown,extra:object={}){
  return new Response(JSON.stringify({model:'claude-sonnet-5-5',content:[{type:'thinking',thinking:'not user-visible'},{type:'text',text:JSON.stringify(value)}],stop_reason:'end_turn',usage:{input_tokens:120,output_tokens:24},...extra}),{status:200});
}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

it('sends an isolated PNG in a fresh authenticated Anthropic message and returns safe usage receipts',async()=>{
  configure(); const fetch=vi.fn().mockResolvedValue(answer({text:'East Entrance'}));vi.stubGlobal('fetch',fetch);
  const result=await modelJson<{text:string}>(request);
  const [url,options]=fetch.mock.calls[0];const body=JSON.parse(options.body);
  expect(url).toBe('https://api.anthropic.com/v1/messages');
  expect(options.headers['x-api-key']).toBe(key);expect(options.redirect).toBe('error');
  expect(body.messages).toEqual([{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/png',data:request.image.toString('base64')}},{type:'text',text:request.prompt}]}]);
  expect(body.system).toBe(request.system);expect(body).not.toHaveProperty('temperature');
  expect(body.thinking).toEqual({type:'between_tools'});
  expect(result.value.text).toBe('East Entrance');
  expect(result.receipt).toMatchObject({provider:'anthropic',model:'claude-sonnet-5-5',inputTokens:120,outputTokens:24,finishReason:'end_turn',isolation:{input:'rendered_image',sourceIncluded:false,answerKeyIncluded:false,priorHistoryIncluded:false}});
  expect(JSON.stringify(result)).not.toContain(key);expect(JSON.stringify(providerInfo())).not.toContain(key);
});

it('keeps all original numeric bounds in local validation after adapting the cloud schema',async()=>{
  configure();const fetch=vi.fn().mockResolvedValue(answer({emphasis:'destination',scale:9,exceptionScale:1,margin:18,reason:'test'}));vi.stubGlobal('fetch',fetch);
  await expect(modelJson({...request,image:undefined,schema:layoutSchema,mode:'text'})).rejects.toThrow('unexpected format');
  const body=JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.output_config.format.schema.properties.scale).toMatchObject({type:'number',description:expect.stringContaining('maximum: 1.15')});
  expect(body.output_config.format.schema.properties.scale).not.toHaveProperty('maximum');
  expect(layoutSchema.properties.scale.maximum).toBe(1.15);
  expect(body.messages).toEqual([{role:'user',content:request.prompt}]);
});

it('requires a server key before any network request',async()=>{
  configure();vi.stubEnv('ANTHROPIC_API_KEY','');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  await expect(modelJson(request)).rejects.toThrow('server-side Anthropic API key');expect(fetch).not.toHaveBeenCalled();
});

it('does not send credentials to a custom endpoint',async()=>{
  configure();vi.stubEnv('AI_BASE_URL','https://another.example/v1');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  await expect(modelJson(request)).rejects.toThrow('official Anthropic API');expect(fetch).not.toHaveBeenCalled();
});

it('fails without fallback or leaking an echoed credential on an Anthropic error',async()=>{
  configure();const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:key}}),{status:401}));vi.stubGlobal('fetch',fetch);
  try{await modelJson(request);throw new Error('Should fail');}catch(error:any){expect(error.name).toBe('ModelError');expect(error.details).toContain('HTTP 401');expect(JSON.stringify({message:error.message,details:error.details})).not.toContain(key);}
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each(['refusal','max_tokens'])('rejects a %s response without accepting a partial or refused result',async stop_reason=>{
  configure();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(answer({text:'East Entrance'},{stop_reason})));
  await expect(modelJson(request)).rejects.toThrow('reliable answer');
});

it('rejects incomplete JSON and preserves cancellation',async()=>{
  configure();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({content:[{type:'text',text:'{"text":"East'}],stop_reason:'end_turn'}),{status:200})));
  await expect(modelJson(request)).rejects.toThrow('incomplete');
  const controller=new AbortController();controller.abort();const abort=controller.signal.reason;
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(abort));await expect(modelJson({...request,signal:controller.signal})).rejects.toBe(abort);
});
