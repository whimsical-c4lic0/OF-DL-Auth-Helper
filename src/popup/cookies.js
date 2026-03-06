const containerNames = {};
const containersEnabled = browser.contextualIdentities !== undefined;
const desiredCookies = ['auth_id', 'sess'];
const isChromiumBased = /(Chrome|Chromium)\//.test(navigator.userAgent);
const releasesPageUrl = 'https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases';

/**
 * Get the correct bcToken from storage
 */
async function getBcTokenSha(id)
{
    return new Promise((resolve) => {
        chrome.storage.local.get(['bcTokens'], function(data) {
            const bcTokens = data.bcTokens || {};

            if (bcTokens[id]) {
                resolve(bcTokens[id]);
                return;
            }

            resolve(null);
        });
    });
}

async function getContainers()
{
    /**
     * Containers are enabled, but none found.
     */
    let containers = await browser.contextualIdentities.query({});
    if (containers.length < 1) {
        return;
    }

    // Sort container list by name.
    containers.sort(function(a, b) {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (nameA < nameB) {
            return -1;
        }

        if (nameA > nameB) {
            return 1;
        }

        return 0;
    });

    document.getElementById('container-list').classList.remove('hidden');

    const optionList = document.getElementById('container-select');

    for (const container of containers)
    {
        const storeId = container.cookieStoreId;
        const { name } = container;

        containerNames[storeId] = name;

        const option = document.createElement('option');
        option.setAttribute('value', storeId);
        option.textContent = name;

        optionList.insertAdjacentElement('beforeend', option);
    }

    optionList.addEventListener('change', function(event) {
        const storeId = event.target.value;

        if (!storeId || storeId.length < 1) {
            displayAuthConfig(null);
            return;
        }

        displayAuthConfig(storeId);
    });
}

async function getMappedCookies(cookieStoreId) {
    /**
     * Grab the cookies from the browser...
     */
    const cookieOpts = {
        domain: '.onlyfans.com',
    };

    /**
     * Container tabs
     */
    if (cookieStoreId) {
        cookieOpts.storeId = cookieStoreId;
    }

    const cookies = await browser.cookies.getAll(cookieOpts);

    /**
     * We only care about `name` and `value` in each cookie entry.
     */
    const mappedCookies = {};
    for (const cookie of cookies)
    {
        mappedCookies[cookie.name] = cookie.value;
    }

    return mappedCookies;
}

function resizeJsonOutputToContent() {
    const jsonOutput = document.getElementById('json-output');
    if (!jsonOutput || jsonOutput.classList.contains('hidden')) {
        return;
    }

    jsonOutput.style.height = 'auto';
    jsonOutput.style.height = jsonOutput.scrollHeight + 'px';
}

function showControls() {
    document.getElementById('auth-json-label').classList.remove('hidden');
    document.getElementById('json-output').classList.remove('hidden');
    document.getElementById('copy-to-clipboard').classList.remove('hidden');
    document.getElementById('download-file').classList.remove('hidden');
    document.querySelector('.json-section')?.classList.remove('no-json');
    requestAnimationFrame(() => resizeJsonOutputToContent());
}

function hideControls() {
    document.getElementById('auth-json-label').classList.add('hidden');
    document.getElementById('json-output').classList.add('hidden');
    document.getElementById('copy-to-clipboard').classList.add('hidden');
    document.getElementById('download-file').classList.add('hidden');
    document.querySelector('.json-section')?.classList.add('no-json');
}

function hideErrorMessages() {
    const errorMessageIds = [
        'auth-error-message',
        'auth-container-error-message',
        'bc-error-message',
        'bc-container-error-message',
    ];

    for (const id of errorMessageIds) {
        document.getElementById(id).classList.add('hidden');
    }
}

