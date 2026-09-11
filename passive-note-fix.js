(()=>{
  const desc=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
  if(!desc?.get||!desc?.set)return;
  const DEFAULT_NOTE='最大4つまで選択できます。目的パルは上部の検索欄を使用します。';
  const resultLike=text=>/^(所持個体に供給元がないパッシブ:|探索範囲内で目的パルへ集約する候補が見つかりませんでした。|狙うパッシブ:)/.test(text);

  Object.defineProperty(Node.prototype,'textContent',{
    configurable:true,
    enumerable:desc.enumerable,
    get:desc.get,
    set(value){
      if(this?.nodeType===Node.ELEMENT_NODE&&this.id==='passiveNote'){
        const text=String(value??'');
        if(text==='計算中…')this.dataset.keepPassiveResult='';
        else if(resultLike(text))this.dataset.keepPassiveResult='1';
        else if(text===DEFAULT_NOTE&&this.dataset.keepPassiveResult==='1')return;
      }
      return desc.set.call(this,value);
    }
  });
})();
