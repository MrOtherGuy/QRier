/*
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

const alignment_deltas = Uint8Array
.from([0, 11, 15, 19, 23, 27, 31,16, 18, 20, 22, 24, 26, 28, 20, 22, 24, 24, 26, 28, 28, 22, 24, 24,26, 26, 28, 28, 24, 24, 26, 26, 26, 28, 28, 24, 26, 26, 26, 28, 28]);

const version_pattern = Uint16Array
.from([0xc94, 0x5bc, 0xa99, 0x4d3, 0xbf6, 0x762, 0x847, 0x60d,0x928, 0xb78, 0x45d, 0xa17, 0x532, 0x9a6, 0x683, 0x8c9,0x7ec, 0xec4, 0x1e1, 0xfab, 0x08e, 0xc1a, 0x33f, 0xd75,0x250, 0x9d5, 0x6f0, 0x8ba, 0x79f, 0xb0b, 0x42e, 0xa64,0x541, 0xc69]);

const format_pattern = Uint16Array
.from([0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed,0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b]);

class QRFrame{
  constructor(data,format){
    this.width = format.version * 4 + 17;
    this.data = new Uint8Array(this.width * this.width);
    this.version = format.version;
    this.ECCLevel = format.ECCLevel;
    this.mask = null;
    this.initialized = false;
    this.RLE = new Uint8Array(this.width);
    this.createFunctionPatterns();
    this.addData(data);
  }
  
  determineMask(maskNumber){
    
    if (maskNumber == 9 ){ // auto select mask
      let goal = Infinity; // Any score is better than none
      let score;
      for (let i = 1; i < 9; i++){
        // XOR raw frame against mask, can be reversed
        this.applyMask(i, true);
        this.addFormatInfo(i);
        score = this.evaluateGoodness();
        if (score < goal){
          goal = score;
          maskNumber = i;
        }
        // Reverse the masking
        this.applyMask(i, false);
      }
    }
    // Apply the explicitly selected or best mask
    this.applyMask(maskNumber, true);
    this.addFormatInfo(maskNumber);
    this.mask = maskNumber;
    return maskNumber
  }
  
  applyMask(maskNum, createNewMask){
    const width = this.width;
    // Don't generate new mask array when reversing
    if(createNewMask){
      let r3x = 0;
      let r3y = 0;
      for (let y = 0; y < width; y++, r3y++){
        let offset = y * width;
        r3y = r3y % 3;
        for (let x = 0, r3x = 0; x < width; x++){
          const bit = this.isMasked(x,y) ^ 1;
          let mask_bit;
          switch (maskNum) {
            case 1:
              mask_bit = (x + y) & 1;
              break;
            case 2:
              mask_bit = y & 1;
              break;
            case 3:
              mask_bit = x % 3;
              break;
            case 4: 
              mask_bit = (x + y) % 3;
              break;
            case 5:
              mask_bit = (((x / 3) | 0) + (y >> 1)) & 1;
              break;
            case 6:
              mask_bit = (x & y & 1) + (r3x > 0 && r3y > 0 ? 1 : 0); 
              r3x = (r3x + 1) % 3;
              break;
            case 7:
              mask_bit = ((x & y & 1) + (r3x > 0 && r3x === r3y ? 1 : 0)) & 1;
              r3x = (r3x + 1) % 3;
              break;
            case 8:
              mask_bit = ((r3x > 0 && r3x === r3y ? 1 : 0) + ((x + y) & 1)) & 1;
              r3x = (r3x + 1) % 3;
              break;
            default:
              throw "mask number " + masknum + " is invalid"
              break;

          }
          mask_bit = (mask_bit === 0 ? 1 : 0) & bit;
          this.data[offset + x] ^= (mask_bit << 2) | mask_bit;
        }
      }
    }else{
      for(let i = 0; i < this.data.length; i++){
        const mask_bit = this.data[i] & 4;
        this.data[i] ^= (mask_bit | (mask_bit >> 2));
      }
    }
    return 0
  }
  
  addFormatInfo(maskNumber){
    const width = this.width;
    // Add format bits to the image
    let formatWord = format_pattern[maskNumber - 1 + ((this.ECCLevel - 1) << 3)];
    for (let k = 0; k < 8; k++, formatWord >>= 1){
      this.data[width - 1 - k + 8 * width] = formatWord & 1;
      this.data[8 + (k + (k > 5)) * width] = formatWord & 1;
    }
    // high byte
    for (let k = 0; k < 7; k++, formatWord >>= 1){
      this.data[8 + (width - 7 + k) * width] = formatWord & 1;
      this.data[6 - k + !(k) + 8 * width] = formatWord & 1;
    }
  }
  
  createAlignmentPatternAt(x,y){
    this.setBlackMask(x , y);
    for (let i = -2; i < 2; i++) {
      this.setBlackMask(x + i     , y - 2    );
      this.setBlackMask(x + 2     , y + i    );
      this.setBlackMask(x - 2     , y + i + 1);
      this.setBlackMask(x + i + 1 , y + 2    );
    }
    for (let i = 0; i < 2; i++) {
      this.setWhiteMask(x + 1, y - i);
      this.setWhiteMask(x - i, y - 1);
      this.setWhiteMask(x - 1, y + i);
      this.setWhiteMask(x + i, y + 1);
    }
  }

  createFunctionPatterns(){
    const frameWidth = this.width;
    
    // Finder patterns
    for (let i = 0; i < 3; i++) {
      let row = i === 1 ? frameWidth - 7 : 0;
      let col = i === 2 ? frameWidth - 7 : 0;

      this.setBlackMask(col + 3, row + 3, 3);
      for (let j = 0; j < 6; j++) {
        this.setBlackMask(col + j     , row        );
        this.setBlackMask(col + 6     , row + j    );
        this.setBlackMask(col         , row + j + 1);
        this.setBlackMask(col + j + 1 , row + 6    );
      }
      for (let j = 1; j < 5; j++) {
        this.setWhiteMask(col + j     , row + 1    );
        this.setWhiteMask(col + 5     , row + j    );
        this.setWhiteMask(col + 1     , row + j + 1);
        this.setWhiteMask(col + j + 1 , row + 5    );
      }
      for (let j = 2; j < 4; j++) {
        this.setBlackMask(col + j     , row + 2    );
        this.setBlackMask(col + 4     , row + j    );
        this.setBlackMask(col + 2     , row + j + 1);
        this.setBlackMask(col + j + 1 , row + 4    );
      }
    }
    // Alignment blocks
    if (this.version > 1) {
      let dt = alignment_deltas[this.version];
      let y = frameWidth - 7;
      for (;;) {
        let x = frameWidth - 7;
        while (x > dt - 3) {
          this.createAlignmentPatternAt(x, y);
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
        this.createAlignmentPatternAt(6, y);
        this.createAlignmentPatternAt(y, 6);
      }
    }
    
    // single black, needs to be there
    this.setBlackMask(8, frameWidth - 8);
    // timing gap - whites
    for (let y = 0; y < 7; y++) {
      this.setWhiteMask(7, y);
      this.setWhiteMask(frameWidth - 8, y);
      this.setWhiteMask(7, y + frameWidth - 7);
    }
    for (let x = 0; x < 8; x++) {
      this.setWhiteMask(x, 7);
      this.setWhiteMask(x + frameWidth - 8, 7);
      this.setWhiteMask(x, frameWidth - 8);
    }

    // reserve mask-format area
    for (let x = 0; x < 9; x++){
      this.setWhiteMask(x, 8);
    }
    for (let x = 0; x < 8; x++) {
      this.setWhiteMask(x + frameWidth - 8, 8);
      this.setWhiteMask(8, x);
    }
    for (let y = 0; y < 7; y++){
      this.setWhiteMask(8, y + frameWidth - 7);
    }

  // timing row/col
    for (let x = 0; x < frameWidth - 14; x++){
      this.data[8 + x + frameWidth * 6] = 3 - (x & 1);
    }
    for (let x = 0; x < frameWidth - 14; x++){
      this.data[6 + frameWidth * (8 + x)] = 3 - (x & 1)
    }
    
  // version block
    if (this.version > 6) {
      let pattern = version_pattern[this.version - 7];
      let k = 17;
      for (let x = 0; x < 6; x++){
        for (let y = 0; y < 3; y++, k--){
          let t = (1 & (k > 11 ? this.version >> (k - 12) : pattern >> k));
          this.data[(5 - x) + frameWidth * (2 - y + frameWidth - 11)] = 2 + t
          this.data[(2 - y + frameWidth - 11) + frameWidth * (5 - x)] = 2 + t
        }
      }
    }
  }

  addData(data){
    // position initialized to bottom right
    let x_pos, y_pos, goingLeft, goingUp, max_idx;
    goingUp = goingLeft = true;
    x_pos = y_pos = max_idx = this.width - 1;
    let limit = 0;
    for (let i = 0; i < data.length; i++) {
      for (let j = 7; j >= 0; j--) {
        if ((data[i] >> j) & 1){
          this.setBlack(x_pos,y_pos);
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
        } while (this.isMasked(x_pos, y_pos));
      }
    }
  }

  evaluateRunLength(length){
    let N1 = 3;
    let N3 = 40;
    let score = 0;
    let runs = this.RLE;
    for (let i = 0; i < length; i++){
      if (runs[i] >= 5){
        score += N1 + runs[i] - 5;
      }
    }
    // Finder-like pattern
    for (let i = 2; i < length - 2; i++){
      // Treats inverted color finder-like patterns as finders
      if ((runs[i] < 3) || (runs[i] & 1) === 0){
        break
      }
      if ( runs[i - 2] === runs[i + 2]
          && runs[i + 2] === runs[i - 1]
          && runs[i - 1] === runs[i + 1]
          && runs[i - 1] * 3 === runs[i]
          ){
            score += N3;
      }
    }
    return score;
  }

  evaluateGoodness(){
    // Badness coefficients.
    // let N1 = 3;
    let N2 = 3;
    // let N3 = 40;
    let N4 = 10;  
    //let x, y;
    let score = 0;
    let balance = 0;
    // 2x2 blocks of same color.
    const width = this.width;
    for (let y = 0; y < width - 1; y++){
      for (let x = 0; x < width - 1; x++){
        let state = this.getPixel(x, y) + this.getPixel(x + 1, y) + this.getPixel(x, y + 1) + this.getPixel(x + 1, y + 1);
        if ((state & 3) === 0){
          score += N2;
        }
      }
    }
    // X runs
    let prev, current;
    for(let y = 0; y < width; y++){
      prev = this.getPixel(0, y);
      this.RLE[0] = 1;
      let idx = 0;
      for(let x = 1; x < width; x++){
        current = this.getPixel(x, y);
        if(current === prev){
          this.RLE[idx]++;
        }else{
          this.RLE[++idx] = 1;
          prev = current;
        }
        balance += current ? 1 : -1;
      }
      score += this.evaluateRunLength(idx + 1);
    }
    // black/white imbalance
    if (balance < 0){
      balance = -balance;
    }
    let square = width * width;
    let count = 0;
    balance += balance << 2;
    balance <<= 1;
    while (balance > square){
      balance -= square;
      count++;
    }
    score += count * N4;
      // Y runs
    for(let x = 0; x < width; x++){
      prev = this.getPixel(x, 0);
      this.RLE[0] = 1;
      let idx = 0;
      for(let y = 1; y < width; y++){
        current = this.getPixel(x, y);
        if(current === prev){
          this.RLE[idx]++;
        }else{
          this.RLE[++idx] = 1;
          prev = current;
        }
      }
      score += this.evaluateRunLength(idx + 1);
    }
    return score;
  }

  isMasked(x,y){
    return (this.data[x + this.width * y] & 2) >> 1
  }
  getPixel(x,y){
    return this.data[x + this.width * y] & 1;
  }
  setBlack(x,y){
    this.data[x + this.width * y] = 1;
  }
  setBlackMask(x,y){
    this.data[x + this.width * y] = 3;
  }
  setWhiteMask(x,y){
    this.data[x + this.width * y] = 2;
  }
}

export { QRFrame }