# Intro Skipper FAQ

## What is Intro Skipper?

Intro Skipper is a Jellyfin plugin that automatically detects and skips intro and credit sequences in TV episodes. It analyzes audio using chromaprint to find recurring segments across episodes.

## How do I install Intro Skipper?

1. Open Jellyfin Dashboard > Plugins > Repositories
2. Add the repository URL: `https://intro-skipper.org/manifest.json`
3. Go to Catalog and find "Intro Skipper"
4. Click Install and restart Jellyfin

## What are the first steps after installation?

1. **Run the analysis task**: Go to Dashboard > Scheduled Tasks and click the play button for "Detect and Analyze Media Segments"
2. **Wait for analysis to complete**: The plugin will analyze your media library - status is logged before each season/movie
3. **Test playback**: After a season has completed analyzing, play an episode to verify the skip button appears
4. **Verify timestamps**: Open Intro Skipper plugin settings, scroll to "Edit Timestamps & Fingerprints" and check if timestamps were detected

For more details, see the [Installation Wiki](https://github.com/intro-skipper/intro-skipper/wiki/Installation).

## What are the system requirements?

- Jellyfin server with a supported version (see supported versions)
- Jellyfin's fork of ffmpeg version 7.1.1-7 or newer
- For Docker (jellyfin/jellyfin or linuxserver/jellyfin): ffmpeg is preinstalled
- For Debian/Ubuntu: Install the `jellyfin-ffmpeg7` package
- For MacOS: You need to build ffmpeg with chromaprint support (see wiki)

## Why is the plugin not showing in the catalog?

- Reload without cache (CTRL + F5) for Windows/Linux or (SHIFT + CMD + R) for macOS
- Make sure you're using the correct URL: `https://intro-skipper.org/manifest.json`
- Check if your Jellyfin version is supported (see supported versions)
- Try restarting Jellyfin after adding the repository
- **If you only see "Chapter Creator" and "EDL Creator" but not "Intro Skipper", your Jellyfin version is too old** - update Jellyfin to a supported version to see the main Intro Skipper plugin

## Why are no intros being detected?

- Make sure jellyfin-ffmpeg is installed (not regular ffmpeg)
- Run the "Detect and Analyze Media Segments" scheduled task
- Check that you have at least 2 episodes in a season (chromaprint needs multiple files to compare)
- Verify the intro is between 15 seconds and 2 minutes long
- Check the intro is within the first 25% of the episode or first 10 minutes
- If you migrated from an older version, try erasing all fingerprints in plugin settings and Run the "Detect and Analyze Media Segments" scheduled task

## Why is the skip button not visible?

**For Jellyfin 10.10+:**

- Intro Skipper does NOT modify the UI directly anymore
- Use Jellyfin's native skip button in player settings
- For additional UI features, install the File Transformation plugin

## What happened to server-side skipping?

Server-side skipping was removed in favour of the setting **"Ignore intros for first episode of a season"**.

You can find it under: **Plugin settings -> Detection Adjustment Options**

This works with every Jellyfin client that supports **Media Segments**.

## Why does Jellyfin not start after updating?

- This can happen when updating to a new major Jellyfin version with an old plugin
- Remove the Intro Skipper plugin folder manually from `/config/plugins/`
- Start Jellyfin and reinstall the plugin from the catalog
- If using Docker, make sure to use the correct manifest URL for your Jellyfin version

## Why is scanning using too much RAM?

- Reduce "Max degree of parallelism" to 1 in plugin settings
- Set ffmpeg priority to "Below Normal"
- Lower thread count in analysis settings
- Large libraries with many episodes will naturally use more RAM during scanning

## What detection methods does Intro Skipper use?

1. **Chromaprint**: Compares audio fingerprints between episodes to find recurring intro music
2. **Chapter**: Uses chapter markers from the file if they exist
3. **Black Frame**: Detects black frames that often indicate intro/outro boundaries
4. **Silence**: Detects periods of silence that may indicate segment boundaries

## What are the detection parameters?

- Intros: Must be within first 25% of episode or first 10 minutes, between 15 seconds and 2 minutes
- Credits: Between 15 seconds and 5 minutes
- Movies: Less than 15 minutes
- These can be customized in plugin settings under "Modify Segment Parameters"

## Why do scheduled tasks fail instantly?

- Check that jellyfin-ffmpeg is properly installed
- Look at the Jellyfin logs for specific error messages
- Verify file permissions on your media library
- Make sure the plugin is the latest version
- Try running a full library scan first

## How do I fix SQLite/database errors?

- Stop Jellyfin
- Delete the intro-skipper database file in `/config/data/introskipper`
- Also delete any cache files in `/cache/introskipper` if they exist
- Restart Jellyfin and run detection again

## Why are plugin settings not being saved?

- Make sure you click Save after changing settings
- Check browser console for JavaScript errors
- Verify Jellyfin has write permissions to config directory

## Why do I see two skip buttons in Jellyfin Media Player?

- This happens when both the plugin and JMP's native skip feature are enabled
- Disable one of them: either turn off JMP's native skip or disable the plugin's button

## Does Intro Skipper work with SyncPlay?

No, SyncPlay is not compatible with any method of skipping due to how clients are synced.

## How do I edit timestamps manually?

Go to the plugin settings "Manage Fingerprints" section, find the show/episode, and you can manually adjust the intro start and end times. Note that manual edits may be overwritten if you run detection again.

## How do I completely reset Intro Skipper?

1. Remove all Intro Skipper plugins from Jellyfin's My Plugins page
2. Delete `/config/plugins/configurations/IntroSkipper.xml`
3. Delete `/config/data/introskipper` directory
4. Delete any cache files in `/cache/introskipper`
5. Restart Jellyfin and reinstall the plugin fresh

## Where is the source code for this bot?

The source code for this Discord bot is available at: [GitHub](https://github.com/intro-skipper/DiscordBot)

## Where can I get more help?

- [Wiki](https://github.com/intro-skipper/intro-skipper/wiki)
- [GitHub Issues](https://github.com/intro-skipper/intro-skipper/issues)
- [GitHub Discussions](https://github.com/intro-skipper/intro-skipper/discussions)
