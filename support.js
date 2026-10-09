const evmAddress = '0x45ECCb5357132A077eE3a717fA7D5D2F30C1E2A9';
const options = [
  { asset: 'BTC', icon: 'btc', network: 'BSC · BNB Smart Chain', minimum: '0.00001 BTC', address: evmAddress },
  { asset: 'ETH', icon: 'eth', network: 'Ethereum', minimum: '0.0001 ETH', address: evmAddress },
  { asset: 'USDT', icon: 'usdt', network: 'BSC · BNB Smart Chain', minimum: '0.1 USDT', address: evmAddress },
  { asset: 'SOL', icon: 'sol', network: 'Solana', minimum: '0.01 SOL', address: '3iri7UenMDp4g8f3V1shoVEcFMYLoL8vehdxLr886jLN' },
];
const container = document.getElementById('support-options');
const status = document.getElementById('support-status');
const dialog = document.getElementById('support-dialog');
document.getElementById('open-support').addEventListener('click', () => dialog.showModal());
document.getElementById('close-support').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {status.textContent = '';});
let active = 0;
const tabs = document.createElement('div');
tabs.className = 'support-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Contribution asset');
const detail = document.createElement('article');detail.className = 'support-card';detail.id='support-detail';detail.setAttribute('role','tabpanel');
container.replaceChildren(tabs,detail);
for (const [index,option] of options.entries()) {
  const tab = document.createElement('button');tab.type='button';tab.id=`support-tab-${option.icon}`;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','support-detail');
  tab.innerHTML=`<img src="assets/icons/${option.icon}.svg" alt="" width="24" height="24">${option.asset}`;
  tab.addEventListener('click',()=>{active=index;renderOption();});
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();active=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowRight'?1:options.length-1))%options.length;
    renderOption();tabs.children[active].focus();
  });tabs.append(tab);
}
function renderOption() {
  const option=options[active];status.textContent='';
  [...tabs.children].forEach((tab,index)=>{tab.setAttribute('aria-selected',String(index===active));tab.tabIndex=index===active?0:-1;});
  detail.setAttribute('aria-labelledby',tabs.children[active].id);
  detail.innerHTML=`<div class="support-network"><span>Send ${option.asset} using</span><strong>${option.network}</strong></div><p class="support-minimum">Minimum contribution <strong>${option.minimum}</strong></p><p class="address-label">Receiving address</p><code>${option.address}</code><button class="primary copy-address" type="button" aria-label="Copy ${option.asset} address on ${option.network}"><img src="assets/icons/copy-linear.svg" alt="" width="18" height="18"><span>Copy ${option.asset} address</span></button><p class="hint">${option.asset==='BTC'?'Use a BSC-compatible BTC token. Do not send through the Bitcoin network.':`Select ${option.network} in your wallet before sending ${option.asset}.`}</p>`;
  const button=detail.querySelector('button');
  button.addEventListener('click',()=>copyAddress(option,button));
}
async function copyAddress(option,button) {
    try {
      await navigator.clipboard.writeText(option.address);
      button.querySelector('img').src = 'assets/icons/check-circle-linear.svg';
      button.querySelector('span').textContent = 'Copied';
      status.textContent = `${option.asset} address copied. Network: ${option.network}.`;
      setTimeout(() => {
        button.querySelector('img').src = 'assets/icons/copy-linear.svg';
        button.querySelector('span').textContent = `Copy ${option.asset} address`;
      }, 2500);
    } catch {
      status.textContent = 'Clipboard access is unavailable. Select and copy the address shown on the card.';
    }
}
renderOption();
