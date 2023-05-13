/*
 *  QRier QR-code generator library
 *
 *  Copyright (C) 2017 - 2022  MrOtherGuy
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>
 *
 * Contact: jastekken@outlook.com
 *
 */

import { QRier_ECCGen } from "./ECCGen.js";
import { QRFrame } from "./qrFrame.js";

class QRier_Gen{
  #ECCGen;
  constructor(){
    this.#ECCGen = new QRier_ECCGen({ fcr: 0 });
  }
  
  make(str_input, info){
  //  str_input - input string
  //  info.maskNumber - mask number 1-9, 9 means automatic
  //  info.eccLevel - error correction level 1-4
  //  info.padding - empty space around symbol in module units
  //  info.outputType -   svgPath   - return a string describing svg path
  //                      svgFull   - return a full svg file as string
  //                      canvas    - draws output to specified canvas
  //                      rawArray  - returns the symbol as Array
  //                      unmasked  - returns the Array without a mask
  //  info.canvasProperties - {
  //                            canvasElement: <HTMLCanvasElement>,
  //                            scale: Width of one module in pixels,
  //                            containerSize: Width of the containing element in pixels
  //                          }
  //  Eventual width of the image is <containerSize> if the property exists
  //  If not, then width of one module is <scale>
  //  (or default 6px when width is not defined) 
  // 
  //  info.image - {
  //                 path: <dataURI>,
  //                 scale: [0-1.0],
  //                 shape: ["circle","square"],
  //                 offset: [1-12], 6 = "center"
  //               }
  //  Scale is relative to symbol size without padding
  //  Shape, scale and offset are used to determine if the module in that coordinate is drawn or not
    
    // SETTINGS VALIDATION
    // clampToRange returns 0 for invalid values in which case defaults are used
    let selectedMask = QRier_Gen.#clampToRange(info.maskNumber, 1, 9, true) || 0x9;
    const eccLevel = QRier_Gen.#clampToRange(info.eccLevel, 1, 4, true) || 0x3;
    // clamping imagePadding to range 0-12 is kinda arbitrary
    // but such a huge padding doesn't make sense in any scenario
    // so in practice this just prevents errors.
    const padding = QRier_Gen.#clampToRange(info.padding, 0, 12, false) || 3;
    const logoInfo = info.image || {"width":0};
    logoInfo.width = QRier_Gen.#clampToRange(logoInfo.width, 0, 1, false) || 0;
    logoInfo.offset = QRier_Gen.#clampToRange(logoInfo.offset, 1, 12, true) || 0x7;
    
    if (!QRier_Gen.#isOutputVariant(info.outputType)){
      throw new Error(`outputType: ${info.outputType} is not valid`);
    }
    
    // Canvas output needs a canvas to draw to
    if (info.outputType === QRier_Gen.OUTPUTMODE_CANVAS){
      if (!info.canvasProperties.canvasElement instanceof HTMLCanvasElement){
        throw new Error("invalid reference to <canvas>")
      }
    }
    
    const a_input = QRier_Gen.#strToArray(str_input);
    // No data, no code
    if(!a_input || a_input.length == 0){
      return QRier_Gen.QRier_Result.Empty();
    }
    
    const format = QRier_Gen.#Version.from(a_input.length, eccLevel);
    const width = 17 + 4 * format.version;
    const rawFrame = new QRFrame(this.encodeData(a_input,format),format);
    selectedMask = rawFrame.determineMask(selectedMask);

    let result;
    switch (info.outputType){
      case QRier_Gen.OUTPUTMODE_CANVAS:
        let scale;
        // if containerSize is defined the symbol is fit to screen
        // if not defined then we use scale (or 6 if scale isn't defined)
        if ( QRier_Gen.#clampToRange(info.canvasProperties.containerSize, width + 2 * padding, Infinity, true) === 0){
          scale = Math.max(1,info.canvasProperties.scale|0) || 6;
        } else{
          // scale < 1 doesn't make any sense
          scale = Math.max(1,Math.floor(info.canvasProperties.containerSize / (width + 2 * padding)));
        }
        result = QRier_Gen.drawCanvas(info.canvasProperties.canvasElement,rawFrame,width,scale,padding);
        break;
      case QRier_Gen.OUTPUTMODE_SVG:
        result = QRier_Gen.makeSVG(rawFrame,width,padding,logoInfo);
        break;
      case QRier_Gen.OUTPUTMODE_PATH:
        result = QRier_Gen.createSVGPath(rawFrame,width,padding,logoInfo);
        break;
      case QRier_Gen.OUTPUTMODE_UNMASKED:
        // XOR undoes the selected mask and fall through
        rawFrame.applyMask(selectedMask, false);
      case QRier_Gen.OUTPUTMODE_ARRAY:
        result = rawFrame;
        break;
      default:
        throw "output type: " + info.outputType + " is not supported";
        break;
    }
    return new QRier_Gen.QRier_Result(
      true,
      "QRIER_OK",
      selectedMask,
      format.version,
      result,
      width + 2 * padding,
      logoInfo.width * width
    )
  }
  
