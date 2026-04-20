/**
 * OAST: Call Intelligence Scorer Edge Function (L5 + L6 + L7 + L8)
 *
 * Separate from call-segment-scorer — runs post-call, fails independently.
 *
 * L5: Objection Detection & AER Response Scoring  → call_objections
 * L6: Buying Signal Detection & Capitalisation    → call_buying_signals
 * L7: Next Step Commitment Detection              → live_scores columns
 * L8: Pacing Analysis (pure arithmetic, no AI)   → call_pacing_windows + live_scores
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TranscriptWord { speaker: string; start: number; end: number; text: string }
interface Utterance { speaker: string; text: string; start: number; end: number }
type ObjectionType = 'price'|'timing'|'competitor'|'internal_priority'|'not_now'|'feature_gap'|'trust'|'other'
type ResponsePattern = 'aer_complete'|'acknowledge_only'|'immediate_counter'|'no_response'
interface DetectedObjection { objection_type: ObjectionType; objection_text: string; objection_timestamp_seconds: number; rep_response_text: string|null; rep_response_score: number|null; response_pattern: ResponsePattern|null }
type SignalType = 'timeline'|'onboarding'|'proposal'|'stakeholder'|'contract'|'pricing'|'other'
interface DetectedSignal { signal_text: string; signal_type: SignalType; signal_timestamp_seconds: number; capitalised: boolean; capitalisation_score: number; rep_response_text: string|null }
interface NextStepResult { next_step_confirmed: boolean; next_step_text: string|null; next_step_date_mentioned: boolean }
type PacingFlag = 'too_fast'|'too_slow'|'optimal'
interface PacingWindowRow { window_start_seconds: number; window_end_seconds: number; wpm: number|null; flag: PacingFlag|null }
interface PacingResult { windows: PacingWindowRow[]; avg_speech_rate_wpm: number|null; speech_rate_variance: number|null; pacing_score: number|null }

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_OBJECTION_TYPES: ObjectionType[] = ['price','timing','competitor','internal_priority','not_now','feature_gap','trust','other']
const VALID_SIGNAL_TYPES: SignalType[] = ['timeline','onboarding','proposal','stakeholder','contract','pricing','other']
const SIGNAL_PHRASES: Record<SignalType,string[]> = {
  timeline:    ['when we implement','when we get started','when could we start','how long does it take','how soon can we','what is the timeline','when can we go live','when would this be ready','start date','go live'],
  onboarding:  ['onboarding','getting started','implementation process','set up process','how do we get set up','what does onboarding look like','training process','how do we train'],
  proposal:    ['send a proposal','send over a proposal','can you send me',"what's the next step",'next step','what are the next steps','move forward','let us move forward',"let's do it",'sign up','ready to proceed'],
  stakeholder: ['need to involve','need to bring in','involve my team','get my manager','loop in','include our','my cto','my cfo','my ceo','my vp','my director','get sign-off','get sign off','need buy-in','need buy in'],
  contract:    ['contract terms','terms and conditions','legal review','legal team','review the contract','sign the contract','agreement','service level','sla','data processing','gdpr'],
  pricing:     ['payment terms','annual plan','monthly plan','discount','budget approved','budget available','price per','cost per','total cost','what does it cost','how much does','can we negotiate','can you do better'],
  other: [],
}
const CAPITALISATION_WINDOW_SECS  = 120
const NEXT_STEP_WINDOW_SECS       = 180
const NEXT_STEP_PHRASES           = ['so the next step is','the next step is','next step is',"let's schedule",'lets schedule',"i'll send over",'i will send over','speak on',"i'll follow up",'i will follow up',"next we'll",'next we will','shall we book',"let's book",'lets book',"i'll reach out",'i will reach out','follow up on',"i'll send you",'i will send you','book a','schedule a']
const DATE_PATTERNS: RegExp[]     = [/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,/\b\d{1,2}(?:st|nd|rd|th)(?:\s+of)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,/\b(?:tomorrow|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(?:week|friday|thursday|wednesday|tuesday|monday)|in\s+(?:a|one|two|three|a\s+couple\s+of)\s+(?:days?|weeks?|months?)|end\s+of\s+(?:the\s+)?week|end\s+of\s+(?:the\s+)?month)\b/i,/\bin\s+\d+\s+(?:days?|weeks?|months?)\b/i,/\b\d{4}-\d{2}-\d{2}\b/]
const COMMITMENT_TRIGGER_THRESHOLD = 60

// L8 pacing constants — SYNC: src/config/pacing.ts
const PACING_WINDOW_SECS     = 30
const WPM_TOO_FAST           = 200
const WPM_TOO_SLOW           = 100
const WPM_OPT_LOW            = 120
const WPM_OPT_HIGH           = 190
const MIN_WORDS_PER_WINDOW   = 5

const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type' }

// ── Shared helpers ────────────────────────────────────────────────────────────

function normaliseSpeaker(label: string): string {
  const l = label.toLowerCase()
  if (['b','speaker_0','agent'].includes(l)) return 'rep'
  if (['prospect','speaker_1','customer'].includes(l)) return 'prospect'
  return l
}

function normaliseSpeakers(words: TranscriptWord[]): TranscriptWord[] {
  return words.map(w => ({ ...w, speaker: normaliseSpeaker(w.speaker) }))
}

function buildUtterances(words: TranscriptWord[]): Utterance[] {
  if (!words.length) return []
  const sorted = [...words].sort((a,b) => a.start-b.start)
  const result: Utterance[] = []
  let current: TranscriptWord[] = [sorted[0]]
  for (let i=1;i<sorted.length;i++) {
    const w=sorted[i],prev=sorted[i-1]
    if (w.speaker!==prev.speaker||(w.start-prev.end)>1.5) { result.push({speaker:current[0].speaker,text:current.map(x=>x.text).join(' '),start:current[0].start,end:current[current.length-1].end}); current=[w] }
    else current.push(w)
  }
  result.push({speaker:current[0].speaker,text:current.map(x=>x.text).join(' '),start:current[0].start,end:current[current.length-1].end})
  return result
}

// ── L5 helpers ────────────────────────────────────────────────────────────────

export function deriveResponsePattern(a:number,e:number,r:number): ResponsePattern {
  const hA=a>=15,hE=e>=15,hR=r>=20
  if(hA&&hE&&hR) return 'aer_complete'
  if(hA&&!hE&&!hR) return 'acknowledge_only'
  if(!hA&&!hE&&hR) return 'immediate_counter'
  return 'no_response'
}
export function computeAerScore(a:number,e:number,r:number): number { return Math.min(100,Math.round(a+e+r)) }

// ── L6 helpers ────────────────────────────────────────────────────────────────

export function computeCapitalisationScore(n:number,a:number,ac:number): number { return Math.min(100,Math.round(n+a+ac)) }

function detectExactSignal(text:string): {signal_type:SignalType;matched_phrase:string}|null {
  const lower=text.toLowerCase()
  for(const type of VALID_SIGNAL_TYPES) { if(type==='other') continue; for(const phrase of SIGNAL_PHRASES[type]) { if(lower.includes(phrase)) return {signal_type:type,matched_phrase:phrase} } }
  return null
}

// ── L7 helpers ────────────────────────────────────────────────────────────────

export function detectNextStep(utterances:Utterance[], callDurationSecs:number): NextStepResult {
  const windowStart=Math.max(0,callDurationSecs-NEXT_STEP_WINDOW_SECS)
  const finalRep=utterances.filter(u=>u.speaker==='rep'&&u.start>=windowStart).sort((a,b)=>b.start-a.start)
  for(const utt of finalRep) {
    const lower=utt.text.toLowerCase()
    const matched=NEXT_STEP_PHRASES.find(p=>lower.includes(p))
    if(matched) { const dateMentioned=DATE_PATTERNS.some(p=>p.test(utt.text)); return {next_step_confirmed:true,next_step_text:utt.text.trim(),next_step_date_mentioned:dateMentioned} }
  }
  return {next_step_confirmed:false,next_step_text:null,next_step_date_mentioned:false}
}

// ── L8: Pacing helpers — SYNC: src/config/pacing.ts computePacingScore ───────

interface PacingWindowScore { wpm: number; flag: PacingFlag }

/**
 * computePacingScore — SYNC with src/config/pacing.ts
 * If formula changes, update BOTH files. Mark with: // SYNC: pacing.ts computePacingScore
 */
