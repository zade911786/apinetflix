// api/account.js
const COUNTRY_MAP = { /* poori map already hai, wahi rakho */ };
function getCountryDisplay(code) { return COUNTRY_MAP[code] ? `${COUNTRY_MAP[code]} (${code})` : code; }
function parsePayment(account) { /* same as before */ }
function extractCookies(text) { /* same as before */ }

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const { cookie: raw_cookie, debug } = req.body || {};
  const trimmedCookie = (raw_cookie || '').trim();
  if (!trimmedCookie) return res.status(400).json({ error: 'No cookie provided.' });

  const cookie_dict = extractCookies(trimmedCookie);
  if (!cookie_dict.NetflixId) return res.status(400).json({ error: 'Invalid or missing NetflixId.' });

  try {
    const api_url = 'https://ios.prod.ftl.netflix.com/iosui/user/15.48';
    const query_params = new URLSearchParams({
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
      path: '["user","account"]',   // try both
      pathFormat: 'graph',
      pixelDensity: '2.0',
      progressive: 'false',
      responseFormat: 'json'
    });

    const headers = {
      'User-Agent': 'Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)',
      'x-netflix.request.attempt': '1',
      'x-netflix.request.client.user.guid': cookie_dict.NetflixId,
      'x-netflix.context.profile-guid': cookie_dict.NetflixId,
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
      'x-netflix.context.top-level-uuid': cookie_dict.NetflixId,
      'x-netflix.client.iosversion': '15.8.5',
      'accept-language': 'en-US;q=1',
      'x-netflix.argo.abtests': '',
      'x-netflix.context.os-version': '15.8.5',
      'x-netflix.request.client.context': '{"appState":"foreground"}',
      'x-netflix.context.ui-flavor': 'argo',
      'x-netflix.argo.nfnsm': '9',
      'x-netflix.context.pixel-density': '2.0',
      'x-netflix.request.toplevel.uuid': cookie_dict.NetflixId,
      'x-netflix.request.client.timezoneid': 'Asia/Dhaka',
      'Cookie': `NetflixId=${cookie_dict.NetflixId}`,
    };

    const response = await fetch(`${api_url}?${query_params.toString()}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Netflix API returned ${response.status}` });
    }

    const data = await response.json();

    // === DEBUG MODE: Return raw Netflix response ===
    if (debug) {
      return res.json({ raw_netflix_response: data });
    }

    // Parse account details (assuming data?.value?.user & data?.value?.account exist)
    const user = data?.value?.user || {};
    const account = data?.value?.account || {};

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

    return res.json({
      status: "SUCCESS",
      email, country: countryCode, country_display, plan: planDisplay, price: price_display,
      renewal_date: renewalDate, member_since: memberSince,
      payment: payment.type + (payment.lastFourDigits !== 'N/A' ? ` •••• ${payment.lastFourDigits}` : '') + (payment.expiry !== 'N/A' ? ` (Exp: ${payment.expiry})` : ''),
      phone, profiles_count: profilesCount, profile_names: profileNames,
      membership_status: statusText,
      x_mail: email, x_tier: planDisplay, x_loc: countryCode, x_ren: renewalDate,
      x_mem: memberSince, x_bil: payment.type, x_tel: phone, x_usr: profileNames
    });
  } catch (error) {
    console.error('Account API error:', error);
    return res.status(500).json({ error: 'Server error fetching account details.' });
  }
}

module.exports = handler;
