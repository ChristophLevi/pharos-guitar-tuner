import { noteNames } from './pitch.js?v=17';

const $ = id => document.getElementById(id);
const strings = [40, 45, 50, 55, 59, 64];
const halfStepStrings = [39, 44, 49, 54, 58, 63];
const flatNoteNames = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const frequencyForMidi = midi => 440 * 2 ** ((midi - 69) / 12);
const targetStrings = () => mode === 'half' ? halfStepStrings : strings;
const displayName = midi => (mode === 'half' ? flatNoteNames : noteNames)[(midi % 12 + 12) % 12];

let mode = 'standard';
let lock = null;
let context;
let stream;
let capture, worker, source;
let running = false, starting = false, epoch = 0, lifecycle = 0;
let toneContext, toneOutput;
let autoAdvanceTimer;
let allStringsComplete = false;
let referencePlayingUntil = 0;
let latestInTune = false;
function resetEngine() {
  epoch++;
  latestInTune=false;
  const remaining=Math.max(0,referencePlayingUntil-performance.now());
  worker?.postMessage({mode,lock,epoch,suppressUntil:remaining?(context?.currentTime||0)*1000+remaining:0});
  capture?.port.postMessage({epoch});
  document.querySelector('.hero').classList.remove('in-tune');
  $('needle').style.opacity='.25';
}

function playReferenceTone(midi) {
  try {
    const audio = context || (toneContext ||= new AudioContext());
    if (audio.state === 'suspended') audio.resume();
    const now = audio.currentTime;
    toneOutput?.disconnect();
    referencePlayingUntil = performance.now() + 1120;
    const filter = audio.createBiquadFilter();
    const drive = audio.createWaveShaper();
    const output = audio.createGain();
    toneOutput=output;
    const frequency = frequencyForMidi(midi);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3600, frequency * 8), now);
    filter.Q.value = 0.65;
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / (curve.length - 1) - 1;
      curve[i] = Math.tanh(x * 1.45);
    }
    drive.curve = curve;
    drive.oversample = '2x';
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
    output.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    drive.connect(filter).connect(output).connect(audio.destination);
    [1, 2, 3, 4, 5].forEach((partial, index) => {
      const oscillator = audio.createOscillator();
      const partialGain = audio.createGain();
      oscillator.type = index < 2 ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency * partial, now);
      partialGain.gain.value = [0.62, 0.24, 0.1, 0.045, 0.02][index];
      oscillator.connect(partialGain).connect(drive);
      oscillator.start(now);
      oscillator.stop(now + 1.0);
    });
    const noise = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.028), audio.sampleRate);
    const noiseData = noise.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    const pick = audio.createBufferSource();
    const pickGain = audio.createGain();
    const pickFilter = audio.createBiquadFilter();
    pick.buffer = noise;
    pickFilter.type = 'bandpass';
    pickFilter.frequency.value = Math.min(2600, frequency * 5);
    pickFilter.Q.value = 0.8;
    pickGain.gain.setValueAtTime(0.035, now);
    pickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    pick.connect(pickFilter).connect(pickGain).connect(drive);
    pick.start(now);
    pick.stop(now + 0.03);
    setTimeout(()=>output.disconnect(),1250);
    resetEngine();
  } catch {}
}

function selectString(index, playTone = true) {
  clearTimeout(autoAdvanceTimer);
  allStringsComplete = false;
  const targets = targetStrings();
  lock = index;
  referencePlayingUntil=0;
  resetEngine();
  drawStrings();
  $('connection').textContent = `${6 - index} 弦 · ${displayName(targets[index])}`;
  $('note').textContent = displayName(targets[index]);
  $('reading').textContent = `拨响 ${6 - index} 弦`;
  $('status').textContent = `已锁定 ${6 - index} 弦，不会跳弦`;
  if (playTone) playReferenceTone(targets[index]);
}

