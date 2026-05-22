// api/account.js
function extractCookies(text) {
  // Same extract function as in generate.js – sirf NetflixId chahiye
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
  if (!cookie_dict.NetflixId) {
    return res.status(400).json({ error: 'Missing NetflixId in cookie data.' });
  }

  try {
    // Use Netflix's Shakti API – works with just NetflixId!
    const apiURL = 'https://www.netflix.com/api/shakti/v1/account';
    const response = await fetch(apiURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
        'x-netflix.request.attempt': '1',
        'x-netflix.request.client.user.guid': cookie_dict.NetflixId,
        'x-netflix.context.profile-guid': cookie_dict.NetflixId,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return res.json({ error: 'NetflixId expired or invalid.', expired: true });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: `Netflix API returned ${response.status}` });
    }

    const data = await response.json();

    // Extract fields from Shakti response
    const user = data?.user || data?.account || {};
    const planInfo = data?.planInfo || user?.planInfo || {};
    const paymentInfo = data?.payment || user?.payment || {};

    const email = user.email || 'N/A';
    const country = user.countryOfSignup || user.region || 'N/A';
    const memberSince = user.membershipStartDate || planInfo.memberSince || 'N/A';
    const membershipStatus = user.membershipStatus || 'CURRENT_MEMBER';
    const planName = planInfo.planName || planInfo.plan || 'N/A';
    const price = planInfo.price || planInfo.planPrice || 'N/A';
    const currency = planInfo.currency || 'USD';
    const paymentMethod = paymentInfo.paymentMethod || paymentInfo.type || 'N/A';
    const phone = user.phone || user.phoneNumber || 'N/A';
    const renewalDate = planInfo.renewalDate || 'N/A';
    const profilesArray = user.profiles || data?.profiles || [];
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
      price: price !== 'N/A' ? `${currency} ${price}` : 'N/A',
      renewal_date: renewalDate,
      payment_method: paymentMethod,
      phone,
      profiles_count: profilesCount,
      profile_names: profileNames,
      // legacy fields for your bot
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
    return res.status(500).json({ error: 'Server error while fetching account details.' });
  }
}

module.exports = handler;
