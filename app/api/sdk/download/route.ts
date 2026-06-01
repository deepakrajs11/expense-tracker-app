import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  // If APK exists, stream it
  const apkPath = path.resolve(process.cwd(), 'android-sdk', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  if (fs.existsSync(apkPath)) {
    const stream = fs.createReadStream(apkPath)
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="app-debug.apk"',
      },
    })
  }

  // Otherwise stream a ZIP of the sdk folder to avoid buffering large files
  const sdkDir = path.resolve(process.cwd(), 'android-sdk')
  if (!fs.existsSync(sdkDir)) {
    return NextResponse.json({ error: 'android-sdk directory not found' }, { status: 404 })
  }

  try {
    const archiver = (await import('archiver')).default
    const { PassThrough } = await import('stream')
    const pass = new PassThrough()
    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.directory(sdkDir, 'android-sdk')
    archive.pipe(pass)
    archive.finalize().catch(() => {})

    // Convert Node stream to WHATWG ReadableStream for NextResponse
    const { Readable } = await import('stream')
    const webStream = Readable.toWeb(pass)
    return new NextResponse(webStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="android-sdk.zip"',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'archiving not available', detail: String(e) }, { status: 500 })
  }
}
