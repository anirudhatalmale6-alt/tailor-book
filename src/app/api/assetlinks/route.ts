import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'online.stitchmanager.app',
        sha256_cert_fingerprints: [
          'D0:07:80:DE:09:B6:21:14:7B:1A:57:55:47:5E:EF:50:50:8E:F7:BA:05:A6:21:47:D1:D0:8A:5E:55:BC:C4:E1',
        ],
      },
    },
  ]);
}