export function computePacingScore(windows: PacingWindowScore[]): number | null {
  const scored = windows.filter(w => w.wpm > 0)
  if (!scored.length) return null

  const avg    = scored.reduce((s,w) => s+w.wpm, 0) / scored.length
  const stdDev = Math.sqrt(scored.reduce((s,w) => s+Math.pow(w.wpm-avg, 2), 0) / scored.length)

  let score = 100
  for (const w of scored) { if (w.wpm < WPM_OPT_LOW || w.wpm > WPM_OPT_HIGH) score -= 2 }
  if (avg > 200 || avg < 110) score -= 5
  if (stdDev > 20) score += 5

  return Math.min(100, Math.max(0, Math.round(score)))
}

// ── L8: Pacing analysis (pure arithmetic) ────────────────────────────────────

export function computePacing(words: TranscriptWord[], callDurationSecs: number): PacingResult {
  const repWords = words.filter(w => w.speaker === 'rep').sort((a,b) => a.start-b.start)
  const numWindows = Math.ceil(callDurationSecs / PACING_WINDOW_SECS)
  const windowRows: PacingWindowRow[] = []

  for (let i=0; i<numWindows; i++) {
    const wStart = i * PACING_WINDOW_SECS
    const wEnd   = Math.min((i+1) * PACING_WINDOW_SECS, callDurationSecs)
    const wWords  = repWords.filter(w => w.start >= wStart && w.end <= wEnd)

    if (wWords.length < MIN_WORDS_PER_WINDOW) {
      windowRows.push({ window_start_seconds: wStart, window_end_seconds: wEnd, wpm: null, flag: null })
      continue
    }

    const durMins = (wEnd - wStart) / 60
    const wpm     = Math.round(wWords.length / durMins)
    let flag: PacingFlag
    if (wpm > WPM_TOO_FAST) flag = 'too_fast'
    else if (wpm < WPM_TOO_SLOW) flag = 'too_slow'
    else flag = 'optimal'

    windowRows.push({ window_start_seconds: wStart, window_end_seconds: wEnd, wpm, flag })
  }

  const scoredWindows = windowRows.filter(w => w.wpm !== null) as { wpm: number; flag: PacingFlag }[]

  let avg_speech_rate_wpm:  number | null = null
  let speech_rate_variance: number | null = null
  let pacing_score:         number | null = null

  if (scoredWindows.length > 0) {
    const avg    = scoredWindows.reduce((s,w) => s+w.wpm, 0) / scoredWindows.length
    const stdDev = Math.sqrt(scoredWindows.reduce((s,w) => s+Math.pow(w.wpm-avg, 2), 0) / scoredWindows.length)
    avg_speech_rate_wpm  = Math.round(avg * 100) / 100
    speech_rate_variance = Math.round(stdDev * 100) / 100
    pacing_score         = computePacingScore(scoredWindows)
  }

  return { windows: windowRows, avg_speech_rate_wpm, speech_rate_variance, pacing_score }
}

