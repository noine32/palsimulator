(()=>{
  const SOURCE_URLS=new Set([
    'https://raw.githubusercontent.com/helios57/palworld/main/data/pals.json',
    'https://raw.githubusercontent.com/helios57/palworld/main/data/special_combos.json',
    'https://raw.githubusercontent.com/helios57/palworld/main/data/internal_id_map.json',
    'https://raw.githubusercontent.com/KrisCris/Palworld-Pal-Editor/develop/src/palworld_pal_editor/assets/data/pal_data.json',
    'https://raw.githubusercontent.com/KrisCris/Palworld-Pal-Editor/develop/src/palworld_pal_editor/assets/data/pal_passives.json'
  ]);
  const nativeFetch=window.fetch.bind(window);
  const inflight=new Map();
  const CACHE_NAME='palbreeder-public-data-v1';
  const TTL=24*60*60*1000;
  const stampKey=url=>`palbreeder.publicData.cachedAt:${url}`;

  async function cachedFetch(input,init){
    const url=typeof input==='string'?input:input?.url;
    if(!SOURCE_URLS.has(url))return nativeFetch(input,init);

    const existing=inflight.get(url);
    if(existing)return (await existing).clone();

    const work=(async()=>{
      let cache=null;
      try{if('caches'in window)cache=await caches.open(CACHE_NAME)}catch{}
      if(cache){
        const ts=Number(localStorage.getItem(stampKey(url))||0);
        if(ts&&Date.now()-ts<TTL){
          const hit=await cache.match(url);
          if(hit)return hit;
        }
      }

      const response=await nativeFetch(input,{...(init||{}),cache:'no-cache'});
      if(response.ok&&cache){
        try{
          await cache.put(url,response.clone());
          localStorage.setItem(stampKey(url),String(Date.now()));
        }catch{}
      }
      return response;
    })();

    inflight.set(url,work);
    try{return (await work).clone()}
    finally{inflight.delete(url)}
  }

  window.fetch=cachedFetch;
})();
