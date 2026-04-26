/**
 * Mock Tracking Server
 * Minimal Express server that:
 * 1. Serves a test HTML page with the tracking script injected
 * 2. Implements tracking API endpoints (session, events, config) in-memory
 * 3. Exposes a /__verify endpoint for Playwright to assert captured data
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';

// ─── In-memory store ─────────────────────────────────────────────────

interface Session {
    id: string;
    visitorId: string;
    pageUrl: string;
    pageTitle?: string;
    viewportWidth: number;
    viewportHeight: number;
    userAgent?: string;
    referrer?: string;
    createdAt: string;
}

interface TrackingEvent {
    sessionId: string;
    eventType: string;
    x?: number;
    y?: number;
    scrollY?: number;
    scrollDepthPct?: number;
    targetSelector?: string;
    targetText?: string;
    timestampMs: number;
}

const store = {
    sessions: [] as Session[],
    events: [] as TrackingEvent[],
    reset() {
        this.sessions = [];
        this.events = [];
    },
};

// ─── Tracking config (mimics backend response) ──────────────────────

const RESEARCH_ID = 'test-research-e2e';

const trackingConfig = {
    captureClicks: true,
    captureScroll: true,
    captureMousemove: false,
    consentRequired: false,
    flushIntervalMs: 500, // Fast flush for tests
    maxEventsPerFlush: 50,
    allowedDomains: [],
};

// ─── Tracking snippet (inline, not fetched) ──────────────────────────

const generateSnippet = (apiBase: string): string => {
    const C = JSON.stringify({
        rid: RESEARCH_ID,
        api: apiBase,
        clicks: trackingConfig.captureClicks,
        scroll: trackingConfig.captureScroll,
        mouse: trackingConfig.captureMousemove,
        consent: trackingConfig.consentRequired,
        flush: trackingConfig.flushIntervalMs,
        max: trackingConfig.maxEventsPerFlush,
    });

    // Same snippet logic as tracking-snippet.ts but inlined
    return `(function(){
"use strict";
var C=${C};
var sid=null,vid=null,buf=[],timer=null,consented=!C.consent;
function getVid(){try{var v=localStorage.getItem("_ecx_vid");if(v)return v;v="v_"+Math.random().toString(36).substr(2,12)+Date.now().toString(36);localStorage.setItem("_ecx_vid",v);return v;}catch(e){return "v_"+Math.random().toString(36).substr(2,12);}}
function getSelector(el){if(!el||!el.tagName)return"";var parts=[];var cur=el;for(var i=0;i<5&&cur&&cur.tagName;i++){var tag=cur.tagName.toLowerCase();if(cur.id){parts.unshift(tag+"#"+cur.id);break;}var cls=cur.className&&typeof cur.className==="string"?"."+cur.className.trim().split(/\\s+/).slice(0,2).join("."):"";parts.unshift(tag+cls);cur=cur.parentElement;}return parts.join(" > ").substr(0,500);}
function getText(el){if(!el)return"";var t=(el.textContent||el.innerText||"").trim();return t.substr(0,255);}
function push(evt){if(!sid||!consented)return;buf.push(evt);if(buf.length>=C.max)flush();}
function flush(){if(!buf.length||!sid)return;var batch=buf.splice(0,C.max);var body=JSON.stringify({sessionId:sid,events:batch});try{var xhr=new XMLHttpRequest();xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/events",true);xhr.setRequestHeader("Content-Type","application/json");xhr.send(body);}catch(e){}}
function startSession(){vid=getVid();var body=JSON.stringify({visitorId:vid,pageUrl:location.href,pageTitle:document.title,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,screenWidth:screen.width,screenHeight:screen.height,userAgent:navigator.userAgent,referrer:document.referrer});var xhr=new XMLHttpRequest();xhr.open("POST",C.api+"/public/tracking/"+C.rid+"/session",true);xhr.setRequestHeader("Content-Type","application/json");xhr.onload=function(){try{var r=JSON.parse(xhr.responseText);sid=r.sessionId;startCapture();}catch(e){}};xhr.send(body);}
function startCapture(){if(C.clicks){document.addEventListener("click",function(e){push({eventType:"click",x:e.pageX,y:e.pageY,targetSelector:getSelector(e.target),targetText:getText(e.target),timestampMs:Date.now()});},true);}if(C.scroll){var scrollTimer=null;window.addEventListener("scroll",function(){clearTimeout(scrollTimer);scrollTimer=setTimeout(function(){var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);var pct=h>0?Math.round((window.scrollY+window.innerHeight)/h*10000)/100:0;push({eventType:"scroll",scrollY:Math.round(window.scrollY),scrollDepthPct:Math.min(pct,100),timestampMs:Date.now()});},100);},true);}push({eventType:"pageview",timestampMs:Date.now()});timer=setInterval(flush,C.flush);window.addEventListener("beforeunload",flush);document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")flush();});}
consented=true;if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",startSession);}else{startSession();}
})();`;
};

// ─── Test HTML page ──────────────────────────────────────────────────

const generateTestPage = (apiBase: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tracking E2E Test Page</title>
    <style>
        body { font-family: sans-serif; margin: 0; padding: 40px; min-height: 200vh; background: #f8f9fa; }
        .hero { padding: 60px 40px; background: #fff; border-radius: 12px; margin-bottom: 24px; text-align: center; }
        .hero h1 { font-size: 2rem; color: #1a1a2e; }
        .cta { display: inline-block; padding: 12px 32px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
        .cta:hover { background: #1d4ed8; }
        nav { display: flex; gap: 24px; padding: 16px 40px; background: #fff; border-radius: 12px; margin-bottom: 24px; }
        nav a { text-decoration: none; color: #374151; font-weight: 500; cursor: pointer; }
        .content { padding: 40px; background: #fff; border-radius: 12px; min-height: 600px; }
        .content p { line-height: 1.8; color: #4b5563; margin-bottom: 16px; }
        .footer { padding: 24px 40px; text-align: center; color: #9ca3af; margin-top: 24px; }
    </style>
</head>
<body>
    <nav>
        <a href="#" id="nav-home">Home</a>
        <a href="#" id="nav-about">About</a>
        <a href="#" id="nav-pricing">Pricing</a>
        <a href="#" id="nav-contact">Contact</a>
    </nav>

    <div class="hero">
        <h1>Welcome to Our Product</h1>
        <p>The best solution for your business needs.</p>
        <button class="cta" id="cta-button">Get Started</button>
    </div>

    <div class="content" id="main-content">
        <h2>Features</h2>
        <p id="feature-1">Feature one: Advanced analytics and real-time monitoring.</p>
        <p id="feature-2">Feature two: Easy integration with your existing tools.</p>
        <p id="feature-3">Feature three: Enterprise-grade security and compliance.</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
    </div>

    <div class="footer">
        <p>&copy; 2026 Test Company</p>
    </div>

    <script>${generateSnippet(apiBase)}</script>
</body>
</html>`;

// ─── HTTP Server ─────────────────────────────────────────────────────

const readBody = (req: http.IncomingMessage): Promise<string> =>
    new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        req.on('end', () => resolve(data));
    });

const json = (res: http.ServerResponse, data: unknown, status = 200) => {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
};

export const createMockServer = (port = 4567) => {
    const apiBase = `http://localhost:${port}`;

    const server = http.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';

        // CORS preflight
        if (method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            });
            return res.end();
        }

        // Serve test page
        if (url === '/' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(generateTestPage(apiBase));
        }

        // POST /public/tracking/:id/session
        if (url.includes('/session') && method === 'POST') {
            const body = JSON.parse(await readBody(req));
            const session: Session = {
                id: randomUUID(),
                visitorId: body.visitorId,
                pageUrl: body.pageUrl,
                pageTitle: body.pageTitle,
                viewportWidth: body.viewportWidth,
                viewportHeight: body.viewportHeight,
                userAgent: body.userAgent,
                referrer: body.referrer,
                createdAt: new Date().toISOString(),
            };
            store.sessions.push(session);
            return json(res, { sessionId: session.id }, 201);
        }

        // POST /public/tracking/:id/events
        if (url.includes('/events') && method === 'POST') {
            const body = JSON.parse(await readBody(req));
            const events = (body.events || []).map((e: TrackingEvent) => ({
                ...e,
                sessionId: body.sessionId,
            }));
            store.events.push(...events);
            return json(res, { saved: events.length }, 201);
        }

        // GET /public/tracking/:id/config
        if (url.includes('/config') && method === 'GET') {
            return json(res, trackingConfig);
        }

        // GET /__verify — Playwright reads this to assert
        if (url === '/__verify' && method === 'GET') {
            return json(res, {
                sessions: store.sessions,
                events: store.events,
                summary: {
                    sessionCount: store.sessions.length,
                    eventCount: store.events.length,
                    clickCount: store.events.filter(e => e.eventType === 'click').length,
                    scrollCount: store.events.filter(e => e.eventType === 'scroll').length,
                    pageviewCount: store.events.filter(e => e.eventType === 'pageview').length,
                },
            });
        }

        // POST /__reset — clear store between tests
        if (url === '/__reset' && method === 'POST') {
            store.reset();
            return json(res, { reset: true });
        }

        json(res, { error: 'Not found' }, 404);
    });

    return {
        start: () => new Promise<void>((resolve) => {
            server.listen(port, () => resolve());
        }),
        stop: () => new Promise<void>((resolve) => {
            server.close(() => resolve());
        }),
        url: apiBase,
    };
};
