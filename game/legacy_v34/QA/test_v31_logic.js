const fs=require('fs'),vm=require('vm');
const all=new Map();
function el(id){if(!all.has(id))all.set(id,{id,style:{},textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){},insertAdjacentHTML(){},removeAttribute(){},getAttribute(a){return this[a]},setAttribute(a,b){this[a]=b},getContext(){return context},getBoundingClientRect(){return {left:0,top:0,width:200,height:100}},focus(){}});return all.get(id)}
const context={fillRect(){},strokeRect(){},beginPath(){},arc(){},fill(){},stroke(){},fillText(){},moveTo(){},lineTo(){},drawImage(){},ellipse(){},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
const document={body:{classList:{add(){},remove(){}}},getElementById:el,createElement(type){if(type==='canvas'){let o=el('created'+Math.random());o.width=96;o.height=128;return o}return el('created'+Math.random())},querySelectorAll(){return []},addEventListener(){},exitPointerLock(){}};
const window={addEventListener(){}};
const runtime={console,document,window,Image:function(){this.complete=true;this.width=400;this.height=500},HTMLImageElement:function(){},Math,Set,Map,Float32Array,Array,Number,JSON,String,Date,performance:{now(){return 1}},requestAnimationFrame(){},setTimeout(){},};
vm.createContext(runtime);
vm.runInContext(fs.readFileSync('game.js','utf8'),runtime);
const t=window.__V31_TEST__,g=t.getGame();let assertions=0;
function check(k,v){assertions++;if(!v)throw Error(k);console.log('PASS',k)}
check('5 active CCTV feeds',Object.keys(t.states).length===5);
check('50 camera frame paths',Object.values(t.states).every(a=>a.length===10));
check('first-person canvas starts',g.p.x===23.5&&g.p.a===-Math.PI/2);
check('Night ends 07:00',vm.runInContext('DAY_SECONDS===360',runtime));
check('map has accessible routes CAM10 to CAM16',t.bfs(5,5,23,15).length>0);
check('map has accessible routes CAM14 to CAM15',t.bfs(23,5,14,15).length>0);
check('starting point is walkable',t.grid[15][23]===0);
// emulate starting the night
el('startBtn').onclick();check('night starts',g.running);
g.p.x=5.4;g.p.y=5.3;t.interact();check('key pickup',g.p.inv.has('key'));
g.p.x=15.2;g.p.y=4.4;t.interact();check('fuse pickup',g.p.inv.has('fuse'));
g.ai=[];g.p.x=14.1;g.p.y=14.6;vm.runInContext('keys.KeyE=true',runtime);for(let i=0;i<140;i++)t.update(.05);check('generator can be restored',g.grid);
// turn off AI attacks and simulate victory
g.ai=[];g.battery=100;g.elapsed=355;for(let i=0;i<110;i++)t.update(.05);check('07:00 victory',g.over&&!g.running&&el('modalTitle').textContent.includes('07:00'));
t.reset();const g2=t.getGame();check('reset restores power OFF',!g2.grid);
console.log('ASSERTIONS',assertions);
