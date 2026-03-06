import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const token = process.env.itl_READ_WRITE_TOKEN;
    if (!token) {
      console.error('itl_READ_WRITE_TOKEN is not set');
      return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 });
    }

    console.log('Fetching blob with token prefix:', token.substring(0, 10));

    // Fetch the private blob with the token
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Blob fetch failed:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch image', details: response.statusText }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
