// src/hooks/leave/useLeaveBalance.js
import { useState, useCallback, useEffect } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'
 
export function useLeaveBalance() {
  const { toast } = useToast()
 
  const [balances,      setBalances]      = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages,    setTotalPages]    = useState(0)
  const [page,          setPage]          = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [filter,        setFilter]        = useState({})
 
  const fetch = useCallback(async (filterOverride = null, pageNum = 0) => {
    setLoading(true)
    const activeFilter = filterOverride ?? filter
    try {
      const res = await leaveService.searchBalance(activeFilter, pageNum, 10)
      if (res.success) {
        setBalances(res.data.content ?? [])
        setTotalElements(res.data.totalElements ?? 0)
        setTotalPages(res.data.totalPages ?? 0)
        setPage(pageNum)
      }
    } catch (e) {
      toast.error(e?.message ?? 'Failed to load balances')
    } finally {
      setLoading(false)
    }
  }, [filter, toast])
 
  useEffect(() => { fetch({}, 0) }, []) // eslint-disable-line
 
  const applyFilter = useCallback((f) => {
    setFilter(f)
    fetch(f, 0)
  }, [fetch])
 
  return {
    balances, totalElements, totalPages, page, loading,
    setPage: (p) => fetch(filter, p),
    applyFilter,
    refresh: () => fetch(filter, page),
  }
}