import { FaviconImg } from "./FaviconImg";
import { getDomain } from "../utils/favicon";

interface AppIconProps {
  icon: string;
  title: string;
  domain?: string;
}

export function AppIcon({ icon, title, domain }: AppIconProps) {
  if (icon.startsWith("http://") || icon.startsWith("https://")) {
    return <FaviconImg src={icon} domain={domain || getDomain(icon)} title={title} />;
  }
  return <span className="app-icon-text">{icon}</span>;
}
