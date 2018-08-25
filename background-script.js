browser.runtime.onInstalled.addListener(setDefault);
browser.runtime.onMessage.addListener(handleMessage);
function setDefault() {

  var gettingItem = browser.storage.local.get(['mask','ecc','scale','showLink','showUrl','showSelection','inContent']);
  gettingItem.then((res) => {
    var mask = res.mask || 9;
		var ecc = res.ecc || 3;
		var scale = res.scale || 6;
		var showLink = res.showLink || false;
		var showUrl = res.showUrl || false;
		var showSelection = res.showSelection || false;
		var showInContent = res.inContent || "popup";
		console.log("Options set to: "+Object.entries(res));
		browser.storage.local.set({
    mask: mask,
		ecc: ecc,
		scale: scale,
		showLink: showLink,
		showUrl: showUrl,
		showSelection: showSelection,
		inContent: showInContent
		});
  });
}


function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("Item created successfully");
  }
}

/*
Called when the item has been removed.
We'll just log success here.
*/
function onRemoved() {
  console.log("Item removed successfully");
}

/*
Called when there was an error.
We'll just log the error here.
*/
function onError(error) {
  console.log(`Error: ${error}`);
}

function setMenus(menus){
	
	if(!browser.menus){
		return
	}
	
	// Create a context menu entry for browserAction to open editor
	browser.menus.create({
		id: "openEditor",
		title: "QRier Editor",
		contexts: ["browser_action"]
	}, onCreated);
	
	if(menus.showLink){
		browser.menus.create({
			id: "openMenuLink",
			title: "QRier link",
			contexts: ["link"]
		}, onCreated);
	}
	if(menus.showSelection){
		browser.menus.create({
			id: "openMenuSelection",
			title: "QRier selection",
			contexts: ["selection"]
		}, onCreated);
	}
	if(menus.showUrl){
		browser.menus.create({
			id: "openMenuUrl",
			title: "QRier url",
			contexts: ["page"]
		}, onCreated);
	}
	browser.menus.onClicked.addListener((menus, tab) => {
		if (menus.menuItemId === "openEditor"){
			browser.tabs.create({url:freePageURI});
		}else{
			var uri = "";
			if(info.outputType === "popup"){
				uri += popupBaseURI + "?";
			}
			switch(menus.menuItemId){
				case "openMenuLink":
					uri += menus.linkUrl; 
					break;
				case "openMenuSelection":
					uri += menus.selectionText;
					break;
				case "openMenuUrl":
					uri += menus.pageUrl;
					break
			}
			switch(info.outputType){
				case "popup":
					browser.browserAction.setPopup({popup:uri});
					browser.browserAction.openPopup();
					break;
				case "content":
					handleInContent(uri);
					break;
				default:
					console.log("unexpected output type: " + info.outputType);
			}
		}
	});
}

function handleMessage(request, sender, sendResponse) {
  console.log("Should set type to: " +
    request.value.inContent);
	setOutput(request.value);
  sendResponse({response: "success: " + info.outputType});
}


function setOutput(output){
	info.outputType = output.inContent;
	// Can't set popup to "" on Android
	// This will disable in-content functionality on Android
	if (info.outputType === "content" && info.os != "android"){
		browser.browserAction.setPopup({popup:""});
		if(!QRierObject){
			QRierObject = new QRier_Gen();
		}
	}else{
		// popup:null should set the default popup but that doesn't work on Android
		browser.browserAction.setPopup({popup:popupBaseURI});
		QRierObject = null;
	}
}
	
function setOS(os){
	info.os = os.os;
}
// Extends encodeURIComponent() to include !'()*
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
	
	function setup(){
		var gettingOutput = browser.storage.local.get(['inContent']);
		var gettingMenus = browser.storage.local.get(['showLink','showUrl','showSelection']);
		var gettingOS = browser.runtime.getPlatformInfo();
		
		Promise.all([gettingOutput,gettingMenus,gettingOS]).then(setup => {
			setOS(setup[2]);
			setOutput(setup[0]);
			setMenus(setup[1]);

		});
	}
	
	var info = { os: null, outputType: "popup" }
	var QRierObject = null;
	const freePageURI = browser.runtime.getURL("pages/QRierFreepage.html");
	const popupBaseURI = "../popup/QRier.html";
	setup();
	
	// Setup omnibox if supported
	if(browser.omnibox){
		browser.omnibox.onInputEntered.addListener((input) => {
		
		// Use tab url when no input
		// ActiveTab permission doesn't work on omnibox trigger currently
		// If no input is given we should default to current url
		if(false){
			browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
				browser.tabs.update({url:freePageURI + "?" + tabs[0].url});
			});
		}else{
			browser.storage.local.get(['mask','ecc']).then((options) => {
				var mask = options.mask;
				var ecc = [null,"L","M","Q","H"][options.ecc];
				browser.tabs.update({url:freePageURI + "?data=" + fixedEncodeURIComponent(input) + "&mask=" + mask + "&ecc=" + ecc});
			});
		}
	});
	}else{
		console.log("no omnibox support");
	}
	// This will not fire if there is a popup specified

	browser.browserAction.onClicked.addListener((tab) => {
			handleInContent(tab.url)
		});
