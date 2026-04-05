/**
 * R4: Sentiment Trend — smoke tests
 * 1. computeSentimentTrajectory: declining when slope < -0.1
 * 2. computeSentimentTrajectory: improving when slope > 0.1
 * 3. computeSentimentTrajectory: stable when slope between -0.1 and 0.1
 * 4. computeSentimentTrajectory: null when fewer than 2 scores
 * 5. sentimentFillColour: green when score > 0.3
 * 6. sentimentFillColour: amber when score 0–0.3
 * 7. sentimentFillColour: coral when score < 0
 */

import { describe, it, expect } from 'vitest'
import { computeSentimentTrajectory, sentimentFillColour } from '../hooks/useCallSentiment'

describe('computeSentimentTrajectory', () => {
  it('returns "declining" when slope is < -0.1', () => {
    expect(computeSentimentTrajectory([0.8, 0.4, 0.0])).toBe('declining')
    expect(computeSentimentTrajectory([0.5, -0.5])).toBe('declining')
  })

  it('returns "improving" when slope is > 0.1', () => {
    expect(computeSentimentTrajectory([0.0, 0.4, 0.8])).toBe('improving')
    expect(computeSentimentTrajectory([-0.5, 0.5])).toBe('improving')
  })

  it('returns "stable" when slope is between -0.1 and 0.1', () => {
    expect(computeSentimentTrajectory([0.5, 0.5, 0.5])).toBe('stable')
    expect(computeSentimentTrajectory([0.4, 0.45])).toBe('stable')
  })

  it('returns null when fewer than 2 scores', () => {
    expect(computeSentimentTrajectory([])).toBeNull()
    expect(computeSentimentTrajectory([0.5])).toBeNull()
  })
})

describe('sentimentFillColour', () => {
  it('returns green (#10B981) when score > 0.3', () => {
    expect(sentimentFillColour(0.4)).toBe('#10B981')
    expect(sentimentFillColour(1.0)).toBe('#10B981')
  })

  it('returns amber (#F59E0B) when score is 0 to 0.3', () => {
    expect(sentimentFillColour(0)).toBe('#F59E0B')
    expect(sentimentFillColour(0.3)).toBe('#F59E0B')
  })

  it('returns coral (#FF6B6B) when score < 0', () => {
    expect(sentimentFillColour(-0.1)).toBe('#FF6B6B')
    expect(sentimentFillColour(-1.0)).toBe('#FF6B6B')
  })
})
