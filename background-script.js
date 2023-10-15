// Install listener
browser.runtime.onInstalled.addListener(function() {
  setDefaultOptions()
  .then(setDefaultMenus)
  .catch(e => { console.error(e) })
});

// run once on startup
browser.runtime.onStartup.addListener(async () => {
  let options = await browser.storage.local.get(['showLink','showUrl','showSelection','inContent']);
  await setDefaultMenus({ ok: true, values: options })
})

browser.omnibox.onInputEntered.addListener((input) => {
  
  // Use tab url when no input
  // ActiveTab permission doesn't work on omnibox trigger currently
  // If no input is given we should default to current url
  let freePageURI = browser.runtime.getURL("pages/QRierFreepage.html");
  
  browser.storage.local.get('ecc')
  .then((options) => {
    let ecc = [null,"L","M","Q","H"][options.ecc];
    browser.tabs.update({
      url: `${freePageURI}?data=${fixedEncodeURIComponent(input)}&mask=9&ecc=${ecc}`
    });
  });
});

browser.runtime.onMessage.addListener(handleMessage);

browser.menus.onClicked.addListener((menus,tab) => {
  if(menus.menuItemId === "openEditor"){
    browser.tabs.create({
      "url": browser.runtime.getURL("pages/QRierFreepage.html")
    });
  }else{
    const type = menus.menuItemId.match(/In-(popup|content)/)?.[1]
    switch (type){
      case "content":
        openMenuActionInContent(menus,tab);
        break;
      case "popup":
        openMenuActionInPanel(menus)
        .then(()=>browser.action.setPopup({ popup: "../popup/QRier.html" }))
        break;
      default:
        console.warn("unimplemented menu action: "+type)
    }
  }
})
// Set listener for browserAction button
browser.action.onClicked.addListener((tab) => {
  openBrowserActionInContent(tab)
});
// This effectively disables browserAction listener when needed.
// We could check  inContent == "popup", but there might be a 
// chance that key isn't set to anything on new install, and
// "popup" is the default setting
browser.storage.local.get("inContent")
.then(some => {
  if(some.inContent != "content"){
    browser.action.setPopup({ popup: "../popup/QRier.html" })
  }
});

async function setDefaultOptions() {
  let res = await browser.storage.local.get(['ecc','scale','showLink','showUrl','showSelection','inContent','autoCleanUrls']);
  let ecc = res.ecc || 3;
  let scale = res.scale || 6;
  let showLink = res.showLink || false;
  let showUrl = res.showUrl || false;
  let showSelection = res.showSelection || false;
  let showInContent = res.inContent || "popup";
  let autoCleanUrls = res.autoCleanUrls || false;
  let values = {
    ecc: ecc,
    scale: scale,
    showLink: showLink,
    showUrl: showUrl,
    showSelection: showSelection,
    inContent: showInContent,
    autoCleanUrls: autoCleanUrls
  };
  await browser.storage.local.set(values);
  if(showInContent === "popup"){
    browser.action.setPopup({ popup: "../popup/QRier.html" })
  }
  return { ok: true, values: values }
}

function setDefaultMenus( settings ){
	
	if(!browser.menus){
		return
	}
  if(!settings.ok){
    console.error("default settings failed somehow");
    console.log(settings);
  }
  const menus = settings.values;
  
	// Create a context menu entry for browserAction to open editor
	browser.menus.create({
		id: "openEditor",
		title: "QRier Editor",
		contexts: ["action"]
	});
  const suffix = "In-" + menus.inContent;
	if(menus.showLink){
		browser.menus.create({
			id: "openMenuLink"+suffix,
			title: "QRier link",
			contexts: ["link"]
		});
	}
	if(menus.showSelection){
		browser.menus.create({
			id: "openMenuSelection"+suffix,
			title: "QRier selection",
			contexts: ["selection"]
		});
	}
	if(menus.showUrl){
		browser.menus.create({
			id: "openMenuUrl"+suffix,
			title: "QRier url",
			contexts: ["page"]
		});
	}
}

function injectScripts(id){
  return browser.scripting.executeScript({
    files: ["incontent/inContentScript.js"],
    target: {tabId: id}
  })
}

// This seems overly complicated, but we need the panel script to be able to distinguish if it was opened via script or by clicking the panel
function openBrowserActionInPanel(tab){
  browser.action.setPopup({popup:"../popup/QRier.html?"+tab.url});
  return browser.action.openPopup()
}

async function openBrowserActionInContent(tab){
  if(!/^http/.test(tab.url)){
    openBrowserActionInPanel(tab)
    .then(()=>browser.action.setPopup({popup:null}));
    return
  }
  currentAction.value = tab.url;
  injectScripts(tab.id)
  .catch(console.error)
}

async function maybeTrimUrl(action){
  let opt = await browser.storage.local.get("autoCleanUrls");
  return opt.autoCleanUrls
    ? {action: action.value.slice(0,action.value.indexOf("?"))}
    : {action: action.value}
}

const currentAction = {
  value: null,
  get: () => {
    return currentAction.value.startsWith("http")
      ? maybeTrimUrl(currentAction)
      : Promise.resolve({action:currentAction.value})
  }
}

function openMenuActionInPanel(menus){
  let payloadText = "../popup/QRier.html?"+getStringFromTriggerAction(menus);
  browser.action.setPopup({popup:payloadText});
  return browser.action.openPopup()
}

function openMenuActionInContent(menus, tab){
  if(!/^http/.test(tab.url)){
    openMenuActionInPanel(menus)
    .then(()=>browser.action.setPopup({popup:null}));
    return
  }
  currentAction.value = getStringFromTriggerAction(menus);
  injectScripts(tab.id)

  .catch(console.error);
}

function getStringFromTriggerAction(menus){
  switch(menus.menuItemId){
    case "openMenuLinkIn-content":
    case "openMenuLinkIn-popup":
      return menus.linkUrl; 
    case "openMenuSelectionIn-content":
    case "openMenuSelectionIn-popup":
      return menus.selectionText;
    case "openMenuUrlIn-content":
    case "openMenuUrlIn-popup":
      return menus.pageUrl;
  }
  return ""
}

function handleMessage(request, sender, sendResponse) {
  if(sender.id != browser.runtime.id){
    return Promise.resolve({response: null})
  }
  if(request.closeFrame){
    browser.tabs.sendMessage(sender.tab.id,request);
    return Promise.resolve({response:"success"});
  }
  if(request.requestInfo){
    return currentAction.get()
  }
}

// Extends encodeURIComponent() to include !'()*
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
