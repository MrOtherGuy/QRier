'use strict';
import { QRier_Gen } from "../../core/qrGen.js";

let page = {elements:{},codeGen:null,pointer:{},state:{},options:{}};
let lazyTimeout;
document.onreadystatechange = function () {
  if (document.readyState === "complete") {
    init();
  }
}

function makeBlob(elem){
	if(page.state.lastObjectUrl != null){
		URL.revokeObjectURL(page.state.lastObjectUrl);
	}
	page.state.lastObjectUrl = URL.createObjectURL(new Blob([elem.innerHTML],{type:"image/svg+xml;charset=utf-8"}));
	return false
}

function makeDownloadLink(e){
	if (page.state.userNeedsaBetterBrowser){
		window.navigator.msSaveBlob(new Blob([page.elements.svgContainer.innerHTML]),"Symbol.svg");
	}else{
		makeBlob(page.elements.svgContainer);
		e.target.setAttribute("href",page.state.lastObjectUrl);
	}
}

function createSelfSymbol(){
	let path = document.location.pathname;
	let addr = document.location.origin + path;
	if (path.charAt(path.length - 1) != "/"){
		addr += "/";
	}
	makeSymbol({data: addr});
}

function feedback(input, state, mask, version){
	let isGood = ["OK: ","Error: ", ""];
	page.elements.feedbackTitle.textContent = isGood[state] + input;
	if(!state){
		page.elements.feedbackFormat.textContent = "QR-version: " + version + " - Mask: " + mask;
		page.elements.saveButton.removeAttribute("disabled");
	}else{
		page.elements.feedbackFormat.textContent = "";
		page.elements.saveButton.setAttribute("disabled",true);
	}
}

function toggleImage(){
	page.state.hasDataURI = document.getElementById("logoEnabled").checked;
}

function imageChange(){
	let imgElement = document.getElementById("imgPreview").children[0];
	let file = document.getElementById("fileInput").files[0];
	let reader = new FileReader();
	reader.addEventListener("load", function () {
		page.state.dataURI = reader.result;
    page.state.hasDataURI = true;
		imgElement.src = reader.result;
		makeSymbol();
  }, false);
	if (file) {
    reader.readAsDataURL(file);
  } else{
		page.state.hasDataURI = false;
		page.state.dataURI = "";
	}
}

function setEmbeddedImageProperties(symbolWidth, imageWidth, shape){
	let innerImage = page.elements.innerImage;
	if (page.state.hasDataURI){
		innerImage.setAttribute("x",(symbolWidth - imageWidth) / 2);
		innerImage.setAttribute("y",(symbolWidth - imageWidth) / 2);
		innerImage.setAttribute("width", imageWidth);
		innerImage.setAttribute("height", imageWidth);
		innerImage.setAttribute("xlink:href", page.state.dataURI);
	}else{
		innerImage.setAttribute("xlink:href", "");
	}
	if(shape === "circle"){
		// CSS clip-path radius is computed wrong in all browsers
		// SVG clipPath works fine though
		page.elements.clipCircle.setAttribute("r", imageWidth / 2);
	}else{
		page.elements.clipCircle.setAttribute("r", symbolWidth);
	}
}

function makeSymbol(query){
	let elems = page.elements;
	let str_input;
	let padding = 3; // 3 svg units
	if (!(query instanceof Event) && typeof query === "object"){
		str_input = query.data;
	}else{
		query = {ecc:null, mask:null};
		str_input = elems.textField.value;
	}
	let eccLevel = parseInt(query.ecc) || parseInt(page.options.ECC);
	let maskNumber = parseInt(query.mask) || parseInt(page.options.mask);
	let embedImageScale = parseFloat(page.options.embedScale);
	let innerImageOffset = parseInt(page.options.embedOffset);
	let innerImageWidth = page.state.hasDataURI ? embedImageScale : 0;
	let shape = innerImageWidth ? page.options.embedShape : null;
	let dataURI = page.state.hasDataURI ? page.state.dataURI : "";
	if (!dataURI){
		innerImageWidth = 0;
	}
	try{
		let requestInfo = {	"maskNumber":maskNumber,
												"eccLevel":eccLevel,
												"padding":padding,
												"outputType":QRier_Gen.OUTPUTMODE_PATH,
												"image":{"width":innerImageWidth, "shape":shape, "offset": innerImageOffset}
											};
		let result = page.codeGen.make(str_input, requestInfo);
		let feedbackText;
		if( !result.isValid ){
			elems.svgPath.setAttribute("d", "");
			feedbackText = result.validInfo;
		}else{
			elems.svgPath.setAttribute("d", result.result);
			feedbackText = str_input.substr(0, 48);
			if (str_input.length > 50){
				feedbackText += "...";
			}else{
				feedbackText += str_input.substr(48, 3);
			}
		}
		// parentNode is SVG root
		elems.svgPath.parentNode.setAttribute("viewBox", "0 0 " + result.width + " " + result.width);
		setEmbeddedImageProperties(result.width, result.embedWidth, shape);
		feedback(feedbackText, result.isValid ? 0 : 2, result.mask, result.version);
		/* Workaround for Chromium failing to paint before changing image size */
		if(page.state.codeIsEmpty){
			elems.svgContainer.children[0].style.display = "block";
		}
		page.state.codeIsEmpty = !result.isValid;
	}catch(e){
		elems.svgPath.setAttribute("d", "");
		elems.svgPath.parentNode.setAttribute("viewBox", "0 0 0 0");
		page.state.codeIsEmpty = true;
		feedback(e, 1, null, null);
	}
}

