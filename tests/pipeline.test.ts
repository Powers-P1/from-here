import { beforeEach,describe,expect,it,vi } from 'vitest';
import { emptyFacts,type NoticeFacts,type CheckReport } from '../shared/contracts.js';
const mock=vi.hoisted(()=>({plan:vi.fn(),read:vi.fn(),render:vi.fn(),check:vi.fn()}));
vi.mock('../server/agent/prompts.js',()=>({planLayout:mock.plan,readSign:mock.read}));
vi.mock('../server/render/renderer.js',()=>({renderSign:mock.render}));
vi.mock('../server/agent/checks.js',()=>({checkSign:mock.check}));
import { designAndCheck,newDesignContext } from '../server/agent/pipeline.js';

function known():NoticeFacts{const value=emptyFacts();value.what={value:'Pickup',status:'known'};return value;}
const receipt={provider:'test-double',model:'test-double',operation:'test',durationMs:0,inputTokens:null,outputTokens:null,requestHash:'test'};
const plan={emphasis:'action',scale:1,exceptionScale:1,margin:18,reason:'Test decision'};
function report(passed:boolean):CheckReport{return{passed,content:true,layout:passed,readback:passed,matched:passed?1:0,total:1,issues:passed?[]:['A test-only failure'],rows:[],checkedArtifactHash:'hash'};}
beforeEach(()=>{
  vi.resetAllMocks();
  mock.plan.mockResolvedValue({value:plan,receipt});
  mock.read.mockResolvedValue({value:known(),receipts:[receipt],transcript:'PICKUP'});
  mock.render.mockResolvedValue({svg:'<svg/>',png:Buffer.from('test'),hash:'hash',layoutPassed:true,issues:[],blocks:[],minimumFontMm:7});
  mock.check.mockReturnValue(report(true));
});
describe('bounded orchestration using explicitly mocked model/tools',()=>{
  it('allows direct first-pass success',async()=>{
    const context=await designAndCheck(known(),3,newDesignContext());
    expect(context.repairCount).toBe(0);expect(mock.plan).toHaveBeenCalledTimes(1);expect(mock.read).toHaveBeenCalledTimes(1);expect(context.report?.passed).toBe(true);
  });
  it('stops after exactly two completed repairs',async()=>{
    mock.check.mockReturnValue(report(false));
    const context=await designAndCheck(known(),3,newDesignContext());
    expect(context.stage).toBe('done');expect(context.repairCount).toBe(2);expect(context.report?.passed).toBe(false);
    expect(mock.plan).toHaveBeenCalledTimes(3);expect(mock.read).toHaveBeenCalledTimes(3);
  });
  it('resumes interrupted checking without replanning or resetting the budget',async()=>{
    mock.read.mockRejectedValueOnce(new Error('test-only outage'));
    const context=newDesignContext();
    await expect(designAndCheck(known(),3,context)).rejects.toThrow('outage');
    expect(context.stage).toBe('readback');
    await designAndCheck(known(),3,context);
    expect(mock.plan).toHaveBeenCalledTimes(1);expect(mock.render).toHaveBeenCalledTimes(1);expect(mock.read).toHaveBeenCalledTimes(2);expect(context.repairCount).toBe(0);
  });
  it('does not accept a late model answer after cancellation',async()=>{
    const controller=new AbortController();
    mock.read.mockImplementation(async()=>{controller.abort();return{value:known(),receipts:[receipt],transcript:'PICKUP'};});
    const context=newDesignContext();
    await expect(designAndCheck(known(),3,context,{signal:controller.signal})).rejects.toBeDefined();
    expect(context.report).toBeNull();expect(context.history.some(e=>e.type==='passed')).toBe(false);
  });
});
