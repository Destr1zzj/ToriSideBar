import { useState } from "react";
import { getFaviconSources } from "../utils/favicon";
import { getRandomEmoji } from "../utils/emoji";

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
  const [allFailed, setAllFailed] = useState(false);
  const allSources = getFaviconSources(domain);
  const sources = src && !allSources.includes(src)
    ? [src, ...allSources]
    : src
      ? [src, ...allSources.filter((s) => s !== src)]
      : allSources;

  if (allFailed) {
    return <span className={`${className} app-icon-text`}>{getRandomEmoji()}</span>;
  }

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
        } else {
          setAllFailed(true);
        }
      }}
    />
  );
}
