'use strict'
	var qrCode,orgX,curVal,svgC,outC,textField;
	var isTouchDevice = hasTouch();
	var codeIsEmpty = true;
	var lastObjectUrl = null;
document.onreadystatechange = function () {
  if (document.readyState === "complete") {
    init();
  }
}

// Page related functionality

function makeBlob(elem){
	if(lastObjectUrl != null){
		URL.revokeObjectURL(lastObjectUrl);
	}
	lastObjectUrl = URL.createObjectURL(new Blob([elem.innerHTML],{type:"image/svg+xml;charset=utf-8"}));
	return false
}

function makeDownloadLink(e){
	makeBlob(svgC);
	e.target.setAttribute("href",lastObjectUrl);
}

function feedback(input,result,state,elem){
	var isGood = ["Success: ","Error: "];
	var saving = document.getElementById("saveButton");
	document.getElementById("feedbackTitle").textContent = isGood[state]+input;
	if(!state){
		document.getElementById("feedbackFormat").textContent = "QR-version: "+result.version+" with mask: "+result.mask;
		saving.removeAttribute("disabled");
	}else{
		document.getElementById("feedbackFormat").textContent = "";
		saving.setAttribute("disabled",true);
	}
}

function makeSymbol(query){
	var str_input;
	var padding = 3; // 3 svg units
	if (typeof query == "string"){
		str_input = query;
	}else{
		str_input = document.getElementById("input_text").value;
	}
	var ecc_level = selectOption(document.getElementById("eccBox"));
	var maskNumber = selectOption(document.getElementById("maskBox"));
	var svg = document.getElementById("svgContainer");
	var svgPath = document.getElementById("svgPath");
	try{
		var requestInfo = {	"maskNumber":maskNumber,
												"ecc_level":ecc_level,
												"imagePadding":padding,
												"outputType":"svgPath",
											};
		var result = qrCode.make(str_input,requestInfo);
		svgPath.setAttribute("d",result.result);
		svgPath.parentNode.setAttribute("viewBox","0 0 "+result.width+" "+result.width);
		codeIsEmpty = false;
		var feedbackText = str_input.substr(0,47);
		if (str_input.length > 50){
			feedbackText += "...";
		}else{
			feedbackText += str_input.substr(48,3);
		}
		
		feedback(feedbackText,result,0,svg);
	}catch(e){
		svgPath.setAttribute("d","");
		svgPath.parentNode.setAttribute("viewBox","0 0 0 0");
		codeIsEmpty = true;
		feedback(e,{"1":1},1,svg);
	}
}

function selectOption(box){
	return parseInt(box.value);
}
/* Input handlers */

function onPointerDown(e){
	e.preventDefault();
	if (e.type == "touchstart"){
		if( e.changedTouches.length > 1){
			return false
		}else{
		orgX =  e.changedTouches[0].clientX;
		}
	}else{
		if(e.button == 0){
			orgX = e.clientX;
		}else{
			return false
		}
	}
	curVal = parseInt(svgC.style.getPropertyValue("--svg-width"));
	outC[selectPointer("up")] = onPointerUp;
	outC[selectPointer("leave")] = onPointerUp;
	outC[selectPointer("move")] = onPointerMove;
	return false
}

function onPointerUp(e){
	e.stopPropagation();	
	outC[selectPointer("move")] = null;
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
	svgC.style.setProperty("--svg-width",Math.min(Math.max(curVal+(x - orgX)/2,0),100) + "%");
}

function hasTouch(){
	return !!('ontouchstart' in window);
}
// Map touch events to mouse events
function selectPointer(action){
	var str = "on";
	var actions = isTouchDevice ? ["start","end","move","cancel"]:["down","up","move","leave"];
	str += isTouchDevice ? "touch" : "mouse";
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

function parseLocation(src){
	var start = src.indexOf("?");
	var res = (start > 0 && start < src.length - 1) ? src.substring(start + 1):"";
	return res.substr(0,3000);
}

function init(){
	textField = document.getElementById("input_text");
	textField.addEventListener("input",makeSymbol,false);
	qrCode = new QRcode();
	// Style canvases
	svgC = document.getElementById("svgContainer");
	svgC.style.setProperty("--svg-width","100%");
	outC = document.getElementById("outputs");
	// Autorun generator If the user made a request containing query parameters
	// Also limit to the first 36 characters to be inline with the inputbox
	var query = decodeURIComponent(parseLocation(location.href));
	if (query) {
		makeSymbol(query);
		textField.value = query;
	}
	// feedback the user init ran well and add listeners to generate and copy buttons
	console.log("generator initialized");
	document.getElementById("genButton").addEventListener("click",makeSymbol,false);
	document.getElementById("saveButton").addEventListener("click",makeDownloadLink,false);
	outC[selectPointer("down")] = onPointerDown;
}
