import { openDB, IDBPDatabase } from 'idb'
import type { BrandGuideline, ContentSubmission, Review, UserSettings, ReviewFinding } from '@/types'

const DB_NAME = 'thronecaptures-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
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
  async getSettings(): Promise<UserSettings> { const db = await getDB(); const s = await db.get('settings', 'user-settings'); return s || DEFAULT_SETTINGS },
  async saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> { const db = await getDB(); const current = await this.getSettings(); const updated = { ...current, ...settings, id: 'user-settings' }; await db.put('settings', updated); return updated },
  async clearAllData(): Promise<void> { const db = await getDB(); const tx = db.transaction(['guidelines', 'submissions', 'reviews', 'findings'], 'readwrite'); await Promise.all([tx.objectStore('guidelines').clear(), tx.objectStore('submissions').clear(), tx.objectStore('reviews').clear(), tx.objectStore('findings').clear()]); await tx.done }
}

export function generateId(): string { return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }