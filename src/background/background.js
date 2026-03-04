const USER_SCRIPT_ID = 'show_additional_message_details';
const USER_SCRIPT_MATCHES = ['https://onlyfans.com/*', 'https://*.onlyfans.com/*'];
let ensureUserScriptRegisteredPromise = null;

const USER_SCRIPT_CODE = `
(function () {
    'use strict';

    function formatSeconds(totalSeconds) {
      const t = Math.floor(totalSeconds); // ensure integer seconds
      if (t < 0 || !Number.isFinite(t)) {
        throw new Error('totalSeconds must be a non-negative finite number');
      }

      const minutes = Math.floor(t / 60);
      const seconds = t % 60;

      return minutes > 0 ? minutes + 'm' + seconds + 's' : seconds + 's';
    }

    let totalMessagesTracked = 0;

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('load', function () {
            if (!this._url || !this._url.includes('/api2/v2/chats')) return;

            try {
                const json = JSON.parse(this.responseText);
                if (!json?.list) return;

                const apiMessages = json.list.slice().reverse();

                setTimeout(() => {
                    const wrapper = document.querySelector('.b-chat__messages-wrapper');
                    if (!wrapper) {
                        return;
                    }

                    const domMessages = wrapper.querySelectorAll('[at-attr="chat_message"]');

                    const baseIndex = Math.max(0, domMessages.length - (totalMessagesTracked + apiMessages.length));

                    apiMessages.forEach((msg, i) => {
                        if (!msg.media || msg.media.length === 0) return;

                        const videoDurations = msg.media
                            .filter(m => m.type === 'video' && m.duration > 0)
                            .map(m => m.duration);

                        if (videoDurations.length > 1) {
                            const domIndex = baseIndex + i;
                            const domMessage = domMessages[domIndex];

                            if (domMessage) {
                                const timeRow = domMessage.querySelector(':scope > span');
                                if (!timeRow) return;

                                const totalDuration = videoDurations.reduce((acc, curr) => acc + curr, 0);
                                const infoPrefix = 'Video durations (' + formatSeconds(totalDuration) + '):';
                                const infoValues = ' ' + videoDurations.map(t => formatSeconds(t)).join(', ');
                                const infoText = infoPrefix + infoValues;

                                const infoLine = document.createElement('div');
                                infoLine.style.marginLeft = '8px';
                                infoLine.style.display = 'inline-block';
                                infoLine.style.overflow = 'hidden';
                                infoLine.style.textOverflow = 'ellipsis';
                                infoLine.style.whiteSpace = 'nowrap';

                                const prefixNode = document.createElement('span');
                                prefixNode.style.fontWeight = '700';
                                prefixNode.textContent = infoPrefix;

                                infoLine.appendChild(prefixNode);
                                infoLine.appendChild(document.createTextNode(infoValues));
                                infoLine.title = infoText;
                                timeRow.appendChild(infoLine);
                            }
                        }
                    });

                    totalMessagesTracked += apiMessages.length;
                }, 500);
            } catch (e) {
                console.error('Failed to parse response JSON:', e);
            }
        });

        return originalSend.apply(this, args);
    };
})();
`;

/**
 * Detects whether the userScripts API exists and is enabled
 * @returns {Promise<boolean>}
 */
async function isUserScriptsAvailable() {
    if (!chrome.userScripts || typeof chrome.userScripts.getScripts !== 'function') {
        return false;
    }

    try {
        // Method call which throws if API permission or toggle is not enabled.
        await chrome.userScripts.getScripts();
        return true;
    } catch {
        // Not available.
        return false;
    }
}

/**
 * Register or update the userscript so it exists even after the browser restarts
 */
async function ensureUserScriptRegistered() {
    if (ensureUserScriptRegisteredPromise) {
        return ensureUserScriptRegisteredPromise;
    }

    ensureUserScriptRegisteredPromise = (async () => {
        if (!await isUserScriptsAvailable()) {
            return;
        }

        const scriptDefinition = {
            id: USER_SCRIPT_ID,
            matches: USER_SCRIPT_MATCHES,
            world: 'MAIN',
            js: [{ code: USER_SCRIPT_CODE }],
        };

        try {
            const existingScripts = await chrome.userScripts.getScripts();
            const alreadyRegistered = existingScripts.some((script) => script.id === USER_SCRIPT_ID);

            if (alreadyRegistered) {
                await chrome.userScripts.unregister({ ids: [USER_SCRIPT_ID] });
            }

            await chrome.userScripts.register([scriptDefinition]);
        } catch (err) {
            const message = String(err?.message || '');
            if (message.includes('Duplicate script ID')) {
                try {
                    await chrome.userScripts.unregister({ ids: [USER_SCRIPT_ID] });
                    await chrome.userScripts.register([scriptDefinition]);
                    return;
                } catch (retryErr) {
                    console.error('Failed to register userscript after duplicate ID retry', retryErr);
                    return;
                }
            }

            console.error('Failed to register userscript', err);
        }
    })();

    try {
        await ensureUserScriptRegisteredPromise;
    } finally {
        ensureUserScriptRegisteredPromise = null;
    }
}

/**
 * Helper for storing the new bcTokens object
 */
function storeBcTokens(bcTokens) {
    chrome.storage.local.set({'bcTokens': bcTokens});
}

/**
 * Retrieve the stored bcTokens object
 * If none, return a fresh object
 */
async function getStoredBcTokens() {
    return new Promise((resolve, _) => {
        chrome.storage.local.get(['bcTokens'], function(data) {
            if (!data.bcTokens) {
                storeBcTokens({});
                resolve({});
                return;
            }

            resolve(data.bcTokens);
        });
    });
}

async function handleBcToken(data) {
    if (data?.type === 'ensureUserScriptRegistered') {
        await ensureUserScriptRegistered();
        return true;
    }

    if (!data || !data.bcTokenSha || !data.id) {
        return false;
    }

    const { bcTokenSha, id } = data;

    const bcTokens = await getStoredBcTokens();
    bcTokens[id] = bcTokenSha;
    storeBcTokens(bcTokens);

    return true;
}

chrome.runtime.onMessage.addListener(handleBcToken);

chrome.runtime.onInstalled.addListener(() => {
    void ensureUserScriptRegistered();
});

chrome.runtime.onStartup.addListener(() => {
    void ensureUserScriptRegistered();
});

if (chrome.permissions?.onAdded) {
    chrome.permissions.onAdded.addListener((permissions) => {
        if (permissions?.permissions?.includes('userScripts')) {
            void ensureUserScriptRegistered();
        }
    });
}

void ensureUserScriptRegistered();
