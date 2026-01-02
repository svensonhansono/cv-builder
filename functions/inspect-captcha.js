const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');

(async () => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true
  });

  const page = await browser.newPage();
  
  console.log('Navigating to job page...');
  await page.goto('https://www.arbeitsagentur.de/jobsuche/jobdetail/10000-1200496457-S', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  console.log('\n=== INSPECTING CAPTCHA FORM ===\n');
  
  const formInfo = await page.evaluate(() => {
    const form = document.querySelector('#captchaForm, form[id*="captcha"], form[class*="captcha"]');
    
    if (!form) {
      return { error: 'Form not found', allForms: Array.from(document.querySelectorAll('form')).map(f => ({ id: f.id, action: f.action })) };
    }

    const inputs = Array.from(form.querySelectorAll('input, textarea')).map(input => ({
      name: input.name,
      id: input.id,
      type: input.type,
      value: input.value,
      placeholder: input.placeholder,
      formControlName: input.getAttribute('formcontrolname')
    }));

    return {
      action: form.action || form.getAttribute('action') || 'No action',
      method: form.method || 'No method',
      id: form.id,
      className: form.className,
      ngSubmit: form.getAttribute('ng-submit') || form.getAttribute('(ngSubmit)'),
      inputs: inputs
    };
  });

  console.log(JSON.stringify(formInfo, null, 2));

  await browser.close();
})();
