# OnlyFans Cookie Helper

An extension made to make it easier to copy the correct `auth.json` values when using [OF-DL](https://github.com/sim0n00ps/OF-DL).
This extension is a fork of [M-rcus/OnlyFans-Cookie-Helper](https://github.com/M-rcus/OnlyFans-Cookie-Helper) with some small
changes to customize it for OF-DL. I'd like to thank [Marcus](https://github.com/M-rcus) for all his work making the original extension.

## How to install

### Firefox

1. Download the latest `.xpi` file from the [releases page](https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases). If you are prompted to install the extension, click "Add".
2. Otherwise, install the `.xpi` file by dragging it into the Firefox window. Click "Add" when prompted.

### Chrome / Chromium-based browsers

These steps MAY work on other Chromium-based browsers, such as: Brave, Microsoft Edge, Vivaldi and Opera (to name a few).
I only do simple tests on a basic Chromium install, as my primary browser is Firefox. I will not be publishing this extension
to the Chrome Web Store, so you will need to install it manually.

1. Download the latest chrome `.zip` file from the [releases page](https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases). The `.zip` file will have the prefix `OF-DL_Auth_Helper-chrome-`. DO NOT download the `Source code (.zip)` file. It will not work as an extension.
2. Extract the `.zip` file to a folder of your choice
3. Open the extensions page in your browser (e.g. `chrome://extensions`)
4. Enable "Developer mode" (usually a toggle in the top-right corner)
5. Click "Load unpacked" and select the folder you extracted the `.zip` file to

## How to use

Make sure you're logged into the OnlyFans website normally.

After installing the extension, click the cookie icon. A popup should show up with a JSON-formatted text field.

Right-click on the "Download auth.json" link at the bottom of the popup and click "Save link as...". Save the file
as `auth.json` in your config folder (or executable folder). Overwrite the existing `auth.json` file if you have one.

Alternatively, there's a "Copy to clipboard" button at the bottom of the popup that should copy the text to your clipboard.  
If the "Copy to clipboard" button doesn't work, you can just copy the text manually by selecting it. Once you've copied
the text to clipboard, you can paste it into the `auth.json` file in your config folder (or executable folder).  

## Permissions

Overview of permissions and why they're required.

- `cookies`
    - Values such as `auth_id` and `sess` are contained within cookies.
    - Keep in mind that the `cookies` permission only applies for `onlyfans.com` and no other websites.
- `clipboardWrite`
    - To copy the `auth.json` values into your clipboard
- `storage`
    - This is specifically just to "synchronize" the `x_bc` value to the popup (so it can be copied).
    - `x_bc` isn't available via the regular `cookies` permission, so we need a workaround (which utilizes the `storage` permission).
- `contextualIdentities`
    - On Firefox, it's used to support multi-account containers.

## LICENSE

[MIT License](./LICENSE.md)


## Tips

If you find the extension useful and would like to send a tip, please use the original author's donation links at the bottom of his [project page](https://github.com/M-rcus/OnlyFans-Cookie-Helper?tab=readme-ov-file#sellout-tips).
