// Install listener
browser.runtime.onInstalled.addListener(function() {
  setDefaultOptions()
  //.then(setDefaultMenus)
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
  openBrowserActionInContent(tab)
});

// Optional permission management
browser.permissions.onRemoved.addListener(permissions => {
  if(permissions.permissions.includes("scripting")){
    console.log("scripting permission was removed");
    browser.storage.local.set({ inContent: false });
    browser.action.setPopup({ popup: "../popup/QRier.html" })
  }
});

class Options{
  constructor(settings,permission){
    this.settings = settings;
    this.hasScripting = permission;
  }
  static fromStorageWithDefaults(){
    return new Promise(res => {
      let settings = browser.storage.local.get({
        'mask': 9,
        'ecc' : 3,
        'scale': 6,
        'showLink': false,
        'showUrl': false,
        'showSelection': false,
        'inContent': false
      });
      let permissions = browser.permissions.contains({
        permissions: ["scripting"]
      });
      Promise.all([settings,permissions])
      .then(values => {
        res(new Options(values[0],values[1]));
      });
    });
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
  if(options.settings.showInContent === "popup"){
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

// run once in body
// bug 1771328
Options.fromStorageWithDefaults()
.then(setBrowserAction)
.then(setDefaultMenus)
// And also wake up event page once on startup
browser.runtime.onStartup.addListener(()=>{
  console.log("starting...");
});  


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

  if(!request.menuChange){
    return Promise.reject({response: null})
  }
  const { newMenus, oldMenus } = request.menuChange;
  if(newMenus.inContent){
    browser.action.setPopup({popup: null})
  }else{
    browser.action.setPopup({ popup: "../popup/QRier.html" })
  }
  updateMenus(newMenus,oldMenus);
  return Promise.resolve({response:"success"})

}

// Extends encodeURIComponent() to include !'()*
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

function updateMenus(newMenus,oldMenus){
  const addSuffix = newMenus.inContent ? "In-content" : "In-popup";
  const removeSuffix = newMenus.inContent ? "In-popup" : "In-content";
  
  const inContentStateChanged = newMenus.inContent != oldMenus.inContent;
  
  if(inContentStateChanged){
    browser.menus.remove("openMenuLink"+removeSuffix);
    browser.menus.remove("openMenuUrl"+removeSuffix);
    browser.menus.remove("openMenuSelection"+removeSuffix);
  }
  
  if(inContentStateChanged || (oldMenus.onLink != newMenus.onLink)){
    if(!newMenus.onLink){
      browser.menus.remove("openMenuLink"+removeSuffix)
    }else{
      browser.menus.create({
        id: "openMenuLink"+addSuffix,
        title: "QRier link",
        contexts: ["link"]
     });
    }
  }
  
  if(inContentStateChanged || (oldMenus.onUrl != newMenus.onUrl)){

    if(!newMenus.onUrl){
      browser.menus.remove("openMenuUrl"+removeSuffix)
    }else{
      browser.menus.create({
        id: "openMenuUrl"+addSuffix,
        title: "QRier url",
        contexts: ["page"]
      });
    }
  }
  if(inContentStateChanged || (oldMenus.onSelection != newMenus.onSelection)){

    if(!newMenus.onSelection){
      browser.menus.remove("openMenuSelection"+removeSuffix)
    }else{
      browser.menus.create({
        id: "openMenuSelection"+addSuffix,
        title: "QRier selection",
        contexts: ["selection"]
      });
    }
  }
}