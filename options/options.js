'use strict';
function saveOptions(e) {
	let newOutput = document.getElementById("outputType").elements["output"].value === "popup" ? "popup" : "content";
  
  let newMenus = {
    "inContent": newOutput === "content",
    "onLink": document.querySelector("#onLink").checked,
    "onUrl": document.querySelector("#onUrl").checked,
    "onSelection": document.querySelector("#onSelect").checked
  };
	
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
	browser.runtime.sendMessage({
		outputMode: output
	})
	.then(handleResponse,handleError);
}

function handleResponse(message) {
  console.log(`Resolution:  ${message.response}`);
	feedback(false,"Changes saved");
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
	var color = err ? "pink":"lightgreen";
	var fdb = err ? "Error while saving options, see browser console " + str : "OK";
	elem.textContent = fdb;
	elem.style.backgroundColor = color;
  setTimeout(()=>{ elem.textContent = " "; elem.style.backgroundColor = "transparent"},2000)
	return 0
}

function updateMenus(newMenus){
  
  const addSuffix = newMenus.inContent ? "In-content" : "In-popup";
  const removeSuffix = newMenus.inContent ? "In-popup" : "In-content";
  
  const inContentStateChanged = newMenus.inContent != menuStates.inContent;
  
  if(inContentStateChanged){
    browser.menus.remove("openMenuLink"+removeSuffix);
    browser.menus.remove("openMenuUrl"+removeSuffix);
    browser.menus.remove("openMenuSelection"+removeSuffix);
    menuStates.inContent != menuStates.inContent;
  }
  
	if(inContentStateChanged || (menuStates.onLink != newMenus.onLink)){
		if(!newMenus.onLink){
			browser.menus.remove("openMenuLink"+removeSuffix)
      .then(onRemoved,onError);
		}else{
			browser.menus.create({
				id: "openMenuLink"+addSuffix,
				title: "QRier link",
				contexts: ["link"]
				}, onCreated);
		}
		menuStates.onLink = newMenus.onLink;
	}
	
	if(inContentStateChanged || (menuStates.onUrl != newMenus.onUrl)){

		if(!newMenus.onUrl){
			browser.menus.remove("openMenuUrl"+removeSuffix)
      .then(onRemoved,onError);
		}else{
			browser.menus.create({
				id: "openMenuUrl"+addSuffix,
				title: "QRier url",
				contexts: ["page"]
				}, onCreated);
		}
		menuStates.onUrl = newMenus.onUrl;
	}
	if(inContentStateChanged || (menuStates.onSelection != newMenus.onSelection)){

		if(!newMenus.onSelection){
			browser.menus.remove("openMenuSelection"+removeSuffix)
      .then(onRemoved,onError);
		}else{
			browser.menus.create({
				id: "openMenuSelection"+addSuffix,
				title: "QRier selection",
				contexts: ["selection"]
				}, onCreated);
		}
		menuStates.onSelection = newMenus.onSelection;
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
		document.getElementById(res.inContent+"-radio").checked = true;
    menuStates.inContent = res.inContent === "content";
  });
}
const menuStates = {
  "onLink": false,
  "onUrl": false,
  "onSelection": false,
  "inContent": false
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById("saveButton").addEventListener("click", saveOptions,false);