import { openDB, IDBPDatabase } from 'idb'
import type { BrandGuideline, ContentSubmission, Review, UserSettings, ReviewFinding, ReviewEvent, ReviewConflict } from '@/types'

export interface ExportData {
  guidelines: BrandGuideline[]
  submissions: ContentSubmission[]
  reviews: Review[]
  findings: ReviewFinding[]
  events: ReviewEvent[]
  conflicts: ReviewConflict[]
  settings: UserSettings
  exportedAt: string
  version: number
}

const DB_NAME = 'thronecaptures-db'
const DB_VERSION = 3

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const gs = db.createObjectStore('guidelines', { keyPath: 'id' })
        gs.createIndex('by-category', 'category')
        gs.createIndex('by-active', 'isActive')
        const ss = db.createObjectStore('submissions', { keyPath: 'id' })
        ss.createIndex('by-status', 'status')
        ss.createIndex('by-date', 'submittedAt')
        const rs = db.createObjectStore('reviews', { keyPath: 'id' })
        rs.createIndex('by-submission', 'submissionId')
        rs.createIndex('by-status', 'status')
        rs.createIndex('by-date', 'createdAt')
        const fs = db.createObjectStore('findings', { keyPath: 'id' })
        fs.createIndex('by-review', 'reviewId')
        fs.createIndex('by-guideline', 'guidelineId')
        fs.createIndex('by-status', 'status')
        db.createObjectStore('settings', { keyPath: 'id' })
      }
      if (oldVersion < 2) {
        // Add events store for audit trail
        const es = db.createObjectStore('events', { keyPath: 'id' })
        es.createIndex('by-review', 'reviewId')
        es.createIndex('by-date', 'timestamp')
        // Note: existing reviews/submissions will get empty events arrays and undefined revisedContent on load
        // They will be updated with new fields when saved next time
      }
      if (oldVersion < 3) {
        // Add conflicts store for overlap detection
        const cs = db.createObjectStore('conflicts', { keyPath: 'id' })
        cs.createIndex('by-review', 'reviewId')
        cs.createIndex('by-status', 'status')
      }
    }
  })
  return dbInstance
}

const DEFAULT_SETTINGS: UserSettings = { geminiApiKey: '', defaultGuidelineIds: [], autoSave: true, theme: 'system' }