  static drawCanvas(canvasElem, qrImage, width, scale, padding){
    const ctx = canvasElem.getContext("2d");
    const imageWidth = scale * (width + (2 * padding));
    canvasElem.width = imageWidth;
    canvasElem.height = imageWidth;
    ctx.clearRect(0, 0, imageWidth, imageWidth);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,imageWidth,imageWidth);
    ctx.fillStyle = "#000";
    for( let i = 0; i < width; i++ ){
      for( let j = 0; j < width; j++ ){
        if( qrImage.getPixel(j,i) ){
          ctx.fillRect(scale * (padding + j),scale * (padding + i),scale,scale);
        }
      }
    }
    return "CANVAS_OK"
  }
  
  static createCodes(a_str,format){
    const MODE_INDICATOR_LENGTH = 4;
    const byte_capacity = format.dataLength;
    const charCount = a_str.length;
    const charCountIndicatorLength = format.version < 10 ? 8 : 16;
    const dataLength = MODE_INDICATOR_LENGTH + charCountIndicatorLength + charCount * 8;
  
    const i_padZeros = Math.min(byte_capacity * 8 - dataLength, 4);
    const mod = (8 - ((dataLength + i_padZeros) & 0x7)) & 0x7;
    let dif_c = (byte_capacity * 8 - (dataLength + i_padZeros + mod)) / 8;

    let arr_data = new Uint8Array(byte_capacity);
    let idx = 0;
    // This does't support anything other than byte encoding 0100 = 4
    arr_data[idx] = (4 << 4) + (charCount >> (charCountIndicatorLength - 4));
    idx++;
    if(charCountIndicatorLength === 16){
      arr_data[idx] = (charCount >> 4) & 0xff;
      idx++;
    }
    arr_data[idx] = (charCount << 4) + (a_str[0] >> 4);
    idx++;
    for(let i = 1; i < a_str.length;i++){
      arr_data[idx] = (a_str[i - 1] << 4) + (a_str[i] >> 4);
      idx++;
    }
    arr_data[idx] = (a_str[a_str.length - 1] << 4);
    idx++;
    // At this point there should be correct zero paddings because of the left shifts
    while(dif_c > 0){
      arr_data[idx++] = 0xec;
      if(dif_c > 1){
        arr_data[idx++] = 0x11;
        dif_c -= 2;
      }else{
        break;
      }
    }
    return arr_data;
  }

  encodeData(a_inputStr,format){
    // Datacodes will include mode,character count of the input string and actual string
    let datacodes = QRier_Gen.createCodes(a_inputStr,format);
    // Payload data array is ready now

    // Array to store resulting data
    var a_final = new Uint8Array(format.dataLength + (format.neccblk1 + format.neccblk2) * format.eccblkwid);
    // Create ecc blocks and store them to array
    let a_ecc_blocks = new Array(format.neccblk1 + format.neccblk2);
    let dataOffset = 0;
    let eccProperties = {
      "ecWidth":format.eccblkwid,
      "dataWidth":format.datablkw,
      "data":null
    };
    let i = 0; 
    for (i;i < format.neccblk1;i++){
      eccProperties.data = datacodes.slice(dataOffset,dataOffset + format.datablkw);
      a_ecc_blocks[i] = this.#ECCGen.makeECC(eccProperties);
      dataOffset += format.datablkw;
    }
    // Group2 ECC are computed for 1 longer blocks, ECC width is the same
    eccProperties.dataWidth += 1;
    for (i;i < a_ecc_blocks.length;i++){
      eccProperties.data = datacodes.slice(dataOffset,dataOffset + format.datablkw + 1);
      a_ecc_blocks[i] = this.#ECCGen.makeECC(eccProperties);
      dataOffset += (format.datablkw + 1);
    }
    
    // Interleave data codes
    dataOffset = 0;
    const datablk2offset = format.neccblk1 * format.datablkw;
    i = 0;
    for (i; i < format.datablkw;i++){
      for (let j = 0;j < format.neccblk1;j++){
        a_final[dataOffset] = datacodes[i + j * format.datablkw];
        dataOffset++;
      }
      for (let j = 0; j < format.neccblk2;j++){
        a_final[dataOffset] = datacodes[datablk2offset + i + (j * (format.datablkw + 1))];
        dataOffset++;
      }
    }
    // Last bits only go to block2
    for (let j = 0; j < format.neccblk2;j++){
      a_final[dataOffset] = datacodes[datablk2offset + i + (j * (format.datablkw + 1))];
      dataOffset++;
    }
    // ECC blocks come last
    for (let i = 0; i < format.eccblkwid; i++){
      for(let j = 0; j < a_ecc_blocks.length; j++){
        a_final[dataOffset] = a_ecc_blocks[j][i];
        dataOffset++;
      }
    }
    return a_final;
  }
  
  static makeSVG(qrImage, width, pad, img){
    const symbolWidth = width + pad * 2;
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ${symbolWidth} ${symbolWidth}" stroke="none" preserveAspectRatio="xMidYMid meet">
<defs>
<clipPath id="dataClip">
<circle cx="50%" cy="50%" r="${(width * img.width / 2)}"></circle>
</clipPath>
</defs>
<rect width="100%" height="100%" fill="white"></rect>
<path d="`;
    svg += QRier_Gen.createSVGPath(qrImage, width, pad, img);
    svg += '" fill="black"></path>\n';
    if(img.width){
      const shapeStyle = img.shape === "circle" ? 'clip-path="url(#dataClip)"':"";
      img.width *= width;
      const pos = (symbolWidth - img.width) / 2;
      svg += `<image x="${pos}" y="${pos}" width="${img.width}" height="${img.width}" xlink:href="${img.path}" ${shapeStyle}></image>\n`;
    }
    svg += '</svg>\n';
    return svg
  }
  
  static createSVGPath(qrFrame,width,pad,img){
    let radius = (img.width * width) / 2 || 0;
    radius *= radius;
    const shape = (radius === 0) ? null : img.shape === undefined ? null : img.shape;
    // Create a bit free room around icon
    radius += ((img.offset - 6 ) * Math.abs(img.offset - 6));
    let dy, dx;
    dy = dx = (width >> 1);
    let dy_sqr = dy * dy;
    let svg = "";
    let usable = true;
    for (let y = pad; y < width + pad; y++){
      for (let x = pad; x < width + pad; x++){
        switch(shape){
          case "circle":
            usable = (dx * dx) + dy_sqr > radius;
            dx--;
            break;
          case "square":
            usable = radius < dy_sqr || radius < (dx * dx);
            dx--;
            break;
          default:
          //  usable = true;
            break;
        }
        
        if (usable && qrFrame.getPixel(x - pad, y - pad)){
          svg += `M${x},${y} h1v1h-1z `;
        }
      }
      if(shape != null){
        dy--;
        dy_sqr = dy * dy;
        dx += width; 
      }
    }
    return svg
  }
  
  static #strToArray(str){
    const uString = encodeURI(str);
    let result = [];
    for (let i = 0; i < uString.length; i++){
      if(uString[i] === "%"){
        result.push( Number.parseInt( uString.substr(i + 1, 2), 16) );
        i += 2;
      }else{
        result.push( uString.charCodeAt(i) );
      }
    }
    return result
  }
    
  static #Version = class{
    constructor(version, ecclevel, neccblk1, neccblk2, datablkw, eccblkwid, dataLength){
      this.version = version;
      this.ECCLevel = ecclevel;
      this.neccblk1 = neccblk1;
      this.neccblk2 = neccblk2;
      this.datablkw = datablkw;
      this.eccblkwid = eccblkwid;
      this.dataLength = dataLength;
    }
    static from(len,level){
      let neccblk1,neccblk2,datablkw,eccblkwid,max_length;
      let version = this.approximate(len,level);
      let offset = (level - 1) * 4 + (version - 1) * 16;
      while (version < 41){
        neccblk1 = this.blockFormats[offset];
        neccblk2 = this.blockFormats[offset + 1];
        datablkw = this.blockFormats[offset + 2];
        eccblkwid = this.blockFormats[offset + 3];
        max_length = datablkw * (neccblk1 + neccblk2) + neccblk2 - 3 + (version <= 9);
        if (len <= max_length){
          break;
        }
        version++;
        offset += 16;
      }
      if (version >= 41){
        throw "Data is too long"
      }
      let datalength = datablkw * (neccblk1 + neccblk2) + neccblk2;
      return new QRier_Gen.#Version(
        version,
        level,
        neccblk1,
        neccblk2,
        datablkw,
        eccblkwid,
        datalength
      )
    }
    static approximate(len,q){
      let v = 1;
      let cap = 22 - (q * 3) - (q & 4 >> 2);
      let c = 18 - q * 3;
      q = 4 - (q >> 1);
      while(len > cap){
        cap += c;
        c += q;
        v++;
      }
      return v;
    }
    static blockFormats = new Uint8Array([
    1,0,19,7,1,0,16,10,1,0,13,13,1,0,9,17,
    1,0,34,10,1,0,28,16,1,0,22,22,1,0,16,28,
    1,0,55,15,1,0,44,26,2,0,17,18,2,0,13,22,
    1,0,80,20,2,0,32,18,2,0,24,26,4,0,9,16,
    1,0,108,26,2,0,43,24,2,2,15,18,2,2,11,22,
    2,0,68,18,4,0,27,16,4,0,19,24,4,0,15,28,
    2,0,78,20,4,0,31,18,2,4,14,18,4,1,13,26,
    2,0,97,24,2,2,38,22,4,2,18,22,4,2,14,26,
    2,0,116,30,3,2,36,22,4,4,16,20,4,4,12,24,
    2,2,68,18,4,1,43,26,6,2,19,24,6,2,15,28,
    4,0,81,20,1,4,50,30,4,4,22,28,3,8,12,24,
    2,2,92,24,6,2,36,22,4,6,20,26,7,4,14,28,
    4,0,107,26,8,1,37,22,8,4,20,24,12,4,11,22,
    3,1,115,30,4,5,40,24,11,5,16,20,11,5,12,24,
    5,1,87,22,5,5,41,24,5,7,24,30,11,7,12,24,
    5,1,98,24,7,3,45,28,15,2,19,24,3,13,15,30,
    1,5,107,28,10,1,46,28,1,15,22,28,2,17,14,28,
    5,1,120,30,9,4,43,26,17,1,22,28,2,19,14,28,
    3,4,113,28,3,11,44,26,17,4,21,26,9,16,13,26,
    3,5,107,28,3,13,41,26,15,5,24,30,15,10,15,28,
    4,4,116,28,17,0,42,26,17,6,22,28,19,6,16,30,
    2,7,111,28,17,0,46,28,7,16,24,30,34,0,13,24,
    4,5,121,30,4,14,47,28,11,14,24,30,16,14,15,30,
    6,4,117,30,6,14,45,28,11,16,24,30,30,2,16,30,
    8,4,106,26,8,13,47,28,7,22,24,30,22,13,15,30,
    10,2,114,28,19,4,46,28,28,6,22,28,33,4,16,30,
    8,4,122,30,22,3,45,28,8,26,23,30,12,28,15,30,
    3,10,117,30,3,23,45,28,4,31,24,30,11,31,15,30,
    7,7,116,30,21,7,45,28,1,37,23,30,19,26,15,30,
    5,10,115,30,19,10,47,28,15,25,24,30,23,25,15,30,
    13,3,115,30,2,29,46,28,42,1,24,30,23,28,15,30,
    17,0,115,30,10,23,46,28,10,35,24,30,19,35,15,30,
    17,1,115,30,14,21,46,28,29,19,24,30,11,46,15,30,
    13,6,115,30,14,23,46,28,44,7,24,30,59,1,16,30,
    12,7,121,30,12,26,47,28,39,14,24,30,22,41,15,30,
    6,14,121,30,6,34,47,28,46,10,24,30,2,64,15,30,
    17,4,122,30,29,14,46,28,49,10,24,30,24,46,15,30,
    4,18,122,30,13,32,46,28,48,14,24,30,42,32,15,30,
    20,4,117,30,40,7,47,28,43,22,24,30,10,67,15,30,
    19,6,118,30,18,31,47,28,34,34,24,30,20,61,15,30
  ]);
  }

  static #clampToRange(value, min, max, isInteger){
    if( typeof value != "number" || value < 0 ){
      return 0
    }
    if(value < min){
      value = min;
    }else{
      if( value > max){
        value = max;
      }
    }
    if( isInteger ){
      value |= 0;
    }
    return value;
  }
  
  static MODE_NUMERIC = Symbol("0001");
  static MODE_ALPHANUMERIC = Symbol("0010");
  static MODE_BYTE = Symbol("0100");
  static MODE_KANJI = Symbol("1000");
  
  static OUTPUTMODE_CANVAS = Symbol("canvas");
  static OUTPUTMODE_SVG = Symbol("svg");
  static OUTPUTMODE_PATH = Symbol("path");
  static OUTPUTMODE_ARRAY = Symbol("array");
  static OUTPUTMODE_UNMASKED = Symbol("unmasked");
  
  static #isOutputVariant;
  static{
    this.#isOutputVariant = (some) => {
      switch(some){
        case this.OUTPUTMODE_CANVAS:
        case this.OUTPUTMODE_SVG:
        case this.OUTPUTMODE_PATH:
        case this.OUTPUTMODE_ARRAY:
        case this.OUTPUTMODE_UNMASKED:
          return true
      }
      return false
    }
  }
  
  static QRier_Result = class{
    constructor(isValid = null, why = null, mask = null, version = null, resultData = null, width = null, logoWidth = null){
      this.isValid =    isValid;
      this.validInfo =  why;
      this.mask =       mask;
      this.version =    version;
      this.result =     resultData;
      this.width =      width;
      this.embedWidth = logoWidth;
    }
    static Empty(){
      return new QRier_Gen.QRier_Result(false,"No Data", null, null, null, 0, 0);
    }
  }
}

export { QRier_Gen }