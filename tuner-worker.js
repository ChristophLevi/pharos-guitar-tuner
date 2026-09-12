import {TunerEngine} from './tuner-engine.js?v=17';
const engine=new TunerEngine();
onmessage=({data})=>{
  if(data.port){const port=data.port;port.onmessage=({data:frame})=>{
    try{if(frame.epoch===engine.epoch)postMessage(engine.process(frame.samples,frame.rate,frame.at));}
    catch(error){postMessage({error:String(error)});}
    finally{port.postMessage('ready');}
  };}
  else engine.configure(data);
};
