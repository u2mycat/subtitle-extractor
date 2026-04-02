let intervalId = null;
let lastText = '';
let currentSelector = '';
let checkIntervalMs = 500;
let isPickerMode = false;
let pickerOverlay = null;
let pickerHighlight = null;
let currentHoveredElement = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse('pong');
    return true;
  }
  if (message.action === 'start') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    currentSelector = message.selector;
    checkIntervalMs = message.intervalMs || 500;
    lastText = '';
    intervalId = setInterval(checkSubtitle, checkIntervalMs);
    sendResponse({ success: true });
  }
  else if (message.action === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    sendResponse({ success: true });
  }
  else if (message.action === 'startPicker') {
    startPickerMode();
    sendResponse({ success: true });
  }
  return true;
});

function startPickerMode() {
  if (isPickerMode) return;
  isPickerMode = true;

  pickerOverlay = document.createElement('div');
  pickerOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;cursor:crosshair;background:rgba(0,0,0,0.01);';
  document.body.appendChild(pickerOverlay);

  pickerHighlight = document.createElement('div');
  pickerHighlight.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #1890ff;background:rgba(24,144,255,0.1);transition:all 0.1s ease;';
  document.body.appendChild(pickerHighlight);

  const tooltip = document.createElement('div');
  tooltip.id = 'picker-tooltip';
  tooltip.style.cssText = 'position:fixed;z-index:2147483647;background:#fff;color:#333;padding:4px 8px;border-radius:4px;font-size:12px;font-family:monospace;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  document.body.appendChild(tooltip);

  pickerOverlay.addEventListener('mousemove', handlePickerMouseMove);
  pickerOverlay.addEventListener('click', handlePickerClick);
  pickerOverlay.addEventListener('keydown', handlePickerKeyDown);
  document.addEventListener('keydown', handleGlobalKeyDown, true);
}

function handleGlobalKeyDown(e) {
  if (e.key === 'Escape') {
    exitPickerMode();
  }
}

function handlePickerKeyDown(e) {
  if (e.key === 'Escape') {
    exitPickerMode();
  }
}

function handlePickerMouseMove(e) {
  e.stopPropagation();
  const elements = document.elementsFromPoint(e.clientX, e.clientY);
  const target = elements.find(el => el !== pickerOverlay && el !== pickerHighlight && !el.id?.startsWith('picker'));
  if (!target) return;

  currentHoveredElement = target;

  const rect = target.getBoundingClientRect();
  pickerHighlight.style.top = rect.top + 'px';
  pickerHighlight.style.left = rect.left + 'px';
  pickerHighlight.style.width = rect.width + 'px';
  pickerHighlight.style.height = rect.height + 'px';

  const tooltip = document.getElementById('picker-tooltip');
  if (tooltip) {
    const selector = getSelector(target);
    tooltip.textContent = selector;
    tooltip.style.top = (rect.bottom + 5) + 'px';
    tooltip.style.left = rect.left + 'px';
  }
}

function handlePickerClick(e) {
  e.stopPropagation();
  if (!currentHoveredElement) return;

  const selector = getSelector(currentHoveredElement);
  exitPickerMode();

  chrome.storage.local.set({ pendingSelector: selector });

  showPickerNotification(selector);

  chrome.runtime.sendMessage({
    type: 'pickerResult',
    selector: selector
  });
}

function showPickerNotification(selector) {
  const notification = document.createElement('div');
  notification.id = 'picker-notification';
  notification.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#52c41a;color:#fff;padding:12px 20px;border-radius:6px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;gap:12px;';
  notification.innerHTML = `<span>✅ 已选择:</span><code style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:3px;font-family:monospace;font-size:13px;">${selector}</code><span style="font-size:12px;opacity:0.8;">(已保存，重新打开 Popup 即可使用)</span>`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function getSelector(element) {
  if (element.id) {
    return '#' + element.id;
  }

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c);
    if (classes.length > 0) {
      const selector = '.' + classes.join('.');
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  const parts = [];
  let current = element;
  while (current && current !== document.body && parts.length < 5) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = '#' + current.id;
      parts.unshift(selector);
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        selector += '.' + classes[0];
      }
    }
    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

function exitPickerMode() {
  isPickerMode = false;
  if (pickerOverlay) {
    pickerOverlay.remove();
    pickerOverlay = null;
  }
  if (pickerHighlight) {
    pickerHighlight.remove();
    pickerHighlight = null;
  }
  const tooltip = document.getElementById('picker-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
  currentHoveredElement = null;
  document.removeEventListener('keydown', handleGlobalKeyDown, true);
}

function checkSubtitle() {
  if (!currentSelector) return;
  const elements = document.querySelectorAll(currentSelector);
  if (elements.length === 0) return;
  const elem = elements[0];
  const currentText = elem.innerText.trim();
  if (currentText === '') return;
  if (currentText !== lastText) {
    lastText = currentText;
    chrome.runtime.sendMessage({
      type: 'newSubtitle',
      text: currentText
    });
  }
}