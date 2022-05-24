'use strict';

let hasScripting = false;
const menuStates = {
  "onLink": false,
  "onUrl": false,
  "onSelection": false,
  "inContent": false
};

async function saveOptions(e) {
  e.preventDefault();
  const outputform = document.getElementById("outputType");
  let newOutput = outputform.elements.output.value === "popup" ? "popup" : "content";
  
  if(newOutput === "content" && !hasScripting){
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
      newOutput = "popup";
    }
  }

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
  //updateMenus(newMenus);
  // Tell background-script to update menus
  browser.runtime.sendMessage({
    menuChange: { newMenus: newMenus, oldMenus: menuStates }
  })
  .then(handleResponse)
  .then(() => {
    menuStates.inContent = newMenus.inContent;
    menuStates.onLink = newMenus.onLink;
    menuStates.onUrl = newMenus.onUrl;
    menuStates.onSelection = newMenus.onSelection;
  })
  .catch(handleError)
}

function handleResponse(message) {
  console.log(`Resolution:  ${message.response}`);
  feedback(false,"Changes saved");
}

function handleError(error) {
  console.log(`Error: ${error}`);
  feedback(true,"");
}

function feedback(err,str){
  var elem = document.getElementById("feedback");
  var color = err ? "pink":"lightgreen";
  var fdb = err ? "Error while saving options, see browser console " + str : "OK";
  elem.textContent = fdb;
  elem.style.backgroundColor = color;
  !err && setTimeout(()=>{ elem.textContent = " "; elem.style.backgroundColor = "transparent"},2000)
  return 0
}

function restoreOptions() {
  
  browser.permissions.contains({
    permissions: ["scripting"]
  })
  .then(permissions => {
    hasScripting = permissions
  });
  
  browser.storage.local.get(['mask','ecc','scale','showLink','showUrl','showSelection','inContent'])
  .then((res) => {
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

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById("saveButton").addEventListener("click", saveOptions,false);