import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const w = searchParams.get('w') || '280';
    const h = searchParams.get('h') || '280';
    const z = searchParams.get('z') || '13';

    if (!lat || !lon) {
      return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
    }

    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Mapbox token not configured on the server' }, { status: 500 });
    }

    // Mapbox expects longitude,latitude order
    const marker = `pin-s+ff4757(${encodeURIComponent(`${lon},${lat}`)})`;
    const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${marker}/${lon},${lat},${z}/${w}x${h}?access_token=${encodeURIComponent(token)}`;

    const resp = await fetch(mapUrl);
    if (!resp.ok) {
      // Try a lightweight OpenStreetMap static map fallback so the UI still shows a map while you fix token issues
      const osmUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(
        `${lat},${lon}`
      )}&zoom=${z}&size=${w}x${h}&markers=${encodeURIComponent(`${lat},${lon},red-pushpin`)}`;
      const osmResp = await fetch(osmUrl);
      if (osmResp.ok) {
        const contentType = osmResp.headers.get('content-type') || 'image/png';
        const arrayBuffer = await osmResp.arrayBuffer();
        return new NextResponse(arrayBuffer, {
          status: 200,
          headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
        });
      }

      const text = await resp.text();
      return NextResponse.json({ error: 'Mapbox fetch failed', detail: text }, { status: 502 });
    }

    const contentType = resp.headers.get('content-type') || 'image/png';
    const arrayBuffer = await resp.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'unexpected', message: String(err) }, { status: 500 });
  }
}
