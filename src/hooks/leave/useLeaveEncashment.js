// src/hooks/leave/useLeaveEncashment.js
import { useState, useCallback, useEffect } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROLES } from '@/constants/roles'
 
export function useLeaveEncashment() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.role === ROLES.ADMIN
 
  const [requests,   setRequests]   = useState([])
  const [rules,      setRules]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [page,       setPage]       = useState(0)
 
  const fetchRequests = useCallback(async (pageNum = 0) => {
  setLoading(true)
  try {
    const ruRes = await leaveService.getAllEncashmentRules()
    if (ruRes.success) {
      setRules(ruRes.data.content ?? [])
      setTotalPages(ruRes.data.totalPages ?? 0)
    }
    setRequests([]) // no backend endpoint yet
    setPage(pageNum)
  } catch (e) {
    toast.error(e?.message ?? 'Failed to load encashment data')
  } finally {
    setLoading(false)
  }
}, [toast])

useEffect(() => { fetchRequests(0) }, [])
 
  const createRequest = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.createEncashmentRequest(dto)
      if (res.success) { toast.success('Encashment request submitted'); await fetchRequests(0); return true }
    } catch (e) { toast.error(e?.message ?? 'Submit failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchRequests])
 
  const createRule = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.createEncashmentRule(dto)
      if (res.success) { toast.success('Encashment rule saved'); await fetchRequests(page); return true }
    } catch (e) { toast.error(e?.message ?? 'Save failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchRequests, page])
 
  const updateRule = useCallback(async (id, dto) => {
    setSaving(true)
    try {
      const res = await leaveService.updateEncashmentRule(id, dto)
      if (res.success) { toast.success('Rule updated'); await fetchRequests(page); return true }
    } catch (e) { toast.error(e?.message ?? 'Update failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchRequests, page])
 
  const deleteRule = useCallback(async (id) => {
    if (!isAdmin) { toast.error('Only Admin can delete encashment rules'); return false }
    setDeleting(id)
    try {
      const res = await leaveService.deleteEncashmentRule(id)
      if (res.success) { toast.success('Rule deleted'); setRules((prev) => prev.filter((r) => r.id !== id)); return true }
    } catch (e) { toast.error(e?.message ?? 'Delete failed') } finally { setDeleting(null) }
    return false
  }, [isAdmin, toast])
 
  return {
    requests, rules, loading, saving, deleting, totalPages, page,
    setPage: (p) => fetchRequests(p),
    createRequest, createRule, updateRule, deleteRule,
    refresh: () => fetchRequests(page),
  }
}
 