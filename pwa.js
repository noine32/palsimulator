(()=>{
  if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(()=>{});
  },{once:true});
})();
