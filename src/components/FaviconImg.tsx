import { useState } from "react";
import { getFaviconSources } from "../utils/favicon";

export function FaviconOptionImg({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span style={{ fontSize: "14px", opacity: 0.4 }}>🌐</span>;
  }
  return <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />;
}

interface FaviconImgProps {
  src?: string;
  domain: string;
  title: string;
  className?: string;
}

export function FaviconImg({ src, domain, title, className = "app-icon-img" }: FaviconImgProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const allSources = getFaviconSources(domain);
  const sources = src && !allSources.includes(src)
    ? [src, ...allSources]
    : src
      ? [src, ...allSources.filter((s) => s !== src)]
      : allSources;

  return (
    <img
      src={sources[srcIndex]}
      alt={title}
      className={className}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onError={() => {
        if (srcIndex < sources.length - 1) {
          setSrcIndex(srcIndex + 1);
        }
      }}
    />
  );
}
