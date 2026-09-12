const natural=['C','D','E','F','G','A','B'],semitones=[0,2,4,5,7,9,11],opens=[64,59,55,50,45,40],tops=[14,28.4,42.8,57.2,71.6,86],fretCount=24,board=document.querySelector('#board');
const frets=Array.from({length:fretCount},(_,f)=>`<div class="fret" data-fret="${f+1}"></div>`).join('');
const strings=Array.from({length:6},(_,i)=>`<div class="string s${i+1}"></div>`).join('');
const labels=['<span></span>',...Array.from({length:fretCount},(_,f)=>`<span>${f+1}</span>`)].join('');
let cells='';
opens.forEach((open,i)=>{
  const openName=natural[semitones.indexOf(open%12)];
  cells+=`<span class="cell open${open%12===7?' root':''}" style="top:${tops[i]}%">${openName}</span>`;
  for(let fret=1;fret<=fretCount;fret++){
    const midi=open+fret,idx=semitones.indexOf(midi%12);
    if(idx<0) continue;
    const root=midi%12===7?' root':'';
    const p=(fret-.5)/fretCount;
    const left=`calc(34px + ${p*100}% - ${34*p}px)`;
    cells+=`<span class="cell${root}" style="left:${left};top:${tops[i]}%">${natural[idx]}</span>`;
  }
});
board.innerHTML=`<div class="nut"></div><div class="frets">${frets}${strings}${cells}</div><div class="fret-labels">${labels}</div>`;
