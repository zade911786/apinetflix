// api/account.js
const COUNTRY_MAP = {
  "AF":"🇦🇫 Afghanistan","AL":"🇦🇱 Albania","DZ":"🇩🇿 Algeria","AS":"🇦🇸 American Samoa",
  "AD":"🇦🇩 Andorra","AO":"🇦🇴 Angola","AI":"🇦🇮 Anguilla","AQ":"🇦🇶 Antarctica",
  "AG":"🇦🇬 Antigua and Barbuda","AR":"🇦🇷 Argentina","AM":"🇦🇲 Armenia","AW":"🇦🇼 Aruba",
  "AU":"🇦🇺 Australia","AT":"🇦🇹 Austria","AZ":"🇦🇿 Azerbaijan","BS":"🇧🇸 Bahamas",
  "BH":"🇧🇭 Bahrain","BD":"🇧🇩 Bangladesh","BB":"🇧🇧 Barbados","BY":"🇧🇾 Belarus",
  "BE":"🇧🇪 Belgium","BZ":"🇧🇿 Belize","BJ":"🇧🇯 Benin","BM":"🇧🇲 Bermuda",
  "BT":"🇧🇹 Bhutan","BO":"🇧🇴 Bolivia","BQ":"🇧🇶 Caribbean Netherlands",
  "BA":"🇧🇦 Bosnia and Herzegovina","BW":"🇧🇼 Botswana","BR":"🇧🇷 Brazil",
  "IO":"🇮🇴 British Indian Ocean Territory","BN":"🇧🇳 Brunei","BG":"🇧🇬 Bulgaria",
  "BF":"🇧🇫 Burkina Faso","BI":"🇧🇮 Burundi","CV":"🇨🇻 Cabo Verde",
  "KH":"🇰🇭 Cambodia","CM":"🇨🇲 Cameroon","CA":"🇨🇦 Canada","KY":"🇰🇾 Cayman Islands",
  "CF":"🇨🇫 Central African Republic","TD":"🇹🇩 Chad","CL":"🇨🇱 Chile","CN":"🇨🇳 China",
  "CX":"🇨🇽 Christmas Island","CC":"🇨🇨 Cocos (Keeling) Islands","CO":"🇨🇴 Colombia",
  "KM":"🇰🇲 Comoros","CG":"🇨🇬 Congo","CD":"🇨🇩 Congo (DRC)","CK":"🇨🇰 Cook Islands",
  "CR":"🇨🇷 Costa Rica","HR":"🇭🇷 Croatia","CU":"🇨🇺 Cuba","CW":"🇨🇼 Curaçao",
  "CY":"🇨🇾 Cyprus","CZ":"🇨🇿 Czechia","DK":"🇩🇰 Denmark","DJ":"🇩🇯 Djibouti",
  "DM":"🇩🇲 Dominica","DO":"🇩🇴 Dominican Republic","EC":"🇪🇨 Ecuador","EG":"🇪🇬 Egypt",
  "SV":"🇸🇻 El Salvador","GQ":"🇬🇶 Equatorial Guinea","ER":"🇪🇷 Eritrea",
  "EE":"🇪🇪 Estonia","SZ":"🇸🇿 Eswatini","ET":"🇪🇹 Ethiopia","FK":"🇫🇰 Falkland Islands",
  "FO":"🇫🇴 Faroe Islands","FJ":"🇫🇯 Fiji","FI":"🇫🇮 Finland","FR":"🇫🇷 France",
  "GF":"🇬🇫 French Guiana","PF":"🇵🇫 French Polynesia","TF":"🇹🇫 French Southern Territories",
  "GA":"🇬🇦 Gabon","GM":"🇬🇲 Gambia","GE":"🇬🇪 Georgia","DE":"🇩🇪 Germany",
  "GH":"🇬🇭 Ghana","GI":"🇬🇮 Gibraltar","GR":"🇬🇷 Greece","GL":"🇬🇱 Greenland",
  "GD":"🇬🇩 Grenada","GP":"🇬🇵 Guadeloupe","GU":"🇬🇺 Guam","GT":"🇬🇹 Guatemala",
  "GG":"🇬🇬 Guernsey","GN":"🇬🇳 Guinea","GW":"🇬🇼 Guinea-Bissau","GY":"🇬🇾 Guyana",
  "HT":"🇭🇹 Haiti","HN":"🇭🇳 Honduras","HK":"🇭🇰 Hong Kong","HU":"🇭🇺 Hungary",
  "IS":"🇮🇸 Iceland","IN":"🇮🇳 India","ID":"🇮🇩 Indonesia","IR":"🇮🇷 Iran",
  "IQ":"🇮🇶 Iraq","IE":"🇮🇪 Ireland","IM":"🇮🇲 Isle of Man","IL":"🇮🇱 Israel",
  "IT":"🇮🇹 Italy","JM":"🇯🇲 Jamaica","JP":"🇯🇵 Japan","JE":"🇯🇪 Jersey",
  "JO":"🇯🇴 Jordan","KZ":"🇰🇿 Kazakhstan","KE":"🇰🇪 Kenya","KI":"🇰🇮 Kiribati",
  "KP":"🇰🇵 North Korea","KR":"🇰🇷 South Korea","KW":"🇰🇼 Kuwait","KG":"🇰🇬 Kyrgyzstan",
  "LA":"🇱🇦 Laos","LV":"🇱🇻 Latvia","LB":"🇱🇧 Lebanon","LS":"🇱🇸 Lesotho",
  "LR":"🇱🇷 Liberia","LY":"🇱🇾 Libya","LI":"🇱🇮 Liechtenstein","LT":"🇱🇹 Lithuania",
  "LU":"🇱🇺 Luxembourg","MO":"🇲🇴 Macau","MG":"🇲🇬 Madagascar","MW":"🇲🇼 Malawi",
  "MY":"🇲🇾 Malaysia","MV":"🇲🇻 Maldives","ML":"🇲🇱 Mali","MT":"🇲🇹 Malta",
  "MH":"🇲🇭 Marshall Islands","MQ":"🇲🇶 Martinique","MR":"🇲🇷 Mauritania",
  "MU":"🇲🇺 Mauritius","YT":"🇾🇹 Mayotte","MX":"🇲🇽 Mexico","FM":"🇫🇲 Micronesia",
  "MD":"🇲🇩 Moldova","MC":"🇲🇨 Monaco","MN":"🇲🇳 Mongolia","ME":"🇲🇪 Montenegro",
  "MS":"🇲🇸 Montserrat","MA":"🇲🇦 Morocco","MZ":"🇲🇿 Mozambique","MM":"🇲🇲 Myanmar",
  "NA":"🇳🇦 Namibia","NR":"🇳🇷 Nauru","NP":"🇳🇵 Nepal","NL":"🇳🇱 Netherlands",
  "NC":"🇳🇨 New Caledonia","NZ":"🇳🇿 New Zealand","NI":"🇳🇮 Nicaragua","NE":"🇳🇪 Niger",
  "NG":"🇳🇬 Nigeria","NU":"🇳🇺 Niue","NF":"🇳🇫 Norfolk Island","MK":"🇲🇰 North Macedonia",
  "MP":"🇲🇵 Northern Mariana Islands","NO":"🇳🇴 Norway","OM":"🇴🇲 Oman",
  "PK":"🇵🇰 Pakistan","PW":"🇵🇼 Palau","PS":"🇵🇸 Palestine","PA":"🇵🇦 Panama",
  "PG":"🇵🇬 Papua New Guinea","PY":"🇵🇾 Paraguay","PE":"🇵🇪 Peru","PH":"🇵🇭 Philippines",
  "PN":"🇵🇳 Pitcairn Islands","PL":"🇵🇱 Poland","PT":"🇵🇹 Portugal","PR":"🇵🇷 Puerto Rico",
  "QA":"🇶🇦 Qatar","RE":"🇷🇪 Réunion","RO":"🇷🇴 Romania","RU":"🇷🇺 Russia",
  "RW":"🇷🇼 Rwanda","BL":"🇧🇱 Saint Barthélemy","SH":"🇸🇭 Saint Helena",
  "KN":"🇰🇳 Saint Kitts and Nevis","LC":"🇱🇨 Saint Lucia","MF":"🇲🇫 Saint Martin",
  "PM":"🇵🇲 Saint Pierre and Miquelon","VC":"🇻🇨 Saint Vincent and the Grenadines",
  "WS":"🇼🇸 Samoa","SM":"🇸🇲 San Marino","ST":"🇸🇹 São Tomé and Príncipe",
  "SA":"🇸🇦 Saudi Arabia","SN":"🇸🇳 Senegal","RS":"🇷🇸 Serbia","SC":"🇸🇨 Seychelles",
  "SL":"🇸🇱 Sierra Leone","SG":"🇸🇬 Singapore","SX":"🇸🇽 Sint Maarten",
  "SK":"🇸🇰 Slovakia","SI":"🇸🇮 Slovenia","SB":"🇸🇧 Solomon Islands","SO":"🇸🇴 Somalia",
  "ZA":"🇿🇦 South Africa","GS":"🇬🇸 South Georgia and the South Sandwich Islands",
  "SS":"🇸🇸 South Sudan","ES":"🇪🇸 Spain","LK":"🇱🇰 Sri Lanka","SD":"🇸🇩 Sudan",
  "SR":"🇸🇷 Suriname","SJ":"🇸🇯 Svalbard and Jan Mayen","SE":"🇸🇪 Sweden",
  "CH":"🇨🇭 Switzerland","SY":"🇸🇾 Syria","TW":"🇹🇼 Taiwan","TJ":"🇹🇯 Tajikistan",
  "TZ":"🇹🇿 Tanzania","TH":"🇹🇭 Thailand","TL":"🇹🇱 Timor-Leste","TG":"🇹🇬 Togo",
  "TK":"🇹🇰 Tokelau","TO":"🇹🇴 Tonga","TT":"🇹🇹 Trinidad and Tobago",
  "TN":"🇹🇳 Tunisia","TR":"🇹🇷 Turkey","TM":"🇹🇲 Turkmenistan",
  "TC":"🇹🇨 Turks and Caicos Islands","TV":"🇹🇻 Tuvalu","UG":"🇺🇬 Uganda",
  "UA":"🇺🇦 Ukraine","AE":"🇦🇪 United Arab Emirates","GB":"🇬🇧 United Kingdom",
  "US":"🇺🇸 United States","UM":"🇺🇲 U.S. Outlying Islands","UY":"🇺🇾 Uruguay",
  "UZ":"🇺🇿 Uzbekistan","VU":"🇻🇺 Vanuatu","VA":"🇻🇦 Vatican City","VE":"🇻🇪 Venezuela",
  "VN":"🇻🇳 Vietnam","VG":"🇻🇬 British Virgin Islands","VI":"🇻🇮 U.S. Virgin Islands",
  "WF":"🇼🇫 Wallis and Futuna","EH":"🇪🇭 Western Sahara","YE":"🇾🇪 Yemen",
  "ZM":"🇿🇲 Zambia","ZW":"🇿🇼 Zimbabwe"
};

