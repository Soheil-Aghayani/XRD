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
for (const option of options) {
  const card = document.createElement('article');
  card.className = 'support-card';
  card.innerHTML = `<div class="support-asset"><img src="assets/icons/${option.icon}.svg" alt="" width="32" height="32"><div><h3>${option.asset}</h3><span>${option.network}</span></div></div><p class="support-minimum">Minimum contribution <strong>${option.minimum}</strong></p><code>${option.address}</code><button class="secondary copy-address" type="button" aria-label="Copy ${option.asset} address on ${option.network}"><img src="assets/icons/copy-linear.svg" alt="" width="18" height="18"><span>Copy address</span></button>`;
  const button = card.querySelector('button');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(option.address);
      button.querySelector('img').src = 'assets/icons/check-circle-linear.svg';
      button.querySelector('span').textContent = 'Copied';
      status.textContent = `${option.asset} address copied. Network: ${option.network}.`;
      setTimeout(() => {
        button.querySelector('img').src = 'assets/icons/copy-linear.svg';
        button.querySelector('span').textContent = 'Copy address';
      }, 2500);
    } catch {
      status.textContent = 'Clipboard access is unavailable. Select and copy the address shown on the card.';
    }
  });
  container.append(card);
}