export const storage = {
  async getGuidelines(): Promise<BrandGuideline[]> { const db = await getDB(); return db.getAll('guidelines') },
  async getGuideline(id: string): Promise<BrandGuideline | undefined> { const db = await getDB(); return db.get('guidelines', id) },
  async saveGuideline(guideline: BrandGuideline): Promise<void> { const db = await getDB(); await db.put('guidelines', guideline) },
  async deleteGuideline(id: string): Promise<void> { const db = await getDB(); await db.delete('guidelines', id) },
  async getSubmissions(): Promise<ContentSubmission[]> { const db = await getDB(); return db.getAllFromIndex('submissions', 'by-date') },
  async getSubmission(id: string): Promise<ContentSubmission | undefined> { const db = await getDB(); return db.get('submissions', id) },
  async saveSubmission(submission: ContentSubmission): Promise<void> { const db = await getDB(); await db.put('submissions', submission) },
  async deleteSubmission(id: string): Promise<void> { const db = await getDB(); await db.delete('submissions', id) },
  async getReviews(): Promise<Review[]> { const db = await getDB(); return db.getAllFromIndex('reviews', 'by-date') },
  async getReview(id: string): Promise<Review | undefined> { const db = await getDB(); return db.get('reviews', id) },
  async getReviewBySubmission(submissionId: string): Promise<Review | undefined> { const db = await getDB(); return db.getFromIndex('reviews', 'by-submission', submissionId) },
  async saveReview(review: Review): Promise<void> { const db = await getDB(); await db.put('reviews', review) },
  async deleteReview(id: string): Promise<void> { const db = await getDB(); await db.delete('reviews', id) },
  async getFindings(reviewId: string): Promise<ReviewFinding[]> { const db = await getDB(); return db.getAllFromIndex('findings', 'by-review', reviewId) },
  async saveFinding(finding: ReviewFinding): Promise<void> { const db = await getDB(); await db.put('findings', finding) },
  async saveFindings(findings: ReviewFinding[]): Promise<void> { const db = await getDB(); const tx = db.transaction('findings', 'readwrite'); await Promise.all(findings.map(f => tx.store.put(f))); await tx.done },
  async updateFindingStatus(id: string, status: ReviewFinding['status']): Promise<void> { const db = await getDB(); const finding = await db.get('findings', id); if (finding) { finding.status = status; finding.resolvedAt = new Date().toISOString(); await db.put('findings', finding) } },
  // Conflict functions
  async getConflicts(reviewId: string): Promise<ReviewConflict[]> { const db = await getDB(); return db.getAllFromIndex('conflicts', 'by-review', reviewId) },
  async getConflict(id: string): Promise<ReviewConflict | undefined> { const db = await getDB(); return db.get('conflicts', id) },
  async saveConflict(conflict: ReviewConflict): Promise<void> { const db = await getDB(); await db.put('conflicts', conflict) },
  async saveConflicts(conflicts: ReviewConflict[]): Promise<void> { const db = await getDB(); const tx = db.transaction('conflicts', 'readwrite'); await Promise.all(conflicts.map(c => tx.store.put(c))); await tx.done },
  // Event/Audit Trail functions
  async getEvents(reviewId: string): Promise<ReviewEvent[]> { const db = await getDB(); return db.getAllFromIndex('events', 'by-review', reviewId) },
  async saveEvent(event: ReviewEvent): Promise<void> { const db = await getDB(); await db.put('events', event) },
  async saveEvents(events: ReviewEvent[]): Promise<void> { const db = await getDB(); const tx = db.transaction('events', 'readwrite'); await Promise.all(events.map(e => tx.store.put(e))); await tx.done },
  async getSettings(): Promise<UserSettings> { const db = await getDB(); const s = await db.get('settings', 'user-settings'); return s || DEFAULT_SETTINGS },
  async saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> { const db = await getDB(); const current = await this.getSettings(); const updated = { ...current, ...settings, id: 'user-settings' }; await db.put('settings', updated); return updated },
  async clearAllData(): Promise<void> { const db = await getDB(); const tx = db.transaction(['guidelines', 'submissions', 'reviews', 'findings', 'events', 'conflicts'], 'readwrite'); await Promise.all([tx.objectStore('guidelines').clear(), tx.objectStore('submissions').clear(), tx.objectStore('reviews').clear(), tx.objectStore('findings').clear(), tx.objectStore('events').clear(), tx.objectStore('conflicts').clear()]); await tx.done },

  // Export/Import for data portability
  async exportAllData(): Promise<ExportData> {
    const [guidelines, submissions, reviews, settings] = await Promise.all([
      this.getGuidelines(),
      this.getSubmissions(),
      this.getReviews(),
      this.getSettings()
    ])
    // Get all findings, events, and conflicts by getting from all reviews
    const allFindings: ReviewFinding[] = []
    const allEvents: ReviewEvent[] = []
    const allConflicts: ReviewConflict[] = []
    for (const review of reviews) {
      const reviewFindings = await this.getFindings(review.id)
      const reviewEvents = await this.getEvents(review.id)
      const reviewConflicts = await this.getConflicts(review.id)
      allFindings.push(...reviewFindings)
      allEvents.push(...reviewEvents)
      allConflicts.push(...reviewConflicts)
    }
    return {
      guidelines,
      submissions,
      reviews,
      findings: allFindings,
      events: allEvents,
      conflicts: allConflicts,
      settings: { ...settings, geminiApiKey: '' }, // Don't export API key for security
      exportedAt: new Date().toISOString(),
      version: DB_VERSION
    }
  },

  async importAllData(data: ExportData): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(['guidelines', 'submissions', 'reviews', 'findings', 'events', 'conflicts', 'settings'], 'readwrite')

    // Clear existing data (except settings)
    await Promise.all([
      tx.objectStore('guidelines').clear(),
      tx.objectStore('submissions').clear(),
      tx.objectStore('reviews').clear(),
      tx.objectStore('findings').clear(),
      tx.objectStore('events').clear(),
      tx.objectStore('conflicts').clear()
    ])

    // Import new data
    for (const guideline of data.guidelines) {
      await tx.objectStore('guidelines').put(guideline)
    }
    for (const submission of data.submissions) {
      await tx.objectStore('submissions').put(submission)
    }
    for (const review of data.reviews) {
      await tx.objectStore('reviews').put(review)
    }
    for (const finding of data.findings) {
      await tx.objectStore('findings').put(finding)
    }
    for (const event of data.events) {
      await tx.objectStore('events').put(event)
    }
    for (const conflict of data.conflicts || []) {
      await tx.objectStore('conflicts').put(conflict)
    }

    // Import settings but keep current API key
    const currentSettings = await this.getSettings()
    const importedSettings = { ...data.settings, geminiApiKey: currentSettings.geminiApiKey, id: 'user-settings' }
    await tx.objectStore('settings').put(importedSettings)

    await tx.done
    // Clear cached instance to force reload
    dbInstance = null
  }
}

export function generateId(): string { return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }