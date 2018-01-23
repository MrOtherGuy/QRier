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

function RSECC(polynomial,fieldSize,first_consecutive_root){	
	var poly = polynomial || null;
	var logSize = fieldSize || null;
	// There is no support for field size other than 2^8
	logSize = 256;
	var fcr = (typeof(first_consecutive_root) == "number")?first_consecutive_root:null;
	var logs = null;
	var aLogs = null;
	var factors = null;
	var prevFactorCount = null;
	// Private methods
	
	// The object stores log tables for future use
	var createGaloisLogTables = function(){
		
		if(logSize === null){
			throw "logSize is not defined";
		}
		if(poly === null){
			throw "generator polynomial is not defined";
		}
		// logs[0] is invalid and should never be accessed
		logs[0] = 255;
		aLogs[0] = 1;
		var tmp;
		for(var i = 1; i < logSize; i++){
			tmp = aLogs[i - 1] << 1;
			if (tmp & 0x100){
				tmp = tmp ^ poly;
			}
			aLogs[i] = tmp;
			logs[tmp] = i;
		}
		return
	}
	
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
	// Also, this handles the case where we might access logs[0] which shouldn't happen
    if (!d || !c) {
        return 0;
    }
    return aLogs[(logs[d] + logs[c]) % 255];
	}
	
	// Public methods
	
	// Only 256 is supported so this isn't useful
	/*
	this.setLogSize = function(n){
		logSize = 256;
		console.log("logSize set to: "+logSize);
		if (poly){
			this.setPolynomial(poly);
		}
	}
	*/
	
	this.setPolynomial = function(polynomial){
		poly = polynomial;
		console.log("Polynomial set to: " + poly);
		// Clear current logTables
		if (!logs){
			logs = new Uint8Array(logSize);
			aLogs = new Uint8Array(logSize);
			console.log("logTables initialized");
		}else{
			for( var i = 0; i < logSize; i++){
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
		console.log("Returning factors for " + prevFactorCount + " ECCs with polynomial 0x" + poly.toString(16))
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
	
	if (poly && logSize){
		logs = new Uint8Array(logSize);
		aLogs = new Uint8Array(logSize);
		//console.log("logTables created");
		createGaloisLogTables();
	}
	
	// main method
	
	this.makeECC = function(n_ecw, n_dcw, dcw){
		
		if(arguments.length != 3){
			console.log("Call with: makeECC(ecc width, data width, data array)");
			throw "makeECC was called with " + Function.length + " parameters where 3 was expected";
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