import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNumericValue,
  calculateDeviation,
  calculateDeltaBps,
  scoreSentimentLabel,
  fallbackNlpParser,
  calculateRegimeLabel,
  generateEconomicSeries,
  computeSeriesChange,
} from './macroService';

test('parseNumericValue extracts numeric value and unit accurately', () => {
  assert.deepEqual(parseNumericValue('0.4%'), { numericVal: 0.4, unit: '%' });
  assert.deepEqual(parseNumericValue('185K'), { numericVal: 185, unit: 'K' });
  assert.deepEqual(parseNumericValue('53.0'), { numericVal: 53.0, unit: '' });
  assert.deepEqual(parseNumericValue(null), { numericVal: null, unit: '' });
});

test('calculateDeviation computes actual minus consensus and sentiment', () => {
  assert.deepEqual(calculateDeviation('0.4%', '0.3%'), {
    deviation: 0.1,
    sentiment: 'bullish',
  });
  assert.deepEqual(calculateDeviation('0.1%', '0.3%'), {
    deviation: -0.2,
    sentiment: 'bearish',
  });
  assert.deepEqual(calculateDeviation('4.00%', '4.00%'), {
    deviation: 0.0,
    sentiment: 'neutral',
  });
});

test('calculateDeltaBps computes basis point changes accurately', () => {
  assert.equal(calculateDeltaBps('5.25%', '5.50%'), -25);
  assert.equal(calculateDeltaBps('0.25%', '0.10%'), 15);
  assert.equal(calculateDeltaBps('4.00%', '4.00%'), 0);
});

test('fallbackNlpParser scores hawkish and dovish central bank statements', () => {
  const hawkish = fallbackNlpParser(
    'Inflation remains elevated and requires restrictive policy tightening for longer.'
  );
  assert.ok(hawkish.sentiment_score > 0.5);
  assert.equal(hawkish.sentiment_label, scoreSentimentLabel(hawkish.sentiment_score));

  const dovish = fallbackNlpParser(
    'We see disinflation, cooling growth, and downside risk warranting a rate cut and easing.'
  );
  assert.ok(dovish.sentiment_score < -0.5);
});

test('calculateRegimeLabel and generateEconomicSeries produce valid outputs', () => {
  assert.equal(calculateRegimeLabel(85), 'Extreme Greed');
  assert.equal(calculateRegimeLabel(65), 'Mild Greed');
  assert.equal(calculateRegimeLabel(50), 'Neutral');
  assert.equal(calculateRegimeLabel(35), 'Bearish');
  assert.equal(calculateRegimeLabel(15), 'Extreme Fear');

  const series = generateEconomicSeries(314.5, 0.003, 12);
  assert.equal(series.length, 12);
  assert.equal(typeof computeSeriesChange(series, 1), 'number');
});

test('isWithinLast24Hours checks if date is within 24h window', async () => {
  const { isWithinLast24Hours, filterRecentNews, parseRssXml } = await import('./macroService');
  const now = Date.now();

  const twoHoursAgo = new Date(now - 2 * 3600 * 1000).toISOString();
  const twentyHoursAgo = new Date(now - 20 * 3600 * 1000).toISOString();
  const twentyFiveHoursAgo = new Date(now - 25 * 3600 * 1000).toISOString();
  const fiveDaysAgo = new Date(now - 5 * 24 * 3600 * 1000).toISOString();

  assert.equal(isWithinLast24Hours(twoHoursAgo, now), true);
  assert.equal(isWithinLast24Hours(twentyHoursAgo, now), true);
  assert.equal(isWithinLast24Hours(twentyFiveHoursAgo, now), false);
  assert.equal(isWithinLast24Hours(fiveDaysAgo, now), false);
  assert.equal(isWithinLast24Hours(null, now), false);

  const sampleXml = `
    <rss><channel>
      <item>
        <title>Fresh Rate Decision</title>
        <link>https://example.com/1</link>
        <pubDate>${new Date(now - 3 * 3600 * 1000).toUTCString()}</pubDate>
        <source>Bloomberg</source>
      </item>
      <item>
        <title>Stale News Item From Last Week</title>
        <link>https://example.com/2</link>
        <pubDate>${new Date(now - 72 * 3600 * 1000).toUTCString()}</pubDate>
        <source>Old Wire</source>
      </item>
    </channel></rss>
  `;

  const parsed = parseRssXml(sampleXml);
  assert.equal(parsed.length, 2);

  const recentOnly = filterRecentNews(parsed, now, 24);
  assert.equal(recentOnly.length, 1);
  assert.equal(recentOnly[0].title, 'Fresh Rate Decision');
});

