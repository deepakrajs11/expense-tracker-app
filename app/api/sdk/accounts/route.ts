import { NextResponse } from 'next/server'

// Simple accounts endpoint for the SDK to fetch account names to map to.
// Protected by an optional token: set `SDK_SYNC_TOKEN` in environment and the SDK
// should call with header `x-sdk-token` or `?token=` query param.

export async function GET(req: Request) {
  const envToken = process.env.SDK_SYNC_TOKEN
  if (envToken) {
    const header = req.headers.get('x-sdk-token')
    const url = new URL(req.url)
    const q = url.searchParams.get('token')
    if (header !== envToken && q !== envToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const demo = [
    'Checking Account',
    'Savings Account',
    'Credit Card',
    'Cash Wallet'
  ]
  return NextResponse.json(demo)
}
