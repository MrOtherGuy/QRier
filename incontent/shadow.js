import { QRier_Gen } from "../core/qrGen.js";

// Extends encodeURIComponent() to include !'()*
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

function setupPage(payload,result,options){
  let image = document.getElementById("image");
  image.src = `data:image/svg+xml;utf-8,${encodeURIComponent(result.result)}`;
  image.setAttribute("width",result.width * options.scale);
  let dialog = document.querySelector("dialog");
  dialog.addEventListener("click",(e)=>{
    if(e.target === dialog){
      browser.runtime.sendMessage({ closeFrame: true })
    }
  });
  dialog.addEventListener("close",()=>browser.runtime.sendMessage({ closeFrame: true }));
  document.getElementById("freePageLink").addEventListener("click",(ev)=>{
    if(ev.button === 0){
      browser.runtime.sendMessage({
        openTab: {url:"../pages/QRierFreepage.html"+"?data="+fixedEncodeURIComponent(payload.action) + "&ecc=" + [null,"L","M","Q","H"][options.ECC]}
      })
    }
  });
  dialog.showModal();
}
(async function(){
  const options = await browser.storage.local.get(['ecc','scale']);

  let gen = new QRier_Gen();
  let requestInfo = {
    "maskNumber": 9,
    "eccLevel": options.ecc,
    "padding": 3,
    "outputType": QRier_Gen.OUTPUTMODE_SVG
  };
  const payload = await browser.runtime.sendMessage({requestInfo: true});
    
  if(document.readyState === "complete"){
    setupPage(payload,gen.make(payload.action,requestInfo),options);
  }else{
    document.onreadystatechange = () => {
      if (document.readyState === "complete") {
        setupPage(payload,gen.make(payload.action,requestInfo),options);
      }
    }
  }
})();