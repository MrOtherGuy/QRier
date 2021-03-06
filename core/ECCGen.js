/*
    Reed-Solomon error correction code library
		
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

"use strict";

function QRier_ECCGen(options){

	if (!("Uint8Array" in window)){
		throw "Browser doesn't support typed arrays";
	}
	var polynomial = options.polynomial || null;
	var fieldSize = options.fieldSize || null;
	// This conveniently converts non-number types and rounds down to integers
	var fcr = options.fcr | 0;
	// There is no support for field size other than 2^8
	fieldSize = 256;
	var logs = null;
	var aLogs = null;
	var factors = null;
	var prevFactorCount = null;

	// Private methods
	var createGaloisLogTables = function(){
		
		if(fieldSize === null){
			throw "field size is not defined";
		}
		if(polynomial === null){
			throw "generator polynomial is not defined";
		}
		// logs[0] is invalid and should never be accessed
		logs[0] = 255;
		aLogs[0] = 1;
		var tmp;
		for(var i = 1; i < fieldSize; i++){
			tmp = aLogs[i - 1] << 1;
			if (tmp & 0x100){
				tmp = tmp ^ polynomial;
			}
			aLogs[i] = tmp;
			logs[tmp] = i;
		}
		return
	}
	// Computes factors for n error code words
	var computeFactors = function(n){
		if (!aLogs || !logs){
			throw "Logtables are not initilized";
		}
		if (fcr == null || fcr >= 255 || fcr < 0){
			throw "First consecutive root is invalid. FCR must be set to a value in range 0-255" 
		}
		var a_factors = new Uint8Array(n);
		// Initialized to zero so fill with ones
		for (var i = 0; i < n; i++) {
			a_factors[i] = 1;
		}

		for (var j = fcr; j < n+fcr; j++) {
			for (var k = j - fcr; k > 0; k--) {
				a_factors[k] = a_factors[k - 1] ^ aLogs[(logs[a_factors[k]] + j) % 255];
			}
			a_factors[0] = aLogs[(logs[a_factors[0]] + j) % 255];
		}

		return a_factors
	}
	
	var galoisMulti = function(c,d){
	// multiplication by zero results in...
	// This also handles the case where we might access logs[0] which shouldn't happen
    if (!d || !c) {
        return 0;
    }
    return aLogs[(logs[d] + logs[c]) % 255];
	}
	
	// Public methods
	
	// Only 256 is supported so this isn't useful
	/*
	this.setLogSize = function(n){
		fieldSize = 256;
		console.log("field size set to: " + fieldSize);
		if (polynomial){
			this.setPolynomial(polynomial);
		}
	}
	*/
	
	this.setPolynomial = function(poly){
		polynomial = poly;
		console.log("Polynomial set to: " + polynomial);
		// Clear current logTables
		if (!logs){
			logs = new Uint8Array(fieldSize);
			aLogs = new Uint8Array(fieldSize);
			console.log("logTables initialized");
		}else{
			for( var i = 0; i < fieldSize; i++){
				logs[i] = 0;
				aLogs[i] = 0;
				
			}
			console.log("logTables cleared");
		}

		// Create new ones
		createGaloisLogTables();
		console.log("logTables recreated");
		// factors are dependent on new tables, clear cached ones
		factors = null;
		prevFactorCount = null;
	}
	
	this.setFCR = function(FCR){
		if(typeof(FCR) != "number" || FCR < 0 || FCR > 255){
			throw "FCR value: " + FCR + " is invalid";
		}
		fcr = FCR;
		prevFactorCount = null;
		console.log("FCR set to: " + fcr);
	}
	this.createFactors = function(n){
		prevFactorCount = n;
		factors = computeFactors(n);
	}
	
	this.getFactors = function(){
		console.log("Returning factors for " + prevFactorCount + " ECCs with polynomial 0x" + polynomial.toString(16))
		return factors
	}
	
	
	// Test typed array method support and create alternatives
	
	var supportsCopyWithin = typeof(new Uint8Array(1).copyWithin) === "function";
	var supportsReverse = typeof(new Uint8Array(1).reverse) === "function";
	
	var diyCopywithin = function(target,start,end){
			//This doesn't implement the entire function
			for(var i = this.length-1; i>0; i--){
				this[i]=this[i-1];
			}
		};
	
	if (!supportsReverse){
		Uint8Array.prototype.reverse = function(){
			var i = null;
			var w = null;
			for (i = 0, w = this.length - 1; i < w; i++, w--){
				var left = this[i];
				var right = this[w];
				left ^= right;
				right ^= left;
				left ^= right;
				this[i] = left;
				this[w] = right;
			}
			return this
		}		
	}
	
	if (polynomial && fieldSize){
		logs = new Uint8Array(fieldSize);
		aLogs = new Uint8Array(fieldSize);
		//console.log("logTables created");
		createGaloisLogTables();
	}
	
	// returns an array of error correction codes using initialized values
	
	this.makeECC = function(options){
		
		var n_ecw = options.ecWidth;
		var dcw = options.data;
		var n_dcw = options.dataWidth || dcw.length;

		
		if(!(dcw.length && typeof(dcw) != "string") || typeof(n_dcw) != "number"){
			console.log("Call with: makeECC({ecWidth:<Integer>,data:<Array>,[Optional dataWidth:<Integer>]})");
			throw "makeECC was called with invalid arguments - ecWidth: " + options.ecWidth + ", data: " + typeof(dcw) + "[" + dcw.length + "], dataWidth: " + n_dcw;
		}
		
		if(!n_ecw){
			// No need to create anything 
			return []
		}
		// Factor array depends only on error codeword count
		// use previous if the count didn't change
		if(n_ecw != prevFactorCount){
			factors = computeFactors(n_ecw);
			prevFactorCount = n_ecw;
		}
		
		var a_ecw = new Uint8Array(n_ecw);
		if(!supportsCopyWithin){
			Object.defineProperty(a_ecw,"copyWithin",{value:diyCopywithin});
		}
		var o = 0x0;
		var end_idx = n_ecw - 1;
		
		for(var i = 0; i < n_dcw; i++){
			o = dcw[i] ^ a_ecw[end_idx];
			// This can happen when both are equal, which would result in multiplication by zero. In such case use short path instead
			if (!o){
				a_ecw.copyWithin(1,0,end_idx);
				a_ecw[0] = 0;
			}else{
				for (var j = end_idx; j > 0; j--){
					a_ecw[j] = a_ecw[j-1] ^ galoisMulti(o,factors[j]);
				}
				// And once more for the first element
				a_ecw[j] = galoisMulti(o,factors[j])
			}
		}

		return a_ecw.reverse()
	}
	
}