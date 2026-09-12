// Only capture/copy on the real-time thread; expensive DSP stays in the Worker.
class Capture extends AudioWorkletProcessor {
  constructor(){super();this.ring=new Float32Array(4096);this.pos=0;this.filled=0;this.hop=0;this.pending=0;this.epoch=0;
    this.port.onmessage=({data})=>{
      if(data.port){this.sink=data.port;this.sink.onmessage=()=>{this.pending=Math.max(0,this.pending-1);};}
      if(data.epoch!==undefined){this.epoch=data.epoch;this.filled=0;this.hop=0;}
    };
  }
  process(inputs){
    const input=inputs[0]?.[0];if(!input)return true;
    for(let i=0;i<input.length;i++){
      this.ring[this.pos]=input[i];this.pos=(this.pos+1)%4096;this.filled++;this.hop++;
      if(this.filled>=4096&&this.hop>=1024){
        this.hop=0;
        if(this.sink&&this.pending<2){
          const samples=new Float32Array(4096);
          samples.set(this.ring.subarray(this.pos));samples.set(this.ring.subarray(0,this.pos),4096-this.pos);
          this.pending++;this.sink.postMessage({samples,rate:sampleRate,at:(currentFrame+i+1)/sampleRate*1000,epoch:this.epoch},[samples.buffer]);
        }
      }
    }
    return true;
  }
}
registerProcessor('tuner-capture',Capture);
