/**
 * Tracking Snippet Generator v3.3
 * Injectable JS for capturing user interactions on external websites.
 *
 * Architecture (rrweb + heatmap events):
 * - DOM recording: rrweb full snapshot + incremental mutations + CSS inlining (5 min cap)
 * - Heatmap data: clicks, scroll, mousemove as raw pixels (backend normalizes)
 * - Session: one per page / per SPA pathname. Persistent visitor ID.
 * - Consent: localStorage primary, sessionStorage fallback (incognito-safe)
 * - rrweb events: XHR every 5s (not sendBeacon — 64KB limit)
 * - Visibility-aware: pauses capture + rrweb when tab is hidden, resumes on focus
 * - Session end: visibilitychange (primary) + beforeunload (backup)
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
    captureEmotions: boolean;
    emotionVideoEnabled: boolean;
    emotionModelBaseUrl: string;
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
        emotions: config.captureEmotions,
        emoVideo: config.emotionVideoEnabled,
        emoModelUrl: config.emotionModelBaseUrl,
    })};

// ─── State ───────────────────────────────────────────────────────────
var sid=null,vid=null,buf=[],flushing=false,consented=!C.consent;
var timer=null,pageStart=0;
var capturing=false,rrwebStopFn=null,rrwebBuf=[];
var RRWEB_FLUSH_MS=5000;
var RRWEB_MAX_MS=300000; // Stop rrweb recording after 5 min per session
var rrwebStartTime=0;
var paused=false; // true when tab is hidden — all capture stops
var activeMs=0,activeStart=0; // track real active time

// ─── Storage helpers (incognito-safe) ────────────────────────────────
// localStorage primary, sessionStorage fallback, memory last resort
var memStore={};
function store(k,v){
    try{localStorage.setItem(k,v);}catch(e){
        try{sessionStorage.setItem(k,v);}catch(e2){memStore[k]=v;}
    }
}
function load(k){
    try{var v=localStorage.getItem(k);if(v!==null)return v;}catch(e){}
    try{var v2=sessionStorage.getItem(k);if(v2!==null)return v2;}catch(e2){}
    return memStore[k]||null;
}

// ─── Utilities ───────────────────────────────────────────────────────

function checkDomain(){
    if(!C.domains||!C.domains.length)return true;
    var h=location.hostname;
    for(var i=0;i<C.domains.length;i++){
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
    var v=load("_ecx_vid");
    if(v)return v;
    v="v_"+Math.random().toString(36).substr(2,12)+Date.now().toString(36);
    store("_ecx_vid",v);
    return v;
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
    if(!consented||paused)return;
    evt.timestampMs=evt.timestampMs||Date.now();
    buf.push(evt);
    if(sid&&buf.length>=C.max)flush();
}

function flush(useBeacon){
    if(!buf.length||!sid||flushing)return;
    flushing=true;
    var batch=buf.splice(0,C.max);
    var totalActive=activeMs+(activeStart>0?Date.now()-activeStart:0);
    var body=JSON.stringify({sessionId:sid,events:batch,activeDurationMs:totalActive});
    var url=C.api+"/public/tracking/"+C.rid+"/events";
    try{
        var xhr=new XMLHttpRequest();
        xhr.open("POST",url,!useBeacon); // sync on unload, async otherwise
        xhr.setRequestHeader("Content-Type","application/json");
        xhr.send(body);
    }catch(e){}
    flushing=false;
    if(buf.length>0)setTimeout(flush,100);
}

// ─── rrweb Event Queue ───────────────────────────────────────────────

function flushRrweb(useBeacon){
    if(!rrwebBuf.length||!sid)return;
    var batch=rrwebBuf.splice(0,rrwebBuf.length);
    var body=JSON.stringify({sessionId:sid,events:batch});
    var url=C.api+"/public/tracking/"+C.rid+"/rrweb-events";
    // rrweb snapshots can be 500KB+ — sendBeacon silently drops payloads over ~64KB.
    // On page unload / visibility hidden, use synchronous XHR which has no size limit
    // and is still supported in unload handlers by all major browsers.
    try{
        if(useBeacon){
            var xhr=new XMLHttpRequest();
            xhr.open("POST",url,false); // synchronous — guaranteed delivery before tab dies
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(body);
        }else{
            var xhr2=new XMLHttpRequest();
            xhr2.open("POST",url,true);
            xhr2.setRequestHeader("Content-Type","application/json");
            xhr2.send(body);
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
    activeMs=0;
    activeStart=Date.now();
    paused=false;

    // Stop previous rrweb recording
    if(rrwebStopFn){try{rrwebStopFn();}catch(e){}rrwebStopFn=null;}
    rrwebActiveMs=0;

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
        sid=sessionId;
        // Immediate event so verification detects this session
        push({eventType:"scroll",scrollY:Math.round(window.scrollY),
            scrollDepthPct:Math.min(Math.round((window.scrollY+window.innerHeight)/
                Math.max(document.body.scrollHeight||1,document.documentElement.scrollHeight||1)*100),100)});
        if(buf.length>0)flush();
        startRrwebRecording();
        if(rrwebBuf.length>0)flushRrweb();
        startEmotionCapture();
        // Capture DOM snapshot after JS has rendered (for heatmap backdrop)
        setTimeout(function(){
            try{
                var html=document.documentElement.outerHTML;
                if(html.length>2000000)return; // skip if >2MB
                var sx=new XMLHttpRequest();
                sx.open("POST",C.api+"/public/tracking/"+C.rid+"/snapshot",true);
                sx.setRequestHeader("Content-Type","application/json");
                sx.send(JSON.stringify({pageUrl:location.href,html:html}));
            }catch(e){}
        },3000);
    }

    var xhr=new XMLHttpRequest();
    xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/session",true);
    xhr.setRequestHeader("Content-Type","application/json");
    xhr.onload=function(){
        if(xhr.status>=400)return;
        try{
            var r=JSON.parse(xhr.responseText);
            if(r.sessionId)onSessionReady(r.sessionId);
        }catch(e){}
    };
    xhr.onerror=function(){
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

var rrwebActiveMs=0; // accumulated active rrweb recording time
function startRrwebRecording(){
    if(!window.rrweb||!window.rrweb.record)return;
    rrwebStartTime=Date.now();
    rrwebStopFn=window.rrweb.record({
        emit:function(event){
            // Cap recording at 5 min of active time to prevent unbounded growth
            var elapsed=rrwebActiveMs+(Date.now()-rrwebStartTime);
            if(elapsed>RRWEB_MAX_MS){
                if(rrwebStopFn){try{rrwebStopFn();}catch(e){}rrwebStopFn=null;}
                return;
            }
            rrwebBuf.push(event);
        },
        inlineStylesheet:true,
        recordCanvas:false,
        maskAllInputs:true,
        sampling:{mousemove:50,mouseInteraction:true,scroll:150,input:"last"},
        collectFonts:true,
        inlineImages:true,
        recordCrossOriginIframes:false
    });
}

// ─── Capture Listeners (heatmap data) ────────────────────────────────

function startCapture(){
    if(capturing)return;
    capturing=true;

    var clickLog=[];

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

    if(C.mouse){
        var lastMove=0;
        document.addEventListener("mousemove",function(e){
            var now=Date.now();
            if(now-lastMove<500)return; // 2/s max
            lastMove=now;
            push({
                eventType:"mousemove",
                x:Math.round(e.pageX),
                y:Math.round(e.pageY)
            });
        },true);
    }

    // Visibility-aware capture: pause when tab hidden, resume when visible
    var hiddenAt=0;
    document.addEventListener("visibilitychange",function(){
        if(document.visibilityState==="hidden"){
            // Tab lost focus — pause all capture
            paused=true;
            hiddenAt=Date.now();
            if(activeStart>0)activeMs+=Date.now()-activeStart;
            activeStart=0;
            // Accumulate rrweb active time and stop recording
            if(rrwebStopFn){
                rrwebActiveMs+=Date.now()-rrwebStartTime;
                try{rrwebStopFn();}catch(e){}rrwebStopFn=null;
            }
            // Pause emotion capture
            if(emoRunning){emoActiveMs+=Date.now()-emoStartTime;stopEmotionCapture();}
            // Flush pending data before going to background
            flush(true);
            flushRrweb(true);
            flushEmotions(true);
        }else{
            // Tab regained focus
            var away=Date.now()-hiddenAt;
            if(away>30000){
                // Away >30s — start fresh session (old one already flushed)
                stopEmotionCapture();flushEmoVideo();
                createSession();
            }else{
                // Brief switch — resume existing session
                paused=false;
                activeStart=Date.now();
                startRrwebRecording();
                if(C.emotions&&emoStream&&!emoRunning){emoRunning=true;emoStartTime=Date.now();emoInterval=setInterval(sampleEmotion,500);}
            }
        }
    });

    window.addEventListener("beforeunload",function(){
        if(activeStart>0)activeMs+=Date.now()-activeStart;
        if(pageStart&&activeMs<2000){
            // Force-push so the event gets into buf before flush
            paused=false;
            push({eventType:"pageview",metadata:{friction:"speed-browsing"}});
        }
        flush(true);
        flushRrweb(true);
        stopEmotionCapture();
        flushEmotions(true);
        flushEmoVideo();
    });

    // SPA navigation — new session only when pathname changes, 1s debounce
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

    timer=setInterval(flush,C.flush);
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
        store("_ecx_consent_"+C.rid,"1");
        startSession();
    };
    document.getElementById("_ecx_reject").onclick=function(){
        d.remove();
        store("_ecx_consent_"+C.rid,"0");
    };
}

// ─── Start Session ───────────────────────────────────────────────────

function startSession(){
    vid=getVid();
    startCapture();
    createSession();
}

// ─── Emotion Recognition ─────────────────────────────────────────────

var emoBuf=[],emoRunning=false,emoVideo=null,emoStream=null;
var emoChunks=[],emoActiveMs=0,emoStartTime=0;
var EMO_MAX_MS=300000; // 5 min cap
var emoInterval=null;
var EXPRESSION_MAP={happy:"joy",sad:"sadness",angry:"anger",surprised:"surprise",disgusted:"disgust",fearful:"fear",neutral:"neutral"};

function startEmotionCapture(){
    if(!C.emotions||emoRunning)return;
    navigator.mediaDevices.getUserMedia({video:{width:320,height:240,facingMode:"user"},audio:false})
    .then(function(stream){
        emoStream=stream;
        var v=document.createElement("video");
        v.setAttribute("autoplay","");v.setAttribute("muted","");v.setAttribute("playsinline","");
        v.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
        v.srcObject=stream;
        document.body.appendChild(v);
        emoVideo=v;
        loadFaceApi(function(){
            loadEmoModels(function(){
                emoRunning=true;
                emoStartTime=Date.now();
                emoInterval=setInterval(sampleEmotion,500);
                if(C.emoVideo)startEmoRecording(stream);
            });
        });
    })
    .catch(function(e){
        // Camera denied — continue without emotions
    });
}

function loadFaceApi(cb){
    if(window.faceapi){cb();return;}
    var sc=document.createElement("script");
    sc.src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";
    sc.onload=function(){cb();};
    sc.onerror=function(){};
    document.head.appendChild(sc);
}

function loadEmoModels(cb){
    if(!window.faceapi)return;
    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(C.emoModelUrl),
        faceapi.nets.faceExpressionNet.loadFromUri(C.emoModelUrl)
    ]).then(cb).catch(function(){});
}

function sampleEmotion(){
    if(!emoRunning||paused||!emoVideo||emoVideo.readyState<2)return;
    var elapsed=emoActiveMs+(Date.now()-emoStartTime);
    if(elapsed>EMO_MAX_MS){stopEmotionCapture();return;}
    faceapi.detectSingleFace(emoVideo,new faceapi.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:0.4}))
    .withFaceExpressions()
    .then(function(det){
        if(!det||!emoRunning)return;
        var expr=det.expressions;
        var best="neutral",bestScore=0;
        for(var k in expr){
            if(expr[k]>bestScore){bestScore=expr[k];best=k;}
        }
        var mapped=EXPRESSION_MAP[best]||"neutral";
        emoBuf.push({timestamp:Date.now()-emoStartTime,emotion:mapped,confidence:Math.round(bestScore*1000)/1000});
    })
    .catch(function(){});
}

function startEmoRecording(stream){
    try{
        var mr=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp8"});
        emoChunks=[];
        mr.ondataavailable=function(e){if(e.data.size>0)emoChunks.push(e.data);};
        mr.start(1000);
        emoVideo._recorder=mr;
    }catch(e){}
}

function stopEmotionCapture(){
    emoRunning=false;
    if(emoInterval){clearInterval(emoInterval);emoInterval=null;}
    if(emoVideo&&emoVideo._recorder){
        try{emoVideo._recorder.stop();}catch(e){}
    }
}

function flushEmotions(sync){
    if(!emoBuf.length||!sid)return;
    var batch=emoBuf.splice(0,emoBuf.length);
    var body=JSON.stringify({sessionId:sid,samples:batch});
    var url=C.api+"/public/tracking/"+C.rid+"/emotions";
    try{
        var xhr=new XMLHttpRequest();
        xhr.open("POST",url,!sync);
        xhr.setRequestHeader("Content-Type","application/json");
        xhr.send(body);
    }catch(e){}
}

function flushEmoVideo(){
    if(!emoChunks.length||!sid||!C.emoVideo)return;
    var blob=new Blob(emoChunks,{type:"video/webm"});
    emoChunks=[];
    // Convert to base64 and POST (best-effort, async)
    var reader=new FileReader();
    reader.onloadend=function(){
        var b64=reader.result.split(",")[1];
        if(!b64||b64.length>20971520)return; // 15MB cap
        var body=JSON.stringify({sessionId:sid,video:b64});
        var url=C.api+"/public/tracking/"+C.rid+"/emotion-video";
        try{
            var xhr=new XMLHttpRequest();
            xhr.open("POST",url,true);
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(body);
        }catch(e){}
    };
    reader.readAsDataURL(blob);
}

// ─── Load rrweb ──────────────────────────────────────────────────────

function loadRrweb(cb){
    if(window.rrweb&&window.rrweb.record){cb();return;}
    var sc=document.createElement("script");
    sc.src="https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.4/dist/rrweb.min.js";
    sc.onload=function(){cb();};
    sc.onerror=function(){cb();};
    document.head.appendChild(sc);
}

// ─── Init ────────────────────────────────────────────────────────────

function init(){
    if(!checkDomain())return;
    if(!checkPage())return;
    if(C.sampling<100){
        var sk=load("_ecx_sample_"+C.rid);
        if(sk==="0")return;
        if(!sk){var sampled=Math.random()*100<C.sampling;store("_ecx_sample_"+C.rid,sampled?"1":"0");if(!sampled)return;}
    }
    loadRrweb(function(){
        if(C.consent){
            var prev=load("_ecx_consent_"+C.rid);
            if(prev==="1"){consented=true;startSession();}
            else if(prev==="0")return;
            else showConsent();
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
s.src=a+"/public/tracking/"+r+"/script.js?v="+Math.floor(Date.now()/60000);
document.head.appendChild(s);
})("${researchId}","${apiBaseUrl}");
</script>`;
};
