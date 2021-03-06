# General

The purpose of this project was to learn how QR-codes encode data. I mostly relied on information freely available around the internet and going through code of other implementations. You may expect some terminology to be incorrect, but I try my best to use consistent naming on things.

## Information about QR-codes

QR-codes (Quick Response Codes) are a type of 2D barcodes which store data in matrix of black and white squares. Data type is arbitrary but most if not all readers interpret payload as text. QR-code (The word "symbol" is used later when speaking of specific instance of QR-code) can store up to 7089 characters. The exact number depends on symbol properties. 

A symbol is defined by four properties:

1. Data - the message we want to encode
2. Character set - How many different values may exist within a symbol (one symbol may have different character sets)
3. Error correction level - how resistant the symbol is to reading errors or destruction (numbered 1-4, also named L, M, Q, H)
4. Mask number - one of the 8 specified patterns which are used to make a symbol easier to read (such as hiding patterns that look like the big three squares in corners)

The symbol size (aka version, 1-40) is determined by the first 3 properties to accomodate all the data, if possible. Mask number can be freely selected even if spec technically requires encoder to determine and select "best" mask.

This project currently only implements Byte character set ("mode" from here on). The maximum length in byte-mode is 2953 characters, so if you need something longer this project is not for you. Although it is possible to create a valid symbol with binary data (as in all values 0-255), readers might not understand non-existing code-points (127-159).

[Wikipedia article](https://en.wikipedia.org/wiki/QR_code) explains structure and basics quite well.

# Encoding process

This section covers the steps from turning <some_text> to an array of true/false values - basically pixels. Those values can afterwards be encoded to any image format. 

## Text -> Array of character codes

Our input is a string of characters. This is first transformed to array form such that input string "Hello" becomes [72,101,108,108,111] each number representing that character. The length of this array may not always be the same as number of characters in the input string because some characters need to be encoded as multiple bytes. The characters are encoded using standard web browser encoding tools.

```
var input = "Hello"
// First make a percent encoded version of the input.
var encoded = encodeURI(input);
// Loop through characters and store their character codes.
for char in encoded {	
	result.push(charCode(char))
}
return result
```

This is simplified but the reson for encodeURI is that it let's us easily handle multi-byte characters. Emojies for example we would get something like "%E2%8F%B0" Then, all we have to do is skip the percent signs and encode the character as [0xe2,0x8f,0xb0].

 As previously noted, we can at this point freely select error correction level (EC-level) and mask number (mask). Knowing the length of the message array and EC-level we can now determine the minimum version which accomodates this message.

## Version selection

Each QR-code version has four possible formats - one for each EC-level. These are specified in spec and can't change. These can be computed but it's easier to implement as lookup table, albeit a rather large one since each format has 4 values leading to (4 * 4 * 40) byte array.

The data is eventually encoded as codewords. The format we get from the lookup table represents how many of these codewords are Data and how many are Error correction codes. The codewords are also divided to Blocks. Blocks can be of type-1 or type-2. The difference is that each block of type-2 has one more codeword than type-1 (I think the reason for this is that the available space can be used exactly as blocks have different amount codes). Type-1 and type-2 blocks have the same number of ECCs. Each codeword can be thought as the 8 pixels that represent one letter, not totally accurate but provides intuition.

Example QR-version 5 format:
`[1,0,108,26,2,0,43,24,2,2,15,18,2,2,11,22]`
First four values describe EC-level 1, next 4 EC-level 2 etc.
First two values of each version describes the number of blocks of type-1 and 2 respectively.
The third value is the number or data codewords in a block (type-2 blocks have one more than this value)
The fourth is the number of ECCs in a block.

So to determine data capacity for this version and example EC-level 3 we need:

1. Add together the number of type-1 and type-2 blocks
2. Multiply that with the number of data codewords
3. Add the number of type-2 blocks to that value (since there is exatcly one more codeword per type-2 block)

At this point one additional note comes to play. The length of the message and encoding mode are encoded to the data aswell. Length of the message is necessary because the whole symbol needs to be filled. If the message is not long enough then padding is added and we need to know where that padding starts.

Encoding mode is 4 bits long. Since this implementation only works for byte mode and that mode doesn't change we can say it takes up 1 codeword worth of space. Message length indicator is 8 bits long for versions < 10 and 16 bits for bigger. So, it takes either 1 or 2 codewords worth of space.

Now the final data capacity for this version is can be calculated:

`15 * (2 + 2) + 2 - 1 - 1 = 60`

Our message can thus be at most 60 codewords long. If it is longer we need to test the next one until we find a suitable one. This implementation basically loops through version information table to find the first that fits. Well, actually this uses approximation function for fitting version which finds a version which almost fits the data. Then loop upwards from that version.


I'll use the message "Hello" with EC-level Q ( Q=3 but I'll rather use letter descriptions so the meaning is clear).

