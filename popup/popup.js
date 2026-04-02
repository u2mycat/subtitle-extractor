const selectorInput = document.getElementById('selectorInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const copyArrayBtn = document.getElementById('copyArrayBtn');
const logArea = document.getElementById('logArea');
const statusMsg = document.getElementById('statusMsg');
const pickerBtn = document.getElementById('pickerBtn');

let collectedSubtitles = [];

function appendSubtitle(text) {
  const div = document.createElement('div');
  div.textContent = text;
  logArea.appendChild(div);
  logArea.scrollTop = logArea.scrollHeight;
}

function clearDisplay() {
  logArea.innerHTML = '';
  collectedSubtitles = [];
  statusMsg.innerText = '已清除记录';
}

function exportAsJSON() {
  if (collectedSubtitles.length === 0) {
    statusMsg.innerText = '没有字幕可导出';
    return;
  }
  const dataStr = JSON.stringify(collectedSubtitles, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subtitles_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  statusMsg.innerText = '已导出 JSON 文件';
}

async function copyArrayToClipboard() {
  if (collectedSubtitles.length === 0) {
    statusMsg.innerText = '没有字幕可复制';
    return;
  }
  const jsonStr = JSON.stringify(collectedSubtitles, null, 2);
  try {
    await navigator.clipboard.writeText(jsonStr);
    statusMsg.innerText = '已复制数组 (JSON) 到剪贴板';
  } catch (err) {
    statusMsg.innerText = '复制失败，请手动复制';
    console.error(err);
  }
}

// 向 content script 发送消息（使用最后聚焦的窗口）
async function sendToContentScript(message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}, (tabs) => {
      const tab = tabs.find(t => t.url && t.url.includes('bilibili.com'));
      if (!tab) {
        reject('未找到 B 站标签页，请切换到 B 站视频页面');
        return;
      }
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(response);
        }
      });
    });
  });
}

// 检查 content script 是否存活
async function checkContentScript() {
  try {
    const response = await sendToContentScript({ action: 'ping' });
    return response === 'pong';
  } catch (err) {
    return false;
  }
}

// 开始提取
async function startExtraction() {
  const selector = selectorInput.value.trim();
  if (!selector) {
    statusMsg.innerText = '请填写选择器';
    return;
  }
  const connected = await checkContentScript();
  if (!connected) {
    statusMsg.innerText = '❌ 无法连接到页面脚本，请刷新 B 站视频页面后重试';
    return;
  }
  await stopExtraction(); // 停止旧循环
  clearDisplay();

  try {
    const response = await sendToContentScript({
      action: 'start',
      selector: selector,
      intervalMs: 500
    });
    if (response && response.success) {
      statusMsg.innerText = `✅ 正在提取 (选择器: ${selector})`;
    } else {
      statusMsg.innerText = `启动失败: ${response?.error || '未知错误'}`;
    }
  } catch (err) {
    statusMsg.innerText = `错误: ${err}`;
    console.error(err);
  }
}

async function stopExtraction() {
  try {
    await sendToContentScript({ action: 'stop' });
    statusMsg.innerText = '⏹️ 已停止提取';
  } catch (err) {
    statusMsg.innerText = '已停止提取 (页面可能已刷新)';
  }
}

// 监听来自 content script 的字幕
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'newSubtitle') {
    const text = message.text;
    if (text) {
      collectedSubtitles.push(text);
      appendSubtitle(text);
      statusMsg.innerText = `📝 已提取 ${collectedSubtitles.length} 条字幕`;
    }
    sendResponse({ received: true });
  }
  if (message.type === 'pickerResult') {
    if (message.selector) {
      selectorInput.value = message.selector;
      saveSelector(message.selector);
      statusMsg.innerText = `✅ 已选择: ${message.selector}`;
    }
    sendResponse({ received: true });
  }
  return true;
});

// 保存选择器
function saveSelector(selector) {
  chrome.storage.local.set({ savedSelector: selector });
}
function loadSavedSelector() {
  chrome.storage.local.get(['savedSelector', 'pendingSelector'], (result) => {
    if (result.pendingSelector) {
      selectorInput.value = result.pendingSelector;
      saveSelector(result.pendingSelector);
      chrome.storage.local.remove('pendingSelector');
      statusMsg.innerText = '✅ 已加载选择的元素';
    } else if (result.savedSelector) {
      selectorInput.value = result.savedSelector;
    }
  });
}

selectorInput.addEventListener('change', () => {
  saveSelector(selectorInput.value.trim());
});

startBtn.addEventListener('click', startExtraction);
stopBtn.addEventListener('click', stopExtraction);
clearBtn.addEventListener('click', clearDisplay);
exportJsonBtn.addEventListener('click', exportAsJSON);
copyArrayBtn.addEventListener('click', copyArrayToClipboard);

loadSavedSelector();

async function startElementPicker() {
  const connected = await checkContentScript();
  if (!connected) {
    statusMsg.innerText = '❌ 无法连接到页面脚本，请刷新 B 站视频页面后重试';
    return;
  }
  try {
    const response = await sendToContentScript({ action: 'startPicker' });
    if (response && response.success) {
      statusMsg.innerText = '🎯 即将进入选择模式，窗口将关闭后请点击页面元素';
      setTimeout(() => window.close(), 800);
    }
  } catch (err) {
    statusMsg.innerText = `错误: ${err}`;
    console.error(err);
  }
}

pickerBtn.addEventListener('click', startElementPicker);

// 页面加载时检测连接状态
window.addEventListener('load', async () => {
  const connected = await checkContentScript();
  if (!connected) {
    statusMsg.innerText = '⚠️ 未检测到 B 站页面，请确保当前活动标签页是 B 站视频页面并刷新';
  } else {
    statusMsg.innerText = '✅ 就绪，可开始提取';
  }
});