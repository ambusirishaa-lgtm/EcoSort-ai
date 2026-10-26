
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { success: false, error: "Cloudflare credentials are missing." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Please upload an image using the "image" field.' },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { success: false, error: "Please upload a JPG, PNG, WEBP, or GIF image." },
        { status: 400 }
      );
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Image must be smaller than 5 MB." },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const imageData = `data:${image.type};base64,${base64}`;

    const cloudflareResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt:
            `You are EcoSort AI, an expert waste identification and sorting assistant.

Carefully inspect the uploaded image and provide a practical waste-sorting report.

Follow these rules:

1. Identify the main visible item. Do not invent details that cannot be seen.
2. Select exactly one primary category:

   * Recyclable
   * Organic
   * Hazardous
   * Electronic Waste
   * General Waste
3. For plastic bottles, do not automatically classify them as general waste. Classify them as recyclable when appropriate, while explaining that local recycling rules and the plastic type may affect acceptance.
4. If the item cannot be identified confidently, clearly state that uncertainty.
5. Give simple, numbered disposal instructions.
6. Suggest a practical reuse idea when appropriate.
7. Explain the environmental benefit of proper disposal in one or two sentences.
8. Never claim an item is recyclable everywhere. Mention that local waste collection rules vary.
9. For batteries, chemicals, medicines, electronics, and other potentially hazardous items, provide appropriate safety precautions.

Return the report using exactly these headings:

DETECTED ITEM:
WASTE CATEGORY:
MATERIAL:
DISPOSAL INSTRUCTIONS:
REUSE TIP:
ENVIRONMENTAL IMPACT:
CONFIDENCE:

For CONFIDENCE, give a percentage estimate and briefly explain any uncertainty. Do not pretend the estimate is scientifically calibrated.
Keep the report clear, accurate, and easy for a beginner to understand.
`,

          image: imageData,
          max_tokens: 400,
        }),
        cache: "no-store",
      }
    );

    const data = await cloudflareResponse.json();

    if (!cloudflareResponse.ok || !data.success) {
      console.error("Cloudflare AI error:",
  cloudflareResponse.status,
  JSON.stringify(data, null, 2));

      return NextResponse.json(
        {
          success: false,
          error:
            "The AI service could not analyze this image. Check your Cloudflare model access and API permissions.",
        },
        { status: 502 }
      );
    }

    const analysis =
      data.result?.response ??
      data.result?.description ??
      data.result;

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("EcoSort analysis error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong while analyzing the image." },
      { status: 500 }
    );
  }
}