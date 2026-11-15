import { NextResponse } from "next/server";

export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "o100uxqf";
  const apiKey = process.env.CLOUDINARY_API_KEY || "251522998548792";

  const startTime = Date.now();
  try {
    // Ping Cloudinary API endpoint
    const pingResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
      method: "GET",
      headers: {
        "User-Agent": "NextJS-Cloudinary-Diagnostic",
      },
    });

    const latency = Date.now() - startTime;
    const isOk = pingResponse.ok || pingResponse.status === 200 || pingResponse.status === 401; // 401 means endpoint reached but needs auth

    return NextResponse.json({
      status: "success",
      reachable: true,
      cloudName,
      apiKey: apiKey ? `${apiKey.substring(0, 6)}...` : null,
      httpStatus: pingResponse.status,
      latencyMs: latency,
      message: "Cloudinary API endpoint reachable",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        reachable: false,
        cloudName,
        message: error instanceof Error ? error.message : "Cannot reach Cloudinary servers",
      },
      { status: 500 }
    );
  }
}
