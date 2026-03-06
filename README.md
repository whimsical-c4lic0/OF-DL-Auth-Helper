# OF-DL Auth Helper

Browser extension for generating OF-DL-compatible `auth.json` values from an active OnlyFans session.

## Features

- Generates `auth.json` with `USER_ID`, `USER_AGENT`, `X_BC`, and `COOKIE` (`auth_id` + `sess`).
- Copy to clipboard or download directly as `auth.json`.
- Firefox container support.
- Optional feature: shows video durations under PPV chat messages with multiple videos.

## Install

### Firefox

1. Download the latest `.xpi` file from the [releases page](https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases). If you are prompted to install the extension, click "Add".
2. Otherwise, install the `.xpi` file by dragging it into the Firefox window. Click "Add" when prompted.

### Chrome / Chromium-based browsers

These steps MAY work on other Chromium-based browsers, such as Brave, Microsoft Edge, Vivaldi and Opera (to name a few).

1. Download the latest chrome `.zip` file from the [releases page](https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases). The `.zip` file will have the prefix `OF-DL_Auth_Helper-chrome-`. DO NOT download the `Source code (.zip)` file. It will not work as an extension.
2. Extract the `.zip` file to a folder of your choice
3. Open the extensions page in your browser (e.g. `chrome://extensions`)
4. Enable "Developer mode" (usually a toggle in the top-right corner)
5. Click "Load unpacked" and select the folder you extracted the `.zip` file to

## Use

1. Log in on `onlyfans.com` and fully load the page once.
2. Open the extension popup.
3. Copy or download the generated `auth.json`.

## Permissions

- `cookies`: reads `auth_id` and `sess` on `onlyfans.com`
- `storage`: stores synced `x_bc` token data and extension settings
- `clipboardWrite`: enables copy button
- `alarms`: schedules daily automated update checks (can be disabled in the extension settings)
- `userScripts`: optional chat-duration enhancement
- `contextualIdentities` (Firefox): container support

## License

[MIT License](./LICENSE.md)
