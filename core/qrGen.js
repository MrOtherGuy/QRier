/*
    QRier QR-code generator library
		
    Copyright (C) 2017 - 2018  MrOtherGuy

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>
		
		Contact: qrier_dev@outlook.com
		
*/

'use strict'

function QRcode (){
	try{
		var rs = new RSECC({polynomial:0x11d,fieldSize:256,fcr:0});
	}catch(e){
		console.log(e);
		return null;
	}
	var currentSymbol = null;
	var blockFormats = new Uint8Array([
    1, 0, 19, 7, 1, 0, 16, 10, 1, 0, 13, 13, 1, 0, 9, 17,
    1, 0, 34, 10, 1, 0, 28, 16, 1, 0, 22, 22, 1, 0, 16, 28,
    1, 0, 55, 15, 1, 0, 44, 26, 2, 0, 17, 18, 2, 0, 13, 22,
    1, 0, 80, 20, 2, 0, 32, 18, 2, 0, 24, 26, 4, 0, 9, 16,
    1, 0, 108, 26, 2, 0, 43, 24, 2, 2, 15, 18, 2, 2, 11, 22,
    2, 0, 68, 18, 4, 0, 27, 16, 4, 0, 19, 24, 4, 0, 15, 28,
    2, 0, 78, 20, 4, 0, 31, 18, 2, 4, 14, 18, 4, 1, 13, 26,
    2, 0, 97, 24, 2, 2, 38, 22, 4, 2, 18, 22, 4, 2, 14, 26,
    2, 0, 116, 30, 3, 2, 36, 22, 4, 4, 16, 20, 4, 4, 12, 24,
    2, 2, 68, 18, 4, 1, 43, 26, 6, 2, 19, 24, 6, 2, 15, 28,
    4, 0, 81, 20, 1, 4, 50, 30, 4, 4, 22, 28, 3, 8, 12, 24,
    2, 2, 92, 24, 6, 2, 36, 22, 4, 6, 20, 26, 7, 4, 14, 28,
    4, 0, 107, 26, 8, 1, 37, 22, 8, 4, 20, 24, 12, 4, 11, 22,
    3, 1, 115, 30, 4, 5, 40, 24, 11, 5, 16, 20, 11, 5, 12, 24,
    5, 1, 87, 22, 5, 5, 41, 24, 5, 7, 24, 30, 11, 7, 12, 24,
    5, 1, 98, 24, 7, 3, 45, 28, 15, 2, 19, 24, 3, 13, 15, 30,
    1, 5, 107, 28, 10, 1, 46, 28, 1, 15, 22, 28, 2, 17, 14, 28,
    5, 1, 120, 30, 9, 4, 43, 26, 17, 1, 22, 28, 2, 19, 14, 28,
    3, 4, 113, 28, 3, 11, 44, 26, 17, 4, 21, 26, 9, 16, 13, 26,
    3, 5, 107, 28, 3, 13, 41, 26, 15, 5, 24, 30, 15, 10, 15, 28,
    4, 4, 116, 28, 17, 0, 42, 26, 17, 6, 22, 28, 19, 6, 16, 30,
    2, 7, 111, 28, 17, 0, 46, 28, 7, 16, 24, 30, 34, 0, 13, 24,
    4, 5, 121, 30, 4, 14, 47, 28, 11, 14, 24, 30, 16, 14, 15, 30,
    6, 4, 117, 30, 6, 14, 45, 28, 11, 16, 24, 30, 30, 2, 16, 30,
    8, 4, 106, 26, 8, 13, 47, 28, 7, 22, 24, 30, 22, 13, 15, 30,
    10, 2, 114, 28, 19, 4, 46, 28, 28, 6, 22, 28, 33, 4, 16, 30,
    8, 4, 122, 30, 22, 3, 45, 28, 8, 26, 23, 30, 12, 28, 15, 30,
    3, 10, 117, 30, 3, 23, 45, 28, 4, 31, 24, 30, 11, 31, 15, 30,
    7, 7, 116, 30, 21, 7, 45, 28, 1, 37, 23, 30, 19, 26, 15, 30,
    5, 10, 115, 30, 19, 10, 47, 28, 15, 25, 24, 30, 23, 25, 15, 30,
    13, 3, 115, 30, 2, 29, 46, 28, 42, 1, 24, 30, 23, 28, 15, 30,
    17, 0, 115, 30, 10, 23, 46, 28, 10, 35, 24, 30, 19, 35, 15, 30,
    17, 1, 115, 30, 14, 21, 46, 28, 29, 19, 24, 30, 11, 46, 15, 30,
    13, 6, 115, 30, 14, 23, 46, 28, 44, 7, 24, 30, 59, 1, 16, 30,
    12, 7, 121, 30, 12, 26, 47, 28, 39, 14, 24, 30, 22, 41, 15, 30,
    6, 14, 121, 30, 6, 34, 47, 28, 46, 10, 24, 30, 2, 64, 15, 30,
    17, 4, 122, 30, 29, 14, 46, 28, 49, 10, 24, 30, 24, 46, 15, 30,
    4, 18, 122, 30, 13, 32, 46, 28, 48, 14, 24, 30, 42, 32, 15, 30,
    20, 4, 117, 30, 40, 7, 47, 28, 43, 22, 24, 30, 10, 67, 15, 30,
    19, 6, 118, 30, 18, 31, 47, 28, 34, 34, 24, 30, 20, 61, 15, 30
]);

	var alignment_deltas = [0, 11, 15, 19, 23, 27, 31,16, 18, 20, 22, 24, 26, 28, 20, 22, 24, 24, 26, 28, 28, 22, 24, 24,26, 26, 28, 28, 24, 24, 26, 26, 26, 28, 28, 24, 26, 26, 26, 28, 28];
	var version_pattern = [0xc94, 0x5bc, 0xa99, 0x4d3, 0xbf6, 0x762, 0x847, 0x60d,0x928, 0xb78, 0x45d, 0xa17, 0x532, 0x9a6, 0x683, 0x8c9,0x7ec, 0xec4, 0x1e1, 0xfab, 0x08e, 0xc1a, 0x33f, 0xd75,0x250, 0x9d5, 0x6f0, 0x8ba, 0x79f, 0xb0b, 0x42e, 0xa64,0x541, 0xc69];
	var format_pattern = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed,0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b];
	
	var supportSlice = (typeof(new Uint8Array(1).slice) === "function");
	
	var diySlice = function(start, end){
			end = end || this.length;
			start = Math.min(Math.max(0, start),this.length);
			if (this.length < end ){
				end = this.length;
			}
			var a = new Uint8Array(end - start);
			for (var i = 0; i < a.length; i++){
				a[i] = this[start + i];
			}
			return a;
	};
	
	var getPixel = function(x,y){
		return this[x + this.width * y] & 1;
	};
	var isMasked = function(x,y){
		return !!(this[x + this.width * y] & 2);
	};
	
	var setBlack = function(x,y){
		this[x + this.width * y] = 1;
	};
	
	var setMask = function(x,y,n){
		this[x + this.width * y] = n;
	};
	
	// Returns a version number which is nearly enough to fit data
	function approximateVersion(len,q){
		var v = 1;
		var cap = [19,16,13,9][q - 1];
		var c = [15,12,9,6][q - 1];
		q = 4 - (q >> 1);
		while(len > cap){
			cap += c;
			c += q;
			v++;
		}
		return v;
	}
	// Loop through version data until data fits the frame
	function findVersion(len,level){
		var neccblk1,neccblk2,datablkw,eccblkwid,max_length;
		var version = approximateVersion(len,level);
		var offset = (level - 1) * 4 + (version - 1) * 16;
		while (version < 41){
			neccblk1 = blockFormats[offset];
			neccblk2 = blockFormats[offset + 1];
			datablkw = blockFormats[offset + 2];
			eccblkwid = blockFormats[offset + 3];
			max_length = datablkw * (neccblk1 + neccblk2) + neccblk2 - 3 + (version <= 9);
			if (len <= max_length){
				break;
			}
			version++;
			offset += 16;
		}
		if (version >= 41){
			throw "Data is too long "
		}
		var datalength = datablkw * (neccblk1 + neccblk2) + neccblk2;
	return {"version":version,"neccblk1":neccblk1,"neccblk2":neccblk2,"datablkw":datablkw,"eccblkwid":eccblkwid,"datalength":datalength}
}
	
	function createCodes(a_str,version,byte_capacity,modeIndicator){

		var charCount = a_str.length;
		var charCountIndicatorLength = version < 10 ? 8 : 16;
		var dataLength = modeIndicator.length + charCountIndicatorLength + charCount * 8;
	
		var i_padZeros = Math.min(byte_capacity * 8 - dataLength, 4);
		var mod = (8 - ((dataLength + i_padZeros) & 0x7)) & 0x7;
		var dif_c = (byte_capacity * 8 - (dataLength + i_padZeros + mod)) / 8;
		var dif_cRem = 0;
		var padBytes = [0xec,0x11];
		var arr_data = new Uint8Array(byte_capacity);
		var idx = 0;
		// This does't support anything other than byte encoding 0100 = 4
		arr_data[idx] = (4 << 4) + (charCount >> (charCountIndicatorLength - 4));
		idx++;
		if(charCountIndicatorLength === 16){
			arr_data[idx] = (charCount >> 4) & 0xff;
			idx++;
		}
		arr_data[idx] = (charCount << 4) + (a_str[0] >> 4);
		idx++;
		for(var i = 1; i < a_str.length;i++){
			arr_data[idx] = (a_str[i - 1] << 4) + (a_str[i] >> 4);
			idx++;
		}
		arr_data[idx] = (a_str[a_str.length - 1] << 4);
		idx++;
		// At this point there should be correct zero paddings because of the left shifts
		while(dif_c){
			arr_data[idx] = padBytes[dif_cRem];
			dif_cRem ^= 1;
			idx++;
			dif_c--;
		}
		return arr_data;
	}

	function encodeData(a_inputStr,format){
	// Datacodes will include mode,character count of the input string and actual string

		var modes = {"Numeric":"0001","Alphanumeric":"0010","Byte":"0100","Kanji":"1000"};
	// Only Byte mode is supported for now;
		var mode = modes.Byte;
		var datacodes = createCodes(a_inputStr,format.version,format.datalength,mode);
		// Payload data array is ready now
		if(!supportSlice){
			Object.defineProperty(datacodes,"slice",{value:diySlice});
		}
		// Array to store resulting data
		var a_final = new Uint8Array(format.datalength + (format.neccblk1 + format.neccblk2) * format.eccblkwid);
		// Create ecc blocks and store them to array
		var a_ecc_blocks = new Array(format.neccblk1 + format.neccblk2);
		var dataOffset = 0;
		for (var i = 0;i < format.neccblk1;i++){
			a_ecc_blocks[i] = rs.makeECC({"ecWidth":format.eccblkwid,"dataWidth":format.datablkw,"data":datacodes.slice(dataOffset,dataOffset + format.datablkw)});
			dataOffset += format.datablkw;
		}
		for (i;i < a_ecc_blocks.length;i++){
			a_ecc_blocks[i] = rs.makeECC({"ecWidth":format.eccblkwid,"dataWidth":format.datablkw + 1,"data":datacodes.slice(dataOffset,dataOffset + format.datablkw + 1)});
			dataOffset += (format.datablkw + 1);
		}
		// Interleave data codes
		dataOffset = 0;
		var datablk2offset = format.neccblk1 * format.datablkw;
		for (i = 0; i < format.datablkw;i++){
			for (var j = 0;j < format.neccblk1;j++){
				a_final[dataOffset] = datacodes[i + j * format.datablkw];
				dataOffset++;
			}
			for (j = 0; j < format.neccblk2;j++){
				a_final[dataOffset] = datacodes[datablk2offset + i + (j * (format.datablkw + 1))];
				dataOffset++;
			}
		}
		// Last bits only go to block2
		for (j = 0; j < format.neccblk2;j++){
			a_final[dataOffset] = datacodes[datablk2offset + i + (j * (format.datablkw + 1))];
			dataOffset++;
		}
		// ECC blocks come last
		for (i = 0; i < format.eccblkwid; i++){
			for(j=0; j < a_ecc_blocks.length; j++){
				a_final[dataOffset] = a_ecc_blocks[j][i];
				dataOffset++;
			}
		}
	
		return a_final;
	}
	
	function makeFrame(data,frameWidth,version){
		var qrFrame = new Uint8Array(frameWidth*frameWidth);
		// Add utility methods to the array object
		Object.defineProperty(qrFrame,"width",{value:frameWidth});
		Object.defineProperty(qrFrame,"isMasked",{value:isMasked});
		Object.defineProperty(qrFrame,"setBlack",{value:setBlack});
		Object.defineProperty(qrFrame,"setBlack",{value:setBlack});
		Object.defineProperty(qrFrame,"setMask",{value:setMask});
		Object.defineProperty(qrFrame,"getPixel",{value:getPixel});
		
	
	/* 
	*	Add function patterns to the frame.
	* Black bits are set to black - whites are set as masked ones
	* Blacks are set as masked only after all the function patterns are set
	*/
	
	// frame values:
	// 0 = white
	// 1 = black
	// 2 = white - masked (part of a function pattern)
	// 3 = black - masked (part of a function pattern)
	
	// setMask() takes the frame value as third parameter
	
	var createAlignmentPattern = function(x,y,frameWidth){
			var i;
			qrFrame.setMask(x , y, 3);
			for (i = -2; i < 2; i++) {
				qrFrame.setMask(x + i, y - 2, 3);
				qrFrame.setMask(x - 2, y + i + 1, 3);
				qrFrame.setMask(x + 2, y + i, 3);
				qrFrame.setMask(x + i + 1, y + 2, 3);
			}
			for (i = 0; i < 2; i++) {
					qrFrame.setMask(x - 1, y + i, 2);
					qrFrame.setMask(x + 1, y - i, 2);
					qrFrame.setMask(x - i, y - 1, 2);
					qrFrame.setMask(x + i, y + 1, 2);
			}
		};
		
	// Finder patterns
		
		var row,col;
		for (var i = 0; i < 3; i++) {
			row = 0;
			col = 0;
			if (i == 1){
				row = (frameWidth - 7);
			}
			if (i == 2){
				col = (frameWidth - 7);
			}
			qrFrame.setMask(col + 3, row + 3, 3);
			for (var j = 0; j < 6; j++) {
				qrFrame.setMask(col + j, row, 3);
				qrFrame.setMask(col, row + j + 1, 3);
				qrFrame.setMask(col + 6, row + j, 3);
				qrFrame.setMask(col + j + 1, row + 6, 3);
			}
			for (j = 1; j < 5; j++) {
				qrFrame.setMask(col + j, row + 1, 2);
				qrFrame.setMask(col + 1, row + j + 1, 2);
				qrFrame.setMask(col + 5, row + j, 2);
				qrFrame.setMask(col + j + 1, row + 5, 2);
			}
			for (j = 2; j < 4; j++) {
				qrFrame.setMask(col + j, row + 2, 3);
				qrFrame.setMask(col + 2, row + j + 1, 3);
				qrFrame.setMask(col + 4, row + j, 3);
				qrFrame.setMask(col + j + 1, row + 4, 3);
			}
		}
	
	// Alignment blocks
	
		if (version > 1) {
			var dt = alignment_deltas[version];
			var y = frameWidth - 7;
			for (;;) {
				var x = frameWidth - 7;
				while (x > dt - 3) {
					createAlignmentPattern(x, y, frameWidth);
					// This seems unnecessary but is can happen in versions > 35
					if (x < dt){
						break;
					}
					x -= dt;
				}
				if (y <= dt + 9){
					break;
				}
				y -= dt;
				createAlignmentPattern(6, y, frameWidth);
				createAlignmentPattern(y, 6, frameWidth);
			}
		}
	
	// single black, needs to be there
		qrFrame.setMask(8, frameWidth - 8, 3);
	// timing gap - whites
		for (y = 0; y < 7; y++) {
			qrFrame.setMask(7, y, 2);
			qrFrame.setMask(frameWidth - 8, y, 2);
			qrFrame.setMask(7, y + frameWidth - 7, 2);
		}
		for (x = 0; x < 8; x++) {
			qrFrame.setMask(x, 7, 2);
			qrFrame.setMask(x + frameWidth - 8, 7, 2);
			qrFrame.setMask(x, frameWidth - 8, 2);
		}
	
	// reserve mask-format area
		for (x = 0; x < 9; x++){
			qrFrame.setMask(x, 8, 2);
		}
		for (x = 0; x < 8; x++) {
			qrFrame.setMask(x + frameWidth - 8, 8, 2);
			qrFrame.setMask(8, x, 2);
		}
		for (y = 0; y < 7; y++){
			qrFrame.setMask(8, y + frameWidth - 7, 2);
		}

// timing row/col
		for (x = 0; x < frameWidth - 14; x++){
			qrFrame[8 + x + frameWidth * 6] = 3 - (x & 1);
		}
		for (x = 0; x < frameWidth - 14; x++){
			qrFrame[6 + frameWidth * (8 + x)] = 3 - (x & 1)
		}
		
// version block
		if (version > 6) {
			var pattern = version_pattern[version - 7];
			var k = 17;
			var t;
			for (x = 0; x < 6; x++){
				for (y = 0; y < 3; y++, k--){
					t = (1 & (k > 11 ? version >> (k - 12) : pattern >> k));
					qrFrame[(5 - x) + frameWidth * (2 - y + frameWidth - 11)] = 2 + t
					qrFrame[(2 - y + frameWidth - 11) + frameWidth * (5 - x)] = 2 + t
				}
			}
		}
		
	// Function patterns in place - now add data
		pushDataToFrame(qrFrame, data);
	
		return qrFrame
	}
	
	function pushDataToFrame(qrFrame,data){
		// position initialized to bottom right
		var x_pos, y_pos, goingLeft, goingUp, max_idx;
		goingUp = goingLeft = true;
		x_pos = y_pos = max_idx = qrFrame.width - 1;
		var limit = 0;
		for (var i = 0; i < data.length; i++) {
			for (var j = 7; j >= 0; j--) {
				if ((data[i] >> j) & 1){
					qrFrame.setBlack(x_pos,y_pos);
				}
				// Adjust x,y until next unmasked coordinate is found
				do{
					if (goingLeft){
						x_pos--;
					} else {
						x_pos++;
						if (y_pos != limit){
							goingUp ? y_pos-- : y_pos++;
						} else {
							limit = goingUp ? max_idx : 0;
							x_pos -= 2;
							goingUp = !goingUp;
							if (x_pos === 6){
								x_pos--;
								y_pos += goingUp ? -8 : 9;
							}
						}
					}
					goingLeft = !goingLeft;
				} while (qrFrame.isMasked(x_pos, y_pos));
			}
		}
	}
	
	// Calculate how bad the masked image is
	// blocks, imbalance, long runs of one color, or finder similarity.
	// Function patterns should maybe be excluded from badness test but since mask doesn't change them they give same score for each mask 
	function testFrame(maskedFrame, width){

		// Badness coefficients.
		var N1 = 3, N2 = 3, N3 = 40, N4 = 10;
		var runLengths = [];		
		var x, y;
		var score = 0;
		var balance = 0;
		var state;
		// 2x2 blocks of same color.
		for (y = 0; y < width - 1; y++){
			for (x = 0; x < width - 1; x++){
				state = maskedFrame.getPixel(x, y) + maskedFrame.getPixel(x + 1, y) + maskedFrame.getPixel(x, y + 1) + maskedFrame.getPixel(x + 1, y + 1);
				if (!(state & 3)){
					score += N2;
				}
			}
		}
		// X runs
		var prev, current, idx;
		for(y = 0; y < width; y++){
			prev = maskedFrame.getPixel(0, y);
			runLengths[0] = 1;
			idx = 0;
			for(x = 1; x < width; x++){
				current = maskedFrame.getPixel(x, y);
				if(current === prev){
					runLengths[idx]++;
				}else{
					runLengths[++idx] = 1;
					prev = current;
				}
				balance += current ? 1 : -1;
			}
			score += runLength(runLengths, N1, N3, idx + 1);
		}
		// black/white imbalance
		if (balance < 0){
			balance = -balance;
		}
		var square = width * width;
		var count = 0;
		balance += balance << 2;
		balance <<= 1;
		while (balance > square){
			balance -= square;
			count++;
		}
		score += count * N4;
			// Y runs
		runLengths = [];
		for(x = 0; x < width; x++){
			prev = maskedFrame.getPixel(x, 0);
			runLengths[0] = 1;
			idx = 0;
			for(y = 1; y < width; y++){
				current = maskedFrame.getPixel(x, y);
				if(current === prev){
					runLengths[idx]++;
				}else{
					runLengths[++idx] = 1;
					prev = current;
				}
			}
			score += runLength(runLengths, N1, N3, idx + 1);
		}
		return score;
	}

	function runLength(runs, N1, N3, length){
		var i;
		var score = 0;
		for (i = 0; i < length; i++){
			if (runs[i] >= 5){
				score += N1 + runs[i] - 5;
			 }
		}
		// Finder-like pattern
		for (i = 2; i < length - 2; i++){
			// Treats inverted color finder-like patterns as finders
			if (runs[i] < 3 || runs[i] & 1 === 0){
				break
			}
			if (runs[i - 2] === runs[i + 2]
					&& runs[i + 2] === runs[i - 1]
					&& runs[i - 1] === runs[i + 1]
					&& runs[i - 1] * 3 === runs[i]
					){
						score += N3;
			}
		}
		return score;
	}
	
	function applyMask(qrFrame, mask, maskNum, width, newMask){
		// Don't generate new mask array when reversing
		if(newMask){
			//Make new mask
			var offset = 0;
			var r3x = 0;
			var r3y = 0;
			for (var y = 0; y < width; y++, r3y++){
				offset = y * width;
				r3y = r3y % 3;
				for (var x = 0, r3x = 0; x < width; x++){
					switch (maskNum) {
						case 1:
							mask[offset + x] = !((x + y) & 1) & !qrFrame.isMasked(x,y);
							break;
						case 2:
							mask[offset + x] = !(y & 1) & !qrFrame.isMasked(x,y);
							break;
						case 3:
							mask[offset + x] = !(x % 3) & !qrFrame.isMasked(x,y);
							break;
						case 4: 
							mask[offset + x] = !((x + y) % 3) & !qrFrame.isMasked(x,y);
							break;
						case 5:
							mask[offset + x] = !((((x / 3) | 0) + (y >> 1)) & 1) & !qrFrame.isMasked(x,y);
							break;
						case 6:
							mask[offset + x] = !((x & y & 1) + (r3x && r3y)) & !qrFrame.isMasked(x,y);
							r3x = (r3x + 1) % 3;
							break;
						case 7:
							mask[offset + x] = !(((x & y & 1) + (r3x && (r3x === r3y))) & 1) & !qrFrame.isMasked(x,y);
							r3x = (r3x + 1) % 3;
							break;
						case 8:
							mask[offset + x] = !(((r3x && (r3x === r3y)) + ((x + y) & 1)) & 1) & !qrFrame.isMasked(x,y);
							r3x = (r3x + 1) % 3;
							break;
						default:
							throw "mask number out of range"
							break;

					}
				}
			}
		}
		// XOR against mask
		for(var i = 0; i < qrFrame.length; i++){
			qrFrame[i] ^= mask[i];
		}
		return 0
	}
	
	function addFormatInfo(qrFrame, maskNumber, width, ecc_level){
		// Add format bits to the image
		var formatWord = format_pattern[maskNumber - 1 + ((ecc_level - 1) << 3)];
		var k;
		for (k = 0; k < 8; k++, formatWord >>= 1){
			qrFrame[width - 1 - k + 8 * width] = formatWord & 1;
			qrFrame[8 + (k + (k > 5)) * width] = formatWord & 1;
		}
		// high byte
		for (k = 0; k < 7; k++, formatWord >>= 1){
			qrFrame[8 + (width - 7 + k) * width] = formatWord & 1;
			qrFrame[6 - k + !(k) + 8 * width] = formatWord & 1;
		}
	}
	
	function strToArray(str){
		var uString = encodeURI(str);
		var result = [];
		for (var i = 0; i < uString.length;i++){
			if(uString[i] == "%"){
				result.push(parseInt(uString.substr(i + 1,2),16));
				i += 2;
			}else{
				result.push(uString.charCodeAt(i));
			}
		}
		return result
	}
	
	function drawCanvas(canvasElem, qrImage, width, scale, padding){
		var graphics = canvasElem.getContext("2d");
		var imageWidth = scale * (width + (2 * padding));
		canvasElem.width = imageWidth;
		canvasElem.height = imageWidth;
		graphics.clearRect(0, 0, imageWidth, imageWidth);
		graphics.fillStyle = "#fff";
		graphics.fillRect(0,0,imageWidth,imageWidth);
		graphics.fillStyle = "#000";
		for( var i = 0; i < width; i++ ){
			for( var j = 0; j < width; j++ ){
				if( qrImage.getPixel(j,i) ){
					graphics.fillRect(scale * (padding + j),scale * (padding + i),scale,scale);
				}
			}
		}
		return "success"
	}
	
	function makeSVG(qrImage, width, pad, img){
		var symbolWidth = width + pad * 2;
		var svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ' + symbolWidth + ' ' + symbolWidth + '" stroke="none" preserveAspectRatio="xMidYMid meet">\n<defs>\n<clipPath id="dataClip">\n<circle cx="50%" cy="50%" r="' + (width * img.width / 2) + '"></circle>\n</clipPath>\n</defs>\n<rect width="100%" height="100%" fill="white"></rect>\n<path d="';
		svg += getSVGPath(qrImage, width, pad, img);
		svg += '" fill="black"></path>\n';
		if(img.width){
			var shapeStyle = img.shape === "circle" ? 'clip-path="url(#dataClip)"':"";
			img.width *= width;
			var pos = (symbolWidth - img.width) / 2;
			svg += '<image x="' + pos + '" y="' + pos + '" width="' + img.width + '" height="' + img.width + '" xlink:href="' + img.path +'" ' + shapeStyle + '></image>\n';
		}
		svg += '</svg>\n';
		return svg
	}
	
	function getSVGPath(qrFrame,width,pad,img){
		var radius = (img.width * width) / 2 || 0;
		radius *= radius;
		var shape = img.shape || null;
		if (radius === 0){
			shape = null;
		}
		// Create a bit free room around icon
		radius += ((img.offset - 6 ) * Math.abs(img.offset - 6));
		var dy, dx;
		dy = dx = (width >> 1);
		var dy_sqr = dy * dy;
		var svg = "";
		var usable = true;
		for (var y = pad; y < width + pad; y++){
			for (var x = pad; x < width + pad; x++){
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
					//	usable = true;
						break;
				}
				
				if (usable && qrFrame.getPixel(x - pad, y - pad)){
					svg += "M" + (x) + "," + (y) + " h1v1h-1z ";
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
	
	function validate(value, min, max, type){
	if( typeof value != "number" ){
		return 0
	}
	var result = Math.min(Math.max(min, value), max);
	if( type === "u" ){
		result |= 0;
	}
	return result
}
	
	this.make = function(str_input,info){
	//	str_input - input string
	//	info.maskNumber - mask number 1-9, 9 means automatic
	//	info.eccLevel - error correction level 1-4
	//	info.imagePadding - empty space around symbol in module units
	//	info.outputType; -	svgPath		- return a string describing svg path
	//											svgFull		- return a full svg file as string
	//											canvas		- draws output to specified canvas
	//											rawArray	- returns the symbol as Array
	//											unmasked	- returns the Array without a mask
	//	info.outputElement - Canvas element to draw to. Canvas only
	//	info.scale - Width of one module. Canvas only.
	//	info.containerSize - Width of the containing element. Canvas only
	//	info.image - { path: <dataURI>,
	//	               scale: [0-1.0],
	//	               shape: ["circle","square"],
	//								 offset: [1-12], 6 = "center"
	//	             }
	//	Scale is relative to symbol size without padding
	//	Shape, scale and offset are used to determine if the square in that coordinate is drawn or not
		
		// SETTINGS VALIDATION
		var selectedMask = validate(info.maskNumber, 0, 9, "u") || 0x9;
		var eccLevel = validate(info.eccLevel, 0, 9, "u") || 0x3;
		var padding = info.imagePadding || 3;
		var logoInfo = info.image || {"width":0};
		logoInfo.width = validate(logoInfo.width, 0, 1, "f") || 0;
		logoInfo.offset = validate(logoInfo.offset, 1, 12, "u") || 0x7;
		// Check that output type is supported
		if ((["canvas","svgFull","svgPath","rawArray","unmasked"]).indexOf(info.outputType) === -1 ){
			throw "outputType: " + info.outputType + " is not valid";  
		}
		// Canvas output needs a canvas to draw to
		if (info.outputType === "canvas"){
			if (info.outputElement.tagName != "CANVAS"){
				throw "output expected canvasElement but got " + info.outputElement.tagName;
			}
		}
		// result information will be stored in this object
		var resultInfo = {"mask":null, "version":null, "result":null, "width":null, "embedWidth":null};
		var a_input = strToArray(str_input);
		// No data, no code
		if(!a_input || a_input.length == 0){
			throw "No data"
		}
		var format = findVersion(a_input.length,eccLevel);
		resultInfo.version = format.version;
		var width = 17 + 4 * format.version;
		var rawFrame = makeFrame(encodeData(a_input,format), width, format.version);
		// Allocate equal size array for mask
		var maskFrame = new Uint8Array(rawFrame.length);
		if (selectedMask == 9 ){ // auto select mask
			var goal = Infinity; // Any score is better than none
			var score;
			for (var i = 1; i < 9; i++){
				// XOR raw frame against mask, can be reversed
				applyMask(rawFrame, maskFrame, i, width, true);
				addFormatInfo(rawFrame, i, width, eccLevel);
				score = testFrame(rawFrame, width);
				if (score < goal){
					goal = score;
					selectedMask = i;
				}
				// Reverse the masking
				applyMask(rawFrame, maskFrame, i, width, false);
			}
		}
		// Apply the explicitly selected or best mask
		applyMask(rawFrame, maskFrame, selectedMask, width, true);
		resultInfo.mask = selectedMask;
		addFormatInfo(rawFrame, selectedMask, width, eccLevel);
		var result;
		switch (info.outputType){
			case "canvas":
				var scale;
				// if containerSize is defined the symbol is fit to screen
				// if not defined then we use scale (or 6 if scale isn't defined)
				if (info.containerSize === null || info.containerSize === undefined){
					scale = info.scale || 6;
				} else{
					// scale < 1 doesn't make any sense
					scale = Math.max(1,Math.floor(info.containerSize / (width + 2 * padding)));
				}
				result = drawCanvas(info.outputElement,rawFrame,width,scale,padding);
				break;
			case "svgFull":
				result = makeSVG(rawFrame,width,padding,logoInfo);
				break;
			case "svgPath":
				result = getSVGPath(rawFrame,width,padding,logoInfo);
				break;
			case "rawArray":
				result = rawFrame;
				break;
			case "unmasked":
				// XOR undoes the selected mask
				applyMask(rawFrame, maskFrame, selectedMask, width, false);
				result = rawFrame;
				break;
			default:
				throw "output type: "+info.outputType+" is not supported";
				break;
		}
		// svg viewbox needs width information
		resultInfo.width = width + 2 * padding;
		resultInfo.embedWidth = logoInfo.width * width;
		resultInfo.result = result;
	return resultInfo
	}

}