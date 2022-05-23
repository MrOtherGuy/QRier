// Install listener
browser.runtime.onInstalled.addListener(function() {
  setDefaultOptions()
  .then(setDefaultMenus)
  .catch(e => { console.error(e) })
});

browser.omnibox.onInputEntered.addListener((input) => {
  
  // Use tab url when no input
  // ActiveTab permission doesn't work on omnibox trigger currently
  // If no input is given we should default to current url
  let freePageURI = browser.runtime.getURL("pages/QRierFreepage.html");
  
  browser.storage.local.get(['mask','ecc'])
  .then((options) => {
    let mask = options.mask;
    let ecc = [null,"L","M","Q","H"][options.ecc];
    browser.tabs.update({
      url: `${freePageURI}?data=${fixedEncodeURIComponent(input)}&mask=${mask}&ecc=${ecc}`
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
        openMenuActionInPanel(menus);
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
  let res = await browser.storage.local.get(['mask','ecc','scale','showLink','showUrl','showSelection','inContent']);
  let mask = res.mask || 9;
  let ecc = res.ecc || 3;
  let scale = res.scale || 6;
  let showLink = res.showLink || false;
  let showUrl = res.showUrl || false;
  let showSelection = res.showSelection || false;
  let showInContent = res.inContent || "popup";
  let values = {
    mask: mask,
    ecc: ecc,
    scale: scale,
    showLink: showLink,
    showUrl: showUrl,
    showSelection: showSelection,
    inContent: showInContent
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

function openBrowserActionInPanel(tab){
  browser.action.setPopup({popup:"../popup/QRier.html?"+tab.url});
  return browser.action.openPopup()
}

function openBrowserActionInContent(tab){
  if(!/^http/.test(tab.url)){
    openBrowserActionInPanel(tab)
    .then(()=>browser.action.setPopup({popup:null}));
    return
  }
  browser.scripting.executeScript({
    files: ["inContentScript.js"],
    target: {tabId: tab.id}
  })
  .then((e) => {
    setTimeout(()=>{
      browser.tabs.sendMessage(
        tab.id,
        { menudata: tab.url }
      )
    },60) // time for connection to be made to content script
  })
  .catch(console.error)
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
  browser.scripting.executeScript({
    files: ["inContentScript.js"],
    target: {tabId: tab.id}
  })
  .then((e) => {
    setTimeout(()=>{
      browser.tabs.sendMessage(
        tab.id,
        { menudata: getStringFromTriggerAction(menus) }
      )
    },60) // time for connection to be made to content script
  })
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
  if(request?.outputMode.inContent === "content"){
    browser.action.setPopup({popup: null})
    return Promise.resolve({response:"success"});
  }
  if(request?.outputMode.inContent === "popup"){
    browser.action.setPopup({ popup: "../popup/QRier.html" })
    return Promise.resolve({response:"success"})
  }

}

// Extends encodeURIComponent() to include !'()*
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
