import { useState, useCallback } from 'react'
import { getPatientDocuments, getDocument, type Document } from '@/lib/stellar'

export function useDocuments(patientAddress: string | null) {
  const [documents, setDocuments] = useState<(Document & { id: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!patientAddress) return
    setLoading(true)
    setError(null)
    try {
      const ids = await getPatientDocuments(patientAddress)
      const docs = await Promise.all(
        ids.map(async (id) => {
          const doc = await getDocument(id)
          return doc ? { ...doc, id } : null
        })
      )
      setDocuments(docs.filter(Boolean) as (Document & { id: string })[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [patientAddress])

  return { documents, loading, error, reload: load }
}
