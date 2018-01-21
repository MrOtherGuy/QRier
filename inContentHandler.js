'use strict'
function handleInContent(str){
	
	var currentTab,currentText;
	var options = {"mask":9,"ECC":3,"scale":6};
	
	function setCurrent(tabs){
	currentTab = tabs[0];
	}
	
	function setOptions(opt){
		if(opt.mask != undefined){
			options.mask = parseInt(opt.mask);
		}
		if(opt.ecc != undefined){
			options.ECC = parseInt(opt.ecc);
		}
		if(opt.scale != undefined){
			options.scale = parseInt(opt.scale);
		}
	}
	
	function setup(str){
		var gettingOptions = browser.storage.local.get(['mask','ecc','scale']);
		gettingOptions.then(setup =>{
			setOptions(setup);
			currentText = str;
			makeSymbol(currentText);
		});
	return false
	}
	
	function makeDataUri(elem){
		var uri = "data:image/svg+xml;utf-8,";
		uri += encodeURIComponent(elem);
		return uri;
	}
	
	function makeSymbol(query){
		var eccLevel = options.ECC;
		var mask = options.mask;
		var scale = options.scale;
		var inputText = query;
	
	//var canvas = document.createElement("canvas");
	// Page scales to screen width on Android so let's scale the image to that
	var containerWidth = null;
	var requestInfo = {	"maskNumber":mask,
											"ecc_level":eccLevel,
											"imagePadding":3,
											"outputType":"svgFull"
											/*"outputElement":canvas,
											"scale":scale,
											"containerSize":containerWidth*/
										};
	try{
		var result = QRierObject.make(inputText,requestInfo);
		var url = makeDataUri(result.result);
		var injectScript = 'var c=document.createElement("div");var im=document.createElement("img");im.src="'+url+'";c.style.cssText="height:100vh;width:100vw;position:fixed;background:rgba(0,0,0,0.6);top:0;left:0;display:flex;align-items:center;justify-content:center;z-index:9999";im.style.width="'+(result.width * scale)+'px";c.appendChild(im);document.body.appendChild(c);c.addEventListener("click",function(){c.parentNode.removeChild(c)},false)';
			var executing = browser.tabs.executeScript({
				code: injectScript
			});
		
	}catch(e){
		//feedback(e,{"1":1},1);
		console.log(e);
	}
	}
	setup(str);
	
}