function getCountryDisplay(code) {
  return COUNTRY_MAP[code] ? `${COUNTRY_MAP[code]} (${code})` : code;
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
      expiry: (creditCard.expirationMonth && creditCard.expirationYear) ? `${creditCard.expirationMonth}/${creditCard.expirationYear}` : 'N/A'
    };
  }
  return { type: payMethod || 'N/A', lastFourDigits: 'N/A', expiry: 'N/A' };
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

async function handler(req, res) {
  // CORS
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
      path: '["user","account"]',
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
      'Cookie': `NetflixId=${cookie_dict.NetflixId}`
    };

    const response = await fetch(`${api_url}?${query_params.toString()}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Netflix API returned ${response.status}` });
    }

    const data = await response.json();

    // DEBUG MODE: Return raw response if debug=true
    if (debug) {
      return res.json({ raw_netflix_response: data });
    }

    // Extract details
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
      email,
      country: countryCode,
      country_display,
      plan: planDisplay,
      price: price_display,
      renewal_date: renewalDate,
      member_since: memberSince,
      payment: payment.type + (payment.lastFourDigits !== 'N/A' ? ` •••• ${payment.lastFourDigits}` : '') + (payment.expiry !== 'N/A' ? ` (Exp: ${payment.expiry})` : ''),
      phone,
      profiles_count: profilesCount,
      profile_names: profileNames,
      membership_status: statusText,
      // Legacy fields
      x_mail: email,
      x_tier: planDisplay,
      x_loc: countryCode,
      x_ren: renewalDate,
      x_mem: memberSince,
      x_bil: payment.type,
      x_tel: phone,
      x_usr: profileNames
    });
  } catch (error) {
    console.error('Account API error:', error);
    return res.status(500).json({ error: 'Server error fetching account details.' });
  }
}

module.exports = handler;
