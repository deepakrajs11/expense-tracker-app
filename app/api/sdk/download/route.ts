import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // -------------------------------------------------
  // 1️⃣ Stream the APK if it already exists
  // -------------------------------------------------
  const apkPath = path.resolve(
    process.cwd(),
    'android-sdk',
    'app',
    'build',
    'outputs',
    'apk',
    'debug',
    'app-debug.apk'
  );

  if (fs.existsSync(apkPath)) {
    const { Readable } = await import('stream');
    const stat = fs.statSync(apkPath);
    const stream = fs.createReadStream(apkPath);
    const webStream = Readable.toWeb(stream);

    // WHATWG stream expected by NextResponse
    const readableApk = webStream as unknown as ReadableStream<Uint8Array>;

    return new NextResponse(readableApk, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="app-debug.apk"',
        'Content-Length': stat.size.toString(),
      },
    });
  }

  // -------------------------------------------------
  // 2️⃣ Otherwise, stream a ZIP of the whole Android SDK
  // -------------------------------------------------
  const sdkDir = path.resolve(process.cwd(), 'android-sdk');
  if (!fs.existsSync(sdkDir)) {
    return NextResponse.json(
      { error: 'android-sdk directory not found' },
      { status: 404 }
    );
  }

  try {
    const archiver = (await import('archiver')).default;
    const { PassThrough, Readable } = await import('stream');

    const pass = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.directory(sdkDir, 'android-sdk');
    archive.pipe(pass);
    archive.finalize().catch(() => {});

    // Convert Node stream → WHATWG ReadableStream
    const webStream = Readable.toWeb(pass);
    const readableZip = webStream as unknown as ReadableStream<Uint8Array>;

    return new NextResponse(readableZip, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition':
          'attachment; filename="android-sdk.zip"',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'archiving not available', detail: String(e) },
      { status: 500 }
    );
  }
}