For our example the version selection goes like this starting from version 1:

`[1,0,19,7,1,0,16,10,1,0,13,13,1,0,9,17]`
Elements 8-11 [1,0,13,13] match the EC-level Q
There is 1 block of type-1
No blocks of type-2
There is 13 codewords in each block
(1 + 0) * 13 + 0 - 1 - 1= 11
11 > 5 so our message fits in version 1

Once a fitting version is found we have the following data:

* Symbol width in "pixels" - this is always 17 + (4 * version) = 21
* Number of data codewords in the symbol = 13
* Number of ECCs in the symbol = 13
* The grouping of blocks = 1 block of type-1

This is enough to structure the symbol. Now it's just a matter of encoding the message and calculating error correction data, which is the interleaved to data.

## Data encoding

At this point we have our message as an array of numbers. This has to be shorter than the data-length (number of data codewords), because the mode indicator and message length info still needs to fit in. Modes have a defined bit-string which describes them, for byte mode this is "0100". Depending on the version the message length information is either 8 (version < 10) or 16 bits long.

The data will always start with the mode indicator, immediately followed by message length. The message itself comes next. So to use message "Hello" as an example:

* Mode: 0100
* Message length: 5 -> 00000101 (version < 10 -> 8bits )
* Message [72,101,108,108,111] (binary representation of each in 8 bits)

These are all just appended together. This representation becomes awfully long for longer messages. We can't really store things as a string anyway, because the mode and length info is used as data for calculating error correction codes. So these will be convert to array of binary values. If mode indicator would be 8 bits long we could just shift the array by two (or three for versions > 9) and make these the first elements.

As such, it is needed to do some bit shifting. From last section we know that our eventual array needs to be 13 codewords long. Since a codeword is 8 pixels it can just as well be thought as bytes. So the data array needs to be 13 elements long and have values of 1 byte.

To concatenate mode and message length indicators we take the digits of mode 0100 and right shift them 4 places (0100 0000) appended by the most significant four bits of length indicator (0000) to get 0100 0000. This is the first element of the data array. Next will be the least significant bits of length indicator (0101) right-shifted and append the most significant bits of first message byte (0100) to that to get 01010100. So our first two elements are [64,84]

Continue like this until the last message bit is used. The last value is just the least significant bits of the last message value right shifted. But, the resulting array only has a length 7 whereas 13 is needed. This is where the padding bytes come in. Spec defines two values, 236 and 17 to be used as padding bytes. First 236, second 17, 236 again and so forth until data is long enough.

The resulting encoding for the Example "Hello" will thus be:
[64,84,134,86,198,198,240,236,17,236,17,236,17]

## Error correction codes

Error correction codes are created per block. To do so, we take a slice from the data array and create error correction codes (ECC) for that. This slice is the size of the block. Since our example only has one block we compute ECCs for that in one go. But say we had some data with length 25 and it would have 3 blocks - 2 of type-1 and 1 of type-2. Block size for type-1 would be 8 and for type-2 9 (type-2 is always one bigger). Type-1 blocks are always computed first regardless of how many of each type there is.

