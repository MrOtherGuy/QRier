# QRier

Javascript based QR-code generator. Supports QR versions (size) up to 40, byte mode only. Mask type and error correction level are configurable. Mask can be selected directly or determined automatically. Supports output to SVG and HTML Canvas

This repository includes code used by browser extension for Firefox with the same name but also stand-alone HTML-page (under docs folder) which has some IE/Edge compatibility additions.

Core libraries should work without any DOM interaction so they can be used as is for other purposes. Exception for this is canvas output which requires a canvas element as reference. QRgen.js requires ECCGen.js to create error correction codes.

You can find a work-in-progress description of QR-codes in general and this implementation inside docs.

# API

Include qrGen.js and ECCGen.js in HTML header

## Import

```JavaScript
var generator = new QRier_Gen();
```

## Usage

```JavaScript
var input = "Hello, World!";
var resultObject = generator.make(input,<properties>);
console.log(resultObject);
/*
resultObject:
{
	"isValid":		<Boolean>,
	"validInfo":	<String>,
	"mask":				selected mask,
	"version":		QR-version <1-40>,
	"width":			Symbol width in QR "pixels" (modules)
	"embedWidth"	Relative width of embedded image
	"result":			Depending on selected outputType one of:
						"svgFull"		- <String> Full SVG file
						"svgPath"		- <String> SVG <path> describing the symbol
						"canvas"		- <String> "CANVAS_OK"
						"rawArray"	- <Uint8Array> where value of each pixel is one element
						"unmasked"	- <Uint8Array> same as above but no masking applied
						Possible values for the array elements are:
							0 pixel is white and NOT part of functional pattern
							1 pixel is black and NOT part of functional pattern
							2 pixel is white and IS part of functional pattern
							3 pixel is black and IS part of functional pattern
}
*/
```
<properties> is an object describing the wanted properties for the symbol:
The key is optional if it has some default.

```JavaScript
{
	"maskNumber":	<1-9> - Default 9 /* 9 is autoselect */
	"eccLevel":		<1-4> - Default 3
	"padding":		<Number> - Default 3 /* whitespace around symbol in module units */
	"outputType": "svgFull", "svgPath", "canvas", "rawArray", "unmasked"
	"canvasProperties": <Object> /* Required for outputType "canvas" */
		{
			"canvasElement":	<HTMLCanvasElement>,
			"containerSize":	Width of the element that contains the <canvas>,
			"scale":					Default: 6 - Width of one module in pixels
		}
		// modules are scaled to fit containerSize if the key exists
		// Otherwise, modules will be drawn as scale x scale (px) rectangles
	"image":	<Object> /* Optional small image to be embedded inside the symbol */
		{
			"path":		<dataURI>,
			"scale":	<0-1> Default: 0 - Size relative to the symbol,
			"shape":	"circle", "square"
			"offset": <1-7> Default: 7 - Fine-tune whether some modules are shown or not close to the edge of the embedded image
		}
}
```
Notice that image is only supported on SVG output. The embedded image will be encoded in the SVG string when using svgFull output. When using svgPath the generator won't embed the image but prevents the modules that are within the images area from being drawn. In such case the size of the embedded image is passed to the result object in embedWidth key and some accompanying function should be used to update the inline SVG.

You should use higher ECC levels when embedding an image because it effectively destroys the symbol and successful decoding will require error correction. 

# Example on typical usage

```JavaScript
var input = "Hello, World";
var SVGPath = document.getElementById("mySVGPath");
var SVGLogo = document.getElementById("mySVGLogo")
var logo = <dataURI>;
var codeGen = new QRier_Gen();
var properties =
{
"maskNumber": 9, // auto-select
"eccLevel": 4,
"outputType": "svgPath",
"image":{
	"path": logo,
	"scale": 0.4,
	"shape": "circle"
	}
}
var result = codeGen.make(input, properties);
SVGPath.setAttribute("d", result.result);
// Resize the SVG - parentNode is SVG root here
SVGPath.parentNode.setAttribute("viewBox", "0 0 " + result.width + " " + result.width);
(function(SVGLogo, result.width, result.embedWidth, shape){
	...
	// Set properties here
	...
})();
console.log("QR version: " + result.version + " with mask: " + result.mask);
```