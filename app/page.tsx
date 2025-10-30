"use client";
import React, { useRef, useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import imagesMeta from "../data/imagesMeta.json";
import Link from "next/link";

export default function Home() {
  // use metadata list; each item includes src and empty metadata fields
  const images = imagesMeta as Array<{
    src: string;
    title: string;
    description: string;
    date: string;
    latitude: number | null;
    longitude: number | null;
  }>;

  // Helper to format ISO-like date strings into a human readable form
  const formatDate = (iso?: string | null, withTime = false) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const dateOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
      if (withTime) {
        const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
        return `${d.toLocaleDateString(undefined, dateOpts)} · ${d.toLocaleTimeString(undefined, timeOpts)}`;
      }
      return d.toLocaleDateString(undefined, dateOpts);
    } catch (e) {
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

  function CRTPlane({ intensity = 1.0 }: { intensity?: number }) {
    const matRef = useRef<THREE.ShaderMaterial | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const { size } = useThree();

    // load a small noise texture from public/noise.png or generate simple data
    const noiseTex = useMemo(() => {
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

    useFrame((state, delta) => {
      if (matRef.current) {
        matRef.current.uniforms.uTime.value += delta;
        matRef.current.uniforms.uResolution.value.set(size.width, size.height);
      }
      // ensure mesh isn't culled (full-screen quads can sometimes be culled)
      if (meshRef.current) {
        meshRef.current.frustumCulled = false;
      }
    });

    const uniforms = useMemo(
      () => ({
        uTime: { value: 0 },
        uNoise: { value: noiseTex },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
        uIntensity: { value: intensity },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [noiseTex]
    );

    return (
      <mesh ref={meshRef} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        {/* Use ShaderMaterial via args */}
        <shaderMaterial
          ref={matRef}
          args={[
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
          ]}
        />
      </mesh>
    );
  }

  function CRTCanvas({ intensity = 1.0 }: { intensity?: number }) {
    return (
      <Canvas
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        gl={{ antialias: true, alpha: true }}
        orthographic={true}
        camera={{ position: [0, 0, 1], zoom: 1 }}
      >
        {/* use an orthographic camera so the 2x2 planeGeometry covers the full screen */}
        <ambientLight intensity={0.5} />
        <CRTPlane intensity={intensity} />
      </Canvas>
    );
  }


  const [hovered, setHovered] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [heroMinimized, setHeroMinimized] = useState(false);
  const [mapMode, setMapMode] = useState(false);
  // refs to each tile so we can compute popup position (avoid clipping)
  const tileRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [popup, setPopup] = useState<null | { index: number; left: number; top: number; width: number }>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollBySection = (dir: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const delta = window.innerHeight * dir;
    el.scrollBy({ top: delta, left: 0, behavior: 'smooth' });
  };
  // timeout ref to avoid immediate hide when moving between tile and popup
  const hideTimeout = useRef<number | null>(null);

  // Hover only controls the visual pop (scale). Popup is shown on click.
  const handleHoverStart = (i: number) => {
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
    }, delay) as unknown as number;
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
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (i: number) => {
    // clicking should show centered panel and cancel any pending hide
    cancelHide();
    setPopup(null);
    // if the hero is minimized, expand it so details are visible
    setHeroMinimized(false);
    setSelected(i);
  };

  // derive a sorted copy of images based on date
  const sortedImages = useMemo(() => {
    const copy = [...images];
    copy.sort((a, b) => {
      const da = a.date ? Date.parse(a.date) : 0;
      const db = b.date ? Date.parse(b.date) : 0;
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return copy;
  }, [images, sortOrder]);

  // small utility to escape HTML for popup content (used by map popups)
  const escapeHtml = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // load Leaflet (via CDN) on demand and initialize interactive map when mapMode is enabled
  useEffect(() => {
    if (!mapMode) {
      // destroy map if exists
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      return;
    }

    // helper to inject stylesheet/script
    const ensureLeaflet = () => {
      return new Promise<void>((resolve) => {
        // CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        // JS
        if ((window as any).L) {
          resolve();
          return;
        }
        if (!document.getElementById('leaflet-js')) {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.body.appendChild(script);
        } else {
          // already loading; poll for L
          const t = setInterval(() => {
            if ((window as any).L) {
              clearInterval(t);
              resolve();
            }
          }, 100);
        }
      });
    };

    let mounted = true;
    ensureLeaflet().then(() => {
      if (!mounted) return;
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;
      // choose initial center: first image with coords or 0,0
      const first = sortedImages.find((it) => it.latitude != null && it.longitude != null);
      const center: [number, number] = first ? [first.latitude as number, first.longitude as number] : [0, 0];
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
        } catch (e) {}
      }, 120);

      // add markers for each image that has coords
      sortedImages.forEach((it, idx) => {
        if (it.latitude != null && it.longitude != null) {
          const marker = L.marker([it.latitude as number, it.longitude as number]).addTo(map);
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
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, [mapMode, sortedImages]);

  

  // clear any pending timeouts when unmounting
  useEffect(() => {
    return () => {
      if (hideTimeout.current) {
        window.clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
    };
  }, []);

  return (

    <div className="absolute inset-0 min-h-screen bg-black w-full">
      <motion.div
        className="relative grid w-full mx-auto"
        style={{ zIndex: 0, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: '0.5rem' }}
      >
        {sortedImages.map((item, i) => (
          <motion.div
            key={i}
            ref={(el) => { tileRefs.current[i] = el; }}
            className="relative aspect-square overflow-hidden"
            style={{ overscrollBehavior: "contain", touchAction: "manipulation" }}
            whileHover={{ scale: 1.05, zIndex: 10, filter: "brightness(1.08)", boxShadow: "0 20px 30px rgba(0,0,0,0.35)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onHoverStart={() => handleHoverStart(i)}
            onHoverEnd={handleHoverEnd}
            onClick={() => handleClick(i)}
          >
            {/* use next/image or <img> */}
            <Image
              src={item.src}
              alt={`img-${i}`}
              fill
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              sizes="(min-width:1280px) 15vw, (min-width:768px) 20vw, 35vw"
              className="object-cover"
            />
            {/* optional highlight glow */}
            <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-0 hover:opacity-40 transition-opacity" />
            {/* popup is rendered in the fixed overlay to avoid clipping */}
          </motion.div>
        ))}
      </motion.div>

      {/* Small control cluster: sort, toggle map mode, minimize hero */}
      <div className="fixed top-4 right-4 z-60 pointer-events-auto flex gap-2">
        <button
          className="bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-sm hover:bg-white/10"
          onClick={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
          title="Sort by date"
        >
          {sortOrder === 'desc' ? 'Latest' : 'Oldest'}
        </button>
        <button
          className="bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-sm hover:bg-white/10"
          onClick={() => setMapMode((m) => !m)}
          title="Toggle Map Mode"
        >
          Map
        </button>
        <button
          className="bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-sm hover:bg-white/10"
          onClick={() => setHeroMinimized((v) => !v)}
          title="Minimize hero"
        >
          {heroMinimized ? 'Expand' : 'Minimize'}
        </button>
      </div>

      {/* Fixed overlay for the hover popup (so it's not clipped by tile overflow) */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {popup && images[popup.index] && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="pointer-events-none absolute w-72 bg-black/80 text-white p-3 rounded-lg"
            style={{ left: popup.left, top: popup.top, transform: "translate(-50%, -100%)" }}
            onPointerEnter={() => {
              // keep popup open while pointer is over it
              cancelHide();
            }}
            onPointerLeave={() => {
              // schedule hide when leaving popup
              scheduleHide();
            }}
          >
            <h3 className="font-bold text-sm truncate">{sortedImages[popup.index].title || "Title"}</h3>
            { sortedImages[popup.index].description != "" ? <p className="text-xs mt-1 line-clamp-3">{sortedImages[popup.index].description}</p> : null }
            <div className="text-xs mt-2 opacity-80">{formatDate(sortedImages[popup.index].date) || "Date"}</div>

            <div className="mt-2 h-16 bg-white/5 rounded-md overflow-hidden flex items-center justify-center mx-auto w-full">
              {sortedImages[popup.index].latitude != null && sortedImages[popup.index].longitude != null ? (
                (() => {
                  const lat = sortedImages[popup.index].latitude;
                  const lon = sortedImages[popup.index].longitude;
                  const zoom = 13;
                  // size: width x height (pixels) - match approx w-72 (288px) x 64px
                  const width = 280;
                  const height = 96;
                  // Use our server-side proxy route which keeps the Mapbox token secret
                  const src = `/api/static-map?lat=${encodeURIComponent(lat as any)}&lon=${encodeURIComponent(
                    lon as any
                  )}&z=${zoom}&w=${width}&h=${height}`;
                  return (
                    <img
                      src={src}
                      alt={`map-${popup.index}`}
                      className="w-full h-full object-cover rounded-md"
                      draggable={false}
                    />
                  );
                })()
              ) : (
                <div className="text-xs text-white/60">No coords</div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Centered translucent box that acts as the hero when nothing is selected
          and as the details modal when an image is selected. */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 60 }}>
        {/* Backdrop: only dismiss when an image is selected. When no selection (hero) clicking backdrop does nothing. */}
        <div
          className="absolute inset-0"
          onPointerDown={() => {
            if (selected !== null) setSelected(null);
          }}
        />

  <div className={`relative pointer-events-auto bg-gray-800/70 text-white p-4 rounded backdrop-blur-sm ${heroMinimized ? 'w-20 sm:w-28 md:w-32' : 'w-11/12 sm:w-72 md:w-80'} ${heroMinimized ? 'invisible' : ''}`}>
          {selected !== null ? (
            sortedImages[selected] && (
              <div>
                <button
                  className="absolute top-2 right-2 text-white/80 hover:text-white"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  ×
                </button>
                <h3 className="font-bold text-sm truncate">{sortedImages[selected].title || "Title"}</h3>
                { sortedImages[selected].description != "" ? <p className="text-xs mt-1 line-clamp-3">{sortedImages[selected].description}</p> : null }
                <div className="text-xs mt-2 opacity-80">{formatDate(sortedImages[selected].date, true) || "Date"}</div>

                <div className="mt-3 h-50 bg-white/5 rounded-md overflow-hidden flex items-center justify-center">
                  {sortedImages[selected].latitude != null && sortedImages[selected].longitude != null ? (
                    (() => {
                      const lat = sortedImages[selected].latitude;
                      const lon = sortedImages[selected].longitude;
                      const zoom = 13;
                      const width = 320;
                      const height = 320;
                      const src = `/api/static-map?lat=${encodeURIComponent(lat as any)}&lon=${encodeURIComponent(
                        lon as any
                      )}&z=${zoom}&w=${width}&h=${height}`;
                      return (
                        <img
                          src={src}
                          alt={`map-${selected}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      );
                    })()
                  ) : (
                    <div className="text-xs text-white/60">No coords</div>
                  )}
                </div>
              </div>
            )
          ) : heroMinimized ? (
            <div className="flex items-center justify-center width">
              <button className="px-3 py-1 text-sm rounded bg-white/6 hover:bg-white/10" onClick={() => setHeroMinimized(false)}>+</button>
            </div>
          ) : (
            // Hero content when nothing is selected
            <div className="text-center">
              <div className="flex justify-end">
                <button className="text-xs text-white/70 hover:text-white" onClick={() => setHeroMinimized(true)} aria-label="Minimize hero">—</button>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight">atlas of my skies</h1>
              <p className="mt-2 opacity-80">the heavens tell a profound story each time. it carries the weight of the world. it serves as a ever-present reminder that the world is still turning. it is the canvas of our dreams :)</p>
              <p className="mt-2 opacity-40">(click a sky to see its story)</p>
              <p className="mt-2">- stim <Link href="https://instagram.com/friedicecrm">(ig)</Link> <Link href="https://linkedin.com/in/stimmie">(in)</Link> <Link href="https://stimmie.dev">(web)</Link></p>
            </div>
          )}
        </div>
      </div>

      {mapMode && (
        <div className="fixed inset-0 z-70 pointer-events-auto flex items-center justify-center">
          {/* backdrop - clicking it closes the map */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMapMode(false)} />
          <div className="relative bg-gray-900 rounded-lg overflow-hidden w-11/12 md:w-3/4 lg:w-2/3 h-[70vh] shadow-xl">
            <div className="flex justify-end p-2">
              <button className="bg-white/6 text-white px-3 py-1 rounded" onClick={() => setMapMode(false)}>Close</button>
            </div>
            <div ref={mapContainerRef} style={{ height: 'calc(100% - 40px)', minHeight: 0 }} id="map" />
          </div>
        </div>
      )}

      {/* CRT overlay: placed between the image grid and the UI overlay so it affects the images underneath
          Increase z-index so it's visible again (keeps popups at z-50 above it). */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 51 }}>
        <CRTCanvas intensity={1.0} />
      </div>
    </div>
  );
}