// ── L5: Objection detection ───────────────────────────────────────────────────

async function detectObjections(utterances:Utterance[],openaiKey:string): Promise<DetectedObjection[]> {
  const results:DetectedObjection[]=[]; const pIdxs=utterances.map((u,i)=>({u,i})).filter(({u})=>u.speaker==='prospect'); if(!pIdxs.length) return []
  const listStr=pIdxs.map(({u,i})=>`${i}|||${u.text.trim()}`).join('\n')
  let cls:Array<{idx:number;is_objection:boolean;objection_type?:string;objection_text?:string}>=[]
  try{const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:`You are a B2B sales expert. For each prospect utterance, determine if it contains a sales objection.\n\nIf objection: {"idx":<n>,"is_objection":true,"objection_type":"<price|timing|competitor|internal_priority|not_now|feature_gap|trust|other>","objection_text":"<exact phrase>"}\nIf not: {"idx":<n>,"is_objection":false}\n\nUtterances (index|||text):\n${listStr}\n\nReturn ONLY a JSON array, one object per utterance.`}],temperature:0,max_tokens:800})});if(r.ok){const j=await r.json();cls=JSON.parse(j.choices?.[0]?.message?.content?.trim()??'[]')}}catch{return []}
  for(const c of cls){if(!c.is_objection)continue;const entry=pIdxs.find(({i})=>i===c.idx);if(!entry)continue;const{u:objU,i:objIdx}=entry;const objType:ObjectionType=VALID_OBJECTION_TYPES.includes(c.objection_type as ObjectionType)?c.objection_type as ObjectionType:'other';const repRsps=utterances.slice(objIdx+1).filter(u=>u.speaker==='rep').slice(0,3);if(!repRsps.length){results.push({objection_type:objType,objection_text:c.objection_text??objU.text.trim(),objection_timestamp_seconds:Math.round(objU.start),rep_response_text:null,rep_response_score:null,response_pattern:'no_response'});continue};const repText=repRsps.map(u=>u.text).join(' ');let ack=0,exp=0,rsp=0;try{const ar=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:`Score AER.\n\nOBJECTION: ${c.objection_text??objU.text}\nREP: ${repText}\n\n- acknowledge (0-33)\n- explore (0-33)\n- respond (0-34)\n\nReturn ONLY: {"acknowledge":<n>,"explore":<n>,"respond":<n>}`}],temperature:0,max_tokens:60})});if(ar.ok){const aj=await ar.json();const ap=JSON.parse(aj.choices?.[0]?.message?.content?.trim()??'{}');ack=Math.min(33,Math.max(0,Number(ap.acknowledge)||0));exp=Math.min(33,Math.max(0,Number(ap.explore)||0));rsp=Math.min(34,Math.max(0,Number(ap.respond)||0))}}catch{};results.push({objection_type:objType,objection_text:c.objection_text??objU.text.trim(),objection_timestamp_seconds:Math.round(objU.start),rep_response_text:repText||null,rep_response_score:computeAerScore(ack,exp,rsp),response_pattern:deriveResponsePattern(ack,exp,rsp)})}
  return results
}

