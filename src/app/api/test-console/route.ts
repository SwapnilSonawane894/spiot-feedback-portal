export async function GET() {
  console.log('[TEST] This is a test console log');
  console.error('[TEST] This is a test console error');
  return Response.json({ message: 'Test endpoint', timestamp: new Date().toISOString() });
}
