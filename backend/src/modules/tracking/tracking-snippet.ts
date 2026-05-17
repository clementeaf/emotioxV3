/**
 * Tracking Snippet Generator v3
 * Generates the injectable JavaScript that captures user interactions on external websites.
 *
 * Architecture (rrweb-based, modeled after Hotjar/Mouseflow/PostHog):
 * - DOM recording: rrweb captures full DOM snapshot + incremental mutations + CSS inlining
 * - Heatmap data: clicks, scroll, mousemove stored as raw pixels (backend normalizes)
 * - Session: one per page (multi-page) or per route (SPA). Persistent visitor ID.
 * - Event queue: buffers heatmap events until session ID confirmed, then flushes.
 * - rrweb events: batched and sent every 5s to /rrweb-events endpoint.
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

console.log("[ECX] Tracker v3 loaded",C.rid,C.consent?"consent":"no-consent");

// ─── State ───────────────────────────────────────────────────────────
var sid=null,vid=null,buf=[],flushing=false,consented=!C.consent;
var timer=null,heartbeatTimer=null,pageStart=0,lastUrl="";
var capturing=false,rrwebStopFn=null,rrwebBuf=[];
var RRWEB_FLUSH_MS=5000;

// ─── Utilities ───────────────────────────────────────────────────────

function checkDomain(){
    if(!C.domains||!C.domains.length)return true;
    var h=location.hostname;
    for(var i=0;i<C.domains.length;i++){
        // Strip path/protocol — compare hostname only
        var d=C.domains[i].replace(/^https?:\\/\\//,"").split("/")[0].split(":")[0];
        if(h===d||h.endsWith("."+d))return true;
    }
    return false;
}

function checkPage(){
    var url=location.href;
    if(C.excludePg&&C.excludePg.length>0){
        for(var i=0;i<C.excludePg.length;i++){if(url.indexOf(C.excludePg[i])>=0)return false;}
    }
    if(C.targetPg&&C.targetPg.length>0){
        for(var j=0;j<C.targetPg.length;j++){if(url.indexOf(C.targetPg[j])>=0)return true;}
        return false;
    }
    return true;
}

function getVid(){
    try{
        var v=localStorage.getItem("_ecx_vid");
        if(v)return v;
        v="v_"+Math.random().toString(36).substr(2,12)+Date.now().toString(36);
        localStorage.setItem("_ecx_vid",v);
        return v;
    }catch(e){return "v_"+Math.random().toString(36).substr(2,12);}
}

function getSelector(el){
    if(!el||!el.tagName)return"";
    var parts=[],cur=el;
    for(var i=0;i<5&&cur&&cur.tagName;i++){
        var tag=cur.tagName.toLowerCase();
        if(cur.id){parts.unshift(tag+"#"+cur.id);break;}
        var cls=cur.className&&typeof cur.className==="string"
            ?"."+cur.className.trim().split(/\\s+/).slice(0,2).join("."):"";
        parts.unshift(tag+cls);
        cur=cur.parentElement;
    }
    return parts.join(" > ").substr(0,500);
}

function getText(el){
    if(!el)return"";
    return(el.textContent||el.innerText||"").trim().substr(0,255);
}

// ─── Heatmap Event Queue ─────────────────────────────────────────────

function push(evt){
    if(!consented)return;
    evt.timestampMs=evt.timestampMs||Date.now();
    buf.push(evt);
    if(sid&&buf.length>=C.max)flush();
}

function flush(){
    if(!buf.length||!sid||flushing)return;
    flushing=true;
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
    flushing=false;
    if(buf.length>0)setTimeout(flush,100);
}

// ─── rrweb Event Queue ───────────────────────────────────────────────

function flushRrweb(useBeacon){
    if(!rrwebBuf.length||!sid)return;
    var batch=rrwebBuf.splice(0,rrwebBuf.length);
    var body=JSON.stringify({sessionId:sid,events:batch});
    // rrweb full snapshots can be 500KB+ — sendBeacon has ~64KB limit.
    // Use XHR for periodic flushes, sendBeacon only as last resort on unload.
    try{
        if(useBeacon&&navigator.sendBeacon){
            // sendBeacon may silently fail for large payloads — best effort
            navigator.sendBeacon(C.api+"/public/tracking/"+C.rid+"/rrweb-events",
                new Blob([body],{type:"application/json"}));
        }else{
            var xhr=new XMLHttpRequest();
            xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/rrweb-events",true);
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(body);
        }
    }catch(e){}
}

// ─── Session Management ──────────────────────────────────────────────

function createSession(){
    if(pageStart&&Date.now()-pageStart<2000){
        push({eventType:"pageview",metadata:{friction:"speed-browsing"}});
    }
    if(sid){flush();flushRrweb();}
    sid=null;
    pageStart=Date.now();
    lastUrl=location.href;

    // Stop previous rrweb recording if running
    if(rrwebStopFn){try{rrwebStopFn();}catch(e){}rrwebStopFn=null;}

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

    function onSessionReady(sessionId){
        console.log("[ECX] Session ready:",sessionId);
        sid=sessionId;
        // Immediate heartbeat so verification detects this session instantly
        push({eventType:"scroll",scrollY:Math.round(window.scrollY),
            scrollDepthPct:Math.min(Math.round((window.scrollY+window.innerHeight)/
                Math.max(document.body.scrollHeight||1,document.documentElement.scrollHeight||1)*100),100)});
        if(buf.length>0)flush();
        startRrwebRecording();
        if(rrwebBuf.length>0)flushRrweb();
    }

    var xhr=new XMLHttpRequest();
    xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/session",true);
    xhr.setRequestHeader("Content-Type","application/json");
    xhr.onload=function(){
        console.log("[ECX] Session response:",xhr.status,xhr.responseText.slice(0,100));
        if(xhr.status>=400)return;
        try{
            var r=JSON.parse(xhr.responseText);
            if(r.sessionId)onSessionReady(r.sessionId);
        }catch(e){console.error("[ECX] Parse error:",e);}
    };
    xhr.onerror=function(){
        console.warn("[ECX] Session XHR error");
        setTimeout(function(){
            var xhr2=new XMLHttpRequest();
            xhr2.open("POST",C.api+"/public/tracking/"+C.rid+"/session",true);
            xhr2.setRequestHeader("Content-Type","application/json");
            xhr2.onload=function(){
                if(xhr2.status>=400)return;
                try{
                    var r=JSON.parse(xhr2.responseText);
                    if(r.sessionId)onSessionReady(r.sessionId);
                }catch(e2){}
            };
            xhr2.send(body);
        },2000);
    };
    xhr.send(body);

    push({eventType:"pageview",scrollY:0,scrollDepthPct:0});
}

// ─── rrweb Recording ─────────────────────────────────────────────────

function startRrwebRecording(){
    if(!window.rrweb||!window.rrweb.record)return;
    rrwebStopFn=window.rrweb.record({
        emit:function(event){
            rrwebBuf.push(event);
        },
        // Inline CSS rules so replay works without access to original stylesheets
        inlineStylesheet:true,
        // Record canvas content
        recordCanvas:false,
        // Mask all user input by default for privacy
        maskAllInputs:true,
        // Sample mousemove to reduce data volume (every 50ms, 20/s)
        sampling:{
            mousemove:50,
            mouseInteraction:true,
            scroll:150,
            input:"last"
        },
        // Collect fonts for accurate replay
        collectFonts:true,
        // Inline images as data URIs (prevents cross-origin issues)
        inlineImages:true,
        // Capture cross-origin iframes when possible
        recordCrossOriginIframes:false
    });
}

// ─── Capture Listeners (heatmap data) ────────────────────────────────

function startCapture(){
    if(capturing)return;
    capturing=true;

    var clickLog=[];

    // ── CLICKS ──────────────────────────────────────────────────────
    if(C.clicks){
        document.addEventListener("click",function(e){
            var now=Date.now();
            var px=e.pageX;
            var py=e.pageY;
            var meta={};

            clickLog.push({x:px,y:py,t:now});
            clickLog=clickLog.filter(function(c){return now-c.t<1000;});
            var nearby=clickLog.filter(function(c){
                return Math.abs(c.x-px)<30&&Math.abs(c.y-py)<30;
            });
            if(nearby.length>=3)meta.friction="rage-click";

            var tag=(e.target.tagName||"").toLowerCase();
            var isInteractive=tag==="a"||tag==="button"||tag==="input"||
                tag==="select"||tag==="textarea"||
                e.target.closest("a,button,[role=button],[onclick]");
            if(!isInteractive&&!meta.friction)meta.friction="dead-click";

            var elOx=null,elOy=null,elW=null,elH=null;
            try{
                var rect=e.target.getBoundingClientRect();
                if(rect.width>0&&rect.height>0){
                    elOx=Math.round((e.clientX-rect.left)/rect.width*10000)/100;
                    elOy=Math.round((e.clientY-rect.top)/rect.height*10000)/100;
                    elW=Math.round(rect.width);
                    elH=Math.round(rect.height);
                }
            }catch(ex){}

            push({
                eventType:"click",
                x:Math.round(px),
                y:Math.round(py),
                targetSelector:getSelector(e.target),
                targetText:getText(e.target),
                elementOffsetX:elOx,
                elementOffsetY:elOy,
                elementWidth:elW,
                elementHeight:elH,
                metadata:Object.keys(meta).length?meta:undefined
            });
        },true);
    }

    // ── SCROLL ──────────────────────────────────────────────────────
    if(C.scroll){
        var scrollTimer=null;
        window.addEventListener("scroll",function(){
            clearTimeout(scrollTimer);
            scrollTimer=setTimeout(function(){
                var docH=Math.max(
                    document.body.scrollHeight||0,
                    document.documentElement.scrollHeight||0
                );
                var pct=docH>0?Math.round((window.scrollY+window.innerHeight)/docH*100):0;
                push({
                    eventType:"scroll",
                    scrollY:Math.round(window.scrollY),
                    scrollDepthPct:Math.min(pct,100)
                });
            },150);
        },true);
    }

    // Viewport heartbeat removed — was generating ~60 events/min of noise,
    // inflating session duration and event counts. Real scroll events from
    // the user (above) are sufficient for attention heatmaps.

    // ── MOUSEMOVE ───────────────────────────────────────────────────
    if(C.mouse){
        var lastMove=0;
        document.addEventListener("mousemove",function(e){
            var now=Date.now();
            if(now-lastMove<500)return; // 2/s max (Mouseflow-level throttle)
            lastMove=now;
            push({
                eventType:"mousemove",
                x:Math.round(e.pageX),
                y:Math.round(e.pageY)
            });
        },true);
    }

    // ── VISIBILITY / UNLOAD ─────────────────────────────────────────
    document.addEventListener("visibilitychange",function(){
        if(document.visibilityState==="hidden"){
            push({eventType:"pageview",metadata:{friction:"mouse-out"}});
            flush();
            flushRrweb(true);
        }
    });

    window.addEventListener("beforeunload",function(){
        if(pageStart&&Date.now()-pageStart<2000){
            push({eventType:"pageview",metadata:{friction:"speed-browsing"}});
        }
        flush();
        flushRrweb(true);
    });

    // ── SPA NAVIGATION ──────────────────────────────────────────────
    // Only create new session when pathname changes (ignore hash/query).
    // Debounce 1s to avoid rapid-fire from framework route transitions.
    var origPush=history.pushState,origReplace=history.replaceState;
    var navTimer=null;
    function getPath(){return location.origin+location.pathname;}
    var lastPath=getPath();
    function onNav(){
        var p=getPath();
        if(p===lastPath)return;
        lastPath=p;
        clearTimeout(navTimer);
        navTimer=setTimeout(createSession,1000);
    }
    history.pushState=function(){origPush.apply(history,arguments);onNav();};
    history.replaceState=function(){origReplace.apply(history,arguments);onNav();};
    window.addEventListener("popstate",onNav);

    // ── PERIODIC FLUSH ──────────────────────────────────────────────
    timer=setInterval(flush,C.flush);

    // ── PERIODIC RRWEB FLUSH ────────────────────────────────────────
    setInterval(flushRrweb,RRWEB_FLUSH_MS);
}

// ─── Consent Banner ──────────────────────────────────────────────────

function showConsent(){
    var pos=C.cPos==="top"?"top:0;":"bottom:0;";
    var shadow=C.cPos==="top"?"box-shadow:0 2px 10px rgba(0,0,0,0.15);":"box-shadow:0 -2px 10px rgba(0,0,0,0.15);";
    var d=document.createElement("div");d.id="_ecx_consent";
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

// ─── Start Session ───────────────────────────────────────────────────

function startSession(){
    vid=getVid();
    startCapture();
    createSession();
}

// ─── Load rrweb ──────────────────────────────────────────────────────

function loadRrweb(cb){
    if(window.rrweb&&window.rrweb.record){console.log("[ECX] rrweb already loaded");cb();return;}
    console.log("[ECX] Loading rrweb from CDN...");
    var sc=document.createElement("script");
    sc.src="https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.4/dist/rrweb.min.js";
    sc.onload=function(){
        if(window.rrweb&&window.rrweb.record){console.log("[ECX] rrweb loaded OK");cb();}
        else{console.warn("[ECX] rrweb loaded but record not found");cb();}
    };
    sc.onerror=function(){
        console.warn("[ECX] rrweb CDN failed — heatmap-only mode");
        cb();
    };
    document.head.appendChild(sc);
}

// ─── Init ────────────────────────────────────────────────────────────

function init(){
    if(!checkDomain())return;
    if(!checkPage())return;
    // Sampling
    if(C.sampling<100){
        try{
            var sk=localStorage.getItem("_ecx_sample_"+C.rid);
            if(sk==="0")return;
            if(!sk){var sampled=Math.random()*100<C.sampling;localStorage.setItem("_ecx_sample_"+C.rid,sampled?"1":"0");if(!sampled)return;}
        }catch(e){if(Math.random()*100>=C.sampling)return;}
    }
    // Load rrweb first, then start
    loadRrweb(function(){
        if(C.consent){
            try{
                var prev=localStorage.getItem("_ecx_consent_"+C.rid);
                if(prev==="1"){consented=true;startSession();}
                else if(prev==="0")return;
                else showConsent();
            }catch(e){showConsent();}
        }else{
            consented=true;
            startSession();
        }
    });
}

if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}
else{init();}
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
