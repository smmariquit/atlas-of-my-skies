"use client";
import React, { useRef, useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import imagesMeta from "../data/imagesMeta.json";

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
  // refs to each tile so we can compute popup position (avoid clipping)
  const tileRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [popup, setPopup] = useState<null | { index: number; left: number; top: number; width: number }>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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
    setSelected(i);
  };

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
        {images.map((item, i) => (
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
            <h3 className="font-bold text-sm truncate">{images[popup.index].title || "Title"}</h3>
            { images[popup.index].description != "" ? <p className="text-xs mt-1 line-clamp-3">{images[popup.index].description}</p> : null }
            <div className="text-xs mt-2 opacity-80">{formatDate(images[popup.index].date) || "Date"}</div>

            <div className="mt-2 h-16 bg-white/5 rounded-md overflow-hidden flex items-center justify-center mx-auto w-full">
              {images[popup.index].latitude != null && images[popup.index].longitude != null ? (
                (() => {
                  const lat = images[popup.index].latitude;
                  const lon = images[popup.index].longitude;
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

  <div className="relative pointer-events-auto bg-gray-800/70 text-white p-4 rounded w-11/12 sm:w-72 md:w-80 backdrop-blur-sm">
          {selected === null ? (
            // Hero content when nothing is selected
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight">Atlas of my skies</h1>
              <p className="mt-2 opacity-80">the heavens tell a profound story each time. it carries the weight of the world. it serves as a ever-present reminder that the world is still turning. it is the canvas of our dreams :)</p>
            </div>
          ) : (
            images[selected] && (
              <div>
                <button
                  className="absolute top-2 right-2 text-white/80 hover:text-white"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  ×
                </button>
        <h3 className="font-bold text-sm truncate">{images[selected].title || "Title"}</h3>
      { images[selected].description != "" ? <p className="text-xs mt-1 line-clamp-3">{images[selected].description}</p> : null }
        <div className="text-xs mt-2 opacity-80">{formatDate(images[selected].date, true) || "Date"}</div>

                <div className="mt-3 h-50 bg-white/5 rounded-md overflow-hidden flex items-center justify-center">
                  {images[selected].latitude != null && images[selected].longitude != null ? (
                    (() => {
                      const lat = images[selected].latitude;
                      const lon = images[selected].longitude;
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
          )}
        </div>
      </div>

      {/* CRT overlay: placed between the image grid and the UI overlay so it affects the images underneath
          Increase z-index so it's visible again (keeps popups at z-50 above it). */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 51 }}>
        <CRTCanvas intensity={1.0} />
      </div>
    </div>
  );
}
