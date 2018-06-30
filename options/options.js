function saveOptions(e) {
	var newMenus = {"onLink":document.querySelector("#onLink").checked,"onUrl":document.querySelector("#onUrl").checked,"onSelection":document.querySelector("#onSelect").checked};
	var newOutput = document.getElementById("outputType").elements["output"].value;
  browser.storage.local.set({
    mask: parseInt(document.querySelector("#maskSelect").value),
		ecc: parseInt(document.querySelector("#eccSelect").value),
		scale: parseInt(document.querySelector("#scaleSelect").value),
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
	feedback(false,"OK");
}

function handleError(error) {
  console.log(`Error: ${error}`);
	feedback(true,"");
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

function feedback(err,str){
	var elem = document.getElementById("feedback");
	var color = err ? "red":"green";
	var fdb = err ? "Error while saving options, see browser console " + str : "OK";
	elem.textContent = fdb;
	elem.style.color = color;
	return 0
}

function updateMenus(newMenus){
	if (menuStates.onLink != newMenus.onLink){
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

		document.querySelector("#maskSelect").value = res.mask.toString();

		document.querySelector("#eccSelect").value = res.ecc.toString();

		document.querySelector("#scaleSelect").value = res.scale.toString();

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

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById("saveButton").addEventListener("click", saveOptions,false);