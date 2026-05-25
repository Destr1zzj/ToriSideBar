export function getDomain(url: string): string {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getFaviconSources(domain: string): string[] {
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://${domain}/favicon.ico`,
  ];
}