function showErrorMessage(cookieStoreId, isAuthError) {
    hideErrorMessages();
    hideControls();

    const errorMessageId = isAuthError
        ? containersEnabled
            ? 'auth-container-error-message'
            : 'auth-error-message'
        : containersEnabled
            ? 'bc-container-error-message'
            : 'bc-error-message';

    if (containersEnabled) {
        [...document.querySelectorAll('.container-name-template')].forEach((el) => {
            el.textContent = containerNames[cookieStoreId] || 'Default (no container)';
        });
    }

    document.getElementById(errorMessageId).classList.remove('hidden');
}

async function getAuthConfig(cookieStoreId) {
    const mappedCookies = await getMappedCookies(cookieStoreId);

    /**
     * If authId isn't specified, user is not logged into OnlyFans... or at least we assume so.
     */
    if (!mappedCookies['auth_id'] || !mappedCookies['sess']) {
        showErrorMessage(cookieStoreId, true);
        return null;
    }

    // See `background/background.js` as to why we use `st` here
    const st = mappedCookies['st'];
    const bcToken = await getBcTokenSha(st);

    if (!bcToken) {
        showErrorMessage(cookieStoreId, false);
        return null;
    }

    return {
        USER_ID: mappedCookies['auth_id'],
        USER_AGENT: navigator.userAgent,
        X_BC: bcToken,
        COOKIE: Object.keys(mappedCookies)
            .filter((key) => desiredCookies.includes(key))
            .map((key) => `${key}=${mappedCookies[key]};`)
            .join(' '),
    };
}

async function displayAuthConfig(cookieStoreId) {
    const authConfig = await getAuthConfig(cookieStoreId);

    if (!authConfig) {
        return;
    }

    hideErrorMessages();
    showControls();

    const jsonElement = document.getElementById('json');
    const authJson = JSON.stringify(authConfig, null, 2);
    jsonElement.textContent = authJson;
    resizeJsonOutputToContent();

    const copyBtn = document.getElementById('copy-to-clipboard');
    const oldBtnText = copyBtn.innerText;
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(authJson);

            copyBtn.textContent = 'Copied to clipboard!';
            copyBtn.setAttribute('disabled', '1');
        }
        catch (err) {
            console.error(err);
        }

        setTimeout(() => {
            copyBtn.textContent = oldBtnText;
            copyBtn.removeAttribute('disabled');
        }, 2500);
    });

    const file = new Blob([authJson], {type: 'text/plain'});
    const downloadBtn = document.getElementById('download-file');
    downloadBtn.href = URL.createObjectURL(file);
    downloadBtn.download = 'auth.json';
}

/**
 * Detects whether the userScripts API exists and is enabled
 * @returns {Promise<boolean>}
 */
async function isUserScriptsAvailable() {
    if (!chrome.userScripts || typeof chrome.userScripts.getScripts !== 'function') {
        return false;
    }

    try {
        await chrome.userScripts.getScripts();
        return true;
    } catch {
        return false;
    }
}

async function requestUserScriptsPermission() {
    if (!browser.permissions?.request) {
        return false;
    }

    try {
        return await browser.permissions.request({ permissions: ['userScripts'] });
    } catch (err) {
        console.error('Failed to request userScripts permission', err);
        return false;
    }
}

async function ensureUserScriptRegistrationIfAvailable(userScriptsAvailable) {
    if (!userScriptsAvailable) {
        return;
    }

    try {
        await chrome.runtime.sendMessage({ type: 'ensureUserScriptRegistered' });
    } catch (err) {
        console.error('Failed to ensure userscript registration', err);
    }
}

function getChromeVersion() {
    return Number(navigator.userAgent.match(/(Chrome|Chromium)\/([0-9]+)/)?.[2] || 0);
}

async function openExtensionPermissionsPage() {
    const extensionId = chrome.runtime?.id;
    const detailsUrl = extensionId
        ? 'chrome://extensions/?id=' + extensionId
        : 'chrome://extensions';

    try {
        if (browser.tabs?.create) {
            await browser.tabs.create({ url: detailsUrl });
            return;
        }

        window.open(detailsUrl, '_blank');
    } catch (err) {
        console.error('Failed to open extension permissions page', err);
    }
}

