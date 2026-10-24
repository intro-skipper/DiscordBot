# Intro Skipper FAQ

## What is Intro Skipper?

Intro Skipper is a Jellyfin plugin that detects skippable segments in TV episodes and movies and publishes them through Jellyfin's native **Media Segments** feature, so clients can skip them.

It can detect five segment types: **Introduction**, **Credits**, **Recap**, **Preview** and **Commercial**. Each type can be turned on or off in the plugin's **General** tab.

## How do I install Intro Skipper?

1. Open Jellyfin Dashboard > Plugins > Repositories
2. Add the repository URL: `https://intro-skipper.org/manifest.json`
3. Go to Catalog and find "Intro Skipper"
4. Click Install and restart Jellyfin

The manifest URL is the same for every Jellyfin version: it returns the plugin build that matches the Jellyfin server that requests it.

## What are the first steps after installation?

1. **Run the analysis task**: Go to Dashboard > Scheduled Tasks and click the play button for "Detect and Analyze Media Segments"
2. **Wait for analysis to complete**: The plugin will analyze your media library - status is logged before each season/movie
3. **Test playback**: After a season has completed analyzing, play an episode to verify the skip button appears
4. **Verify the segments**: Open the plugin page and go to the **Timestamps** tab to check that segments were detected

For more details, see the Installation Wiki at `https://github.com/intro-skipper/intro-skipper/wiki/Installation`.

## Where do I find the plugin settings and the Timestamps tab?