So we first compute ECC fo elements [0-7] then for [8-15] and last for the single type-2 group [16-24]. The ECCs for different blocks should be stored in their own arrays, because ECCs will be later reordered based on their block.

TODO: error correction algorithm itself

QR-codes use Reed-Solomon error correction codes. Many implementations can be used to create these. But there are some key ideas which you should be aware of. First, the size of the finite field is 256. This basically means that our message can have at most 256 different values. A codeword has 8 "bits" regardless of the mode so this is exactly what we need. Second, the algorithm needs some primitive polynomial (may be also called generator polynomial). Different specs (such as other 2d matrix codes) can "freely" select which value they want to use but for QR-codes this is always 0x11d. Third, the value of first consecutive root (FCR) is 0. This really doesn't show up a lot and it took quite some time to figure out. I suppose most RS encoders default to 0, but I was using the same encoder earlier for creating datamatrix (uses FCR = 1) symbols and it worked fine. But suddenly it didn't work on QR-codes. This is another somewhat freely selectable value but it needs to be known for both encoder and decoder so it's basically defined in spec.

To summarize, you would use something like this to create ECCs for each block:
```
var dataBlock = [64,84,134,86,198,198,240,236,17,236,17,236,17] // "Hello"
var ECCs = 13 // This was determined in version selection
var ECC_block = makeECCArray({data:dataBlock, eccLength: 13, fieldSize:256, primitive: 0x11d, FCR: 0});
>> ECC_block
<< [101,148,203,11,83,255,86,112,227,9,227,17,106]
```
Great! This is all the data we need. Now it only needs to be assembled to correct order.

## Data interleaving

Codewords are interleaved based on block. This is probably done so that local damage to the symbol doesn't lead to destruction of the whole block. ECCs are similarly interleaved but it's worth to note that ECCs and data codes are *NOT* interleaved with each other. ECCs are instead always packed after interleaved data codes in the data stream.

The interleaving is done by taking the first value of all blocks of type-1 and then taking the first value of all blocks of type-2. Then take the *second* value in same order. As mentioned, type-2 blocks have one extra element so those must be taken last. 

For our example data this interleaving is quite uninteresting. It will just lead to data codes being appended by ECCs so let's use a made up example

```
t1-block1 = [ 1, 3, 5, 7]
t1-block2 = [ 2, 4, 6, 8]
t2-block1 = [11,13,15,17,19]
t2-block2 = [10,12,14,16,18]
data      = [1,2,11,10,3,4,13,12,5,6,15,14,7,8,17,16,19,18]
eccBlock1 = [22,23,24,25]
eccBlock2 = [26,27,28,29]
ECCs      = [22,26,23,27,24,28,25,29]
```
Result is just data concatenated with ECCs
`[1,2,11,10,3,4,13,12,5,6,15,14,7,8,17,16,19,18,22,26,23,27,24,28,25,29]`

Now, the message is fully encoded and is ready to be packed to the QR frame.

## Frame construction

The QR symbol has three distinct features which are important to know.

1. Data
2. Function patterns
3. Mask

We have fully encoded data in previous sections. Functional patterns are patterns within the symbol which don't directly change based on message. These include the three big squares on symbol corners, as well as (possible) smaller squares distributed in grid-like pattern and some format information. Mask, as previously noted, is used to hide strcutures in data that would look like known functional patterns. Mask is applied by XOR-ing the mask image to otherwise fully constructed symbol. And here's the thing - mask should NOT be applied to functional patterns. As such, we need to mark pixels which are functional patterns so we know to not-mask them later.

