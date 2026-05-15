// src/hooks/leave/useLeaveRequests.js
import { useState, useCallback, useEffect, useRef } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'

const PAGE_SIZE = 10

export function useLeaveRequests() {
  const { toast } = useToast()
  const { user } = useAuthStore()

  const [records,      setRecords]      = useState([])
  const [totalPages,   setTotalPages]   = useState(0)
  const [totalElements,setTotalElements]= useState(0)
  const [page,         setPage]         = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [actionLoading,setActionLoading]= useState(null) // id of record being acted on
  const abortRef = useRef(null)

  const fetch = useCallback(async (pageNum = 0) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await leaveService.getAllRequests(pageNum, PAGE_SIZE)
      if (res.success) {
        setRecords(res.data.content ?? [])
        setTotalPages(res.data.totalPages ?? 0)
        setTotalElements(res.data.totalElements ?? 0)
        setPage(pageNum)
      }
    } catch (e) {
      if (e?.name !== 'CanceledError') {
        toast.error(e?.message ?? 'Failed to load leave requests')
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

useEffect(() => { fetch(0) }, [])

  // ── Approve ───────────────────────────────────────────────────────────────
  const approve = useCallback(async (id) => {
    setActionLoading(id)
    try {
      const res = await leaveService.approveLeave(id, user?.personalId)
      if (res.success) {
        toast.success('Leave approved successfully')
        setRecords((prev) =>
          prev.map((r) => r.id === id ? { ...r, status: 'APPROVED' } : r)
        )
      }
    } catch (e) {
      toast.error(e?.message ?? 'Approval failed')
    } finally {
      setActionLoading(null)
    }
  }, [user, toast])

  // ── Reject ────────────────────────────────────────────────────────────────
  const reject = useCallback(async (id, reason) => {
    setActionLoading(id)
    try {
      const res = await leaveService.rejectLeave(id, reason)
      if (res.success) {
        toast.success('Leave rejected')
        setRecords((prev) =>
          prev.map((r) => r.id === id ? { ...r, status: 'REJECTED' } : r)
        )
      }
    } catch (e) {
      toast.error(e?.message ?? 'Rejection failed')
    } finally {
      setActionLoading(null)
    }
  }, [toast])

  // ── Cancel ────────────────────────────────────────────────────────────────
  const cancel = useCallback(async (id) => {
    setActionLoading(id)
    try {
      const res = await leaveService.cancelLeave(id)
      if (res.success) {
        toast.success('Leave cancelled')
        setRecords((prev) =>
          prev.map((r) => r.id === id ? { ...r, status: 'CANCELLED' } : r)
        )
      }
    } catch (e) {
      toast.error(e?.message ?? 'Cancel failed')
    } finally {
      setActionLoading(null)
    }
  }, [toast])

  return {
    records,
    loading,
    actionLoading,
    totalPages,
    totalElements,
    page,
    setPage: (p) => fetch(p),
    approve,
    reject,
    cancel,
    refresh: () => fetch(page),
  }
}