Open the Jellyfin **web** dashboard: Dashboard > Plugins > Intro Skipper (there is also an "Intro Skipper" entry in the server's main menu).

The plugin page has these tabs: **General**, **Analysis**, **Detection**, **Black Frame**, **Chapters**, **FFmpeg**, **Timestamps**, **Tools** and **Information** (Jellyfin 12 also has **Tracks**).

- **Timestamps** is where you view, add, edit or delete detected segments per show, season, episode or movie. Older guides call this "Edit Timestamps & Fingerprints" or "Manage Fingerprints".
- **Timestamps > Manage** lets you scan a single season, series or movie, set per-season analyzer actions, or erase stored results.

If the settings page is blank inside a desktop, mobile or TV app, open the dashboard in a regular web browser instead and clear the browser cache (CTRL + F5 / SHIFT + CMD + R).

## What are the system requirements?

- Jellyfin server with a supported version (see supported versions)
- Jellyfin's fork of ffmpeg (jellyfin-ffmpeg) with chromaprint:
  - Jellyfin 12.x: version 7.1.3-1 or newer
  - Jellyfin 10.11 / 10.10: version 7.1.1-7 or newer
- For Docker (jellyfin/jellyfin or linuxserver/jellyfin): ffmpeg is preinstalled
- For Debian/Ubuntu: Install the `jellyfin-ffmpeg7` package
- For MacOS: You need to build ffmpeg with chromaprint support (see wiki)
- For Gentoo: enable `xarblu-overlay` and install `media-video/jellyfin-ffmpeg`

## Is there a version for Jellyfin 12?

Yes. Intro Skipper has its own release line for Jellyfin 12 (plugin versions 12.0.x.x). Add the normal manifest URL `https://intro-skipper.org/manifest.json` on a Jellyfin 12 server and the catalog will offer the 12.x build. See the supported versions for the current release.

Always install the plugin release that matches your Jellyfin **major** version, and keep Jellyfin on the newest minor version of that line.

## Why does the plugin show "NotSupported" or fail to load after updating Jellyfin?

The installed plugin version was built for a different Jellyfin version. The log usually shows `Failed to load assembly ... IntroSkipper.dll ... references an incompatible version of one of the shared libraries`.

This typically happens after moving to a new Jellyfin major version (for example from 10.11 to 12, or to a nightly build) while keeping the old plugin. To fix it:

- Update Jellyfin to the newest minor version of its line
- Uninstall the old Intro Skipper version and install the one the catalog offers for your server
- If Jellyfin does not start at all, remove the Intro Skipper folder from `/config/plugins/` (or `/config/data/plugins/`), start Jellyfin and reinstall from the catalog

## How do I update Jellyfin?

Updating Jellyfin itself is outside Intro Skipper's scope. Follow the official Jellyfin documentation for your install method (Docker image tag, package manager, installer): `https://jellyfin.org/docs/`

## Why is the plugin failing to download or install?

Plugin downloads are served via GitHub Releases. If you experience problems during installation (e.g. the plugin fails to download, times out, or the catalog shows an error), it may be caused by your location or IP address having limited access to GitHub's servers.

Possible workarounds:

- Try using a VPN to see if the issue is location-related
- Try again later, as GitHub occasionally has regional availability issues

## Why is the plugin not showing in the catalog?

- Reload without cache (CTRL + F5) for Windows/Linux or (SHIFT + CMD + R) for macOS
- Make sure you're using the correct URL: `https://intro-skipper.org/manifest.json`
- Check if your Jellyfin version is supported (see supported versions) - you need the newest minor version of your Jellyfin line
- Try restarting Jellyfin after adding the repository
- **If you only see "Chapter Creator", "EDL Creator", "Segment Editor" or "SkipMe.db" but not "Intro Skipper", your Jellyfin version is too old** - update Jellyfin to a supported version to see the main Intro Skipper plugin

## Which clients are supported?

Intro Skipper does not ship its own player UI. It stores segments in Jellyfin's native **Media Segments**, so skipping works in any Jellyfin client that supports Media Segments (for example Jellyfin Web and clients built on it). Support in other clients (Tizen, webOS, third-party apps) depends on that client - check the client's own release notes or issue tracker.

If a segment shows up in the plugin's **Timestamps** tab but a client never offers to skip it, that is a client limitation, not a detection problem.

## Why is the skip button not visible?

- Intro Skipper does NOT modify the Jellyfin UI. The skip button comes from Jellyfin's native Media Segments support
- Enable it per client: open the client's Settings > Playback (under your user) > scroll to the bottom of **Advanced** and choose the action for each segment type (e.g. "Ask to skip" or "Skip")
- Check that the episode actually has segments in the plugin's **Timestamps** tab
- Refresh the browser/client cache after changing client settings
- For additional web UI features (skip-button hide delay, plugin-side auto-skip), install the File Transformation plugin

Wiki: `https://github.com/intro-skipper/intro-skipper/wiki/Jellyfin-Skip-Options`

## Why is auto-skip not working?

Skipping is controlled by the client's playback settings. Open the client's Settings > Playback > Advanced and set the segment type (Intro, Outro, ...) to **Skip** instead of "Ask to skip". This is per user and per client, so check it on every device.

On Jellyfin 12, with the File Transformation plugin installed, Intro Skipper's **General** tab also offers **Auto-skip intros** and **Auto-skip credits/outros**. A user's explicit Jellyfin playback preference always wins over these plugin settings.

Also confirm the episode has segments in the **Timestamps** tab, and fully restart playback after changing settings.

## How do I inject the skip button CSS?

You don't need to paste any CSS yourself. In the plugin's **General** tab, click the **Inject CSS** button under "Inject Skip Button CSS". The plugin adds an `@import` line for the skip button styles to Jellyfin's Branding custom CSS automatically (Dashboard > Branding).

This feature requires the File Transformation plugin. After injecting, reload the web client without cache.

## What happened to server-side skipping?

The plugin's old built-in skipping (which patched the player) was replaced by Jellyfin's native Media Segments, which every Media Segments client understands. Automatic skipping is now set in each client's playback settings; on Jellyfin 12 the plugin can also request auto-skip (see "Why is auto-skip not working?").

To avoid skipping the intro of a season's first episode, use **"Ignore intros for first episode of a season"** (Jellyfin 10.11, under Detection) or **"First episode intro handling (per season)"** (Jellyfin 12, Detection tab).

## Why are no intros being detected?

- Make sure jellyfin-ffmpeg is installed (not regular ffmpeg)
- Run the "Detect and Analyze Media Segments" scheduled task
- Check that you have at least 2 episodes in a season (chromaprint needs multiple files to compare)
- Verify the intro is between 15 seconds and 2 minutes long
- Check the intro is within the first 25% of the episode or the first 10 minutes, whichever is smaller
- Check the plugin's support log: Dashboard > Plugins > Intro Skipper > Information
- If you migrated from an older version, try erasing the season's results in **Timestamps > Manage** and scan again

## Is the whole season based on just two episodes?

No. Chromaprint needs a **minimum** of two episodes to compare, but every episode is analyzed and gets its own segments, so intros that start at different times in each episode are fine.

You can also enable **"Re-analyze settled seasons"** (General tab) so a season that was first analyzed while incomplete is re-analyzed once no new episodes arrive.

## Why is a short or inconsistent intro (e.g. The Big Bang Theory) not detected reliably?

Very short intros sit right at the default minimum of 15 seconds, so small differences between episodes can push them below the limit. Lower the minimum intro duration in the **Analysis** tab and scan the season again from **Timestamps > Manage**. Enabling **Prefer Chromaprint Analysis** can also help when chapters are missing or unreliable.

## Does Intro Skipper analyze new media automatically?

Yes. **"Automatically Analyze New Media"** in the **General** tab (enabled by default) analyzes new items when they are added to the library. You can also run the "Detect and Analyze Media Segments" scheduled task or scan a single season/series/movie from **Timestamps > Manage**.

## Is analysis faster after the first time?

Yes. Fingerprints and other detection data are cached, so later scans reuse them. Changing most settings (durations, boundary adjustments) does not require decoding the media again. Only a changed media file, a setting that changes the evidence itself, or erasing with "Include cached fingerprints" causes a full re-analysis.

## Does Intro Skipper work with read-only libraries?

Yes! Intro Skipper fully supports read-only Jellyfin libraries. The fingerprint cache is stored in the server's data folder (`/config/data/introskipper`), not alongside your media files. This means the plugin can analyze and cache intro information without requiring write access to your media storage.

## Can Intro Skipper save its data into the media folders?

No. All segment data and caches are stored in the Jellyfin server's data folder (`/config/data/introskipper`), never next to your media files.

## Why are scheduled tasks failing instantly?

- Check that Intro Skipper detects ffmpeg with chromaprint: Dashboard > Plugins > Intro Skipper > **Information** > Intro Skipper Support Log
- Verify ffmpeg is detected by Jellyfin: Dashboard > Playback > FFmpeg path
- Verify jellyfin-ffmpeg is the required version and includes `--enable-chromaprint`
- Look at the Jellyfin logs for specific error messages
- Verify file permissions on your media library
- Make sure the plugin is the latest version
- If a scan hangs on a difficult file, check the **FFmpeg Scan Timeout** setting

## Why is scanning using too much RAM?

- Reduce "Max degree of parallelism" to 1 in plugin settings
- Set ffmpeg priority to "Below Normal"
- Lower thread count in analysis settings
- Large libraries with many episodes will naturally use more RAM during scanning

## What detection methods does Intro Skipper use?

1. **Chromaprint**: Compares audio fingerprints between episodes to find recurring intro music
2. **Chapter**: Uses named chapter markers from the file if they exist (SponsorBlock chapter labels are supported too)
3. **Black Frame**: Scans keyframes for black frames and credits on a plain card to detect credits
4. **Silence**: Refines an already detected boundary to a nearby quiet point (not a standalone detector)

## Is chapter detection broken?

On some Jellyfin 10.11 releases, chapter detection stopped working because of a Jellyfin bug: Jellyfin did not load the chapters, and the plugin reads chapters through Jellyfin (GitHub issue #654 - `https://github.com/intro-skipper/intro-skipper/issues/654`). This also affected Jellyfin's own Chapter Segments Provider plugin. Intros and credits are usually still found by the other detection methods.

This should not be an issue on Jellyfin 12. The Jellyfin 12 plugin also has **"Use embedded chapters for analysis"** (Chapters tab), which reads chapters directly from the media file instead of Jellyfin's chapter table.

## What are the detection parameters?

- Intros: Must be within the first 25% of the episode or the first 10 minutes (whichever is smaller), between 15 seconds and 2 minutes
- Credits: Between 15 seconds and 7.5 minutes (450 seconds) by default
- Movie credits: Up to 15 minutes (900 seconds) by default
- Recaps, previews and commercials: Between 15 seconds and 2 minutes
- These can be customized in the plugin's **Analysis** tab

## Does Intro Skipper work with movies?

**Credits detection** works for movies and will detect and skip end credits.

**Intro detection does NOT work for movies.** Unlike TV episodes where multiple episodes have the same intro audio (which can be matched using chromaprint), movies don't have a reference file to compare against. There is no reliable way to automatically detect movie intros without having another file to compare against. Named chapters in the file can still be used.

If you want to skip movie intros manually, you can add the segment in the plugin's **Timestamps** tab or with the Segment Editor plugin.

## Does Intro Skipper skip commercials?

Only when the file has chapter markers for them. Commercial segments are detected from chapters named like "Ad", "Advertisement", "Commercial" or "Intermission" (the pattern can be changed in the **Chapters** tab), between 15 seconds and 2 minutes by default. Make sure **Commercials** is enabled in the **General** tab.

Commercials without chapter markers (e.g. in your own TV recordings) are not detected automatically. You can add Commercial segments by hand in the **Timestamps** tab or with the Segment Editor plugin, and the client then skips them like any other segment.

## How do I avoid skipping post-credit scenes?

- Set the client's Outro/Credits action to **"Ask to skip"** instead of "Skip", so you decide per episode
- If a credits segment covers the post-credit scene, shorten it in the **Timestamps** tab (on Jellyfin 12, manual edits are kept on later scans)
- If you use the anime option **"Set post-credits scene as preview for anime"**, disable it, otherwise the scene after the credits becomes a Preview segment
- On Jellyfin 12, credits that are split by an epilogue scene can be stored as separate credits segments, so the scene in between is not skipped

## Why do I get two skip intro buttons (e.g. one in the cold open)?

The plugin can store more than one segment of the same type for an episode. If one of them is wrong (for example a cold open marked as intro), open the **Timestamps** tab and delete or adjust that segment.

For recaps, the Jellyfin 12 option **"Keep the cold open before a recap"** (Black Frame tab) starts the recap after the cold open instead of at 0:00.

## I deleted a segment but it still gets skipped. Why?

- Restart playback: the client loads the segments when playback starts
- Check whether another Media Segment provider (e.g. Chapter Segments Provider, TheIntroDB, SkipMe.db) supplies the same segment. Jellyfin merges the segments of all enabled providers - check the library's **Media segment providers** setting in Jellyfin
- Edit segments in the plugin's **Timestamps** tab, not directly in Jellyfin's Media Segments data - on Jellyfin 12 the plugin's database is the source of truth and overwrites the Jellyfin copy
- On Jellyfin 12, a deleted automatic segment is suppressed so later scans don't add it again; it can be restored from the Timestamps tab

## Can I use Intro Skipper together with other segment plugins (TheIntroDB, Chapter Segments Provider, SkipMe.db)?

Yes, they can be installed together, but every enabled Media Segment provider adds its own segments, so you can get duplicate or overlapping skip buttons. Jellyfin does not tell plugins which provider created a segment, so they cannot coordinate with each other.

Recommendations:

- Choose which providers each library uses in the library's **Media segment providers** setting in Jellyfin
- If you use providers other than Intro Skipper, disable **"Update Missing Segments During Scan"** in the plugin's **General** tab
- **Chapter Segments Provider** is usually unnecessary - Intro Skipper already reads named chapters itself
- **SkipMe.db** is a separate plugin from the Intro Skipper team that fetches crowd-sourced timestamps

## Why can't I find the "Sync SkipMe.db Segment Database" task?

That task belongs to the separate **SkipMe.db** plugin (`https://github.com/intro-skipper/skipme.db-plugin`), not to Intro Skipper. If you read about it in a README, it was the SkipMe.db plugin's README or a development branch. Install "SkipMe.db" from the same catalog to get that task.

## Why does my config show "UseLegacyBlackFrameAnalyzer true" when I never changed it?

Intro Skipper versions for Jellyfin 12 before 12.0.3.0 converted the old 10.11 setting incorrectly when upgrading, so upgraded configs were switched to the legacy black frame analyzer even if you never touched it. Newer versions no longer do this, but the stored value stays.

There is no checkbox for it in the UI, so you are not missing anything. To go back to the default (modern analyzer):

- Use **Tools > Reset Settings to Defaults** (exclusion lists, library selection, season/show overrides and the injected CSS are kept), or
- Stop Jellyfin, set `<UseLegacyBlackFrameAnalyzer>false</UseLegacyBlackFrameAnalyzer>` in `/config/plugins/configurations/IntroSkipper.xml` and start Jellyfin again

Credits are re-analyzed once after the switch.

## Why does the Segment Editor load empty?

The Segment Editor plugin needs Intro Skipper installed, because Intro Skipper provides the endpoints the editor reads and writes segments through. Check:

- Intro Skipper is installed, enabled and not "NotSupported"
- Both Segment Editor and Intro Skipper are updated to the versions the catalog offers for your Jellyfin version
- Reload the page without cache (CTRL + F5 / SHIFT + CMD + R)
- The episodes have been analyzed (segments appear in Intro Skipper's **Timestamps** tab)

Problems with the editor itself can be reported at `https://github.com/intro-skipper/segment-editor/issues`.

## How do I fix SQLite/database errors?

Use the built-in recovery: open the plugin's **Tools** tab, choose **Rebuild Local Database**, confirm, and fully restart Jellyfin when prompted. The current database is backed up when possible. Afterwards, check the **Timestamps** tab and run the analysis task for anything that needs rebuilding.

If that is not possible: stop Jellyfin, delete the database files in `/config/data/introskipper`, start Jellyfin and run detection again.

## Why are plugin settings not being saved?

- Make sure you click Save after changing settings
- Check browser console for JavaScript errors
- Verify Jellyfin has write permissions to config directory

## Why do I see two skip buttons in Jellyfin Media Player?

- This happens when both the plugin and JMP's native skip feature are enabled
- Intro Skipper does not add its own button (it only provides Media Segments), so the second button comes from another source
- Check whether another Media Segment provider (e.g. Chapter Segments Provider, TheIntroDB, SkipMe.db) adds a duplicate segment, and look for duplicates in the plugin's **Timestamps** tab
- Otherwise turn off JMP's own skip feature

## Does Intro Skipper work with SyncPlay?

No, SyncPlay is not compatible with any method of skipping due to how clients are synced.

## How do I edit timestamps manually?

Open the plugin's **Timestamps** tab, select the show/season/episode or movie, and add, move or delete segments there. Manual edits are kept when detection runs again. You can also use the Segment Editor plugin from the same catalog.

## How do I completely reset Intro Skipper?

To reset only the settings, use **Tools > Reset Settings to Defaults** (Jellyfin 12).

For a full reset:

1. Remove all Intro Skipper plugins from Jellyfin's My Plugins page
2. Delete `/config/plugins/configurations/IntroSkipper.xml`
3. Delete `/config/data/introskipper` directory
4. Delete any cache files in `/cache/introskipper`
5. Restart Jellyfin and reinstall the plugin fresh

## Where is the source code for this bot?

The source code for this Discord bot is available at: `https://github.com/intro-skipper/DiscordBot`

## Where can I find other Jellyfin plugins?

> **Note:** This section provides information about other Jellyfin plugins for reference purposes only. The bot focuses on supporting **Intro Skipper** and does not recommend or provide support for other plugins. For questions about other plugins, please refer to the resources below.

A comprehensive list of Jellyfin plugins, themes, metadata providers, and related tools is available at:

**awesome-jellyfin** - `https://github.com/awesome-jellyfin/awesome-jellyfin` - A curated list of awesome Jellyfin themes and plugins.

Popular plugin categories include:

### 🎵 Music & Audio

- `lyarenei/jellyfin-plugin-listenbrainz` - Sync music activity with ListenBrainz (Updated: Feb 2, 2026 · 159 ⭐)
- `jyourstone/jellyfin-musictags-plugin` - Extract and convert audio metadata into tags (Updated: Feb 6, 2026 · 32 ⭐)
- `Eeeeelias/playlist-generator` - Create playlists based on listening history (Updated: Jan 27, 2026 · 38 ⭐)
- `jon4hz/jellyfin-plugin-jellysleep` - Sleep timer for audio playback (Updated: Feb 5, 2026 · 27 ⭐)

### 🎬 Playback & UI

- `Fovty/HoverTrailer` - Display movie trailers on hover (Updated: Jan 30, 2026 · 42 ⭐)
- `n00bcodr/Jellyfin-Enhanced` - Keyboard shortcuts, subtitle styling, TMDB reviews (Updated: Feb 6, 2026 · 935 ⭐)
- `arnesacnussem/jellyfin-plugin-meilisearch` - Enhanced search speed and accuracy (Updated: Feb 4, 2026 · 213 ⭐)

### 🔔 Notifications

- `cedev-1/jellyfin-plugin-DiscordNotifier` - Discord notifications (Updated: Jan 27, 2026 · 7 ⭐)
- `RomainPierre7/jellyfin-plugin-TelegramNotifier` - Telegram notifications (Updated: Jan 28, 2026 · 126 ⭐)
- `shemanaev/jellyfin-plugin-webhooks` - Custom webhook notifications (Updated: Jan 19, 2026 · 34 ⭐)

### 📊 Sync & Import

- `vosmiic/jellyfin-ani-sync` - Sync anime progress with Anilist (Updated: Feb 6, 2026 · 414 ⭐)
- `danielveigasilva/jellyfin-plugin-letterboxd-sync` - Sync watch history with Letterboxd (Updated: Feb 3, 2026 · 104 ⭐)
- `lostb1t/jellyfin-plugin-collection-import` - Import collections from external sources (Updated: Jan 27, 2026 · 86 ⭐)
- `iankiller77/MyAnimeSync` - Sync anime progress with MyAnimeList (Updated: Feb 6, 2026 · 44 ⭐)

### 🎨 Metadata & Collections

- `cleverdevil/plexyfin` - Sync artwork and collections from Plex (Updated: Feb 2, 2026 · 79 ⭐)
- `KeksBombe/jellyfin-plugin-auto-collections` - Dynamic collections based on criteria (Updated: Feb 4, 2026 · 206 ⭐)
- `ShokoAnime/Shokofin` - Integration with Shoko Server for anime (Updated: Feb 6, 2026 · 249 ⭐)

### 🍥 Anime

- `jwueller/jellyfin-plugin-onepace` - Plugin for the One Pace project (Updated: Feb 6, 2026 · 141 ⭐)
- `CodeDevMLH/Jellyfin-Seasonals` - Seasonal anime themes and animations (Updated: Feb 4, 2026 · 37 ⭐)
- `te9c/jellyfin-plugin-shikimori` - Metadata provider for shikimori.one (Updated: Jan 31, 2026 · 26 ⭐)
- `ryandash/jellyfin-plugin-myanimelist` - Metadata provider for MyAnimeList (Updated: Feb 2, 2026 · 43 ⭐)

### 🔐 Authentication

- `jellyfin/jellyfin-plugin-ldapauth` - LDAP authentication (Updated: Feb 4, 2026 · 184 ⭐) - Official Jellyfin Plugin
- `9p4/jellyfin-plugin-sso` - Single Sign-On support (Updated: Feb 5, 2026 · 1,267 ⭐)
- `hexxone/TeleJelly` - Telegram login integration (Updated: Jan 25, 2026 · 23 ⭐)

### 📺 Media Management

- `CherryFloors/jellyfin-plugin-cinemamode` - Cinema Mode with trailers (Updated: Jan 30, 2026 · 94 ⭐)
- `shemanaev/jellyfin-plugin-media-cleaner` - Auto-remove played media (Updated: Feb 3, 2026 · 207 ⭐)
- `intro-skipper/segment-editor` - Manage media segment positions (Updated: Feb 4, 2026)

## Where can I get more help?

- Wiki: `https://github.com/intro-skipper/intro-skipper/wiki`
- GitHub Issues: `https://github.com/intro-skipper/intro-skipper/issues`
- GitHub Discussions: `https://github.com/intro-skipper/intro-skipper/discussions`
