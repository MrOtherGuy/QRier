'use strict';
(function(){
  if(document.getElementsByTagName("qrier-container").length){
    return
  }
  if(!customElements.get("qrier-container")){
    class QRierContainer extends HTMLElement{
      #getDialog;
      constructor(){
        super();
        let fragment = new DocumentFragment();
        {
          let style = fragment.appendChild(document.createElement("style"));
          style.textContent =
`dialog::backdrop{
  backdrop-filter: blur(12px);
  background-color: rgba(0,0,0,0.3);
}
@media (orientation: portrait){
  img{
    max-width: 80vw;
  } 
}
@media (orientation: landscape){
  img{
    max-height: 80vh;
  } 
}`;
        }
        let dialog = fragment.appendChild(document.createElement("dialog"));
        const shadowRoot = this.attachShadow({mode: 'closed'});
        shadowRoot.appendChild(fragment);
        this.#getDialog = () => dialog;
      }
      connectedCallback(){
        Promise.all([
          import(browser.runtime.getURL("core/qrGen.js")),
          browser.storage.local.get(['ecc','scale']),
        ])
        .then((promises) => {
          const QRier_Gen = promises[0].QRier_Gen;
          let gen = new QRier_Gen();
          let options = promises[1];
          let requestInfo = {
            "maskNumber": 9,
            "eccLevel": options.ecc,
            "padding": 3,
            "outputType": QRier_Gen.OUTPUTMODE_SVG
          };
          let dialog = this.#getDialog();
          
          this.listener = (request,sender) => {
            const background = browser.runtime.getURL("_generated_background_page.html");
            
            if(request.menudata && sender.url === background){
              let payload = request.menudata;
              let result = gen.make(payload,requestInfo);
              let image = document.createElement("img");
              image.src = `data:image/svg+xml;utf-8,${encodeURIComponent(result.result)}`;
              image.setAttribute("width",result.width * options.scale);
              dialog.appendChild(image);
              dialog.addEventListener("click",(e)=>{
                if(e.originalTarget === dialog){
                  this.remove();
                  e.stopPropagation();
                }
              });
              dialog.showModal();
            }
            browser.runtime.onMessage.removeListener(this.listener);
          };
          browser.runtime.onMessage.addListener(this.listener);
          
        })
        .catch(e => console.error(e))
      }
      onDisconnectedCallback(){
        browser.runtime.onMessage.removeListener(this.listener);
      }
    }
    customElements.define("qrier-container",QRierContainer)
  }
  document.body.appendChild(document.createElement("qrier-container"));
})();