function lazyMakeSymbol(){
	if(lazyTimeout){
		window.clearTimeout(lazyTimeout);
	}
	lazyTimeout = window.setTimeout(makeSymbol, 80);
}

/* Input handlers
*  Touch action are mapped to mouse actions
*/
function onPointerDown(e){
  e.preventDefault();
  let elems = page.elements;
  if (e.type == "touchstart"){
    if( e.changedTouches.length > 1){
      return false
    }else{
    page.pointer.orgX = e.changedTouches[0].clientX;
    }
  }else{
    if(e.button == 0){
      page.pointer.orgX = e.clientX;
    }else{
      return false
    }
  }
  page.pointer.curVal = parseInt(elems.svgContainer.style.getPropertyValue("--svg-width"));
  const container = elems.outputContainer;
  
  if(page.state.isTouchDevice){
    container.addEventListener(selectPointer("up",true),onPointerUp);
    container.addEventListener(selectPointer("leave",true),onPointerUp);
    container.addEventListener(selectPointer("move",true),onPointerMove);
  }
  container.addEventListener(selectPointer("up",false),onPointerUp);
  container.addEventListener(selectPointer("leave",false),onPointerUp);
  container.addEventListener(selectPointer("move",false),onPointerMove);
  return false
}

function onPointerUp(e){
  e.stopPropagation();
  if(page.state.isTouchDevice){
    page.elements.outputContainer
    .removeEventListener(selectPointer("move",true),onPointerMove);
  }
  page.elements.outputContainer
  .removeEventListener(selectPointer("move",false),onPointerMove);
  return false
}

function onPointerMove(e){
  e.stopPropagation();
  let x;
  if (e.type == "touchmove"){
    x = e.changedTouches[0].clientX;
  }else{
    x = e.clientX;
  }
  page.elements.svgContainer.style.setProperty("--svg-width", Math.min(Math.max(page.pointer.curVal + (x - page.pointer.orgX) / 2, 0), 100) + "%");
}

function hasTouch(){
	return !!('ontouchstart' in window);
}

function setContainerWidth(size,elem){
	size = Math.min(Math.max(size, 0), 100);
	if(page.state.userNeedsaBetterBrowser){
		elem.style.width = size + "%";
		elem.style.height = size + "%";
	}else{
		elem.style.setProperty("--svg-width", size + "%");
	}
}

function getContainerWidth(elem){
	let prop = page.state.userNeedsaBetterBrowser ? "width" : "--svg-width";
	return parseFloat(elem.style.getPropertyValue(prop));
}

// Map touch events to mouse events
function selectPointer(action,touchCapable){
  //let str = "on";
  let actions = touchCapable
      ? ["start", "end", "move", "cancel"]
      : ["down", "up", "move", "leave"];
  let str = touchCapable ? "touch" : "mouse";
  switch (action){
    case "down":
      str += actions[0];
      break;
    case "up":
      str += actions[1];
      break;
    case "move":
      str += actions[2];
      break;
    case "leave":
      str += actions[3];
      break;
    default:
      throw "unimplemented pointer action"
    
  }
  return str
}

function queryParams(query){
  let str = query.substring(1);
	let isEmpty = str.length < 1;
  let tokens = str.split("&");
  let entries = {};
	try{
		for(let i = 0;i < tokens.length;i++){
			let pair = tokens[i].split("=");
			if (pair.length > 1){
				let prefName = pair[0];
				entries[prefName] = decodeURIComponent(tokens[i].substr(prefName.length + 1));
			}
		}
	}catch(e){
		// Just catch the exception (malformed uri etc)
		// Init will ask the full query string next
		// If the exception was on preference name it will be invalidated later.
	}
	this.get = function(name){
		return entries[name];
	}
	this.isEmpty = function(){
		return isEmpty;
	}
	this.getFull = function(){
		return str;
	}
}

