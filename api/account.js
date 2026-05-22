// api/account.js
function extractCookies(text) {
  const keys = ['NetflixId', 'SecureNetflixId', 'nfvdid', 'OptanonConsent'];
  const cookies = {};
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json) && json.length && json[0]?.name) {
      json.forEach(c => { if (keys.includes(c.name)) cookies[c.name] = c.value; });
    } else if (json && typeof json === 'object') {
      keys.forEach(k => { if (json[k] !== undefined) cookies[k] = json[k]; });
    }
  } catch (e) {}
  if (text.includes('\t')) {
    const lines = text.split(/\r\n|\r|\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed[0] === '#') continue;
      const parts = trimmed.split('\t');
      if (parts.length >= 7) {
        const name = parts[5].trim();
        let value = parts[6].trim();
        try { value = decodeURIComponent(value); } catch (_) {}
        if (keys.includes(name)) cookies[name] = value;
      }
    }
  }
  const segments = text.split(/[;\n\r]+/);
  for (let segment of segments) {
    segment = segment.trim();
    if (!segment) continue;
    if (segment.toLowerCase().startsWith('cookie:')) {
      segment = segment.substring(7).trim();
    }
    const eqPos = segment.indexOf('=');
    if (eqPos === -1) continue;
    let key = segment.substring(0, eqPos).trim();
    let value = segment.substring(eqPos + 1).trim().replace(/;+$/, '');
    try {
      key = decodeURIComponent(key);
      value = decodeURIComponent(value);
    } catch (_) {}
    if (keys.includes(key)) cookies[key] = value;
  }
  return cookies;
}

async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const { cookie: raw_cookie } = req.body || {};
  const trimmedCookie = (raw_cookie || '').trim();
  if (!trimmedCookie) return res.status(400).json({ error: 'No cookie provided.' });

  const cookie_dict = extractCookies(trimmedCookie);
  if (!cookie_dict.NetflixId) return res.status(400).json({ error: 'Missing NetflixId.' });

  try {
    // Fetch /YourAccount using Argo mobile headers (same as in generate)
    const response = await fetch('https://www.netflix.com/YourAccount', {
      method: 'GET',
      headers: {
        'User-Agent': 'Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)',  // Argo user-agent
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
      },
      redirect: 'manual',
    });

    if ([301, 302, 303, 307, 308].includes(response.status) || response.status === 401 || response.status === 403) {
      return res.json({ error: 'Cookie expired or invalid.', expired: true });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: `Netflix returned HTTP ${response.status}` });
    }

    const html = await response.text();

    // Extract reactContext JSON
    const reactContextMatch = html.match(/netflix\.reactContext\s*=\s*(\{.*?\});/s);
    if (!reactContextMatch || !reactContextMatch[1]) {
      return res.json({ error: 'Could not extract account data. Maybe Netflix blocked mobile view.' });
    }

    let jsonStr = reactContextMatch[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
    const reactContext = JSON.parse(jsonStr);
    const models = reactContext?.models || {};

    const userInfo = models.userInfo?.data || {};
    const membershipPlan = models.membershipPlan?.data || {};
    const signupContext = models.signupContext?.data || {};

    const email = userInfo.emailAddress || userInfo.email || 'N/A';
    const country = userInfo.countryOfSignup || 'N/A';
    const memberSince = userInfo.memberSince || 'N/A';
    const membershipStatus = userInfo.membershipStatus || 'N/A';
    const planName = membershipPlan.planName || membershipPlan.name || 'N/A';
    const planPrice = membershipPlan.planPrice || membershipPlan.price || 'N/A';
    const currency = membershipPlan.currency || 'USD';
    const paymentMethod = membershipPlan.paymentMethod || userInfo.paymentMethod || 'N/A';
    const phone = userInfo.phoneNumber || userInfo.phone || 'N/A';
    const renewalDate = membershipPlan.renewalDate || signupContext.renewalDate || 'N/A';
    const profilesArray = userInfo.profiles || membershipPlan.profiles || [];
    const profileNames = Array.isArray(profilesArray) ? profilesArray.map(p => p.name || p).join(', ') : 'N/A';
    const profilesCount = Array.isArray(profilesArray) ? profilesArray.length : 'N/A';

    return res.json({
      status: "SUCCESS",
      email,
      country,
      country_display: country !== 'N/A' ? `${country}` : 'N/A',
      member_since: memberSince,
      membership_status: membershipStatus === 'CURRENT_MEMBER' ? 'Active' : 'Inactive',
      plan: planName,
      price: planPrice !== 'N/A' ? `${currency} ${planPrice}` : 'N/A',
      renewal_date: renewalDate,
      payment_method: paymentMethod,
      phone,
      profiles_count: profilesCount,
      profile_names: profileNames,
      x_mail: email,
      x_loc: country,
      x_tier: planName,
      x_ren: renewalDate,
      x_mem: memberSince,
      x_bil: paymentMethod,
      x_tel: phone,
      x_usr: profileNames,
    });
  } catch (error) {
    console.error('Account API error:', error);
    return res.status(500).json({ error: 'Server error fetching account details.' });
  }
}

module.exports = handler;
