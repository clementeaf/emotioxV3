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
                new Blob([body],{type:"text/plain"}));
        }else{
            var xhr=new XMLHttpRequest();
            xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/events",true);
            xhr.setRequestHeader("Content-Type","text/plain");
            xhr.send(body);
        }
    }catch(e){}
}

var capturing=false,lastUrl="";

// Create a new session on the backend
function createNewSession(){
    flush();
    sid=null;
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
    xhr.setRequestHeader("Content-Type","text/plain");
    xhr.onload=function(){
        try{var r=JSON.parse(xhr.responseText);sid=r.sessionId;flush();}catch(e){}
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
    if(C.clicks){
        document.addEventListener("click",function(e){
            var vw=window.innerWidth||1;
            push({eventType:"click",x:Math.round(e.clientX/vw*10000)/100,y:Math.round(e.pageY/vw*10000)/100,targetSelector:getSelector(e.target),targetText:getText(e.target),timestampMs:Date.now()});
        },true);
    }

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

function init(){
    if(!checkDomain())return;
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
