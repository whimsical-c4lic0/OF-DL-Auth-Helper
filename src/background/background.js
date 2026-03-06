const USER_SCRIPT_ID = 'show_additional_message_details';
const USER_SCRIPT_MATCHES = ['https://onlyfans.com/*', 'https://*.onlyfans.com/*'];
const UPDATE_FEED_URL = 'https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases.atom';
const RELEASES_PAGE_URL = 'https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases';
const UPDATE_CHECK_ALARM_NAME = 'dailyExtensionVersionCheck';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const UPDATE_STORAGE_KEYS = [
    'autoVersionCheckEnabled',
    'lastVersionCheckAt',
    'latestReleaseVersion',
    'latestReleaseUrl',
    'updateAvailable',
    'lastVersionCheckError',
];
let ensureUserScriptRegisteredPromise = null;
let versionCheckPromise = null;

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

function storageGet(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, function(data) {
            resolve(data || {});
        });
    });
}

function storageSet(values) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(values, function() {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
                reject(new Error(runtimeError.message || 'Failed to write to storage'));
                return;
            }

            resolve();
        });
    });
}

function storageClear() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.clear(function() {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
                reject(new Error(runtimeError.message || 'Failed to clear extension storage'));
                return;
            }

            resolve();
        });
    });
}

function decodeXmlEntities(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function normalizeVersion(rawVersion) {
    if (!rawVersion) {
        return null;
    }

    const cleaned = String(rawVersion).trim().replace(/^v/i, '');
    const versionMatch = cleaned.match(/\d+(?:\.\d+)*/);
    if (!versionMatch) {
        return null;
    }

    const parts = versionMatch[0].split('.');
    if (parts.some((part) => !/^\d+$/.test(part))) {
        return null;
    }

    return parts.join('.');
}

function compareVersions(leftVersion, rightVersion) {
    const leftParts = leftVersion.split('.').map((part) => Number(part));
    const rightParts = rightVersion.split('.').map((part) => Number(part));
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let i = 0; i < maxLength; i++) {
        const leftValue = Number.isFinite(leftParts[i]) ? leftParts[i] : 0;
        const rightValue = Number.isFinite(rightParts[i]) ? rightParts[i] : 0;

        if (leftValue > rightValue) {
            return 1;
        }

        if (leftValue < rightValue) {
            return -1;
        }
    }

    return 0;
}

function parseLatestReleaseFromAtom(atomXml) {
    const firstEntryMatch = atomXml.match(/<entry\b[\s\S]*?<\/entry>/i);
    if (!firstEntryMatch) {
        throw new Error('No releases found in feed');
    }

    const firstEntry = firstEntryMatch[0];
    const titleMatch = firstEntry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = decodeXmlEntities((titleMatch?.[1] || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/i, '$1')).trim();
    const normalizedVersion = normalizeVersion(rawTitle);
    if (!normalizedVersion) {
        throw new Error('Failed to parse latest release version');
    }

    const alternateLinkMatch = firstEntry.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    const anyLinkMatch = firstEntry.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    const releaseUrl = decodeXmlEntities(alternateLinkMatch?.[1] || anyLinkMatch?.[1] || RELEASES_PAGE_URL).trim();

    return {
        latestReleaseVersion: normalizedVersion,
        latestReleaseUrl: releaseUrl || RELEASES_PAGE_URL,
    };
}

async function fetchLatestReleaseInfo() {
    const response = await fetch(UPDATE_FEED_URL, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error('Failed to fetch release feed: HTTP ' + response.status);
    }

    const atomXml = await response.text();
    return parseLatestReleaseFromAtom(atomXml);
}

async function getUpdateStatus() {
    const data = await storageGet(UPDATE_STORAGE_KEYS);
    const currentVersion = chrome.runtime.getManifest().version;

    return {
        autoVersionCheckEnabled: data.autoVersionCheckEnabled !== false,
        lastVersionCheckAt: typeof data.lastVersionCheckAt === 'number' ? data.lastVersionCheckAt : null,
        latestReleaseVersion: data.latestReleaseVersion || null,
        latestReleaseUrl: data.latestReleaseUrl || RELEASES_PAGE_URL,
        updateAvailable: data.updateAvailable === true,
        lastVersionCheckError: data.lastVersionCheckError || null,
        currentVersion,
    };
}

