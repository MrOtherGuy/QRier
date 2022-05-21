/*
 *  Reed-Solomon error correction code library
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
 
const POLYNOMIAL = 0x11d;
const FIELD_SIZE = 256;


class QRier_ECCGen{
  #fcr;
  #factors;
  #previousFactorCount;
  
  constructor( options ){
    let fcr = options.fcr | 0;
    if(fcr >= 255 || fcr < 0){
      throw new Error("First consecutive root is invalid. FCR must be set to a value in range 0-255")
    }
    this.#fcr = fcr;
    this.#factors = null;
    this.#previousFactorCount = null;
    
  }
  
  makeECC(options){
    let n_ecw = options.ecWidth;
    let dcw = options.data;
    let n_dcw = options.dataWidth || dcw.length;
    
    if(!(dcw.length && typeof dcw != "string") || typeof n_dcw != "number"){
      throw new Error(`makeECC was called with invalid arguments - ecWidth: ${options.ecWidth}, data: ${typeof dcw}[${dcw.length}], dataWidth: ${n_dcw}`);
    }
    
    if(!n_ecw){
      return new Uint8Array(0);
    }
    // Factor array depends only on error codeword count
    // use previous if the count didn't change
    if(n_ecw != this.#previousFactorCount){
      this.#factors = QRier_ECCGen.computeFactors(n_ecw,this.#fcr);
      this.#previousFactorCount = n_ecw;
    }
    
    const a_ecw = new Uint8Array(n_ecw);
    let o = 0;
    const end_idx = n_ecw - 1;
    
    for(let i = 0; i < n_dcw; i++) {
      o = dcw[i] ^ a_ecw[end_idx];
      // This can happen when both are equal, which would result in multiplication by zero. In such case use short path instead
      if(o === 0){
        a_ecw.copyWithin(1,0,end_idx);
        a_ecw[0] = 0;
      }else{
        for (let j = end_idx; j > 0; j--){
          a_ecw[j] = a_ecw[j-1] ^ QRier_ECCGen.#multiply(o,this.#factors[j]);
        }
        // And once more for the first element
        a_ecw[0] = QRier_ECCGen.#multiply(o,this.#factors[0])
      }
    }
    
    return a_ecw.reverse()
    
  }
  
  static computeFactors(n,fcr) {
    const a_factors = new Uint8Array(n);
    a_factors.fill(1);
    
    const limit = fcr + n;
    for(let j = fcr; j < limit; j++) {
      for(let k = j - fcr; k > 0; k--) {
        a_factors[k] = a_factors[k - 1] ^ QRier_ECCGen.#factor(a_factors[k], j);
      }
      a_factors[0] = QRier_ECCGen.#factor(a_factors[0], j)
    }
    return a_factors;
  }
  
  static #multiply(a,b){
    if(a === 0 || b === 0){
      return 0
    }
    return QRier_ECCGen.#aLogs[(QRier_ECCGen.#logs[b] + QRier_ECCGen.#logs[a]) % 255]
  }
  
  static #factor(x,y){
    return QRier_ECCGen.#aLogs[(QRier_ECCGen.#logs[x] + y) % 0xff] 
  }
  
  static #logs;
  static #aLogs;
  static {
    this.#logs = new Uint8Array(FIELD_SIZE);
    this.#logs[0] = 0xff;
    this.#aLogs = new Uint8Array(FIELD_SIZE);
    this.#aLogs[0] = 0x1;
    for(let i = 1; i < FIELD_SIZE; i++){
      let tmp = QRier_ECCGen.#aLogs[i - 1] << 1;
      if ((tmp & 0x100) > 0){
        tmp = tmp ^ POLYNOMIAL;
      }
      this.#aLogs[i] = tmp;
      this.#logs[tmp] = i;
    }
  }
}

export { QRier_ECCGen };