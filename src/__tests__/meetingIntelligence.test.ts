/**
 * R6: Meeting Intelligence Scoring — smoke tests
 * 1. MEETING_TAGS has exactly 20 tags
 * 2. TAG_SENTIMENT covers all tags (positive or negative)
 * 3. POSITIVE_TAGS has exactly 8 entries
 * 4. primaryTag: returns highest-severity negative tag when present
 * 5. primaryTag: returns null when all tags are positive
 * 6. TAG_LABELS covers all 20 tags
 */

import { describe, it, expect } from 'vitest'
import { MEETING_TAGS, TAG_SENTIMENT, TAG_LABELS, POSITIVE_TAGS } from '../config/meetingTags'
import { primaryTag } from '../hooks/useMeetingScores'
import type { MeetingTag } from '../config/meetingTags'

describe('meetingTags config', () => {
  it('has exactly 20 tags', () => {
    expect(MEETING_TAGS).toHaveLength(20)
  })

  it('TAG_SENTIMENT covers all tags (no undefined entries)', () => {
    for (const tag of MEETING_TAGS) {
      expect(TAG_SENTIMENT[tag]).toBeDefined()
      expect(['positive', 'negative']).toContain(TAG_SENTIMENT[tag])
    }
  })

  it('has exactly 8 positive tags', () => {
    expect(POSITIVE_TAGS.size).toBe(8)
  })

  it('TAG_LABELS covers all 20 tags', () => {
    for (const tag of MEETING_TAGS) {
      expect(TAG_LABELS[tag]).toBeDefined()
      expect(typeof TAG_LABELS[tag]).toBe('string')
    }
  })
})

describe('primaryTag', () => {
  it('returns the first negative tag when present', () => {
    const tags: MeetingTag[] = ['Next_step_confirmed', 'No_discovery_questions', 'Filler_spike']
    const result = primaryTag(tags)
    expect(result).toBe('No_discovery_questions')
  })

  it('returns null when all tags are positive', () => {
    const tags: MeetingTag[] = ['Next_step_confirmed', 'Champion_confirmed', 'Strong_rapport']
    expect(primaryTag(tags)).toBeNull()
  })
})
