(function(){var T=['classic','nature','notes','golden','paper','arcade','toybox','tactical','storm','volcano','comic','pharaoh','neon'],q=(location.search.match(/[?&]theme=(\w+)/)||[])[1],t=T.indexOf(q)>=0?q:null;
try{if(t)localStorage.setItem('bo_theme',t);else t=localStorage.getItem('bo_theme')}catch(e){}
if(T.indexOf(t)<0)t='classic';function set(x){t=x;document.documentElement.setAttribute('data-theme',x);try{localStorage.setItem('bo_theme',x)}catch(e){}
var b=document.getElementById('themeBtn2');if(b)b.title='Theme: '+({classic:'Classic',nature:'Nature',notes:'Field notes',golden:'Golden hour',paper:'Papercraft',arcade:'Arcade',toybox:'Toybox',tactical:'Tactical',storm:'Savanna storm',volcano:'Volcano',comic:'Comic pop',pharaoh:'Pharaoh sunset',neon:'Neon'})[x]}
set(t);var _set=set;set=function(x){_set(x);try{document.dispatchEvent(new Event('themechange'))}catch(e){}};window.THEME={set:set,get:function(){return t},next:function(){set(T[(T.indexOf(t)+1)%T.length])}};
document.addEventListener('DOMContentLoaded',function(){set(t);['themeBtn','themeBtn2'].forEach(function(id){var b=document.getElementById(id);if(b)b.addEventListener('click',function(e){e.stopPropagation();THEME.next()})})});})();
document.addEventListener('themechange',()=>{try{if(window.UI&&UI._rr)UI._rr()}catch(e){}});
