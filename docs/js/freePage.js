'use strict'
	var page = {elements:{},codeGen:null,pointer:{},state:{},options:{}};
	var lazyTimeout;
document.onreadystatechange = function () {
  if (document.readyState === "complete") {
    init();
  }
}

// Page related functionality

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
	var path = document.location.pathname;
	var addr = document.location.origin + path;
	if (path.charAt(path.length - 1) != "/"){
		addr += "/";
	}
	makeSymbol({data: addr + "?"});
}

function feedback(input, state, mask, version){
	var isGood = ["OK: ","Error: ", ""];
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
	var imgElement = document.getElementById("imgPreview").children[0];
	var file = document.getElementById("fileInput").files[0];
	var reader = new FileReader();
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
	var innerImage = page.elements.innerImage;
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
	var elems = page.elements;
	var str_input;
	var padding = 3; // 3 svg units
	if (!(query instanceof Event) && typeof query === "object"){
		str_input = query.data;
	}else{
		query = {ecc:null, mask:null};
		str_input = elems.textField.value;
	}
	var eccLevel = parseInt(query.ecc) || parseInt(page.options.ECC);
	var maskNumber = parseInt(query.mask) || parseInt(page.options.mask);
	var embedImageScale = parseFloat(page.options.embedScale);
	var innerImageOffset = parseInt(page.options.embedOffset);
	var innerImageWidth = page.state.hasDataURI ? embedImageScale : 0;
	var shape = innerImageWidth ? page.options.embedShape : null;
	var dataURI = page.state.hasDataURI ? page.state.dataURI : "";
	if (!dataURI){
		innerImageWidth = 0;
	}
	try{
		var requestInfo = {	"maskNumber":maskNumber,
												"eccLevel":eccLevel,
												"padding":padding,
												"outputType":"svgPath",
												"image":{"width":innerImageWidth, "shape":shape, "offset": innerImageOffset}
											};
		var result = page.codeGen.make(str_input, requestInfo);
		var feedbackText;
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
	var elems = page.elements;
	if (e.type == "touchstart"){
		if( e.changedTouches.length > 1){
			return false
		}else{
		page.pointer.orgX =  e.changedTouches[0].clientX;
		}
	}else{
		if(e.button == 0){
			page.pointer.orgX = e.clientX;
		}else{
			return false
		}
	}
	page.pointer.curVal = getContainerWidth(page.elements.svgContainer);
	elems.outputContainer[selectPointer("up")] = onPointerUp;
	elems.outputContainer[selectPointer("leave")] = onPointerUp;
	elems.outputContainer[selectPointer("move")] = onPointerMove;
	return false
}

function onPointerUp(e){
	e.stopPropagation();	
	page.elements.outputContainer[selectPointer("move")] = null;
	return false
}

function onPointerMove(e){
	e.stopPropagation();
	var x;
	if (e.type == "touchmove"){
		x = e.changedTouches[0].clientX;
	}else{
		x = e.clientX;
	}
	setContainerWidth(page.pointer.curVal + (x - page.pointer.orgX) / 2, page.elements.svgContainer);
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
	var prop = page.state.userNeedsaBetterBrowser ? "width" : "--svg-width";
	return parseFloat(elem.style.getPropertyValue(prop));
}

function selectPointer(action){
	var str = "on";
	var actions = page.state.isTouchDevice ? ["start","end","move","cancel"]:["down","up","move","leave"];
	str += page.state.isTouchDevice ? "touch" : "mouse";
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
  var str = query.substring(1);
	var isEmpty = str.length < 1;
  var tokens = str.split("&");
  var entries = {};
	try{
		for(var i = 0;i < tokens.length;i++){
			var pair = tokens[i].split("=");
			if (pair.length > 1){
				var prefName = pair[0];
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
	var propertyName = null;
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
	var optionStyle = window.getComputedStyle(document.getElementById("settings"));
	if(parseInt(optionStyle.height) + parseInt(optionStyle.top) < window.innerHeight/9){
		document.getElementById("showSettings").checked = true;
	}
}

function init(){
	initPageObject();
	page.codeGen = new QRcode();

	//IE hacks woo
	if(page.state.userNeedsaBetterBrowser){
		page.elements.outputContainer.style.minHeight = "calc(100vh - 154px)";
		// No idea why this works
		document.getElementById("inputs").style.height = "100vh";
		
	}
	
	// Autorun generator If the user made a request containing query parameters
	var query = new queryParams(location.search);
	var queryData = query.get("data");
	if (!query.isEmpty()) {
		var parameters;
		
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
	var prefIDs = ["eccBox","maskBox","embedScale","embedShape","embedOffset"];
	for(var i = 0; i < prefIDs.length; i++){
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
	page.elements.outputContainer[selectPointer("down")] = onPointerDown;
	console.log("generator initialized");
	showOptionsIfFits();
}
