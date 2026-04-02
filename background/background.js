let windowId = null;

chrome.action.onClicked.addListener(() => {
  if (windowId !== null) {
    chrome.windows.update(windowId, { focused: true });
    return;
  }
  chrome.windows.create({
    url: chrome.runtime.getURL("popup/popup.html"),
    type: "popup",
    width: 540,
    height: 600,
    focused: true
  }, (win) => {
    windowId = win.id;
  });
});

chrome.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === windowId) {
    windowId = null;
  }
});