const B=require('../game'),T=require('../three'),H=require('../hunt'),TT=require('../team');
function make(S,mode){
 let room,g,roles,view,fly,catchBird;
 if(mode==='3p'){
  room=S.create3({role:'blue',bots:['red','hunter'],kind:'hyena'},null).room;
  g=room.g=T.newGame3('hyena',undefined,[3,3]);for(const p of [[2,1],[6,1],[2,5]])B.placeEgg(g,p);T.placeOstrich3(g,[6,5]);
  roles=['blue','red','hunter'];view=r=>S.view3(room,r);fly=()=>{g.turn='red';g.vulture=[3,1];return T.vultureFly3(g,[2,1]);};
  catchBird=()=>{g.turn='hunter';g.three.h=[3,3];g.three.pounce=false;g.vulture=[4,3];return T.hunterMove(g,[4,3]);};
 }else if(mode==='Hunters'){
  room=S.createH({role:'badger',bots:['blue','red','hyena']},null).room;
  g=room.g=H.newHunt(undefined,[[3,3],[8,3]]);for(const p of [[2,1],[6,1],[2,5]])B.placeEgg(g,p);H.placeOstrichH(g,[6,5]);
  roles=['blue','red','hyena','badger'];view=r=>S.viewH(room,r);fly=()=>{g.turn='red';g.vulture=[3,1];return H.vultureFlyH(g,[2,1]);};
  catchBird=()=>{g.turn='hyena';g.hunt.hs.hyena.p=[3,3];g.hunt.hs.hyena.pounce=false;g.vulture=[4,3];return H.hunterMove(g,[4,3]);};
 }else{
  room=S.createT({team:5,role:'o1',bots:['v1','v2','o2','hunter'],kind:'hyena'},null).room;
  g=room.g=TT.newTeam(5,'hyena');g.phase='play';g.turn='v1';g.b.o1.pos=[6,5];g.b.o2.pos=[7,5];g.b.v1.pos=[3,1];g.b.v2.pos=[8,6];g.h.p=[3,3];
  g.eggs.push({id:0,nest:0,pos:[2,1],alive:true,lastWarm:0},{id:1,nest:1,pos:[6,1],alive:true,lastWarm:0});
  roles=['o1','o2','v1','v2','hunter'];view=r=>S.viewT(room,r);fly=()=>{g.turn='v1';g.b.v1.pos=[3,1];return TT.vultureFly(g,'v1',[2,1]);};
  catchBird=()=>{g.turn='hunter';g.h.p=[3,3];g.h.pounce=false;g.b.v1.pos=[4,3];return TT.hunterMove(g,[4,3]);};
 }
 return {room,g,roles,view,fly,catchBird,bird:mode==='5p'?'v1':'red',red:mode==='5p'?'v1':'red',blue:mode==='5p'?'o1':'blue'};
}
module.exports={make};