test('verifyJwtToken enforces asymmetric ES256/RS256 JWKS verification, required claims, and rejects alg="none"', async () => {
  const crypto = await import('node:crypto');
  const { verifyJwtToken, checkRegisteredEmail, registerEmailAddress } = await import('./auth');

  const encodeB64Url = (buf: Buffer | string) =>
    Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // Generate an asymmetric ES256 (P-256) keypair and export public JWK
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicJwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid: 'test-es256-key-1',
    alg: 'ES256',
  };

  const now = Math.floor(Date.now() / 1000);
  const validHeader = encodeB64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'test-es256-key-1' }));
  const validPayload = encodeB64Url(
    JSON.stringify({
      sub: 'usr-quant-99',
      email: 'verified.trader@supernova.ai',
      aud: 'authenticated',
      exp: now + 3600,
      iat: now,
    })
  );
  const signingInput = `${validHeader}.${validPayload}`;
  const validSig = encodeB64Url(
    crypto.sign('sha256', Buffer.from(signingInput, 'utf8'), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    })
  );
  const validJwt = `${signingInput}.${validSig}`;

  // 1. Valid ES256 token signed with JWKS key succeeds
  const verified = await verifyJwtToken(validJwt, { jwksKeys: [publicJwk], nowSeconds: now });
  assert.equal(verified.id, 'usr-quant-99');
  assert.equal(verified.email, 'verified.trader@supernova.ai');

  // 2. Rejects alg="none"
  const noneHeader = encodeB64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const noneToken = `${noneHeader}.${validPayload}.sig`;
  await assert.rejects(
    () => verifyJwtToken(noneToken, { nowSeconds: now }),
    /alg="none" is strictly forbidden/
  );

  // 3. Rejects expired token (exp <= now)
  const expiredPayload = encodeB64Url(
    JSON.stringify({
      sub: 'usr-quant-99',
      aud: 'authenticated',
      exp: now - 10,
    })
  );
  const expiredToken = `${validHeader}.${expiredPayload}.${validSig}`;
  await assert.rejects(
    () => verifyJwtToken(expiredToken, { nowSeconds: now }),
    /token has expired/
  );

  // 4. Rejects wrong aud claim
  const wrongAudPayload = encodeB64Url(
    JSON.stringify({
      sub: 'usr-quant-99',
      aud: 'anon',
      exp: now + 3600,
    })
  );
  const wrongAudToken = `${validHeader}.${wrongAudPayload}.${validSig}`;
  await assert.rejects(
    () => verifyJwtToken(wrongAudToken, { nowSeconds: now }),
    /invalid "aud" claim/
  );

  // 5. Rejects missing sub claim
  const missingSubPayload = encodeB64Url(
    JSON.stringify({
      aud: 'authenticated',
      exp: now + 3600,
    })
  );
  const missingSubToken = `${validHeader}.${missingSubPayload}.${validSig}`;
  await assert.rejects(
    () => verifyJwtToken(missingSubToken, { nowSeconds: now }),
    /missing or invalid required claim "sub"/
  );

  // 6. Progressive email existence check & registration
  assert.equal(checkRegisteredEmail('chief.quant@supernova.ai'), true);
  assert.equal(checkRegisteredEmail('brand.new.user@hedgefund.io'), false);
  registerEmailAddress('brand.new.user@hedgefund.io');
  assert.equal(checkRegisteredEmail('brand.new.user@hedgefund.io'), true);
});

