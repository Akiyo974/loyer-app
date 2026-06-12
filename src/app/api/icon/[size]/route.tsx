import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

export function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  // params est une Promise en Next.js 15+ mais on peut lire le size via l'URL
  const url = new URL(_req.url);
  const parts = url.pathname.split("/");
  const size = parseInt(parts[parts.length - 1], 10) || 512;
  const r = size * 0.188; // border-radius ~96/512

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#18181b",
          borderRadius: r,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Corps de la maison */}
        <div
          style={{
            position: "absolute",
            top: "51%",
            left: "26.5%",
            width: "47%",
            height: "33%",
            background: "#f4f4f5",
            display: "flex",
          }}
        />
        {/* Toit (triangle via border trick) */}
        <div
          style={{
            position: "absolute",
            top: "17%",
            left: "13%",
            width: 0,
            height: 0,
            borderLeft: `${size * 0.37}px solid transparent`,
            borderRight: `${size * 0.37}px solid transparent`,
            borderBottom: `${size * 0.34}px solid #f4f4f5`,
            display: "flex",
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