function prepareCelebration() {
  document.querySelectorAll('.celebration-burst').forEach((burst, burstIndex) => {
    burst.replaceChildren();
    const count = burstIndex === 0 ? 26 : 18;
    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / count + (burstIndex ? 0.18 : 0);
      const distance = (burstIndex ? 82 : 112) + (index % 4) * 11;
      const particle = document.createElement('i');
      particle.className = 'celebration-particle';
      particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--spin', `${(index % 2 ? 1 : -1) * (90 + index * 12)}deg`);
      particle.style.setProperty('--delay', `${(index % 5) * 16}ms`);
      particle.style.setProperty('--color', ['#68a83e', '#f2a93b', '#5c8fe8', '#d06aa8'][index % 4]);
      burst.append(particle);
    }
  });
}

function celebrate(note, stringIndex) {
  const overlay = $('celebration');
  $('celebration-detail').textContent = stringIndex === null ? note : `${6 - stringIndex} 弦 · ${note}`;
  prepareCelebration();
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'false');
  void overlay.offsetWidth;
  overlay.classList.add('show');
  if (navigator.vibrate) navigator.vibrate([10, 28, 16]);
  clearTimeout(celebrate.timer);
  celebrate.timer = setTimeout(() => overlay.setAttribute('aria-hidden', 'true'), 2600);
  clearTimeout(autoAdvanceTimer);
  if (stringIndex !== null && stringIndex < strings.length - 1 && running) {
    autoAdvanceTimer = setTimeout(() => { if(running && latestInTune) selectString(stringIndex + 1, true); }, 1500);
  } else if (stringIndex === strings.length - 1) {
    autoAdvanceTimer = setTimeout(() => { if(!running || !latestInTune)return; allStringsComplete = true; $('status').textContent = '六根弦已完成'; }, 2200);
  }
}

function drawStrings() {
  const box = $('strings');
  const targets = targetStrings();
  box.replaceChildren();
  box.hidden = false;
  targets.forEach((midi, index) => {
    const button = document.createElement('button');
    button.className = `string${lock === index ? ' active' : ''}`;
    button.setAttribute('aria-pressed', lock === index ? 'true' : 'false');
    if (lock === index) {
      button.style.background = '#1d1d1f';
      button.style.color = '#fff';
      button.style.boxShadow = '0 4px 12px #00000024';
    }
    button.innerHTML = `<small>${6 - index} 弦</small><strong>${displayName(midi)}</strong>`;
    button.onclick = () => selectString(index, true);
    box.append(button);
  });
}

function receiveReading(result) {
  if(!running)return;
  if(result.error){stop('音频分析中断，请重新开始');return;}
  if(result.epoch!==epoch || context.currentTime*1000-result.at>250)return;
  if(result.state!=='sustain'){
    if(result.state==='attack' || result.state==='reference'){latestInTune=false;clearTimeout(autoAdvanceTimer);}
    document.querySelector('.hero').classList.remove('in-tune');
    $('needle').style.opacity='.25';
    $('status').textContent=result.state==='reference'?'参考音 · 准备拨弦':result.state==='attack'?'正在聆听':'正在聆听 · 拨响一根弦';
    return;
  }
  const {cents,index,inTune}=result;
  latestInTune=inTune;
  if(!inTune)clearTimeout(autoAdvanceTimer);
  $('note').textContent=displayName(targetStrings()[index]);
  $('reading').textContent=inTune?'已调准':Math.abs(cents)<3?'接近调准':cents<0?`偏低 · 调紧 ${Math.abs(cents).toFixed(0)}`:`偏高 · 调松 ${Math.abs(cents).toFixed(0)}`;
  $('needle').style.left=`${50+Math.max(-50,Math.min(50,cents))}%`;
  $('needle').style.opacity='1';
  document.querySelector('.hero').classList.toggle('in-tune',inTune);
  $('status').textContent=allStringsComplete?'六根弦已完成':lock===null?'正在聆听 · 拨响一根弦':`正在聆听 · 已锁定 ${6-lock} 弦`;
  if(result.celebrate)celebrate($('note').textContent,index);
}

