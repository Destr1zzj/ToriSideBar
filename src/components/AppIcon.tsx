import { FaviconImg } from "./FaviconImg";
import { getDomain } from "../utils/favicon";

interface AppIconProps {
  icon: string;
  title: string;
  domain?: string;
}

function isImageUrl(str: string): boolean {
  return (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("//") ||
    str.startsWith("data:image/")
  );
}

export function AppIcon({ icon, title, domain }: AppIconProps) {
  if (isImageUrl(icon)) {
    const src = icon.startsWith("//") ? "https:" + icon : icon;
    return <FaviconImg src={src} domain={domain || getDomain(src)} title={title} />;
  }
  return <span className="app-icon-text">{icon}</span>;
}
