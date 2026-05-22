// api/account.js
async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const { cookie: raw_cookie } = req.body || {};
  const trimmedCookie = (raw_cookie || '').trim();
  if (!trimmedCookie) return res.status(400).json({ error: 'No cookie provided.' });

  try {
    // Step 1: Scrape /YourAccount page
    const response = await fetch('https://www.netflix.com/YourAccount', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': trimmedCookie,
      },
      redirect: 'manual',
    });

    // If redirected to login, cookie is invalid
    if ([301, 302, 303, 307, 308].includes(response.status) || response.status === 401 || response.status === 403) {
      return res.json({ error: 'Cookie expired or invalid.' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `Netflix returned HTTP ${response.status}` });
    }

    const html = await response.text();

    // Step 2: Extract netflix.reactContext JSON
    const reactContextMatch = html.match(/netflix\.reactContext\s*=\s*({.*?});/s);
    if (!reactContextMatch) {
      return res.json({ error: 'Could not extract account data from page.' });
    }

    let jsonStr = reactContextMatch[1];
    // Unescape HTML entities
    jsonStr = jsonStr.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    const reactContext = JSON.parse(jsonStr);
    const userInfo = reactContext?.models?.userInfo?.data || {};
    const signupContext = reactContext?.models?.signupContext?.data || {};
    const membershipPlan = reactContext?.models?.membershipPlan?.data || {};

    // Step 3: Extract all available fields
    const email = userInfo.emailAddress || 'N/A';
    const country = userInfo.countryOfSignup || 'N/A';
    const memberSince = userInfo.memberSince || 'N/A';
    const userGuid = userInfo.userGuid || 'N/A';
    const membershipStatus = userInfo.membershipStatus || 'N/A';
    const planName = membershipPlan.planName || membershipPlan.name || 'N/A';
    const planPrice = membershipPlan.planPrice || membershipPlan.price || 'N/A';
    const paymentMethod = membershipPlan.paymentMethod || userInfo.paymentMethod || 'N/A';
    const phone = userInfo.phoneNumber || userInfo.phone || 'N/A';
    const profiles = userInfo.profiles || membershipPlan.profiles || [];

    return res.json({
      status: "SUCCESS",
      email,
      country,
      member_since: memberSince,
      user_guid: userGuid,
      membership_status: membershipStatus === 'CURRENT_MEMBER' ? 'Active' : 'Inactive',
      plan: planName,
      price: planPrice,
      payment_method: paymentMethod,
      phone,
      profiles_count: Array.isArray(profiles) ? profiles.length : 'N/A',
      profile_names: Array.isArray(profiles) ? profiles.map(p => p.name || p).join(', ') : 'N/A',
      // Legacy fields for bot compatibility
      x_mail: email,
      x_loc: country,
      x_tier: planName,
      x_ren: membershipPlan.renewalDate || 'N/A',
      x_mem: memberSince,
      x_bil: paymentMethod,
      x_tel: phone,
      x_usr: Array.isArray(profiles) ? profiles.map(p => p.name || p).join(', ') : 'N/A',
    });

  } catch (error) {
    console.error('Account API error:', error);
    return res.status(500).json({ error: 'Server error fetching account details.' });
  }
}

module.exports = handler;
