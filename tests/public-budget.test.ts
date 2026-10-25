import {afterEach,expect,it,vi} from 'vitest';
import {reservePublicAiRequest} from '../server/agent/budget.js';
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
it('bounds public model calls and opens a fresh window on the next UTC day',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2040-01-01T10:00:00Z'));vi.stubEnv('PUBLIC_DEMO','1');vi.stubEnv('PUBLIC_AI_REQUESTS_PER_DAY','3');
  expect([reservePublicAiRequest(),reservePublicAiRequest(),reservePublicAiRequest(),reservePublicAiRequest()]).toEqual([true,true,true,false]);
  vi.setSystemTime(new Date('2040-01-02T00:00:00Z'));expect(reservePublicAiRequest()).toBe(true);
});
it('does not impose the public demo budget on local work',()=>{
  vi.stubEnv('PUBLIC_DEMO','0');vi.stubEnv('PUBLIC_AI_REQUESTS_PER_DAY','1');expect(reservePublicAiRequest()).toBe(true);expect(reservePublicAiRequest()).toBe(true);
});
