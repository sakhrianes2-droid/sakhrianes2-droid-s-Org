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