A single pixel can either be black or white (true or false) so we could in theory describe the whole image as array of boolean values. But we need to somehow store which pixels are part of functional patterns. So instead lets store the image as byte array, where each pixel is 8-bit integer. Now we can store the symbol as follows:
```
0 = White
1 = Black
2 = White - part of a function pattern
3 = Black - part of a function pattern
```
Sure, we don't need 8 bits per pixel but this has useful properties. The least significant bit tells if the pixel is black or white (whether it's functional pattern or not). The second least significant bit tells if it is function pattern (without caring if it's black or white). This makes it really easy to determine if we can put data in that pixel and what we should do when applying mask.

## Functional patterns

The byte array is initialized to zeros. Let's put all functional patterns to it first. It doesn't depend on message data other than version and we already know that. To do this, go through all functional pattern and set corresponding frame element to 2 or 3.

First functional pattern are the Finder patterns - the three big squares. These are always in top left and right and bottom left corners if the symbol is in normal orientation. The symbol can of course be read in any orientation, but in normal orientation the squares are there and message starts from bottom right corner. Finders are always 7 pixels wide(and tall) independent of the version, and their structure is always the same. They are also always surrounded by a 1 pixel wide white border "inside" the symbol.

Second are the aligment blocks. My understanding is that these help the decoder to figure out transformation of the symbol (in 3D-space). These are 5x5 squares with a single black pixel surrounded by whites surrounded by blacks. Their distribution is a uniform grid with right and bottom center starting from 7 pixels from the edge. As in, the center of bottom right pattern is the 7th pixel from bottom and right edge. The distance between elements in the alignment grid is specified in the spec and depends on version. For example this delta for version 7 is 16 and thus the centers for alignment patterns are 16 pixels away from each other.

Third, timing columns. These are a sequence of alternating white-black pixels starting from the lower right corner of the top-left finder pattern. Runs right- and downwards until it would hit the other finder pattern. Notice that these may go through alignment blocks. That doesn't matter because alignment blocks are positioned in such way that their pixel values will always match what the timing pattern would have in that coordinate.

Fourth, format information. These tell the encoder what mask and EC-level was used in the symbol. Format sequences are 15 bits long and defined in spec located beside finders. When they would collide with timing row they just continue from the next available position. These are not yet filled with correct information though, but only marked as functional pattern. After determining the mask we fill these as the last step of the encoding process.

For versions > 6 there is a 3x6 version information blocks located to the left side of the right finder pattern and top side of the bottom one. These are filled with a spec defined pattern corresponding to used version.

Last, there is a single black pixel 8 pixels up from bottom and 8 pixels and nine to the right from left edge.

The leftover space will be exactly filled with data.

## Data packing

For this you need to track the absolute x and y coordinate from some corner of the symbol. I like thinking x0 y0 being the top left corner. Data is packed starting from the bottom right-most pixel. So for version 1 symbol (21 units wide) these values are initialized to x=20 y=20. This bit will be the most significant bit of the first data value (black if bit == 1). Next adjust the position by x -= 1. This will be the second most significant bit. Next, x+= 1 followed by y -= 1 (ie. the pixel right above the first one). Then x -= 1 again, and continue like this until all the 8 bits of the data value are used. After that, adjust the position in this same manner but use the most significant bit of the next data value as input.

When you would go to a pixel marked as function pattern you just adjust the position again in this same order and continue normally until you hit symbol edge. If you would decrease y to below 0 you instead decrease x by 2 (the following x += 1 will effectively put you to the pixel beside the previous one). Continue from this in same manner but *downwards* 

Example:
```javascript
while(bits){
	setBitInFrame(x_pos,y_pos,bit);
	// Adjust position
	do {
		/* Flip direction when would collide with symbol edge
		* This modifies the "starting position" for this loop
		* The new position is determined according to normal rules,
		* but as if the current position is this fake one.
		*/
		state = y_pos - y_dir;
		overEdge = ((state === -1) || (state === frame.width)) && (y_inc === 1);
		if(overEdge){
			y_pos -= y_dir;
			x_pos -= 2;
			// Skip vertical timing row
			if(x_pos === 5){
				x_pos--;
			}
			y_dir *= -1;
		}
		// Normal adjust
		x_pos -= x_dir;
		x_dir *= -1;
		y_pos -= y_inc * y_dir;
		y_inc ^= 1;
	} while (frame.isFunctionPattern(x_pos,y_pos));
}
```