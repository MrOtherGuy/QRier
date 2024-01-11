// Install listener
browser.runtime.onInstalled.addListener(async () => {
  let options = await setDefaultOptions();
  await setBrowserAction(options);
  await setDefaultMenus(options);
});

async function onStartup(){
  let options = await Options.fromStorageWithDefaults();
  await setBrowserAction(options);
  await setDefaultMenus(options);
}

browser.runtime.onStartup.addListener(() => {
  // Ideally we would run this here, but see bug 1771328
  // We'll run it at the end of this script body instead
  // onStartup();
});

browser.omnibox?.onInputEntered.addListener((input) => {
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

browser.menus?.onClicked.addListener((menus,tab) => {
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
});
// Set listener for browserAction button
browser.action.onClicked.addListener((tab) => {
  // Note: onClicked is not called if action has an associated popup, thus this can always just call in-content handler
  openBrowserActionInContent(tab)
});

// Optional permission management
browser.permissions.onRemoved.addListener(permissions => {
  if(permissions.permissions.includes("scripting")){
    console.log("scripting permission was removed");
    browser.storage.local.set({
      inContent: false,
      scriptingRevoked: true
    });
    browser.action.setPopup({ popup: "../popup/QRier.html" })
  }
});

class Options{
  constructor(settings,permission){
    this.settings = settings;
    this.hasScripting = permission;
  }
  static async fromStorageWithDefaults(){
    const [options,hasScripting] = await Promise.all([
      browser.storage.local.get({
        'ecc' : 3,
        'scale': 6,
        'showLink': false,
        'showUrl': false,
        'showSelection': false,
        'inContent': false,
        'scriptingRevoked': null
      }),
      browser.permissions.contains({
        permissions: ["scripting"]
      })
    ]);
    if(hasScripting){
      options.scriptingRevoked = false
    }
    return new Options(options,hasScripting)
  }
}

async function setDefaultOptions() {

  const options = await Options.fromStorageWithDefaults();
  
  // Old versions stored either "popup" or "content", this updates that
  if(options.settings.inContent !== true){
    options.settings.inContent = false
  }
  
  if(!options.hasScripting){
    options.settings.inContent = false
  }
  
  await browser.storage.local.set(options.settings);
  if(!options.settings.inContent){
    browser.action.setPopup({ popup: "../popup/QRier.html" })
  }
  return options
}


function setDefaultMenus( options ){
  if(!browser.menus){
    return
  }

  const settings = options.settings;
  
  // Create a context menu entry for browserAction to open editor
  browser.menus.create({
    id: "openEditor",
    title: "QRier Editor",
    contexts: ["action"]
  });
  // create other menus if needed
  const suffix = "In-" + (settings.inContent ? "content" : "popup");
  if(settings.showLink){
    browser.menus.create({
      id: "openMenuLink"+suffix,
      title: "QRier link",
      contexts: ["link"]
    });
  }
  if(settings.showSelection){
    browser.menus.create({
      id: "openMenuSelection"+suffix,
      title: "QRier selection",
      contexts: ["selection"]
    });
  }
  if(settings.showUrl){
    browser.menus.create({
      id: "openMenuUrl"+suffix,
      title: "QRier url",
      contexts: ["page"]
    });
  }
}

function setBrowserAction(options){
  // This effectively disables browserAction listener when needed.
  if(!(options.settings.inContent === true)){
    browser.action.setPopup({ popup: "../popup/QRier.html" })
  }
  return options
}

function injectScripts(id){
  return browser.scripting.executeScript({
    files: ["incontent/inContentScript.js"],
    target: {tabId: id}
  })
}

// This seems overly complicated, but we need the panel script to be able to distinguish if it was opened via script or by clicking the panel
// Note: panel page checks autoCleanUrls setting itself
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

// Note: panel page checks autoCleanUrls setting itself
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
  if(request.openTab){
    browser.tabs.create(request.openTab)
    return 
  }
}

// Extends encodeURIComponent() to include !'()*
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

onStartup();