async function checkForNewVersion(options = {}) {
    const { force = false } = options;

    if (versionCheckPromise) {
        return versionCheckPromise;
    }

    versionCheckPromise = (async () => {
        const existingStatus = await getUpdateStatus();
        const now = Date.now();

        if (!force) {
            if (!existingStatus.autoVersionCheckEnabled) {
                return {
                    checked: false,
                    reason: 'disabled',
                    status: existingStatus,
                };
            }

            if (existingStatus.lastVersionCheckAt && (now - existingStatus.lastVersionCheckAt) < UPDATE_CHECK_INTERVAL_MS) {
                return {
                    checked: false,
                    reason: 'throttled',
                    status: existingStatus,
                };
            }
        }

        try {
            const latestReleaseInfo = await fetchLatestReleaseInfo();
            const currentVersion = normalizeVersion(chrome.runtime.getManifest().version);
            const updateAvailable = currentVersion
                ? compareVersions(latestReleaseInfo.latestReleaseVersion, currentVersion) > 0
                : false;

            await storageSet({
                lastVersionCheckAt: now,
                latestReleaseVersion: latestReleaseInfo.latestReleaseVersion,
                latestReleaseUrl: latestReleaseInfo.latestReleaseUrl,
                updateAvailable,
                lastVersionCheckError: null,
            });
        } catch (err) {
            console.error('Failed to check for extension updates', err);
            await storageSet({
                lastVersionCheckAt: now,
                lastVersionCheckError: String(err?.message || err),
            });
        }

        return {
            checked: true,
            status: await getUpdateStatus(),
        };
    })();

    try {
        return await versionCheckPromise;
    } finally {
        versionCheckPromise = null;
    }
}

function ensureVersionCheckAlarm() {
    if (!chrome.alarms || typeof chrome.alarms.create !== 'function') {
        return;
    }

    chrome.alarms.create(UPDATE_CHECK_ALARM_NAME, {
        periodInMinutes: 24 * 60,
    });
}

async function resetExtensionData() {
    await storageClear();
    versionCheckPromise = null;
    ensureVersionCheckAlarm();
    void ensureUserScriptRegistered();
    void checkForNewVersion();

    return getUpdateStatus();
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

async function handleRuntimeMessage(data) {
    if (data?.type === 'ensureUserScriptRegistered') {
        await ensureUserScriptRegistered();
        return { ok: true };
    }

    if (data?.type === 'getUpdateStatus') {
        return {
            ok: true,
            status: await getUpdateStatus(),
        };
    }

    if (data?.type === 'setAutoVersionCheckEnabled') {
        if (typeof data.enabled !== 'boolean') {
            return {
                ok: false,
                error: '"enabled" must be true or false',
            };
        }

        await storageSet({
            autoVersionCheckEnabled: data.enabled,
        });

        if (data.enabled) {
            void checkForNewVersion();
        }

        return {
            ok: true,
            status: await getUpdateStatus(),
        };
    }

    if (data?.type === 'manualVersionCheck') {
        const result = await checkForNewVersion({ force: true });

        return {
            ok: true,
            checked: result.checked,
            status: await getUpdateStatus(),
        };
    }

    if (data?.type === 'clearExtensionData') {
        return {
            ok: true,
            status: await resetExtensionData(),
        };
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

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    void handleRuntimeMessage(message)
        .then((result) => {
            sendResponse(result);
        })
        .catch((err) => {
            console.error('Failed to handle runtime message', err);
            sendResponse({
                ok: false,
                error: String(err?.message || err),
            });
        });

    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    void ensureUserScriptRegistered();
    ensureVersionCheckAlarm();
    void checkForNewVersion();
});

chrome.runtime.onStartup.addListener(() => {
    void ensureUserScriptRegistered();
    ensureVersionCheckAlarm();
    void checkForNewVersion();
});

if (chrome.permissions?.onAdded) {
    chrome.permissions.onAdded.addListener((permissions) => {
        if (permissions?.permissions?.includes('userScripts')) {
            void ensureUserScriptRegistered();
        }
    });
}

if (chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm?.name === UPDATE_CHECK_ALARM_NAME) {
            void checkForNewVersion();
        }
    });
}

ensureVersionCheckAlarm();
void ensureUserScriptRegistered();
void checkForNewVersion();
