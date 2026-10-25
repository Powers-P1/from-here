import {afterAll,expect,it} from 'vitest';
import {emptyFacts} from '../shared/contracts.js';
import {signText} from '../shared/sign-text.js';
import {compareFacts,checkSign} from '../server/agent/checks.js';
import {closeRenderBrowser,renderSign} from '../server/render/renderer.js';
afterAll(closeRenderBrowser);

it('keeps case-sensitive identifiers in the real renderer and rejects their altered readback',async()=>{
  const facts=emptyFacts();facts.what={value:'Join Wi-Fi; password aB7c',status:'known'};
  const sign=await renderSign(facts,{emphasis:'action',scale:1,exceptionScale:1,margin:18,reason:'Test actual literal preservation'},1);
  expect(sign.blocks.find(block=>block.key==='what')?.text).toBe(facts.what.value);
  expect(sign.svg).toContain('aB7c');expect(checkSign(facts,facts,sign).content).toBe(true);
  const wrong=structuredClone(facts);wrong.what.value='JOIN WI-FI; PASSWORD AB7C';
  expect(compareFacts(facts,wrong).rows[0].passed).toBe(false);
  expect(signText('East Entrance')).toBe('EAST ENTRANCE');
  expect(signText('Visit https://example.org/AbC')).toBe('Visit https://example.org/AbC');
},20000);
