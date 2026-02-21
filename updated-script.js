// ============================================================
// UPDATED JAVASCRIPT FOR index.html
// Replace your existing <script> block with this one.
//
// IMPORTANT: After deploying your Google Cloud Function, replace
// the FUNCTION_URL below with your actual function URL.
// ============================================================

const FUNCTION_URL = 'myguardian-recaptcha.rebeca-26e.workers.dev';
// ^^^ REPLACE with your actual Cloud Function URL after deploying ^^^

// --- Security utilities ---
function sanitizeInput(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.substring(0, 200);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

const formTimestamps = {};
function isRateLimited(formId) {
  const now = Date.now();
  const cooldown = 10000;
  if (formTimestamps[formId] && (now - formTimestamps[formId]) < cooldown) {
    alert('Please wait a moment before submitting again.');
    return true;
  }
  formTimestamps[formId] = now;
  return false;
}

async function verifiedKlaviyoRequest(recaptchaAction, klaviyoEndpoint, klaviyoPayload) {
  const recaptchaToken = await grecaptcha.execute(
    '6Lf3AWssAAAAAL5N_DMEfJT43QmBejlXQajh0MBl',
    { action: recaptchaAction }
  );

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recaptchaToken,
      action: recaptchaAction,
      klaviyoEndpoint,
      klaviyoPayload,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    console.error('Verification/Klaviyo error:', result);
    throw new Error(result.error || 'Verification failed');
  }
  return result;
}

document.addEventListener('DOMContentLoaded', function () {
  const newsletterButton = document.getElementById('newsletter-button');
  const newsletterModal = document.getElementById('newsletter-modal');
  const modalClose = document.getElementById('modal-close');
  const newsletterForm = document.getElementById('newsletter-form');

  newsletterButton.addEventListener('click', () => newsletterModal.classList.add('active'));
  modalClose.addEventListener('click', () => newsletterModal.classList.remove('active'));
  newsletterModal.addEventListener('click', (e) => {
    if (e.target === newsletterModal) newsletterModal.classList.remove('active');
  });

  newsletterForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = sanitizeInput(document.getElementById('newsletter-name').value.trim());
    const email = document.getElementById('newsletter-email').value.trim();
    const submitButton = newsletterForm.querySelector('.newsletter-submit');
    const originalText = submitButton.textContent;

    if (!isValidEmail(email)) { alert('Please enter a valid email address.'); return; }
    if (isRateLimited('newsletter')) return;

    submitButton.textContent = 'Subscribing...';
    submitButton.disabled = true;

    try {
      await verifiedKlaviyoRequest('newsletter_subscribe',
        'https://a.klaviyo.com/client/subscriptions/?company_id=S3gSbG',
        { data: { type: 'subscription', attributes: { profile: { data: { type: 'profile', attributes: { email, first_name: name } } } }, relationships: { list: { data: { type: 'list', id: 'YiTZn2' } } } } }
      );
      alert("🎉 You're subscribed! Check your email for confirmation.");
      newsletterForm.reset();
      newsletterModal.classList.remove('active');
    } catch (err) {
      console.error('Detailed error:', err);
      alert("Sorry — something went wrong. Please try again or email us directly at rebeca@myguardian.tech");
    } finally {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });

  const form = document.getElementById('klaviyo-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = sanitizeInput(document.getElementById('name').value.trim());
      const company = sanitizeInput(document.getElementById('company').value.trim());
      const email = document.getElementById('email').value.trim();

      if (!isValidEmail(email)) { alert('Please enter a valid email address.'); return; }
      if (isRateLimited('earlyaccess')) return;

      const submitButton = form.querySelector('.submit-button');
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Submitting...';
      submitButton.disabled = true;

      try {
        await verifiedKlaviyoRequest('request_early_access',
          'https://a.klaviyo.com/client/profiles/?company_id=S3gSbG',
          { data: { type: 'profile', attributes: { email, first_name: name, properties: { company } } } }
        );
        await verifiedKlaviyoRequest('request_early_access',
          'https://a.klaviyo.com/client/events/?company_id=S3gSbG',
          { data: { type: 'event', attributes: { properties: { company, name, source: 'Website Form' }, metric: { data: { type: 'metric', attributes: { name: 'Requested Early Access' } } } }, relationships: { profile: { data: { type: 'profile', attributes: { email } } } } } }
        );
        alert("Thanks! We'll be in touch soon.");
        form.reset();
      } catch (err) {
        console.error('Error:', err);
        alert("Sorry — something went wrong. Please try again or email us directly.");
      } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  }
});