function updateUserScriptsPermissionUi(userScriptsAvailable) {
    const messageEl = document.getElementById('user-scripts-permission-message');
    const buttonEl = document.getElementById('enable-user-scripts');
    const instructionsEl = document.getElementById('user-scripts-permission-instructions');

    if (userScriptsAvailable) {
        messageEl.classList.add('hidden');
        return;
    }

    if (isChromiumBased) {
        const chromeVersion = getChromeVersion();
        buttonEl.textContent = 'Open extension settings';
        instructionsEl.textContent = chromeVersion >= 138
            ? 'In extension settings, open "Details" and enable "Allow User Scripts". After granting, reload OnlyFans if needed.'
            : 'In chrome://extensions, enable Developer mode. After enabling Developer mode, reload OnlyFans if needed.';
    } else {
        buttonEl.textContent = 'Enable userscript permission';
        instructionsEl.textContent = 'Click the button to grant permission. After granting, reload OnlyFans if needed.';
    }

    messageEl.classList.remove('hidden');
}

async function handleEnableUserScriptsClick() {
    if (!isChromiumBased) {
        // Start the Firefox permission prompt and immediately close the popup
        // so the native dialog is not hidden behind it.
        void requestUserScriptsPermission();
        window.close();
        return;
    }

    const buttonEl = document.getElementById('enable-user-scripts');
    buttonEl.setAttribute('disabled', '1');

    try {
        await openExtensionPermissionsPage();
    } finally {
        const userScriptsAvailable = await isUserScriptsAvailable();
        await ensureUserScriptRegistrationIfAvailable(userScriptsAvailable);
        updateUserScriptsPermissionUi(userScriptsAvailable);
        buttonEl.removeAttribute('disabled');
    }
}

async function openConfigPage() {
    try {
        if (chrome.runtime?.openOptionsPage) {
            await chrome.runtime.openOptionsPage();
        } else {
            const optionsUrl = chrome.runtime.getURL('options/config.html');
            if (browser.tabs?.create) {
                await browser.tabs.create({ url: optionsUrl });
            } else {
                window.open(optionsUrl, '_blank');
            }
        }
    } catch (err) {
        console.error('Failed to open config page', err);
    } finally {
        window.close();
    }
}

async function updateReleaseNotice() {
    const messageEl = document.getElementById('update-available-message');
    const versionEl = document.getElementById('latest-release-version');
    const linkEl = document.getElementById('latest-release-link');

    try {
        const response = await chrome.runtime.sendMessage({ type: 'getUpdateStatus' });
        const updateStatus = response?.status;
        if (!response?.ok || !updateStatus?.updateAvailable) {
            messageEl.classList.add('hidden');
            return;
        }

        versionEl.textContent = updateStatus.latestReleaseVersion
            ? 'Latest release: v' + updateStatus.latestReleaseVersion
            : 'A new version is available.';
        linkEl.href = updateStatus.latestReleaseUrl || releasesPageUrl;
        messageEl.classList.remove('hidden');
    } catch (err) {
        console.error('Failed to load release status', err);
        messageEl.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const enableUserScriptsBtn = document.getElementById('enable-user-scripts');
    enableUserScriptsBtn.addEventListener('click', async () => {
        await handleEnableUserScriptsClick();
    });

    const openConfigBtn = document.getElementById('open-config-page');
    openConfigBtn.addEventListener('click', async () => {
        await openConfigPage();
    });

    const userScriptsAvailable = await isUserScriptsAvailable();
    await ensureUserScriptRegistrationIfAvailable(userScriptsAvailable);
    updateUserScriptsPermissionUi(userScriptsAvailable);

    await updateReleaseNotice();

    await displayAuthConfig();

    if (containersEnabled) {
        await getContainers();
    }
});
