import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to OpenClaw gateway
    const response = await fetch('http://194.163.191.142:18789/line/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': request.headers.get('X-Line-Signature') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
