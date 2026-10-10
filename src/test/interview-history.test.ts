import { describe, it, expect } from 'vitest';
import { orderedSegments, messagesForSegment, type InterviewMessage } from '@/lib/interview-history';
describe('one conversation with chronological interviewer history', () => {
  it('orders interviewer segments chronologically', () => {
    expect(orderedSegments([{id:'b', title:'second', interviewer_name:'Panel B', created_at:'2026-10-11'}, {id:'a', title:'first', interviewer_name:'Panel A', created_at:'2026-10-10'}]).map(s=>s.interviewer_name)).toEqual(['Panel A','Panel B']);
  });
  it('maps answers to the correct interviewer segment without mixing them', () => {
    const messages: InterviewMessage[] = [{id:'m1',role:'user',parts:[{type:'text',text:'Answer A'}],metadata:{segmentId:'a'}},{id:'m2',role:'assistant',parts:[{type:'text',text:'Question B'}],metadata:{segmentId:'b'}}];
    expect(messagesForSegment(messages,'a').map(m=>m.id)).toEqual(['m1']);
    expect(messagesForSegment(messages,'b').map(m=>m.id)).toEqual(['m2']);
  });
});
