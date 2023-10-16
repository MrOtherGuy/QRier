import { QRier_Gen } from "../core/qrGen.js";

(async function(){
  const options = await browser.storage.local.get(['ecc','scale']);

  let gen = new QRier_Gen();
  let requestInfo = {
    "maskNumber": 9,
    "eccLevel": options.ecc,
    "padding": 3,
    "outputType": QRier_Gen.OUTPUTMODE_SVG
  };
  let dialog = document.querySelector("dialog");
  
  const askToCloseFrame = () => {
    browser.runtime.sendMessage(
      { closeFrame: true }
    )
  }
  const getPayload = await browser.runtime.sendMessage({requestInfo: true});
  
  let payload = getPayload.action;
  let result = gen.make(payload,requestInfo);
  let image = document.createElement("img");
  image.src = `data:image/svg+xml;utf-8,${encodeURIComponent(result.result)}`;
  image.setAttribute("width",result.width * options.scale);
  dialog.appendChild(image);
  dialog.addEventListener("click",(e)=>{
    if(e.originalTarget === dialog){
      askToCloseFrame();
    }
  });
  dialog.addEventListener("close",askToCloseFrame);
  dialog.showModal();
})();