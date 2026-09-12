import {detectCandidates} from './pitch.js?v=17';
export const TUNINGS={standard:[40,45,50,55,59,64],half:[39,44,49,54,58,63]};
export const hz=m=>440*2**((m-69)/12);
const cents=(a,b)=>1200*Math.log2(a/b);
export class TunerEngine {
  constructor(){this.configure();}
  configure({mode='standard',lock=null,epoch=0,suppressUntil=0}={}){
    this.targets=TUNINGS[mode]||TUNINGS.standard;
    this.lock=lock;this.epoch=epoch;this.suppressUntil=suppressUntil;
    this.noise=0.00003;this.lastAt=null;this.lastValid=-Infinity;
    this.value=null;this.index=null;this.pending=null;this.pendingAt=0;
    this.goodAt=null;this.exitAt=null;this.inTune=false;this.celebrated=false;
  }
  process(samples,rate,at){
    const r=detectCandidates(samples,rate);
    const base={at,epoch:this.epoch,rms:r.rms,clipping:r.peak>0.98};
    if(at < this.suppressUntil+samples.length/rate*1000) return {...base,state:'reference'};
    const dt=this.lastAt===null?21:Math.min(100,Math.max(1,at-this.lastAt));this.lastAt=at;
    if(!r.candidates.length) this.noise+=0.025*(Math.min(r.rms,0.001)-this.noise);
    else if(r.rms*0.25<this.noise) this.noise+=0.25*(r.rms*0.25-this.noise);
    const following=at-this.lastValid<250;
    const gate=Math.max(0.000035,this.noise*(following?1.6:2.4));
    const choices=[];
    for(const c of r.candidates){
      if(c.confidence<(following?0.64:0.72) || r.rms<gate) continue;
      for(let i=0;i<6;i++){
        if(this.lock!==null && i!==this.lock)continue;
        const offset=cents(c.frequency,hz(this.targets[i]));
        if(Math.abs(offset)>(this.lock===null?180:350))continue;
        let cost=(1-c.confidence)*3+Math.abs(offset)/1200;
        // Prefer the shortest credible period, avoiding subharmonic aliases.
        const higher=r.candidates.some(h=>h.frequency>c.frequency*1.8 && h.confidence>c.confidence-0.035);
        // A selected low string must not "tune" to a pure higher string's subharmonic.
        // Retain weak fundamentals when the spectrum actually supports them.
        if(higher && c.fundamentalSupport<0.004)continue;
        if(following && this.index===i && this.value!==null)cost+=Math.min(0.35,Math.abs(offset-this.value)/600);
        choices.push({...c,index:i,offset,cost});
      }
    }
    choices.sort((a,b)=>a.cost-b.cost);
    const best=choices[0];
    if(!best){
      this.goodAt=null;this.exitAt=null;this.inTune=false;
      if(at-this.lastValid>250){this.value=null;this.index=null;this.pending=null;}
      return {...base,state:following?'decay':'quiet'};
    }
    const switching=this.index!==best.index || this.value===null;
    const jump=!switching && Math.abs(best.offset-this.value)>85;
    if(switching || jump){
      if(!this.pending || this.pending.index!==best.index || Math.abs(best.offset-this.pending.offset)>45){this.pending=best;this.pendingAt=at;}
      this.pending.offset=best.offset;
      if(at-this.pendingAt<(switching?65:85)) return {...base,state:'attack'};
      this.value=best.offset;this.index=best.index;this.goodAt=null;this.inTune=false;this.celebrated=false;
    }else{
      this.pending=null;
      const delta=best.offset-this.value;
      // Fast enough to follow a peg turn, slower near a settled pitch.
      const tau=Math.abs(delta)>12?45:85;
      this.value+= (1-Math.exp(-dt/tau))*delta;
    }
    this.lastValid=at;
    const error=Math.abs(best.offset), shownError=Math.abs(this.value);
    if(error<=3 && shownError<=3){
      this.goodAt??=at;
      if(at-this.goodAt>=300)this.inTune=true;
      this.exitAt=null;
    }else{
      this.goodAt=null;
      if(error>7){this.exitAt??=at;if(at-this.exitAt>=150){this.inTune=false;this.celebrated=false;}}
      else this.exitAt=null;
    }
    const celebrate=this.inTune&&!this.celebrated;
    if(celebrate)this.celebrated=true;
    return {...base,state:'sustain',index:this.index,cents:this.value,rawCents:best.offset,
      frequency:best.frequency,confidence:best.confidence,inTune:this.inTune,celebrate};
  }
}
