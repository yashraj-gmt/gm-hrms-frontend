// src/hooks/leave/useCompOff.js
import { useState, useCallback, useEffect } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
 
export function useCompOff() {
  const { toast } = useToast()
  const { user } = useAuthStore()
 
  const [records,       setRecords]       = useState([])
  const [totalPages,    setTotalPages]    = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [page,          setPage]          = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
 
  const fetch = useCallback(async (pageNum = 0) => {
    setLoading(true)
    try {
      const res = await leaveService.getAllCompOff(pageNum, 10)
      if (res.success) {
        setRecords(res.data.content ?? [])
        setTotalPages(res.data.totalPages ?? 0)
        setTotalElements(res.data.totalElements ?? 0)
        setPage(pageNum)
      }
    } catch (e) {
      toast.error(e?.message ?? 'Failed to load comp-off requests')
    } finally {
      setLoading(false)
    }
  }, [toast])
 
  useEffect(() => { fetch(0) }, [fetch])
 
  const apply = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.applyCompOff({ ...dto, personalId: user?.personalId })
      if (res.success) { toast.success('Comp-off request submitted'); await fetch(0); return true }
    } catch (e) { toast.error(e?.message ?? 'Submit failed') } finally { setSaving(false) }
    return false
  }, [toast, fetch, user])
 
  const approve = useCallback(async (id) => {
    setActionLoading(id)
    try {
      const res = await leaveService.approveCompOff(id, user?.personalId)
      if (res.success) {
        toast.success('Comp-off approved')
        setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: 'APPROVED' } : r))
      }
    } catch (e) { toast.error(e?.message ?? 'Approval failed') } finally { setActionLoading(null) }
  }, [toast, user])
 
  const reject = useCallback(async (id) => {
    setActionLoading(id)
    try {
      const res = await leaveService.rejectCompOff(id, user?.personalId)
      if (res.success) {
        toast.success('Comp-off rejected')
        setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: 'REJECTED' } : r))
      }
    } catch (e) { toast.error(e?.message ?? 'Reject failed') } finally { setActionLoading(null) }
  }, [toast, user])
 
  return {
    records, loading, saving, actionLoading, totalPages, totalElements, page,
    setPage: (p) => fetch(p),
    apply, approve, reject,
    refresh: () => fetch(page),
  }
}
