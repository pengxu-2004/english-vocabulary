export const normalize = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[‐‑–—]/g,'-').replace(/[\s·，,；;。.!！?？、:：()（）]/g,'');
export function evaluate(entry, query) {
  const q=normalize(query);if(!q)return null;
  const en=normalize(entry.english), meanings=String(entry.meaning).split(/[；;\n]/).map(normalize).filter(Boolean);
  const aliases=(entry.aliases||[]).map(normalize).filter(Boolean);
  let score=0,reason='';
  if(en===q){score=1100;reason='英文精确匹配';}
  else if(meanings.includes(q)){score=1000;reason='释义精确匹配';}
  else if(aliases.includes(q)){score=940;reason='近义表达匹配';}
  else if(meanings.some(m=>m.includes(q))){score=800;reason='释义关键词匹配';}
  else if(aliases.some(a=>a.includes(q))){score=720;reason='近义关键词匹配';}
  else if(/^[a-z\s'-]+$/i.test(query)&&en.includes(q)){score=650;reason='英文部分匹配';}
  else {
    const terms=String(query).trim().split(/[\s，,、；;]+/).map(normalize).filter(Boolean);
    if(terms.length>1&&terms.every(t=>meanings.some(m=>m.includes(t)))){score=600;reason='多个关键词匹配';}
  }
  if(!score)return null;
  // Context-reviewed meanings precede broad dictionary senses at the same match level.
  score+=entry.meaningSource==='pdf'?25:entry.meaningSource==='supplement'?10:-200;
  return {score,reason};
}
export function search(entries, query, {unit='all',scope='all'}={}) {
  const found=[];
  for(const entry of entries){
    if(scope==='pdf'&&entry.meaningSource!=='pdf')continue;
    if(scope==='reviewed'&&entry.meaningSource==='dictionary')continue;
    const occurrences=entry.occurrences.filter(o=>unit==='all'||String(o.unit)===String(unit));
    if(!occurrences.length)continue;
    const match=evaluate(entry,query);if(match)found.push({...entry,occurrences,...match});
  }
  const contextMatches=new Set(found.filter(e=>e.meaningSource!=='dictionary').map(e=>normalize(e.english)));
  return found.filter(e=>e.meaningSource!=='dictionary'||!contextMatches.has(normalize(e.english))).sort((a,b)=>b.score-a.score||a.english.localeCompare(b.english,'en'));
}
