import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Initialize core bot
let botCore = null;

async function initializeBot() {
  if (!botCore) {
    const Core = (await import('@/core/core')).default;
    const config = (await import('@/config/config.json')).default;
    
    botCore = new Core();
    await botCore.initialize(config);
  }
  return botCore;
}

// GET - Webhook verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const config = (await import('@/config/config.json')).default;

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log('✅ Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Verification failed', { status: 403 });
}

// POST - Handle incoming messages
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Verify signature for security
    if (!await verifySignature(request, body)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Check if this is a page subscription
    if (body.object === 'page') {
      // Immediately respond 200
      const response = NextResponse.json({ status: 'EVENT_RECEIVED' });
      
      // Process events asynchronously
      processEventsAsync(body.entry);
      
      return response;
    }

    return new NextResponse('Not a page event', { status: 404 });
  } catch (error) {
    console.error('❌ Error in webhook:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}

// Verify Facebook signature
async function verifySignature(request, body) {
  const config = (await import('@/config/config.json')).default;
  
  if (!config.appSecret) {
    console.warn('⚠️ No app secret configured, skipping signature verification');
    return true;
  }

  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) return false;

  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', config.appSecret)
      .update(JSON.stringify(body))
      .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Async event processing
async function processEventsAsync(entries) {
  try {
    const bot = await initializeBot();
    
    for (const entry of entries) {
      for (const event of entry.messaging) {
        console.log('📥 Processing event:', event.sender?.id);
        
        try {
          await bot.processMessage(event);
        } catch (error) {
          console.error('Error processing single event:', error);
          // Continue processing other events
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in async processing:', error);
  }
}
