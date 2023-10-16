'use strict';

let hasScripting = false;
const menuStates = {
  "onLink": false,
  "onUrl": false,
  "onSelection": false,
  "inContent": false,
  "autoCleanUrls": false
};

async function saveOptions(e) {
  e.preventDefault();
  const outputform = document.getElementById("outputType");
  let newOutputInContent = outputform.elements.output.value === "popup" ? false : true;
  
  if(newOutputInContent && !hasScripting){
    try{
      hasScripting = await browser.permissions.request({
        permissions: ["scripting"]
      });
    }catch(e){
      console.error("scripting permissions request failed")
    }
    if(!hasScripting){
      console.log("scripting permissions was not granted");
      outputform.elements.output.value = "popup";
      newOutputInContent = false;
    }
  }

  let newMenus = {
    "inContent": newOutputInContent,
    "onLink": document.querySelector("#onLink").checked,
    "onUrl": document.querySelector("#onUrl").checked,
    "onSelection": document.querySelector("#onSelect").checked
  };
  
  browser.storage.local.set({
    ecc: Number.parseInt(document.querySelector("#eccSelect").value),
    scale: Number.parseInt(document.querySelector("#scaleSelect").value),
    showLink: newMenus.onLink,
    showUrl: newMenus.onUrl,
    showSelection: newMenus.onSelection,
    inContent: newOutputInContent,
    autoCleanUrls: document.getElementById("autoCleanUrls-checkbox").checked
  });

  updateMenus(newMenus);
  updateOutputMode({inContent:newOutput});
  feedback(false,"Changes saved");
}

function updateOutputMode(output){
  if(output.inContent){
    browser.action.setPopup({popup: null})
  }else{
    browser.action.setPopup({ popup: "../popup/QRier.html" });
  }
}

function feedback(err,str){
  var elem = document.getElementById("feedback");
  if(err){
    elem.classList.remove("success-status");
    elem.classList.add("error-status");
  }else{
    elem.classList.remove("error-status");
    elem.classList.add("success-status");
  }
  var fdb = err ? "Error while saving options, see browser console " + str : "OK";
  elem.textContent = fdb;
  setTimeout(()=>{ elem.textContent = " ";elem.classList.remove("success-status","error-status")},2000)
  return 0
}

function restoreOptions() {
=======
  setTimeout(()=>{ elem.textContent = " ";elem.classList.remove("success-status","error-status")},2000)
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
    menuStates.inContent =  !menuStates.inContent;
  }
  
  browser.permissions.contains({
    permissions: ["scripting"]
  })
  .then(permissions => {
    hasScripting = permissions
  });
  
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

  browser.storage.local.get(['ecc','scale','showLink','showUrl','showSelection','inContent','autoCleanUrls'])
  .then((res) => {
    document.querySelector("#eccSelect").value = res.ecc.toString();
    document.querySelector("#scaleSelect").value = res.scale.toString();
    document.querySelector("#onLink").checked = res.showLink;
    menuStates.onLink = res.showLink;
    document.querySelector("#onUrl").checked = res.showUrl;
    menuStates.onUrl = res.showUrl;
    document.querySelector("#onSelect").checked = res.showSelection;
    menuStates.onSelection = res.showSelection;
    let item = res.inContent ? "content" : "popup";
    document.getElementById(item+"-radio").checked = true;
    menuStates.inContent = res.inContent;
    document.getElementById("autoCleanUrls-checkbox").checked = res.autoCleanUrls;
    menuStates.autoCleanUrls = res.autoCleanUrls;
  });
}

function init(){
  restoreOptions();
  document.getElementById("saveButton").addEventListener("click", saveOptions);
}

document.onreadystatechange = function () {
  if (document.readyState === "complete") {
    init();
  }
}
