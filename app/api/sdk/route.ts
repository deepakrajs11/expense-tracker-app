import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  // Serve the APK if present in android-sdk/app/build/outputs/apk/debug/app-debug.apk
  const apkPath = path.resolve(process.cwd(), 'android-sdk', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  if (fs.existsSync(apkPath)) {
    const file = await fs.promises.readFile(apkPath)
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="app-debug.apk"',
      },
    })
  }

  // Fallback: return JSON pointing to README
  return NextResponse.json({ error: 'APK not built', hint: '/android-sdk/README.md' }, { status: 404 })
}
