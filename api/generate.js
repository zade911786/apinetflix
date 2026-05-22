// api/generate.js
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const { cookie: raw_cookie, device = 'mobile' } = req.body || {};
  const trimmedCookie = (raw_cookie || '').trim();

  if (!trimmedCookie) {
    return res.status(400).json({ error: 'No cookie data provided.' });
  }

  const cookie_dict = extractCookies(trimmedCookie);
  if (!cookie_dict.NetflixId) {
    return res.status(400).json({ error: 'Missing required cookie: NetflixId.' });
  }

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
    path: '["account","token","default"]',
    pathFormat: 'graph',
    pixelDensity: '2.0',
    progressive: 'false',
    responseFormat: 'json'
  });

  let headersList = {};

  if (device === 'desktop') {
    headersList = {
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
    headersList = {
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

  try {
    const apiResponse = await fetch(`${api_url}?${query_params.toString()}`, {
      method: 'GET',
      headers: headersList,
    });

    if ([401, 403, 400].includes(apiResponse.status)) {
      return res.json({ expired: true, error: 'Cookies expired or invalid.' });
    }
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ error: `Netflix API returned HTTP ${apiResponse.status}` });
    }

    const data = await apiResponse.json();
    const token_data = data?.value?.account?.token?.default || {};
    const token = token_data.token;
    let expires = token_data.expires;

    if (!token) {
      return res.json({ expired: true, error: 'Cookies expired hai bhai, dusra daalo' });
    }

    if (typeof expires === 'number' && expires.toString().length === 13) {
      expires = Math.floor(expires / 1000);
    }

    const login_url = `https://netflix.com/?nftoken=${encodeURIComponent(token)}`;

    return res.json({
      url: login_url,
      expires_ts: Number(expires),
      expires: new Date(Number(expires) * 1000).toISOString().replace('T', ' ').split('.')[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error occurred' });
  }
}

module.exports = handler;
