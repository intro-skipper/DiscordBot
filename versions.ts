const MANIFEST_BASE_URL =
  "https://cdn.jsdelivr.net/gh/intro-skipper/manifest@master";

interface ManifestPlugin {
  guid: string;
  name: string;
  overview: string;
  versions: {
    version: string;
    targetAbi: string;
    timestamp: string;
  }[];
}

interface SupportedVersion {
  jellyfinVersion: string;
  pluginVersion: string;
  targetAbi: string;
  lastUpdated: string;
}

// Cache the versions for 1 hour
let cachedVersions: SupportedVersion[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchManifest(
  jellyfinMajor: string
): Promise<ManifestPlugin[] | null> {
  try {
    const response = await fetch(`${MANIFEST_BASE_URL}/${jellyfinMajor}/manifest.json`);
    if (!response.ok) return null;
    return (await response.json()) as ManifestPlugin[];
  } catch {
    return null;
  }
}

export async function getSupportedVersions(): Promise<SupportedVersion[]> {
  // Return cached versions if still valid
  if (cachedVersions && Date.now() - lastFetch < CACHE_TTL) {
    return cachedVersions;
  }

  const versions: SupportedVersion[] = [];
  const jellyfinVersions = ["10.11", "10.10"];

  for (const jellyfinMajor of jellyfinVersions) {
    const manifest = await fetchManifest(jellyfinMajor);
    if (!manifest) continue;

    // Find the Intro Skipper plugin by name
    const introSkipper = manifest.find(
      (plugin) => plugin.name === "Intro Skipper"
    );

    if (introSkipper && introSkipper.versions.length > 0) {
      // Get the latest version (first in the array)
      const latest = introSkipper.versions[0];
      if (latest) {
        versions.push({
          jellyfinVersion: jellyfinMajor,
          pluginVersion: latest.version,
          targetAbi: latest.targetAbi,
          lastUpdated: latest.timestamp,
        });
      }
    }
  }

  cachedVersions = versions;
  lastFetch = Date.now();
  return versions;
}

export function formatSupportedVersions(versions: SupportedVersion[]): string {
  if (versions.length === 0) {
    return "Unable to fetch version information. Please check https://github.com/intro-skipper/intro-skipper for the latest requirements.";
  }

  const lines = versions.map((v) => {
    const date = new Date(v.lastUpdated).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `- **Jellyfin ${v.jellyfinVersion}**: Requires ${v.targetAbi}+ (Plugin v${v.pluginVersion}, updated ${date})`;
  });

  return lines.join("\n");
}
