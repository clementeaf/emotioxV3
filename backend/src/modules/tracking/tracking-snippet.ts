/**
 * Tracking Snippet Generator
 * Generates the injectable JavaScript that captures user interactions on external websites.
 */

interface SnippetConfig {
    researchId: string;
    apiBaseUrl: string;
    captureClicks: boolean;
    captureScroll: boolean;
    captureMousemove: boolean;
    consentRequired: boolean;
    flushIntervalMs: number;
    maxEventsPerFlush: number;
    allowedDomains: string[];
    consentText: string;
    consentAcceptLabel: string;
    consentDeclineLabel: string;
    consentPosition: 'bottom' | 'top';
    samplingRate: number;
    targetPages: string[];
    excludePages: string[];
}

export const generateTrackingSnippet = (config: SnippetConfig): string => {
    return `(function(){
"use strict";
var C=${JSON.stringify({
        rid: config.researchId,
        api: config.apiBaseUrl,
        clicks: config.captureClicks,
        scroll: config.captureScroll,
        mouse: config.captureMousemove,
        consent: config.consentRequired,
        flush: config.flushIntervalMs,
        max: config.maxEventsPerFlush,
        domains: config.allowedDomains,
        cText: config.consentText,
        cAccept: config.consentAcceptLabel,
        cDecline: config.consentDeclineLabel,
        cPos: config.consentPosition,
        sampling: config.samplingRate,
        targetPg: config.targetPages,
        excludePg: config.excludePages,
    })};

var sid=null,vid=null,buf=[],timer=null,consented=!C.consent;

// Domain validation — abort if hostname not in allowedDomains
function checkDomain(){
    if(!C.domains||!C.domains.length)return true;
    var h=location.hostname;
    for(var i=0;i<C.domains.length;i++){
        if(h===C.domains[i]||h.endsWith("."+C.domains[i]))return true;
    }
    return false;
}

// Visitor ID (persistent per browser)
function getVid(){
    try{var v=localStorage.getItem("_ecx_vid");if(v)return v;
    v="v_"+Math.random().toString(36).substr(2,12)+Date.now().toString(36);
    localStorage.setItem("_ecx_vid",v);return v;}
    catch(e){return "v_"+Math.random().toString(36).substr(2,12);}
}

// CSS selector for element
function getSelector(el){
    if(!el||!el.tagName)return"";
    var parts=[];var cur=el;
    for(var i=0;i<5&&cur&&cur.tagName;i++){
        var tag=cur.tagName.toLowerCase();
        if(cur.id){parts.unshift(tag+"#"+cur.id);break;}
        var cls=cur.className&&typeof cur.className==="string"?"."+cur.className.trim().split(/\\s+/).slice(0,2).join("."):"";
        parts.unshift(tag+cls);
        cur=cur.parentElement;
    }
    return parts.join(" > ").substr(0,500);
}

// Get text content (truncated)
function getText(el){
    if(!el)return"";
    var t=(el.textContent||el.innerText||"").trim();
    return t.substr(0,255);
}

// Push event to buffer (accepts events before session is ready)
function push(evt){
    if(!consented)return;
    buf.push(evt);
    if(sid&&buf.length>=C.max)flush();
}

// Flush buffer to API — uses text/plain to avoid CORS preflight with sendBeacon
function flush(){
    if(!buf.length||!sid)return;
    var batch=buf.splice(0,C.max);
    var body=JSON.stringify({sessionId:sid,events:batch});
    try{
        if(navigator.sendBeacon){
            navigator.sendBeacon(C.api+"/public/tracking/"+C.rid+"/events",
                new Blob([body],{type:"application/json"}));
        }else{
            var xhr=new XMLHttpRequest();
            xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/events",true);
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(body);
        }
    }catch(e){}
}

var capturing=false,lastUrl="",snapshotSent={},pageStart=Date.now();

// Capture DOM snapshot — strip scripts, absolutize URLs, send once per page URL
function captureSnapshot(){
    var url=location.href;
    if(snapshotSent[url])return;
    snapshotSent[url]=true;
    try{
        var clone=document.documentElement.cloneNode(true);
        // Remove all script tags
        var scripts=clone.querySelectorAll("script");
        for(var i=0;i<scripts.length;i++)scripts[i].remove();
        // Absolutize relative URLs in images, links, stylesheets
        var base=location.origin;
        function absUrl(el,attr){
            var v=el.getAttribute(attr);
            if(v&&v.indexOf("//")< 0&&v.charAt(0)==="/")el.setAttribute(attr,base+v);
            else if(v&&v.indexOf("//")< 0&&v.indexOf("data:")< 0&&v.charAt(0)!=="/" &&v.charAt(0)!=="#")el.setAttribute(attr,base+"/"+v);
        }
        var els=clone.querySelectorAll("[src],[href]");
        for(var j=0;j<els.length;j++){
            if(els[j].hasAttribute("src"))absUrl(els[j],"src");
            if(els[j].hasAttribute("href"))absUrl(els[j],"href");
        }
        // Absolutize CSS url() references in inline styles
        var styled=clone.querySelectorAll("[style]");
        for(var k=0;k<styled.length;k++){
            var s=styled[k].getAttribute("style");
            if(s&&s.indexOf("url(")>=0){styled[k].setAttribute("style",s.replace(/url\\(["']?\\/([^"')]+)["']?\\)/g,"url("+base+"/$1)"));}
        }
        var html="<!DOCTYPE html>"+clone.outerHTML;
        // Cap at 2MB
        if(html.length>2097152)return;
        var xhr2=new XMLHttpRequest();
        xhr2.open("POST",C.api+"/public/tracking/"+C.rid+"/snapshot",true);
        xhr2.setRequestHeader("Content-Type","application/json");
        xhr2.send(JSON.stringify({pageUrl:url,html:html}));
    }catch(e){}
    // Also capture a pixel-perfect screenshot via html2canvas
    captureScreenshot(url);
}

// Device category based on viewport width
function getDeviceCat(){
    var w=window.innerWidth;
    if(w<768)return"mobile";
    if(w<=1024)return"tablet";
    return"desktop";
}

// Wait for all visible images to finish loading
function waitForImages(){
    var imgs=document.querySelectorAll("img");
    var promises=[];
    for(var i=0;i<imgs.length;i++){
        if(!imgs[i].complete){
            promises.push(new Promise(function(resolve){
                var img=imgs[i];
                img.addEventListener("load",resolve);
                img.addEventListener("error",resolve);
                // Timeout fallback per image
                setTimeout(resolve,5000);
            }));
        }
    }
    return Promise.all(promises);
}

// Capture screenshot using html2canvas — loads lib dynamically, sends base64 JPEG
var screenshotSent={};
function captureScreenshot(url){
    var cat=getDeviceCat();
    var key=url+"__"+cat;
    if(screenshotSent[key])return;
    screenshotSent[key]=true;
    function doCapture(){
        waitForImages().then(function(){
            try{
                // Capture full page at current viewport width
                var vw=window.innerWidth;
                var fullH=Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                );
                // Cap height to prevent memory issues (max ~8000px)
                var captureH=Math.min(fullH,8000);
                window.html2canvas(document.documentElement,{
                    useCORS:true,
                    allowTaint:false,
                    scale:1,
                    logging:false,
                    width:vw,
                    height:captureH,
                    windowWidth:vw,
                    windowHeight:captureH,
                    x:0,
                    y:0,
                    scrollX:0,
                    scrollY:0
                }).then(function(canvas){
                    var data=canvas.toDataURL("image/jpeg",0.8);
                    // Cap at ~5MB base64
                    if(data.length>5242880)return;
                    var xhr3=new XMLHttpRequest();
                    xhr3.open("POST",C.api+"/public/tracking/"+C.rid+"/screenshot",true);
                    xhr3.setRequestHeader("Content-Type","application/json");
                    xhr3.send(JSON.stringify({pageUrl:url,imageData:data,device:cat}));
                }).catch(function(e){
                    screenshotSent[key]=false;
                });
            }catch(e){screenshotSent[key]=false;}
        });
    }
    // Load html2canvas if not already loaded
    if(window.html2canvas){doCapture();return;}
    var sc=document.createElement("script");
    sc.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    sc.onload=doCapture;
    sc.onerror=function(){screenshotSent[key]=false;};
    document.head.appendChild(sc);
}

// Create a new session on the backend
function createNewSession(){
    // Speed-browsing for previous page
    if(typeof pageStart!=="undefined"&&Date.now()-pageStart<2000){
        push({eventType:"pageview",timestampMs:Date.now(),metadata:{friction:"speed-browsing"}});
    }
    flush();
    sid=null;
    pageStart=Date.now();
    var body=JSON.stringify({
        visitorId:vid,
        pageUrl:location.href,
        pageTitle:document.title,
        viewportWidth:window.innerWidth,
        viewportHeight:window.innerHeight,
        screenWidth:screen.width,
        screenHeight:screen.height,
        userAgent:navigator.userAgent,
        referrer:document.referrer
    });
    var xhr=new XMLHttpRequest();
    xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/session",true);
    xhr.setRequestHeader("Content-Type","application/json");
    xhr.onload=function(){
        try{var r=JSON.parse(xhr.responseText);sid=r.sessionId;flush();captureSnapshot();}catch(e){}
    };
    xhr.send(body);
    lastUrl=location.href;
    push({eventType:"pageview",timestampMs:Date.now()});
}

// Start session — capture listeners attach once, session can be re-created for SPA nav
function startSession(){
    vid=getVid();
    if(!capturing){startCapture();capturing=true;}
    createNewSession();
}

// Consent banner
function showConsent(){
    var pos=C.cPos==="top"?"top:0;":"bottom:0;";
    var shadow=C.cPos==="top"?"box-shadow:0 2px 10px rgba(0,0,0,0.15);":"box-shadow:0 -2px 10px rgba(0,0,0,0.15);";
    var d=document.createElement("div");
    d.id="_ecx_consent";
    d.style.cssText="position:fixed;"+pos+"left:0;right:0;background:#1e293b;color:#fff;padding:12px 20px;font-family:-apple-system,sans-serif;font-size:14px;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;"+shadow;
    d.innerHTML='<span>'+C.cText+'</span><div><button id="_ecx_accept" style="background:#2563eb;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;margin-left:8px;font-size:13px;">'+C.cAccept+'</button><button id="_ecx_reject" style="background:transparent;color:#94a3b8;border:1px solid #475569;padding:6px 16px;border-radius:6px;cursor:pointer;margin-left:8px;font-size:13px;">'+C.cDecline+'</button></div>';
    document.body.appendChild(d);
    document.getElementById("_ecx_accept").onclick=function(){
        consented=true;d.remove();
        try{localStorage.setItem("_ecx_consent_"+C.rid,"1");}catch(e){}
        startSession();
    };
    document.getElementById("_ecx_reject").onclick=function(){
        d.remove();
        try{localStorage.setItem("_ecx_consent_"+C.rid,"0");}catch(e){}
    };
}

// Capture listeners — attach immediately, events buffer until session is ready
function startCapture(){
    // Friction detection state
    var clickLog=[];

    if(C.clicks){
        document.addEventListener("click",function(e){
            var now=Date.now(),vw=window.innerWidth||1;
            var cx=Math.round(e.clientX/vw*10000)/100,cy=Math.round(e.pageY/vw*10000)/100;
            var meta={};

            // Rage-click: 3+ clicks within 1s in ~same area (5% radius)
            clickLog.push({x:cx,y:cy,t:now});
            clickLog=clickLog.filter(function(c){return now-c.t<1000;});
            var nearby=clickLog.filter(function(c){return Math.abs(c.x-cx)<5&&Math.abs(c.y-cy)<5;});
            if(nearby.length>=3)meta.friction="rage-click";

            // Dead-click: click on non-interactive element
            var tag=(e.target.tagName||"").toLowerCase();
            var isInteractive=tag==="a"||tag==="button"||tag==="input"||tag==="select"||tag==="textarea"||e.target.closest("a,button,[role=button],[onclick]");
            if(!isInteractive&&!meta.friction)meta.friction="dead-click";

            push({eventType:"click",x:cx,y:cy,targetSelector:getSelector(e.target),targetText:getText(e.target),timestampMs:now,metadata:Object.keys(meta).length?meta:undefined});
        },true);
    }

    // Mouse-out detection
    document.addEventListener("visibilitychange",function(){
        if(document.visibilityState==="hidden"){
            push({eventType:"mouseleave",timestampMs:Date.now(),metadata:{friction:"mouse-out"}});
            flush();
        }
    });

    // Speed-browsing: detected on SPA nav or unload if page duration < 2s
    window.addEventListener("beforeunload",function(){
        if(Date.now()-pageStart<2000)push({eventType:"pageview",timestampMs:Date.now(),metadata:{friction:"speed-browsing"}});
        flush();
    });

    if(C.scroll){
        var scrollTimer=null;
        window.addEventListener("scroll",function(){
            clearTimeout(scrollTimer);
            scrollTimer=setTimeout(function(){
                var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);
                var pct=h>0?Math.round((window.scrollY+window.innerHeight)/h*10000)/100:0;
                push({eventType:"scroll",scrollY:Math.round(window.scrollY),scrollDepthPct:Math.min(pct,100),timestampMs:Date.now()});
            },100);
        },true);
    }

    if(C.mouse){
        var lastMove=0;
        document.addEventListener("mousemove",function(e){
            var now=Date.now();
            if(now-lastMove<50)return;
            lastMove=now;
            var mvw=window.innerWidth||1;
            push({eventType:"mousemove",x:Math.round(e.clientX/mvw*10000)/100,y:Math.round(e.pageY/mvw*10000)/100,timestampMs:now});
        },true);
    }

    // Periodic flush
    timer=setInterval(flush,C.flush);

    // Flush on unload
    window.addEventListener("beforeunload",flush);
    document.addEventListener("visibilitychange",function(){
        if(document.visibilityState==="hidden")flush();
    });

    // SPA navigation detection — new session per route change
    var origPush=history.pushState,origReplace=history.replaceState;
    function onNav(){
        if(location.href!==lastUrl)createNewSession();
    }
    history.pushState=function(){origPush.apply(history,arguments);onNav();};
    history.replaceState=function(){origReplace.apply(history,arguments);onNav();};
    window.addEventListener("popstate",onNav);
}

// Init
if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
}else{init();}

// Page targeting — check if current URL matches include/exclude patterns
function checkPage(){
    var url=location.href;
    if(C.excludePg&&C.excludePg.length>0){
        for(var i=0;i<C.excludePg.length;i++){if(url.indexOf(C.excludePg[i])>=0)return false;}
    }
    if(C.targetPg&&C.targetPg.length>0){
        var ok=false;
        for(var j=0;j<C.targetPg.length;j++){if(url.indexOf(C.targetPg[j])>=0)ok=true;}
        return ok;
    }
    return true;
}

function init(){
    if(!checkDomain())return;
    if(!checkPage())return;
    // Sampling — skip this visitor with probability (100 - samplingRate)%
    if(C.sampling<100){
        try{
            var sk=localStorage.getItem("_ecx_sample_"+C.rid);
            if(sk==="0")return;
            if(!sk){var sampled=Math.random()*100<C.sampling;localStorage.setItem("_ecx_sample_"+C.rid,sampled?"1":"0");if(!sampled)return;}
        }catch(e){if(Math.random()*100>=C.sampling)return;}
    }
    if(C.consent){
        try{
            var prev=localStorage.getItem("_ecx_consent_"+C.rid);
            if(prev==="1"){consented=true;startSession();}
            else if(prev==="0"){return;}
            else{showConsent();}
        }catch(e){showConsent();}
    }else{
        consented=true;
        startSession();
    }
}
})();`;
};

/**
 * Generates the HTML snippet tag for embedding.
 */
export const generateEmbedSnippet = (researchId: string, apiBaseUrl: string): string => {
    return `<!-- EmotioCX Web Tracker -->
<script>
(function(r,a){var s=document.createElement("script");s.async=true;
s.src=a+"/public/tracking/"+r+"/script.js?v="+Math.floor(Date.now()/3600000);
document.head.appendChild(s);
})("${researchId}","${apiBaseUrl}");
</script>`;
};
