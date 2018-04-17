# QRier

Javascript based QR-code generator. Supports QR versions (size) up to 40, byte mode only. Mask type and error correction level are configurable. Mask can be selected directly or determined automatically. Supports output to SVG and HTML Canvas

This repository includes code used by browser extension for Firefox with the same name but also stand-alone HTML-page (under docs folder) which has some IE/Edge compatibility additions.

Core libraries should work without any DOM interaction so they can be used as is for other purposes. Exception for this is canvas output which requires a canvas element as reference. QRgen.js requires ECCGen.js to create error correction codes.

You can find a work-in-progress description of QR-codes in general and this implementation inside docs.