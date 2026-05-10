/**
 * Tracking Snippet Generator v2
 * Generates the injectable JavaScript that captures user interactions on external websites.
 *
 * Architecture (modeled after Hotjar/Mouseflow/rrweb):
 * - Coordinates: raw pixels (pageX, pageY). Backend normalizes at query time.
 * - Session: one per page (multi-page) or per route (SPA). Persistent visitor ID.
 * - Event queue: buffers events until session ID is confirmed, then flushes.
 * - Viewport heartbeat: emits scroll position every 1s for attention heatmap.
 * - Element data: selector + element-relative offsets for element-based heatmaps.
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

// ─── State ───────────────────────────────────────────────────────────
var sid=null,vid=null,buf=[],flushing=false,consented=!C.consent;
var timer=null,heartbeatTimer=null,pageStart=0,lastUrl="";
var snapshotSent={},screenshotSent={},capturing=false;

// ─── Utilities ───────────────────────────────────────────────────────

function checkDomain(){
    if(!C.domains||!C.domains.length)return true;
    var h=location.hostname;
    for(var i=0;i<C.domains.length;i++){
        if(h===C.domains[i]||h.endsWith("."+C.domains[i]))return true;
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

// ─── Event Queue ─────────────────────────────────────────────────────
// Events are buffered. Flush sends when session is ready.
// If session not ready yet, events accumulate and flush on session confirm.

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
    // If more events accumulated during flush, schedule another
    if(buf.length>0)setTimeout(flush,100);
}

// ─── Session Management ──────────────────────────────────────────────

function createSession(){
    // Speed-browsing detection for previous page
    if(pageStart&&Date.now()-pageStart<2000){
        push({eventType:"pageview",metadata:{friction:"speed-browsing"}});
    }
    // Flush any remaining events from previous session
    if(sid)flush();
    sid=null;
    pageStart=Date.now();
    lastUrl=location.href;

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
        try{
            var r=JSON.parse(xhr.responseText);
            if(r.sessionId){
                sid=r.sessionId;
                // Flush any events that accumulated while waiting for session
                if(buf.length>0)flush();
                captureSnapshot();
            }
        }catch(e){}
    };
    xhr.onerror=function(){
        // Retry once after 2s
        setTimeout(function(){
            var xhr2=new XMLHttpRequest();
            xhr2.open("POST",C.api+"/public/tracking/"+C.rid+"/session",true);
            xhr2.setRequestHeader("Content-Type","application/json");
            xhr2.onload=function(){
                try{
                    var r=JSON.parse(xhr2.responseText);
                    if(r.sessionId){sid=r.sessionId;if(buf.length>0)flush();captureSnapshot();}
                }catch(e2){}
            };
            xhr2.send(body);
        },2000);
    };
    xhr.send(body);

    // Emit initial pageview event (will be flushed when session confirms)
    push({eventType:"pageview",scrollY:0,scrollDepthPct:0});
}

// ─── Capture Listeners ───────────────────────────────────────────────

function startCapture(){
    if(capturing)return;
    capturing=true;

    var clickLog=[];

    // ── CLICKS ──────────────────────────────────────────────────────
    if(C.clicks){
        document.addEventListener("click",function(e){
            var now=Date.now();
            // Raw pixel coordinates — NO client-side normalization
            var px=e.pageX;
            var py=e.pageY;
            var meta={};

            // Rage-click detection (3+ clicks within 1s, 30px radius)
            clickLog.push({x:px,y:py,t:now});
            clickLog=clickLog.filter(function(c){return now-c.t<1000;});
            var nearby=clickLog.filter(function(c){
                return Math.abs(c.x-px)<30&&Math.abs(c.y-py)<30;
            });
            if(nearby.length>=3)meta.friction="rage-click";

            // Dead-click detection
            var tag=(e.target.tagName||"").toLowerCase();
            var isInteractive=tag==="a"||tag==="button"||tag==="input"||
                tag==="select"||tag==="textarea"||
                e.target.closest("a,button,[role=button],[onclick]");
            if(!isInteractive&&!meta.friction)meta.friction="dead-click";

            // Element-relative coordinates (for element-based heatmaps)
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

    // ── VIEWPORT HEARTBEAT (attention tracking) ─────────────────────
    // Every 1s, record what zone of the page is currently visible.
    // This feeds the attention heatmap — measures TIME spent viewing each zone.
    heartbeatTimer=setInterval(function(){
        if(!sid)return;
        push({
            eventType:"scroll",
            scrollY:Math.round(window.scrollY),
            scrollDepthPct:Math.min(
                Math.round((window.scrollY+window.innerHeight)/
                    Math.max(document.body.scrollHeight||1,document.documentElement.scrollHeight||1)*100),
                100
            )
        });
    },1000);

    // ── MOUSEMOVE ───────────────────────────────────────────────────
    if(C.mouse){
        var lastMove=0;
        document.addEventListener("mousemove",function(e){
            var now=Date.now();
            if(now-lastMove<100)return; // Throttle: max 10/s (like Hotjar)
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
        }
    });

    window.addEventListener("beforeunload",function(){
        if(pageStart&&Date.now()-pageStart<2000){
            push({eventType:"pageview",metadata:{friction:"speed-browsing"}});
        }
        flush();
    });

    // ── SPA NAVIGATION ──────────────────────────────────────────────
    var origPush=history.pushState,origReplace=history.replaceState;
    function onNav(){if(location.href!==lastUrl)createSession();}
    history.pushState=function(){origPush.apply(history,arguments);onNav();};
    history.replaceState=function(){origReplace.apply(history,arguments);onNav();};
    window.addEventListener("popstate",onNav);

    // ── PERIODIC FLUSH ──────────────────────────────────────────────
    timer=setInterval(flush,C.flush);
}

// ─── DOM Snapshot ────────────────────────────────────────────────────

function captureSnapshot(){
    var url=location.href;
    if(snapshotSent[url])return;
    snapshotSent[url]=true;
    try{
        var clone=document.documentElement.cloneNode(true);
        var scripts=clone.querySelectorAll("script");
        for(var i=0;i<scripts.length;i++)scripts[i].remove();
        var base=location.origin;
        function absUrl(el,attr){
            var v=el.getAttribute(attr);
            if(v&&v.indexOf("//")< 0&&v.charAt(0)==="/")el.setAttribute(attr,base+v);
            else if(v&&v.indexOf("//")< 0&&v.indexOf("data:")< 0&&v.charAt(0)!=="/"&&v.charAt(0)!=="#")
                el.setAttribute(attr,base+"/"+v);
        }
        var els=clone.querySelectorAll("[src],[href]");
        for(var j=0;j<els.length;j++){
            if(els[j].hasAttribute("src"))absUrl(els[j],"src");
            if(els[j].hasAttribute("href"))absUrl(els[j],"href");
        }
        var styled=clone.querySelectorAll("[style]");
        for(var k=0;k<styled.length;k++){
            var s=styled[k].getAttribute("style");
            if(s&&s.indexOf("url(")>=0){
                styled[k].setAttribute("style",s.replace(/url\\(["']?\\/([^"')]+)["']?\\)/g,"url("+base+"/$1)"));
            }
        }
        var html="<!DOCTYPE html>"+clone.outerHTML;
        if(html.length>5242880)return;
        var xhr2=new XMLHttpRequest();
        xhr2.open("POST",C.api+"/public/tracking/"+C.rid+"/snapshot",true);
        xhr2.setRequestHeader("Content-Type","application/json");
        xhr2.send(JSON.stringify({pageUrl:url,html:html}));
    }catch(e){}
    captureScreenshot(url);
}

// ─── Screenshot (html2canvas) ────────────────────────────────────────

function getDeviceCat(){
    var w=window.innerWidth;
    if(w<768)return"mobile";if(w<=1024)return"tablet";return"desktop";
}

function waitForImages(){
    var imgs=document.querySelectorAll("img");
    var promises=[];
    for(var i=0;i<imgs.length;i++){
        if(!imgs[i].complete){
            promises.push(new Promise(function(resolve){
                var img=imgs[i];
                img.addEventListener("load",resolve);
                img.addEventListener("error",resolve);
                setTimeout(resolve,5000);
            }));
        }
    }
    return Promise.all(promises);
}

function captureScreenshot(url){
    var cat=getDeviceCat();
    var key=url+"__"+cat;
    if(screenshotSent[key])return;
    screenshotSent[key]=true;

    function doCapture(){
        setTimeout(function(){
            waitForImages().then(function(){
                try{
                    var fixedEls=[];
                    var allEls=document.querySelectorAll("*");
                    for(var i=0;i<allEls.length;i++){
                        var cs=getComputedStyle(allEls[i]);
                        if(cs.position==="fixed"||cs.position==="sticky"){
                            fixedEls.push({el:allEls[i],vis:allEls[i].style.visibility});
                            allEls[i].style.visibility="hidden";
                        }
                    }
                    var origScroll=window.scrollY;
                    window.scrollTo(0,0);
                    var vw=window.innerWidth;
                    var fullH=Math.max(
                        document.body.scrollHeight,document.body.offsetHeight,
                        document.documentElement.scrollHeight,document.documentElement.offsetHeight
                    );
                    var captureH=Math.min(fullH,16000);
                    window.html2canvas(document.body,{
                        useCORS:true,allowTaint:false,scale:1,logging:false,
                        width:vw,height:captureH,windowWidth:vw,windowHeight:captureH,
                        x:0,y:0,scrollX:0,scrollY:0,imageTimeout:5000,removeContainer:true
                    }).then(function(canvas){
                        for(var j=0;j<fixedEls.length;j++)fixedEls[j].el.style.visibility=fixedEls[j].vis||"";
                        window.scrollTo(0,origScroll);
                        var data=canvas.toDataURL("image/jpeg",0.85);
                        if(data.length>8388608)return;
                        var xhr3=new XMLHttpRequest();
                        xhr3.open("POST",C.api+"/public/tracking/"+C.rid+"/screenshot",true);
                        xhr3.setRequestHeader("Content-Type","application/json");
                        xhr3.send(JSON.stringify({pageUrl:url,imageData:data,device:cat}));
                    }).catch(function(){
                        for(var j=0;j<fixedEls.length;j++)fixedEls[j].el.style.visibility=fixedEls[j].vis||"";
                        window.scrollTo(0,origScroll);
                        screenshotSent[key]=false;
                    });
                }catch(e){screenshotSent[key]=false;}
            });
        },2000);
    }
    if(window.html2canvas){doCapture();return;}
    var sc=document.createElement("script");
    sc.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    sc.onload=doCapture;
    sc.onerror=function(){screenshotSent[key]=false;};
    document.head.appendChild(sc);
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
