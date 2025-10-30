"use client";
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const image_1 = __importDefault(require("next/image"));
const framer_motion_1 = require("framer-motion");
const fiber_1 = require("@react-three/fiber");
const THREE = __importStar(require("three"));
const imagesMeta_json_1 = __importDefault(require("../data/imagesMeta.json"));
const link_1 = __importDefault(require("next/link"));
function Home() {
    // use metadata list; each item includes src and empty metadata fields
    const images = imagesMeta_json_1.default;
    // Helper to format ISO-like date strings into a human readable form
    const formatDate = (iso, withTime = false) => {
        if (!iso)
            return "";
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime()))
                return iso;
            const dateOpts = { year: "numeric", month: "long", day: "numeric" };
            if (withTime) {
                const timeOpts = { hour: "numeric", minute: "2-digit" };
                return `${d.toLocaleDateString(undefined, dateOpts)} · ${d.toLocaleTimeString(undefined, timeOpts)}`;
            }
            return d.toLocaleDateString(undefined, dateOpts);
        }
        catch (e) {
            return iso;
        }
    };
    const vertexShader = `varying vec2 vUv;
  void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
    const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform sampler2D uNoise;
  uniform vec2 uResolution;
  uniform float uIntensity;
  varying vec2 vUv;

  // simple random / noise helper
  float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
  // map pixel coordinates to 0..1 UV so we reliably cover the whole screen
  vec2 uv = gl_FragCoord.xy / uResolution.xy;

  // scanlines
  float scanlineStrength = 0.12 * uIntensity;
  float scan = sin((uv.y * uResolution.y / 2.0) + uTime * 10.0) * scanlineStrength;

  // noise texture (use screen-space coordinates)
  vec2 noiseUV = uv + vec2(uTime * 0.05, uTime * 0.02);
  // scale noise sampling so it repeats nicely across aspect ratios
  noiseUV *= vec2(uResolution.x / 800.0, uResolution.y / 800.0);
  float n = texture2D(uNoise, noiseUV).r * 0.25 * uIntensity;

    // chromatic aberration: sample offsets for r/g/b channels
    float ca = 0.012 * uIntensity;
    vec2 offsetR = vec2(ca, 0.0);
    vec2 offsetB = vec2(-ca, 0.0);

    // build tinted overlay (we don't have a background texture to sample,
    // so we simulate chroma by colored fringes in the noise/scanlines)
    float r = texture2D(uNoise, noiseUV + offsetR).r;
    float g = texture2D(uNoise, noiseUV).r;
    float b = texture2D(uNoise, noiseUV + offsetB).r;

    // combine
    vec3 noiseColor = vec3(r, g, b);
    vec3 scanColor = vec3(0.9, 0.95, 1.0) * (0.05 * uIntensity);

    // subtle vignetting
    float dist = distance(uv, vec2(0.5));
    float vignette = smoothstep(0.8, 0.45, dist);

    // final overlay color (mostly subtle)
    vec3 color = mix(noiseColor * 0.12, scanColor, 0.5) * (1.0 - vignette);
    float alpha = clamp((n + abs(scan) * 0.6 + 0.02) , 0.0, 0.7);

    // final output: keep it subtle so underlying images show
    gl_FragColor = vec4(color, alpha);
  }
`;
    function CRTPlane({ intensity = 1.0 }) {
        const matRef = (0, react_1.useRef)(null);
        const meshRef = (0, react_1.useRef)(null);
        const { size } = (0, fiber_1.useThree)();
        // load a small noise texture from public/noise.png or generate simple data
        const noiseTex = (0, react_1.useMemo)(() => {
            // try to load a noise image at /noise.png (place one in public/)
            const loader = new THREE.TextureLoader();
            const tex = loader.load("/noise.png", () => {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(4, 4);
            });
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 4);
            return tex;
        }, []);
        (0, fiber_1.useFrame)((state, delta) => {
            if (matRef.current) {
                matRef.current.uniforms.uTime.value += delta;
                matRef.current.uniforms.uResolution.value.set(size.width, size.height);
            }
            // ensure mesh isn't culled (full-screen quads can sometimes be culled)
            if (meshRef.current) {
                meshRef.current.frustumCulled = false;
            }
        });
        const uniforms = (0, react_1.useMemo)(() => ({
            uTime: { value: 0 },
            uNoise: { value: noiseTex },
            uResolution: { value: new THREE.Vector2(size.width, size.height) },
            uIntensity: { value: intensity },
        }), 
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [noiseTex]);
        return ((0, jsx_runtime_1.jsxs)("mesh", { ref: meshRef, frustumCulled: false, children: [(0, jsx_runtime_1.jsx)("planeGeometry", { args: [2, 2] }), (0, jsx_runtime_1.jsx)("shaderMaterial", { ref: matRef, args: [
                        {
                            uniforms,
                            vertexShader,
                            fragmentShader,
                            transparent: true,
                            depthWrite: false,
                            depthTest: false,
                            side: THREE.DoubleSide,
                            blending: THREE.NormalBlending,
                        },
                    ] })] }));
    }
    function CRTCanvas({ intensity = 1.0 }) {
        return ((0, jsx_runtime_1.jsxs)(fiber_1.Canvas, { style: { position: "absolute", inset: 0, pointerEvents: "none" }, gl: { antialias: true, alpha: true }, orthographic: true, camera: { position: [0, 0, 1], zoom: 1 }, children: [(0, jsx_runtime_1.jsx)("ambientLight", { intensity: 0.5 }), (0, jsx_runtime_1.jsx)(CRTPlane, { intensity: intensity })] }));
    }
    const [hovered, setHovered] = (0, react_1.useState)(null);
    const [sortOrder, setSortOrder] = (0, react_1.useState)('desc');
    const [heroMinimized, setHeroMinimized] = (0, react_1.useState)(false);
    const [mapMode, setMapMode] = (0, react_1.useState)(false);
    // refs to each tile so we can compute popup position (avoid clipping)
    const tileRefs = (0, react_1.useRef)({});
    const [popup, setPopup] = (0, react_1.useState)(null);
    const scrollContainerRef = (0, react_1.useRef)(null);
    const mapInstanceRef = (0, react_1.useRef)(null);
    const mapContainerRef = (0, react_1.useRef)(null);
    const scrollBySection = (dir) => {
        const el = scrollContainerRef.current;
        if (!el)
            return;
        const delta = window.innerHeight * dir;
        el.scrollBy({ top: delta, left: 0, behavior: 'smooth' });
    };
    // timeout ref to avoid immediate hide when moving between tile and popup
    const hideTimeout = (0, react_1.useRef)(null);
    // Hover only controls the visual pop (scale). Popup is shown on click.
    const handleHoverStart = (i) => {
        setHovered(i);
    };
    const scheduleHide = (delay = 180) => {
        if (hideTimeout.current) {
            window.clearTimeout(hideTimeout.current);
        }
        hideTimeout.current = window.setTimeout(() => {
            setPopup(null);
            setHovered(null);
            hideTimeout.current = null;
        }, delay);
    };
    const cancelHide = () => {
        if (hideTimeout.current) {
            window.clearTimeout(hideTimeout.current);
            hideTimeout.current = null;
        }
    };
    const handleHoverEnd = () => {
        // schedule hide so user can move cursor into the popup without it closing instantly
        scheduleHide();
    };
    // clicking selects an image to show in the centered panel
    const [selected, setSelected] = (0, react_1.useState)(null);
    const handleClick = (i) => {
        // clicking should show centered panel and cancel any pending hide
        cancelHide();
        setPopup(null);
        // if the hero is minimized, expand it so details are visible
        setHeroMinimized(false);
        setSelected(i);
    };
    // derive a sorted copy of images based on date
    const sortedImages = (0, react_1.useMemo)(() => {
        const copy = [...images];
        copy.sort((a, b) => {
            const da = a.date ? Date.parse(a.date) : 0;
            const db = b.date ? Date.parse(b.date) : 0;
            return sortOrder === 'desc' ? db - da : da - db;
        });
        return copy;
    }, [images, sortOrder]);
    // small utility to escape HTML for popup content (used by map popups)
    const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    // load Leaflet (via CDN) on demand and initialize interactive map when mapMode is enabled
    (0, react_1.useEffect)(() => {
        if (!mapMode) {
            // destroy map if exists
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                }
                catch (e) {
                    // ignore
                }
                mapInstanceRef.current = null;
            }
            return;
        }
        // helper to inject stylesheet/script
        const ensureLeaflet = () => {
            return new Promise((resolve) => {
                // CSS
                if (!document.getElementById('leaflet-css')) {
                    const link = document.createElement('link');
                    link.id = 'leaflet-css';
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                }
                // JS
                if (window.L) {
                    resolve();
                    return;
                }
                if (!document.getElementById('leaflet-js')) {
                    const script = document.createElement('script');
                    script.id = 'leaflet-js';
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.onload = () => resolve();
                    document.body.appendChild(script);
                }
                else {
                    // already loading; poll for L
                    const t = setInterval(() => {
                        if (window.L) {
                            clearInterval(t);
                            resolve();
                        }
                    }, 100);
                }
            });
        };
        let mounted = true;
        ensureLeaflet().then(() => {
            if (!mounted)
                return;
            const L = window.L;
            if (!L || !mapContainerRef.current)
                return;
            // choose initial center: first image with coords or 0,0
            const first = sortedImages.find((it) => it.latitude != null && it.longitude != null);
            const center = first ? [first.latitude, first.longitude] : [0, 0];
            const map = L.map(mapContainerRef.current).setView(center, first ? 8 : 2);
            mapInstanceRef.current = map;
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(map);
            // When the map is placed in a constrained panel it may need an explicit invalidateSize
            // so Leaflet can lay out tiles correctly.
            setTimeout(() => {
                try {
                    map.invalidateSize();
                }
                catch (e) { }
            }, 120);
            // add markers for each image that has coords
            sortedImages.forEach((it, idx) => {
                if (it.latitude != null && it.longitude != null) {
                    const marker = L.marker([it.latitude, it.longitude]).addTo(map);
                    const thumb = it.src || '';
                    const title = it.title || '';
                    const dateStr = formatDate(it.date, true) || '';
                    const popupHtml = ` <div style="min-width:160px"><strong>${escapeHtml(title)}</strong><div style="font-size:12px;color:#666">${escapeHtml(dateStr)}</div><div style="margin-top:6px"><img src='${thumb}' style='width:100%;height:auto;object-fit:cover' /></div></div>`;
                    marker.bindPopup(popupHtml);
                    marker.on('click', () => {
                        // open selected detail for this image index (sortedImages index)
                        setSelected(idx);
                    });
                }
            });
        });
        return () => {
            mounted = false;
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                }
                catch (e) { }
                mapInstanceRef.current = null;
            }
        };
    }, [mapMode, sortedImages]);
    // clear any pending timeouts when unmounting
    (0, react_1.useEffect)(() => {
        return () => {
            if (hideTimeout.current) {
                window.clearTimeout(hideTimeout.current);
                hideTimeout.current = null;
            }
        };
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "absolute inset-0 min-h-screen bg-black w-full", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "relative grid w-full mx-auto", style: { zIndex: 0, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: '0.5rem' }, children: sortedImages.map((item, i) => ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { ref: (el) => { tileRefs.current[i] = el; }, className: "relative aspect-square overflow-hidden", style: { overscrollBehavior: "contain", touchAction: "manipulation" }, whileHover: { scale: 1.05, zIndex: 10, filter: "brightness(1.08)", boxShadow: "0 20px 30px rgba(0,0,0,0.35)" }, transition: { type: "spring", stiffness: 300, damping: 20 }, onHoverStart: () => handleHoverStart(i), onHoverEnd: handleHoverEnd, onClick: () => handleClick(i), children: [(0, jsx_runtime_1.jsx)(image_1.default, { src: item.src, alt: `img-${i}`, fill: true, draggable: false, onDragStart: (e) => e.preventDefault(), sizes: "(min-width:1280px) 15vw, (min-width:768px) 20vw, 35vw", className: "object-cover" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 pointer-events-none mix-blend-screen opacity-0 hover:opacity-40 transition-opacity" })] }, i))) }), (0, jsx_runtime_1.jsxs)("div", { className: "fixed top-4 right-4 z-60 pointer-events-auto flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { className: "bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-sm hover:bg-white/10", onClick: () => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc')), title: "Sort by date", children: sortOrder === 'desc' ? 'Latest' : 'Oldest' }), (0, jsx_runtime_1.jsx)("button", { className: "bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-sm hover:bg-white/10", onClick: () => setMapMode((m) => !m), title: "Toggle Map Mode", children: "Map" }), (0, jsx_runtime_1.jsx)("button", { className: "bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-sm hover:bg-white/10", onClick: () => setHeroMinimized((v) => !v), title: "Minimize hero", children: heroMinimized ? 'Expand' : 'Minimize' })] }), (0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 pointer-events-none z-50", children: popup && images[popup.index] && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: 6, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6, scale: 0.98 }, transition: { type: "spring", stiffness: 350, damping: 28 }, className: "pointer-events-none absolute w-72 bg-black/80 text-white p-3 rounded-lg", style: { left: popup.left, top: popup.top, transform: "translate(-50%, -100%)" }, onPointerEnter: () => {
                        // keep popup open while pointer is over it
                        cancelHide();
                    }, onPointerLeave: () => {
                        // schedule hide when leaving popup
                        scheduleHide();
                    }, children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-sm truncate", children: sortedImages[popup.index].title || "Title" }), sortedImages[popup.index].description != "" ? (0, jsx_runtime_1.jsx)("p", { className: "text-xs mt-1 line-clamp-3", children: sortedImages[popup.index].description }) : null, (0, jsx_runtime_1.jsx)("div", { className: "text-xs mt-2 opacity-80", children: formatDate(sortedImages[popup.index].date) || "Date" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 h-16 bg-white/5 rounded-md overflow-hidden flex items-center justify-center mx-auto w-full", children: sortedImages[popup.index].latitude != null && sortedImages[popup.index].longitude != null ? ((() => {
                                const lat = sortedImages[popup.index].latitude;
                                const lon = sortedImages[popup.index].longitude;
                                const zoom = 13;
                                // size: width x height (pixels) - match approx w-72 (288px) x 64px
                                const width = 280;
                                const height = 96;
                                // Use our server-side proxy route which keeps the Mapbox token secret
                                const src = `/api/static-map?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&z=${zoom}&w=${width}&h=${height}`;
                                return ((0, jsx_runtime_1.jsx)("img", { src: src, alt: `map-${popup.index}`, className: "w-full h-full object-cover rounded-md", draggable: false }));
                            })()) : ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-white/60", children: "No coords" })) })] })) }), (0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 flex items-center justify-center pointer-events-none", style: { zIndex: 60 }, children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0", onPointerDown: () => {
                            if (selected !== null)
                                setSelected(null);
                        } }), (0, jsx_runtime_1.jsx)("div", { className: `relative pointer-events-auto bg-gray-800/70 text-white p-4 rounded backdrop-blur-sm ${heroMinimized ? 'w-20 sm:w-28 md:w-32' : 'w-11/12 sm:w-72 md:w-80'}`, children: selected !== null ? (sortedImages[selected] && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("button", { className: "absolute top-2 right-2 text-white/80 hover:text-white", onClick: () => setSelected(null), "aria-label": "Close", children: "\u00D7" }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-sm truncate", children: sortedImages[selected].title || "Title" }), sortedImages[selected].description != "" ? (0, jsx_runtime_1.jsx)("p", { className: "text-xs mt-1 line-clamp-3", children: sortedImages[selected].description }) : null, (0, jsx_runtime_1.jsx)("div", { className: "text-xs mt-2 opacity-80", children: formatDate(sortedImages[selected].date, true) || "Date" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 h-50 bg-white/5 rounded-md overflow-hidden flex items-center justify-center", children: sortedImages[selected].latitude != null && sortedImages[selected].longitude != null ? ((() => {
                                        const lat = sortedImages[selected].latitude;
                                        const lon = sortedImages[selected].longitude;
                                        const zoom = 13;
                                        const width = 320;
                                        const height = 320;
                                        const src = `/api/static-map?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&z=${zoom}&w=${width}&h=${height}`;
                                        return ((0, jsx_runtime_1.jsx)("img", { src: src, alt: `map-${selected}`, className: "w-full h-full object-cover", draggable: false }));
                                    })()) : ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-white/60", children: "No coords" })) })] }))) : heroMinimized ? ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center width", children: (0, jsx_runtime_1.jsx)("button", { className: "px-3 py-1 text-sm rounded bg-white/6 hover:bg-white/10", onClick: () => setHeroMinimized(false), children: "+" }) })) : (
                        // Hero content when nothing is selected
                        (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-end", children: (0, jsx_runtime_1.jsx)("button", { className: "text-xs text-white/70 hover:text-white", onClick: () => setHeroMinimized(true), "aria-label": "Minimize hero", children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("h1", { className: "text-4xl font-extrabold tracking-tight", children: "atlas of my skies" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 opacity-80", children: "the heavens tell a profound story each time. it carries the weight of the world. it serves as a ever-present reminder that the world is still turning. it is the canvas of our dreams :)" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 opacity-40", children: "(click a sky to see its story)" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-2", children: ["- stim ", (0, jsx_runtime_1.jsx)(link_1.default, { href: "https://instagram.com/friedicecrm", children: "(ig)" }), " ", (0, jsx_runtime_1.jsx)(link_1.default, { href: "https://linkedin.com/in/stimmie", children: "in" }), " ", (0, jsx_runtime_1.jsx)(link_1.default, { href: "https://stimmie.dev", children: "web" })] })] })) })] }), mapMode && ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-70 pointer-events-auto flex items-center justify-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-black/60", onClick: () => setMapMode(false) }), (0, jsx_runtime_1.jsxs)("div", { className: "relative bg-gray-900 rounded-lg overflow-hidden w-11/12 md:w-3/4 lg:w-2/3 h-[70vh] shadow-xl", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-end p-2", children: (0, jsx_runtime_1.jsx)("button", { className: "bg-white/6 text-white px-3 py-1 rounded", onClick: () => setMapMode(false), children: "Close" }) }), (0, jsx_runtime_1.jsx)("div", { ref: mapContainerRef, style: { height: 'calc(100% - 40px)', minHeight: 0 }, id: "map" })] })] })), (0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 pointer-events-none", style: { zIndex: 51 }, children: (0, jsx_runtime_1.jsx)(CRTCanvas, { intensity: 1.0 }) })] }));
}
//# sourceMappingURL=page.js.map