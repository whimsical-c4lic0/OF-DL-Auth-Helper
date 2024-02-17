# OnlyFans Cookie Helper

An extension made to make it easier to copy the correct `auth.json` values when using [OF-DL](https://github.com/sim0n00ps/OF-DL).
This extension is a fork of [M-rcus/OnlyFans-Cookie-Helper](https://github.com/M-rcus/OnlyFans-Cookie-Helper) with some small
changes to customize it for OF-DL. I'd like to thank [Marcus](https://github.com/M-rcus) for all his work making the original extension.


## How to use

Make sure you're logged into the OnlyFans website normally.

After installing the extension, click the cookie icon. A popup should show up (see [preview](#preview)) with a JSON-formatted text.

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
    - ~~On Chromium-based browsers (Google Chrome, Brave, Microsoft Edge, Vivaldi, Opera etc.) it does nothing. However, it may give a warning. The extension should still work even with this warning.~~ - This should no longer happen as of v2.2.0.

## LICENSE

[MIT License](./LICENSE.md)


## Tips

If you find the extension useful and would like to send a tip, please use the original author's donation links at the bottom of his [project page](https://github.com/M-rcus/OnlyFans-Cookie-Helper?tab=readme-ov-file#sellout-tips).
