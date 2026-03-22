import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Activamos el modo sigilo para que no nos detecten como bots
puppeteer.use(StealthPlugin());

export const getBrowser = async () => {
  console.log('[BROWSER] Lanzando navegador invisible...');
  return await puppeteer.launch({
    headless: true, // "true" para que no se abra la ventana y sea rápido
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
};