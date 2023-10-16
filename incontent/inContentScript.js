'use strict';
(function(){
  if(window.hasQrier === true){
    return
  }
  if(!customElements.get("qrier-container")){
    class QRierContainer extends HTMLElement{
      #getFrame;
      constructor(){
        super();
        let fragment = new DocumentFragment();
        {
          let style = fragment.appendChild(document.createElement("style"));
          style.textContent =
`:host{
box-sizing: border-box !important;
height: 100vh !important;
width: 100vw !important;
}
iframe{
border: none;
visibility: hidden;
}
iframe.show{
visibility: visible;
}`;
        }
        let frame = document.createElement("iframe");
        frame.setAttribute("sandbox","allow-scripts allow-same-origin");
        frame.src = browser.runtime.getURL("incontent/inContent.html");
        
        frame.width = "100%";
        frame.height = "100%";
        fragment.appendChild(frame);
        const shadowRoot = this.attachShadow({mode: 'closed'});
        shadowRoot.appendChild(fragment);
        this.#getFrame = () => frame;
      }
      connectedCallback(){
        setTimeout(()=>{ this.#getFrame().classList.add("show") },33);
        this.listener = (request,sender) => {
          if(sender.id === browser.runtime.id && request.closeFrame){
            browser.runtime.onMessage.removeListener(this.listener);
            this.remove();
            window.hasQrier = false;
            try{
              this.getHost().remove();
            }catch(ex){
              console.error(ex)
            }
          }
        }
        browser.runtime.onMessage.addListener(this.listener);
        return
      }
      
      onDisconnectedCallback(){
        browser.runtime.onMessage.removeListener(this.listener);
      }
      
    }
    customElements.define("qrier-container",QRierContainer)
  }
  let outerdiv = document.createElement("div");
  const shadowRoot = outerdiv.attachShadow({mode: 'closed'});
  let style = shadowRoot.appendChild(document.createElement("style"));
  style.textContent = `:host{
background: transparent !important;
border: 0 !important;
border-radius: 0 !important;
box-shadow: none !important;
box-sizing: border-box !important;
display: block !important;
filter: none !important;
height: 100vh !important;
left: 0 !important;
margin: 0 !important;
max-height: none !important;
max-width: none !important;
min-height: unset !important;
min-width: unset !important;
opacity: 1 !important;
outline: 0 !important;
padding: 0 !important;
pointer-events: auto !important;
position: fixed !important;
top: 0 !important;
transform: none !important;
visibility: visible !important;
width: 100vw !important;
z-index: 2147483647 !important;
color-scheme: light dark !important;
}`;
  let qrier = document.createElement("qrier-container");
  shadowRoot.appendChild(qrier);
  qrier.getHost = () => outerdiv;
  document.body.append(outerdiv);
  window.hasQrier = true;
})();