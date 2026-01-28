# Intro Skipper FAQ

## What is Intro Skipper?

Intro Skipper is a Jellyfin plugin that automatically detects and skips intro and credit sequences in TV episodes. It analyzes audio using chromaprint to find recurring segments across episodes.

## How do I install Intro Skipper?

1. Open Jellyfin Dashboard > Plugins > Repositories
2. Add the repository URL: `https://intro-skipper.org/manifest.json`
3. Go to Catalog and find "Intro Skipper"
4. Click Install and restart Jellyfin
5. Note: The plugin may take up to 30 minutes to appear after adding the repository

## What are the system requirements?

- Jellyfin server with a supported version (see supported versions)
- Jellyfin's fork of ffmpeg version 7.1.1-7 or newer
- For Docker (jellyfin/jellyfin or linuxserver/jellyfin): ffmpeg is preinstalled
- For Debian/Ubuntu: Install the `jellyfin-ffmpeg7` package
- For MacOS: You need to build ffmpeg with chromaprint support (see wiki)

## Why is the plugin not showing in the catalog?

- Wait up to 30 minutes after adding the repository or try CTRL + F5 to reload without cache
- Make sure you're using the correct URL: `https://intro-skipper.org/manifest.json`
- Check if your Jellyfin version is supported (see supported versions)
- Try restarting Jellyfin after adding the repository

## Why are no intros being detected?

- Make sure jellyfin-ffmpeg is installed (not regular ffmpeg)
- Run the "Detect Introductions" scheduled task
- Check that you have at least 2 episodes in a season (chromaprint needs multiple files to compare)
- Verify the intro is between 15 seconds and 2 minutes long
- Check the intro is within the first 25% of the episode or first 10 minutes

## Why is the skip button not visible?

- As of Jellyfin 10.10+, Intro Skipper does NOT modify the UI directly
- Use Jellyfin's native skip button in player settings
- For additional UI features, install the File Transformation plugin
- Make sure timestamps were detected for the episode

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

## How do I fix SQLite errors?

- Stop Jellyfin
- Delete the intro-skipper database file in the plugin data folder
- Restart Jellyfin and run detection again

## Why are plugin settings not being saved?

- Make sure you click Save after changing settings
- Check browser console for JavaScript errors
- Try a different browser or clear cache
- Verify Jellyfin has write permissions to config directory

## Why do I see two skip buttons in Jellyfin Media Player?

- This happens when both the plugin and JMP's native skip feature are enabled
- Disable one of them: either turn off JMP's native skip or disable the plugin's button

## Does Intro Skipper work with SyncPlay?

No, SyncPlay is not compatible with any method of skipping due to how clients are synced.

## How do I edit timestamps manually?

Go to the plugin settings, find the show/episode, and you can manually adjust the intro start and end times. Note that manual edits may be overwritten if you run detection again.

## Where can I get more help?

- Wiki: https://github.com/intro-skipper/intro-skipper/wiki
- GitHub Issues: https://github.com/intro-skipper/intro-skipper/issues
- GitHub Discussions: https://github.com/intro-skipper/intro-skipper/discussions