// ── L6: Buying signal detection ───────────────────────────────────────────────

async function detectBuyingSignals(utterances:Utterance[],openaiKey:string): Promise<DetectedSignal[]> {
  const results:DetectedSignal[]=[]; const pUtts=utterances.map((u,i)=>({u,i})).filter(({u})=>u.speaker==='prospect'); if(!pUtts.length) return []
  const exactMatched:{u:Utterance;i:number;signal_type:SignalType}[]=[]; const unmatched:{u:Utterance;i:number}[]=[]
  for(const{u,i}of pUtts){const m=detectExactSignal(u.text);if(m)exactMatched.push({u,i,signal_type:m.signal_type});else unmatched.push({u,i})}
  const gptMatched:{u:Utterance;i:number;signal_type:SignalType}[]=[]
  if(unmatched.length>0){const listStr=unmatched.map(({u,i})=>`${i}|||${u.text.trim()}`).join('\n');try{const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:`Buying signal detection.\n\nIf signal: {"idx":<n>,"is_signal":true,"signal_type":"<timeline|onboarding|proposal|stakeholder|contract|pricing|other>"}\nIf not: {"idx":<n>,"is_signal":false}\n\nUtterances:\n${listStr}\n\nReturn ONLY a JSON array.`}],temperature:0,max_tokens:600})});if(r.ok){const j=await r.json();const p=JSON.parse(j.choices?.[0]?.message?.content?.trim()??'[]') as Array<{idx:number;is_signal:boolean;signal_type?:string}>;for(const item of p){if(!item.is_signal)continue;const entry=unmatched.find(({i})=>i===item.idx);if(!entry)continue;const st:SignalType=VALID_SIGNAL_TYPES.includes(item.signal_type as SignalType)?item.signal_type as SignalType:'other';gptMatched.push({u:entry.u,i:entry.i,signal_type:st})}}}catch{}}
  const allSigs=[...exactMatched,...gptMatched.filter(g=>!exactMatched.some(e=>e.i===g.i))].sort((a,b)=>a.u.start-b.u.start)
  for(const{u:sigU,i:sigIdx,signal_type}of allSigs){const wEnd=sigU.start+CAPITALISATION_WINDOW_SECS;const repRsps=utterances.slice(sigIdx+1).filter(u=>u.speaker==='rep'&&u.start<=wEnd);if(!repRsps.length){results.push({signal_text:sigU.text.trim(),signal_type,signal_timestamp_seconds:Math.round(sigU.start),capitalised:false,capitalisation_score:0,rep_response_text:null});continue};const repText=repRsps.map(u=>u.text).join(' ');let ns=0,adv=0,ack=0;try{const cr=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:`Score capitalisation.\n\nSIGNAL: ${sigU.text}\nTYPE: ${signal_type}\nREP: ${repText}\n\n- next_step (0-34)\n- advancement (0-33)\n- acknowledgement (0-33)\n\nReturn ONLY: {"next_step":<n>,"advancement":<n>,"acknowledgement":<n>}`}],temperature:0,max_tokens:60})});if(cr.ok){const cj=await cr.json();const cp=JSON.parse(cj.choices?.[0]?.message?.content?.trim()??'{}');ns=Math.min(34,Math.max(0,Number(cp.next_step)||0));adv=Math.min(33,Math.max(0,Number(cp.advancement)||0));ack=Math.min(33,Math.max(0,Number(cp.acknowledgement)||0))}}catch{};const score=computeCapitalisationScore(ns,adv,ack);results.push({signal_text:sigU.text.trim(),signal_type,signal_timestamp_seconds:Math.round(sigU.start),capitalised:score>50,capitalisation_score:score,rep_response_text:repText||null})}
  return results
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req:Request) => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:CORS})
  try {
    const body=await req.json() as {call_id?:string;org_id?:string;rep_id?:string;transcript?:TranscriptWord[];call_duration_secs?:number;deal_id?:string;live_score_id?:string;session_id?:string}
    let{call_id,org_id,rep_id,transcript,call_duration_secs,deal_id}=body

    // When called with live_score_id or session_id, resolve call context from the row
    if(!call_id&&(body.live_score_id||body.session_id)){
      const supabaseInit=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      let query=supabaseInit.from('live_scores').select('call_id,org_id,rep_id,transcript,duration_secs')
      if(body.live_score_id) query=query.eq('id',body.live_score_id)
      else query=query.eq('session_id',body.session_id!)
      const{data:lsLookup}=await query.single()
      if(lsLookup){
        call_id=lsLookup.call_id
        org_id=org_id||lsLookup.org_id
        rep_id=rep_id||lsLookup.rep_id
        if(!transcript&&lsLookup.transcript){
          transcript=lsLookup.transcript.split('\n').map((line:string,i:number)=>({speaker:i%2===0?'rep':'prospect',start:i*5,end:i*5+4,text:line}))
          call_duration_secs=call_duration_secs||lsLookup.duration_secs||((transcript?.length??0)*5)
        }
      }
    }

    if(!call_id||!org_id||!rep_id) return new Response(JSON.stringify({error:'call_id, org_id, rep_id required'}),{status:400,headers:{...CORS,'Content-Type':'application/json'}})

    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const openaiKey=Deno.env.get('OPENAI_API_KEY')!

    // Idempotency checks (all five passes)
    const[{count:objCount},{count:sigCount},{data:lsRow},{count:pacingCount},{count:sentimentCount}]=await Promise.all([
      supabase.from('call_objections').select('id',{count:'exact',head:true}).eq('call_id',call_id),
      supabase.from('call_buying_signals').select('id',{count:'exact',head:true}).eq('call_id',call_id),
      supabase.from('live_scores').select('next_step_confirmed,pacing_score').eq('call_id',call_id).maybeSingle(),
      supabase.from('call_pacing_windows').select('id',{count:'exact',head:true}).eq('call_id',call_id),
      supabase.from('call_sentiment').select('id',{count:'exact',head:true}).eq('call_id',call_id),
    ])

    const nextStepAlreadySet = lsRow?.next_step_confirmed !== null && lsRow?.next_step_confirmed !== undefined
    const pacingAlreadySet   = (pacingCount ?? 0) > 0

    const sentimentAlreadySet = (sentimentCount ?? 0) > 0
    if((objCount??0)>0&&(sigCount??0)>0&&nextStepAlreadySet&&pacingAlreadySet&&sentimentAlreadySet) {
      return new Response(JSON.stringify({skipped:true,reason:'already scored'}),{status:200,headers:{...CORS,'Content-Type':'application/json'}})
    }

    const words=normaliseSpeakers(transcript??[])
    const duration=call_duration_secs||Math.ceil(words.length ? Math.max(...words.map(w=>w.end)) : 0)

    if(!words.length) {
      if(!nextStepAlreadySet) await supabase.from('live_scores').update({next_step_confirmed:false,next_step_text:null,next_step_date_mentioned:false}).eq('call_id',call_id)
      return new Response(JSON.stringify({objections_detected:0,signals_detected:0,next_step_confirmed:false,pacing_score:null}),{status:200,headers:{...CORS,'Content-Type':'application/json'}})
    }

    const utterances=buildUtterances(words)

    // All four passes — L7 and L8 are pure (no await needed)
    const nextStepResult = nextStepAlreadySet ? null : detectNextStep(utterances, duration)
    const pacingResult   = pacingAlreadySet   ? null : computePacing(words, duration)

    // L5 + L6 run concurrently
    const[objections,signals]=await Promise.all([
      (objCount??0)>0?Promise.resolve([]):detectObjections(utterances,openaiKey),
      (sigCount??0)>0?Promise.resolve([]):detectBuyingSignals(utterances,openaiKey),
    ])

    // Writes
    if(objections.length){const{error}=await supabase.from('call_objections').insert(objections.map(o=>({org_id,call_id,rep_id,...o})));if(error)console.error('objections:',error)}
    if(signals.length){const{error}=await supabase.from('call_buying_signals').insert(signals.map(s=>({org_id,call_id,rep_id,...s})));if(error)return new Response(JSON.stringify({error:error.message}),{status:500,headers:{...CORS,'Content-Type':'application/json'}})}

    if(nextStepResult){const{error}=await supabase.from('live_scores').update(nextStepResult).eq('call_id',call_id);if(error)console.error('live_scores next_step:',error)}

    // L-R2: Sentiment scoring (prospect segments only)
    if(!sentimentAlreadySet&&utterances.length>0){
      const prospectUtterances=utterances.filter((u:{speaker:string})=>u.speaker==='prospect')
      const sampleText=prospectUtterances.map((u:{text:string})=>u.text).join(' ').slice(0,2000)
      if(sampleText.length>50){
        try{
          const sentResp=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${openaiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',temperature:0.1,messages:[{role:'system',content:'Analyse this prospect speech for sentiment. Return ONLY valid JSON: {"score": <-1.0 to 1.0>, "positive_signals": ["..."], "negative_signals": ["..."]}. Score: 1.0=very positive, 0=neutral, -1.0=very negative.'},{role:'user',content:sampleText}]})})
          if(sentResp.ok){
            const sentJson=await sentResp.json()
            const parsed=JSON.parse(sentJson.choices?.[0]?.message?.content??'{}')
            const score=typeof parsed.score==='number'?Math.max(-1,Math.min(1,parsed.score)):0
            await supabase.from('call_sentiment').insert({org_id,call_id,deal_id:deal_id??null,sentiment_score:score,positive_signals:Array.isArray(parsed.positive_signals)?parsed.positive_signals:[],negative_signals:Array.isArray(parsed.negative_signals)?parsed.negative_signals:[],recorded_at:new Date().toISOString()})
          }
        }catch(e){console.error('sentiment scoring error:',e)}
      }
    }

    if(pacingResult){
      // Write pacing windows
      const windowInserts=pacingResult.windows.map(w=>({org_id,call_id,rep_id,...w}))
      if(windowInserts.length){const{error}=await supabase.from('call_pacing_windows').insert(windowInserts);if(error)console.error('call_pacing_windows:',error)}
      // Update live_scores pacing columns
      const{error}=await supabase.from('live_scores').update({avg_speech_rate_wpm:pacingResult.avg_speech_rate_wpm,speech_rate_variance:pacingResult.speech_rate_variance,pacing_score:pacingResult.pacing_score}).eq('call_id',call_id)
      if(error) console.error('live_scores pacing:',error)
    }

    // L7: coaching trigger for low commitment rate
    if(nextStepResult!==null){
      const thirtyDaysAgo=new Date(Date.now()-30*86_400_000).toISOString()
      const{data:recentCalls}=await supabase.from('live_scores').select('next_step_confirmed').eq('rep_id',rep_id).gte('call_started_at',thirtyDaysAgo).not('next_step_confirmed','is',null)
      if(recentCalls&&recentCalls.length>=3){
        const total=recentCalls.length,confirmed=recentCalls.filter((r:{next_step_confirmed:boolean})=>r.next_step_confirmed).length,rate=Math.round(confirmed/total*100)
        if(rate<COMMITMENT_TRIGGER_THRESHOLD){
          const sevenDaysAgo=new Date(Date.now()-7*86_400_000).toISOString()
          const{data:existing}=await supabase.from('coaching_triggers').select('id').eq('rep_id',rep_id).eq('trigger_type','low_commitment_rate').is('resolved_at',null).gte('created_at',sevenDaysAgo).limit(1)
          if(!existing?.length) await supabase.from('coaching_triggers').insert({org_id,rep_id,trigger_type:'low_commitment_rate',severity:'warning',trigger_data:{commitment_rate:rate,confirmed_calls:confirmed,total_calls_30d:total,call_id}})
        }
      }
    }

    // R6: Meeting Intelligence Scoring — pure arithmetic from L-layer values
    const {data:lsRowFull}=await supabase.from('live_scores').select('talk_ratio,question_quality_score,filler_word_rate,pacing_score,next_step_confirmed,objection_score').eq('call_id',call_id).maybeSingle()
    const {count:meetingScoreCount}=await supabase.from('meeting_scores').select('id',{count:'exact',head:true}).eq('call_id',call_id)

    if(!meetingScoreCount){
      try{
        const talkRatio=lsRowFull?.talk_ratio??50
        const questionQuality=lsRowFull?.question_quality_score??50
        const fillerRate=lsRowFull?.filler_word_rate??0
        const pacingScore=lsRowFull?.pacing_score??50
        const nextStepConf=lsRowFull?.next_step_confirmed?100:0
        const objScore=lsRowFull?.objection_score??50
        const capitalRate=signals.length>0?Math.round(signals.filter((s:{capitalised:boolean})=>s.capitalised).length/signals.length*100):50

        // Weighted composite score
        const meetingScore=Math.min(100,Math.max(0,
          talkRatio*0.15+
          questionQuality*0.20+
          Math.max(0,100-fillerRate*100)*0.10+
          pacingScore*0.15+
          nextStepConf*0.15+
          objScore*0.15+
          capitalRate*0.10
        ))

        // Derive tags
        const tags:string[]=[]
        if(lsRowFull?.next_step_confirmed) tags.push('Next_step_confirmed')
        else tags.push('No_next_step')
        if((talkRatio??50)<45) tags.push('Good_discovery_depth')
        if(fillerRate>0.05) tags.push('Filler_spike')
        if(pacingScore<40) tags.push('Monotone_delivery')
        if(objections.length>2&&objScore<50) tags.push('Late_objection_handling')
        if(signals.length>0&&capitalRate>70) tags.push('Buying_signal_capitalised')

        // AI coaching note
        let aiNote:string|null=null
        try{
          const summary=`Talk ratio: ${Math.round(talkRatio??50)}%, Question quality: ${Math.round(questionQuality??50)}/100, Filler rate: ${Math.round((fillerRate??0)*100)}%, Next step: ${lsRowFull?.next_step_confirmed?'confirmed':'not confirmed'}, Objection score: ${Math.round(objScore??50)}/100`
          const noteResp=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${openaiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',temperature:0.3,max_tokens:80,messages:[{role:'system',content:'You are a sales coach. Given these call metrics, provide exactly one sentence of actionable coaching advice.'},{role:'user',content:summary}]})})
          if(noteResp.ok){const nj=await noteResp.json();aiNote=nj.choices?.[0]?.message?.content?.trim()??null}
        }catch(e){console.error('coaching note error:',e)}

        const{error:msError}=await supabase.from('meeting_scores').upsert({call_id,org_id,deal_id:deal_id??null,score:Math.round(meetingScore*10)/10,tags,ai_coaching_note:aiNote,scored_at:new Date().toISOString()},{onConflict:'call_id'})
        if(msError) console.error('meeting_scores:',msError)

        // Coaching trigger if score < 50
        if(meetingScore<50){
          const sevenDaysAgo=new Date(Date.now()-7*86_400_000).toISOString()
          const{data:existingTrigger}=await supabase.from('coaching_triggers').select('id').eq('rep_id',rep_id).eq('trigger_type','live_score_drop').is('resolved_at',null).gte('created_at',sevenDaysAgo).limit(1)
          if(!existingTrigger?.length) await supabase.from('coaching_triggers').insert({org_id,rep_id,trigger_type:'live_score_drop',severity:'warning',trigger_data:{call_id,meeting_score:Math.round(meetingScore)}})
        }
      }catch(e){console.error('meeting scoring error:',e)}
    }

    // Final: update all score columns on live_scores with computed values
    {
      const{data:finalRow}=await supabase.from('live_scores').select('talk_ratio,question_quality_score,filler_word_rate,pacing_score,next_step_confirmed,objection_score,engagement_score,discovery_score,talk_ratio_score,objection_handling_score,filler_rate_per_min').eq('call_id',call_id).maybeSingle()
      if(finalRow){
        const objAvg=objections.length>0?Math.round(objections.reduce((s,o)=>s+(o.rep_response_score??0),0)/objections.length):finalRow.objection_handling_score
        const overallScore=Math.min(100,Math.max(0,Math.round(
          (finalRow.talk_ratio_score??50)*0.15+
          (finalRow.discovery_score??50)*0.20+
          (finalRow.engagement_score??50)*0.20+
          (objAvg??50)*0.15+
          (finalRow.question_quality_score??50)*0.15+
          (finalRow.pacing_score??50)*0.15
        )))
        const scoreUpdate:Record<string,unknown>={
          discovery_score:finalRow.discovery_score,
          objection_handling_score:objAvg,
          engagement_score:finalRow.engagement_score,
          talk_ratio_score:finalRow.talk_ratio_score,
          pacing_score:finalRow.pacing_score,
          question_quality_score:finalRow.question_quality_score,
          next_step_confirmed:finalRow.next_step_confirmed,
          filler_rate_per_min:finalRow.filler_rate_per_min,
          overall_score:overallScore,
          computed_at:new Date().toISOString(),
        }
        const{error:finalErr}=await supabase.from('live_scores').update(scoreUpdate).eq('call_id',call_id)
        if(finalErr) console.error('live_scores final update:',finalErr)
      }
    }

    return new Response(JSON.stringify({
      objections_detected:      objections.length,
      signals_detected:         signals.length,
      capitalised:              signals.filter((s:{capitalised:boolean})=>s.capitalised).length,
      missed:                   signals.filter((s:{capitalised:boolean})=>!s.capitalised).length,
      next_step_confirmed:      nextStepResult?.next_step_confirmed??null,
      next_step_date_mentioned: nextStepResult?.next_step_date_mentioned??null,
      pacing_windows_created:   pacingResult?.windows.length??null,
      pacing_score:             pacingResult?.pacing_score??null,
      sentiment_scored:         !sentimentAlreadySet,
    }),{status:200,headers:{...CORS,'Content-Type':'application/json'}})

  } catch(err) {
    console.error('call-intelligence-scorer error:',err)
    return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,'Content-Type':'application/json'}})
  }
})
