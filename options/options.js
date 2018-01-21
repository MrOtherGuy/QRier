function saveOptions(e) {
	var newMenus = {"onLink":document.querySelector("#onLink").checked,"onUrl":document.querySelector("#onUrl").checked,"onSelection":document.querySelector("#onSelect").checked};
	var newOutput = document.getElementById("outputType").elements["output"].value;
  browser.storage.local.set({
    mask: document.querySelector("#maskSelect").value,
		ecc: document.querySelector("#eccSelect").value,
		scale: document.querySelector("#scaleSelect").value,
		showLink: newMenus.onLink,
		showUrl: newMenus.onUrl,
		showSelection: newMenus.onSelection,
		inContent: newOutput
  });
  e.preventDefault();
	updateMenus(newMenus);
	notifyBackground({inContent:newOutput});
}

function notifyBackground(output){
	var sending = browser.runtime.sendMessage({
		value: output
	});
	sending.then(handleResponse,handleError);
}

function handleResponse(message) {
  console.log(`Resolution:  ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("menuitem created successfully");
  }
}

function onRemoved() {
  console.log("menuitem removed successfully");
}

function onError() {
  console.log("error removing item:" + browser.runtime.lastError);
}

function updateMenus(newMenus){
	if (menuStates.onLink != newMenus.onLink){
		//console.log("onLink changed from: "+ menuStates.onLink +" to: "+newMenus.onLink);
		if(menuStates.onLink){
			browser.menus.remove("openMenuLink").then(onRemoved,onError);
		}else{
			browser.menus.create({
				id: "openMenuLink",
				title: "QRier link",
				contexts: ["link"]
				}, onCreated);
		}
		menuStates.onLink = !menuStates.onLink;
	}
	
	if (menuStates.onUrl != newMenus.onUrl){

		if(menuStates.onUrl){
			browser.menus.remove("openMenuUrl").then(onRemoved,onError);
		}else{
			browser.menus.create({
				id: "openMenuUrl",
				title: "QRier url",
				contexts: ["page"]
				}, onCreated);
		}
		menuStates.onUrl = !menuStates.onUrl;
	}
	if (menuStates.onSelection != newMenus.onSelection){

		if(menuStates.onSelection){
			browser.menus.remove("openMenuSelection").then(onRemoved,onError);
		}else{
			browser.menus.create({
				id: "openMenuSelection",
				title: "QRier selection",
				contexts: ["selection"]
				}, onCreated);
		}
		menuStates.onSelection = !menuStates.onSelection;
	}
}

function restoreOptions() {

  var gettingItem = browser.storage.local.get(['mask','ecc','scale','showLink','showUrl','showSelection','inContent']);
  gettingItem.then((res) => {
    document.querySelector("#maskSelect").options[parseInt(res.mask) - 1].selected = true;
		//document.querySelector("#selectMask").innerText = masks[res.mask];
		document.querySelector("#eccSelect").options[parseInt(res.ecc) - 1].selected = true;
		//document.querySelector("#selectECC").innerText = eccs[res.ecc];
		document.querySelector("#scaleSelect").options[(parseInt(res.scale)>>1) - 2].selected = true;
		//document.querySelector("#selectScale").innerText = scales[res.scale>>1];
		document.querySelector("#onLink").checked = res.showLink;
		menuStates.onLink = res.showLink;
		document.querySelector("#onUrl").checked = res.showUrl;
		menuStates.onUrl = res.showUrl;
		document.querySelector("#onSelect").checked = res.showSelection;
		menuStates.onSelection = res.showSelection;
		document.getElementById(res.inContent).checked = true;
  });
}
var menuStates = {"onLink":false,"onUrl":false,"onSelection":false};
const masks = [null,1,2,3,4,5,6,7,8,"Auto"];
const eccs = [null,"L - 7%","M - 15%","Q - 25%","H - 30%"];
const scales = [null,"2x2","4x4","6x6","8x8","10x10","12x12"];
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById("saveButton").addEventListener("click", saveOptions,false);