const containerNames = {};
const containersEnabled = browser.contextualIdentities !== undefined;

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

function showControls() {
    document.getElementById('copy-to-clipboard').classList.remove('hidden');
    document.getElementById('download-file').classList.remove('hidden');
    document.getElementById('json').classList.remove('hidden');
}

function hideControls() {
    document.getElementById('copy-to-clipboard').classList.add('hidden');
    document.getElementById('download-file').classList.add('hidden');
    document.getElementById('json').classList.add('hidden');
}

function showErrorMessage(cookieStoreId, errorMessage, containerTemplateErrorMessage) {
    hideControls();

    const errorElement = document.getElementById('errorMessage');

    let msg = errorMessage;

    if (containersEnabled) {
        const containerName = containerNames[cookieStoreId] || 'Default (no container)';
        msg = containerTemplateErrorMessage.replaceAll('CONTAINER_NAME', containerName);
    }

    errorElement.innerHTML = msg;
    errorElement.classList.remove('hidden');
}

async function getAuthConfig(cookieStoreId) {
    const mappedCookies = await getMappedCookies(cookieStoreId);

    /**
     * If authId isn't specified, user is not logged into OnlyFans... or at least we assume so.
     */
    if (!mappedCookies['auth_id'] || !mappedCookies['sess']) {
        showErrorMessage(
            cookieStoreId,
            'Could not find valid cookie values, make sure you are logged into OnlyFans.',
            'Could not find valid cookie values in container: <strong>CONTAINER_NAME</strong><br>Make sure you are logged into OnlyFans.'
        );
        return null;
    }

    // See `background/background.js` as to why we use `st` here
    const st = mappedCookies['st'];
    const bcToken = await getBcTokenSha(st);

    if (!bcToken) {
        showErrorMessage(
            cookieStoreId,
            'Could not find valid x_bc value. Please open OnlyFans.com once and make sure it fully loads. If you are not logged in, please log in and <i>refresh the page</i>.',
            'Could not find valid x_bc value. Please open OnlyFans.com once in container: <strong>CONTAINER_NAME</strong><br>Make sure it fully loads. If you are not logged in, please log in and <i>refresh the page</i>.'
        );
        return null;
    }

    return {
        USER_ID: mappedCookies['auth_id'],
        USER_AGENT: navigator.userAgent,
        X_BC: bcToken,
        COOKIE: Object.keys(mappedCookies).map((key) => `${key}=${mappedCookies[key]};`).join(' '),
    };
}

async function displayAuthConfig(cookieStoreId) {
    const authConfig = await getAuthConfig(cookieStoreId);

    if (!authConfig) {
        return;
    }

    showControls();
    document.getElementById('errorMessage').classList.add('hidden');

    const jsonElement = document.getElementById('json');
    const authJson = JSON.stringify(authConfig, null, 2);
    jsonElement.textContent = authJson;

    const copyBtn = document.getElementById('copy-to-clipboard');
    const oldBtnText = copyBtn.innerHTML;
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

document.addEventListener('DOMContentLoaded', async () => {
    await displayAuthConfig();

    if (containersEnabled) {
        await getContainers();
    }
});
