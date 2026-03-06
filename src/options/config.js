const releasesPageUrl = 'https://github.com/whimsical-c4lic0/OF-DL-Auth-Helper/releases';

function formatDate(timestamp) {
    if (!timestamp) {
        return 'never';
    }

    return new Date(timestamp).toLocaleString();
}

function setManualStatus(text, variant = 'muted') {
    const statusElement = document.getElementById('manual-check-status');
    statusElement.textContent = text;
    statusElement.classList.remove('error', 'muted', 'info', 'success');
    statusElement.classList.add(variant);
}

function renderUpdateStatus(status) {
    const autoVersionCheckInput = document.getElementById('auto-version-check');
    const summaryElement = document.getElementById('version-check-summary');
    const latestReleaseContainer = document.getElementById('latest-release-container');
    const latestReleaseMessage = document.getElementById('latest-release-message');
    const latestReleaseLink = document.getElementById('latest-release-link');

    autoVersionCheckInput.checked = status.autoVersionCheckEnabled !== false;

    const currentVersionLabel = status.currentVersion || 'unknown';
    const latestVersionLabel = status.latestReleaseVersion ? 'v' + status.latestReleaseVersion : 'unknown';
    const checkedAt = formatDate(status.lastVersionCheckAt);

    if (status.lastVersionCheckError) {
        summaryElement.textContent = 'Last check failed: ' + status.lastVersionCheckError + ' (last attempted ' + checkedAt + ').';
    } else if (status.lastVersionCheckAt) {
        summaryElement.textContent = 'Current version: v' + currentVersionLabel + '. Latest known release: ' + latestVersionLabel + '. Last checked: ' + checkedAt + '.';
    } else {
        summaryElement.textContent = 'Current version: v' + currentVersionLabel + '. No update checks have run yet.';
    }

    if (status.updateAvailable) {
        latestReleaseMessage.textContent = 'New release available: ' + latestVersionLabel;
        latestReleaseLink.href = status.latestReleaseUrl || releasesPageUrl;
        latestReleaseContainer.classList.remove('hidden');
        return;
    }

    latestReleaseContainer.classList.add('hidden');
}

async function loadUpdateStatus() {
    const response = await chrome.runtime.sendMessage({ type: 'getUpdateStatus' });
    if (!response?.ok) {
        throw new Error(response?.error || 'Failed to load update status');
    }

    return response.status;
}

async function saveAutoVersionCheckEnabled(enabled) {
    const response = await chrome.runtime.sendMessage({
        type: 'setAutoVersionCheckEnabled',
        enabled,
    });
    if (!response?.ok) {
        throw new Error(response?.error || 'Failed to save update setting');
    }

    return response.status;
}

async function runManualVersionCheck() {
    const response = await chrome.runtime.sendMessage({ type: 'manualVersionCheck' });
    if (!response?.ok) {
        throw new Error(response?.error || 'Manual update check failed');
    }

    return response.status;
}

async function clearExtensionData() {
    const response = await chrome.runtime.sendMessage({ type: 'clearExtensionData' });
    if (!response?.ok) {
        throw new Error(response?.error || 'Failed to clear extension data');
    }

    return response.status;
}

document.addEventListener('DOMContentLoaded', async () => {
    const autoVersionCheckInput = document.getElementById('auto-version-check');
    const manualCheckButton = document.getElementById('manual-version-check');
    const clearDataButton = document.getElementById('clear-extension-data');

    autoVersionCheckInput.addEventListener('change', async (event) => {
        autoVersionCheckInput.setAttribute('disabled', '1');
        try {
            const status = await saveAutoVersionCheckEnabled(event.target.checked);
            renderUpdateStatus(status);
            setManualStatus('Settings saved.', 'success');
        } catch (err) {
            setManualStatus(String(err?.message || err), 'error');
            event.target.checked = !event.target.checked;
        } finally {
            autoVersionCheckInput.removeAttribute('disabled');
        }
    });

    manualCheckButton.addEventListener('click', async () => {
        manualCheckButton.setAttribute('disabled', '1');
        setManualStatus('Checking for updates...', 'info');

        try {
            const status = await runManualVersionCheck();
            renderUpdateStatus(status);

            if (status.updateAvailable) {
                setManualStatus('New release found.', 'success');
            } else if (status.lastVersionCheckError) {
                setManualStatus('Check completed with an error. See details above.', 'error');
            } else {
                setManualStatus('No new release found.', 'info');
            }
        } catch (err) {
            setManualStatus(String(err?.message || err), 'error');
        } finally {
            manualCheckButton.removeAttribute('disabled');
        }
    });

    clearDataButton.addEventListener('click', async () => {
        const userConfirmed = window.confirm(
            'This will clear all extension data (auth data and settings) and reset to fresh-install state. Continue?'
        );
        if (!userConfirmed) {
            return;
        }

        autoVersionCheckInput.setAttribute('disabled', '1');
        manualCheckButton.setAttribute('disabled', '1');
        clearDataButton.setAttribute('disabled', '1');
        setManualStatus('Clearing extension data...', 'info');

        try {
            const status = await clearExtensionData();
            renderUpdateStatus(status);
            setManualStatus('All extension data cleared.', 'success');
        } catch (err) {
            setManualStatus(String(err?.message || err), 'error');
        } finally {
            autoVersionCheckInput.removeAttribute('disabled');
            manualCheckButton.removeAttribute('disabled');
            clearDataButton.removeAttribute('disabled');
        }
    });

    try {
        const status = await loadUpdateStatus();
        renderUpdateStatus(status);
    } catch (err) {
        setManualStatus(String(err?.message || err), 'error');
    }
});
