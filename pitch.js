/* Multi-candidate normalized-difference detector. Runs in a Worker. */
export function detectCandidates(input, sampleRate) {
  const step = Math.max(1, Math.floor(sampleRate / 12000));
  const n = Math.floor(input.length / step), rate = sampleRate / step;
  const x = new Float32Array(n);
  let mean = 0, peak = 0;
  for (let i=0;i<n;i++) {
    let v=0;
    for(let j=0;j<step;j++) { const s=input[i*step+j]; v+=s; peak=Math.max(peak,Math.abs(s)); }
    x[i]=v/step; mean+=x[i];
  }
  mean/=n;
  let energy=0;
  for(let i=0;i<n;i++){ x[i]-=mean; energy+=x[i]*x[i]; }
  const rms=Math.sqrt(energy/n);
  const result={rms,peak,candidates:[]};
  if(rms<0.00002) return result;
  const min=Math.floor(rate/420), max=Math.min(Math.ceil(rate/60),Math.floor(n/2)-2);
  const d=new Float64Array(max+2), y=new Float64Array(max+2);
  // Equal integration length prevents an artificial preference for long periods.
  const count=n-max-1;
  let sum=0;
  for(let tau=1;tau<=max+1;tau++){
    let v=0;
    for(let i=0;i<count;i++){const delta=x[i]-x[i+tau];v+=delta*delta;}
    d[tau]=v;sum+=v;y[tau]=sum ? v*tau/sum : 1;
  }
  for(let tau=min;tau<=max;tau++){
    if(y[tau]>0.42 || y[tau]>y[tau-1] || y[tau]>=y[tau+1]) continue;
    const denom=y[tau-1]-2*y[tau]+y[tau+1];
    const refined=tau+(denom ? (y[tau-1]-y[tau+1])/(2*denom):0);
    const frequency=rate/refined;
    if(frequency>=60 && frequency<=420) {
      let re=0,im=0,weight=0;
      for(let i=0;i<n;i++){
        const w=0.5-0.5*Math.cos(2*Math.PI*i/(n-1));
        const phase=2*Math.PI*frequency*i/rate;
        re+=x[i]*w*Math.cos(phase);im+=x[i]*w*Math.sin(phase);weight+=w;
      }
      const fundamentalSupport=2*(re*re+im*im)/(weight*weight*rms*rms);
      result.candidates.push({frequency,confidence:1-y[tau],fundamentalSupport});
    }
  }
  return result;
}
export function detectPitch(input,sampleRate,expectedFrequency=null){
  const r=detectCandidates(input,sampleRate);
  const sorted=r.candidates.sort((a,b)=>{
    const cost=c=>1-c.confidence+(expectedFrequency? Math.abs(Math.log2(c.frequency/expectedFrequency))*0.4: -Math.log2(c.frequency)*0.025);
    return cost(a)-cost(b);
  });
  return {...r,frequency:sorted[0]?.frequency??null,confidence:sorted[0]?.confidence??0};
}
export const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function noteInfo(frequency, reference = 440) {
  const midi = 69 + 12 * Math.log2(frequency / reference);
  const nearest = Math.round(midi);
  return {
    midi: nearest,
    name: noteNames[(nearest % 12 + 12) % 12],
    octave: Math.floor(nearest / 12) - 1,
    cents: (midi - nearest) * 100
  };
}
