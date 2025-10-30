// Background service worker for Chrome extension
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: 850,
    height: 700,
    focused: true
  });
});
