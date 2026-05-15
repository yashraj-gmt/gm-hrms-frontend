// src/hooks/leave/useLeaveTypes.js
import { useState, useCallback, useEffect } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROLES } from '@/constants/roles'
 
export function useLeaveTypes() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.role === ROLES.ADMIN
 
  const [types,         setTypes]         = useState([])
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(null)
  const [totalElements, setTotalElements] = useState(0)
 
  const fetch = useCallback(async (search = '') => {
    setLoading(true)
    try {
      const res = await leaveService.getAllLeaveTypes(search, 0, 50)
      if (res.success) {
        setTypes(res.data.content ?? [])
        setTotalElements(res.data.totalElements ?? 0)
      }
    } catch (e) {
      toast.error(e?.message ?? 'Failed to load leave types')
    } finally {
      setLoading(false)
    }
  }, [toast])
 
  useEffect(() => { fetch() }, [fetch])
 
  const create = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.createLeaveType(dto)
      if (res.success) {
        toast.success('Leave type created')
        await fetch()
        return true
      }
    } catch (e) {
      toast.error(e?.message ?? 'Create failed')
    } finally {
      setSaving(false)
    }
    return false
  }, [toast, fetch])
 
  const update = useCallback(async (id, dto) => {
    setSaving(true)
    try {
      const res = await leaveService.updateLeaveType(id, dto)
      if (res.success) {
        toast.success('Leave type updated')
        await fetch()
        return true
      }
    } catch (e) {
      toast.error(e?.message ?? 'Update failed')
    } finally {
      setSaving(false)
    }
    return false
  }, [toast, fetch])
 
  const remove = useCallback(async (id) => {
    if (!isAdmin) {
      toast.error('Only Admin can delete leave types')
      return false
    }
    setDeleting(id)
    try {
      const res = await leaveService.deleteLeaveType(id)
      if (res.success) {
        toast.success('Leave type deleted')
        setTypes((prev) => prev.filter((t) => t.id !== id))
        return true
      }
    } catch (e) {
      toast.error(e?.message ?? 'Delete failed')
    } finally {
      setDeleting(null)
    }
    return false
  }, [isAdmin, toast])
 
  return { types, loading, saving, deleting, totalElements, fetch, create, update, remove }
}