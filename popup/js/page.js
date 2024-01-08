'use strict'
import { QRier_Gen } from "../../core/qrGen.js";

function feedback(input,result,state){
  var isGood = ["","Error: "];
  document.getElementById("feedbackTitle").textContent = isGood[state]+input;
  if(!state){
    document.getElementById("feedbackFormat").textContent = "QR-version: "+result.version+" with mask: "+result.mask;
  }else{
    document.getElementById("feedbackFormat").textContent = "";
  }
}

function makeSymbol(query){
  var qr = new QRier_Gen();
  var eccLevel = options.ECC;
  var scale = options.scale;
  var inputText = query;
  
  var canvas = document.getElementById("qrierCanvas");
  // Page scales to screen width on Android so let's scale the image to that
  var containerWidth = os === "android" ? Math.floor(0.6 * Math.min(window.innerHeight, window.innerWidth)):null;
  var requestInfo = {
    "maskNumber":9,
    "eccLevel":eccLevel,
    "padding":3,
    "outputType":QRier_Gen.OUTPUTMODE_CANVAS,
    "canvasProperties":{
      "canvasElement":canvas,
      "scale":scale,
      "containerSize":containerWidth
    }
  };
  try{
    var result = qr.make(inputText,requestInfo);
    var feedbackText = inputText.substr(0,44);
    if (inputText.length > 46){
      feedbackText += "...";
    }else{
      feedbackText += inputText.substr(44,3);
    }
    feedback(feedbackText,result,0);
  }catch(e){
    feedback(e,{"1":1},1);
  }
}
function setCurrent(tabs){
  currentTab = tabs[0];
}

function setOS(info){
  os = info.os;
}
  
function setOptions(opt){
  if(opt.ecc != undefined){
    options.ECC = opt.ecc;
  }
  if(opt.scale != undefined){
    options.scale = opt.scale;
  }
  if(opt.autoCleanUrls != undefined){
    options.autoCleanUrls = !!opt.autoCleanUrls
  }
}
  
function parseLocation(src){
  var start = src.indexOf("?");
  var res = (start > 0 && start < src.length - 1) ? src.substring(start + 1):"";
  return res.substr(0,3000);
}
// Extends encodeURIComponent() to include !'()*
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
  
function openFreePage() {
  browser.tabs.create({url:"../pages/QRierFreepage.html"+"?data="+fixedEncodeURIComponent(currentText) + "&ecc=" + [null,"L","M","Q","H"][options.ECC]});
  window.close();
}
let currentTab,os,currentText;
let options = {
  ECC: 3,
  scale:6,
  autoCleanUrls: false
};

function showSuccess(){
  document.getElementById("successMessage").hidden = false;
  document.getElementById("errorMessage").hidden = true;
}

function showError(){
  document.getElementById("successMessage").hidden = true;
  document.getElementById("errorMessage").hidden = false;
}

function setupOptionalSection(isRevoked,platform){
  const isUnset = (isRevoked === null || isRevoked === undefined);
  let container = document.querySelector(".optional-container");
  let allowButton = document.getElementById("requestScriptingAllow");
  let denyButton = document.getElementById("requestScriptingDeny");
  if(!container || !allowButton || !denyButton){ return }
  
  if(isRevoked){
    denyButton.checked = true
  }else if(isUnset){
    allowButton.indeterminate = true;
    denyButton.indeterminate = true;
  }else{
    allowButton.checked = true
  }
  
  allowButton.addEventListener("change",(ev) => {
    if(ev.target.checked){
      browser.permissions.request({permissions:["scripting"]})
      .then(gotIt => {
        if(!gotIt){
          ev.target.indeterminate = true;
        }
      })
      .then(() => {
        browser.storage.local.set({
          scriptingRevoked: false,
          inContent: true
        });
        browser.action.setPopup({popup: null})
      })
      .then(showSuccess,showError)
    }
  })
  denyButton.addEventListener("change",(ev) => {
    if(ev.target.checked){
      // background-script.js handles this event
      browser.permissions.remove({permissions:["scripting"]})
    }
  })
  // Don't show the "change-to-incontent" selection except on 
  // Android because on desktop the panel UI is arguably 
  // a better experience.
  // We also don't show it if it has been answered once.
  container.hidden = !(platform.os === "android" && isUnset)
}

function setup(){
  var gettingOptions = browser.storage.local.get(['ecc','scale','autoCleanUrls','scriptingRevoked']);
  var gettingTab = browser.tabs.query({active: true, currentWindow: true});
  var gettingOS = browser.runtime.getPlatformInfo();

Promise.all([gettingOptions,gettingTab,gettingOS]).then(setup =>{
  setOptions(setup[0]);
  setCurrent(setup[1]);
  setOS(setup[2]);
  
  currentText = decodeURIComponent(parseLocation(location.href)) || currentTab.url;
  
  if(options.autoCleanUrls && currentText.startsWith("http")){
    currentText = currentText.slice(0,currentText.indexOf("?"))
  }
  setupOptionalSection(setup[0].scriptingRevoked,setup[2]);
  
  makeSymbol(currentText);
  });
  return false
}
document.onreadystatechange = function () {
  if (document.readyState === "complete") {
  setup();
  document.getElementById("freePageLink").addEventListener("click",openFreePage,false);
  }
}
