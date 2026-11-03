(function(){var T=['classic','nature','neon'],q=(location.search.match(/[?&]theme=(\w+)/)||[])[1],t=T.indexOf(q)>=0?q:null;
try{if(t)localStorage.setItem('bo_theme',t);else t=localStorage.getItem('bo_theme')}catch(e){}
if(T.indexOf(t)<0)t='classic';function set(x){t=x;document.documentElement.setAttribute('data-theme',x);try{localStorage.setItem('bo_theme',x)}catch(e){}
var b=document.getElementById('themeBtn2');if(b)b.textContent='🎨 Theme: '+x[0].toUpperCase()+x.slice(1)}
set(t);window.THEME={set:set,get:function(){return t},next:function(){set(T[(T.indexOf(t)+1)%3])}};
document.addEventListener('DOMContentLoaded',function(){set(t);['themeBtn','themeBtn2'].forEach(function(id){var b=document.getElementById(id);if(b)b.addEventListener('click',function(e){e.stopPropagation();THEME.next()})})});})();