async function stop(message='麦克风只在你点击后开启') {
  running=false;starting=false;epoch++;lifecycle++;
  clearTimeout(autoAdvanceTimer);
  clearTimeout(celebrate.timer);
  $('celebration').setAttribute('aria-hidden','true');
  toneOutput?.disconnect();toneOutput=null;
  capture?.disconnect();source?.disconnect();worker?.terminate();
  capture=null;worker=null;source=null;
  stream?.getTracks().forEach(track=>track.stop());stream=null;
  const previous=context;context=null;
  if(previous && previous.state!=='closed')await previous.close();
  latestInTune=false;allStringsComplete=false;referencePlayingUntil=0;
  $('start').classList.remove('running');$('start').textContent='开始调音';
  $('start').disabled=false;
  $('status').textContent=message;
  document.querySelector('.hero').classList.remove('in-tune');
  $('needle').style.opacity='.25';
}

drawStrings();

document.querySelectorAll('[data-mode]').forEach(button => {
  button.onclick = () => {
    clearTimeout(autoAdvanceTimer);
    mode = button.dataset.mode;
    lock = null;
    toneOutput?.disconnect();
    referencePlayingUntil=0;
    allStringsComplete=false;
    resetEngine();
    $('connection').textContent = mode === 'standard' ? '选择一根弦' : '降半音 · 选择一根弦';
    $('note').textContent = '—';
    $('reading').textContent = '准备好，拨响一根弦';
    $('needle').style.left = '50%';
    document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('selected', item === button));
    $('mode').textContent = mode === 'standard' ? '标准调弦' : '降半音调弦';
    drawStrings();
  };
});

$('start').onclick = async () => {
  if(starting)return;
  if(running)return stop();
  if(!isSecureContext){$('status').textContent='请使用 HTTPS 地址开启麦克风';return;}
  starting=true;$('start').disabled=true;
  const cycle=++lifecycle;
  try{
    context=new AudioContext({sampleRate:48000});
    await context.resume();
    if(!context.audioWorklet)throw new Error('worklet');
    await context.audioWorklet.addModule('./capture-worklet.js?v=17');
    if(cycle!==lifecycle)return;
    const acquired=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    if(cycle!==lifecycle){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;
    source=context.createMediaStreamSource(stream);
    const highpass=context.createBiquadFilter(),lowpass=context.createBiquadFilter();
    highpass.type='highpass';highpass.frequency.value=45;highpass.Q.value=0.7;
    lowpass.type='lowpass';lowpass.frequency.value=1800;lowpass.Q.value=0.7;
    capture=new AudioWorkletNode(context,'tuner-capture');
    worker=new Worker('./tuner-worker.js?v=17',{type:'module'});
    worker.onmessage=({data})=>receiveReading(data);
    worker.onerror=()=>stop('音频分析中断，请重新开始');
    capture.onprocessorerror=()=>stop('音频采集中断，请重新开始');
    const channel=new MessageChannel();
    worker.postMessage({port:channel.port1},[channel.port1]);
    capture.port.postMessage({port:channel.port2},[channel.port2]);
    source.connect(highpass).connect(lowpass).connect(capture).connect(context.destination);
    // The worklet outputs silence: microphone audio is never sent to speakers.
    running=true;allStringsComplete=false;resetEngine();
    stream.getAudioTracks()[0].onended=()=>{if(running)stop('麦克风连接已断开，请重新开始');};
    $('start').classList.add('running');$('start').textContent='停止调音';
    $('status').textContent='正在聆听 · 拨响一根弦';
  }catch(error){await stop(error.message==='worklet'?'请使用支持音频处理的新版浏览器':'无法使用麦克风，请检查浏览器权限');}
  finally{starting=false;$('start').disabled=false;}
};

document.addEventListener('visibilitychange', async () => {
  if (running && document.visibilityState === 'visible' && context?.state === 'suspended') await context.resume();
});

window.addEventListener('pagehide',()=>{if(running || starting)stop();});

if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('./sw.js').catch(() => {});
