import {search} from './search.mjs';
const $=id=>document.getElementById(id), sources={pdf:'教材原释义',supplement:'语境补充',dictionary:'词典候选'};
let database=null,unit='all',results=[],shown=24,timer;
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
function notify(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('toast').style.display='none',1800);}
function locate(o){return `Unit ${o.unit} · ${o.section} · PDF 第 ${o.page} 页`;}
function card(entry){
  const a=text('article','','word-card'),top=text('div','','card-top');
  top.append(text('h3',entry.english),text('span',sources[entry.meaningSource]||'补充释义',`source-tag ${entry.meaningSource}`));a.append(top);
  if(entry.pos||entry.phonetic)a.append(text('div',[entry.phonetic,entry.pos].filter(Boolean).join('  '),'pronunciation'));
  a.append(text('p',entry.meaning,'meaning'),text('div',entry.reason||'来自指定 PDF 的英文表达','match-reason'));
  const f=text('div','','card-footer'),loc=text('span','','location'),o=entry.occurrences[0];
  loc.append(text('b',`Unit ${o.unit}`),document.createTextNode(` · ${o.section} · 第 ${o.page} 页`));
  if(entry.occurrences.length>1)loc.append(document.createTextNode(` · 共 ${entry.occurrences.length} 处`));
  const copy=text('button','复制','copy');copy.type='button';copy.setAttribute('aria-label',`复制 ${entry.english}`);
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(entry.english);notify('已复制英文');}catch{notify('未能复制，请长按或选择英文复制');}});
  f.append(loc,copy);a.append(f);
  const evidence=text('details','','evidence');evidence.append(text('summary','查看原文与全部出处'));
  const body=text('div','','evidence-body');
  if(entry.meaningSource==='dictionary')body.append(text('p','本条中文为补充词典的常见义，并非 PDF 原有中文。请结合下方片段判断实际语境。','dictionary-note'));
  for(const occ of entry.occurrences){const row=text('div','','occurrence');row.append(text('div',locate(occ),'occurrence-label'),text('blockquote',occ.quote));body.append(row);}
  evidence.append(body);a.append(evidence);return a;
}
function draw(){
  $('results').replaceChildren();
  for(const r of results.slice(0,shown))$('results').append(card(r));
  $('more').hidden=shown>=results.length;$('more').textContent=`显示更多结果（还有 ${Math.max(0,results.length-shown)} 条）`;
  $('footnote').hidden=!$('query').value.trim()||!results.length;
}
function updateURL(){const p=new URLSearchParams();if($('query').value.trim())p.set('q',$('query').value.trim());if(unit!=='all')p.set('unit',unit);if($('scope').value!=='all')p.set('scope',$('scope').value);history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
function run(){
  if(!database)return;shown=24;const q=$('query').value.trim();updateURL();
  if(!q){
    $('result-kicker').textContent='从一个意思开始';$('results-heading').textContent='词汇拾页';
    const examples=['virtual reality','coverage','creativity','privacy','watershed','in the blink of an eye'];
    results=examples.map(en=>database.entries.find(e=>e.english.toLowerCase()===en&&e.occurrences.some(o=>unit==='all'||String(o.unit)===unit)&&( $('scope').value!=='pdf'||e.meaningSource==='pdf'))).filter(Boolean).map(e=>({...e,occurrences:e.occurrences.filter(o=>unit==='all'||String(o.unit)===unit)}));
    $('status').textContent='输入一个中文意思，查看所有匹配表达和它们的出处。';draw();return;
  }
  results=search(database.entries,q,{unit,scope:$('scope').value});
  $('result-kicker').textContent='从中文出发 · 回到原文';$('results-heading').textContent=`“${q}” 的查询结果`;
  const reviewed=results.filter(r=>r.meaningSource!=='dictionary').length;
  $('status').textContent=results.length?`找到 ${results.length} 条结果 · 教材与语境补充 ${reviewed} 条，词典候选 ${results.length-reviewed} 条`:'没有找到匹配结果。';
  draw();if(!results.length){const empty=text('div','','empty');empty.append(text('strong','换一个说法，或放宽筛选'),text('div','试试较短的中文关键词，例如“改变”“认识”。'),text('div','未找到表示当前释义索引未匹配，不代表 PDF 中一定没有相应表达。'));$('results').append(empty);}
}
$('search-form').addEventListener('submit',e=>{e.preventDefault();run();});
let debounce;$('query').addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(run,180);});
document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{$('query').value=b.dataset.query;run();$('query').focus();}));
document.querySelectorAll('[data-unit]').forEach(b=>b.addEventListener('click',()=>{unit=b.dataset.unit;document.querySelectorAll('[data-unit]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});run();}));
$('scope').addEventListener('change',run);$('more').addEventListener('click',()=>{shown+=24;draw();});
function coverage(meta){
  const container=$('coverage-content');container.replaceChildren(text('p',meta.description));
  const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');for(const h of ['单元','PDF 页','主要内容','检查说明'])tr.append(text('th',h));head.append(tr);table.append(head);
  const body=document.createElement('tbody');for(const p of meta.pages){const row=document.createElement('tr');for(const val of [`Unit ${p.unit}`,p.page,p.section,p.notes||'已按页面核对可辨认印刷文字'])row.append(text('td',val));body.append(row);}table.append(body);container.append(table);
  container.append(text('p','页码是 PDF 顺序页码，不是教材印刷页码。手写批注、扫描水印不纳入教材词库。词组按原文实际表达整理，不把跨句的单词拼成词组。'));
  if(meta.gaps?.length)container.append(text('p',meta.gaps.join('；'),'warning'));
  if(meta.dictionary){const p=text('p','普通单词的补充中文来自 ');const a=text('a',meta.dictionary.name);a.href=meta.dictionary.url;a.target='_blank';a.rel='noreferrer';p.append(a,document.createTextNode('。仅以 PDF 中的英文形式查取释义，不把外部词典的其他英文词条加入结果。'));container.append(p);}
  if(meta.untranslated?.length)container.append(text('p',`仍未建立中文释义的原文形式：${meta.untranslated.join('、')}。可用英文查询这些形式。`,'warning'));
}
try{
  const response=await fetch('./vocabulary.json',{cache:'no-cache'});if(!response.ok)throw new Error('词库请求失败');database=await response.json();
  if(!Array.isArray(database.entries)||!database.entries.length)throw new Error('词库数据为空');
  $('entry-count').textContent=new Set(database.entries.map(e=>e.english.toLowerCase())).size.toLocaleString();coverage(database.meta);
  const p=new URLSearchParams(location.search);$('query').value=(p.get('q')||'').slice(0,120);const u=p.get('unit');if(['2','3'].includes(u)){unit=u;document.querySelectorAll('[data-unit]').forEach(b=>{b.classList.toggle('active',b.dataset.unit===unit);b.setAttribute('aria-pressed',String(b.dataset.unit===unit));});}if(['pdf','reviewed'].includes(p.get('scope')))$('scope').value=p.get('scope');
  $('query').disabled=false;$('submit').disabled=false;run();
}catch(error){$('status').textContent='词库未能加载，请检查网络后刷新页面。';$('results').append(text('p','若使用本地文件，请通过本地 HTTP 服务打开网站。','empty'));console.error(error);}
