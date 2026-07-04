const imageResponse = async (url: string) => {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

const readSize = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 80), 640);
};

const readZoom = (value: string | null) => {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return 13;
  return Math.min(Math.max(parsed, 1), 20);
};

const fallbackSvg = (lat: number, lon: number, width: number, height: number) => {
  const x = width / 2;
  const y = height / 2;

  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#111827"/>
      <path d="M0 ${height * 0.35} C ${width * 0.25} ${height * 0.2}, ${width * 0.4} ${height * 0.55}, ${width} ${height * 0.28}" fill="none" stroke="#334155" stroke-width="3"/>
      <path d="M0 ${height * 0.75} C ${width * 0.3} ${height * 0.55}, ${width * 0.65} ${height * 0.9}, ${width} ${height * 0.62}" fill="none" stroke="#475569" stroke-width="2"/>
      <circle cx="${x}" cy="${y}" r="10" fill="#ff4757"/>
      <circle cx="${x}" cy="${y}" r="18" fill="none" stroke="#ff4757" stroke-opacity=".35" stroke-width="8"/>
      <text x="16" y="${height - 18}" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">${lat.toFixed(5)}, ${lon.toFixed(5)}</text>
    </svg>`,
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
};

type StaticMapContext = {
  request: Request;
  env: {
    MAPBOX_SECRET_TOKEN?: string;
    NEXT_PUBLIC_MAPBOX_TOKEN?: string;
  };
};

export const onRequestGet = async (context: StaticMapContext) => {
  const { searchParams } = new URL(context.request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const width = readSize(searchParams.get("w"), 280);
  const height = readSize(searchParams.get("h"), 280);
  const zoom = readZoom(searchParams.get("z"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "lat and lon required" }, { status: 400 });
  }

  const token = context.env.MAPBOX_SECRET_TOKEN || context.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token) {
    const marker = `pin-s+ff4757(${encodeURIComponent(`${lon},${lat}`)})`;
    const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${marker}/${lon},${lat},${zoom}/${width}x${height}?access_token=${encodeURIComponent(token)}`;
    const mapboxResponse = await imageResponse(mapboxUrl);
    if (mapboxResponse) return mapboxResponse;
  }

  return fallbackSvg(lat, lon, width, height);
};