function initPageObject(){
	page.elements.textField = document.getElementById("input_text");
	page.elements.svgContainer = document.getElementById("svgContainer");
	page.elements.svgPath = document.getElementById("svgPath");
	page.elements.clipCircle = document.getElementById("dataClipCircle");
	page.elements.innerImage = document.getElementById("innerImage");
	page.elements.outputContainer = document.getElementById("outputs");
	page.elements.saveButton = document.getElementById("saveButton");
	page.elements.feedbackFormat = document.getElementById("feedbackFormat");
	page.elements.feedbackTitle = document.getElementById("feedbackTitle");
	Object.freeze(page.elements);
	page.pointer.curVal = 0;
	page.pointer.orgX = 0;
	Object.seal(page.pointer);
	page.state.isTouchDevice = hasTouch();
	page.state.userNeedsaBetterBrowser = !!window.msRequestAnimationFrame;
	page.state.codeIsEmpty = true;
	page.state.hasImage = false;
	page.state.lastObjectUrl = null;
	page.state.hasDataURI = false;
	page.state.dataURI = "";
	Object.seal(page.state);
	page.options.ECC = document.getElementById("eccBox").value;
	page.options.mask = document.getElementById("maskBox").value;
	page.options.embedScale = document.getElementById("embedScale").value;
	page.options.embedShape = document.getElementById("embedShape").value;
	page.options.embedOffset = document.getElementById("embedOffset").value;
	Object.seal(page.options);
}

function changeSetting(e){
	let propertyName = null;
	switch(e.target.id){
		case "eccBox":
			propertyName = "ECC"
			break;
		case "maskBox":
			propertyName = "mask";
			break
		case "embedScale":
			propertyName = "embedScale";
			break;
		case "embedShape":
			propertyName = "embedShape";
			break;
		case "embedOffset":
			propertyName = "embedOffset";
			break;
		default:
			console.log("invalid property");
			return;
	}
	page.options[propertyName] = e.target.value;
	makeSymbol();
}

function showOptionsIfFits(){
	let optionStyle = window.getComputedStyle(document.getElementById("settings"));
	if(parseInt(optionStyle.height) + parseInt(optionStyle.top) < window.innerHeight/9){
		document.getElementById("showSettings").checked = true;
	}
}

function init(){
	initPageObject();
	page.codeGen = new QRier_Gen();

	//IE hacks woo
	if(page.state.userNeedsaBetterBrowser){
		page.elements.outputContainer.style.minHeight = "calc(100vh - 154px)";
		// No idea why this works
		document.getElementById("inputs").style.height = "100vh";
		
	}
	
	// Autorun generator If the user made a request containing query parameters
	let query = new queryParams(location.search);
	let queryData = query.get("data");
	if (!query.isEmpty()) {
		let parameters;
		
		if(queryData){
			parameters = {
				"data": queryData,
				"ecc": {L:"1",M:"2",Q:"3",H:"4"}[query.get("ecc")],
				"mask": query.get("mask"),
				"scale": query.get("scale"),
				"output": query.get("output")
			}
		}else{
			queryData = query.getFull();
			parameters = {"data": queryData}
		}
		makeSymbol(parameters);
		// init input options to values from query
		page.elements.textField.value = queryData;
		if((/^[1-4]$/).test(parameters.ecc)){
			document.getElementById("eccBox").value = parameters.ecc;
			page.options.ECC = parameters.ecc;
		}
		if((/^[1-9]$/).test(parameters.mask)){
			document.getElementById("maskBox").value = parameters.mask;
			page.options.mask = parameters.mask;
		}
	}

	// Default image size
	setContainerWidth(60,page.elements.svgContainer);
	// Add event listeners for user inputs
	// Text input
	page.elements.textField.addEventListener("input", lazyMakeSymbol, false);
	// Preference change
	let prefIDs = ["eccBox","maskBox","embedScale","embedShape","embedOffset"];
	for(let i = 0; i < prefIDs.length; i++){
		document.getElementById(prefIDs[i]).addEventListener("change",changeSetting,false);
	}
	// Image enabled checkbox
	document.getElementById("logoEnabled").addEventListener("change", toggleImage, false);
	// File input
	document.getElementById("fileInput").addEventListener("change", imageChange, false);
	// Generate button
	document.getElementById("genButton").addEventListener("click", makeSymbol, false);
	// Self Button
	document.getElementById("selfButton").addEventListener("click", createSelfSymbol, false);
	// Save button
	document.getElementById("saveButton").addEventListener("click", makeDownloadLink, false);
	// Change image size
	
  const touchCapable = hasTouch();
  page.elements.outputContainer
  .addEventListener(selectPointer("down",touchCapable),onPointerDown);
  
	console.log("generator initialized");
	showOptionsIfFits();
}
