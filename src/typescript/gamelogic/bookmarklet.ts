/**
 * Makes the bookmarklet that copies today's NYT puzzle into this game. It points at whatever deployment made it, so
 * forks and other deployments point at themselves.
 *
 * NOTE: the window.gameData.today field names it reads (printDate, centerLetter, outerLetters, pangrams, answers) are
 * unverified assumptions about the NYT page.
 *
 * Rules for SOURCE: every statement ends in ';' and there are no comments, because its lines are joined with no
 * newline (bookmarks are a single line). It also avoids a literal '#' or '%' (bookmark addresses mangle them); '\x23' is
 * used for '#'.
 */

/** The bookmarklet's code, before the game's address is filled in */
const SOURCE = String.raw`
(function(){
var G=__GAME_URL__;
function grab(){
var g=window.gameData;if(g&&g.today){return g.today;}
var ss=document.getElementsByTagName('script');
for(var i=0;i<ss.length;i++){
var t=ss[i].textContent||'';var k=t.indexOf('window.gameData');if(k<0){continue;}
var s=t.indexOf('{',k);if(s<0){continue;}
var d=0,q=null,e=-1;
for(var j=s;j<t.length;j++){var c=t.charAt(j);
if(q){if(c==='\\'){j++;}else if(c===q){q=null;}continue;}
if(c==='"'||c==="'"){q=c;}else if(c==='{'){d++;}else if(c==='}'){d--;if(d===0){e=j;break;}}}
if(e>0){try{var o=JSON.parse(t.slice(s,e+1));if(o&&o.today){return o.today;}}catch(x){}}}
return null;}
function lc(x){return String(x).toLowerCase().replace(/[^a-z]/g,'');}
function ls(a){var r=[];a=a||[];for(var i=0;i<a.length;i++){var w=lc(a[i]);if(w){r.push(w);}}return r;}
function panel(p,u){
var old=document.getElementById('buzzoff-panel');if(old){old.remove();}
var b=document.createElement('div');b.id='buzzoff-panel';
b.style.cssText='position:fixed;left:12px;right:12px;top:12px;z-index:2147483647;background:white;color:black;border:2px solid black;border-radius:12px;padding:14px;font:16px/1.4 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3)';
var h=document.createElement('div');h.textContent='Puzzle copied for your game. If the game did not open, tap Open game, or Copy and paste it into the game.';b.appendChild(h);
var ta=document.createElement('textarea');ta.value=p;ta.readOnly=true;ta.style.cssText='width:100'+String.fromCharCode(37)+';height:80px;margin:10px 0;font:12px monospace;box-sizing:border-box';b.appendChild(ta);
var cp=document.createElement('button');cp.textContent='Copy';cp.style.cssText='font:inherit;padding:8px 16px;margin-right:8px';
cp.onclick=function(){ta.focus();ta.select();var done=function(){cp.textContent='Copied!';};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(p).then(done,function(){document.execCommand('copy');done();});}else{document.execCommand('copy');done();}};
b.appendChild(cp);
var a=document.createElement('a');a.href=u;a.target='_blank';a.textContent='Open game';a.style.cssText='margin-right:16px;font-weight:bold';b.appendChild(a);
var x=document.createElement('button');x.textContent='Close';x.style.cssText='font:inherit;padding:8px 16px';x.onclick=function(){b.remove();};b.appendChild(x);
document.body.appendChild(b);}
var t=grab();
if(!t||!t.centerLetter||!t.answers){alert('Open the NYT Spelling Bee puzzle page first, then tap this bookmark.');return;}
var outer=t.outerLetters;if(typeof outer==='string'){outer=outer.split('');}
var p='v1;d:'+String(t.printDate||'').replace(/[^0-9-]/g,'')+';c:'+lc(t.centerLetter)+';o:'+ls(outer).join('')+';p:'+ls(t.pangrams).join(',')+';w:'+ls(t.answers).join(',');
var u=G+'\x23nyt='+p;
panel(p,u);
var w=null;try{w=window.open(u,'_blank');}catch(x){}
if(!w){try{location.href=u;}catch(x){}}
})();
`;

/**
 * Writes a string as a JavaScript string literal with no '#' or '%' in it.
 *
 * @param s - The string
 * @returns The literal, including its quotes
 */
function jsStringLiteral(s: string): string {
    return JSON.stringify(s).replace(/%/g, '\\x25').replace(/#/g, '\\x23');
}

/**
 * Returns the bookmarklet's code, on one line.
 *
 * @param gameUrl - The address the bookmarklet opens the game at
 * @returns The code
 */
export function bookmarkletSource(gameUrl: string): string {
    return SOURCE.split('\n')
        .map((l) => l.trim())
        .join('')
        .replace('__GAME_URL__', () => jsStringLiteral(gameUrl));
}

/**
 * Returns the bookmarklet as a bookmark address.
 *
 * @param gameUrl - The address the bookmarklet opens the game at
 * @returns The javascript: address
 */
export function bookmarkletHref(gameUrl: string): string {
    return 'javascript:' + bookmarkletSource(gameUrl);
}

/**
 * Returns this game's address (without any query or hash).
 *
 * @returns The address
 */
export function currentGameUrl(): string {
    return location.origin + location.pathname;
}
